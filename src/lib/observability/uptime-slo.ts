/**
 * 99.99% Uptime Infrastructure
 * ─────────────────────────────────────────────────────────────────────────────
 * Components:
 *   1. CircuitBreaker  — wraps external calls (DB, OpenAI, Redis) and opens
 *                        after N failures to prevent cascade failures
 *   2. DeepHealthCheck — probes DB, Redis, AI APIs; returns structured status
 *      GET /api/healthz/live   → liveness (process is up)
 *      GET /api/healthz/ready  → readiness (all dependencies healthy)
 *      GET /api/healthz/deep   → full dependency status (admin only)
 *   3. UptimeTracker   — records per-minute availability; computes rolling
 *                        30-day availability percentage toward 99.99% SLO
 *                        (99.99% = ≤52.6 min downtime/year, ≤4.38 min/month)
 *
 * Circuit breaker states:
 *   CLOSED → normal operation
 *   OPEN   → failing fast (no calls to dependency)
 *   HALF_OPEN → probe: next call tests if dependency recovered
 */

// ── Circuit Breaker ───────────────────────────────────────────────────────────

export type CBState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Consecutive failures to trip to OPEN (default 5) */
  failureThreshold?: number;
  /** Consecutive successes in HALF_OPEN to close (default 2) */
  successThreshold?: number;
  /** Time (ms) to wait before moving OPEN → HALF_OPEN (default 30_000) */
  resetTimeout?: number;
  /** Optional label for metrics/logging */
  name?: string;
}

export class CircuitBreaker {
  private state: CBState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private nextAttemptAt = 0;
  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.opts = {
      failureThreshold: opts.failureThreshold ?? 5,
      successThreshold: opts.successThreshold ?? 2,
      resetTimeout: opts.resetTimeout ?? 30_000,
      name: opts.name ?? "circuit",
    };
  }

  get currentState(): CBState { return this.state; }
  get name(): string { return this.opts.name; }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttemptAt) {
        throw new Error(`[CircuitBreaker:${this.opts.name}] OPEN — failing fast`);
      }
      this.state = "HALF_OPEN";
      this.successes = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.opts.successThreshold) {
        this.state = "CLOSED";
        console.log(`[CircuitBreaker:${this.opts.name}] CLOSED (recovered)`);
      }
    }
  }

  private onFailure() {
    this.failures++;
    if (this.state === "HALF_OPEN" || this.failures >= this.opts.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptAt = Date.now() + this.opts.resetTimeout;
      console.warn(`[CircuitBreaker:${this.opts.name}] OPEN — ${this.failures} failures, reset in ${this.opts.resetTimeout}ms`);
    }
  }

  status() {
    return {
      name: this.opts.name,
      state: this.state,
      failures: this.failures,
      nextAttemptAt: this.state === "OPEN" ? new Date(this.nextAttemptAt).toISOString() : null,
    };
  }
}

// ── Shared breakers (one per external dependency) ─────────────────────────────

export const breakers = {
  database: new CircuitBreaker({ name: "database", failureThreshold: 3, resetTimeout: 15_000 }),
  redis:    new CircuitBreaker({ name: "redis",    failureThreshold: 5, resetTimeout: 30_000 }),
  openai:   new CircuitBreaker({ name: "openai",   failureThreshold: 3, resetTimeout: 60_000 }),
  s3:       new CircuitBreaker({ name: "s3",       failureThreshold: 5, resetTimeout: 30_000 }),
};

// ── Deep health check ──────────────────────────────────────────────────────────

export type DepStatus = "ok" | "degraded" | "down" | "skipped";

export interface DepHealth {
  name: string;
  status: DepStatus;
  latencyMs: number | null;
  detail?: string;
}

export interface DeepHealthResult {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;           // process uptime in seconds
  timestamp: string;
  region: string;
  dependencies: DepHealth[];
  circuitBreakers: ReturnType<CircuitBreaker["status"]>[];
  availabilityPct30d: number | null;
}

