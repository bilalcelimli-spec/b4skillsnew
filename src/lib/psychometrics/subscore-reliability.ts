/**
 * Subscore Reliability Analysis — Livingston-Lewis (1995) Framework
 *
 * Evaluates whether skill-level subscores (GRAMMAR, VOCABULARY, READING, etc.)
 * are reliable enough to be reported individually and whether they add unique
 * diagnostic value beyond the total composite score.
 *
 * Key quantities computed per subscore:
 *
 *   1. Subscore reliability (ρ_ss) — IRT marginal reliability for that skill alone
 *   2. Correlation with composite (r_tc) — Pearson r between subscore θ and composite θ
 *   3. Added-value criterion (Haberman 2008):
 *        A subscore "adds value" if its reliability ρ_ss > r_tc²
 *        i.e., it captures unique variance beyond the composite
 *   4. Regressed subscore (Kelley 1947 formula):
 *        θ̂_reg = r_tc · θ_total + (1 − r_tc) · μ_k
 *        More stable than raw subscore when reliability is moderate
 *   5. Profile reliability (reliability of subscore difference):
 *        ρ_diff(j,k) = (ρ_j + ρ_k − 2·r_jk) / (2 − 2·r_jk)
 *        where r_jk = observed correlation between skills j and k
 *   6. Conditional SEM at each CEFR boundary for each subscore
 *   7. Reportability flag: subscore is reportable if ρ_ss ≥ 0.70
 *
 * References
 * ----------
 * Livingston & Lewis (1995). Estimating the consistency and accuracy of
 *   classifications based on test scores. JEM, 32(2), 179–197.
 * Haberman (2008). When can subscores have value? JEBS, 33(2), 204–229.
 * Kelley (1947). Fundamentals of Statistics. Harvard University Press.
 * Brennan (2001). Generalizability Theory. Springer.
 */

import type { SkillType } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscoreInput {
  /** Skill label */
  skill: SkillType;
  /** EAP theta estimates for each candidate */
  thetas: number[];
  /** Posterior standard errors (SEM) for each candidate — same order as thetas */
  sems: number[];
}

export interface SubscoreStats {
  skill: SkillType;
  n: number;
  mean: number;
  sd: number;
  /** IRT marginal reliability: 1 − mean(SE²)/var(θ) */
  reliability: number;
  /** Cronbach-style parallel-form SE: σ_θ * sqrt(1 − ρ_ss) */
  conditionalSEM: number;
  /** Pearson correlation of this subscore with the composite θ */
  correlationWithComposite: number;
  /** Haberman (2008) added-value: true if ρ_ss > r_tc² */
  addsValue: boolean;
  /**
   * Reportability: ρ_ss ≥ MIN_RELIABILITY_TO_REPORT (default 0.70)
   * AND it adds unique value (Haberman criterion)
   */
  reportable: boolean;
  /** Mean regressed subscore (Kelley 1947) — shrinks toward composite */
  regressionWeight: number;  // = ρ_ss (shrinkage factor)
  /** CSEM at each CEFR cut score */
  csemAtCuts: { level: string; theta: number; sem: number }[];
}

export interface SubscoreDifferenceReliability {
  skillA: SkillType;
  skillB: SkillType;
  /** r_AB: observed correlation between the two subscores */
  correlation: number;
  /** ρ_diff: reliability of the skill_A − skill_B difference score */
  differenceReliability: number;
  /** Whether the difference score is reliable enough to interpret */
  interpretable: boolean;  // ρ_diff ≥ 0.60
}

