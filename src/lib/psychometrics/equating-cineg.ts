/**
 * CINEG Equating — Common-Item Non-Equivalent Groups
 *
 * Links test forms administered to non-equivalent groups via a set of anchor
 * (common) items shared across both forms.
 *
 * Implemented methods:
 *   - Tucker (observed-score linear equating)
 *   - Levine True-Score (less sensitive to group ability differences)
 *   - Post-equating drift report using anchor IRT parameters
 *
 * References:
 *   Kolen & Brennan (2014), Test Equating, Scaling, and Linking (3rd ed.), §4.3–4.4
 *   von Davier, Holland & Thayer (2004), The Kernel Method of Test Equating
 */

import { probability } from "../assessment-engine/irt.js";
import type { IrtParameters } from "../assessment-engine/types.js";
import type { EquatingResult } from "./equating-audit.js";
import { transformItemParams } from "./equating-audit.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Descriptive statistics for an item score distribution */
export interface ScoreStats {
  mean: number;
  variance: number;
  n: number;
}

/** CINEG-specific equating result */
export interface CinegEquatingResult extends Omit<EquatingResult, "method"> {
  method: "TUCKER" | "LEVINE";
  /** Synthetic group weights (w1 = weight for old-form group) */
  w1: number;
  w2: number;
  /** Score stats for old form total, new form total, and anchor scores */
  statsOld: { total: ScoreStats; anchor: ScoreStats };
  statsNew: { total: ScoreStats; anchor: ScoreStats };
}

/** Per-anchor-item drift report after equating */
export interface AnchorItemDrift {
  itemId: string;
  /** b-parameter in old-form calibration */
  bOld: number;
  /** b-parameter in new-form calibration */
  bNew: number;
  /** Drift: bNew − (A * bOld + B) */
  drift: number;
  /** Whether drift exceeds the 0.3 logit warning threshold */
  flagged: boolean;
}

