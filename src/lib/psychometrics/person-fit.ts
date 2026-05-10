/**
 * Person-Fit Analysis — Aberrant Response Pattern Detection
 *
 * Implements three complementary statistics for detecting examinees whose
 * response patterns are inconsistent with what IRT predicts at their θ level.
 * Aberrance can signal: cheating, rapid guessing, low motivation, impersonation,
 * or item pre-knowledge.
 *
 * Statistics implemented:
 *
 *   1. Lz  (Drasgow, Levine & Williams 1985) — standardized log-likelihood.
 *      The gold standard in CAT; used by ETS GMAT, Linguaskill, DET.
 *      Cutoff: Lz < −2.0 → flag; Lz < −3.0 → strong aberrance.
 *
 *   2. ECI (Extended Caution Index, Tatsuoka 1984, normed variant) — measures
 *      correlation between observed pattern and expected pattern at θ̂.
 *      Higher → more aberrant. Cutoff: ECI > 1.0 → flag.
 *
 *   3. U3 (van der Linden 1997) — proportion of items for which examinee's
 *      response deviates from the most likely response (0 or 1) at θ̂.
 *      Cutoff: U3 > 0.30 → flag.
 *
 *   4. Rapid-Guess Index (RGI) — proportion of item responses with RT below
 *      the rapid-guess threshold (< 10 s for MC, < 3 s for FIB).
 *      Integrated with response-time-irt.ts but calculated here for completeness.
 *
 * References
 * ----------
 * Drasgow, F., Levine, M. V., & Williams, E. A. (1985). Appropriateness
 *   measurement with polychotomous item response models and standardized indices.
 *   British Journal of Mathematical and Statistical Psychology, 38(1), 67–86.
 *
 * Tatsuoka, K. K. (1984). Caution indices based on item response theory.
 *   Psychometrika, 49(1), 95–110.
 *
 * van der Linden, W. J. (1997). A procedure for empirically classifying
 *   examinees. Applied Psychological Measurement, 21(2), 129–145.
 *
 * Meijer, R. R., & Sijtsma, K. (2001). Methodology review: Evaluating person
 *   fit. Applied Psychological Measurement, 25(2), 107–135.
 */

import type { Item, Response, IrtParameters } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AberranceFlag =
  | "NONE"           // No aberrance detected
  | "LOW_EFFORT"     // RGI > 0.20 — rapid guessing pattern
  | "INCONSISTENT"   // Lz < -2.0 — pattern inconsistent with θ̂
  | "ABERRANT"       // Lz < -3.0 — strongly aberrant (possible cheating)
  | "INSUFFICIENT";  // < MIN_ITEMS items — cannot compute reliably

