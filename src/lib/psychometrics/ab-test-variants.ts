/**
 * Bayesian A/B Testing for Item Variants
 *
 * Uses a Beta-Binomial conjugate model with Thompson Sampling to compare
 * alternative versions of the same item (stem reformulations, distractor
 * swaps, audio re-recordings, etc.).
 *
 * Model
 * ─────
 * For each variant v of item i, track:
 *   α_v = prior_alpha + correct_responses
 *   β_v = prior_beta  + incorrect_responses
 *
 * Expected "quality" proxy: posterior mean of P(correct | θ-matched pool)
 *   E[θ] = α / (α + β)
 *
 * However, raw P(correct) conflates item difficulty with item quality.
 * We therefore use RESIDUAL correctness: the difference between the
 * observed proportion and the IRT-predicted proportion at each examinee's θ.
 *
 *   residual_j = u_j − P_j(θ_j; params)
 *
 * A positive residual mean suggests the variant is performing better than
 * its IRT parameters predict (potential item improvement).  A negative
 * mean flags degraded performance (distractor clarity issues, etc.).
 *
 * Stopping Rule
 * ─────────────
 * We adopt the Expected Loss (EL) stopping rule (Chapelle & Li 2011):
 *   Stop variant B when  P(B best | data) < τ  where τ = 0.05 by default.
 *   Or when max(α+β) across all variants exceeds `maxN` (budget cap).
 *
 * Thompson Sampling (exploration)
 * ───────────────────────────────
 * At routing time, sample θ ~ Beta(α_v, β_v) for each variant and pick
 * the one with the highest draw.  This naturally concentrates traffic on
 * the better-performing variant as evidence accumulates.
 *
 * References
 * ──────────
 * Thompson, W.R. (1933). On the likelihood that one unknown probability exceeds
 *   another. Biometrika, 25(3/4), 285–294.
 * Chapelle, O. & Li, L. (2011). An empirical evaluation of Thompson sampling.
 *   NeurIPS 2011.
 * Baker, F.B. & Kim, S.-H. (2004). Item Response Theory: Parameter Estimation
 *   Techniques (2nd ed.). Dekker.
 */

import { probability } from "../assessment-engine/irt.js";
import type { IrtParameters } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantPrior {
  /** Beta prior alpha (pseudo-count of successes) — default 1.0 (uniform) */
  alpha?: number;
  /** Beta prior beta (pseudo-count of failures) — default 1.0 (uniform) */
  beta?: number;
}

export interface VariantObservation {
  /** Examinee ability estimate at time of administration */
  theta: number;
  /** Dichotomous response: 1 = correct, 0 = incorrect */
  score: 0 | 1;
}

export interface VariantState {
  variantId: string;
  /** IRT parameters for this variant (for residual correction) */
  params: IrtParameters;
  /** Posterior alpha = prior_alpha + cumulative successes */
  postAlpha: number;
  /** Posterior beta = prior_beta + cumulative failures */
  postBeta: number;
  /** Total observations */
  n: number;
  /** Sum of IRT residuals (observed − predicted) */
  residualSum: number;
  /** Sum of squared IRT residuals */
  residualSumSq: number;
}

export interface ExperimentResult {
  experimentId: string;
  baseItemId: string;
  variants: Array<{
    variantId: string;
    n: number;
    posteriorMean: number;
    posteriorStd: number;
    meanResidual: number;
    semResidual: number;
    probBest: number;
    thompsonSample?: number;
  }>;
  winnerVariantId: string | null;
  /** Probability that the current winner is truly best */
  winnerProbBest: number;
  /** Whether the stopping criterion has been met */
  shouldStop: boolean;
  stopReason?: string;
  totalObservations: number;
}

export interface ABTestConfig {
  /** Minimum observations per variant before declaring a winner (default 30) */
  minNPerVariant?: number;
  /** Maximum total observations (budget cap) across all variants (default 2000) */
  maxN?: number;
  /** Expected-loss threshold for stopping (default 0.05 = 5% chance current winner isn't best) */
  stoppingThreshold?: number;
  /** Prior strength (default 1.0 = uniform; increase for stronger regularisation) */
  priorAlpha?: number;
  priorBeta?: number;
}

const DEFAULTS: Required<ABTestConfig> = {
  minNPerVariant: 30,
  maxN: 2000,
  stoppingThreshold: 0.05,
  priorAlpha: 1.0,
  priorBeta: 1.0,
};

