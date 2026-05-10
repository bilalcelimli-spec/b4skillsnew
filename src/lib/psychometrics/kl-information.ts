/**
 * Kullback-Leibler (KL) Information Item Selection
 *
 * Chang & Ying (1996) — A Global Information Approach to Computerized
 * Adaptive Testing. Applied Psychological Measurement, 20(3), 213-229.
 *
 * Motivation
 * ──────────
 * Maximum Fisher Information (MFI) selects items that are most informative
 * *at the current θ estimate*. Early in a CAT session — when the estimate
 * is unreliable — this leads to aggressive targeting that can mis-select
 * items and produce inflated initial SEM.
 *
 * Bayesian KL (BKL) integrates information over the posterior θ distribution:
 *
 *   KL_j(θ̂) = ∫ KL_j(θ̂ ‖ θ) · p(θ | data) dθ
 *
 * where:
 *   KL_j(θ̂ ‖ θ) = P_j(θ̂) · ln[P_j(θ̂)/P_j(θ)] + Q_j(θ̂) · ln[Q_j(θ̂)/Q_j(θ)]
 *
 * The item with the highest KL score provides the maximum expected
 * discrimination between the current estimate and the true θ.
 *
 * In practice we:
 *   1. Evaluate KL at G=25 Gauss–Hermite quadrature points (posterior mean ± 3σ)
 *   2. Weight each point by the posterior probability density N(θ̂, SEM²)
 *   3. Average → scalar KL score per item
 *
 * Hybrid rule (Faz 2, ay 7-8):
 *   - Items 1-5 (high θ uncertainty): use KL selection
 *   - Items 6+  (SEM < threshold):    use MFI (Fisher information)
 *
 * This matches the GMAT MGRE strategy described in Stocking & Swanson (1998)
 * and is referenced in Yan et al. (2014) Computerized Multistage Testing, p.88.
 */

import { probability, information as fisherInformation } from "../assessment-engine/irt.js";
import { IrtParameters } from "../assessment-engine/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Number of quadrature points for numerical integration.
 * 25 gives <0.1% error for typical SEM ranges in CAT.
 */
const QUAD_POINTS = 25;

/**
 * Integration half-range in SEM units.
 * ±3 SEM covers 99.7% of the normal posterior.
 */
const INTEGRATION_HALF_RANGE = 3;

/** Minimum SEM for quadrature spread (avoids collapse to point mass). */
const MIN_SEM = 0.05;

/** KL_SEM_THRESHOLD: Switch from KL → MFI when SEM drops below this. */
export const KL_SEM_THRESHOLD = 0.50;

/** Number of items after which we always switch to MFI regardless of SEM. */
export const KL_ITEM_THRESHOLD = 5;

// ─── Core KL computation ──────────────────────────────────────────────────────

/**
 * Compute KL(θ̂ ‖ θ) for a 3PL item — the divergence from the current
 * estimate θ̂ to the candidate value θ.
 *
 * KL(θ̂ ‖ θ) = P(θ̂)·ln[P(θ̂)/P(θ)] + Q(θ̂)·ln[Q(θ̂)/Q(θ)]
 */
function klDivergence(
  thetaHat: number,
  thetaCandidate: number,
  params: IrtParameters
): number {
  const EPS = 1e-9;
  const pHat = probability(thetaHat, params);
  const qHat = 1 - pHat;
  const pCand = Math.max(EPS, Math.min(1 - EPS, probability(thetaCandidate, params)));
  const qCand = 1 - pCand;

  const safePHat = Math.max(EPS, Math.min(1 - EPS, pHat));
  const safeQHat = 1 - safePHat;

  return (
    safePHat * Math.log(safePHat / pCand) +
    safeQHat * Math.log(safeQHat / qCand)
  );
}

/**
 * Compute the expected (Bayesian) KL information for one item given the
 * current θ estimate and its standard error.
 *
 * Uses G-point composite trapezoidal quadrature over the posterior
 * N(thetaHat, sem²) ∩ [thetaHat − 3·sem, thetaHat + 3·sem].
 *
 * @param thetaHat  Current ability estimate
 * @param sem       Standard error of estimation (posterior SD)
 * @param params    3PL item parameters
 * @returns         Non-negative KL score; higher → more informative
 */
