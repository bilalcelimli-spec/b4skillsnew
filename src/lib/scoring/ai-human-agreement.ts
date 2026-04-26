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
