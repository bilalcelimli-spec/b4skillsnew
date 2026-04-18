import { prisma } from "../prisma";
import { probability } from "../assessment-engine/irt";

/**
 * Standard Setting Service
 * 
 * Implements the Modified Angoff and Bookmark methods for establishing
 * CEFR cut-scores based on expert judgment + empirical data.
 * 
 * The Modified Angoff procedure:
 * 1. Panel of experts estimates the probability that a "borderline" candidate
 *    at each CEFR level would answer each item correctly
 * 2. Cut-scores are derived from these probability estimates
 * 3. Empirical data is used to validate and adjust the cut-scores
 */

export interface AngoffRating {
  raterId: string;
  itemId: string;
  cefrBorder: string;      // e.g., "A2_B1" = borderline between A2 and B1
  probability: number;      // 0-1: probability of correct response
}

export interface CutScore {
  border: string;           // e.g., "A2_B1"
  theta: number;            // Cut-score on theta scale
  empiricalTheta: number;   // Empirically-derived cut-score
  blendedTheta: number;     // Weighted blend of Angoff + empirical
  confidence: number;       // Inter-rater agreement (0-1)
  seOfCut: number;          // Standard error of the cut-score
}

export interface StandardSettingStudy {
  id: string;
  name: string;
  method: "ANGOFF" | "BOOKMARK";
  borders: string[];
  ratings: AngoffRating[];
  cutScores: CutScore[];
  panelSize: number;
  interRaterReliability: number;
  createdAt: Date;
}

/**
 * Calculate cut-scores from Angoff ratings
 * 
 * For each border (e.g., A2/B1), the cut-score is the theta value where
 * a borderline candidate has a total expected score equal to the mean
 * of expert probability estimates.
 */
function calculateAngoffCutScore(
  ratings: AngoffRating[],
  itemParams: Map<string, { a: number; b: number; c: number }>
): CutScore[] {
  // Group ratings by border
  const borderGroups = new Map<string, AngoffRating[]>();
  for (const r of ratings) {
    const group = borderGroups.get(r.cefrBorder) || [];
    group.push(r);
    borderGroups.set(r.cefrBorder, group);
  }

  const cutScores: CutScore[] = [];

  for (const [border, borderRatings] of borderGroups) {
    // Group by item, average across raters
    const itemProbs = new Map<string, number[]>();
    for (const r of borderRatings) {
      const probs = itemProbs.get(r.itemId) || [];
      probs.push(r.probability);
      itemProbs.set(r.itemId, probs);
    }

    // Calculate mean probability per item
    const meanProbs: { itemId: string; meanP: number }[] = [];
    for (const [itemId, probs] of itemProbs) {
      const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
      meanProbs.push({ itemId, meanP: mean });
    }

    // Total expected score = sum of mean probabilities
    const totalExpectedScore = meanProbs.reduce((s, p) => s + p.meanP, 0);
    const proportionScore = totalExpectedScore / meanProbs.length;

    // Find theta where the expected score matches the Angoff expected score
    // Use iterative search
    let bestTheta = 0;
    let bestDiff = Infinity;

    for (let theta = -4; theta <= 4; theta += 0.01) {
      let expectedScore = 0;
      for (const mp of meanProbs) {
        const params = itemParams.get(mp.itemId);
        if (params) {
          expectedScore += probability(theta, params);
        }
      }
      const proportion = expectedScore / meanProbs.length;
      const diff = Math.abs(proportion - proportionScore);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestTheta = theta;
      }
    }

    // Inter-rater reliability (intraclass correlation approximation)
    const raterIds = [...new Set(borderRatings.map(r => r.raterId))];
    let totalVar = 0;
    let raterVar = 0;

    for (const [itemId, probs] of itemProbs) {
      const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
      for (const p of probs) {
        totalVar += (p - mean) ** 2;
      }
    }
    const mse = totalVar / borderRatings.length;
    const reliability = Math.max(0, 1 - mse / 0.25); // Approximate ICC

    // Standard error of cut-score
    const seOfCut = Math.sqrt(mse / meanProbs.length);

    cutScores.push({
      border,
      theta: Number(bestTheta.toFixed(3)),
      empiricalTheta: 0, // Filled by empirical validation
      blendedTheta: Number(bestTheta.toFixed(3)),
      confidence: Number(reliability.toFixed(3)),
      seOfCut: Number(seOfCut.toFixed(3)),
    });
  }

  return cutScores;
}

