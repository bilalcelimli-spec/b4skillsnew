/**
 * Answer-Copying Detection
 *
 * Implements three complementary statistics for detecting systematic
 * answer-copying between a suspected source (copier copies from) and
 * a suspicious examinee (copier).
 *
 * References
 * ──────────
 * Wollack, J.A. (1997). A nominal response model approach for detecting
 *   answer copying. Applied Psychological Measurement, 21(4), 307-320.
 *
 * Wollack, J.A. & Fremer, J.J. (Eds.) (2013). Handbook of Test Security.
 *   Routledge. (K-index and S2 described in ch. 4)
 *
 * Bay, L.M. (1995). Detecting answer copying on the USMLE Step 1.
 *   Academic Medicine, 70(10), S81-S83.  (K-index original formulation)
 *
 * Statistics
 * ──────────
 * 1. Wollack ω  — models the joint response probability under H0 (independent)
 *    versus H1 (copying), using 3PL item parameters.  Positive ω = evidence
 *    of copying.  Critical value: ω ≥ 1.96 (α=0.05, one-tailed z-test).
 *
 * 2. K-index   — counts exact matches on items where source answered
 *    correctly and copier is expected to be wrong (the "diagnostic" matches).
 *    Critical value: K ≥ 0 with p-value from binomial.
 *
 * 3. S2        — extends K-index by weighting matches by (1-P_j(θ_source))
 *    to discount easy items.  More powerful when the copier's θ < source θ.
 */

import { probability } from "../../assessment-engine/irt.js";
import { IrtParameters } from "../../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExamineeResponses {
  itemId: string;
  score: 0 | 1;
}

export interface ItemMeta {
  itemId: string;
  params: IrtParameters;
}

export interface CopyingResult {
  /** Wollack ω statistic (z-score; ≥ 1.96 flags at α=0.05). */
  omega: number;
  /** K-index raw count of diagnostic matches. */
  kIndex: number;
  /** K-index p-value (one-tailed binomial approximation). */
  kPValue: number;
  /** S2 weighted similarity index. */
  s2: number;
  /** Number of shared items. */
  sharedItems: number;
  /** Flag: any statistic exceeds its critical value. */
  flagged: boolean;
  /** Which statistics triggered the flag. */
  triggers: string[];
}

// ─── Critical values ──────────────────────────────────────────────────────────

const OMEGA_CRITICAL = 1.96;   // α=0.05 one-tailed
const S2_CRITICAL    = 2.0;    // heuristic; calibrate to local base rate

// ─── Normal CDF approximation (Abramowitz & Stegun) ─────────────────────────

