/**
 * b4skills Difficulty Estimator
 *
 * Implements 3PL IRT model: P(θ) = c + (1-c) / (1 + exp(-a(θ - b)))
 * where a=discrimination, b=difficulty, c=guessing parameter.
 *
 * Used to: estimate real-time item difficulty, compute Fisher information,
 * calibrate new items, and detect item drift.
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IrtParameters {
  a: number; // discrimination (0.5–2.5 typical range)
  b: number; // difficulty (-3 to +3 IRT scale)
  c: number; // pseudo-guessing (0–0.35)
}

export interface ItemDifficultyReport {
  itemId: string;
  itemCode: string;
  skill: string;
  cefrLevel: string;
  estimatedB: number;
  estimatedA: number;
  estimatedC: number;
  p_value: number; // proportion correct
  pointBiserial: number; // item-total correlation
  fisherInformation: number; // at estimated b
  confidenceInterval: { lower: number; upper: number };
  responseCount: number;
  driftFlag: boolean;
  driftMagnitude?: number;
  recommendedAction: "keep" | "review" | "revise" | "retire";
}

export interface CalibrationResult {
  itemId: string;
  newParameters: IrtParameters;
  oldParameters: IrtParameters | null;
  drift: number;
  calibratedAt: Date;
  sampleSize: number;
}

// ---------------------------------------------------------------------------
// 3PL IRT functions
// ---------------------------------------------------------------------------

/** Probability of correct response given theta */
export function icc3pl(theta: number, params: IrtParameters): number {
  const { a, b, c } = params;
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

/** Fisher information for 3PL at given theta */
export function fisherInformation3pl(theta: number, params: IrtParameters): number {
  const { a, c } = params;
  const p = icc3pl(theta, params);
  const q = 1 - p;
  // I(θ) = a² * (p - c)² / ((1-c)² * p * q)
  const numerator = a * a * Math.pow(p - c, 2);
  const denominator = Math.pow(1 - c, 2) * p * q;
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Expected score on a test given theta and item parameters */
export function expectedScore(theta: number, itemParams: IrtParameters[]): number {
  return itemParams.reduce((sum, p) => sum + icc3pl(theta, p), 0);
}

/** MLE theta estimation (Newton-Raphson) */
export function estimateTheta(
  responses: number[], // 0 or 1
  itemParams: IrtParameters[],
  maxIter = 30,
  tolerance = 0.001
): number {
  let theta = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    let num = 0;
    let denom = 0;
    for (let i = 0; i < responses.length; i++) {
      const p = icc3pl(theta, itemParams[i]);
      const q = 1 - p;
      const info = fisherInformation3pl(theta, itemParams[i]);
      num += (responses[i] - p) * info / Math.max(p * q, 0.0001);
      denom += info;
    }
    if (denom === 0) break;
    const delta = num / denom;
    theta += delta;
    theta = Math.max(-4, Math.min(4, theta)); // clamp
    if (Math.abs(delta) < tolerance) break;
  }
  return theta;
}

// ---------------------------------------------------------------------------
// Difficulty Estimator
// ---------------------------------------------------------------------------

export class DifficultyEstimator {
  /**
   * Estimate item parameters from response data using simplified JMLE.
   * Production should use R/TAM or flexMIRT for full MML calibration.
   */
  async estimateItemParameters(itemId: string): Promise<IrtParameters> {
    const responses = await prisma.response.findMany({
      where: { itemId },
      select: { isCorrect: true, latencyMs: true, session: { select: { theta: true } } },
    });

    if (responses.length < 10) {
      // Fall back to prior defaults
      return { a: 1.0, b: 0.0, c: 0.25 };
    }

    const n = responses.length;
    const correct = responses.filter((r) => r.isCorrect).length;
    const p_value = correct / n;

    // Estimate b from p-value: b ≈ logit(p_value) normalised
    const clampedP = Math.max(0.01, Math.min(0.99, p_value));
    const estimatedB = -Math.log(clampedP / (1 - clampedP));

    // Estimate discrimination from item-total correlation proxy
    const thetas = responses
      .map((r) => r.session?.theta ?? 0)
      .filter((t) => typeof t === "number");
    const a = thetas.length > 5 ? this.estimateDiscrimination(responses.map((r) => (r.isCorrect ? 1 : 0)), thetas) : 1.0;

    // Guessing: use 1/n_options default
    const c = 0.25;

    return { a, b: estimatedB, c };
  }

  /** Compute full difficulty report for one item */
  async computeItemDifficultyReport(itemId: string): Promise<ItemDifficultyReport> {
    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, itemCode: true, skill: true, cefrLevel: true } });
    if (!item) throw new Error(`Item ${itemId} not found`);

    const responses = await prisma.response.findMany({
      where: { itemId },
      select: { isCorrect: true, session: { select: { theta: true } } },
    });

    const params = await this.estimateItemParameters(itemId);
    const p_value = responses.length > 0 ? responses.filter((r) => r.isCorrect).length / responses.length : 0.5;

    // Point-biserial correlation
    const thetas = responses.map((r) => r.session?.theta ?? 0);
    const scores = responses.map((r) => (r.isCorrect ? 1 : 0));
    const pointBiserial = this.pointBiserialCorrelation(scores, thetas);

    // Fisher information at estimated difficulty
    const fi = fisherInformation3pl(params.b, params);

    // Confidence interval on b (simplified, ±1 SE)
    const se = responses.length > 0 ? 1 / Math.sqrt(responses.length * fi + 0.001) : 0.5;

    // Drift detection: compare against nominal CEFR difficulty
    const nominalB = this.cefrToTheta(item.cefrLevel);
    const drift = Math.abs(params.b - nominalB);
    const driftFlag = drift > 0.5;

    // Recommendation
    let recommendedAction: ItemDifficultyReport["recommendedAction"] = "keep";
    if (drift > 1.0 || params.a < 0.3 || p_value < 0.05 || p_value > 0.95) {
      recommendedAction = "retire";
    } else if (driftFlag || params.a < 0.6) {
      recommendedAction = "revise";
    } else if (pointBiserial < 0.2) {
      recommendedAction = "review";
    }

    return {
      itemId,
      itemCode: item.itemCode,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      estimatedB: Math.round(params.b * 1000) / 1000,
      estimatedA: Math.round(params.a * 1000) / 1000,
      estimatedC: params.c,
      p_value: Math.round(p_value * 1000) / 1000,
      pointBiserial: Math.round(pointBiserial * 1000) / 1000,
      fisherInformation: Math.round(fi * 1000) / 1000,
      confidenceInterval: { lower: Math.round((params.b - se) * 100) / 100, upper: Math.round((params.b + se) * 100) / 100 },
      responseCount: responses.length,
      driftFlag,
      driftMagnitude: driftFlag ? Math.round(drift * 100) / 100 : undefined,
      recommendedAction,
    };
  }

  async batchEstimate(skill?: string, limit = 100): Promise<ItemDifficultyReport[]> {
    const items = await prisma.item.findMany({
      where: skill ? { skill: skill as any } : {},
      select: { id: true },
      take: limit,
    });

    const reports = await Promise.allSettled(
      items.map((item) => this.computeItemDifficultyReport(item.id))
    );

    return reports
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<ItemDifficultyReport>).value);
  }

  // ---------------------------------------------------------------------------
  // Statistical helpers
  // ---------------------------------------------------------------------------

  private estimateDiscrimination(scores: number[], thetas: number[]): number {
    const n = Math.min(scores.length, thetas.length);
    if (n < 5) return 1.0;
    const meanTheta = thetas.reduce((a, b) => a + b, 0) / n;
    const meanScore = scores.reduce((a, b) => a + b, 0) / n;
    let cov = 0;
    let varTheta = 0;
    for (let i = 0; i < n; i++) {
      cov += (thetas[i] - meanTheta) * (scores[i] - meanScore);
      varTheta += (thetas[i] - meanTheta) ** 2;
    }
    const slope = varTheta === 0 ? 1.0 : cov / varTheta;
    return Math.max(0.1, Math.min(3.0, slope));
  }

  private pointBiserialCorrelation(binary: number[], continuous: number[]): number {
    const n = Math.min(binary.length, continuous.length);
    if (n < 3) return 0;
    const mean1 = continuous.filter((_, i) => binary[i] === 1).reduce((a, b) => a + b, 0) / (binary.filter((b) => b === 1).length || 1);
    const meanAll = continuous.reduce((a, b) => a + b, 0) / n;
    const sdAll = Math.sqrt(continuous.reduce((s, v) => s + (v - meanAll) ** 2, 0) / n);
    const p = binary.filter((b) => b === 1).length / n;
    const q = 1 - p;
    return sdAll === 0 ? 0 : ((mean1 - meanAll) / sdAll) * Math.sqrt(p * q);
  }

  private cefrToTheta(cefrLevel: string): number {
    const map: Record<string, number> = { A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };
    return map[cefrLevel] ?? 0;
  }
}

export const difficultyEstimator = new DifficultyEstimator();
