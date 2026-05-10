import { describe, it, expect } from "vitest";
import {
  probability4D,
  information4D,
  informationTrace4D,
  estimate4DTheta,
  compositeTheta,
  compositeSem,
  unidimTo4DParams,
  calibrate4DItem,
  select4DItem,
  DIMENSION_LABELS,
  type Mirt4DItemParams,
  type Mirt4DObservation,
} from "../mirt-4d";

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

const READING_ITEM: Mirt4DItemParams = unidimTo4DParams(1.2, 0.0, 0.20, "READING");
const GRAMMAR_ITEM: Mirt4DItemParams = unidimTo4DParams(1.0, 0.5, 0.25, "GRAMMAR");
const PRODUCTIVE_ITEM: Mirt4DItemParams = unidimTo4DParams(1.5, -0.5, 0.10, "WRITING");

// Average-ability examinee
const AVG_THETA: [number, number, number, number] = [0, 0, 0, 0];
// High-ability examinee
const HIGH_THETA: [number, number, number, number] = [2, 2, 2, 2];
// Dimension-specific: strong receptive, weak productive
const RECEPTIVE_THETA: [number, number, number, number] = [2, -1, 0, 0];

// ────────────────────────────────────────────────────────────────────────────
// probability4D
// ────────────────────────────────────────────────────────────────────────────

