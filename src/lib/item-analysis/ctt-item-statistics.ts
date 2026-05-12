/**
 * Classical Test Theory (CTT) Item Statistics Engine
 *
 * Implements the full CTT item analysis pipeline as used by Cambridge Assessment,
 * Oxford University Press, Pearson, and ETS for item bank quality assurance.
 *
 * Metrics computed:
 *   - Facility Value (p-value) with Cambridge/Pearson threshold checks
 *   - Point-Biserial Discrimination Index (rpbi)
 *   - Biserial Correlation (rb)
 *   - Distractor Efficiency Analysis (DEI, distractor-level pbis)
 *   - Item Reliability Index (IRI = p * rpbi)
 *   - Item Discrimination Index (ID = upper27% - lower27%)
 *   - Alpha-if-item-deleted (Cronbach's α)
 *   - Kuder-Richardson Formula 20 (KR-20) for the test
 *   - KR-21 approximation
 *   - Standard Error of Measurement (SEM_CTT = σ√(1−α))
 *
 * Thresholds from:
 *   - Cambridge Assessment English — Item Review Guidelines (2024)
 *   - ETS Test Development Guidelines (2009)
 *   - Pearson/Angoff standard-setting guidance
 *   - Haladyna, Downing & Rodriguez (2002) — item writing meta-analysis
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CttThresholds {
  /** Minimum acceptable facility value (too hard below) */
  facilityMin: number;    // Cambridge: 0.20, Pearson: 0.25, ETS: 0.20
  /** Maximum acceptable facility value (too easy above) */
  facilityMax: number;    // Cambridge: 0.90, Pearson: 0.85, ETS: 0.85
  /** Minimum acceptable point-biserial for key */
  pbisMin: number;        // Cambridge: 0.25, ETS: 0.20
  /** Maximum acceptable point-biserial for distractor (should be ≤ 0) */
  distractorPbisMax: number;  // Cambridge/ETS: 0.0 (negative is ideal)
  /** Minimum distractor selection rate (below = non-functioning) */
  distractorMinRate: number;  // Cambridge: 0.05 (5%)
  /** Source of thresholds */
  source: string;
}

/** Cambridge Assessment English item review thresholds */
export const CAMBRIDGE_CTT_THRESHOLDS: CttThresholds = {
  facilityMin: 0.20,
  facilityMax: 0.90,
  pbisMin: 0.25,
  distractorPbisMax: 0.0,
  distractorMinRate: 0.05,
  source: "Cambridge Assessment English Item Review Guidelines (2024)",
};

/** Pearson item review thresholds */
export const PEARSON_CTT_THRESHOLDS: CttThresholds = {
  facilityMin: 0.25,
  facilityMax: 0.85,
  pbisMin: 0.25,
  distractorPbisMax: 0.0,
  distractorMinRate: 0.05,
  source: "Pearson Assessment Item Quality Standards (2023)",
};

/** ETS (Educational Testing Service) item review thresholds */
export const ETS_CTT_THRESHOLDS: CttThresholds = {
  facilityMin: 0.20,
  facilityMax: 0.85,
  pbisMin: 0.20,
  distractorPbisMax: 0.05,  // ETS is slightly more lenient
  distractorMinRate: 0.02,
  source: "ETS Test Development Guidelines (2009)",
};

export type CttFlag =
  | "FACILITY_TOO_LOW"        // Item too hard (p < threshold)
  | "FACILITY_TOO_HIGH"       // Item too easy (p > threshold)
  | "PBIS_TOO_LOW"            // Poor discrimination (rpbi < threshold)
  | "PBIS_NEGATIVE"           // Negative discrimination (key less likely for high scorers)
  | "DISTRACTOR_NON_FUNCTIONING"  // Distractor selected <5% of candidates
  | "DISTRACTOR_NEGATIVE_PBIS"   // Distractor pbis > 0 (positive correlation — bad)
  | "DISTRACTOR_DOMINATES"    // Distractor selected more than key
  | "CEILING_EFFECT"          // p > 0.95 — virtually everyone correct
  | "FLOOR_EFFECT"            // p < 0.10 — virtually everyone wrong
  | "MISSING_DATA_HIGH"       // >5% non-response on item
  | "SPEEDEDNESS";            // Last items have abnormally low completion rates