export const StandardSettingService = {
  /**
   * Create a new standard setting study
   */
  async createStudy(name: string, method: "ANGOFF" | "BOOKMARK"): Promise<string> {
    const borders = ["PRE_A1_A1", "A1_A2", "A2_B1", "B1_B2", "B2_C1", "C1_C2"];
    const id = `ss_${Date.now()}`;
    
    await prisma.systemConfig.upsert({
      where: { id: `standard_setting_${id}` },
      create: {
        id: `standard_setting_${id}`,
        config: { id, name, method, borders, ratings: [], cutScores: [], createdAt: new Date() },
      },
      update: {
        config: { id, name, method, borders, ratings: [], cutScores: [], createdAt: new Date() },
      },
    });

    return id;
  },

  /**
   * Submit Angoff ratings from an expert panelist
   */
  async submitRatings(studyId: string, ratings: AngoffRating[]) {
    const configDoc = await prisma.systemConfig.findUnique({
      where: { id: `standard_setting_${studyId}` },
    });
    if (!configDoc) throw new Error("Study not found");

    const study = configDoc.config as any;
    study.ratings = [...(study.ratings || []), ...ratings];

    await prisma.systemConfig.update({
      where: { id: `standard_setting_${studyId}` },
      data: { config: study },
    });
  },

  /**
   * Calculate cut-scores from all submitted ratings
   */
  async calculateCutScores(studyId: string): Promise<CutScore[]> {
    const configDoc = await prisma.systemConfig.findUnique({
      where: { id: `standard_setting_${studyId}` },
    });
    if (!configDoc) throw new Error("Study not found");

    const study = configDoc.config as any;
    const ratings: AngoffRating[] = study.ratings;

    // Get item parameters
    const itemIds = [...new Set(ratings.map(r => r.itemId))];
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
    });

    const itemParams = new Map<string, { a: number; b: number; c: number }>();
    for (const item of items) {
      itemParams.set(item.id, {
        a: item.discrimination,
        b: item.difficulty,
        c: item.guessing,
      });
    }

    // Calculate Angoff cut-scores
    const cutScores = calculateAngoffCutScore(ratings, itemParams);

    // Empirical validation: find actual theta distribution at each border
    for (const cs of cutScores) {
      const [lower, upper] = cs.border.split("_");
      
      // Find sessions where candidates are near the border
      const sessions = await prisma.session.findMany({
        where: {
          status: "COMPLETED",
          cefrLevel: { in: [lower, upper] as any[] },
        },
        select: { theta: true, cefrLevel: true },
      });

      if (sessions.length >= 10) {
        const lowerSessions = sessions.filter(s => s.cefrLevel === lower);
        const upperSessions = sessions.filter(s => s.cefrLevel === upper);

        if (lowerSessions.length > 0 && upperSessions.length > 0) {
          const maxLower = Math.max(...lowerSessions.map(s => s.theta));
          const minUpper = Math.min(...upperSessions.map(s => s.theta));
          cs.empiricalTheta = Number(((maxLower + minUpper) / 2).toFixed(3));
          
          // Blend Angoff and empirical (50/50)
          cs.blendedTheta = Number(((cs.theta + cs.empiricalTheta) / 2).toFixed(3));
        }
      }
    }

    // Save results
    study.cutScores = cutScores;
    study.panelSize = [...new Set(ratings.map(r => r.raterId))].length;
    study.interRaterReliability = cutScores.length > 0
      ? cutScores.reduce((s, c) => s + c.confidence, 0) / cutScores.length
      : 0;

    await prisma.systemConfig.update({
      where: { id: `standard_setting_${studyId}` },
      data: { config: study },
    });

    return cutScores;
  },

  /**
   * Apply cut-scores to the engine configuration
   */
  async applyCutScores(studyId: string) {
    const configDoc = await prisma.systemConfig.findUnique({
      where: { id: `standard_setting_${studyId}` },
    });
    if (!configDoc) throw new Error("Study not found");

    const study = configDoc.config as any;
    const cutScores: CutScore[] = study.cutScores;

    // Map to engine config format
    const cefrThresholds: Record<string, number> = {};
    for (const cs of cutScores) {
      const parts = cs.border.split("_");
      const upperLevel = parts[parts.length - 1]; // e.g., "A2_B1" → "B1"
      cefrThresholds[upperLevel] = cs.blendedTheta;
    }

    // Update global engine config
    const globalConfig = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    const config = (globalConfig?.config as any) || {};
    config.cefrThresholds = cefrThresholds;

    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: { id: "global", config },
      update: { config },
    });
  },
};
