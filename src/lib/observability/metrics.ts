/**
 * Prometheus metrics registry (Sprint 5).
 *
 * Metrics exposed at GET /metrics (Prometheus text format):
 *
 *   http_request_duration_seconds  — histogram (method, route, status)
 *   http_requests_total            — counter   (method, route, status)
 *   http_5xx_errors_total          — counter   (method, route)
 *   ai_scoring_duration_seconds    — histogram (skill)
 *   ai_scoring_total               — counter   (skill, source)
 *   circuit_breaker_state          — gauge     (service; 0=closed, 1=half-open, 2=open)
 *   nodejs_eventloop_lag_seconds   — histogram (built-in from prom-client)
 *   process_cpu_seconds_total      — counter   (built-in)
 *   process_resident_memory_bytes  — gauge     (built-in)
 *
 * Usage in Express:
 *
 *   import { metricsMiddleware, metricsHandler } from "./metrics.js";
 *   app.use(metricsMiddleware);
 *   app.get("/metrics", metricsHandler);
 *
 * Usage for AI scoring:
 *
 *   import { recordAiScore } from "./metrics.js";
 *   recordAiScore("WRITING", "ai_auto", durationMs);
 */

import { Registry, collectDefaultMetrics, Histogram, Counter, Gauge } from "prom-client";
import type { Request, Response, NextFunction } from "express";

// ── Registry ──────────────────────────────────────────────────────────────────

export const registry = new Registry();
registry.setDefaultLabels({ app: "linguadapt" });

// Collect Node.js built-in process metrics (CPU, memory, event loop lag)
collectDefaultMetrics({ register: registry });

// ── HTTP metrics ───────────────────────────────────────────────────────────────

/** Duration of every HTTP request, bucketed by method, normalised route, status. */
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

/** Total HTTP requests (method, normalised route, status code). */
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

/** 5xx errors — useful for alerting without querying the full histogram. */
export const http5xxErrors = new Counter({
  name: "http_5xx_errors_total",
  help: "Total HTTP 5xx server errors",
  labelNames: ["method", "route"] as const,
  registers: [registry],
});

// ── AI scoring metrics ────────────────────────────────────────────────────────

/** Latency of AI scoring calls, labelled by skill (WRITING, SPEAKING, …). */
export const aiScoringDuration = new Histogram({
  name: "ai_scoring_duration_seconds",
  help: "Duration of AI scoring calls in seconds",
  labelNames: ["skill"] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [registry],
});

/**
 * AI scoring outcomes.
 * source values: ai_auto | ai_flagged | ai_unavailable | rejected_integrity | human
 */
export const aiScoringTotal = new Counter({
  name: "ai_scoring_total",
  help: "Total AI scoring outcomes by skill and source",
  labelNames: ["skill", "source"] as const,
  registers: [registry],
});

// ── Circuit breaker state ─────────────────────────────────────────────────────

/**
 * Circuit breaker state for each downstream service.
 * 0 = CLOSED (healthy), 1 = HALF_OPEN (probe), 2 = OPEN (failing)
 */
export const circuitBreakerState = new Gauge({
  name: "circuit_breaker_state",
  help: "State of the circuit breaker (0=closed, 1=half-open, 2=open)",
  labelNames: ["service"] as const,
  registers: [registry],
});

// Initialise known circuit breakers so Prometheus has data points from the start
circuitBreakerState.set({ service: "gemini" }, 0);

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Record an AI scoring outcome.
 * Call this in ScoringOrchestrator after each score is produced.
 */
export function recordAiScore(
  skill: string,
  source: string,
  durationMs: number
): void {
  const normSkill = skill.toUpperCase();
  aiScoringTotal.inc({ skill: normSkill, source });
  aiScoringDuration.observe({ skill: normSkill }, durationMs / 1000);
}

/**
 * Update the circuit breaker gauge.
 * Import and call from the circuit breaker when state transitions.
 */
export function setCircuitBreakerState(
  service: string,
  state: "CLOSED" | "HALF_OPEN" | "OPEN"
): void {
  const value = state === "CLOSED" ? 0 : state === "HALF_OPEN" ? 1 : 2;
  circuitBreakerState.set({ service }, value);
}

// ── Route normalizer ──────────────────────────────────────────────────────────

/**
 * Collapse dynamic path segments so high-cardinality IDs don't explode the
 * Prometheus label space (e.g. /api/sessions/abc123/respond → /api/sessions/:id/respond).
 */
function normalizeRoute(req: Request): string {
  // Prefer Express's matched route pattern when available
  const expressRoute = (req as any).route?.path as string | undefined;
  if (expressRoute) return expressRoute;

  // Fallback: replace common ID-looking segments
  return req.path
    .replace(/\/[0-9a-f]{8,}(-[0-9a-f]{4,}){2,}/gi, "/:uuid") // UUIDs
    .replace(/\/c[a-z0-9]{20,}/gi, "/:cuid")                   // CUID2
    .replace(/\/[0-9]+/g, "/:id");                              // numeric IDs
}

// ── Express middleware ────────────────────────────────────────────────────────

/**
 * Prometheus HTTP metrics middleware.
 * Wire with: app.use(metricsMiddleware)
 * Must come BEFORE route handlers so the timer starts before any processing.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip Prometheus scrape endpoint and health probes from own metrics
  const skip = req.path === "/metrics" || req.path === "/healthz" || req.path === "/readyz";
  if (skip) return next();

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    const route  = normalizeRoute(req);
    const method = req.method.toUpperCase();
    const status = String(res.statusCode);

    httpRequestDuration.observe({ method, route, status }, durationSec);
    httpRequestsTotal.inc({ method, route, status });

    if (res.statusCode >= 500) {
      http5xxErrors.inc({ method, route });
    }
  });

  next();
}

/**
 * Express handler for GET /metrics.
 * Returns the Prometheus text exposition format.
 */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", registry.contentType);
  res.end(await registry.metrics());
}
