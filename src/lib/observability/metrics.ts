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
 *   cat_selection_duration_seconds — histogram (profile, skill)
 *   cat_pool_size                  — histogram (profile, skill)
 *   cat_pool_fallback_total        — counter   (profile, skill, reason)
 *   cat_stop_reason_total          — counter   (profile, reason)
 *   cat_final_sem                  — histogram (profile, skill; "OVERALL" for composite)
 *   cat_item_exposure_rate         — histogram (profile; exposure rate of the item served)
 *   cat_rapid_guess_total          — counter   (profile, skill)
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

// ── Adaptive engine (CAT) metrics ─────────────────────────────────────────────
// Labels are kept to low-cardinality values (profile name, skill, reason) so the
// series count stays bounded regardless of item bank size.

/** Wall-clock time of one next-item selection (pool query excluded). */
export const catSelectionDuration = new Histogram({
  name: "cat_selection_duration_seconds",
  help: "Duration of adaptive item selection in seconds",
  labelNames: ["profile", "skill"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
});

/** Eligible operational pool size handed to the selector. */
export const catPoolSize = new Histogram({
  name: "cat_pool_size",
  help: "Eligible item pool size at selection time",
  labelNames: ["profile", "skill"] as const,
  buckets: [0, 5, 10, 20, 40, 80, 160, 320, 640],
  registers: [registry],
});

/**
 * Pool fallbacks taken during selection.
 * reason: cross_session_exclusion | warmup_filter | pool_exhausted
 */
export const catPoolFallbackTotal = new Counter({
  name: "cat_pool_fallback_total",
  help: "Times the selector had to relax a pool filter or found no item",
  labelNames: ["profile", "skill", "reason"] as const,
  registers: [registry],
});

/** Why adaptive sessions ended (ALL_SECTIONS_COMPLETE, TIME_LIMIT_EXCEEDED, …). */
export const catStopReasonTotal = new Counter({
  name: "cat_stop_reason_total",
  help: "Adaptive session stop reasons",
  labelNames: ["profile", "reason"] as const,
  registers: [registry],
});

/** Final SEM per skill (and OVERALL) at session finalization. */
export const catFinalSem = new Histogram({
  name: "cat_final_sem",
  help: "Standard error of measurement at session finalization",
  labelNames: ["profile", "skill"] as const,
  buckets: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.8, 1.0],
  registers: [registry],
});

/** Exposure rate of each item at the moment it is served (max tracked via quantiles). */
export const catItemExposureRate = new Histogram({
  name: "cat_item_exposure_rate",
  help: "Exposure rate of the item served, at the time of selection",
  labelNames: ["profile"] as const,
  buckets: [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 1],
  registers: [registry],
});

/** Responses flagged as rapid guesses (flag only; the score is not altered). */
export const catRapidGuessTotal = new Counter({
  name: "cat_rapid_guess_total",
  help: "Responses flagged as rapid guesses",
  labelNames: ["profile", "skill"] as const,
  registers: [registry],
});

function catLabel(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

export function recordCatSelection(profile: string, skill: string, poolSize: number, durationMs: number): void {
  const labels = { profile: catLabel(profile), skill: catLabel(skill) };
  catPoolSize.observe(labels, Math.max(0, poolSize));
  catSelectionDuration.observe(labels, Math.max(0, durationMs) / 1000);
}

export function recordCatPoolFallback(profile: string, skill: string, reason: string): void {
  catPoolFallbackTotal.inc({ profile: catLabel(profile), skill: catLabel(skill), reason: catLabel(reason) });
}

export function recordCatStop(profile: string, reason: string): void {
  catStopReasonTotal.inc({ profile: catLabel(profile), reason: catLabel(reason) });
}

export function recordCatFinalSem(profile: string, skill: string, sem: number): void {
  if (!Number.isFinite(sem) || sem <= 0) return;
  catFinalSem.observe({ profile: catLabel(profile), skill: catLabel(skill) }, sem);
}

export function recordCatItemExposure(profile: string, rate: number): void {
  if (!Number.isFinite(rate) || rate < 0) return;
  catItemExposureRate.observe({ profile: catLabel(profile) }, Math.min(1, rate));
}

export function recordCatRapidGuess(profile: string, skill: string): void {
  catRapidGuessTotal.inc({ profile: catLabel(profile), skill: catLabel(skill) });
}

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