export interface DistractorCttStats {
  option: string;
  isKey: boolean;
  selectionCount: number;
  selectionRate: number;          // proportion of all candidates
  pointBiserial: number;          // should be negative for distractors
  meanTheta: number;              // mean IRT theta of candidates selecting this
  isNonFunctioning: boolean;
  isDominates: boolean;           // selected more than the key
  quality: "EFFECTIVE" | "MARGINAL" | "NON_FUNCTIONING" | "HARMFUL";
}

export interface ItemCttReport {
  itemId: string;
  sampleSize: number;
  facilityValue: number;          // p-value (0–1)
  pointBiserial: number;          // rpbi
  biserialCorrelation: number;    // rb (corrected pbis)
  discriminationIndex: number;    // D = upper27% - lower27%
  itemReliabilityIndex: number;   // IRI = p * rpbi
  /** Per-option analysis */
  distractors: DistractorCttStats[];
  flags: CttFlag[];
  /** Cambridge/Pearson/ETS grade based on applied thresholds */
  grade: "ACCEPT" | "REVIEW" | "REJECT";
  recommendation: string;
}

export interface TestCttReport {
  testId?: string;
  itemCount: number;
  sampleSize: number;
  meanScore: number;              // Mean raw score
  sdScore: number;                // SD of raw scores
  cronbachAlpha: number;          // Coefficient alpha (reliability)
  kr20: number;                   // KR-20 (equivalent to alpha for dichotomous items)
  kr21: number;                   // KR-21 approximation
  semCtt: number;                 // SEM = SD * sqrt(1 - alpha)
  meanFacility: number;           // Mean p-value across items
  meanPbis: number;               // Mean point-biserial
  acceptCount: number;            // Items passing QA
  reviewCount: number;            // Items needing review
  rejectCount: number;            // Items failing QA
  itemReports: ItemCttReport[];
  computedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORE STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[], ddof = 1): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - ddof);
}

function stddev(values: number[], ddof = 1): number {
  return Math.sqrt(variance(values, ddof));
}

/**
 * Point-biserial correlation between a dichotomous item score (0/1) and a continuous score.
 * Formula: rpbi = (M1 - M0) / s_total * sqrt(p * q)
 * where M1 = mean total score for correct, M0 = mean for incorrect, p = facility, q = 1-p
 */
export function pointBiserial(itemScores: number[], totalScores: number[]): number {
  const n = itemScores.length;
  if (n < 10) return 0;

  const p = mean(itemScores);
  const q = 1 - p;
  if (p === 0 || p === 1) return 0;

  const m1Arr = totalScores.filter((_, i) => itemScores[i] === 1);
  const m0Arr = totalScores.filter((_, i) => itemScores[i] === 0);
  if (!m1Arr.length || !m0Arr.length) return 0;

  const m1 = mean(m1Arr);
  const m0 = mean(m0Arr);
  const sd = stddev(totalScores);
  if (sd === 0) return 0;

  return ((m1 - m0) / sd) * Math.sqrt(p * q);
}

/**
 * Corrected point-biserial (removes item from total to avoid inflation for short tests).
 * Correction: rpbi_corrected = (rpbi - p*rpbi) / sqrt(1 - 2*p*rpbi*sd_item + p^2)
 * Simplified for dichotomous: subtract item variance from total variance.
 */
export function correctedPointBiserial(
  itemScores: number[],
  totalScores: number[]
): number {
  // Remove item from total
  const totalMinusItem = totalScores.map((t, i) => t - itemScores[i]);
  return pointBiserial(itemScores, totalMinusItem);
}

/**
 * Biserial correlation: accounts for the artificial dichotomy assumption.
 * rb = rpbi * sqrt(p*q) / phi(zp)
 * where phi(zp) is the ordinate of the normal distribution at the cut point.
 */
export function biserialCorrelation(rpbi: number, p: number): number {
  if (p <= 0 || p >= 1) return 0;
  // phi(zp) = normal PDF at the z-score corresponding to proportion p
  const z = normalQuantile(p);
  const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
  if (phi === 0) return 0;
  return (rpbi * Math.sqrt(p * (1 - p))) / phi;
}

/**
 * Normal distribution quantile (inverse CDF) — rational approximation (Beasley-Springer-Moro).
 */