export interface PersonFitResult {
  /** Number of items used in the analysis */
  n: number;
  /** Standardized log-likelihood (Drasgow Lz). Null if insufficient data. */
  lz: number | null;
  /** Raw log-likelihood */
  logLikelihood: number | null;
  /**
   * Normed Extended Caution Index (Tatsuoka). Higher → more aberrant.
   * Null if insufficient data.
   */
  eci: number | null;
  /**
   * U3 index (van der Linden 1997). Proportion of items where response
   * deviates from modal response. Null if insufficient data.
   */
  u3: number | null;
  /**
   * Rapid-Guess Index — proportion of items with RT < RAPID_GUESS_MS.
   * Null if no latency data.
   */
  rgi: number | null;
  /** Primary aberrance classification */
  flag: AberranceFlag;
  /** Human-readable explanation of the flag */
  interpretation: string;
  /** Recommended action for the score report */
  recommendedAction: "ACCEPT" | "FLAG_FOR_REVIEW" | "INVALIDATE";
  /** Per-item diagnostic: response, predicted, residual */
  itemResiduals: Array<{ itemId: string; observed: number; expected: number; residual: number }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum operational items to compute person-fit reliably */
const MIN_ITEMS = 5;

/** Lz threshold below which a session is flagged */
const LZ_FLAG_THRESHOLD = -2.0;

/** Lz threshold below which a session is treated as strongly aberrant */
const LZ_ABERRANT_THRESHOLD = -3.0;

/** Proportion of rapid-guess items above which LOW_EFFORT is flagged */
const RGI_THRESHOLD = 0.20;

/** Response time (ms) below which an MC response is considered a rapid guess */
const RAPID_GUESS_MC_MS = 10_000;  // 10 seconds

/** Response time (ms) below which a FIB/open response is rapid guess */
const RAPID_GUESS_FIB_MS = 3_000;  // 3 seconds

// ─── 3PL IRT probability ─────────────────────────────────────────────────────

/**
 * 3PL item response function: P(θ) = c + (1 − c) / (1 + exp(−a(θ − b)))
 * Clamped to [c + ε, 1 − ε] to prevent log(0).
 */
function p3pl(theta: number, params: IrtParameters): number {
  const { a, b, c } = params;
  const denom = 1 + Math.exp(-a * (theta - b));
  const prob = c + (1 - c) / denom;
  return Math.max(c + 1e-8, Math.min(1 - 1e-8, prob));
}

// ─── Lz statistic (Drasgow 1985) ─────────────────────────────────────────────

/**
 * Compute Lz for a set of dichotomous responses at a given theta.
 *
 * Lz = (ln L(θ|X) − E[ln L(θ)|θ]) / sqrt(Var[ln L(θ)|θ])
 *
 * E[ln L|θ] = Σ_i [ P_i · ln P_i + Q_i · ln Q_i ]
 * Var[ln L|θ] = Σ_i [ P_i · Q_i · (ln(P_i/Q_i))² ]
 */
export function computeLz(
  responses: Array<{ itemId: string; score: number }>,
  itemMap: Map<string, IrtParameters>,
  theta: number
): { lz: number | null; logLikelihood: number; expectedLogL: number; varLogL: number } {
  let logL = 0;
  let expectedLogL = 0;
  let varLogL = 0;
  let validN = 0;

  for (const r of responses) {
    const params = itemMap.get(r.itemId);
    if (!params) continue;

    const p = p3pl(theta, params);
    const q = 1 - p;
    const x = Math.round(Math.max(0, Math.min(1, r.score)));  // binarize

    logL += x * Math.log(p) + (1 - x) * Math.log(q);
    expectedLogL += p * Math.log(p) + q * Math.log(q);
    const logRatio = Math.log(p / q);
    varLogL += p * q * logRatio * logRatio;
    validN++;
  }

  if (validN < MIN_ITEMS || varLogL <= 0) {
    return { lz: null, logLikelihood: logL, expectedLogL, varLogL };
  }

  const lz = (logL - expectedLogL) / Math.sqrt(varLogL);
  return { lz, logLikelihood: logL, expectedLogL, varLogL };
}

// ─── ECI (Normed Extended Caution Index) ─────────────────────────────────────

/**
 * Normed Extended Caution Index (Tatsuoka 1984, normed variant).
 *
 * ECI = 1 − [Σ(x_i − P_i)² / Σ P_i·Q_i]
 *
 * Transformed so that 0 = perfect Guttman order, higher = more aberrant.
 * This returns the complement: ECI_aberrance = 1 − ECI_order
 *
 * Practical range: [0, ∞) but typically [0, 2]
 */
export function computeECI(
  responses: Array<{ itemId: string; score: number }>,
  itemMap: Map<string, IrtParameters>,
  theta: number
): number | null {
  let numerator = 0;
  let denominator = 0;
  let validN = 0;

  for (const r of responses) {
    const params = itemMap.get(r.itemId);
    if (!params) continue;

    const p = p3pl(theta, params);
    const q = 1 - p;
    const x = Math.round(Math.max(0, Math.min(1, r.score)));

    numerator += (x - p) ** 2;
    denominator += p * q;
    validN++;
  }

  if (validN < MIN_ITEMS || denominator <= 0) return null;

  // ECI_aberrance = weighted residuals / expected variance
  // Values > 1.0 indicate more variance than expected under the model
  return numerator / denominator;
}

// ─── U3 index (van der Linden 1997) ──────────────────────────────────────────

/**
 * U3 index: proportion of items where the examinee's response
 * deviates from the modal response (most likely outcome) given θ̂.
 *
 * Modal response: 1 if P(θ) > 0.5, else 0.
 * U3 = (# items where x ≠ modal) / n
 *
 * Cutoff: U3 > 0.30 → aberrant.
 */
export function computeU3(
  responses: Array<{ itemId: string; score: number }>,
  itemMap: Map<string, IrtParameters>,
  theta: number
): number | null {
  let deviations = 0;
  let validN = 0;

  for (const r of responses) {
    const params = itemMap.get(r.itemId);
    if (!params) continue;

    const p = p3pl(theta, params);
    const modal = p >= 0.5 ? 1 : 0;
    const x = Math.round(Math.max(0, Math.min(1, r.score)));

    if (x !== modal) deviations++;
    validN++;
  }

  if (validN < MIN_ITEMS) return null;
  return deviations / validN;
}

// ─── Rapid-Guess Index ────────────────────────────────────────────────────────

/**
 * Proportion of responses where latency is below the rapid-guess threshold.
 * Null if no latency data available.
 */
export function computeRGI(
  responses: Array<{ itemId: string; score: number; latencyMs?: number }>,
  itemMap: Map<string, { type?: string; params: IrtParameters }>
): number | null {
  const withLatency = responses.filter(r => typeof r.latencyMs === "number");
  if (withLatency.length < MIN_ITEMS) return null;

  let rapidCount = 0;

  for (const r of withLatency) {
    const item = itemMap.get(r.itemId);
    const isFib = item?.type === "FILL_IN_BLANKS" || item?.type === "SPEAKING_PROMPT";
    const threshold = isFib ? RAPID_GUESS_FIB_MS : RAPID_GUESS_MC_MS;
    if ((r.latencyMs ?? Infinity) < threshold) rapidCount++;
  }

  return rapidCount / withLatency.length;
}

// ─── Item Residuals ───────────────────────────────────────────────────────────

function buildItemResiduals(
  responses: Array<{ itemId: string; score: number }>,
  itemMap: Map<string, IrtParameters>,
  theta: number
): PersonFitResult["itemResiduals"] {
  return responses.map(r => {
    const params = itemMap.get(r.itemId);
    if (!params) return { itemId: r.itemId, observed: r.score, expected: 0.5, residual: r.score - 0.5 };
    const expected = p3pl(theta, params);
    const observed = Math.round(Math.max(0, Math.min(1, r.score)));
    return { itemId: r.itemId, observed, expected: Number(expected.toFixed(4)), residual: Number((observed - expected).toFixed(4)) };
  });
}

// ─── Flag decision ────────────────────────────────────────────────────────────

function classifyFlag(lz: number | null, rgi: number | null, n: number): AberranceFlag {
  if (n < MIN_ITEMS) return "INSUFFICIENT";
  if (rgi !== null && rgi > RGI_THRESHOLD) return "LOW_EFFORT";
  if (lz === null) return "NONE";
  if (lz < LZ_ABERRANT_THRESHOLD) return "ABERRANT";
  if (lz < LZ_FLAG_THRESHOLD) return "INCONSISTENT";
  return "NONE";
}

function flagInterpretation(flag: AberranceFlag, lz: number | null, rgi: number | null): string {
  switch (flag) {
    case "NONE": return "Response pattern is consistent with estimated ability level.";
    case "INSUFFICIENT": return `Fewer than ${MIN_ITEMS} operational items — person-fit cannot be reliably computed.`;
    case "LOW_EFFORT": return `${Math.round((rgi ?? 0) * 100)}% of responses were too fast (rapid-guess pattern). Score may underestimate true ability.`;
    case "INCONSISTENT": return `Lz = ${lz?.toFixed(2)} — response pattern is significantly less likely than expected (p < .05). Possible guessing, pre-knowledge, or distraction.`;
    case "ABERRANT": return `Lz = ${lz?.toFixed(2)} — response pattern is highly improbable under the IRT model (p < .001). Requires expert review.`;
  }
}

function recommendedAction(flag: AberranceFlag): PersonFitResult["recommendedAction"] {
  switch (flag) {
    case "NONE":
    case "INSUFFICIENT": return "ACCEPT";
    case "LOW_EFFORT":
    case "INCONSISTENT": return "FLAG_FOR_REVIEW";
    case "ABERRANT": return "INVALIDATE";
  }
}

// ─── Main API ─────────────────────────────────────────────────────────────────

export interface PersonFitInput {
  responses: Array<{
    itemId: string;
    score: number;
    isPretest?: boolean;
    latencyMs?: number;
  }>;
  items: Item[];
  theta: number;
}

/**
 * Compute the full person-fit report for a completed session.
 *
 * @param input - responses, item bank (for IRT params), estimated theta
 * @returns PersonFitResult with Lz, ECI, U3, RGI, flag, and interpretation
 */
export function computePersonFit(input: PersonFitInput): PersonFitResult {
  const { responses, items, theta } = input;

  // Only use operational (non-pretest) items
  const opResponses = responses.filter(r => !r.isPretest);

  // Build item maps
  const irtParamMap = new Map<string, IrtParameters>(
    items.map(item => [item.id, item.params])
  );
  const itemDetailMap = new Map<string, { type?: string; params: IrtParameters }>(
    items.map(item => [item.id, { type: item.type, params: item.params }])
  );

  const n = opResponses.filter(r => irtParamMap.has(r.itemId)).length;

  const { lz, logLikelihood } = computeLz(opResponses, irtParamMap, theta);
  const eci = computeECI(opResponses, irtParamMap, theta);
  const u3 = computeU3(opResponses, irtParamMap, theta);
  const rgi = computeRGI(opResponses, itemDetailMap);

  const flag = classifyFlag(lz, rgi, n);

  return {
    n,
    lz: lz !== null ? Number(lz.toFixed(3)) : null,
    logLikelihood: Number(logLikelihood.toFixed(4)),
    eci: eci !== null ? Number(eci.toFixed(4)) : null,
    u3: u3 !== null ? Number(u3.toFixed(4)) : null,
    rgi: rgi !== null ? Number(rgi.toFixed(4)) : null,
    flag,
    interpretation: flagInterpretation(flag, lz, rgi),
    recommendedAction: recommendedAction(flag),
    itemResiduals: buildItemResiduals(opResponses, irtParamMap, theta),
  };
}

/**
 * Batch person-fit for multiple sessions (e.g. for monthly audit).
 * Returns only sessions with flag !== "NONE".
 */
export function batchPersonFit(
  sessions: PersonFitInput[]
): Array<PersonFitResult & { sessionIndex: number }> {
  return sessions
    .map((s, i) => ({ ...computePersonFit(s), sessionIndex: i }))
    .filter(r => r.flag !== "NONE" && r.flag !== "INSUFFICIENT");
}

/**
 * Aggregate person-fit results across a cohort.
 * Returns proportion flagged at each level for quality monitoring.
 */
export function aggregatePersonFit(results: PersonFitResult[]): {
  n: number;
  flaggedCount: number;
  flagRate: number;
  aberrantCount: number;
  aberrantRate: number;
  lowEffortCount: number;
  lowEffortRate: number;
  meanLz: number | null;
  meetsQualityStandard: boolean;  // flagRate < 0.05
} {
  const valid = results.filter(r => r.flag !== "INSUFFICIENT");
  const n = valid.length;
  if (n === 0) {
    return { n: 0, flaggedCount: 0, flagRate: 0, aberrantCount: 0, aberrantRate: 0, lowEffortCount: 0, lowEffortRate: 0, meanLz: null, meetsQualityStandard: true };
  }

  const flagged = valid.filter(r => r.flag !== "NONE").length;
  const aberrant = valid.filter(r => r.flag === "ABERRANT").length;
  const lowEffort = valid.filter(r => r.flag === "LOW_EFFORT").length;

  const lzValues = valid.map(r => r.lz).filter((v): v is number => v !== null);
  const meanLz = lzValues.length > 0 ? lzValues.reduce((s, v) => s + v, 0) / lzValues.length : null;

  return {
    n,
    flaggedCount: flagged,
    flagRate: Number((flagged / n).toFixed(4)),
    aberrantCount: aberrant,
    aberrantRate: Number((aberrant / n).toFixed(4)),
    lowEffortCount: lowEffort,
    lowEffortRate: Number((lowEffort / n).toFixed(4)),
    meanLz: meanLz !== null ? Number(meanLz.toFixed(3)) : null,
    meetsQualityStandard: flagged / n < 0.05,  // < 5% flag rate target
  };
}
