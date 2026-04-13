import { prisma } from "../prisma";
import { CefrLevel, IrtParameters } from "./types";
import { probability } from "./irt";

/**
 * Calibration Service
 * This service performs an empirical study on the item bank and candidate responses
 * to establish precise theta cut-scores for mapping ability estimates to CEFR levels.
 * It also handles the calibration of pretest items based on candidate responses.
 */

export interface CalibratedCutScores {
  PRE_A1: number;
  A1: number;
  A2: number;
  B1: number;
  B2: number;
  C1: number;
  C2: number;
}

export class CalibrationService {
  /**
   * Conduct a calibration study based on current item difficulties and candidate performance.
   * This uses the "Mean Difficulty" approach combined with empirical response data.
   */
  static async conductStudy(): Promise<{
    cutScores: CalibratedCutScores;
    stats: any;
  }> {
    // 1. Fetch all items with their CEFR levels and IRT parameters
    const items = await prisma.item.findMany({
      select: {
        id: true,
        cefrLevel: true,
        difficulty: true,
        discrimination: true,
      }
    });

    // 2. Group items by CEFR level and calculate mean difficulty (b-parameter)
    const levelGroups: Record<string, number[]> = {};
    items.forEach(item => {
      const level = item.cefrLevel;
      if (!levelGroups[level]) levelGroups[level] = [];
      levelGroups[level].push(item.difficulty);
    });

    const meanDifficulties: Record<string, number> = {};
    const levels: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
    
    levels.forEach(level => {
      const diffs = levelGroups[level] || [];
      if (diffs.length > 0) {
        meanDifficulties[level] = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      } else {
        // Fallback to default values if no items exist for a level
        const defaults: Record<string, number> = {
          "PRE_A1": -3.0,
          "A1": -2.0,
          "A2": -1.0,
          "B1": 0.0,
          "B2": 1.0,
          "C1": 2.0,
          "C2": 3.0
        };
        meanDifficulties[level] = defaults[level];
      }
    });

    // 3. Establish cut-scores as midpoints between mean difficulties
    // A cut-score for level L is the theta value that separates L-1 from L.
    const cutScores: CalibratedCutScores = {
      PRE_A1: -Infinity, // Everything below A1 is Pre-A1
      A1: (meanDifficulties["PRE_A1"] + meanDifficulties["A1"]) / 2,
      A2: (meanDifficulties["A1"] + meanDifficulties["A2"]) / 2,
      B1: (meanDifficulties["A2"] + meanDifficulties["B1"]) / 2,
      B2: (meanDifficulties["B1"] + meanDifficulties["B2"]) / 2,
      C1: (meanDifficulties["B2"] + meanDifficulties["C1"]) / 2,
      C2: (meanDifficulties["C1"] + meanDifficulties["C2"]) / 2,
    };

    // 4. Refine based on empirical response data (if available)
    // We look at the average theta of candidates who correctly answer items at each level
    const responses = await prisma.response.findMany({
      where: { isCorrect: true },
      include: {
        item: { select: { cefrLevel: true } },
        session: { select: { theta: true } }
      }
    });

    const empiricalThetas: Record<string, number[]> = {};
    responses.forEach(resp => {
      const level = resp.item.cefrLevel;
      if (!empiricalThetas[level]) empiricalThetas[level] = [];
      empiricalThetas[level].push(resp.session.theta);
    });

    const empiricalMeans: Record<string, number> = {};
    levels.forEach(level => {
      const thetas = empiricalThetas[level] || [];
      if (thetas.length > 0) {
        empiricalMeans[level] = thetas.reduce((a, b) => a + b, 0) / thetas.length;
      }
    });

    // 5. Final adjustment: Blend theoretical mean difficulty with empirical candidate theta
    // This provides a "precise" cut-score that reflects both item design and actual performance.
    const finalCutScores: CalibratedCutScores = { ...cutScores };
    
    // For each level (except PRE_A1 which is the baseline), 
    // we can adjust the cut-score if we have enough empirical data.
    levels.slice(1).forEach((level, index) => {
      const prevLevel = levels[index];
      const currentEmpirical = empiricalMeans[level];
      const prevEmpirical = empiricalMeans[prevLevel];

      if (currentEmpirical !== undefined && prevEmpirical !== undefined) {
        const empiricalMidpoint = (currentEmpirical + prevEmpirical) / 2;
        // Blend 50/50
        (finalCutScores as any)[level] = (cutScores as any)[level] * 0.5 + empiricalMidpoint * 0.5;
      }
    });

    return {
      cutScores: finalCutScores,
      stats: {
        itemCount: items.length,
        responseCount: responses.length,
        meanDifficulties,
        empiricalMeans
      }
    };
  }

