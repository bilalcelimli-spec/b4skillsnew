/**
 * b4skills Webhook Manager
 *
 * Event-driven delivery to registered HTTP endpoints.
 *  - Endpoints live in `Webhook`, every send in `WebhookDelivery` (Postgres), so
 *    registrations and pending retries survive restarts and are shared by all
 *    web instances.
 *  - HMAC-SHA256 signature on every delivery.
 *  - Up to 3 attempts (now, +1 min, +5 min). A retry is a row with
 *    status "retrying" and a due `nextAttemptAt`; `processDueDeliveries()` (run
 *    on an interval by every instance) sends whatever is due.
 *  - Each attempt is claimed with a conditional update, so two instances never
 *    send the same attempt; a claim abandoned by a dead instance is retaken
 *    after SENDING_STALE_MS.
 *  - Delivery rows carry candidate data and are pruned after RETENTION_DAYS.
 */

import * as crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookEventType =
  | "assessment.completed"
  | "assessment.started"
  | "candidate.registered"
  | "candidate.deleted"
  | "score.updated"
  | "cohort.created"
  | "user.invited"
  | "proctoring.alert"
  | "report.generated"
  | "item.created"
  | "item.updated";

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: Date;
  description?: string;
}

export type WebhookDeliveryStatus = "pending" | "sending" | "retrying" | "delivered" | "failed";

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  responseCode: number | null;
  responseBody: string | null;
  nextRetryAt: Date | null;
  createdAt: Date;
}

