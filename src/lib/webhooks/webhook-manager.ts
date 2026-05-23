/**
 * b4skills Webhook Manager
 *
 * Event-driven delivery to registered HTTP endpoints.
 * Features:
 *  - HMAC-SHA256 signature on every delivery
 *  - Exponential-backoff retry (max 3 attempts)
 *  - Delivery log with status tracking
 *  - URL reachability test on registration
 */

import * as crypto from "crypto";
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

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "failed" | "retrying";
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
}

// ---------------------------------------------------------------------------
// In-memory store (replace with DB table in production)
// ---------------------------------------------------------------------------

const endpoints = new Map<string, WebhookEndpoint>();
const deliveryLog = new Map<string, WebhookDelivery>();
const retryQueue: string[] = []; // delivery IDs pending retry

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------

function sign(secret: string, timestamp: number, payload: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${payload}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Webhook Manager
// ---------------------------------------------------------------------------

export class WebhookManager {
  /**
   * Register a new webhook endpoint.
   * Performs a reachability test before saving.
   */
  async registerWebhook(registration: WebhookRegistration): Promise<WebhookEndpoint> {
    const id = crypto.randomUUID();
    const secret = registration.secret ?? crypto.randomBytes(32).toString("hex");

    // Reachability test (fire a test ping)
    const reachable = await this.testEndpoint(registration.url, secret);
    if (!reachable) {
      console.warn(`[Webhook] Endpoint ${registration.url} did not respond to test ping`);
      // Don't block registration — endpoint may be temporarily down
    }

    const endpoint: WebhookEndpoint = {
      id,
      organizationId: registration.organizationId,
      url: registration.url,
      secret,
      events: registration.events,
      active: true,
      createdAt: new Date(),
      description: registration.description,
    };

    endpoints.set(id, endpoint);

    // Persist to DB webhook record if table exists
    try {
      await (prisma as any).webhook.upsert({
        where: { id },
        update: {},
        create: {
          id,
          organizationId: registration.organizationId,
          url: registration.url,
          secret,
          events: registration.events,
          active: true,
          description: registration.description,
        },
      });
    } catch {
      // Table may not exist yet — keep in-memory
    }

    return endpoint;
  }

  /**
   * Deregister a webhook endpoint.
   */
  async deregisterWebhook(webhookId: string): Promise<void> {
    endpoints.delete(webhookId);
    try {
      await (prisma as any).webhook.delete({ where: { id: webhookId } });
    } catch { /* noop */ }
  }

  /**
   * Update webhook events or URL.
   */
  async updateWebhook(webhookId: string, updates: Partial<Pick<WebhookEndpoint, "url" | "events" | "active" | "description">>): Promise<WebhookEndpoint | null> {
    const endpoint = endpoints.get(webhookId);
    if (!endpoint) return null;
    const updated = { ...endpoint, ...updates };
    endpoints.set(webhookId, updated);
    return updated;
  }

  /**
   * Trigger a webhook event for an organisation.
   */
  async triggerEvent(
    event: WebhookEventType,
    organizationId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const orgEndpoints = [...endpoints.values()].filter(
      (e) => e.organizationId === organizationId && e.active && e.events.includes(event)
    );

    for (const endpoint of orgEndpoints) {
      const deliveryId = crypto.randomUUID();
      const delivery: WebhookDelivery = {
        id: deliveryId,
        webhookId: endpoint.id,
        event,
        payload,
        status: "pending",
        attempts: 0,
        lastAttemptAt: null,
        responseCode: null,
        responseBody: null,
        nextRetryAt: new Date(),
        createdAt: new Date(),
      };
      deliveryLog.set(deliveryId, delivery);

      // Deliver immediately (non-blocking)
      this.queueWebhookDelivery(deliveryId, endpoint, payload, event).catch(console.error);
    }
  }

  /**
   * Deliver a webhook with retry logic.
   */
  private async queueWebhookDelivery(
    deliveryId: string,
    endpoint: WebhookEndpoint,
    payload: Record<string, unknown>,
    event: WebhookEventType,
    attempt = 1
  ): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [0, 60_000, 300_000]; // 0s, 1m, 5m

    const delivery = deliveryLog.get(deliveryId);
    if (!delivery) return;

    if (attempt <= MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt - 1] ?? 300_000;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } else {
      delivery.status = "failed";
      deliveryLog.set(deliveryId, delivery);
      console.error(`[Webhook] Delivery ${deliveryId} failed after ${MAX_RETRIES} attempts`);
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event, timestamp, data: payload });
    const signature = sign(endpoint.secret, timestamp, body);

    delivery.status = "retrying";
    delivery.attempts = attempt;
    delivery.lastAttemptAt = new Date();
    deliveryLog.set(deliveryId, delivery);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-b4skills-Signature": `sha256=${signature}`,
          "X-b4skills-Timestamp": String(timestamp),
          "X-b4skills-Event": event,
          "User-Agent": "b4skills-Webhooks/1.0",
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      delivery.responseCode = response.status;
      delivery.responseBody = (await response.text()).slice(0, 500);

      if (response.ok) {
        delivery.status = "delivered";
        console.log(`[Webhook] ✅ Delivered ${event} to ${endpoint.url} (${response.status})`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Webhook] Attempt ${attempt} failed for ${endpoint.url}: ${msg}`);
      delivery.responseBody = msg;

      if (attempt < MAX_RETRIES) {
        delivery.nextRetryAt = new Date(Date.now() + (RETRY_DELAYS[attempt] ?? 300_000));
        deliveryLog.set(deliveryId, delivery);
        await this.queueWebhookDelivery(deliveryId, endpoint, payload, event, attempt + 1);
        return;
      } else {
        delivery.status = "failed";
      }
    }

    deliveryLog.set(deliveryId, delivery);
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
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-b4skills-Signature": `sha256=${signature}`,
          "X-b4skills-Event": "ping",
        },
        body,
        signal: controller.signal,
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

  getEndpointsForOrg(organizationId: string): WebhookEndpoint[] {
    return [...endpoints.values()].filter((e) => e.organizationId === organizationId);
  }

  getDeliveryLog(webhookId?: string, limit = 100): WebhookDelivery[] {
    const all = [...deliveryLog.values()];
    return (webhookId ? all.filter((d) => d.webhookId === webhookId) : all)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getDeliveryStats(organizationId: string): { total: number; delivered: number; failed: number; pending: number } {
    const orgEndpointIds = new Set(this.getEndpointsForOrg(organizationId).map((e) => e.id));
    const orgDeliveries = [...deliveryLog.values()].filter((d) => orgEndpointIds.has(d.webhookId));
    return {
      total: orgDeliveries.length,
      delivered: orgDeliveries.filter((d) => d.status === "delivered").length,
      failed: orgDeliveries.filter((d) => d.status === "failed").length,
      pending: orgDeliveries.filter((d) => d.status === "pending" || d.status === "retrying").length,
    };
  }

  async loadFromDatabase(): Promise<void> {
    try {
      const dbWebhooks = await (prisma as any).webhook.findMany({ where: { active: true } });
      for (const wh of dbWebhooks) {
        endpoints.set(wh.id, {
          id: wh.id,
          organizationId: wh.organizationId,
          url: wh.url,
          secret: wh.secret,
          events: wh.events,
          active: wh.active,
          createdAt: wh.createdAt,
          description: wh.description,
        });
      }
      console.log(`✅ Loaded ${dbWebhooks.length} webhooks from DB`);
    } catch {
      // Webhook table may not exist
    }
  }
}

export const webhookManager = new WebhookManager();