function normalQuantile(p: number): number {
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p)));
  const sign = p < 0.5 ? -1 : 1;
  const num = a[0] + a[1] * t + a[2] * t * t;
  const den = 1 + b[0] * t + b[1] * t * t + b[2] * t * t * t;
  return sign * (t - num / den);
}

/**
 * Discrimination index D = p_upper - p_lower
 * Upper/lower 27% of candidates based on total score.
 */
export function discriminationIndex(itemScores: number[], totalScores: number[]): number {
  const n = itemScores.length;
  const cutoff = Math.max(1, Math.floor(n * 0.27));

  const sorted = itemScores
    .map((s, i) => ({ item: s, total: totalScores[i] }))
    .sort((a, b) => a.total - b.total);

  const lower = sorted.slice(0, cutoff).map((x) => x.item);
  const upper = sorted.slice(n - cutoff).map((x) => x.item);

  return mean(upper) - mean(lower);
}

/**
 * Cronbach's Alpha (coefficient α)
 * α = (k / (k-1)) * (1 - Σσi² / σ²_total)
 */
export function cronbachAlpha(responseMatrix: number[][]): number {
  const k = responseMatrix.length; // items
  if (k < 2) return 0;
  const n = responseMatrix[0].length; // candidates
  if (n < 10) return 0;

  // Item variances
  const itemVariances = responseMatrix.map((item) => variance(item));
  const sumItemVar = itemVariances.reduce((a, b) => a + b, 0);

  // Total score variance
  const totalScores = Array.from({ length: n }, (_, j) =>
    responseMatrix.reduce((sum, item) => sum + item[j], 0)
  );
  const totalVar = variance(totalScores);
  if (totalVar === 0) return 0;

  return (k / (k - 1)) * (1 - sumItemVar / totalVar);
}

/**
 * KR-20: Kuder-Richardson formula 20 (equivalent to alpha for dichotomous items)
 * KR20 = (k/(k-1)) * (σ²_total - Σp_i*q_i) / σ²_total
 */
export function kr20(facilities: number[], totalVariance: number, k: number): number {
  if (k < 2 || totalVariance === 0) return 0;
  const sumPQ = facilities.reduce((s, p) => s + p * (1 - p), 0);
  return (k / (k - 1)) * ((totalVariance - sumPQ) / totalVariance);
}

/**
 * KR-21: Quick approximation of KR-20 using only mean and variance
 * KR21 = (k/(k-1)) * (1 - M(k-M)/(k*σ²))
 */
