/**
 * Item Retirement Service (Phase 3)
 *
 * Detects and scores items for retirement based on multi-factor analysis:
 *  - Discrimination (a-parameter) < 0.3: 40% weight
 *  - Fit residuals > 3σ: 25% weight
 *  - P-value < 0.1 OR > 0.95: 20% weight
 *  - Item-total correlation < -0.10: 15% weight
 *
 * Retirement score ≥ 0.60 → flag for review
 * Retirement score ≥ 0.70 + declining trend → auto-retire
 */

import { prisma } from "../prisma.js";
import { logger } from "../observability/logger.js";
import type { Item, Response } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RetirementScoreResult {
  score: number;
  factors: {
    discrim: number;
    fit: number;
    difficulty: number;
    correlation: number;
  };
  recommendation: "RETIRE" | "REVIEW" | "KEEP";
  reasoning: string;
}

interface IrtParameters {
  discrimination: number;
  difficulty: number;
  guessing: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export class ItemRetirementService {
  /**
   * Compute retirement score for a single item.
   * Uses latest 50-100 responses for metrics.
   */
  static async computeRetirementScore(itemId: string): Promise<RetirementScoreResult> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    // Get recent responses (last 100, or fewer if item is new)
    const recentResponses = await prisma.response.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        isCorrect: true,
        score: true,
        session: {
          select: { theta: true, id: true },
        },
      },
    });

    if (recentResponses.length < 20) {
      return {
        score: 0,
        factors: { discrim: 0, fit: 0, difficulty: 0, correlation: 0 },
        recommendation: "KEEP",
        reasoning: "Insufficient responses for retirement analysis",
      };
    }

    const itemParams: IrtParameters = {
      discrimination: item.discrimination,
      difficulty: item.difficulty,
      guessing: item.guessing,
    };

    // Compute individual factors (0-1 scale, higher = worse)
    const discrimFactor = this.evaluateDiscrimination(
      item.discrimination,
      recentResponses.length
    );

    const fitFactor = await this.evaluateFitResiduals(recentResponses, itemParams);

    const difficultyFactor = this.evaluateDifficulty(recentResponses);

    const correlationFactor = await this.evaluateItemTotalCorrelation(itemId);

    // Weighted retirement score: 0-1, higher = worse
    const retirementScore =
      0.4 * discrimFactor + 0.25 * fitFactor + 0.2 * difficultyFactor + 0.15 * correlationFactor;

    // Determine recommendation
    let recommendation: "RETIRE" | "REVIEW" | "KEEP";
    let reasoning: string;

    if (retirementScore >= 0.7) {
      recommendation = "RETIRE";
      reasoning = "Critical: high retirement score with multiple factors failing";
    } else if (retirementScore >= 0.6) {
      recommendation = "REVIEW";
      reasoning = "Flag for review: retirement score above threshold";
    } else {
      recommendation = "KEEP";
      reasoning = "Item performance acceptable";
    }

    logger.info(
      {
        itemId,
        retirementScore: retirementScore.toFixed(3),
        factors: {
          discrim: discrimFactor.toFixed(3),
          fit: fitFactor.toFixed(3),
          difficulty: difficultyFactor.toFixed(3),
          correlation: correlationFactor.toFixed(3),
        },
        recommendation,
      },
      "item.retirement.score.computed"
    );

    return {
      score: retirementScore,
      factors: {
        discrim: discrimFactor,
        fit: fitFactor,
        difficulty: difficultyFactor,
        correlation: correlationFactor,
      },
      recommendation,
      reasoning,
    };
  }

  /**
   * Evaluate discrimination (a-parameter).
   * Score 0 = good (a >= 0.5), Score 1 = bad (a < 0.1)
   */
  private static evaluateDiscrimination(discrimination: number, responseCount: number): number {
    // Too few responses: no confidence in parameter
    if (responseCount < 50) {
      return 0; // Don't penalize yet
    }

    // a < 0.1: critical (score 1.0)
    if (discrimination < 0.1) return 1.0;

    // 0.1 <= a < 0.3: poor (score 0.8)
    if (discrimination < 0.3) return 0.8;

    // 0.3 <= a < 0.5: below acceptable (score 0.5)
    if (discrimination < 0.5) return 0.5;

    // 0.5 <= a < 3.0: acceptable (score 0)
    if (discrimination <= 3.0) return 0;

    // a > 3.0: suspiciously high (score 0.3) - may indicate overfitting or guessing
    return 0.3;
  }

  /**
   * Evaluate fit residuals (IRT model fit).
   * Compute standardized residuals and proportion > 3σ.
   */
  private static async evaluateFitResiduals(
    responses: Array<{
      isCorrect: boolean | null;
      score: number | null;
      session: { theta: number };
    }>,
    itemParams: IrtParameters
  ): Promise<number> {
    if (responses.length < 20) return 0;

    // Compute residuals for each response
    const residuals = responses.map((r) => {
      const theta = r.session.theta;
      const observed = r.score ?? (r.isCorrect ? 1 : 0);

      // Predicted probability using 3PL IRT model
      const predicted = this.irtProbability(theta, itemParams);

      // Residual: observed - predicted
      return observed - predicted;
    });

    // Standardize residuals (z-score)
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const variance =
      residuals.reduce((a, r) => a + (r - mean) ** 2, 0) / residuals.length;
    const sigma = Math.sqrt(variance);

    if (sigma === 0) return 0; // No variance in residuals

    const zScores = residuals.map((r) => Math.abs((r - mean) / sigma));

    // Proportion of residuals > 3σ
    const outlierProportion = zScores.filter((z) => z > 3).length / zScores.length;

    // Score: 0 if < 5% outliers, 1 if > 25% outliers
    if (outlierProportion < 0.05) return 0;
    if (outlierProportion > 0.25) return 1;
    return outlierProportion / 0.25; // Linear between 0.05 and 0.25
  }

  /**
   * Evaluate difficulty (p-value).
   * Items too easy (p > 0.95) or too hard (p < 0.1) should be retired.
   */
  private static evaluateDifficulty(
    responses: Array<{
      isCorrect: boolean | null;
      score: number | null;
    }>
  ): number {
    if (responses.length === 0) return 0;

    const pValue = responses.filter((r) => r.isCorrect || r.score! > 0.5).length / responses.length;

    // p in [0.1, 0.9]: acceptable (score 0)
    if (pValue >= 0.1 && pValue <= 0.95) return 0;

    // p < 0.1: too hard (score 1.0)
    if (pValue < 0.1) return 1;

    // 0.95 < p <= 1: too easy (score proportional)
    return Math.min(1, (pValue - 0.95) / 0.05);
  }

  /**
   * Evaluate item-total correlation.
   * Negative correlation (item scores inversely with overall ability) is problematic.
   */
  private static async evaluateItemTotalCorrelation(itemId: string): Promise<number> {
    // Get item responses with session theta
    const itemResponses = await prisma.response.findMany({
      where: { itemId },
      select: {
        score: true,
        isCorrect: true,
        session: {
          select: { theta: true },
        },
      },
      take: 100,
    });

    if (itemResponses.length < 30) return 0;

    // Compute Pearson correlation: itemScore vs sessionTheta
    const itemScores = itemResponses.map((r) => r.score ?? (r.isCorrect ? 1 : 0));
    const sessionThetas = itemResponses.map((r) => r.session.theta);

    const r = this.pearsonCorrelation(itemScores, sessionThetas);

    // r < -0.10: problematic negative correlation (score 1.0)
    if (r < -0.1) return 1;

    // -0.10 <= r < 0: weak negative (score proportional)
    if (r < 0) return Math.abs(r);

    // r >= 0: acceptable (score 0)
    return 0;
  }

  /**
   * Compute 3PL IRT probability.
   */
  private static irtProbability(theta: number, params: IrtParameters): number {
    const { discrimination: a, difficulty: b, guessing: c } = params;
    const exponent = -a * (theta - b);
    return c + (1 - c) / (1 + Math.exp(exponent));
  }

  /**
   * Compute Pearson correlation coefficient.
   */
  private static pearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((a, b) => a + b) / x.length;
    const meanY = y.reduce((a, b) => a + b) / y.length;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const sumSqX = x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0);
    const sumSqY = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);

    if (sumSqX === 0 || sumSqY === 0) return 0;

    return numerator / Math.sqrt(sumSqX * sumSqY);
  }
}