async function probeDb(): Promise<DepHealth> {
  const t0 = Date.now();
  try {
    if (!process.env.DATABASE_URL) return { name: "database", status: "skipped", latencyMs: null, detail: "No DATABASE_URL" };
    const { prisma } = await import("../prisma.js");
    await (prisma as any).$queryRaw`SELECT 1`;
    return { name: "database", status: "ok", latencyMs: Date.now() - t0 };
  } catch (err: any) {
    return { name: "database", status: "down", latencyMs: Date.now() - t0, detail: String(err.message ?? err) };
  }
}

async function probeRedis(): Promise<DepHealth> {
  const t0 = Date.now();
  try {
    if (!process.env.REDIS_URL) return { name: "redis", status: "skipped", latencyMs: null, detail: "No REDIS_URL" };
    const { Redis } = await import("ioredis");
    const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 3000, lazyConnect: true });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return { name: "redis", status: "ok", latencyMs: Date.now() - t0 };
  } catch (err: any) {
    return { name: "redis", status: "down", latencyMs: Date.now() - t0, detail: String(err.message ?? err) };
  }
}

async function probeOpenAI(): Promise<DepHealth> {
  const t0 = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY) return { name: "openai", status: "skipped", latencyMs: null, detail: "No OPENAI_API_KEY" };
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    const status: DepStatus = res.ok ? "ok" : "degraded";
    return { name: "openai", status, latencyMs: Date.now() - t0, detail: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err: any) {
    return { name: "openai", status: "down", latencyMs: Date.now() - t0, detail: String(err.message ?? err) };
  }
}

export async function runDeepHealthCheck(): Promise<DeepHealthResult> {
  const [db, redis, ai] = await Promise.all([probeDb(), probeRedis(), probeOpenAI()]);
  const deps = [db, redis, ai];

  const anyDown    = deps.some((d) => d.status === "down");
  const anyDegraded = deps.some((d) => d.status === "degraded");
  const overallStatus = anyDown ? "unhealthy" : anyDegraded ? "degraded" : "healthy";

  return {
    status: overallStatus,
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    region: process.env.FLY_REGION ?? "local",
    dependencies: deps,
    circuitBreakers: Object.values(breakers).map((b) => b.status()),
    availabilityPct30d: uptimeTracker.compute30dAvailability(),
  };
}

// ── Uptime Tracker ─────────────────────────────────────────────────────────────

interface MinuteBucket {
  minute: number; // Unix timestamp rounded to minute
  healthy: boolean;
}

class UptimeTracker {
  private readonly buckets: MinuteBucket[] = [];
  private readonly MAX_BUCKETS = 60 * 24 * 30; // 30 days of per-minute buckets

  record(healthy: boolean) {
    const minute = Math.floor(Date.now() / 60_000) * 60_000;
    // Replace existing bucket for this minute or push new one
    const idx = this.buckets.findIndex((b) => b.minute === minute);
    if (idx >= 0) {
      this.buckets[idx].healthy = this.buckets[idx].healthy && healthy;
    } else {
      this.buckets.push({ minute, healthy });
      if (this.buckets.length > this.MAX_BUCKETS) this.buckets.shift();
    }
  }

  compute30dAvailability(): number | null {
    if (this.buckets.length < 60) return null; // need at least 1h of data
    const healthy = this.buckets.filter((b) => b.healthy).length;
    return Math.round((healthy / this.buckets.length) * 100_000) / 1000; // 3 decimal places
  }

  sloStatus(): { target: number; achieved: number | null; compliant: boolean | null; downtimeMinutesThisMonth: number | null } {
    const TARGET_99_99 = 99.99;
    const achieved = this.compute30dAvailability();
    const totalMinutes = this.buckets.length;
    const unhealthy = this.buckets.filter((b) => !b.healthy).length;

    return {
      target: TARGET_99_99,
      achieved,
      compliant: achieved !== null ? achieved >= TARGET_99_99 : null,
      downtimeMinutesThisMonth: totalMinutes > 0 ? unhealthy : null,
    };
  }
}

export const uptimeTracker = new UptimeTracker();

// Start recording health every 30 seconds (two probes per minute bucket)
if (typeof setInterval !== "undefined") {
  setInterval(async () => {
    const result = await runDeepHealthCheck().catch(() => null);
    uptimeTracker.record(result?.status === "healthy");
  }, 30_000);
}