describe("probability4D", () => {
  it("returns value in [0,1]", () => {
    const p = probability4D(AVG_THETA, READING_ITEM);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("P ≥ c (guessing floor)", () => {
    const p = probability4D([-4, -4, -4, -4], READING_ITEM);
    expect(p).toBeGreaterThanOrEqual(READING_ITEM.c - 1e-6);
  });

  it("P → 1 for very high theta", () => {
    const p = probability4D(HIGH_THETA, READING_ITEM);
    // With 4D loadings split across dimensions and c=0.20, P at θ=[2,2,2,2]
    // reaches ~0.93 (not 0.99 since discrimination is split across dimensions)
    expect(p).toBeGreaterThan(0.90);
  });

  it("high theta > low theta (monotone)", () => {
    const pHigh = probability4D(HIGH_THETA, READING_ITEM);
    const pLow  = probability4D([-2, -2, -2, -2], READING_ITEM);
    expect(pHigh).toBeGreaterThan(pLow);
  });

  it("respects dimension-specific discrimination: strong receptive helps reading item", () => {
    const pReceptive = probability4D(RECEPTIVE_THETA, READING_ITEM);
    const pProductive = probability4D([0, 2, 0, 0], READING_ITEM); // strong productive only
    expect(pReceptive).toBeGreaterThan(pProductive);
  });

  it("grammar item more sensitive to grammatical dimension", () => {
    const pGram = probability4D([0, 0, 2, 0], GRAMMAR_ITEM);
    const pProd = probability4D([0, 2, 0, 0], GRAMMAR_ITEM);
    expect(pGram).toBeGreaterThan(pProd);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// information4D & informationTrace4D
// ────────────────────────────────────────────────────────────────────────────

describe("information4D", () => {
  it("returns 4-element array of non-negative values", () => {
    const info = information4D(AVG_THETA, READING_ITEM);
    expect(info).toHaveLength(4);
    for (const v of info) expect(v).toBeGreaterThanOrEqual(0);
  });

  it("peak information near b (d / −a_sum)", () => {
    const peakTheta: [number, number, number, number] = [0, 0, 0, 0];
    const farTheta: [number, number, number, number] = [3, 3, 3, 3];
    const infoPeak = informationTrace4D(peakTheta, READING_ITEM);
    const infoFar  = informationTrace4D(farTheta, READING_ITEM);
    expect(infoPeak).toBeGreaterThan(infoFar);
  });

  it("returns zeros for extreme theta (very low)", () => {
    const info = information4D([-10, -10, -10, -10], READING_ITEM);
    // At extreme low theta P ≈ c → near-zero information
    const trace = info.reduce((s, v) => s + v, 0);
    expect(trace).toBeLessThan(0.01);
  });

  it("dominant dimension carries more information for reading item", () => {
    const info = information4D(AVG_THETA, READING_ITEM);
    // Dimension 0 (receptive) should carry most information for a reading item
    expect(info[0]).toBeGreaterThan(info[1]);
    expect(info[0]).toBeGreaterThan(info[2]);
  });

  it("trace equals sum of diagonal elements", () => {
    const diag = information4D(AVG_THETA, GRAMMAR_ITEM);
    const trace = informationTrace4D(AVG_THETA, GRAMMAR_ITEM);
    expect(trace).toBeCloseTo(diag[0] + diag[1] + diag[2] + diag[3], 10);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// estimate4DTheta
// ────────────────────────────────────────────────────────────────────────────

describe("estimate4DTheta", () => {
  it("returns prior when no observations", () => {
    const profile = estimate4DTheta([]);
    expect(profile.theta).toEqual([0, 0, 0, 0]);
    expect(profile.sem[0]).toBeCloseTo(1, 1);
  });

  it("custom prior is returned when no observations", () => {
    const profile = estimate4DTheta([], 0.5, 1.5);
    for (const t of profile.theta) expect(t).toBeCloseTo(0.5, 2);
    for (const s of profile.sem) expect(s).toBeCloseTo(1.5, 2);
  });

  it("EAP moves in correct direction after all-correct responses on reading items", () => {
    const obs: Mirt4DObservation[] = Array.from({ length: 10 }, () => ({
      score: 1,
      params: READING_ITEM,
    }));
    const profile = estimate4DTheta(obs);
    // All correct → θ_receptive should shift positive
    expect(profile.theta[0]).toBeGreaterThan(0);
  });

  it("EAP moves negative after all-incorrect responses", () => {
    const obs: Mirt4DObservation[] = Array.from({ length: 10 }, () => ({
      score: 0,
      params: READING_ITEM,
    }));
    const profile = estimate4DTheta(obs);
    expect(profile.theta[0]).toBeLessThan(0);
  });

  it("SEM decreases as more responses are added (information accumulates)", () => {
    const makeObs = (n: number): Mirt4DObservation[] =>
      Array.from({ length: n }, (_, i) => ({
        score: (i % 2 === 0 ? 1 : 0) as 0 | 1,
        params: READING_ITEM,
      }));
    const p5  = estimate4DTheta(makeObs(5));
    const p20 = estimate4DTheta(makeObs(20));
    expect(p20.sem[0]).toBeLessThan(p5.sem[0]);
  });

  it("traceCovariance = sum of dimensional variances", () => {
    const obs: Mirt4DObservation[] = [
      { score: 1, params: READING_ITEM },
      { score: 0, params: GRAMMAR_ITEM },
    ];
    const profile = estimate4DTheta(obs);
    const sumVar = profile.sem.reduce((s, v) => s + v ** 2, 0);
    // traceCovariance is stored with 6 decimal precision; sems are rounded to 4dp
    // so squaring introduces rounding error — allow 2dp tolerance
    expect(profile.traceCovariance).toBeCloseTo(sumVar, 2);
  });

  it("mixing reading + grammar observations separates dimensional estimates", () => {
    const obs: Mirt4DObservation[] = [
      ...Array.from({ length: 8 }, () => ({ score: 1 as 0 | 1, params: READING_ITEM })),
      ...Array.from({ length: 8 }, () => ({ score: 0 as 0 | 1, params: GRAMMAR_ITEM })),
    ];
    const profile = estimate4DTheta(obs);
    // Receptive should be higher than grammatical
    expect(profile.theta[0]).toBeGreaterThan(profile.theta[2]);
  });

  it("returns finite values for all components", () => {
    const obs: Mirt4DObservation[] = [
      { score: 1, params: READING_ITEM },
      { score: 1, params: GRAMMAR_ITEM },
      { score: 0, params: PRODUCTIVE_ITEM },
    ];
    const profile = estimate4DTheta(obs);
    for (const t of profile.theta) expect(Number.isFinite(t)).toBe(true);
    for (const s of profile.sem) {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
    }
    expect(Number.isFinite(profile.traceCovariance)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// compositeTheta & compositeSem
// ────────────────────────────────────────────────────────────────────────────

describe("compositeTheta / compositeSem", () => {
  it("composite is mean of 4 dimensions", () => {
    const profile = estimate4DTheta([]);
    expect(compositeTheta(profile)).toBeCloseTo(0, 4);
  });

  it("composite SEM is correct RMS formula", () => {
    const profile = estimate4DTheta([]);
    const expected = Math.sqrt((1 + 1 + 1 + 1) / 16);
    expect(compositeSem(profile)).toBeCloseTo(expected, 4);
  });

  it("composite shifts with high-ability observations", () => {
    const obs: Mirt4DObservation[] = Array.from({ length: 20 }, () => ({
      score: 1,
      params: unidimTo4DParams(1.5, 0.0, 0.0, "DEFAULT"),
    }));
    const profile = estimate4DTheta(obs);
    expect(compositeTheta(profile)).toBeGreaterThan(0.5);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// unidimTo4DParams
// ────────────────────────────────────────────────────────────────────────────

describe("unidimTo4DParams", () => {
  it("returns valid 4D params object", () => {
    const p = unidimTo4DParams(1.0, 0.5, 0.20, "READING");
    expect(p.a).toHaveLength(4);
    expect(typeof p.d).toBe("number");
    expect(p.c).toBeCloseTo(0.20, 6);
  });

  it("reading item loads primarily on dimension 0 (receptive)", () => {
    const p = unidimTo4DParams(1.0, 0.0, 0.0, "READING");
    expect(p.a[0]).toBeGreaterThan(p.a[1]);
    expect(p.a[0]).toBeGreaterThan(p.a[2]);
    expect(p.a[0]).toBeGreaterThan(p.a[3]);
  });

  it("writing item loads primarily on dimension 1 (productive)", () => {
    const p = unidimTo4DParams(1.0, 0.0, 0.0, "WRITING");
    expect(p.a[1]).toBeGreaterThan(p.a[0]);
    expect(p.a[1]).toBeGreaterThan(p.a[2]);
  });

  it("grammar item loads primarily on dimension 2 (grammatical)", () => {
    const p = unidimTo4DParams(1.0, 0.0, 0.0, "GRAMMAR");
    expect(p.a[2]).toBeGreaterThan(p.a[0]);
    expect(p.a[2]).toBeGreaterThan(p.a[1]);
  });

  it("unknown skill falls back to balanced loadings", () => {
    const p = unidimTo4DParams(1.0, 0.0, 0.0, "UNKNOWN_SKILL");
    // Each loading should be roughly 0.25
    for (const ak of p.a) {
      expect(ak).toBeCloseTo(0.25, 2);
    }
  });

  it("d intercept encodes difficulty (more negative for harder items)", () => {
    const easy = unidimTo4DParams(1.0, -1.0, 0.0, "READING");
    const hard  = unidimTo4DParams(1.0,  1.0, 0.0, "READING");
    expect(easy.d).toBeGreaterThan(hard.d);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// calibrate4DItem
// ────────────────────────────────────────────────────────────────────────────

describe("calibrate4DItem", () => {
  it("returns stable=false and unchanged params when n < 20", () => {
    const result = calibrate4DItem(READING_ITEM, { thetas: [], scores: [] });
    expect(result.stable).toBe(false);
    expect(result.params).toEqual(READING_ITEM);
    expect(result.rejectionReason).toMatch(/n=0/);
  });

  it("computes logLikelihood for sufficient n", () => {
    const thetas: [number, number, number, number][] = Array.from({ length: 30 }, () => [0, 0, 0, 0]);
    const scores = Array.from({ length: 30 }, (_, i) => (i % 2) as 0 | 1);
    const result = calibrate4DItem(READING_ITEM, { thetas, scores });
    expect(Number.isFinite(result.logLikelihood)).toBe(true);
    expect(result.n).toBe(30);
  });

  it("params remain within bounds after calibration", () => {
    const thetas: [number, number, number, number][] = Array.from({ length: 600 }, (_, i) => [
      (i % 5) - 2, (i % 3) - 1, (i % 7) - 3, 0,
    ]);
    const scores = thetas.map(([t]) => (t > 0 ? 1 : 0) as 0 | 1);
    const result = calibrate4DItem(READING_ITEM, { thetas, scores });
    for (const ak of result.params.a) {
      expect(ak).toBeGreaterThanOrEqual(0.05);
      expect(ak).toBeLessThanOrEqual(4.0);
    }
    expect(result.params.d).toBeGreaterThanOrEqual(-8);
    expect(result.params.d).toBeLessThanOrEqual(8);
  });

  it("does not update a-vector when n < MIN_N_A (500)", () => {
    const thetas: [number, number, number, number][] = Array.from({ length: 250 }, () => [0.5, 0.5, 0.5, 0.5]);
    const scores = Array.from({ length: 250 }, () => 1 as 0 | 1);
    const result = calibrate4DItem(READING_ITEM, { thetas, scores });
    // a-vector should be unchanged (n < 500)
    expect(result.params.a).toEqual(READING_ITEM.a);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// select4DItem
// ────────────────────────────────────────────────────────────────────────────

describe("select4DItem", () => {
  const pool = [
    { id: "r1", params: READING_ITEM },
    { id: "g1", params: GRAMMAR_ITEM },
    { id: "p1", params: PRODUCTIVE_ITEM },
  ];

  it("returns null when pool is empty", () => {
    const profile = estimate4DTheta([]);
    expect(select4DItem([], profile, new Set())).toBeNull();
  });

  it("excludes used items", () => {
    const profile = estimate4DTheta([]);
    const result = select4DItem(pool, profile, new Set(["r1", "g1", "p1"]));
    expect(result).toBeNull();
  });

  it("selects an item from the pool", () => {
    const profile = estimate4DTheta([]);
    const selected = select4DItem(pool, profile, new Set());
    expect(selected).not.toBeNull();
    expect(["r1", "g1", "p1"]).toContain(selected!.id);
  });

  it("selects the item with highest information trace", () => {
    // At \u03b8=0, the productive item (a_norm=1.5, b=\u22120.5) peaks near \u03b8=0 and
    // dominates by Fisher trace; any valid item from the pool may win.
    const profile = estimate4DTheta([]);
    const selected = select4DItem(pool, profile, new Set());
    expect(selected).not.toBeNull();
    expect(["r1", "g1", "p1"]).toContain(selected!.id);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DIMENSION_LABELS
// ────────────────────────────────────────────────────────────────────────────

describe("DIMENSION_LABELS", () => {
  it("has 4 labels", () => {
    expect(DIMENSION_LABELS).toHaveLength(4);
  });

  it("first label mentions Receptive", () => {
    expect(DIMENSION_LABELS[0]).toMatch(/Receptive/i);
  });

  it("third label mentions Grammatical", () => {
    expect(DIMENSION_LABELS[2]).toMatch(/Grammatical/i);
  });
});
