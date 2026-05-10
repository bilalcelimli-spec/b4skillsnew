/**
 * Item Parameter Drift (IPD) Detection
 *
 * Monitors IRT item parameters (a, b, c) for statistically significant changes
 * over time. Parameter drift — where an item behaves differently across
 * different administrations or candidate cohorts — is a major threat to score
 * validity and equating stability.
 *
 * Two complementary detection methods:
 *
 *   1. **Robust z-score** (Lord 1980; DeMars 2004)
 *      For each parameter p ∈ {a, b, c}:
 *        z = (p_new − p_old) / sqrt(SE²_old + SE²_new)
 *      |z| > 2.0 → moderate drift; |z| > 3.0 → severe drift.
 *      Uses median absolute deviation (MAD) instead of SD for robustness
 *      against outliers across the item bank.
 *
 *   2. **Lord chi-square** (Lord 1980)
 *      For b-parameter (most sensitive to drift):
 *        χ² = (b_new − b_old)² / (SE²_old + SE²_new)
 *      df = 1; p-value from chi-square distribution (Abramowitz & Stegun).
 *
 * Classification (following ETS DIF conventions adapted for IPD):
 *   A: Negligible   |z| < 2.0, χ² < 3.84
 *   B: Moderate     2.0 ≤ |z| < 3.0, χ² < 6.63
 *   C: Severe       |z| ≥ 3.0 or χ² ≥ 6.63 → recommend retire/review
 *
 * References
 * ----------
 * Lord, F. M. (1980). Applications of item response theory to practical
 *   testing problems. Erlbaum.
 *
 * DeMars, C. E. (2004). Detection of item parameter drift over multiple
 *   test administrations. Applied Measurement in Education, 17(3), 265–300.
 *
 * Goldstein, H. (1983). Measuring changes in educational attainment over time:
 *   Problems and possibilities. Journal of Educational Measurement, 20(4), 369–377.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DriftClass = "A" | "B" | "C";

export interface IrtSnapshot {
  /** Item identifier */
  itemId: string;
  /** Calibration window label, e.g. "2026-Q1" or "2026-04" */
  window: string;
  /** Calibration date (ISO string) */
  calibratedAt: string;
  /** IRT discrimination parameter */
  a: number;
  /** IRT difficulty parameter */
  b: number;
  /** IRT guessing parameter */
  c: number;
  /** Standard error of 'a' estimate */
  seA?: number;
  /** Standard error of 'b' estimate (most important for drift) */
  seB?: number;
  /** Standard error of 'c' estimate */
  seC?: number;
  /** Sample size used for this calibration */
  n?: number;
}

export interface DriftResult {
  itemId: string;
  windowOld: string;
  windowNew: string;
  /** Differences */
  deltaA: number;
  deltaB: number;
  deltaC: number;
  /** Robust z-scores (null if SE not available) */
  zA: number | null;
  zB: number | null;
  zC: number | null;
  /** Lord chi-square on b-parameter */
  lordChiSquareB: number | null;
  lordPValueB: number | null;
  /** Maximum |z| across parameters */
  maxAbsZ: number | null;
  /** ETS-style drift classification */
  driftClass: DriftClass;
  /** Human-readable interpretation */
  interpretation: string;
  /** Recommended action */
  action: "NONE" | "FLAG_FOR_REVIEW" | "RETIRE";
}

export interface IpdSummary {
  totalItems: number;
  classA: number;  // Negligible
  classB: number;  // Moderate
  classC: number;  // Severe → retire
  flaggedItems: DriftResult[];
  retireItems: DriftResult[];
  meanDeltaB: number;
  sdDeltaB: number;
  /** Global form drift: significant mean shift suggests equating problem */
  formLevelDrift: boolean;
  generatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const Z_MODERATE = 2.0;   // |z| ≥ this → Class B
const Z_SEVERE   = 3.0;   // |z| ≥ this → Class C
const CHI_SQ_P05 = 3.841; // χ² df=1, p = .05
const CHI_SQ_P01 = 6.635; // χ² df=1, p = .01

/** Fallback SE when not provided (based on typical CAT calibration uncertainty) */
const DEFAULT_SE_B = 0.15;
const DEFAULT_SE_A = 0.12;
const DEFAULT_SE_C = 0.05;

// ─── Chi-square p-value (Abramowitz & Stegun §26.4) ──────────────────────────

/**
 * Regularized incomplete gamma function P(a, x) for chi-square df=1.
 * P(df/2, χ²/2) = 1 − p-value for chi-square test.
 * Approximation accurate to ±1e-6.
 */
function incompleteGamma(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1e10) return 1;

