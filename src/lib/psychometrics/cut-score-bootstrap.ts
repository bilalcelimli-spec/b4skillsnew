/**
 * Cut-Score Bootstrap Confidence Intervals
 *
 * Provides bias-corrected accelerated (BCa) bootstrap confidence intervals for
 * Angoff-derived CEFR cut scores before the full panel study is complete, and
 * for updating them after each annual re-study.
 *
 * The approach:
 *  1. Each panelist submits a set of probability estimates {p_ij} for items
 *     at a given boundary.
 *  2. The cut score θ* is the IRT ability level at which the expected sum of
 *     probabilities equals the Angoff raw cut (∑ p̄_i).
 *  3. Bootstrap resamples panelists WITH replacement and recomputes θ* for each
 *     replicate, yielding an empirical sampling distribution.
 *  4. BCa correction accounts for bootstrap bias and skewness (Efron 1987).
 *
 * References:
 *   Angoff, W.H. (1971). In R.L. Thorndike (Ed.), Educational Measurement (2nd ed.)
 *   Efron, B. (1987). Better bootstrap confidence intervals. JASA, 82(397), 171-185.
 *   Hambleton & Pitoniak (2006). Setting performance standards. In Educational
 *     Measurement (4th ed., pp. 433-470).
 */

import { probability } from "../assessment-engine/irt.js";
import type { IrtParameters } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** One panelist's probability estimates for each anchor item at a boundary. */
export interface PanelistRatings {
  panelistId: string;
  /** Map itemId → estimated probability (0–1) */
  ratings: Record<string, number>;
}

/** Result of a bootstrap CI computation for one CEFR boundary. */
export interface CutScoreBootstrapResult {
  boundary: string;          // e.g. "B1/B2"
  rawCut: number;            // mean Angoff raw score (∑ p̄_i)
  thetaCut: number;          // θ where expected raw score = rawCut
  ci95Lower: number;         // BCa 95% CI lower bound (θ)
  ci95Upper: number;         // BCa 95% CI upper bound (θ)
  ci90Lower: number;         // 90% CI lower (θ)
  ci90Upper: number;         // 90% CI upper (θ)
  nPanelists: number;
  nItems: number;
  interRaterSD: number;      // SD of panelist-level raw cuts
  bootstrapIterations: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** θ search grid: −4 to +4 in 0.01 steps. */
const THETA_GRID = Array.from({ length: 801 }, (_, i) => -4 + i * 0.01);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Expected test score at θ under 3PL: ∑ P(θ, a, b, c) for all items */
function expectedScore(
  theta: number,
  items: Array<{ id: string; params: IrtParameters }>
): number {
  return items.reduce((sum, { params }) => sum + probability(theta, params), 0);
}

/**
 * Find θ* via linear interpolation on the θ grid where E[X|θ] = targetRaw.
 * Returns null if targetRaw is outside the achievable range.
 */
function findThetaForRawScore(
  targetRaw: number,
  items: Array<{ id: string; params: IrtParameters }>
): number | null {
  const scores = THETA_GRID.map((theta) => ({
    theta,
    score: expectedScore(theta, items),
  }));

  for (let i = 0; i < scores.length - 1; i++) {
    const lo = scores[i];
    const hi = scores[i + 1];
    if (lo.score <= targetRaw && targetRaw <= hi.score) {
      // Linear interpolation
      const t = (targetRaw - lo.score) / (hi.score - lo.score);
      return lo.theta + t * (hi.theta - lo.theta);
    }
  }
  // Clamp to grid edges if outside range
  if (targetRaw <= scores[0].score) return THETA_GRID[0];
  if (targetRaw >= scores[scores.length - 1].score)
    return THETA_GRID[THETA_GRID.length - 1];
  return null;
}

/** Mean of an array. */
function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Standard deviation (population). */
function sd(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/** Normal CDF approximation (Abramowitz & Stegun). */
function normCdf(z: number): number {
  const p = 0.2316419;
  const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const t = 1 / (1 + p * Math.abs(z));
  const poly = b.reduce((acc, coef, i) => acc + coef * Math.pow(t, i + 1), 0);
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/** Inverse normal CDF via Beasley-Springer-Moro algorithm. */
function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
             0.0276438810333863, 0.0038405729373609, 0.0003951896511349,
             0.0000321767881768, 0.0000002888167364, 0.0000003960315187];

  const y = p - 0.5;
  if (Math.abs(y) < 0.42) {
    const r = y * y;
    const num = y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]);
    const den = ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    return num / den;
  }

  const r = Math.log(-Math.log(p < 0.5 ? p : 1 - p));
  const z =
    c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * (c[4] +
    r * (c[5] + r * (c[6] + r * (c[7] + r * c[8])))))));
  return p < 0.5 ? -z : z;
}

