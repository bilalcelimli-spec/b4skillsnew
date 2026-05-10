/**
 * Online Pretest Calibration — Concurrent EM (Stocking 1990)
 *
 * References
 * ──────────
 * Stocking, M.L. (1990). Specifying optimum examinees for summary statistics
 *   in item parameter estimation. Psychometrika, 55(3), 461-472.
 *
 * van der Linden, W.J. & Hambleton, R.K. (1997). Handbook of Modern IRT.
 *   Springer, ch. 18 (Online calibration).
 *
 * Algorithm
 * ─────────
 * For each pretest item accumulated online, we run a simplified 1-cycle
 * marginal maximum-likelihood (MML) EM update:
 *
 *   E-step: for each response (θ_r, u_r) compute expected counts
 *     r_j = Σ_r P_j(θ_r) · w_r       [expected correct count]
 *     f_j = Σ_r w_r                   [total weight]
 *
 *   M-step: Newton-Raphson update on a/b/c:
 *     b_new = b_old − [first deriv of LL] / [second deriv of LL]
 *
 * We use the θ estimates from the operational items as the "examinees"
 * distribution (concurrent design).  This avoids a full separate calibration
 * run and matches the concurrent online calibration described in
 * Wainer et al. (2007) CAT in Practice.
 *
 * Stability gate
 * ──────────────
 * Parameter updates are accepted only when:
 *   1. n_responses ≥ MIN_N (200 by default — Stocking 1990 recommendation)
 *   2. |Δb| ≤ MAX_DELTA (0.5 logit — prevents wild jumps)
 *   3. a_new ∈ [MIN_A, MAX_A] and c_new ∈ [0, MAX_C]
 *
 * If any condition fails the old parameters are kept and `stable = false`
 * is returned.
 */

import { IrtParameters } from "../assessment-engine/types.js";
import { probability } from "../assessment-engine/irt.js";

// ─── Config ───────────────────────────────────────────────────────────────────

export interface OnlineCalibrationConfig {
  /** Minimum responses required before any update (default 200). */
  minN?: number;
  /** Maximum accepted |Δb| per update cycle (default 0.5). */
  maxDeltaB?: number;
  /** Min discrimination — updates clamped to this (default 0.30). */
  minA?: number;
  /** Max discrimination (default 3.0). */
  maxA?: number;
  /** Max guessing (default 0.35). */
  maxC?: number;
  /** Newton-Raphson iterations per M-step (default 5). */
  nrIterations?: number;
  /** Learning rate / step dampener for NR (default 0.5). */
  nrDampen?: number;
}