  /**
   * Update the system configuration with the new cut-scores.
   */
  static async applyCalibration(): Promise<CalibratedCutScores> {
    const { cutScores } = await this.conductStudy();
    
    // Update the global system configuration
    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        config: { cefrThresholds: cutScores } as any
      },
      update: {
        config: { cefrThresholds: cutScores } as any
      }
    });

    return cutScores;
  }

  /**
   * Calibrate pretest items based on candidate responses.
   * This updates the difficulty (b-parameter) of pretest items using a heuristic
   * based on the mean ability of candidates and the observed proportion correct.
   */
  static async calibratePretestItems(): Promise<{
    updatedItems: number;
    results: any[];
  }> {
    // 1. Fetch all pretest items with their responses
    const pretestItems = await prisma.item.findMany({
      where: { 
        OR: [
          { status: "PRETEST" },
          { isPretest: true } as any
        ]
      },
      include: {
        responses: {
          select: {
            score: true,
            session: { select: { theta: true } }
          }
        }
      }
    } as any);

    const results: any[] = [];
    let updatedCount = 0;

    for (const item of pretestItems as any[]) {
      const responses = item.responses;
      if (responses.length < 10) {
        // Not enough data for calibration (minimum 10 responses)
        continue;
      }

      // 2. Calculate observed proportion correct (p-value)
      const totalScore = responses.reduce((sum, r) => sum + (r.score || 0), 0);
      const pObserved = totalScore / responses.length;

      // 3. Calculate mean ability (theta) of respondents
      const meanTheta = responses.reduce((sum, r) => sum + r.session.theta, 0) / responses.length;

      // 4. Heuristic Calibration for b-parameter (difficulty)
      // b = meanTheta - logit(pObserved) / a
      // We use a simplified version for stability:
      // b_new = b_old + (P_expected - P_observed)
      
      const params: IrtParameters = {
        a: item.discrimination,
        b: item.difficulty,
        c: item.guessing
      };

      const pExpected = probability(meanTheta, params);
      const adjustment = pExpected - pObserved;
      
      // Damping factor to prevent over-correction
      const damping = 0.5;
      const newDifficulty = item.difficulty + (adjustment * damping);

      // 5. Update item in database
      await prisma.item.update({
        where: { id: item.id },
        data: {
          difficulty: newDifficulty,
          pVal: pObserved,
          exposureCount: item.exposureCount + responses.length
        }
      });

      results.push({
        itemId: item.id,
        oldDifficulty: item.difficulty,
        newDifficulty,
        pObserved,
        meanTheta,
        responses: responses.length
      });
      updatedCount++;
    }

    return {
      updatedItems: updatedCount,
      results
    };
  }

  /**
   * Promote pretest items to ACTIVE status if they have sufficient data.
   * This is the final step in the calibration lifecycle.
   */
  static async promotePretestItems(minResponses: number = 50): Promise<{
    promotedItems: number;
    results: any[];
  }> {
    // 1. Fetch all pretest items with their response counts
    const pretestItems = await prisma.item.findMany({
      where: { 
        OR: [
          { status: "PRETEST" },
          { isPretest: true } as any
        ]
      },
      include: {
        _count: {
          select: { responses: true }
        }
      }
    } as any);

    const results: any[] = [];
    let promotedCount = 0;

    for (const item of pretestItems as any) {
      if (item._count.responses >= minResponses) {
        // 2. Update item status to ACTIVE and turn off isPretest
        await prisma.item.update({
          where: { id: item.id },
          data: {
            status: "ACTIVE",
            isPretest: false,
            updatedAt: new Date()
          } as any
        });

        results.push({
          itemId: item.id,
          responses: item._count.responses,
          finalDifficulty: item.difficulty
        });
        promotedCount++;
      }
    }

    return {
      promotedItems: promotedCount,
      results
    };
  }

  /**
   * Online Item Calibration (fires after each real response once an item
   * has ≥ CALIBRATION_THRESHOLD real answers).
   * Uses a simplified EM/IRC heuristic: nudge the b-parameter toward the
   * theta value where P(theta) ≈ observed p-value.
   *
   * Safe to call on every response submission (idempotent if not enough data).
   */
  static async recalibrateItem(itemId: string): Promise<void> {
    const CALIBRATION_THRESHOLD = 30;
    const DAMPING = 0.3; // conservative step size per iteration

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        responses: {
          select: {
            score: true,
            session: { select: { theta: true } }
          }
        }
      }
    } as any);

    if (!item) return;
    const responses = (item as any).responses as { score: number; session: { theta: number } }[];
    if (responses.length < CALIBRATION_THRESHOLD) return;

    const pObserved = responses.reduce((sum, r) => sum + r.score, 0) / responses.length;
    const meanTheta  = responses.reduce((sum, r) => sum + r.session.theta, 0) / responses.length;

    const params: IrtParameters = {
      a: (item as any).discrimination,
      b: (item as any).difficulty,
      c: (item as any).guessing
    };

    const pExpected = probability(meanTheta, params);
    // Nudge b toward the theta value that matches the observed proportion correct
    const bAdjustment = (pExpected - pObserved) * DAMPING;
    const newDifficulty = Math.max(-4, Math.min(4, (item as any).difficulty + bAdjustment));

    await prisma.item.update({
      where: { id: itemId },
      data: {
        difficulty: newDifficulty,
        exposureCount: { increment: 1 }
      }
    });
  }
}