export function klInformation(
  thetaHat: number,
  sem: number,
  params: IrtParameters
): number {
  const effectiveSem = Math.max(sem, MIN_SEM);
  const lo = thetaHat - INTEGRATION_HALF_RANGE * effectiveSem;
  const hi = thetaHat + INTEGRATION_HALF_RANGE * effectiveSem;
  const step = (hi - lo) / (QUAD_POINTS - 1);

  let integral = 0;
  const invSqrt2Pi = 1 / Math.sqrt(2 * Math.PI);
  const twoSigSq = 2 * effectiveSem * effectiveSem;

  for (let g = 0; g < QUAD_POINTS; g++) {
    const theta = lo + g * step;
    const kl = klDivergence(thetaHat, theta, params);

    // Posterior weight: N(thetaHat, sem²) evaluated at theta
    const z = theta - thetaHat;
    const weight = (invSqrt2Pi / effectiveSem) * Math.exp(-(z * z) / twoSigSq);

    // Trapezoidal rule: half-weight at endpoints
    const trapWeight = g === 0 || g === QUAD_POINTS - 1 ? 0.5 : 1;
    integral += trapWeight * weight * kl * step;
  }

  return Math.max(0, integral);
}

// ─── Batch scoring ────────────────────────────────────────────────────────────

export interface KLScoredItem {
  itemId: string;
  klScore: number;
}

/**
 * Score an array of items by their KL information and return them sorted
 * in descending order (highest KL first).
 *
 * @param thetaHat  Current ability estimate
 * @param sem       Standard error of estimation
 * @param items     Array of {id, params} objects
 */
export function rankByKL(
  thetaHat: number,
  sem: number,
  items: Array<{ id: string; params: IrtParameters }>
): KLScoredItem[] {
  const scored = items.map(item => ({
    itemId: item.id,
    klScore: klInformation(thetaHat, sem, item.params),
  }));
  scored.sort((a, b) => b.klScore - a.klScore);
  return scored;
}

// ─── Hybrid selector ──────────────────────────────────────────────────────────

export type SelectionMethod = "KL" | "MFI";

/**
 * Determine which selection method to use given the current CAT state.
 *
 * KL is preferred when:
 *   - fewer than KL_ITEM_THRESHOLD items have been administered (high uncertainty), OR
 *   - current SEM exceeds KL_SEM_THRESHOLD
 *
 * Otherwise MFI is used (more efficient once estimate is reliable).
 */
export function selectMethod(
  itemsAdministered: number,
  currentSem: number
): SelectionMethod {
  if (itemsAdministered < KL_ITEM_THRESHOLD || currentSem > KL_SEM_THRESHOLD) {
    return "KL";
  }
  return "MFI";
}

/**
 * Select the top-k items from a pool using the hybrid KL/MFI strategy.
 *
 * @param thetaHat          Current ability estimate
 * @param sem               Current SEM
 * @param itemsAdministered Number of items answered so far (excluding pretest)
 * @param pool              Available (not yet administered) items
 * @param topK              How many top candidates to return (default 5)
 */
export function hybridSelectTopK<T extends { id: string; params: IrtParameters }>(
  thetaHat: number,
  sem: number,
  itemsAdministered: number,
  pool: T[],
  topK = 5
): { method: SelectionMethod; items: T[] } {
  if (pool.length === 0) return { method: "MFI", items: [] };

  const method = selectMethod(itemsAdministered, sem);

  let sorted: T[];

  if (method === "KL") {
    const ranked = rankByKL(thetaHat, sem, pool);
    const idOrder = new Map(ranked.map((r, i) => [r.itemId, i]));
    sorted = [...pool].sort(
      (a, b) => (idOrder.get(a.id) ?? Infinity) - (idOrder.get(b.id) ?? Infinity)
    );
  } else {
    // MFI: sort by Fisher information descending
    sorted = [...pool].sort(
      (a, b) => fisherInformation(thetaHat, b.params) - fisherInformation(thetaHat, a.params)
    );
  }

  return { method, items: sorted.slice(0, Math.min(topK, sorted.length)) };
}