export interface SubscoreReliabilityReport {
  n: number;
  compositeMean: number;
  compositeSD: number;
  compositeReliability: number;
  skills: SubscoreStats[];
  differenceScores: SubscoreDifferenceReliability[];
  /** Composite correlation matrix (skill × skill) */
  correlationMatrix: Record<string, Record<string, number>>;
  /** Skills recommended for individual reporting */
  reportableSkills: SkillType[];
  /** Skills that should NOT be reported separately (insufficient reliability) */
  unreportableSkills: SkillType[];
  interpretiveCautions: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_RELIABILITY_TO_REPORT = 0.70;
const MIN_DIFFERENCE_RELIABILITY = 0.60;
const MIN_N = 10;

const CEFR_CUTS = [
  { level: "A1/A2", theta: -1.5 },
  { level: "A2/B1", theta: -0.5 },
  { level: "B1/B2", theta:  0.5 },
  { level: "B2/C1", theta:  1.5 },
  { level: "C1/C2", theta:  2.5 },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

function variance(xs: number[], xMean?: number): number {
  if (xs.length < 2) return 0;
  const m = xMean ?? mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

function sd(xs: number[]): number {
  return Math.sqrt(variance(xs));
}

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  const sdX = sd(xs.slice(0, n));
  const sdY = sd(ys.slice(0, n));
  if (sdX * sdY === 0) return 0;
  const cov = xs.slice(0, n).reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (n - 1);
  return Math.max(-1, Math.min(1, cov / (sdX * sdY)));
}

function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * IRT marginal reliability: ρ = 1 − E[SE²] / Var(θ)
 */
export function irtMarginalReliability(thetas: number[], sems: number[]): number {
  const n = Math.min(thetas.length, sems.length);
  if (n < 2) return 0;
  const varTheta = variance(thetas.slice(0, n));
  if (varTheta <= 0) return 0;
  const meanSE2 = sems.slice(0, n).reduce((s, se) => s + se * se, 0) / n;
  return Math.max(0, Math.min(1, 1 - meanSE2 / varTheta));
}

/**
 * Conditional SEM at each CEFR boundary: interpolated from nearby examinees.
 * Uses a Gaussian kernel smoother with bandwidth = 0.5 theta units.
 */
export function csemAtCuts(
  thetas: number[],
  sems: number[],
  cuts: typeof CEFR_CUTS = CEFR_CUTS
): { level: string; theta: number; sem: number }[] {
  const h = 0.5; // bandwidth
  return cuts.map((cut) => {
    let weightSum = 0, semWeighted = 0;
    for (let i = 0; i < thetas.length; i++) {
      const w = Math.exp(-0.5 * ((thetas[i] - cut.theta) / h) ** 2);
      weightSum += w;
      semWeighted += w * sems[i];
    }
    const sem = weightSum > 1e-9 ? semWeighted / weightSum : 0;
    return { level: cut.level, theta: cut.theta, sem: Number(sem.toFixed(3)) };
  });
}

/**
 * Regressed (Kelley) subscore: shrinks raw subscore toward composite.
 * θ̂_reg = ρ_ss · θ_k + (1 − ρ_ss) · μ_composite
 *
 * The weight returned is ρ_ss (shrinkage factor).
 */
export function kelleyRegressionWeight(subscoreReliability: number): number {
  return Math.max(0, Math.min(1, subscoreReliability));
}

/**
 * Profile reliability — reliability of the difference between two subscores.
 * ρ_diff = (ρ_A + ρ_B − 2·r_AB) / (2 − 2·r_AB)
 */
export function differenceReliability(
  rhoA: number,
  rhoB: number,
  rAB: number
): number {
  const denom = 2 - 2 * rAB;
  if (Math.abs(denom) < 1e-9) return 0;
  return Math.max(0, Math.min(1, (rhoA + rhoB - 2 * rAB) / denom));
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Run the full Livingston-Lewis subscore reliability analysis.
 *
 * @param subscores  One entry per skill, each with paired theta/SEM arrays.
 * @param compositeThetas  Overall composite theta for each candidate (same order).
 *                         If omitted, the mean of all skill thetas is used.
 */
export function analyzeSubscoreReliability(
  subscores: SubscoreInput[],
  compositeThetas?: number[]
): SubscoreReliabilityReport {
  // Validate
  const n = subscores[0]?.thetas?.length ?? 0;
  if (n < MIN_N) {
    return {
      n,
      compositeMean: 0,
      compositeSD: 0,
      compositeReliability: 0,
      skills: [],
      differenceScores: [],
      correlationMatrix: {},
      reportableSkills: [],
      unreportableSkills: subscores.map((s) => s.skill),
      interpretiveCautions: [
        `Insufficient sample size (n=${n}, minimum=${MIN_N}). No subscore analysis possible.`,
      ],
    };
  }

  // Build composite from mean of available skills if not provided
  const composite: number[] = compositeThetas ??
    Array.from({ length: n }, (_, i) =>
      mean(subscores.map((s) => s.thetas[i] ?? 0))
    );

  const compositeMean = mean(composite);
  const compositeSD   = sd(composite);

  // Compute per-skill stats
  const skillStats: SubscoreStats[] = subscores.map((sub) => {
    const theta = sub.thetas.slice(0, n);
    const sem   = sub.sems.slice(0, n);

    const sMean = mean(theta);
    const sSD   = sd(theta);
    const rho   = irtMarginalReliability(theta, sem);
    const csem  = sSD * Math.sqrt(1 - rho);
    const r_tc  = pearson(theta, composite);
    const addsValue = rho > r_tc * r_tc;
    const reportable = rho >= MIN_RELIABILITY_TO_REPORT && addsValue;

    return {
      skill:                  sub.skill,
      n,
      mean:                   Number(sMean.toFixed(3)),
      sd:                     Number(sSD.toFixed(3)),
      reliability:            Number(rho.toFixed(3)),
      conditionalSEM:         Number(csem.toFixed(3)),
      correlationWithComposite: Number(r_tc.toFixed(3)),
      addsValue,
      reportable,
      regressionWeight:       Number(kelleyRegressionWeight(rho).toFixed(3)),
      csemAtCuts:             csemAtCuts(theta, sem),
    };
  });

  // Composite reliability (mean of available skill thetas)
  const compositeReliability = (() => {
    const compositeSEMs = Array.from({ length: n }, (_, i) => {
      const allSEMs = subscores.map((s) => s.sems[i] ?? 0);
      return mean(allSEMs);
    });
    return irtMarginalReliability(composite, compositeSEMs);
  })();

  // Correlation matrix
  const correlationMatrix: Record<string, Record<string, number>> = {};
  for (const sA of subscores) {
    correlationMatrix[sA.skill] = {};
    for (const sB of subscores) {
      correlationMatrix[sA.skill][sB.skill] = sA.skill === sB.skill
        ? 1.0
        : Number(pearson(sA.thetas.slice(0, n), sB.thetas.slice(0, n)).toFixed(3));
    }
  }

  // Difference score reliabilities (all unique pairs)
  const differenceScores: SubscoreDifferenceReliability[] = [];
  for (let i = 0; i < skillStats.length; i++) {
    for (let j = i + 1; j < skillStats.length; j++) {
      const sA = skillStats[i];
      const sB = skillStats[j];
      const rAB = correlationMatrix[sA.skill][sB.skill] ?? 0;
      const rDiff = differenceReliability(sA.reliability, sB.reliability, rAB);
      differenceScores.push({
        skillA: sA.skill,
        skillB: sB.skill,
        correlation: rAB,
        differenceReliability: Number(rDiff.toFixed(3)),
        interpretable: rDiff >= MIN_DIFFERENCE_RELIABILITY,
      });
    }
  }

  // Cautions
  const cautions: string[] = [];
  const reportable   = skillStats.filter((s) => s.reportable).map((s) => s.skill);
  const unreportable = skillStats.filter((s) => !s.reportable).map((s) => s.skill);

  for (const s of skillStats) {
    if (s.reliability < 0.50) {
      cautions.push(`${s.skill}: Very low reliability (ρ=${s.reliability}) — subscore should NOT be reported.`);
    } else if (s.reliability < MIN_RELIABILITY_TO_REPORT) {
      cautions.push(`${s.skill}: Moderate reliability (ρ=${s.reliability}) — interpret with caution.`);
    }
    if (!s.addsValue) {
      cautions.push(`${s.skill}: Does not add value beyond composite (r²=${(s.correlationWithComposite ** 2).toFixed(2)} ≥ ρ=${s.reliability}).`);
    }
  }

  const nonInterpretableDiffs = differenceScores.filter((d) => !d.interpretable);
  if (nonInterpretableDiffs.length > 0) {
    cautions.push(
      `${nonInterpretableDiffs.length} skill-difference pair(s) have insufficient reliability to interpret (ρ_diff < ${MIN_DIFFERENCE_RELIABILITY}).`
    );
  }

  return {
    n,
    compositeMean: Number(compositeMean.toFixed(3)),
    compositeSD:   Number(compositeSD.toFixed(3)),
    compositeReliability: Number(compositeReliability.toFixed(3)),
    skills: skillStats,
    differenceScores,
    correlationMatrix,
    reportableSkills:   reportable,
    unreportableSkills: unreportable,
    interpretiveCautions: cautions,
  };
}

/**
 * Regress a raw subscore toward the composite mean using Kelley (1947).
 *
 * Used for individual score reports to present a more stable estimate.
 * θ̂_reg = ρ_ss · θ_k + (1 − ρ_ss) · μ_composite
 */
export function kelleyRegressedScore(
  rawSubscoreTheta: number,
  subscoreReliability: number,
  compositeMean: number
): number {
  const w = kelleyRegressionWeight(subscoreReliability);
  return w * rawSubscoreTheta + (1 - w) * compositeMean;
}

/**
 * Compute a classification consistency estimate for a subscore.
 *
 * P(same CEFR decision on two parallel forms) for a candidate at (θ, SEM).
 * Uses the normal approximation: probability of re-classifying into the same band.
 */
export function subscoreClassificationConsistency(
  theta: number,
  sem: number,
  cutScores: number[]
): number {
  const sorted = [...cutScores].sort((a, b) => a - b);
  const categoryProbs: number[] = [];

  for (let c = 0; c <= sorted.length; c++) {
    const lower = c === 0 ? -Infinity : sorted[c - 1];
    const upper = c === sorted.length ? Infinity : sorted[c];
    const pL = lower === -Infinity ? 0 : normalCDF((lower - theta) / sem);
    const pU = upper === Infinity   ? 1 : normalCDF((upper - theta) / sem);
    categoryProbs.push(Math.max(0, pU - pL));
  }

  return categoryProbs.reduce((s, p) => s + p * p, 0);
}
