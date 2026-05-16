import { describe, it, expect } from "vitest";
import {
  quadraticWeightedKappa,
  computeAgreement,
  rollingAgreement,
  detectDrift,
  computeIcc,
  type AiHumanPair,
} from "../ai-human-agreement";

describe("quadraticWeightedKappa()", () => {
  it("returns 1 for perfect agreement", () => {
    const a = [0.0, 0.2, 0.5, 0.7, 1.0];
    expect(quadraticWeightedKappa(a, a)).toBeCloseTo(1, 6);
  });

  it("is less than 1 when raters disagree by 1 band consistently", () => {
    // AI scores all one band higher than human
    const ai = [0.20, 0.40, 0.60, 0.80, 1.00, 0.20, 0.40, 0.60, 0.80, 1.00];
    const hu = [0.00, 0.20, 0.40, 0.60, 0.80, 0.00, 0.20, 0.40, 0.60, 0.80];
    const k = quadraticWeightedKappa(ai, hu);
    expect(k).toBeLessThan(1);
    expect(k).toBeGreaterThan(0); // Still positive — clear pattern
  });

  it("is near 0 or negative when scores are unrelated", () => {
    // Reverse order: maximum disagreement
    const ai = [1.0, 0.8, 0.6, 0.4, 0.2, 0.0];
    const hu = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
    expect(quadraticWeightedKappa(ai, hu)).toBeLessThan(0);
  });

  it("returns 0 when arrays are mismatched in length", () => {
    expect(quadraticWeightedKappa([0.1, 0.2], [0.3])).toBe(0);
  });

  it("returns 0 on empty input", () => {
    expect(quadraticWeightedKappa([], [])).toBe(0);
  });
});

describe("computeAgreement()", () => {
  it("returns zero metrics on empty input", () => {
    const m = computeAgreement([]);
    expect(m.n).toBe(0);
    expect(m.qwk).toBe(0);
    expect(m.mae).toBe(0);
    expect(m.meetsHighStakesThreshold).toBe(false);
  });

  it("MAE matches the manual calculation", () => {
    const pairs: AiHumanPair[] = [
      { aiScore: 0.50, humanScore: 0.50 }, // |Δ|=0
      { aiScore: 0.60, humanScore: 0.50 }, // |Δ|=0.10
      { aiScore: 0.40, humanScore: 0.50 }, // |Δ|=0.10
      { aiScore: 0.80, humanScore: 0.70 }, // |Δ|=0.10
    ];
    const m = computeAgreement(pairs);
    expect(m.mae).toBeCloseTo(0.075, 6);
  });

  it("flags meetsHighStakesThreshold=true on tightly agreeing scores", () => {
    // 30 well-distributed pairs with delta < 0.05 — generates QWK ≥ 0.80,
    // MAE ≤ 0.08 and r ≥ 0.85.
    const pairs: AiHumanPair[] = [];
    for (let i = 0; i < 30; i++) {
      const human = i / 29; // 0.00 ... 1.00
      const ai = human + (i % 2 === 0 ? 0.02 : -0.02);
      pairs.push({ aiScore: ai, humanScore: human });
    }
    const m = computeAgreement(pairs);
    expect(m.qwk).toBeGreaterThanOrEqual(0.80);
    expect(m.mae).toBeLessThanOrEqual(0.08);
    expect(m.pearsonR).toBeGreaterThanOrEqual(0.85);
    expect(m.meetsHighStakesThreshold).toBe(true);
  });

  it("flags meetsHighStakesThreshold=false on noisy scores", () => {
    const pairs: AiHumanPair[] = [
      { aiScore: 0.10, humanScore: 0.50 },
      { aiScore: 0.50, humanScore: 0.10 },
      { aiScore: 0.20, humanScore: 0.80 },
      { aiScore: 0.90, humanScore: 0.30 },
    ];
    const m = computeAgreement(pairs);
    expect(m.meetsHighStakesThreshold).toBe(false);
  });

  it("meanDelta reveals systematic over- or under-scoring", () => {
    // AI consistently scores 0.10 above human → meanDelta = +0.10
    const pairs: AiHumanPair[] = [
      { aiScore: 0.40, humanScore: 0.30 },
      { aiScore: 0.50, humanScore: 0.40 },
      { aiScore: 0.60, humanScore: 0.50 },
      { aiScore: 0.70, humanScore: 0.60 },
    ];
    expect(computeAgreement(pairs).meanDelta).toBeCloseTo(0.10, 6);
  });
});

describe("rollingAgreement()", () => {
  it("ignores pairs without timestamps", () => {
    const pairs: AiHumanPair[] = [
      { aiScore: 0.5, humanScore: 0.5 },
      { aiScore: 0.6, humanScore: 0.6 },
    ];
    expect(rollingAgreement(pairs)).toHaveLength(0);
  });

  it("bins pairs into 7-day windows", () => {
    const day0 = new Date("2026-01-01T00:00:00Z").getTime();
    const day = (n: number) => new Date(day0 + n * 24 * 3600 * 1000);
    const pairs: AiHumanPair[] = [
      { aiScore: 0.50, humanScore: 0.50, scoredAt: day(0) },
      { aiScore: 0.55, humanScore: 0.50, scoredAt: day(3) },
      { aiScore: 0.60, humanScore: 0.55, scoredAt: day(8) },  // window 2
      { aiScore: 0.65, humanScore: 0.60, scoredAt: day(15) }, // window 3
    ];
    const windows = rollingAgreement(pairs, 7, day(20));
    expect(windows.length).toBeGreaterThanOrEqual(3);
    expect(windows[0].metrics.n).toBeGreaterThanOrEqual(2);
  });
});

