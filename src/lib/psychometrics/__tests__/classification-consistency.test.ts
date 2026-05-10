/**
 * Classification Consistency — Unit Tests
 *
 * Tests the Livingston-Lewis decision-consistency and classification-accuracy
 * functions without hitting the database.
 *
 * Psychometric expectations (IRT theory):
 *  - Low SEM (precise measurement) → high κ, high accuracy
 *  - High SEM (imprecise measurement) → low κ, low accuracy
 *  - θ exactly at a cut score → isBorderline = true
 *  - θ far from all cuts → isBorderline = false
 */

import { describe, it, expect } from "vitest";
import {
  classifyCandidate,
  computeConsistencyReport,
  aggregateConsistency,
  CEFR_CUT_SCORES,
} from "../classification-consistency.js";

// ─── classifyCandidate ────────────────────────────────────────────────────────

describe("classifyCandidate", () => {
  it("assigns PRE_A1 for very low theta", () => {
    const result = classifyCandidate(-4.5, 0.40);
    expect(result.cefrLevel).toBe("PRE_A1");
  });

  it("assigns B1 for theta = 0.0 (middle of B1 band)", () => {
    const result = classifyCandidate(0.0, 0.40);
    expect(result.cefrLevel).toBe("B1");
  });

  it("assigns C2 for very high theta", () => {
    const result = classifyCandidate(4.5, 0.40);
    expect(result.cefrLevel).toBe("C2");
  });

  it("detects borderline when theta is near a cut score", () => {
    // A2/B1 cut = -0.733; 1.96 × 0.40 = 0.784 → borderline zone
    const result = classifyCandidate(-0.733, 0.40);
    expect(result.isBorderline).toBe(true);
  });

  it("not borderline when theta is far from all cuts", () => {
    // B1 band center ≈ 0.0; nearest cut -0.733 or +0.168; distances = 0.73 and 0.17
    // With SEM 0.40: 1.96 × 0.40 = 0.784 → -0.733 is within 0.784 of 0.0 ... still borderline
    // Use very low SEM to make it definitively not borderline at band center
    const result = classifyCandidate(0.0, 0.05);
    // Nearest cuts: -0.733 and +0.168; distances: 0.733 and 0.168
    // 1.96 × 0.05 = 0.098 → 0.168 > 0.098 → not borderline
    expect(result.isBorderline).toBe(false);
  });

  it("posteriorProbCorrect is between 0 and 1", () => {
    for (const theta of [-3, -1, 0, 1, 3]) {
      const r = classifyCandidate(theta, 0.40);
      expect(r.posteriorProbCorrect).toBeGreaterThanOrEqual(0);
      expect(r.posteriorProbCorrect).toBeLessThanOrEqual(1);
    }
  });

  it("high accuracy when theta is at band center with low SEM", () => {
    // B2 band center ≈ 0.6 (between B1/B2 cut 0.168 and B2/C1 cut 0.995)
    // Center = (0.168 + 0.995) / 2 ≈ 0.58
    const result = classifyCandidate(0.58, 0.10);
    expect(result.posteriorProbCorrect).toBeGreaterThan(0.90);
  });

  it("low accuracy when theta is exactly at cut with high SEM", () => {
    const cut = CEFR_CUT_SCORES.find((c) => c.boundary === "B1/B2")!.theta;
    const result = classifyCandidate(cut, 0.70);
    // Right at the cut → equal probability of being B1 or B2
    expect(result.posteriorProbCorrect).toBeLessThan(0.60);
  });

  it("ACCEPT when posteriorProbCorrect > 0.80", () => {
    // High-confidence classification: center of B2 band, very low SEM
    const result = classifyCandidate(0.58, 0.08);
    expect(result.recommendedAction).toBe("ACCEPT");
    expect(result.posteriorProbCorrect).toBeGreaterThan(0.80);
  });

  it("EXPERT_REVIEW when posteriorProbCorrect ≤ 0.65", () => {
    // Right at a cut with high SEM
    const cut = CEFR_CUT_SCORES[2].theta; // A2/B1
    const result = classifyCandidate(cut, 0.80);
    expect(result.recommendedAction).toBe("EXPERT_REVIEW");
  });

  it("returns adjacent levels for borderline assessment", () => {
    const result = classifyCandidate(-0.733, 0.40);
    expect(result.borderlineLevels).toHaveLength(2);
    // Either null (edge) or a valid CefrLevel string
    for (const level of result.borderlineLevels) {
      if (level !== null) {
        expect(typeof level).toBe("string");
        expect(level.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── computeConsistencyReport ─────────────────────────────────────────────────

describe("computeConsistencyReport", () => {
  it("returns all required fields", () => {
    const r = computeConsistencyReport(0.5, 0.40);
    expect(typeof r.decisionConsistency).toBe("number");
    expect(typeof r.classificationAccuracy).toBe("number");
    expect(typeof r.nLevels).toBe("number");
    expect(r.perLevelAccuracy).toBeDefined();
    expect(r.sem).toBe(0.40);
    expect(r.theta).toBe(0.5);
  });

  it("decisionConsistency is in [0, 1]", () => {
    for (const [theta, sem] of [[-3, 0.50], [0, 0.40], [2, 0.35]]) {
      const r = computeConsistencyReport(theta, sem);
      expect(r.decisionConsistency).toBeGreaterThanOrEqual(0);
      expect(r.decisionConsistency).toBeLessThanOrEqual(1);
    }
  });

  it("classificationAccuracy is in [0, 1]", () => {
    const r = computeConsistencyReport(0, 0.40);
    expect(r.classificationAccuracy).toBeGreaterThanOrEqual(0);
    expect(r.classificationAccuracy).toBeLessThanOrEqual(1);
  });

  it("per-level probabilities sum to approximately 1", () => {
    const r = computeConsistencyReport(0, 0.40);
    const total = Object.values(r.perLevelAccuracy).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 1);
  });

  it("higher consistency with lower SEM", () => {
    const lowSem = computeConsistencyReport(0.58, 0.10);
    const highSem = computeConsistencyReport(0.58, 0.60);
    expect(lowSem.decisionConsistency).toBeGreaterThan(highSem.decisionConsistency);
  });

  it("has 7 levels in perLevelAccuracy", () => {
    const r = computeConsistencyReport(0, 0.40);
    expect(Object.keys(r.perLevelAccuracy)).toHaveLength(7);
  });
});

// ─── aggregateConsistency ─────────────────────────────────────────────────────

describe("aggregateConsistency", () => {
  it("returns zero metrics for empty array", () => {
    const r = aggregateConsistency([]);
    expect(r.n).toBe(0);
    expect(r.meanKappa).toBe(0);
    expect(r.meetsHighStakesThreshold).toBe(false);
  });

  it("computes n correctly", () => {
    const sessions = [
      { theta: 0, sem: 0.40 },
      { theta: 1, sem: 0.35 },
      { theta: -1, sem: 0.45 },
    ];
    expect(aggregateConsistency(sessions).n).toBe(3);
  });

  it("meanKappa is in [0, 1]", () => {
    const sessions = [
      { theta: 0.58, sem: 0.40 },
      { theta: -1.5, sem: 0.35 },
      { theta: 1.2, sem: 0.30 },
    ];
    const r = aggregateConsistency(sessions);
    expect(r.meanKappa).toBeGreaterThanOrEqual(0);
    expect(r.meanKappa).toBeLessThanOrEqual(1);
  });

  it("meetsHighStakesThreshold = true for very low SEM sessions", () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      theta: (i - 5) * 0.5,
      sem: 0.10, // very precise
    }));
    const r = aggregateConsistency(sessions);
    expect(r.meetsHighStakesThreshold).toBe(true);
  });

  it("placement threshold is more lenient than high-stakes threshold", () => {
    // κ ≥ 0.70 vs κ ≥ 0.80
    const sessions = [{ theta: 0.3, sem: 0.55 }]; // moderate SEM
    const r = aggregateConsistency(sessions);
    // If highStakes is true, placement must also be true
    if (r.meetsHighStakesThreshold) {
      expect(r.meetsPlacementThreshold).toBe(true);
    }
  });
});

// ─── CEFR_CUT_SCORES integrity ────────────────────────────────────────────────

describe("CEFR_CUT_SCORES", () => {
  it("has at least 5 boundaries", () => {
    expect(CEFR_CUT_SCORES.length).toBeGreaterThanOrEqual(5);
  });

  it("cut scores are monotonically increasing", () => {
    for (let i = 1; i < CEFR_CUT_SCORES.length; i++) {
      expect(CEFR_CUT_SCORES[i].theta).toBeGreaterThan(CEFR_CUT_SCORES[i - 1].theta);
    }
  });

  it("A1/A2 boundary is canonical BCa bootstrap value", () => {
    const cut = CEFR_CUT_SCORES.find((c) => c.boundary === "A1/A2");
    expect(cut).toBeDefined();
    expect(cut!.theta).toBeCloseTo(-1.578, 2);
  });

  it("B1/B2 boundary is canonical BCa bootstrap value", () => {
    const cut = CEFR_CUT_SCORES.find((c) => c.boundary === "B1/B2");
    expect(cut).toBeDefined();
    expect(cut!.theta).toBeCloseTo(0.168, 2);
  });
});
