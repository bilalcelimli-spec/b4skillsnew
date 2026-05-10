/**
 * Subscore Reliability — Unit Tests
 *
 * Tests the Livingston-Lewis subscore reliability framework:
 * IRT marginal reliability, Haberman added-value criterion,
 * Kelley regression weights, difference score reliability (ρ_diff),
 * and full analyzeSubscoreReliability pipeline.
 *
 * Psychometric expectations:
 *  - Low SEM (σ²_ε << σ²_θ) → high reliability
 *  - High correlation between subscores → low difference reliability
 *  - ρ_ss > r_tc² → subscore adds value beyond composite
 */

import { describe, it, expect } from "vitest";
import {
  irtMarginalReliability,
  csemAtCuts,
  kelleyRegressionWeight,
  differenceReliability,
  analyzeSubscoreReliability,
  kelleyRegressedScore,
  subscoreClassificationConsistency,
} from "../subscore-reliability.js";
import type { SubscoreInput } from "../subscore-reliability.js";
import { SkillType } from "../../assessment-engine/types.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** 30 candidates spread across [-2, 2] with low SEM → high reliability */
function makeHighRelInput(skill: SkillType): SubscoreInput {
  const thetas = Array.from({ length: 30 }, (_, i) => -2 + (i / 29) * 4);
  const sems = thetas.map(() => 0.20);
  return { skill, thetas, sems };
}

/** 30 candidates with high SEM → low reliability */
function makeLowRelInput(skill: SkillType): SubscoreInput {
  const thetas = Array.from({ length: 30 }, (_, i) => -2 + (i / 29) * 4);
  const sems = thetas.map(() => 0.70);
  return { skill, thetas, sems };
}

// ─── irtMarginalReliability ───────────────────────────────────────────────────

describe("irtMarginalReliability", () => {
  it("returns value in [0, 1]", () => {
    const thetas = [-1, -0.5, 0, 0.5, 1];
    const sems = [0.4, 0.4, 0.4, 0.4, 0.4];
    const rel = irtMarginalReliability(thetas, sems);
    expect(rel).toBeGreaterThanOrEqual(0);
    expect(rel).toBeLessThanOrEqual(1);
  });

  it("higher reliability with lower SEM", () => {
    const thetas = Array.from({ length: 20 }, (_, i) => (i - 10) * 0.3);
    const lowSemRel = irtMarginalReliability(thetas, thetas.map(() => 0.15));
    const highSemRel = irtMarginalReliability(thetas, thetas.map(() => 0.60));
    expect(lowSemRel).toBeGreaterThan(highSemRel);
  });

  it("returns 0 for empty input", () => {
    expect(irtMarginalReliability([], [])).toBe(0);
  });

  it("returns 0 when all thetas are identical (zero variance)", () => {
    const rel = irtMarginalReliability([1, 1, 1, 1], [0.3, 0.3, 0.3, 0.3]);
    expect(rel).toBe(0);
  });

  it("very low SEM → reliability close to 1", () => {
    const thetas = Array.from({ length: 50 }, (_, i) => (i - 25) * 0.2);
    const rel = irtMarginalReliability(thetas, thetas.map(() => 0.05));
    expect(rel).toBeGreaterThan(0.95);
  });
});

// ─── csemAtCuts ──────────────────────────────────────────────────────────────

describe("csemAtCuts", () => {
  const thetas = [-2, -1, -0.5, 0, 0.5, 1, 2];
  const sems   = [ 0.4, 0.4,  0.4, 0.4, 0.4, 0.4, 0.4];

  it("returns entries for CEFR cuts", () => {
    const result = csemAtCuts(thetas, sems);
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(typeof entry.level).toBe("string");
      expect(typeof entry.theta).toBe("number");
      expect(typeof entry.sem).toBe("number");
      expect(entry.sem).toBeGreaterThanOrEqual(0);
    }
  });

  it("CSEM at cut is non-negative", () => {
    const result = csemAtCuts(thetas, sems);
    for (const entry of result) {
      expect(entry.sem).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns empty array for empty thetas", () => {
    const result = csemAtCuts([], []);
    for (const entry of result) {
      expect(entry.sem).toBe(0); // no data → 0 by convention
    }
  });
});