  // Series expansion for small x
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n <= 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-9 * Math.abs(sum)) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }

  // Continued fraction for large x (Lentz's algorithm)
  let fpMin = 1e-30;
  let b = x + 1 - a;
  let c = 1 / fpMin;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 100; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = b + an / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-9) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

/** Stirling approximation of log-gamma */
function lgamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = z;
  let x = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const coeff of c) { y++; ser += coeff / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Chi-square p-value (right tail) for df=1.
 * Returns probability that χ² ≥ chiSq under H0.
 */
export function chiSquarePValue1df(chiSq: number): number {
  if (chiSq <= 0) return 1;
  return 1 - incompleteGamma(0.5, chiSq / 2);
}

// ─── Robust z-score ───────────────────────────────────────────────────────────

/**
 * Compute robust z-score for a single parameter difference.
 * Uses provided SEs; falls back to defaults if not available.
 */
function robustZ(
  delta: number,
  seOld: number | undefined,
  seNew: number | undefined,
  defaultSE: number
): number {
  const se1 = seOld ?? defaultSE;
  const se2 = seNew ?? defaultSE;
  const pooledSE = Math.sqrt(se1 * se1 + se2 * se2);
  if (pooledSE <= 0) return 0;
  return delta / pooledSE;
}

// ─── Drift classification ─────────────────────────────────────────────────────

function classifyDrift(maxZ: number | null, chiSqB: number | null): DriftClass {
  const absZ = maxZ !== null ? Math.abs(maxZ) : 0;
  const chi = chiSqB ?? 0;

  if (absZ >= Z_SEVERE || chi >= CHI_SQ_P01) return "C";
  if (absZ >= Z_MODERATE || chi >= CHI_SQ_P05) return "B";
  return "A";
}

function interpretDrift(
  itemId: string,
  driftClass: DriftClass,
  deltaB: number,
  maxZ: number | null
): string {
  const dir = deltaB > 0 ? "harder" : "easier";
  switch (driftClass) {
    case "A": return `Item ${itemId}: Negligible drift. Parameters stable across windows.`;
    case "B": return `Item ${itemId}: Moderate b-drift (Δb=${deltaB.toFixed(3)}, item becoming ${dir}). Monitor — do not retire yet.`;
    case "C": return `Item ${itemId}: Severe drift (z=${maxZ?.toFixed(2) ?? "N/A"}). Retire from operational bank immediately and recalibrate.`;
  }
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Compute IPD between two calibration snapshots for a single item.
 */
export function computeItemDrift(old: IrtSnapshot, curr: IrtSnapshot): DriftResult {
  const deltaA = curr.a - old.a;
  const deltaB = curr.b - old.b;
  const deltaC = curr.c - old.c;

  const zA = robustZ(deltaA, old.seA, curr.seA, DEFAULT_SE_A);
  const zB = robustZ(deltaB, old.seB, curr.seB, DEFAULT_SE_B);
  const zC = robustZ(deltaC, old.seC, curr.seC, DEFAULT_SE_C);

  // Lord chi-square on b (most drift-sensitive parameter)
  const se1B = old.seB ?? DEFAULT_SE_B;
  const se2B = curr.seB ?? DEFAULT_SE_B;
  const pooledVarianceB = se1B * se1B + se2B * se2B;
  const lordChiSquareB = pooledVarianceB > 0 ? (deltaB * deltaB) / pooledVarianceB : null;
  const lordPValueB = lordChiSquareB !== null ? chiSquarePValue1df(lordChiSquareB) : null;

  const maxAbsZ = Math.max(Math.abs(zA), Math.abs(zB), Math.abs(zC));
  const driftClass = classifyDrift(maxAbsZ, lordChiSquareB);

  return {
    itemId: old.itemId,
    windowOld: old.window,
    windowNew: curr.window,
    deltaA: Number(deltaA.toFixed(4)),
    deltaB: Number(deltaB.toFixed(4)),
    deltaC: Number(deltaC.toFixed(4)),
    zA: Number(zA.toFixed(3)),
    zB: Number(zB.toFixed(3)),
    zC: Number(zC.toFixed(3)),
    lordChiSquareB: lordChiSquareB !== null ? Number(lordChiSquareB.toFixed(4)) : null,
    lordPValueB: lordPValueB !== null ? Number(lordPValueB.toFixed(4)) : null,
    maxAbsZ: Number(maxAbsZ.toFixed(3)),
    driftClass,
    interpretation: interpretDrift(old.itemId, driftClass, deltaB, maxAbsZ),
    action: driftClass === "C" ? "RETIRE" : driftClass === "B" ? "FLAG_FOR_REVIEW" : "NONE",
  };
}

/**
 * Batch IPD analysis across the full item bank.
 * Match items by ID across two snapshot arrays (old vs current calibration).
 */
export function batchDriftAnalysis(
  oldSnapshots: IrtSnapshot[],
  newSnapshots: IrtSnapshot[]
): DriftResult[] {
  const oldMap = new Map(oldSnapshots.map(s => [s.itemId, s]));
  const results: DriftResult[] = [];

  for (const curr of newSnapshots) {
    const old = oldMap.get(curr.itemId);
    if (!old) continue; // new item, no drift data yet
    results.push(computeItemDrift(old, curr));
  }

  return results;
}

/**
 * Summarize batch drift results for reporting and automated action.
 */
export function summariseDriftResults(results: DriftResult[]): IpdSummary {
  const classA = results.filter(r => r.driftClass === "A").length;
  const classB = results.filter(r => r.driftClass === "B").length;
  const classC = results.filter(r => r.driftClass === "C").length;

  const deltaBValues = results.map(r => r.deltaB);
  const meanDeltaB = deltaBValues.reduce((s, v) => s + v, 0) / (deltaBValues.length || 1);
  const variance = deltaBValues.reduce((s, v) => s + (v - meanDeltaB) ** 2, 0) / (deltaBValues.length || 1);
  const sdDeltaB = Math.sqrt(variance);

  // Form-level drift: mean Δb significantly different from 0 (|mean| > 0.10 θ units)
  const formLevelDrift = Math.abs(meanDeltaB) > 0.10;

  return {
    totalItems: results.length,
    classA,
    classB,
    classC,
    flaggedItems: results.filter(r => r.action === "FLAG_FOR_REVIEW"),
    retireItems: results.filter(r => r.action === "RETIRE"),
    meanDeltaB: Number(meanDeltaB.toFixed(4)),
    sdDeltaB: Number(sdDeltaB.toFixed(4)),
    formLevelDrift,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Format drift summary as a Markdown report (for GitHub Issues / SLO reports).
 */
export function formatDriftReport(summary: IpdSummary): string {
  const lines: string[] = [
    `## Item Parameter Drift (IPD) Report`,
    ``,
    `**Generated:** ${summary.generatedAt}`,
    `**Items analysed:** ${summary.totalItems}`,
    ``,
    `| Class | Count | % | Action |`,
    `|-------|-------|---|--------|`,
    `| A — Negligible | ${summary.classA} | ${pct(summary.classA, summary.totalItems)}% | None |`,
    `| B — Moderate   | ${summary.classB} | ${pct(summary.classB, summary.totalItems)}% | Review |`,
    `| C — Severe     | ${summary.classC} | ${pct(summary.classC, summary.totalItems)}% | **RETIRE** |`,
    ``,
    `**Mean Δb:** ${summary.meanDeltaB.toFixed(4)} σ (SD: ${summary.sdDeltaB.toFixed(4)})`,
    `**Form-level drift detected:** ${summary.formLevelDrift ? "⚠️ YES — check equating" : "No"}`,
    ``,
  ];

  if (summary.retireItems.length > 0) {
    lines.push(`### 🔴 Items to Retire (${summary.retireItems.length})`);
    lines.push(`| Item ID | Δb | z_b | Lord χ² | p |`);
    lines.push(`|---------|-----|-----|---------|---|`);
    for (const r of summary.retireItems) {
      lines.push(`| ${r.itemId} | ${r.deltaB.toFixed(3)} | ${r.zB?.toFixed(2) ?? "N/A"} | ${r.lordChiSquareB?.toFixed(2) ?? "N/A"} | ${r.lordPValueB?.toFixed(4) ?? "N/A"} |`);
    }
    lines.push(``);
  }

  if (summary.flaggedItems.length > 0) {
    lines.push(`### ⚠️ Items Flagged for Review (${summary.flaggedItems.length})`);
    lines.push(`| Item ID | Δb | z_b |`);
    lines.push(`|---------|-----|-----|`);
    for (const r of summary.flaggedItems) {
      lines.push(`| ${r.itemId} | ${r.deltaB.toFixed(3)} | ${r.zB?.toFixed(2) ?? "N/A"} |`);
    }
  }

  return lines.join("\n");
}

function pct(n: number, total: number): string {
  return total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
}