export interface CinegReport {
  equating: CinegEquatingResult;
  anchorDrift: AnchorItemDrift[];
  /** Items flagged for drift ≥ 0.3 logits */
  flaggedDriftCount: number;
  /** Overall root-mean-square drift across anchor items */
  rmsDrift: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function stats(scores: number[]): ScoreStats {
  if (scores.length === 0) return { mean: 0, variance: 0, n: 0 };
  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
  return { mean, variance, n };
}

/**
 * Compute expected number-correct score on the anchor from theta,
 * given anchor item IRT parameters.
 */
function anchorExpectedScore(theta: number, anchorParams: IrtParameters[]): number {
  return anchorParams.reduce((s, p) => s + probability(theta, p), 0);
}

/** Compute mean and variance of expected anchor scores over a theta distribution */
function syntheticAnchorStats(
  thetas: number[],
  anchorParams: IrtParameters[]
): ScoreStats {
  const expectedScores = thetas.map((t) => anchorExpectedScore(t, anchorParams));
  return stats(expectedScores);
}

// ─────────────────────────────────────────────────────────────────────────────
// TUCKER EQUATING  (Kolen & Brennan 2014, §4.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tucker observed-score CINEG equating.
 *
 * Assumes the regression of total score on anchor score is the same in both
 * populations (i.e., item parameters are stable across forms).
 *
 * @param oldTotal     Observed total scores on old form (all items)
 * @param oldAnchor    Observed anchor item scores for old-form group
 * @param newTotal     Observed total scores on new form (all items)
 * @param newAnchor    Observed anchor item scores for new-form group
 * @param w1           Weight for old-form population (default 0.5 = equal weight)
 */
export function tuckerEquating(
  oldTotal: number[],
  oldAnchor: number[],
  newTotal: number[],
  newAnchor: number[],
  w1 = 0.5
): CinegEquatingResult {
  if (oldTotal.length !== oldAnchor.length || newTotal.length !== newAnchor.length) {
    throw new Error("Tucker: total and anchor arrays must have the same length");
  }
  if (oldTotal.length < 10 || newTotal.length < 10) {
    throw new Error("Tucker: need at least 10 responses per group");
  }

  const w2 = 1 - w1;

  const sO = stats(oldTotal);
  const sN = stats(newTotal);
  const sOV = stats(oldAnchor);
  const sNV = stats(newAnchor);

  // Covariance(total, anchor) per group — using Pearson formula
  function cov(xs: number[], ys: number[], mx: number, my: number): number {
    const n = xs.length;
    return xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (n - 1);
  }

  const covOVX = cov(oldTotal, oldAnchor, sO.mean, sOV.mean);
  const covNVX = cov(newTotal, newAnchor, sN.mean, sNV.mean);

  // Regression slopes: b = Cov(X, V) / Var(V)
  const gammaO = sOV.variance > 0 ? covOVX / sOV.variance : 0;
  const gammaN = sNV.variance > 0 ? covNVX / sNV.variance : 0;

  // Synthetic population means (μ_T = μ_X − γ * (μ_V_group − μ_V_synthetic))
  // Synthetic anchor mean = weighted average of both group anchor means
  const muVSyn = w1 * sOV.mean + w2 * sNV.mean;
  const varVSyn = w1 * (sOV.variance + (sOV.mean - muVSyn) ** 2)
    + w2 * (sNV.variance + (sNV.mean - muVSyn) ** 2);

  // Synthetic means on total score
  const muOSyn = sO.mean + gammaO * (muVSyn - sOV.mean);
  const muNSyn = sN.mean + gammaN * (muVSyn - sNV.mean);

  // Synthetic variances on total score
  const varOSyn = sO.variance + gammaO ** 2 * (varVSyn - sOV.variance);
  const varNSyn = sN.variance + gammaN ** 2 * (varVSyn - sNV.variance);

  // Linear equating: eY(x) = A * x + B
  const sdOSyn = Math.sqrt(Math.max(varOSyn, 0));
  const sdNSyn = Math.sqrt(Math.max(varNSyn, 0));

  const A = sdOSyn > 0 ? sdNSyn / sdOSyn : 1;
  const B = muNSyn - A * muOSyn;

  // RMSD on theta grid (IRT-based — estimate only; proper TCC RMSD needs item params)
  const rmsd = Math.abs(B) / Math.max(sdOSyn, 1) * 0.1; // approximate

  return {
    A: Number(A.toFixed(4)),
    B: Number(B.toFixed(4)),
    method: "TUCKER",
    commonItemCount: Math.min(oldAnchor.length, newAnchor.length),
    rmsd: Number(rmsd.toFixed(5)),
    w1,
    w2,
    statsOld: { total: sO, anchor: sOV },
    statsNew: { total: sN, anchor: sNV },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVINE TRUE-SCORE EQUATING  (Kolen & Brennan 2014, §4.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Levine true-score CINEG equating.
 *
 * Fewer assumptions than Tucker when group ability distributions differ
 * substantially. Requires proportion-correct data rather than raw scores.
 *
 * @param n1  Number of non-anchor items on old form
 * @param n2  Number of non-anchor items on new form
 * @param nV  Number of anchor (common) items
 */
export function levineEquating(
  oldTotal: number[],
  oldAnchor: number[],
  newTotal: number[],
  newAnchor: number[],
  n1: number,
  n2: number,
  nV: number,
  w1 = 0.5
): CinegEquatingResult {
  if (oldTotal.length !== oldAnchor.length || newTotal.length !== newAnchor.length) {
    throw new Error("Levine: total and anchor arrays must have the same length");
  }

  const w2 = 1 - w1;
  const sO = stats(oldTotal);
  const sN = stats(newTotal);
  const sOV = stats(oldAnchor);
  const sNV = stats(newAnchor);

  // γ₁ = n1 + nV / nV  (reliability factor)
  const gamma1 = nV > 0 ? (n1 + nV) / nV : 1;
  const gamma2 = nV > 0 ? (n2 + nV) / nV : 1;

  // Synthetic anchor mean (weighted)
  const muVSyn = w1 * sOV.mean + w2 * sNV.mean;

  // True-score means
  const tauO = sO.mean + gamma1 * (muVSyn - sOV.mean);
  const tauN = sN.mean + gamma2 * (muVSyn - sNV.mean);

  // True-score variances
  const varVSyn = w1 * sOV.variance + w2 * sNV.variance;
  const varO_true = sO.variance + gamma1 ** 2 * (varVSyn - sOV.variance);
  const varN_true = sN.variance + gamma2 ** 2 * (varVSyn - sNV.variance);

  const sdO = Math.sqrt(Math.max(varO_true, 0));
  const sdN = Math.sqrt(Math.max(varN_true, 0));

  const A = sdO > 0 ? sdN / sdO : 1;
  const B = tauN - A * tauO;

  const rmsd = Math.abs(B) / Math.max(sdO, 1) * 0.1;

  return {
    A: Number(A.toFixed(4)),
    B: Number(B.toFixed(4)),
    method: "LEVINE",
    commonItemCount: nV,
    rmsd: Number(rmsd.toFixed(5)),
    w1,
    w2,
    statsOld: { total: sO, anchor: sOV },
    statsNew: { total: sN, anchor: sNV },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIFT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/** Warning threshold for b-parameter drift (0.3 logits, ETS convention) */
const DRIFT_FLAG_THRESHOLD = 0.3;

/**
 * Compute per-anchor-item drift after applying equating transformation.
 *
 * After placing new-form parameters on the old-form scale via the transformation
 * θ_old = (θ_new − B) / A, the expected b-parameters should match.
 * Residuals indicate item drift (parameter instability).
 */
export function anchorDriftReport(
  anchorItems: Array<{ itemId: string; paramsOld: IrtParameters; paramsNew: IrtParameters }>,
  equating: EquatingResult
): AnchorItemDrift[] {
  return anchorItems.map(({ itemId, paramsOld, paramsNew }) => {
    // Transform new-form params to old-form scale
    const transformedNew = transformItemParams(paramsNew, equating);
    const drift = transformedNew.b - paramsOld.b;
    return {
      itemId,
      bOld: paramsOld.b,
      bNew: paramsNew.b,
      drift: Number(drift.toFixed(4)),
      flagged: Math.abs(drift) >= DRIFT_FLAG_THRESHOLD,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-LEVEL API
// ─────────────────────────────────────────────────────────────────────────────

export interface CinegInput {
  /** Response scores on the full old form for each candidate in group 1 */
  oldFormScores: number[];
  /** Response scores on just the anchor items for each candidate in group 1 */
  oldAnchorScores: number[];
  /** Response scores on the full new form for each candidate in group 2 */
  newFormScores: number[];
  /** Response scores on just the anchor items for each candidate in group 2 */
  newAnchorScores: number[];
  /** Non-anchor item counts (required for Levine method) */
  n1: number; // non-anchor items on old form
  n2: number; // non-anchor items on new form
  /** Anchor item IRT parameters — required for drift analysis */
  anchorItems?: Array<{
    itemId: string;
    paramsOld: IrtParameters;
    paramsNew: IrtParameters;
  }>;
  /** Population weight for old-form group (default: 0.5) */
  w1?: number;
}

/**
 * Run Tucker + Levine CINEG equating and return a comprehensive report.
 */
export function runCinegEquating(input: CinegInput): {
  tucker: CinegReport;
  levine: CinegReport;
  recommendation: "TUCKER" | "LEVINE";
  recommendationReason: string;
} {
  const {
    oldFormScores, oldAnchorScores,
    newFormScores, newAnchorScores,
    n1, n2, anchorItems = [],
    w1 = 0.5,
  } = input;

  const nV = Math.round(
    (oldAnchorScores.reduce((a, b) => a + b, 0) / oldAnchorScores.length)
    / (1 / (oldAnchorScores.length > 0 ? 1 : 1)) * 0 + anchorItems.length
  ) || Math.round(oldAnchorScores.length / 5); // estimate anchor count from data if not provided

  const tuckerResult = tuckerEquating(
    oldFormScores, oldAnchorScores,
    newFormScores, newAnchorScores, w1
  );

  const levineResult = levineEquating(
    oldFormScores, oldAnchorScores,
    newFormScores, newAnchorScores,
    n1, n2, n1 + n2 > 0 ? nV : 5, w1
  );

  // Drift analysis (for both — applied to Tucker by default)
  const tuckerDrift = anchorItems.length > 0
    ? anchorDriftReport(anchorItems, tuckerResult as unknown as import("./equating-audit.js").EquatingResult)
    : [];
  const levineDrift = anchorItems.length > 0
    ? anchorDriftReport(anchorItems, levineResult as unknown as import("./equating-audit.js").EquatingResult)
    : [];

  function makeCinegReport(result: CinegEquatingResult, drift: AnchorItemDrift[]): CinegReport {
    const flagged = drift.filter((d) => d.flagged).length;
    const rmsDrift = drift.length > 0
      ? Math.sqrt(drift.reduce((s, d) => s + d.drift ** 2, 0) / drift.length)
      : 0;
    return { equating: result, anchorDrift: drift, flaggedDriftCount: flagged, rmsDrift };
  }

  // Recommendation: use Levine when groups differ substantially in ability
  const oldMean = oldFormScores.reduce((a, b) => a + b, 0) / oldFormScores.length;
  const newMean = newFormScores.reduce((a, b) => a + b, 0) / newFormScores.length;
  const oldSD = Math.sqrt(stats(oldFormScores).variance);
  const groupDiff = Math.abs(oldMean - newMean) / Math.max(oldSD, 1);

  const useLevine = groupDiff > 0.5; // Cohen d > 0.5 → groups differ meaningfully
  return {
    tucker: makeCinegReport(tuckerResult, tuckerDrift),
    levine: makeCinegReport(levineResult, levineDrift),
    recommendation: useLevine ? "LEVINE" : "TUCKER",
    recommendationReason: useLevine
      ? `Group ability difference d=${groupDiff.toFixed(2)} > 0.5 — Levine true-score is more robust`
      : `Group ability difference d=${groupDiff.toFixed(2)} ≤ 0.5 — Tucker observed-score is appropriate`,
  };
}