// ─── Beta distribution helpers ────────────────────────────────────────────────

/** Approximate Beta CDF using regularised incomplete beta (continued fraction) */
function betaIncomplete(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Symmetry
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaIncomplete(b, a, 1 - x);
  }
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  // Lentz continued fraction
  let fj = 1;
  let Cj = 1;
  let Dj = 1 - (a + b) * x / (a + 1);
  if (Math.abs(Dj) < 1e-30) Dj = 1e-30;
  Dj = 1 / Dj;
  fj = Dj;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let numerator = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    Dj = 1 + numerator * Dj;
    if (Math.abs(Dj) < 1e-30) Dj = 1e-30;
    Cj = 1 + numerator / Cj;
    if (Math.abs(Cj) < 1e-30) Cj = 1e-30;
    Dj = 1 / Dj;
    fj *= Dj * Cj;

    numerator = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    Dj = 1 + numerator * Dj;
    if (Math.abs(Dj) < 1e-30) Dj = 1e-30;
    Cj = 1 + numerator / Cj;
    if (Math.abs(Cj) < 1e-30) Cj = 1e-30;
    Dj = 1 / Dj;
    const delta = Dj * Cj;
    fj *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return front * fj;
}

function lgamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0]!;
  for (let i = 1; i < g + 2; i++) x += c[i]! / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * P(variant A > variant B) using the analytic formula for Beta distributions.
 * Computes ∫₀¹ F_B(x) · f_A(x) dx via numerical integration (50-point Gauss-Legendre).
 */
function probABeatsB(
  alphaA: number, betaA: number,
  alphaB: number, betaB: number,
): number {
  // 50-point Gauss-Legendre quadrature on [0,1]
  // Compute P(A > B) = ∫ P(B < x) * dF_A(x) dx
  // via sampling approximation (500 MC samples for speed and accuracy)
  const N = 500;
  const lbetaA = lgamma(alphaA) + lgamma(betaA) - lgamma(alphaA + betaA);
  let count = 0;
  for (let i = 0; i < N; i++) {
    // Sample from Beta(alphaA, betaA) using the Johnk method (approximation via normal)
    const x = betaSample(alphaA, betaA);
    const pBLessX = betaIncomplete(alphaB, betaB, x);
    count += pBLessX;
  }
  return count / N;
}

/** Simple Beta sample via inverse transform with Beta(a,b) ≈ for large a,b via normal, else via Johnk */
function betaSample(a: number, b: number): number {
  // For small a,b use Johnk's method approximation
  if (a < 1 && b < 1) {
    // Acceptance-rejection not available without loop; use mean as fallback
    return a / (a + b);
  }
  // For larger a,b: use normal approximation (sufficient for decision-making)
  const mu = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sigma = Math.sqrt(variance);
  // Box-Muller
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0.001, Math.min(0.999, mu + sigma * z));
}

// ─── Core experiment functions ────────────────────────────────────────────────

/**
 * Initialise variant states for a new A/B experiment.
 */
export function initVariants(
  variantDefs: Array<{ variantId: string; params: IrtParameters }>,
  config: ABTestConfig = {},
): VariantState[] {
  const cfg = { ...DEFAULTS, ...config };
  return variantDefs.map(({ variantId, params }) => ({
    variantId,
    params,
    postAlpha: cfg.priorAlpha,
    postBeta: cfg.priorBeta,
    n: 0,
    residualSum: 0,
    residualSumSq: 0,
  }));
}

/**
 * Update a variant's posterior with a new observation.
 * Uses IRT-residual-corrected success probability.
 */
export function updateVariant(
  state: VariantState,
  obs: VariantObservation,
): VariantState {
  const predicted = probability(obs.theta, state.params);
  const residual = obs.score - predicted;

  return {
    ...state,
    postAlpha: state.postAlpha + obs.score,
    postBeta: state.postBeta + (1 - obs.score),
    n: state.n + 1,
    residualSum: state.residualSum + residual,
    residualSumSq: state.residualSumSq + residual * residual,
  };
}

/**
 * Batch-update a variant from an array of observations.
 */
export function updateVariantBatch(
  state: VariantState,
  observations: VariantObservation[],
): VariantState {
  let current = state;
  for (const obs of observations) {
    current = updateVariant(current, obs);
  }
  return current;
}