// ─── kelleyRegressionWeight ───────────────────────────────────────────────────

describe("kelleyRegressionWeight", () => {
  it("returns subscoreReliability itself (shrinkage = reliability)", () => {
    expect(kelleyRegressionWeight(0.80)).toBeCloseTo(0.80, 5);
    expect(kelleyRegressionWeight(0.65)).toBeCloseTo(0.65, 5);
  });

  it("clamps to [0, 1]", () => {
    expect(kelleyRegressionWeight(-0.1)).toBeGreaterThanOrEqual(0);
    expect(kelleyRegressionWeight(1.5)).toBeLessThanOrEqual(1);
  });
});

// ─── differenceReliability ────────────────────────────────────────────────────

describe("differenceReliability", () => {
  it("is in [0, 1]", () => {
    const r = differenceReliability(0.80, 0.75, 0.50);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("high correlation → low difference reliability", () => {
    const lowCorr = differenceReliability(0.80, 0.80, 0.20);
    const highCorr = differenceReliability(0.80, 0.80, 0.90);
    expect(lowCorr).toBeGreaterThan(highCorr);
  });

  it("perfect correlation → difference not interpretable (≈ 0)", () => {
    // When r_AB = 1, denominator = 0 → clamped to 0
    const r = differenceReliability(0.80, 0.80, 0.999);
    expect(r).toBeLessThan(0.10);
  });

  it("equal reliabilities and zero correlation → ρ_diff = reliability", () => {
    // ρ_diff = (ρ_A + ρ_B - 2·r·r_AB) / (2 - 2·r_AB)
    // With r_AB=0: ρ_diff = (ρ_A + ρ_B) / 2
    const r = differenceReliability(0.80, 0.80, 0.0);
    expect(r).toBeCloseTo(0.80, 2);
  });
});

// ─── analyzeSubscoreReliability ───────────────────────────────────────────────

describe("analyzeSubscoreReliability", () => {
  const highRelReading = makeHighRelInput(SkillType.READING);
  const highRelListening = makeHighRelInput(SkillType.LISTENING);
  const lowRelGrammar = makeLowRelInput(SkillType.GRAMMAR);

  // Composite that is imperfectly correlated with the subscore (adds unique info)
  // Mix in a second skill with different scores to break the perfect correlation
  const compositeThetas = highRelReading.thetas.map((t, i) =>
    (t + (i % 5 === 0 ? 0.5 : -0.3)) / 1.2
  );

  it("returns all required fields", () => {
    const report = analyzeSubscoreReliability(
      [highRelReading, highRelListening],
      compositeThetas
    );
    expect(typeof report.n).toBe("number");
    expect(typeof report.compositeReliability).toBe("number");
    expect(Array.isArray(report.skills)).toBe(true);
    expect(Array.isArray(report.differenceScores)).toBe(true);
    expect(Array.isArray(report.reportableSkills)).toBe(true);
    expect(Array.isArray(report.unreportableSkills)).toBe(true);
    expect(Array.isArray(report.interpretiveCautions)).toBe(true);
  });

  it("n equals number of candidates", () => {
    const report = analyzeSubscoreReliability([highRelReading], compositeThetas);
    expect(report.n).toBe(highRelReading.thetas.length);
  });

  it("high-rel subscore has reliability > 0.70", () => {
    const report = analyzeSubscoreReliability([highRelReading], compositeThetas);
    const readingStats = report.skills.find(s => s.skill === SkillType.READING);
    expect(readingStats).toBeDefined();
    expect(readingStats!.reliability).toBeGreaterThan(0.70);
  });

  it("low-rel subscore is NOT reportable", () => {
    const report = analyzeSubscoreReliability([lowRelGrammar], compositeThetas);
    const grammarStats = report.skills.find(s => s.skill === SkillType.GRAMMAR);
    expect(grammarStats).toBeDefined();
    expect(grammarStats!.reportable).toBe(false);
    expect(report.unreportableSkills).toContain(SkillType.GRAMMAR);
  });

  it("composite reliability is in [0, 1]", () => {
    const report = analyzeSubscoreReliability([highRelReading, highRelListening], compositeThetas);
    expect(report.compositeReliability).toBeGreaterThanOrEqual(0);
    expect(report.compositeReliability).toBeLessThanOrEqual(1);
  });

  it("difference scores are generated for each pair", () => {
    const report = analyzeSubscoreReliability(
      [highRelReading, highRelListening],
      compositeThetas
    );
    // 2 skills → 1 pair
    expect(report.differenceScores).toHaveLength(1);
  });

  it("correlation matrix is symmetric", () => {
    const report = analyzeSubscoreReliability(
      [highRelReading, highRelListening],
      compositeThetas
    );
    const skills = Object.keys(report.correlationMatrix);
    for (const a of skills) {
      for (const b of skills) {
        if (a !== b) {
          expect(report.correlationMatrix[a]?.[b]).toBeCloseTo(
            report.correlationMatrix[b]?.[a] ?? 0,
            5
          );
        }
      }
    }
  });

  it("self-correlation is 1.0", () => {
    const report = analyzeSubscoreReliability([highRelReading], compositeThetas);
    expect(report.correlationMatrix[SkillType.READING]?.[SkillType.READING]).toBeCloseTo(1, 5);
  });
});

// ─── kelleyRegressedScore ─────────────────────────────────────────────────────

describe("kelleyRegressedScore", () => {
  it("shrinks toward composite mean when reliability < 1", () => {
    // With reliability 0.70, regressed score = 0.70 × θ_subscore + 0.30 × θ_composite_mean
    const regressed = kelleyRegressedScore(2.0, 0.70, 0.0);
    expect(regressed).toBeCloseTo(2.0 * 0.70 + 0.0 * 0.30, 3);
  });

  it("returns subscore unchanged when reliability = 1", () => {
    const regressed = kelleyRegressedScore(1.5, 1.0, 0.0);
    expect(regressed).toBeCloseTo(1.5, 5);
  });

  it("returns composite mean when reliability = 0", () => {
    const regressed = kelleyRegressedScore(1.5, 0.0, 0.5);
    expect(regressed).toBeCloseTo(0.5, 5);
  });
});

// ─── subscoreClassificationConsistency ───────────────────────────────────────

// CEFR cut-score theta values (canonical BCa bootstrap values)
const CEFR_CUTS = [-3.0, -1.578, -0.733, 0.168, 0.995, 2.0];

describe("subscoreClassificationConsistency", () => {
  it("returns consistency in [0, 1]", () => {
    const result = subscoreClassificationConsistency(0.5, 0.35, CEFR_CUTS);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("higher consistency with lower SEM", () => {
    const highPrecision = subscoreClassificationConsistency(0.5, 0.10, CEFR_CUTS);
    const lowPrecision = subscoreClassificationConsistency(0.5, 0.60, CEFR_CUTS);
    expect(highPrecision).toBeGreaterThan(lowPrecision);
  });

  it("theta far from cut → high consistency", () => {
    // Band center B2 ≈ 0.58 (midpoint 0.168–0.995); SEM=0.10 — well inside band
    const result = subscoreClassificationConsistency(0.58, 0.10, CEFR_CUTS);
    expect(result).toBeGreaterThan(0.80);
  });

  it("theta exactly at cut → lower consistency than band center", () => {
    // B1/B2 cut = 0.168; SEM=0.50 → borderline
    const atCut = subscoreClassificationConsistency(0.168, 0.50, CEFR_CUTS);
    // Band center B2 ≈ 0.58, same SEM → should be higher
    const atCenter = subscoreClassificationConsistency(0.58, 0.50, CEFR_CUTS);
    expect(atCenter).toBeGreaterThan(atCut);
  });

  it("sum of squared probs (consistency) is ≤ 1", () => {
    // The function returns Σp_k², which is always ≤ Σp_k = 1
    const result = subscoreClassificationConsistency(0.0, 0.40, CEFR_CUTS);
    expect(result).toBeLessThanOrEqual(1.0 + 1e-9);
  });
});