/** Mulberry32 seeded PRNG for reproducible bootstraps. */
function mulberry32(seed: number) {
  return (): number => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Core bootstrap ──────────────────────────────────────────────────────────

export interface BootstrapOptions {
  /** Bootstrap iterations. Default: 2000. */
  iterations?: number;
  /** Random seed for reproducibility. Default: 20260901. */
  seed?: number;
}

/**
 * Compute BCa-corrected bootstrap CI for an Angoff cut score at one boundary.
 *
 * @param boundary   Human-readable label, e.g. "B1/B2"
 * @param panelists  Panelist ratings for anchor items at this boundary
 * @param items      Anchor items with calibrated IRT parameters
 * @param opts       Bootstrap options
 */
export function bootstrapCutScore(
  boundary: string,
  panelists: PanelistRatings[],
  items: Array<{ id: string; params: IrtParameters }>,
  opts: BootstrapOptions = {}
): CutScoreBootstrapResult {
  const iterations = opts.iterations ?? 2000;
  const rng = mulberry32(opts.seed ?? 20260901);

  if (panelists.length < 2) {
    throw new Error(`bootstrapCutScore: need ≥ 2 panelists, got ${panelists.length}`);
  }
  if (items.length < 3) {
    throw new Error(`bootstrapCutScore: need ≥ 3 anchor items, got ${items.length}`);
  }

  // ── Observed cut score ───────────────────────────────────────────────────
  // Mean probability per item across panelists
  const itemMeanP: Record<string, number> = {};
  for (const item of items) {
    const probs = panelists
      .map((p) => p.ratings[item.id])
      .filter((v): v is number => v !== undefined);
    itemMeanP[item.id] = probs.length > 0 ? mean(probs) : 0.5;
  }
  const rawCut = items.reduce((s, item) => s + itemMeanP[item.id], 0);
  const thetaCutObs = findThetaForRawScore(rawCut, items) ?? 0;

  // ── Panelist-level raw cuts (for inter-rater SD) ─────────────────────────
  const panelistRawCuts = panelists.map((p) =>
    items.reduce((s, item) => s + (p.ratings[item.id] ?? 0.5), 0)
  );
  const interRaterSD = sd(panelistRawCuts);

  // ── Bootstrap distribution ───────────────────────────────────────────────
  const n = panelists.length;
  const bootstrapThetas: number[] = [];

  for (let b = 0; b < iterations; b++) {
    // Resample panelists with replacement
    const resample = Array.from({ length: n }, () =>
      panelists[Math.floor(rng() * n)]
    );

    const resampleMeanP: Record<string, number> = {};
    for (const item of items) {
      const probs = resample.map((p) => p.ratings[item.id] ?? 0.5);
      resampleMeanP[item.id] = mean(probs);
    }
    const rawB = items.reduce((s, item) => s + resampleMeanP[item.id], 0);
    bootstrapThetas.push(findThetaForRawScore(rawB, items) ?? thetaCutObs);
  }

  bootstrapThetas.sort((a, b) => a - b);

  // ── BCa correction ───────────────────────────────────────────────────────
  // Bias-correction factor z0
  const pBelow = bootstrapThetas.filter((t) => t < thetaCutObs).length / iterations;
  const z0 = normInv(Math.max(1e-9, Math.min(1 - 1e-9, pBelow)));

  // Acceleration factor a (jackknife-based)
  const jackThetas = panelists.map((_, dropIdx) => {
    const jack = panelists.filter((__, i) => i !== dropIdx);
    const jackMeanP: Record<string, number> = {};
    for (const item of items) {
      const probs = jack.map((p) => p.ratings[item.id] ?? 0.5);
      jackMeanP[item.id] = mean(probs);
    }
    const rawJ = items.reduce((s, item) => s + jackMeanP[item.id], 0);
    return findThetaForRawScore(rawJ, items) ?? thetaCutObs;
  });
  const jackMean = mean(jackThetas);
  const num = jackThetas.reduce((s, t) => s + (jackMean - t) ** 3, 0);
  const den = 6 * Math.pow(jackThetas.reduce((s, t) => s + (jackMean - t) ** 2, 0), 1.5);
  const a = Math.abs(den) < 1e-12 ? 0 : num / den;

  function bcaQuantile(alpha: number): number {
    const zAlpha = normInv(alpha);
    const adjAlpha = normCdf(z0 + (z0 + zAlpha) / (1 - a * (z0 + zAlpha)));
    const idx = Math.round(adjAlpha * iterations);
    return bootstrapThetas[Math.max(0, Math.min(iterations - 1, idx))];
  }

  return {
    boundary,
    rawCut: Number(rawCut.toFixed(4)),
    thetaCut: Number(thetaCutObs.toFixed(4)),
    ci95Lower: Number(bcaQuantile(0.025).toFixed(4)),
    ci95Upper: Number(bcaQuantile(0.975).toFixed(4)),
    ci90Lower: Number(bcaQuantile(0.05).toFixed(4)),
    ci90Upper: Number(bcaQuantile(0.95).toFixed(4)),
    nPanelists: panelists.length,
    nItems: items.length,
    interRaterSD: Number(interRaterSD.toFixed(4)),
    bootstrapIterations: iterations,
  };
}

/**
 * Run bootstrap CI for all CEFR boundaries in one call.
 *
 * @param boundaryData  Map of boundary label → { panelists, items }
 */
export function bootstrapAllBoundaries(
  boundaryData: Record<
    string,
    { panelists: PanelistRatings[]; items: Array<{ id: string; params: IrtParameters }> }
  >,
  opts?: BootstrapOptions
): CutScoreBootstrapResult[] {
  return Object.entries(boundaryData).map(([boundary, { panelists, items }]) =>
    bootstrapCutScore(boundary, panelists, items, opts)
  );
}