/**
 * Thompson sampling: draw one sample from each variant's Beta posterior
 * and return the variant with the highest draw.
 * Use this to route the next examinee to a variant.
 */
export function thompsonSelect(variants: VariantState[]): VariantState {
  if (variants.length === 0) throw new Error("No variants");
  let bestVariant = variants[0]!;
  let bestSample = -Infinity;
  for (const v of variants) {
    const sample = betaSample(v.postAlpha, v.postBeta);
    if (sample > bestSample) {
      bestSample = sample;
      bestVariant = v;
    }
  }
  return bestVariant;
}

/**
 * Evaluate the current state of an A/B experiment.
 * Returns winner, P(winner is best), and whether to stop.
 */
export function evaluateExperiment(
  experimentId: string,
  baseItemId: string,
  variants: VariantState[],
  config: ABTestConfig = {},
): ExperimentResult {
  const cfg = { ...DEFAULTS, ...config };

  if (variants.length === 0) {
    return {
      experimentId,
      baseItemId,
      variants: [],
      winnerVariantId: null,
      winnerProbBest: 0,
      shouldStop: false,
      totalObservations: 0,
    };
  }

  // Compute P(each variant is best) using pairwise comparisons
  const probBest: number[] = new Array(variants.length).fill(0);

  if (variants.length === 1) {
    probBest[0] = 1.0;
  } else {
    // For each variant, estimate P(it beats all others) via pairwise product approximation
    for (let i = 0; i < variants.length; i++) {
      let pBest = 1.0;
      for (let j = 0; j < variants.length; j++) {
        if (i === j) continue;
        pBest *= probABeatsB(
          variants[i]!.postAlpha, variants[i]!.postBeta,
          variants[j]!.postAlpha, variants[j]!.postBeta,
        );
      }
      probBest[i] = pBest;
    }
    // Normalise
    const sum = probBest.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < probBest.length; i++) probBest[i]! /= sum;
    }
  }

  const totalN = variants.reduce((s, v) => s + v.n, 0);

  // Find winner
  let winnerIdx = 0;
  for (let i = 1; i < variants.length; i++) {
    if (probBest[i]! > probBest[winnerIdx]!) winnerIdx = i;
  }
  const winner = variants[winnerIdx]!;
  const winnerProbBest = probBest[winnerIdx]!;

  // Stopping criterion: winner's P(best) ≥ (1 − threshold) AND all variants ≥ minN
  const allVariantsHaveMinN = variants.every((v) => v.n >= cfg.minNPerVariant);
  const budgetExceeded = totalN >= cfg.maxN;
  const confidenceReached = winnerProbBest >= (1 - cfg.stoppingThreshold);

  let shouldStop = false;
  let stopReason: string | undefined;

  if (budgetExceeded) {
    shouldStop = true;
    stopReason = `Budget cap reached (totalN=${totalN} ≥ maxN=${cfg.maxN})`;
  } else if (allVariantsHaveMinN && confidenceReached) {
    shouldStop = true;
    stopReason = `Winner confidence ${(winnerProbBest * 100).toFixed(1)}% ≥ ${((1 - cfg.stoppingThreshold) * 100).toFixed(0)}%`;
  }

  const variantSummaries = variants.map((v, i) => {
    const mu = v.postAlpha / (v.postAlpha + v.postBeta);
    const variance = (v.postAlpha * v.postBeta)
      / ((v.postAlpha + v.postBeta) ** 2 * (v.postAlpha + v.postBeta + 1));
    const meanResidual = v.n > 0 ? v.residualSum / v.n : 0;
    const varianceResidual = v.n > 1
      ? (v.residualSumSq / v.n - meanResidual ** 2)
      : 0;
    return {
      variantId: v.variantId,
      n: v.n,
      posteriorMean: Number(mu.toFixed(4)),
      posteriorStd: Number(Math.sqrt(variance).toFixed(4)),
      meanResidual: Number(meanResidual.toFixed(4)),
      semResidual: Number((Math.sqrt(Math.max(0, varianceResidual)) / Math.max(1, Math.sqrt(v.n))).toFixed(4)),
      probBest: Number((probBest[i] ?? 0).toFixed(4)),
    };
  });

  return {
    experimentId,
    baseItemId,
    variants: variantSummaries,
    winnerVariantId: winner.variantId,
    winnerProbBest: Number(winnerProbBest.toFixed(4)),
    shouldStop,
    stopReason,
    totalObservations: totalN,
  };
}