describe("detectDrift()", () => {
  function fakeWindow(mae: number, qwk: number) {
    return {
      start: new Date(),
      end: new Date(),
      metrics: {
        n: 50,
        qwk,
        mae,
        rmse: mae * 1.2,
        pearsonR: 0.9,
        meanDelta: 0,
        meetsHighStakesThreshold: false,
      },
    };
  }

  it("returns INSUFFICIENT_HISTORY with too few windows", () => {
    const r = detectDrift([fakeWindow(0.05, 0.85)]);
    expect(r.driftDetected).toBe(false);
    expect(r.reason).toBe("INSUFFICIENT_HISTORY");
  });

  it("flags drift when MAE rises significantly", () => {
    const windows = [
      fakeWindow(0.05, 0.85),
      fakeWindow(0.06, 0.84),
      fakeWindow(0.05, 0.86),
      fakeWindow(0.12, 0.80),  // Latest: MAE jumped to 0.12
    ];
    const r = detectDrift(windows);
    expect(r.driftDetected).toBe(true);
    expect(r.reason).toMatch(/MAE_INCREASE/);
    expect(r.maeDelta).toBeGreaterThan(0.05);
  });

  it("flags drift when QWK drops significantly", () => {
    const windows = [
      fakeWindow(0.05, 0.85),
      fakeWindow(0.05, 0.84),
      fakeWindow(0.05, 0.86),
      fakeWindow(0.05, 0.65),  // Latest: QWK collapsed
    ];
    const r = detectDrift(windows);
    expect(r.driftDetected).toBe(true);
    expect(r.reason).toMatch(/QWK_DROP/);
  });

  it("does not flag drift on a stable history", () => {
    const windows = [
      fakeWindow(0.05, 0.85),
      fakeWindow(0.06, 0.84),
      fakeWindow(0.05, 0.86),
      fakeWindow(0.06, 0.84),
    ];
    expect(detectDrift(windows).driftDetected).toBe(false);
  });

  it("respects custom thresholds", () => {
    const windows = [
      fakeWindow(0.05, 0.85),
      fakeWindow(0.06, 0.84),
      fakeWindow(0.05, 0.86),
      fakeWindow(0.07, 0.82),  // small MAE rise of 0.02
    ];
    // Default threshold 0.03 → no drift
    expect(detectDrift(windows).driftDetected).toBe(false);
    // Tighter threshold 0.01 → drift
    expect(
      detectDrift(windows, { maxMaeIncrease: 0.01 }).driftDetected
    ).toBe(true);
  });
});

// ─── computeIcc() — ICC(2,1) intraclass correlation ───────────────────────────

describe("computeIcc()", () => {
  it("returns 1 for perfectly identical raters", () => {
    const scores = [0.1, 0.3, 0.5, 0.7, 0.9, 0.4, 0.6, 0.8, 0.2, 0.95];
    const result = computeIcc(scores, scores);
    expect(result.icc).toBeCloseTo(1, 2);
    expect(result.interpretation).toBe("EXCELLENT");
  });

  it("returns high ICC for closely-agreeing raters", () => {
    // AI consistently slightly above human — still high agreement
    const human = [0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.2, 0.9, 0.55, 0.65];
    const ai = human.map(h => Math.min(1, h + 0.03));
    const result = computeIcc(ai, human);
    expect(result.icc).toBeGreaterThan(0.75);
    expect(["GOOD", "EXCELLENT"]).toContain(result.interpretation);
  });

  it("returns low ICC for random uncorrelated raters", () => {
    const rater1 = [0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6, 0.15];
    const rater2 = [0.9, 0.1, 0.7, 0.3, 0.5, 0.8, 0.2, 0.6, 0.4, 0.85];
    const result = computeIcc(rater1, rater2);
    expect(result.icc).toBeLessThan(0.50);
    expect(["POOR", "MODERATE"]).toContain(result.interpretation);
  });

  it("returns safe zero result for fewer than 3 pairs", () => {
    const result = computeIcc([0.5, 0.6], [0.5, 0.6]);
    expect(result.icc).toBe(0);
    expect(result.n).toBe(2);
  });

  it("returns safe zero result for mismatched lengths", () => {
    const result = computeIcc([0.5, 0.6, 0.7], [0.5, 0.6]);
    expect(result.icc).toBe(0);
  });

  it("returns n equal to the input length", () => {
    const scores = [0.3, 0.5, 0.7, 0.4, 0.6];
    const result = computeIcc(scores, scores.map(s => s + 0.05));
    expect(result.n).toBe(5);
  });

  it("95% CI lower ≤ upper and both are in [-1, 1]", () => {
    // Use a wide spread with moderate agreement so the CI is non-trivial
    const human = [0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.15,
                   0.35, 0.55, 0.75, 0.95, 0.25, 0.45, 0.65, 0.85, 0.05, 0.50];
    const ai    = [0.2, 0.5, 0.4, 0.8, 0.7, 0.3, 0.6, 0.5, 0.9, 0.25,
                   0.40, 0.65, 0.70, 0.90, 0.30, 0.55, 0.60, 0.80, 0.15, 0.60];
    const result = computeIcc(ai, human);
    expect(result.ci95Lower).toBeLessThanOrEqual(result.ci95Upper);
    expect(result.ci95Lower).toBeGreaterThanOrEqual(-1);
    expect(result.ci95Upper).toBeLessThanOrEqual(1);
  });

  it("interprets EXCELLENT for icc ≥ 0.90", () => {
    // Near-perfect agreement gives ICC ≥ 0.90
    const scores = Array.from({ length: 20 }, (_, i) => (i + 1) / 20);
    const result = computeIcc(scores, scores.map(s => Math.min(1, s + 0.01)));
    expect(result.interpretation).toBe("EXCELLENT");
  });
});