function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z >  8) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530
    + t * (-0.356563782
    + t * (1.781477937
    + t * (-1.821255978
    + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

// ─── Binomial p-value (normal approximation) ─────────────────────────────────

function binomialPValue(k: number, n: number, p: number): number {
  // One-tailed: P(X ≥ k) under Binomial(n, p) via normal approximation
  if (n === 0) return 1;
  const mean = n * p;
  const variance = n * p * (1 - p);
  if (variance <= 0) return k > mean ? 0 : 1;
  const z = (k - 0.5 - mean) / Math.sqrt(variance); // continuity correction
  return 1 - normalCDF(z);
}

// ─── Wollack ω ────────────────────────────────────────────────────────────────

/**
 * Compute Wollack ω between a source and a copier examinee.
 *
 * Under H0 (no copying), the joint probability of both responding the same
 * on item j is:
 *   P0_j = P_j(θS)·P_j(θC) + Q_j(θS)·Q_j(θC)
 *
 * The ω statistic is the sum of log-probability ratios over shared items
 * (P(observed | copying) / P(observed | H0)), standardised by the variance.
 *
 * @param sourceResponses  Response vector of the source examinee
 * @param copierResponses  Response vector of the suspected copier
 * @param copierTheta      Ability estimate of the copier (from operational items)
 * @param sourceTheta      Ability estimate of the source
 * @param items            Item parameter map (must cover all shared items)
 */
export function wollackOmega(
  sourceResponses: ExamineeResponses[],
  copierResponses: ExamineeResponses[],
  copierTheta: number,
  sourceTheta: number,
  items: ItemMeta[]
): number {
  const sourceMap = new Map(sourceResponses.map(r => [r.itemId, r.score]));
  const copierMap = new Map(copierResponses.map(r => [r.itemId, r.score]));
  const itemMap   = new Map(items.map(it => [it.itemId, it.params]));

  let logRatioSum = 0;
  let variance    = 0;

  for (const [itemId, params] of itemMap) {
    const us = sourceMap.get(itemId);
    const uc = copierMap.get(itemId);
    if (us === undefined || uc === undefined) continue;

    const pS = probability(sourceTheta, params);
    const pC = probability(copierTheta, params);
    const qS = 1 - pS;
    const qC = 1 - pC;

    // P of observing (us, uc) under independence
    const p0 = us === 1
      ? (uc === 1 ? pS * pC : pS * qC)
      : (uc === 1 ? qS * pC : qS * qC);

    // P of observing (us, uc) under copying: copier copies source exactly
    // H1: P(uc = us) = 1 (perfect copy); P(uc ≠ us) = 0
    // We use a soft H1: P(uc = us | copying) = (1 − ε); ε = 0.05
    const EPS = 0.05;
    const p1 = us === uc ? 1 - EPS : EPS;

    const safeP0 = Math.max(1e-9, p0);
    const safeP1 = Math.max(1e-9, p1);
    logRatioSum += Math.log(safeP1 / safeP0);

    // Variance contribution under H0 (delta method)
    // Var[log(P1/P0)] ≈ Var[log(P0)] for H0-based inference
    const vMatch    = pS * pC * qS * qC; // Cov under H0
    variance += vMatch / (safeP0 * safeP0);
  }

  if (variance <= 0) return 0;
  return logRatioSum / Math.sqrt(variance);
}

// ─── K-index ──────────────────────────────────────────────────────────────────

/**
 * K-index: count of items where source=correct AND copier=correct AND
 * P_j(θ_copier) < p_threshold (copier would not be expected to know).
 *
 * Returns the raw count and a binomial p-value under H0.
 */
export function kIndex(
  sourceResponses: ExamineeResponses[],
  copierResponses: ExamineeResponses[],
  copierTheta: number,
  items: ItemMeta[],
  pThreshold = 0.50
): { k: number; pValue: number; n: number } {
  const sourceMap = new Map(sourceResponses.map(r => [r.itemId, r.score]));
  const copierMap = new Map(copierResponses.map(r => [r.itemId, r.score]));
  const itemMap   = new Map(items.map(it => [it.itemId, it.params]));

  let k = 0;     // diagnostic matches
  let n = 0;     // diagnostic items (source correct, copier expected wrong)
  let expectedK = 0;

  for (const [itemId, params] of itemMap) {
    const us = sourceMap.get(itemId);
    const uc = copierMap.get(itemId);
    if (us === undefined || uc === undefined) continue;

    const pC = probability(copierTheta, params);

    // Diagnostic item: source correct AND copier expected to fail
    if (us === 1 && pC < pThreshold) {
      n++;
      expectedK += pC; // expected # correct by chance
      if (uc === 1) k++;
    }
  }

  const pHat = n > 0 ? expectedK / n : 0;
  const pValue = n > 0 ? binomialPValue(k, n, pHat) : 1;

  return { k, pValue, n };
}

// ─── S2 statistic ─────────────────────────────────────────────────────────────

/**
 * S2 (weighted similarity index).
 *
 * S2 = Σ_j (1 − P_j(θS)) · match_j
 * standardised by E[S2] and Var[S2] under H0.
 *
 * Items where source and copier give identical responses are up-weighted
 * by (1 − P_j(θS)) — surprising agreements get more weight.
 */
export function s2Statistic(
  sourceResponses: ExamineeResponses[],
  copierResponses: ExamineeResponses[],
  sourceTheta: number,
  copierTheta: number,
  items: ItemMeta[]
): number {
  const sourceMap = new Map(sourceResponses.map(r => [r.itemId, r.score]));
  const copierMap = new Map(copierResponses.map(r => [r.itemId, r.score]));
  const itemMap   = new Map(items.map(it => [it.itemId, it.params]));

  let observed = 0;
  let expected = 0;
  let variance = 0;

  for (const [itemId, params] of itemMap) {
    const us = sourceMap.get(itemId);
    const uc = copierMap.get(itemId);
    if (us === undefined || uc === undefined) continue;

    const pS = probability(sourceTheta, params);
    const pC = probability(copierTheta, params);

    const weight = 1 - pS; // higher for hard items

    // Under H0: match probability = P(same response) = pS*pC + (1-pS)*(1-pC)
    const pMatch = pS * pC + (1 - pS) * (1 - pC);

    if (us === uc) observed += weight;
    expected  += weight * pMatch;
    variance  += weight * weight * pMatch * (1 - pMatch);
  }

  if (variance <= 0) return 0;
  return (observed - expected) / Math.sqrt(variance);
}

// ─── Combined detector ────────────────────────────────────────────────────────

/**
 * Run all three copying statistics and return a combined result.
 */
export function detectAnswerCopying(
  sourceResponses: ExamineeResponses[],
  copierResponses: ExamineeResponses[],
  sourceTheta: number,
  copierTheta: number,
  items: ItemMeta[]
): CopyingResult {
  const sharedItems = items.filter(it => {
    const s = sourceResponses.find(r => r.itemId === it.itemId);
    const c = copierResponses.find(r => r.itemId === it.itemId);
    return s !== undefined && c !== undefined;
  }).length;

  const omega = wollackOmega(
    sourceResponses, copierResponses, copierTheta, sourceTheta, items
  );

  const { k: kRaw, pValue: kPVal } = kIndex(
    sourceResponses, copierResponses, copierTheta, items
  );

  const s2 = s2Statistic(
    sourceResponses, copierResponses, sourceTheta, copierTheta, items
  );

  const triggers: string[] = [];
  if (omega >= OMEGA_CRITICAL) triggers.push(`ω=${omega.toFixed(2)}≥${OMEGA_CRITICAL}`);
  if (kPVal <= 0.05 && kRaw > 0) triggers.push(`K=${kRaw}(p=${kPVal.toFixed(3)})`);
  if (s2 >= S2_CRITICAL) triggers.push(`S2=${s2.toFixed(2)}≥${S2_CRITICAL}`);

  return {
    omega: Number(omega.toFixed(4)),
    kIndex: kRaw,
    kPValue: Number(kPVal.toFixed(4)),
    s2: Number(s2.toFixed(4)),
    sharedItems,
    flagged: triggers.length >= 2, // require ≥2 statistics to fire (reduces FP)
    triggers,
  };
}
