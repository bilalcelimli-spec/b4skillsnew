import { describe, it, expect } from "vitest";
import {
  DEFAULT_RESPONSE_TIME_PARAMS,
  responseTimeParamsFromItemContent,
  rtDensity,
  expectedResponseTime,
  estimateSpeed,
  detectAberrantResponseTime,
} from "../response-time-irt.js";
import type { ResponseTimeParams } from "../response-time-irt.js";

const PARAMS: ResponseTimeParams = { beta: Math.log(30), alpha: 1.0, sigma2: 0.5 };

// ─── responseTimeParamsFromItemContent ────────────────────────────────────────

describe("responseTimeParamsFromItemContent", () => {
  it("returns defaults for empty content", () => {
    const p = responseTimeParamsFromItemContent({});
    expect(p.beta).toBe(DEFAULT_RESPONSE_TIME_PARAMS.beta);
    expect(p.alpha).toBe(DEFAULT_RESPONSE_TIME_PARAMS.alpha);
    expect(p.sigma2).toBe(DEFAULT_RESPONSE_TIME_PARAMS.sigma2);
  });

  it("returns defaults for null content", () => {
    const p = responseTimeParamsFromItemContent(null);
    expect(p.beta).toBe(DEFAULT_RESPONSE_TIME_PARAMS.beta);
  });

  it("reads rtTimeBeta and rtTimeAlpha fields", () => {
    const p = responseTimeParamsFromItemContent({ rtTimeBeta: 3.5, rtTimeAlpha: 1.2, rtTimeSigma2: 0.4 });
    expect(p.beta).toBeCloseTo(3.5, 5);
    expect(p.alpha).toBeCloseTo(1.2, 5);
    expect(p.sigma2).toBeCloseTo(0.4, 5);
  });

  it("reads legacy timeIntensity fields", () => {
    const p = responseTimeParamsFromItemContent({ timeIntensity: 4.0, timeDiscrimination: 1.5, timeResidualVar: 0.3 });
    expect(p.beta).toBeCloseTo(4.0, 5);
    expect(p.alpha).toBeCloseTo(1.5, 5);
  });

  it("falls back to default when alpha is non-positive", () => {
    const p = responseTimeParamsFromItemContent({ rtTimeBeta: 3.0, rtTimeAlpha: -1 });
    expect(p.alpha).toBe(DEFAULT_RESPONSE_TIME_PARAMS.alpha);
  });
});

// ─── rtDensity ────────────────────────────────────────────────────────────────

describe("rtDensity", () => {
  it("returns 0 for non-positive time", () => {
    expect(rtDensity(0, 0, PARAMS)).toBe(0);
    expect(rtDensity(-1, 0, PARAMS)).toBe(0);
  });

  it("returns positive density for valid time", () => {
    expect(rtDensity(30, 0, PARAMS)).toBeGreaterThan(0);
  });

  it("peaks near expected time", () => {
    const expected = expectedResponseTime(0, PARAMS);
    const dAtExpected = rtDensity(expected, 0, PARAMS);
    const dFarLow = rtDensity(1, 0, PARAMS);
    const dFarHigh = rtDensity(300, 0, PARAMS);
    expect(dAtExpected).toBeGreaterThan(dFarLow);
    expect(dAtExpected).toBeGreaterThan(dFarHigh);
  });
});

// ─── expectedResponseTime ────────────────────────────────────────────────────

describe("expectedResponseTime", () => {
  it("returns positive value", () => {
    expect(expectedResponseTime(0, PARAMS)).toBeGreaterThan(0);
  });

  it("decreases as speed (tau) increases", () => {
    const slow = expectedResponseTime(-1, PARAMS);
    const fast = expectedResponseTime(1, PARAMS);
    expect(fast).toBeLessThan(slow);
  });

  it("near 30s for tau=0 with beta=log(30)", () => {
    // E[T] = exp(β - τ + σ²/2) ≈ 30 * exp(0.5 * σ²)
    const et = expectedResponseTime(0, PARAMS);
    expect(et).toBeGreaterThan(25);
    expect(et).toBeLessThan(80);
  });
});

// ─── estimateSpeed ────────────────────────────────────────────────────────────

describe("estimateSpeed", () => {
  it("returns tau=0, se=1 for empty responses", () => {
    const { tau, seTau } = estimateSpeed([]);
    expect(tau).toBe(0);
    expect(seTau).toBe(1);
  });

  it("returns tau=0, se=1 for all-zero times", () => {
    const { tau } = estimateSpeed([{ timeSeconds: 0, params: PARAMS }]);
    expect(tau).toBe(0);
  });

  it("estimates higher tau for faster responses", () => {
    const fastResponses = Array(10).fill({ timeSeconds: 5, params: PARAMS });
    const slowResponses = Array(10).fill({ timeSeconds: 120, params: PARAMS });
    const fastTau = estimateSpeed(fastResponses).tau;
    const slowTau = estimateSpeed(slowResponses).tau;
    expect(fastTau).toBeGreaterThan(slowTau);
  });

  it("SE decreases with more responses", () => {
    const r = { timeSeconds: 30, params: PARAMS };
    const se5 = estimateSpeed(Array(5).fill(r)).seTau;
    const se50 = estimateSpeed(Array(50).fill(r)).seTau;
    expect(se50).toBeLessThan(se5);
  });
});

// ─── detectAberrantResponseTime ────────────────────────────────────────────────

describe("detectAberrantResponseTime", () => {
  it("flags rapid guess for time < 3 seconds", () => {
    const result = detectAberrantResponseTime(1500, 0, PARAMS, "item_1");
    expect(result.flag).toBe("RAPID_GUESS");
    expect(result.itemId).toBe("item_1");
  });

  it("flags normal for typical response time (30s)", () => {
    const result = detectAberrantResponseTime(30_000, 0, PARAMS, "item_2");
    expect(result.flag).toBe("NORMAL");
    expect(result.legitimacyProbability).toBe(1);
  });

  it("flags solution behavior for very slow response", () => {
    // z = (log(t) - (beta - tau)) / sigma; need z > 3
    // With PARAMS(beta=log(30), alpha=1, sigma=1): t = exp(log(30) + 3.5) ≈ 30 * e^3.5 ≈ 990s
    const verySlowMs = Math.exp(Math.log(30) + 4) * 1000; // z ≈ 4
    const result = detectAberrantResponseTime(verySlowMs, 0, PARAMS, "item_3");
    expect(result.flag).toBe("SOLUTION_BEHAVIOR");
  });

  it("returns responseTimeMs and expectedTimeMs", () => {
    const result = detectAberrantResponseTime(30_000, 0, PARAMS, "item_4");
    expect(result.responseTimeMs).toBe(30_000);
    expect(result.expectedTimeMs).toBeGreaterThan(0);
  });

  it("includes zScore", () => {
    const result = detectAberrantResponseTime(30_000, 0, PARAMS, "item_5");
    expect(typeof result.zScore).toBe("number");
  });
});
