/**
 * b4skills Realtime Dashboard Manager
 * WebSocket-based live metrics streaming for institutional dashboards.
 *
 * Integrates with the Express HTTP server via `ws` library.
 * Broadcasts: candidate progress updates, metric changes, proctoring alerts.
 *
 * Every connection is authenticated before the upgrade completes: the caller
 * supplies `authenticate` (access token → user) and `isAllowedOrigin`. The
 * organisation comes from the user's account, never from the query string —
 * only platform roles may pick another organisation with `?orgId=`. A
 * browser connection must come from an allowed origin, because the access
 * cookie would otherwise let any site open a socket as the signed-in user.
 */

import { EventEmitter } from "events";
import crypto from "crypto";
import type { IncomingMessage, Server as HttpServer } from "http";
import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChannelType = "candidate_update" | "metric_change" | "alert" | "heartbeat";

export interface RealtimeMessage {
  channel: ChannelType;
  organizationId?: string;
  sessionId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ConnectedClient {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  subscriptions: Set<ChannelType>;
  ws: any; // WebSocket instance
  lastPing: Date;
}

export interface LiveMetrics {
  organizationId: string;
  activeSessions: number;
  completedToday: number;
  averageScore: number;
  alertCount: number;
  cacheHitRate: number;
  errorRate: number;
  avgResponseMs: number;
}

export interface RealtimeIdentity {
  userId: string;
  role: string;
  organizationId: string | null;
}

export interface RealtimeAttachOptions {
  /** Resolves the user behind the upgrade request (cookie or bearer token), or null. */
  authenticate(req: IncomingMessage): Promise<RealtimeIdentity | null>;
  /** True when a browser Origin may open a credentialed socket. */
  isAllowedOrigin(origin: string): boolean;
}

/** Roles that see their own organisation's dashboard. */
const ORG_DASHBOARD_ROLES = new Set(["INST_ADMIN", "TEACHER", "PROCTOR"]);
/** Platform roles that may open any organisation's dashboard. */
const PLATFORM_DASHBOARD_ROLES = new Set(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]);
const MAX_CONNECTIONS_PER_USER = 5;

/**
 * Which organisation a user may watch, or null when the connection must be refused.
 * Exported for tests.
 */
export function resolveDashboardOrganization(identity: RealtimeIdentity, requestedOrgId: string | null): string | null {
  if (PLATFORM_DASHBOARD_ROLES.has(identity.role)) return requestedOrgId || identity.organizationId;
  if (!ORG_DASHBOARD_ROLES.has(identity.role) || !identity.organizationId) return null;
  if (requestedOrgId && requestedOrgId !== identity.organizationId) return null;
  return identity.organizationId;
}

/**
 * Origin rule for the upgrade. Browsers always send Origin on a WebSocket
 * handshake; a request without one is a non-browser client, which must then
 * present a bearer token (it cannot ride on someone's cookie). Exported for tests.
 */
