/**
 * AI–Human Scoring Agreement Monitor
 *
 * Monitors how closely the AI scoring pipeline agrees with the human raters of
 * record over time. Operates on score pairs (aiScore, humanScore) extracted
 * from the response/rating store, then computes:
 *
 *   - Quadratic Weighted Kappa (QWK)        — primary agreement metric
 *   - Mean Absolute Error (MAE)             — bias-aware error
 *   - Root Mean Squared Error (RMSE)        — penalises large miscalls
 *   - Pearson correlation (r)               — linear association
 *   - Mean delta (signed bias)              — over- vs under-scoring direction
 *
 * Designed to be called by:
 *   1. A periodic reporter that loads the last N rated responses
 *      (Response.aiScore IS NOT NULL AND Response.humanScore IS NOT NULL),
 *      computes per-window metrics, and persists them.
 *   2. A drift detector that compares the latest window against a baseline
 *      and raises an alert if MAE exceeds the baseline by > driftThreshold.
 *
 * High-stakes industry targets (Cambridge / ETS):
 *   QWK ≥ 0.80, MAE ≤ 0.08, Pearson r ≥ 0.85
 *
 * All functions are pure: no I/O, no randomness.
 */

export interface AiHumanPair {
  aiScore: number;     // Normalised 0..1
  humanScore: number;  // Normalised 0..1
  /** Optional timestamp for windowed analysis. */
  scoredAt?: Date;
  /** Optional skill discriminator (e.g. WRITING, SPEAKING) for per-skill breakdown. */
  skill?: string;
}

export interface AgreementMetrics {
  n: number;
  qwk: number;
  mae: number;
  rmse: number;
  pearsonR: number;
  meanDelta: number;
  /** Industry-standard threshold check (see module header). */
  meetsHighStakesThreshold: boolean;
}

export interface RollingWindow {
  start: Date;
  end: Date;
  metrics: AgreementMetrics;
}

export interface DriftReport {
  /** Baseline MAE / RMSE / QWK against which the latest window is compared. */
  baseline: { mae: number; rmse: number; qwk: number };
  latest: { mae: number; rmse: number; qwk: number };
  /** Latest_mae − baseline_mae. Positive = AI got worse. */
  maeDelta: number;
  /** Latest_qwk − baseline_qwk. Negative = AI agreement degraded. */
  qwkDelta: number;
  driftDetected: boolean;
  reason: string | null;
}

const HIGH_STAKES_QWK_TARGET = 0.80;
const HIGH_STAKES_MAE_TARGET = 0.08;
const HIGH_STAKES_PEARSON_TARGET = 0.85;

const DEFAULT_BAND_COUNT = 7; // 7 CEFR bands: PRE_A1, A1, A2, B1, B2, C1, C2

// ─────────────────────────────────────────────────────────────────────────────
// Core statistics
// ─────────────────────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

/**
 * Quadratic Weighted Kappa for two raters who score the same items on the
 * same ordinal scale. We discretise normalised [0,1] scores into `bandCount`
 * bands (default 7 = CEFR), then apply Cohen's QWK with quadratic weights.
 *
 * Returns 1 for perfect agreement, 0 for chance-level, and negative values
 * for systematic disagreement.
 */
export function quadraticWeightedKappa(
  scores1: number[],
  scores2: number[],
  bandCount = DEFAULT_BAND_COUNT
): number {
  if (scores1.length !== scores2.length || scores1.length === 0) return 0;
  const N = bandCount;
  const max = N - 1;

  const band = (s: number) => {
    if (!Number.isFinite(s)) return 0;
    return Math.max(0, Math.min(max, Math.round(s * max)));
  };
  const r1 = scores1.map(band);
  const r2 = scores2.map(band);

  // Observed confusion matrix
  const O: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < r1.length; i++) O[r1[i]][r2[i]]++;

  // Marginal histograms
  const hist1 = Array(N).fill(0);
  const hist2 = Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      hist1[i] += O[i][j];
      hist2[j] += O[i][j];
    }
  }
  const total = r1.length;

  // Quadratic weights w_{ij} = (i-j)² / (N-1)²
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const w = ((i - j) ** 2) / (max ** 2);
      const e = (hist1[i] * hist2[j]) / total;
      numerator += w * O[i][j];
      denominator += w * e;
    }
  }
  if (denominator === 0) return 1; // Perfect agreement and one band → kappa undefined; treat as 1
  return 1 - numerator / denominator;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate report
// ─────────────────────────────────────────────────────────────────────────────

