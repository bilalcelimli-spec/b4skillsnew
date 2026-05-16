/**
 * Unit tests for the Prometheus metrics module.
 *
 * Tests verify:
 *   - recordAiScore increments the right counters and histograms
 *   - setCircuitBreakerState sets the gauge correctly
 *   - metricsMiddleware records request duration and increments counters
 *   - metricsHandler returns Prometheus text format with correct content-type
 *   - 5xx responses are counted separately
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registry,
  recordAiScore,
  setCircuitBreakerState,
  metricsMiddleware,
  metricsHandler,
  aiScoringTotal,
  aiScoringDuration,
  circuitBreakerState,
  httpRequestsTotal,
  http5xxErrors,
} from "../metrics.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(overrides: { path?: string; method?: string; route?: { path: string } } = {}) {
  return {
    path: "/api/test",
    method: "GET",
    route: undefined,
    ...overrides,
  } as any;
}

function makeRes(statusCode = 200) {
  const listeners: Record<string, Function[]> = {};
  return {
    statusCode,
    setHeader: vi.fn(),
    end: vi.fn(),
    on(event: string, fn: Function) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    emit(event: string) {
      (listeners[event] ?? []).forEach((fn) => fn());
    },
  } as any;
}

const next = vi.fn();

// ── Tests ────────────────────────────────────────────────────────────────────

describe("recordAiScore", () => {
  it("increments aiScoringTotal with normalised skill label", async () => {
    // Read the current value before
    const before = await aiScoringTotal.get();
    const writeAutosBefore = before.values.find(
      (v) => v.labels.skill === "WRITING" && v.labels.source === "ai_auto"
    )?.value ?? 0;

    recordAiScore("writing", "ai_auto", 1500);

    const after = await aiScoringTotal.get();
    const writeAutosAfter = after.values.find(
      (v) => v.labels.skill === "WRITING" && v.labels.source === "ai_auto"
    )?.value ?? 0;

    expect(writeAutosAfter).toBe(writeAutosBefore + 1);
  });

  it("observes aiScoringDuration histogram in seconds", async () => {
    const before = await aiScoringDuration.get();
    const sumBefore = before.values
      .filter((v) => v.labels.skill === "SPEAKING" && v.metricName?.includes("sum"))
      .reduce((a, v) => a + v.value, 0);

    recordAiScore("SPEAKING", "ai_flagged", 3000); // 3s

    const after = await aiScoringDuration.get();
    const sumAfter = after.values
      .filter((v) => v.labels.skill === "SPEAKING" && v.metricName?.includes("sum"))
      .reduce((a, v) => a + v.value, 0);

    // Sum should have increased by ~3 seconds (±small rounding)
    expect(sumAfter - sumBefore).toBeCloseTo(3, 1);
  });
});

describe("setCircuitBreakerState", () => {
  it("sets gauge to 0 for CLOSED", async () => {
    setCircuitBreakerState("gemini", "CLOSED");
    const data = await circuitBreakerState.get();
    const val = data.values.find((v) => v.labels.service === "gemini")?.value;
    expect(val).toBe(0);
  });

  it("sets gauge to 1 for HALF_OPEN", async () => {
    setCircuitBreakerState("gemini", "HALF_OPEN");
    const data = await circuitBreakerState.get();
    const val = data.values.find((v) => v.labels.service === "gemini")?.value;
    expect(val).toBe(1);
  });

  it("sets gauge to 2 for OPEN", async () => {
    setCircuitBreakerState("gemini", "OPEN");
    const data = await circuitBreakerState.get();
    const val = data.values.find((v) => v.labels.service === "gemini")?.value;
    expect(val).toBe(2);
    // Reset to closed so other tests start clean
    setCircuitBreakerState("gemini", "CLOSED");
  });
});

describe("metricsMiddleware", () => {
  it("increments httpRequestsTotal on response finish", async () => {
    const before = await httpRequestsTotal.get();
    const countBefore = before.values
      .filter((v) => v.labels.method === "GET" && v.labels.status === "200")
      .reduce((a, v) => a + v.value, 0);

    const req = makeReq({ path: "/api/items", method: "GET" });
    const res = makeRes(200);

    metricsMiddleware(req, res, next);
    res.emit("finish");

    const after = await httpRequestsTotal.get();
    const countAfter = after.values
      .filter((v) => v.labels.method === "GET" && v.labels.status === "200")
      .reduce((a, v) => a + v.value, 0);

    expect(countAfter).toBeGreaterThan(countBefore);
  });

  it("increments http5xxErrors for 500 responses", async () => {
    const before = await http5xxErrors.get();
    const errsBefore = before.values.reduce((a, v) => a + v.value, 0);

    const req = makeReq({ path: "/api/items", method: "POST" });
    const res = makeRes(500);

    metricsMiddleware(req, res, next);
    res.emit("finish");

    const after = await http5xxErrors.get();
    const errsAfter = after.values.reduce((a, v) => a + v.value, 0);

    expect(errsAfter).toBe(errsBefore + 1);
  });

  it("skips /metrics and /healthz paths", async () => {
    const before = await httpRequestsTotal.get();
    const sumBefore = before.values.reduce((a, v) => a + v.value, 0);

    for (const path of ["/metrics", "/healthz", "/readyz"]) {
      const req = makeReq({ path });
      const res = makeRes(200);
      metricsMiddleware(req, res, next);
      res.emit("finish");
    }

    const after = await httpRequestsTotal.get();
    const sumAfter = after.values.reduce((a, v) => a + v.value, 0);

    // Counter must NOT have increased for skipped paths
    expect(sumAfter).toBe(sumBefore);
  });

  it("calls next()", () => {
    const localNext = vi.fn();
    const req = makeReq();
    const res = makeRes();
    metricsMiddleware(req, res, localNext);
    expect(localNext).toHaveBeenCalledOnce();
  });

  it("uses Express matched route.path when available", async () => {
    const req = makeReq({
      path: "/api/sessions/clxyz123/respond",
      method: "POST",
      route: { path: "/api/sessions/:id/respond" },
    });
    const res = makeRes(200);

    metricsMiddleware(req, res, next);
    res.emit("finish");

    const data = await httpRequestsTotal.get();
    const hasRouteLabel = data.values.some(
      (v) => v.labels.route === "/api/sessions/:id/respond"
    );
    expect(hasRouteLabel).toBe(true);
  });
});

describe("metricsHandler", () => {
  it("sets Content-Type to Prometheus text format and returns metrics text", async () => {
    const res = {
      headers: {} as Record<string, string>,
      body: "",
      setHeader(name: string, value: string) { this.headers[name] = value; },
      end(data: string) { this.body = data; },
    } as any;

    await metricsHandler({} as any, res);

    expect(res.headers["Content-Type"]).toContain("text/plain");
    expect(res.body).toContain("http_requests_total");
    expect(res.body).toContain("ai_scoring_total");
    expect(res.body).toContain("circuit_breaker_state");
  });
});
