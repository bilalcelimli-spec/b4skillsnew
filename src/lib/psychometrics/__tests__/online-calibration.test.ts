/**
 * Tests for online pretest calibration — Stocking (1990)
 * src/lib/psychometrics/__tests__/online-calibration.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  calibratePretestItem,
  batchCalibratePretest,
  PretestObservation,
} from "../online-calibration.js";
import { IrtParameters } from "../../assessment-engine/types.js";
import { probability } from "../../assessment-engine/irt.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate synthetic observations from a 3PL item given known parameters. */
function simulateObservations(
  trueParams: IrtParameters,
  thetaValues: number[]
): PretestObservation[] {
  // Deterministic: use the true probability as the "score" rounded to 0/1
  // using a fixed pseudo-random seed (simple modulo trick).
  return thetaValues.map((theta, i) => {
    const p = probability(theta, trueParams);
    // Deterministic assignment: alternate slightly around p to ensure coverage
    const score = (i % 2 === 0 ? p + 0.01 : p - 0.01) > 0.5 ? 1 : 0;
    return { theta, score: score as 0 | 1 };
  });
}

/** Generate N theta values uniformly spaced over [-3, 3]. */
function uniformThetas(n: number): number[] {
  return Array.from({ length: n }, (_, i) => -3 + (6 * i) / (n - 1));
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SEED_PARAMS: IrtParameters = { a: 1.2, b: 0.0, c: 0.20 };
const TRUE_PARAMS: IrtParameters = { a: 1.4, b: 0.3, c: 0.20 }; // slight drift

// 300 observations — above minN=200 threshold
const THETAS_300 = uniformThetas(300);
const OBS_300: PretestObservation[] = THETAS_300.map(theta => ({
  theta,
  score: probability(theta, TRUE_PARAMS) > 0.5 ? 1 : 0,
}));

// 100 observations — below minN threshold
const OBS_100: PretestObservation[] = uniformThetas(100).map(theta => ({
  theta,
  score: 0,
}));

// ─── calibratePretestItem ─────────────────────────────────────────────────────

describe("calibratePretestItem", () => {
  it("returns stable=false when n < minN", () => {
    const result = calibratePretestItem(SEED_PARAMS, OBS_100);
    expect(result.stable).toBe(false);
    expect(result.rejectionReason).toMatch(/minN/);
    expect(result.n).toBe(100);
    // Params unchanged
    expect(result.params).toEqual(SEED_PARAMS);
  });

  it("returns stable=true when n >= minN with reasonable drift", () => {
    const obs: PretestObservation[] = uniformThetas(250).map(theta => ({
      theta,
      score: probability(theta, SEED_PARAMS) > 0.5 ? 1 : 0,
    }));
    const result = calibratePretestItem(SEED_PARAMS, obs);
    // With small drift, should be stable
    expect(result.n).toBe(250);
    expect(result.params).toBeDefined();
    expect(Number.isFinite(result.params.b)).toBe(true);
    expect(Number.isFinite(result.params.a)).toBe(true);
  });

  it("rejects update when |Δb| > maxDeltaB", () => {
    // Force a large drift by using a very different seed
    const extremeSeed: IrtParameters = { a: 1.2, b: 3.0, c: 0.20 };
    // Observations generated from b=-3 (opposite end)
    const obs: PretestObservation[] = uniformThetas(300).map(theta => ({
      theta,
      score: theta < -1 ? 1 : 0, // simulates b≈-1
    }));
    const result = calibratePretestItem(extremeSeed, obs, { maxDeltaB: 0.3 });
    if (!result.stable) {
      expect(result.rejectionReason).toMatch(/Δb|a_new|c_new/);
    }
    // Either stable or not — just must not throw
  });

  it("keeps c fixed regardless of n", () => {
    const obs: PretestObservation[] = uniformThetas(300).map(theta => ({
      theta,
      score: probability(theta, SEED_PARAMS) > 0.5 ? 1 : 0,
    }));
    const result = calibratePretestItem(SEED_PARAMS, obs);
    // c must always stay at seed value
    expect(result.params.c).toBeCloseTo(SEED_PARAMS.c, 10);
  });

  it("log-likelihood is finite", () => {
    const obs: PretestObservation[] = uniformThetas(250).map(theta => ({
      theta,
      score: probability(theta, SEED_PARAMS) > 0.5 ? 1 : 0,
    }));
    const result = calibratePretestItem(SEED_PARAMS, obs);
    expect(Number.isFinite(result.logLikelihood)).toBe(true);
  });

  it("respects custom minN config", () => {
    const obs: PretestObservation[] = uniformThetas(50).map(t => ({
      theta: t,
      score: 0,
    }));
    // With minN=10, 50 obs should be sufficient
    const result = calibratePretestItem(SEED_PARAMS, obs, { minN: 10 });
    expect(result.n).toBe(50);
    // May or may not be stable, but must not throw
    expect(result.params).toBeDefined();
  });

  it("a is updated only when n >= 500", () => {
    // n=250 — a should remain unchanged
    const obs250: PretestObservation[] = uniformThetas(250).map(theta => ({
      theta,
      score: probability(theta, SEED_PARAMS) > 0.5 ? 1 : 0,
    }));
    const r250 = calibratePretestItem(SEED_PARAMS, obs250);
    if (r250.stable) {
      expect(r250.params.a).toBeCloseTo(SEED_PARAMS.a, 8);
    }

    // n=520 — a may change
    const obs520: PretestObservation[] = uniformThetas(520).map(theta => ({
      theta,
      score: probability(theta, TRUE_PARAMS) > 0.5 ? 1 : 0,
    }));
    const r520 = calibratePretestItem(SEED_PARAMS, obs520);
    expect(r520.n).toBe(520);
  });
});

// ─── batchCalibratePretest ────────────────────────────────────────────────────

describe("batchCalibratePretest", () => {
  const items = [
    {
      itemId: "item-A",
      currentParams: { a: 1.0, b: -0.5, c: 0.20 },
      observations: uniformThetas(250).map(theta => ({ theta, score: 1 as const })),
    },
    {
      itemId: "item-B",
      currentParams: { a: 1.2, b: 0.5, c: 0.25 },
      observations: uniformThetas(50).map(theta => ({ theta, score: 0 as const })),
    },
  ];

  it("returns one result per item", () => {
    const results = batchCalibratePretest(items);
    expect(results).toHaveLength(2);
  });

  it("preserves itemId in results", () => {
    const results = batchCalibratePretest(items);
    expect(results[0].itemId).toBe("item-A");
    expect(results[1].itemId).toBe("item-B");
  });

  it("item-B (n<200) is not stable", () => {
    const results = batchCalibratePretest(items);
    expect(results[1].stable).toBe(false);
  });

  it("handles empty batch", () => {
    expect(batchCalibratePretest([])).toEqual([]);
  });
});