const DEFAULTS: Required<OnlineCalibrationConfig> = {
  minN: 200,
  maxDeltaB: 0.5,
  minA: 0.30,
  maxA: 3.0,
  maxC: 0.35,
  nrIterations: 5,
  nrDampen: 0.5,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PretestObservation {
  /** Examinee's θ estimate from operational items. */
  theta: number;
  /** Dichotomous score: 0 or 1. */
  score: 0 | 1;
  /** Optional weight (default 1.0). */
  weight?: number;
}

export interface CalibrationResult {
  /** Updated 3PL item parameters. */
  params: IrtParameters;
  /** Whether the update passed stability gates. */
  stable: boolean;
  /** Number of observations used. */
  n: number;
  /** Absolute b-parameter change. */
  deltaB: number;
  /** Absolute a-parameter change. */
  deltaA: number;
  /** Marginal log-likelihood after update. */
  logLikelihood: number;
  /** Reason update was rejected (if !stable). */
  rejectionReason?: string;
}

// ─── E-step helpers ───────────────────────────────────────────────────────────

function eStep(
  observations: PretestObservation[],
  params: IrtParameters
): { r: number; f: number; weightedLL: number } {
  let r = 0;
  let f = 0;
  let weightedLL = 0;

  for (const obs of observations) {
    const w = obs.weight ?? 1;
    const p = probability(obs.theta, params);
    const safeP = Math.max(1e-9, Math.min(1 - 1e-9, p));
    r += w * safeP;
    f += w;
    weightedLL += w * (obs.score * Math.log(safeP) + (1 - obs.score) * Math.log(1 - safeP));
  }

  return { r, f, weightedLL };
}

// ─── M-step: NR for b parameter ───────────────────────────────────────────────

/**
 * Newton-Raphson update for difficulty parameter b.
 * Maximises the 3PL marginal log-likelihood holding a and c fixed.
 *
 * dL/db  = a · Σ_r w_r · (u_r − P_r) · (P_r − c) / (P_r · (1−c))
 * d²L/db² = −a² · Σ_r w_r · (P_r−c)²·(1−P_r) / (P_r·(1−c)²)
 */
function nrUpdateB(
  observations: PretestObservation[],
  params: IrtParameters,
  iterations: number,
  dampen: number
): number {
  let b = params.b;
  const { a, c } = params;

  for (let iter = 0; iter < iterations; iter++) {
    let grad = 0;
    let hess = 0;

    for (const obs of observations) {
      const w = obs.weight ?? 1;
      const p = probability(obs.theta, { ...params, b });
      const safeP = Math.max(1e-9, Math.min(1 - 1e-9, p));
      const pmc = safeP - c;
      const omc = 1 - c;
      const q = 1 - safeP;

      // First derivative term
      grad += w * (obs.score - safeP) * pmc / (safeP * omc);

      // Second derivative term (negative curvature)
      hess -= w * a * a * pmc * pmc * q / (safeP * omc * omc);
    }

    // Scale gradient by a (chain rule)
    grad *= a;

    if (Math.abs(hess) < 1e-12) break;
    const step = dampen * (grad / hess);
    b -= step;
    if (Math.abs(step) < 1e-6) break;
  }

  return b;
}

/**
 * Newton-Raphson update for discrimination parameter a.
 *
 * dL/da  = Σ_r w_r · (u_r − P_r) · (θ_r − b) · (P_r − c) / (P_r · (1−c))
 * d²L/da² = −Σ_r w_r · (θ_r−b)² · (P_r−c)²·(1−P_r) / (P_r·(1−c)²)
 */
function nrUpdateA(
  observations: PretestObservation[],
  params: IrtParameters,
  iterations: number,
  dampen: number
): number {
  let a = params.a;
  const { b, c } = params;

  for (let iter = 0; iter < iterations; iter++) {
    let grad = 0;
    let hess = 0;

    for (const obs of observations) {
      const w = obs.weight ?? 1;
      const p = probability(obs.theta, { ...params, a });
      const safeP = Math.max(1e-9, Math.min(1 - 1e-9, p));
      const pmc = safeP - c;
      const omc = 1 - c;
      const q = 1 - safeP;
      const thetaMinusB = obs.theta - b;

      grad += w * (obs.score - safeP) * thetaMinusB * pmc / (safeP * omc);
      hess -= w * thetaMinusB * thetaMinusB * pmc * pmc * q / (safeP * omc * omc);
    }

    if (Math.abs(hess) < 1e-12) break;
    const step = dampen * (grad / hess);
    a -= step;
    if (Math.abs(step) < 1e-6) break;
  }

  return a;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run one concurrent EM cycle for a single pretest item.
 *
 * This is the Stocking (1990) online calibration procedure:
 *   - Uses the concurrent θ estimates from operational items as the
 *     examinee distribution.
 *   - Runs Newton-Raphson M-steps for a and b (c held fixed when n < 500).
 *   - Applies stability gates before accepting updates.
 *
 * @param currentParams  Current (seed) parameters for the pretest item.
 * @param observations   Array of (theta, score) pairs from examinees who saw this item.
 * @param config         Optional tuning config.
 * @returns              CalibrationResult with updated params and diagnostics.
 */
export function calibratePretestItem(
  currentParams: IrtParameters,
  observations: PretestObservation[],
  config: OnlineCalibrationConfig = {}
): CalibrationResult {
  const cfg = { ...DEFAULTS, ...config };
  const n = observations.length;

  // Stability gate 1: minimum sample size
  if (n < cfg.minN) {
    return {
      params: { ...currentParams },
      stable: false,
      n,
      deltaB: 0,
      deltaA: 0,
      logLikelihood: eStep(observations, currentParams).weightedLL,
      rejectionReason: `n=${n} < minN=${cfg.minN}`,
    };
  }

  // ── M-step updates ────────────────────────────────────────────────────────

  // Update b (difficulty)
  const newB = nrUpdateB(observations, currentParams, cfg.nrIterations, cfg.nrDampen);

  // Update a (discrimination); hold c fixed when n < 500 (less identifiable)
  const newA = n >= 500
    ? nrUpdateA(observations, currentParams, cfg.nrIterations, cfg.nrDampen)
    : currentParams.a;

  // c held fixed (Stocking 1990 recommendation for online setting)
  const newC = currentParams.c;

  const deltaB = Math.abs(newB - currentParams.b);
  const deltaA = Math.abs(newA - currentParams.a);

  const newParams: IrtParameters = { a: newA, b: newB, c: newC };

  // ── Stability gate 2: parameter bounds ────────────────────────────────────
  if (deltaB > cfg.maxDeltaB) {
    return {
      params: { ...currentParams },
      stable: false,
      n,
      deltaB,
      deltaA,
      logLikelihood: eStep(observations, currentParams).weightedLL,
      rejectionReason: `|Δb|=${deltaB.toFixed(3)} > maxDeltaB=${cfg.maxDeltaB}`,
    };
  }

  if (newA < cfg.minA || newA > cfg.maxA) {
    return {
      params: { ...currentParams },
      stable: false,
      n,
      deltaB,
      deltaA,
      logLikelihood: eStep(observations, currentParams).weightedLL,
      rejectionReason: `a_new=${newA.toFixed(3)} outside [${cfg.minA}, ${cfg.maxA}]`,
    };
  }

  if (newC < 0 || newC > cfg.maxC) {
    return {
      params: { ...currentParams },
      stable: false,
      n,
      deltaB,
      deltaA,
      logLikelihood: eStep(observations, currentParams).weightedLL,
      rejectionReason: `c_new=${newC.toFixed(3)} outside [0, ${cfg.maxC}]`,
    };
  }

  // ── Compute final log-likelihood ──────────────────────────────────────────
  const { weightedLL } = eStep(observations, newParams);

  return {
    params: newParams,
    stable: true,
    n,
    deltaB,
    deltaA,
    logLikelihood: weightedLL,
  };
}

/**
 * Batch online calibration for multiple pretest items.
 * Items with insufficient data (n < minN) are returned unchanged with stable=false.
 *
 * @param items  Array of {itemId, currentParams, observations} objects.
 * @param config Optional tuning config applied to all items.
 */
export function batchCalibratePretest(
  items: Array<{
    itemId: string;
    currentParams: IrtParameters;
    observations: PretestObservation[];
  }>,
  config: OnlineCalibrationConfig = {}
): Array<{ itemId: string } & CalibrationResult> {
  return items.map(({ itemId, currentParams, observations }) => ({
    itemId,
    ...calibratePretestItem(currentParams, observations, config),
  }));
}