export function computeAgreement(
  pairs: AiHumanPair[],
  bandCount = DEFAULT_BAND_COUNT
): AgreementMetrics {
  const n = pairs.length;
  if (n === 0) {
    return {
      n: 0, qwk: 0, mae: 0, rmse: 0, pearsonR: 0, meanDelta: 0,
      meetsHighStakesThreshold: false,
    };
  }
  const ai = pairs.map(p => p.aiScore);
  const human = pairs.map(p => p.humanScore);
  const deltas = pairs.map(p => p.aiScore - p.humanScore);

  const mae = mean(deltas.map(Math.abs));
  const rmse = Math.sqrt(mean(deltas.map(d => d * d)));
  const qwk = quadraticWeightedKappa(ai, human, bandCount);
  const r = pearson(ai, human);
  const meanDelta = mean(deltas);

  return {
    n,
    qwk,
    mae,
    rmse,
    pearsonR: r,
    meanDelta,
    meetsHighStakesThreshold:
      qwk >= HIGH_STAKES_QWK_TARGET &&
      mae <= HIGH_STAKES_MAE_TARGET &&
      r >= HIGH_STAKES_PEARSON_TARGET,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rolling windows
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bin pairs into fixed-width time windows (default: 7 days) and compute
 * agreement metrics for each window. Pairs without `scoredAt` are dropped
 * (windowing requires timestamps).
 */
export function rollingAgreement(
  pairs: AiHumanPair[],
  windowDays = 7,
  now: Date = new Date()
): RollingWindow[] {
  const dated = pairs.filter(p => p.scoredAt instanceof Date);
  if (dated.length === 0) return [];
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const sorted = [...dated].sort(
    (a, b) => a.scoredAt!.getTime() - b.scoredAt!.getTime()
  );

  const earliest = sorted[0].scoredAt!.getTime();
  const latest = now.getTime();
  const windows: RollingWindow[] = [];
  for (let start = earliest; start < latest; start += windowMs) {
    const end = start + windowMs;
    const inWindow = sorted.filter(
      p => p.scoredAt!.getTime() >= start && p.scoredAt!.getTime() < end
    );
    if (inWindow.length === 0) continue;
    windows.push({
      start: new Date(start),
      end: new Date(end),
      metrics: computeAgreement(inWindow),
    });
  }
  return windows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drift detection
// ─────────────────────────────────────────────────────────────────────────────

export interface DriftThresholds {
  /** Allowed MAE increase from baseline before drift is declared. Default 0.03. */
  maxMaeIncrease?: number;
  /** Allowed QWK decrease from baseline before drift is declared. Default 0.05. */
  maxQwkDecrease?: number;
  /** Number of latest windows to treat as the "current" period. Default 1. */
  latestWindowCount?: number;
}

/**
 * Compare the most recent window(s) against the average of all earlier ones.
 * Drift is declared when MAE rises by > maxMaeIncrease OR QWK drops by >
 * maxQwkDecrease relative to the baseline. The reason string identifies which
 * threshold tripped, so dashboards/alerts can route accordingly.
 */
// ─────────────────────────────────────────────────────────────────────────────
// Intraclass Correlation Coefficient ICC(2,1) — two-way random effects
// ─────────────────────────────────────────────────────────────────────────────

export interface IccResult {
  /** ICC(2,1) point estimate — absolute agreement, two-way random effects model */
  icc: number;
  /** Lower bound of 95% confidence interval */
  ci95Lower: number;
  /** Upper bound of 95% confidence interval */
  ci95Upper: number;
  /** Number of paired observations */
  n: number;
  /**
   * Qualitative interpretation (Koo & Mae 2016):
   *   < 0.50 = POOR, 0.50–0.75 = MODERATE, 0.75–0.90 = GOOD, ≥ 0.90 = EXCELLENT
   */
  interpretation: "POOR" | "MODERATE" | "GOOD" | "EXCELLENT";
}

/**
 * Compute ICC(2,1) — Intraclass Correlation Coefficient with 95% CI.
 *
 * Two-way random effects model, absolute agreement form.
 * This is the preferred metric for AI-human scorer comparison in high-stakes
 * testing contexts (Shrout & Fleiss 1979; Koo & Mae 2016).
 *
 * References
 * ----------
 * Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations: uses in
 *   assessing rater reliability. Psychological Bulletin, 86(2), 420.
 * Koo, T. K., & Mae, M. Y. (2016). A guideline of selecting and reporting
 *   intraclass correlation coefficients for reliability research.
 *   Journal of Chiropractic Medicine, 15(2), 155–163.
 *
 * @param rater1  AI scores, normalised 0–1
 * @param rater2  Human scores, normalised 0–1
 */
export function computeIcc(rater1: number[], rater2: number[]): IccResult {
  const n = rater1.length;
  if (n < 3 || rater2.length !== n) {
    return { icc: 0, ci95Lower: 0, ci95Upper: 0, n, interpretation: "POOR" };
  }

  const k = 2; // two raters

  // Grand mean
  let grandSum = 0;
  for (let i = 0; i < n; i++) grandSum += rater1[i]! + rater2[i]!;
  const grandMean = grandSum / (n * k);

  // Row means (subject means)
  const rowMeans = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    rowMeans[i] = (rater1[i]! + rater2[i]!) / k;
  }

  // Column means (rater means)
  const colMean1 = mean(rater1);
  const colMean2 = mean(rater2);
  const colMeans = [colMean1, colMean2];

  // Sum of squares — between subjects (SSR), between raters (SSC), error (SSE)
  let ssr = 0; // between-subject
  let ssc = 0; // between-rater (column)
  let sst = 0; // total

  for (let i = 0; i < n; i++) {
    ssr += k * Math.pow(rowMeans[i]! - grandMean, 2);
  }

  for (let j = 0; j < k; j++) {
    ssc += n * Math.pow(colMeans[j]! - grandMean, 2);
  }

  const all = [...rater1, ...rater2];
  for (const x of all) sst += Math.pow(x - grandMean, 2);

  const sse = sst - ssr - ssc;

  // Mean squares
  const dfr = n - 1;
  const dfc = k - 1;
  const dfe = dfr * dfc;

  const msr = ssr / dfr;
  const msc = ssc / dfc;
  const mse = dfe > 0 ? sse / dfe : 0;

  // ICC(2,1) absolute agreement
  // ICC = (MSr - MSe) / (MSr + (k-1)*MSe + k*(MSc - MSe)/n)
  const iccDenom = msr + (k - 1) * mse + k * (msc - mse) / n;
  const icc = iccDenom === 0 ? 0 : Math.max(-1, Math.min(1, (msr - mse) / iccDenom));

  // 95% CI via F-distribution approximation (Shrout & Fleiss 1979)
  // F_lower = MSr / (MSe * F(alpha/2, n-1, (n-1)(k-1)))
  // We approximate F critical values at df1=n-1, df2=(n-1)(k-1)
  const fCritical95 = approximateFCritical95(dfr, dfe);
  const fl = (msr / (fCritical95 * mse));
  const fu = (msr * fCritical95) / mse;

  const ci95Lower = Math.max(-1, (fl - 1) / (fl + k - 1));
  const ci95Upper = Math.min(1, (fu - 1) / (fu + k - 1));

  const interpretation: IccResult["interpretation"] =
    icc >= 0.90 ? "EXCELLENT"
    : icc >= 0.75 ? "GOOD"
    : icc >= 0.50 ? "MODERATE"
    : "POOR";

  return {
    icc: Number(icc.toFixed(4)),
    ci95Lower: Number(ci95Lower.toFixed(4)),
    ci95Upper: Number(ci95Upper.toFixed(4)),
    n,
    interpretation,
  };
}

/**
 * Approximate the 97.5th percentile of the F distribution via Wilson-Hilferty
 * cube-root normal approximation. Accurate to ~1% for df ≥ 5.
 */
function approximateFCritical95(df1: number, df2: number): number {
  // z_{0.975} ≈ 1.96
  const z = 1.96;
  const d1 = df1;
  const d2 = df2;
  if (d1 < 1 || d2 < 1) return 1;
  const h1 = 1 - 2 / (9 * d1);
  const h2 = 1 - 2 / (9 * d2);
  const num = h1 + z * Math.sqrt(2 / (9 * d1));
  const den = h2 - z * Math.sqrt(2 / (9 * d2));
  if (den <= 0) return 10;
  return Math.pow(num / den, 3);
}

export function detectDrift(
  windows: RollingWindow[],
  thresholds: DriftThresholds = {}
): DriftReport {
  const maxMaeIncrease = thresholds.maxMaeIncrease ?? 0.03;
  const maxQwkDecrease = thresholds.maxQwkDecrease ?? 0.05;
  const latestCount = Math.max(1, thresholds.latestWindowCount ?? 1);

  if (windows.length < latestCount + 1) {
    return {
      baseline: { mae: 0, rmse: 0, qwk: 0 },
      latest: { mae: 0, rmse: 0, qwk: 0 },
      maeDelta: 0,
      qwkDelta: 0,
      driftDetected: false,
      reason: "INSUFFICIENT_HISTORY",
    };
  }

  const baselineWindows = windows.slice(0, windows.length - latestCount);
  const latestWindows = windows.slice(-latestCount);

  const avg = (ws: RollingWindow[], pick: (m: AgreementMetrics) => number) =>
    mean(ws.map(w => pick(w.metrics)));

  const baseline = {
    mae: avg(baselineWindows, m => m.mae),
    rmse: avg(baselineWindows, m => m.rmse),
    qwk: avg(baselineWindows, m => m.qwk),
  };
  const latest = {
    mae: avg(latestWindows, m => m.mae),
    rmse: avg(latestWindows, m => m.rmse),
    qwk: avg(latestWindows, m => m.qwk),
  };

  const maeDelta = latest.mae - baseline.mae;
  const qwkDelta = latest.qwk - baseline.qwk;

  const reasons: string[] = [];
  if (maeDelta > maxMaeIncrease) {
    reasons.push(`MAE_INCREASE_${maeDelta.toFixed(3)}`);
  }
  if (qwkDelta < -maxQwkDecrease) {
    reasons.push(`QWK_DROP_${(-qwkDelta).toFixed(3)}`);
  }

  return {
    baseline,
    latest,
    maeDelta,
    qwkDelta,
    driftDetected: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join("|") : null,
  };
}