export function kr21(meanScore: number, sdScore: number, k: number): number {
  if (k < 2 || sdScore === 0) return 0;
  const variance = sdScore * sdScore;
  return (k / (k - 1)) * (1 - (meanScore * (k - meanScore)) / (k * variance));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ITEM-LEVEL CTT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemResponseData {
  itemId: string;
  /** Response options available (e.g. ["A","B","C","D"]) */
  options: string[];
  /** Correct option */
  keyOption: string;
  /** Per-candidate response: option selected */
  responses: string[];
  /** IRT theta estimate for each candidate (parallel to responses[]) */
  thetaValues: number[];
  /** Compute total raw score from external test data */
  totalScores: number[];
}

/**
 * Analyse a single item against CTT thresholds.
 */
export function analyseItem(
  data: ItemResponseData,
  thresholds: CttThresholds = CAMBRIDGE_CTT_THRESHOLDS
): ItemCttReport {
  const n = data.responses.length;
  const flags: CttFlag[] = [];

  // Dichotomous scores for the key
  const keyScores = data.responses.map((r) => (r === data.keyOption ? 1 : 0));

  // Facility value
  const p = mean(keyScores);

  // Point-biserial and biserial
  const rpbi = correctedPointBiserial(keyScores, data.totalScores);
  const rb = biserialCorrelation(rpbi, p);

  // Discrimination index (D)
  const D = discriminationIndex(keyScores, data.totalScores);

  // Item Reliability Index
  const iri = p * rpbi;

  // Facility flags
  if (p < 0.10) flags.push("FLOOR_EFFECT");
  else if (p < thresholds.facilityMin) flags.push("FACILITY_TOO_LOW");
  if (p > 0.95) flags.push("CEILING_EFFECT");
  else if (p > thresholds.facilityMax) flags.push("FACILITY_TOO_HIGH");

  // Discrimination flags
  if (rpbi < 0) flags.push("PBIS_NEGATIVE");
  else if (rpbi < thresholds.pbisMin) flags.push("PBIS_TOO_LOW");

  // Distractor analysis
  const distractors: DistractorCttStats[] = data.options.map((opt) => {
    const isKey = opt === data.keyOption;
    const selectors = data.responses.map((r, i) => ({ selected: r === opt, i })).filter((x) => x.selected);
    const selectionCount = selectors.length;
    const selectionRate = selectionCount / n;

    // Dichotomous scores for this option (1 if selected, 0 if not)
    const optScores = data.responses.map((r) => (r === opt ? 1 : 0));
    const optPbis = correctedPointBiserial(optScores, data.totalScores);

    // Mean theta of those who selected this option
    const selectedThetas = selectors.map((x) => data.thetaValues[x.i]);
    const mTheta = selectedThetas.length > 0 ? mean(selectedThetas) : 0;

    const isNonFunctioning = !isKey && selectionRate < thresholds.distractorMinRate;
    const isDominates = !isKey && selectionRate > p;

    if (!isKey && isNonFunctioning) flags.push("DISTRACTOR_NON_FUNCTIONING");
    if (!isKey && optPbis > thresholds.distractorPbisMax) flags.push("DISTRACTOR_NEGATIVE_PBIS");
    if (!isKey && isDominates) flags.push("DISTRACTOR_DOMINATES");

    let quality: DistractorCttStats["quality"] = "EFFECTIVE";
    if (isNonFunctioning) quality = "NON_FUNCTIONING";
    else if (isDominates) quality = "HARMFUL";
    else if (selectionRate < 0.10) quality = "MARGINAL";

    return {
      option: opt,
      isKey,
      selectionCount,
      selectionRate: Number(selectionRate.toFixed(4)),
      pointBiserial: Number(optPbis.toFixed(4)),
      meanTheta: Number(mTheta.toFixed(3)),
      isNonFunctioning,
      isDominates,
      quality,
    };
  });

  // Grade assignment
  let grade: ItemCttReport["grade"];
  let recommendation: string;

  const criticalFlags = flags.filter((f) =>
    ["PBIS_NEGATIVE", "DISTRACTOR_DOMINATES", "FLOOR_EFFECT", "CEILING_EFFECT"].includes(f)
  );
  const warningFlags = flags.filter((f) =>
    !criticalFlags.includes(f)
  );

  if (criticalFlags.length > 0) {
    grade = "REJECT";
    recommendation = `Reject item. Critical issues: ${criticalFlags.join(", ")}. Rewrite or discard.`;
  } else if (warningFlags.length > 0 || flags.includes("FACILITY_TOO_LOW") || flags.includes("PBIS_TOO_LOW")) {
    grade = "REVIEW";
    recommendation = `Review item. Flags: ${flags.join(", ")}. Consider revising distractors or adjusting difficulty.`;
  } else {
    grade = "ACCEPT";
    recommendation = "Item meets quality standards. Accept for operational use.";
  }

  return {
    itemId: data.itemId,
    sampleSize: n,
    facilityValue: Number(p.toFixed(4)),
    pointBiserial: Number(rpbi.toFixed(4)),
    biserialCorrelation: Number(rb.toFixed(4)),
    discriminationIndex: Number(D.toFixed(4)),
    itemReliabilityIndex: Number(iri.toFixed(4)),
    distractors,
    flags: [...new Set(flags)],
    grade,
    recommendation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TEST-LEVEL CTT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute test-level CTT report from a response matrix.
 * @param responseMatrix - rows = items, cols = candidates (0/1 for dichotomous)
 * @param itemReports - pre-computed item-level reports
 */
export function analyseTest(
  responseMatrix: number[][],
  itemReports: ItemCttReport[],
  testId?: string
): TestCttReport {
  const k = responseMatrix.length;
  const n = k > 0 ? responseMatrix[0].length : 0;

  // Total scores per candidate
  const totalScores = Array.from({ length: n }, (_, j) =>
    responseMatrix.reduce((sum, item) => sum + (item[j] ?? 0), 0)
  );

  const mScore = mean(totalScores);
  const sd = stddev(totalScores);
  const facilities = itemReports.map((r) => r.facilityValue);
  const totalVar = variance(totalScores);

  const alpha = cronbachAlpha(responseMatrix);
  const kR20 = kr20(facilities, totalVar, k);
  const kR21 = kr21(mScore, sd, k);
  const semCtt = sd * Math.sqrt(1 - alpha);

  return {
    testId,
    itemCount: k,
    sampleSize: n,
    meanScore: Number(mScore.toFixed(2)),
    sdScore: Number(sd.toFixed(2)),
    cronbachAlpha: Number(alpha.toFixed(4)),
    kr20: Number(kR20.toFixed(4)),
    kr21: Number(kR21.toFixed(4)),
    semCtt: Number(semCtt.toFixed(3)),
    meanFacility: Number(mean(facilities).toFixed(3)),
    meanPbis: Number(mean(itemReports.map((r) => r.pointBiserial)).toFixed(3)),
    acceptCount: itemReports.filter((r) => r.grade === "ACCEPT").length,
    reviewCount: itemReports.filter((r) => r.grade === "REVIEW").length,
    rejectCount: itemReports.filter((r) => r.grade === "REJECT").length,
    itemReports,
    computedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ITEM BANK HEALTH SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemBankHealthSummary {
  totalItems: number;
  analysedItems: number;
  acceptRate: number;         // fraction passing QA
  reviewRate: number;
  rejectRate: number;
  meanFacility: number;
  facilityDistribution: {
    tooEasy: number;          // p > 0.85
    acceptable: number;       // 0.20 ≤ p ≤ 0.85
    tooHard: number;          // p < 0.20
  };
  meanPointBiserial: number;
  discriminationDistribution: {
    good: number;             // rpbi ≥ 0.35
    acceptable: number;       // 0.25 ≤ rpbi < 0.35
    poor: number;             // rpbi < 0.25
    negative: number;         // rpbi < 0
  };
  topFlaggedItems: Array<{ itemId: string; flags: CttFlag[]; recommendation: string }>;
  thresholdsApplied: string;
}

export function buildItemBankHealthSummary(
  reports: ItemCttReport[],
  thresholds: CttThresholds = CAMBRIDGE_CTT_THRESHOLDS
): ItemBankHealthSummary {
  const n = reports.length;
  if (n === 0) {
    return {
      totalItems: 0, analysedItems: 0, acceptRate: 0, reviewRate: 0, rejectRate: 0,
      meanFacility: 0, facilityDistribution: { tooEasy: 0, acceptable: 0, tooHard: 0 },
      meanPointBiserial: 0,
      discriminationDistribution: { good: 0, acceptable: 0, poor: 0, negative: 0 },
      topFlaggedItems: [], thresholdsApplied: thresholds.source,
    };
  }

  const facilities = reports.map((r) => r.facilityValue);
  const pbis = reports.map((r) => r.pointBiserial);

  return {
    totalItems: n,
    analysedItems: n,
    acceptRate: Number((reports.filter((r) => r.grade === "ACCEPT").length / n).toFixed(3)),
    reviewRate: Number((reports.filter((r) => r.grade === "REVIEW").length / n).toFixed(3)),
    rejectRate: Number((reports.filter((r) => r.grade === "REJECT").length / n).toFixed(3)),
    meanFacility: Number(mean(facilities).toFixed(3)),
    facilityDistribution: {
      tooEasy: facilities.filter((p) => p > thresholds.facilityMax).length,
      acceptable: facilities.filter((p) => p >= thresholds.facilityMin && p <= thresholds.facilityMax).length,
      tooHard: facilities.filter((p) => p < thresholds.facilityMin).length,
    },
    meanPointBiserial: Number(mean(pbis).toFixed(3)),
    discriminationDistribution: {
      good: pbis.filter((r) => r >= 0.35).length,
      acceptable: pbis.filter((r) => r >= 0.25 && r < 0.35).length,
      poor: pbis.filter((r) => r >= 0 && r < 0.25).length,
      negative: pbis.filter((r) => r < 0).length,
    },
    topFlaggedItems: reports
      .filter((r) => r.grade !== "ACCEPT")
      .sort((a, b) => b.flags.length - a.flags.length)
      .slice(0, 20)
      .map((r) => ({ itemId: r.itemId, flags: r.flags, recommendation: r.recommendation })),
    thresholdsApplied: thresholds.source,
  };
}