export interface WebhookRegistration {
  url: string;
  organizationId: string;
  events: WebhookEventType[];
  secret?: string;
  description?: string;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export const MAX_ATTEMPTS = 3;
/** Delay before attempt n+1 after attempt n failed (index = attempts made). */
const RETRY_DELAYS_MS = [0, 60_000, 300_000];
const REQUEST_TIMEOUT_MS = 10_000;
/** A "sending" row older than this belongs to an instance that died mid-send. */
export const SENDING_STALE_MS = 2 * 60_000;
const RETENTION_DAYS = 30;
const SWEEP_BATCH = 50;

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------

function sign(secret: string, timestamp: number, payload: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${payload}`)
    .digest("hex");
}

type WebhookRow = {
  id: string; organizationId: string; url: string; secret: string; events: string[];
  isActive: boolean; createdAt: Date; description: string | null;
};

function toEndpoint(row: WebhookRow): WebhookEndpoint {
  return {
    id: row.id,
    organizationId: row.organizationId,
    url: row.url,
    secret: row.secret,
    events: row.events as WebhookEventType[],
    active: row.isActive,
    createdAt: row.createdAt,
    description: row.description ?? undefined,
  };
}

type DeliveryRow = {
  id: string; webhookId: string; event: string; payload: Prisma.JsonValue; status: string; attempts: number;
  lastAttemptAt: Date | null; nextAttemptAt: Date | null; responseCode: number | null; responseBody: string | null; createdAt: Date;
};

function toDelivery(row: DeliveryRow): WebhookDelivery {
  return {
    id: row.id,
    webhookId: row.webhookId,
    event: row.event as WebhookEventType,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    status: row.status as WebhookDeliveryStatus,
    attempts: row.attempts,
    lastAttemptAt: row.lastAttemptAt,
    responseCode: row.responseCode,
    responseBody: row.responseBody,
    nextRetryAt: row.nextAttemptAt,
    createdAt: row.createdAt,
  };
}

/** Rows an instance may claim now: due pending/retrying, or a stale "sending". */
function claimableWhere(now: Date): Prisma.WebhookDeliveryWhereInput {
  return {
    OR: [
      { status: { in: ["pending", "retrying"] }, nextAttemptAt: { lte: now } },
      { status: "sending", lastAttemptAt: { lt: new Date(now.getTime() - SENDING_STALE_MS) } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Webhook Manager
// ---------------------------------------------------------------------------

export class WebhookManager {
  constructor(private readonly fetchImpl: typeof fetch = (input, init) => fetch(input, init)) {}

  /**
   * Register a new webhook endpoint.
   * Performs a reachability test before saving (it does not block saving).
   */
  async registerWebhook(registration: WebhookRegistration): Promise<WebhookEndpoint> {
    if (!registration.organizationId) throw new Error("A webhook must belong to an organisation");
    const secret = registration.secret ?? crypto.randomBytes(32).toString("hex");

    const reachable = await this.testEndpoint(registration.url, secret);
    if (!reachable) {
      console.warn(`[Webhook] Endpoint ${registration.url} did not respond to test ping`);
    }

    const row = await prisma.webhook.create({
      data: {
        organizationId: registration.organizationId,
        url: registration.url,
        secret,
        events: registration.events,
        isActive: registration.active ?? true,
        description: registration.description?.slice(0, 500),
      },
    });
    return toEndpoint(row);
  }

  /** Deregister a webhook endpoint (its delivery rows go with it). */
  async deregisterWebhook(webhookId: string): Promise<void> {
    await prisma.webhook.deleteMany({ where: { id: webhookId } });
  }

  /** Update webhook events, URL, state or description. */
  async updateWebhook(
    webhookId: string,
    updates: Partial<Pick<WebhookEndpoint, "url" | "events" | "active" | "description">>,
  ): Promise<WebhookEndpoint | null> {
    const existing = await prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!existing) return null;
    const row = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(updates.url !== undefined ? { url: updates.url } : {}),
        ...(updates.events !== undefined ? { events: updates.events } : {}),
        ...(updates.active !== undefined ? { isActive: updates.active } : {}),
        ...(updates.description !== undefined ? { description: updates.description?.slice(0, 500) ?? null } : {}),
      },
    });
    return toEndpoint(row);
  }

  /**
   * Trigger a webhook event for an organisation: one delivery row per matching
   * endpoint, then a first attempt right away (non-blocking).
   */
  async triggerEvent(
    event: WebhookEventType,
    organizationId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await prisma.webhook.findMany({
      where: { organizationId, isActive: true, events: { has: event } },
      select: { id: true },
    });
    for (const endpoint of endpoints) {
      const delivery = await prisma.webhookDelivery.create({
        data: { webhookId: endpoint.id, event, payload: payload as Prisma.InputJsonValue, status: "pending", nextAttemptAt: new Date() },
        select: { id: true },
      });
      this.attemptDelivery(delivery.id).catch((err) => console.error("[Webhook] delivery error", err));
    }
  }

  /**
   * Send every delivery that is due (first attempts that never ran, retries,
   * attempts abandoned by a dead instance) and prune old rows. Safe to run on
   * every instance at once. Returns how many attempts this call made.
   */
  async processDueDeliveries(now = new Date()): Promise<number> {
    const due = await prisma.webhookDelivery.findMany({
      where: claimableWhere(now),
      orderBy: { nextAttemptAt: "asc" },
      take: SWEEP_BATCH,
      select: { id: true },
    });
    let attempted = 0;
    for (const { id } of due) {
      if (await this.attemptDelivery(id, now)) attempted++;
    }
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60_000);
    await prisma.webhookDelivery.deleteMany({ where: { createdAt: { lt: cutoff }, status: { in: ["delivered", "failed"] } } });
    return attempted;
  }

  /**
   * Make one attempt for a delivery if it is claimable. Returns false when
   * another instance holds it, it is not due, or it is already finished.
   */
  async attemptDelivery(deliveryId: string, now = new Date()): Promise<boolean> {
    const current = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });
    if (!current) return false;

    // Claim: only one instance can move this row from its current attempt count.
    const claimed = await prisma.webhookDelivery.updateMany({
      where: { id: deliveryId, attempts: current.attempts, ...claimableWhere(now) },
      data: { status: "sending", attempts: current.attempts + 1, lastAttemptAt: now },
    });
    if (claimed.count !== 1) return false;
    const attempt = current.attempts + 1;

    if (!current.webhook.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: "failed", nextAttemptAt: null, responseBody: "Webhook disabled" },
      });
      return true;
    }

    const timestamp = Math.floor(now.getTime() / 1000);
    const body = JSON.stringify({ event: current.event, timestamp, data: current.payload });
    const signature = sign(current.webhook.secret, timestamp, body);

    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let ok = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await this.fetchImpl(current.webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-b4skills-Signature": `sha256=${signature}`,
            "X-b4skills-Timestamp": String(timestamp),
            "X-b4skills-Event": current.event,
            "X-b4skills-Delivery": deliveryId,
            "User-Agent": "b4skills-Webhooks/1.0",
          },
          body,
          signal: controller.signal,
          redirect: "manual",
        });
        responseCode = response.status;
        responseBody = (await response.text()).slice(0, 500);
        ok = response.ok;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      responseBody = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    }

    if (ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: "delivered", nextAttemptAt: null, responseCode, responseBody },
      });
      return true;
    }

    const exhausted = attempt >= MAX_ATTEMPTS;
    console.warn(`[Webhook] Attempt ${attempt} failed for ${current.webhook.url}: ${responseCode ?? responseBody}`);
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: exhausted
        ? { status: "failed", nextAttemptAt: null, responseCode, responseBody }
        : { status: "retrying", nextAttemptAt: new Date(now.getTime() + (RETRY_DELAYS_MS[attempt] ?? 300_000)), responseCode, responseBody },
    });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Endpoint test
  // ---------------------------------------------------------------------------

  private async testEndpoint(url: string, secret: string): Promise<boolean> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const body = JSON.stringify({ event: "ping", timestamp, data: {} });
      const signature = sign(secret, timestamp, body);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-b4skills-Signature": `sha256=${signature}`,
          "X-b4skills-Event": "ping",
        },
        body,
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timeout);
      return res.status < 500;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getEndpointsForOrg(organizationId: string): Promise<WebhookEndpoint[]> {
    const rows = await prisma.webhook.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
    return rows.map(toEndpoint);
  }

  /** Recent deliveries, optionally for one webhook and/or limited to one organisation. */
  async getDeliveryLog(webhookId?: string, limit = 100, organizationId?: string): Promise<WebhookDelivery[]> {
    const take = Math.min(Math.max(1, Math.floor(limit) || 100), 500);
    const rows = await prisma.webhookDelivery.findMany({
      where: {
        ...(webhookId ? { webhookId } : {}),
        ...(organizationId ? { webhook: { organizationId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    return rows.map(toDelivery);
  }

  async getDeliveryStats(organizationId: string): Promise<{ total: number; delivered: number; failed: number; pending: number }> {
    const groups = await prisma.webhookDelivery.groupBy({
      by: ["status"],
      where: { webhook: { organizationId } },
      _count: { _all: true },
    });
    const count = (statuses: string[]) => groups
      .filter((g) => statuses.includes(g.status))
      .reduce((sum, g) => sum + g._count._all, 0);
    return {
      total: count(["pending", "sending", "retrying", "delivered", "failed"]),
      delivered: count(["delivered"]),
      failed: count(["failed"]),
      pending: count(["pending", "sending", "retrying"]),
    };
  }

  /** @deprecated Endpoints are read from the database on demand; kept for callers. */
  async loadFromDatabase(): Promise<void> {}
}

export const webhookManager = new WebhookManager();