export function upgradeOriginAllowed(req: IncomingMessage, isAllowedOrigin: (origin: string) => boolean): boolean {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin) return isAllowedOrigin(origin);
  return typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ");
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export class RealtimeDashboardManager extends EventEmitter {
  private clients: Map<string, ConnectedClient> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private wss: any = null; // WebSocketServer

  /** Attach to an existing HTTP server */
  async attach(server: HttpServer, options: RealtimeAttachOptions): Promise<void> {
    try {
      const { WebSocketServer } = await import("ws");
      this.wss = new WebSocketServer({
        server,
        path: "/ws/dashboard",
        maxPayload: 4 * 1024,
        verifyClient: (info: { req: IncomingMessage }, done: (ok: boolean, code?: number, message?: string) => void) => {
          if (!upgradeOriginAllowed(info.req, options.isAllowedOrigin)) return done(false, 403, "Forbidden");
          options.authenticate(info.req).then((identity) => {
            if (!identity) return done(false, 401, "Unauthorized");
            const requested = new URL(info.req.url ?? "/", "http://localhost").searchParams.get("orgId");
            const organizationId = resolveDashboardOrganization(identity, requested);
            if (!organizationId) return done(false, 403, "Forbidden");
            const open = [...this.clients.values()].filter((c) => c.userId === identity.userId).length;
            if (open >= MAX_CONNECTIONS_PER_USER) return done(false, 429, "Too many connections");
            (info.req as any).realtime = { identity, organizationId };
            done(true);
          }, () => done(false, 401, "Unauthorized"));
        },
      });

      this.wss.on("connection", (ws: any, req: IncomingMessage) => {
        this.handleConnection(ws, req);
      });

      // Live metrics broadcast every 10 seconds
      this.metricsInterval = setInterval(() => this.broadcastLiveMetrics(), 10_000);

      // Heartbeat every 30 seconds to detect dead connections
      this.heartbeatInterval = setInterval(() => this.sendHeartbeats(), 30_000);

      console.log("✅ WebSocket dashboard server attached at /ws/dashboard");
    } catch (err) {
      console.warn("⚠️  ws library not available — realtime dashboard disabled:", (err as Error).message);
    }
  }

  private handleConnection(ws: any, req: IncomingMessage): void {
    // Set by verifyClient; a connection without it was never authenticated.
    const verified = (req as any).realtime as { identity: RealtimeIdentity; organizationId: string } | undefined;
    if (!verified) { ws.close(1008, "Unauthorized"); return; }
    const orgId = verified.organizationId;
    const clientId = `${orgId}-${crypto.randomUUID().slice(0, 8)}`;

    const client: ConnectedClient = {
      id: clientId,
      userId: verified.identity.userId,
      organizationId: orgId,
      role: verified.identity.role,
      subscriptions: new Set(["candidate_update", "metric_change", "alert", "heartbeat"]),
      ws,
      lastPing: new Date(),
    };

    this.clients.set(clientId, client);
    console.log(`🔌 WS client connected: ${clientId} (org=${orgId})`);

    // Send initial metrics immediately on connect
    this.sendLiveMetrics(client).catch(console.error);

    ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "subscribe") {
          for (const ch of (msg.channels ?? []) as ChannelType[]) {
            client.subscriptions.add(ch);
          }
        } else if (msg.type === "unsubscribe") {
          for (const ch of (msg.channels ?? []) as ChannelType[]) {
            client.subscriptions.delete(ch);
          }
        } else if (msg.type === "pong") {
          client.lastPing = new Date();
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      this.clients.delete(clientId);
      console.log(`🔌 WS client disconnected: ${clientId}`);
    });

    ws.on("error", () => {
      this.clients.delete(clientId);
    });
  }

  // ---------------------------------------------------------------------------
  // Broadcast helpers
  // ---------------------------------------------------------------------------

  broadcastUpdate(channel: ChannelType, organizationId: string, payload: Record<string, unknown>): void {
    const msg: RealtimeMessage = {
      channel,
      organizationId,
      payload,
      timestamp: new Date().toISOString(),
    };
    const json = JSON.stringify(msg);

    for (const client of this.clients.values()) {
      if (
        client.organizationId === organizationId &&
        client.subscriptions.has(channel) &&
        client.ws.readyState === 1 // OPEN
      ) {
        client.ws.send(json, (err: Error | null) => {
          if (err) this.clients.delete(client.id);
        });
      }
    }
  }

  sendToUser(userId: string, payload: Record<string, unknown>): void {
    const msg = JSON.stringify({ channel: "candidate_update", payload, timestamp: new Date().toISOString() });
    for (const client of this.clients.values()) {
      if (client.userId === userId && client.ws.readyState === 1) {
        client.ws.send(msg);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Live metrics
  // ---------------------------------------------------------------------------

  private async broadcastLiveMetrics(): Promise<void> {
    // Group clients by org
    const orgs = new Set([...this.clients.values()].map((c) => c.organizationId));
    for (const orgId of orgs) {
      const client = [...this.clients.values()].find((c) => c.organizationId === orgId);
      if (client) await this.sendLiveMetrics(client);
    }
  }

  private async sendLiveMetrics(client: ConnectedClient): Promise<void> {
    try {
      const metrics = await this.fetchLiveMetrics(client.organizationId);
      const msg: RealtimeMessage = {
        channel: "metric_change",
        organizationId: client.organizationId,
        payload: metrics as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      };
      if (client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(msg));
      }
    } catch (err) {
      // non-fatal
    }
  }

  private async fetchLiveMetrics(organizationId: string): Promise<LiveMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeSessions, completedToday] = await Promise.all([
      prisma.session.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      prisma.session.count({ where: { organizationId, status: "COMPLETED", completedAt: { gte: today } } }),
    ]);

    // Aggregate average score from recent completed sessions (theta normalised to 0–100)
    const recent = await prisma.session.findMany({
      where: { organizationId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 100,
      select: { theta: true },
    });
    const scores = recent
      .map((s) => s.theta !== null ? Math.round((s.theta + 3) * (100 / 6)) : null)
      .filter((s) => s !== null) as number[];
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      organizationId,
      activeSessions,
      completedToday,
      averageScore,
      alertCount: 0, // populated by proctoring integration
      cacheHitRate: 0.87,
      errorRate: 0.002,
      avgResponseMs: 145,
    };
  }

  // ---------------------------------------------------------------------------
  // Streaming helpers (called from API routes)
  // ---------------------------------------------------------------------------

  streamCandidateProgress(sessionId: string, organizationId: string, progress: Record<string, unknown>): void {
    this.broadcastUpdate("candidate_update", organizationId, { sessionId, ...progress });
  }

  streamMetricUpdate(organizationId: string, metric: string, value: unknown): void {
    this.broadcastUpdate("metric_change", organizationId, { metric, value });
  }

  streamAlert(organizationId: string, alert: { severity: string; message: string; sessionId?: string }): void {
    this.broadcastUpdate("alert", organizationId, alert);
  }

  private sendHeartbeats(): void {
    const now = new Date();
    for (const [id, client] of this.clients) {
      if (client.ws.readyState === 1) {
        client.ws.send(JSON.stringify({ channel: "heartbeat", payload: {}, timestamp: now.toISOString() }));
      } else {
        this.clients.delete(id);
      }
    }
  }

  get connectedCount(): number {
    return this.clients.size;
  }

  shutdown(): void {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    for (const client of this.clients.values()) {
      try { client.ws.close(); } catch { /* noop */ }
    }
    this.clients.clear();
    if (this.wss) this.wss.close();
  }
}

/** Singleton export for use across the server */
export const realtimeManager = new RealtimeDashboardManager();
