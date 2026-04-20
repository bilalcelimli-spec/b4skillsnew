import { prisma } from "../prisma";
import { CefrLevel, IrtParameters } from "./types";
import { probability } from "./irt";
import { DifAnalysisService } from "../psychometrics/dif-analysis.js";

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

    // 5. Final adjustment: sample-size-weighted blend of theoretical midpoint and
    //    empirical midpoint. More empirical data → more weight on empirical.
    //    This replaces the arbitrary 50/50 split with a principled estimator.
    const EMPIRICAL_MIN_RESPONSES = 30; // Minimum responses before empirical data is trusted
    const finalCutScores: CalibratedCutScores = { ...cutScores };

    levels.slice(1).forEach((level, index) => {
      const prevLevel = levels[index];
      const currentEmpirical = empiricalMeans[level];
      const prevEmpirical = empiricalMeans[prevLevel];
      const currentN = (empiricalThetas[level] || []).length;
      const prevN = (empiricalThetas[prevLevel] || []).length;

      if (
        currentEmpirical !== undefined &&
        prevEmpirical !== undefined &&
        currentN >= EMPIRICAL_MIN_RESPONSES &&
        prevN >= EMPIRICAL_MIN_RESPONSES
      ) {
        const empiricalMidpoint = (currentEmpirical + prevEmpirical) / 2;
        // Weight empirical data by effective sample size (harmonic mean)
        const effectiveN = (2 * currentN * prevN) / (currentN + prevN);
        // Sigmoid weight: saturates at 1.0 when effectiveN → ∞, near 0 with little data
        const empiricalWeight = effectiveN / (effectiveN + 100); // 100 = half-saturation constant
        const theoreticalWeight = 1 - empiricalWeight;
        (finalCutScores as any)[level] =
          (cutScores as any)[level] * theoreticalWeight + empiricalMidpoint * empiricalWeight;
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
      if (responses.length < 100) {
        // Minimum 100 responses for statistically stable b-parameter estimates.
        // Fewer responses produce biased estimates, especially for extreme difficulties.
        continue;
      }

      // 2. Calculate observed proportion correct (p-value)
      const totalScore = responses.reduce((sum, r) => sum + (r.score || 0), 0);
      const pObserved = totalScore / responses.length;

      // 3. Calculate mean ability (theta) of respondents
      const meanTheta = responses.reduce((sum, r) => sum + r.session.theta, 0) / responses.length;

      // 4. Calibration for b-parameter (difficulty) and a-parameter (discrimination)
      //
      //    b-update: b_new = b_old + DAMPING * (P_expected - P_observed)
      //    a-update: use point-biserial correlation as a proxy for discrimination.
      //    Point-biserial r = (M_correct - M_incorrect) / SD_all * sqrt(p*(1-p))
      //    Then a_new = max(0.2, min(3.0, a_old + DAMPING_A * (r - P_expected_discrimination)))

      const params: IrtParameters = {
        a: item.discrimination,
        b: item.difficulty,
        c: item.guessing
      };

      const pExpected = probability(meanTheta, params);
      const bAdjustment = pExpected - pObserved;

      // Damping factor to prevent over-correction
      const DAMPING_B = 0.3; // Reduced from 0.5 to be more conservative
      const newDifficulty = Math.max(-4, Math.min(4, item.difficulty + bAdjustment * DAMPING_B));

      // Point-biserial discrimination estimate
      const correctThetas = responses.filter(r => (r.score || 0) >= 0.5).map(r => r.session.theta);
      const incorrectThetas = responses.filter(r => (r.score || 0) < 0.5).map(r => r.session.theta);
      let newDiscrimination = item.discrimination;
      if (correctThetas.length > 5 && incorrectThetas.length > 5) {
        const meanCorrect = correctThetas.reduce((s, t) => s + t, 0) / correctThetas.length;
        const meanIncorrect = incorrectThetas.reduce((s, t) => s + t, 0) / incorrectThetas.length;
        const allThetas = responses.map(r => r.session.theta);
        const grandMean = allThetas.reduce((s, t) => s + t, 0) / allThetas.length;
        const variance = allThetas.reduce((s, t) => s + (t - grandMean) ** 2, 0) / allThetas.length;
        const sd = Math.sqrt(Math.max(variance, 1e-6));
        const ptBiserial = ((meanCorrect - meanIncorrect) / sd) * Math.sqrt(pObserved * (1 - pObserved));
        const DAMPING_A = 0.2;
        newDiscrimination = Math.max(0.2, Math.min(3.0, item.discrimination + DAMPING_A * (ptBiserial - item.discrimination)));
      }

      // 5. Update item in database
      await prisma.item.update({
        where: { id: item.id },
        data: {
          difficulty: newDifficulty,
          discrimination: newDiscrimination,
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
        // 2. Run DIF analysis before promotion to catch biased items.
        //    Check gender and nativeLanguage; ETS Class C → RETIRED, Class B → REVIEW.
        let difBlocked = false;
        let difReviewOnly = false;
        try {
          const [genderDif, langDif] = await Promise.all([
            DifAnalysisService.analyzeItemDif(item.id, "gender", "male", "female"),
            DifAnalysisService.analyzeItemDif(item.id, "nativeLanguage", "english", "non-english"),
          ]);
          if (genderDif.classification === "C" || langDif.classification === "C") {
            difBlocked = true;
          } else if (genderDif.classification === "B" || langDif.classification === "B") {
            difReviewOnly = true;
          }
        } catch {
          // DIF service unavailable (e.g. not enough data) — allow promotion
        }

        if (difBlocked) {
          await prisma.item.update({
            where: { id: item.id },
            data: { status: "RETIRED", updatedAt: new Date() } as any,
          });
          results.push({ itemId: item.id, responses: item._count.responses, action: "RETIRED_DIF_C" });
          continue;
        }

        if (difReviewOnly) {
          await prisma.item.update({
            where: { id: item.id },
            data: { status: "REVIEW", updatedAt: new Date() } as any,
          });
          results.push({ itemId: item.id, responses: item._count.responses, action: "REVIEW_DIF_B" });
          promotedCount++;
          continue;
        }

        // 3. No DIF concern — promote to ACTIVE
        await prisma.item.update({
          where: { id: item.id },
          data: { status: "ACTIVE", isPretest: false, updatedAt: new Date() } as any,
        });

        results.push({
          itemId: item.id,
          responses: item._count.responses,
          finalDifficulty: item.difficulty,
          action: "PROMOTED",
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
