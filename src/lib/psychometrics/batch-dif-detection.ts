/**
 * Batch DIF Detection Service (Phase 3, Task 2)
 *
 * Detects Differential Item Functioning across demographic groups.
 * Runs nightly to flag items that perform differently for:
 *  - Gender (M/F/Other)
 *  - Native Language (L1)
 *  - Age Group
 *
 * Uses DifAnalysisService for proper stratified Mantel-Haenszel test with
 * ability matching via session theta, plus logistic regression DIF.
 * 
 * MH procedure (Holland & Thayer, 1988):
 *   1. Stratify all respondents by ability (session theta → K quantile strata)
 *   2. Within each stratum, build 2×2 table: group (R/F) × score (correct/incorrect)
 *   3. Pool across strata to get common odds ratio and chi-squared statistic
 *   4. Compute ETS delta: Δ = −2.35 × ln(OR)
 *   5. Classify: |Δ|<1.0 → A, 1.0≤|Δ|<1.5 → B, |Δ|≥1.5 → C
 */

import { prisma } from "../prisma.js";
import { DifAnalysisService } from "./dif-analysis.js";
import { logger } from "../observability/logger.js";
import type { Item, Response, User, Session } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DifDetectionResult {
  itemsAnalyzed: number;
  itemsFlagged: number;
  results: Array<{
    itemId: string;
    responseCount: number;
    flagged: boolean;
  }>;
}

interface DemographicGroup {
  variable: "gender" | "nativeLanguage" | "ageGroup";
  referenceGroup: string;
  focalGroups: string[];
}

interface DifTestResult {
  itemId: string;
  variable: "gender" | "nativeLanguage" | "ageGroup";
  referenceGroup: string;
  focalGroup: string;
  referenceN: number;
  focalN: number;
  mhOddsRatio: number;
  mhDelta: number;
  chiSquared: number;
  pValue: number;
  classification: "A" | "B" | "C"; // A=negligible, B=moderate, C=large
  logisticUniformDif: number;
  logisticNonUniformDif: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export class BatchDifDetectionService {
  /**
   * Main entry point: run full DIF analysis for ACTIVE items.
   */
  static async runFullDifAnalysis(): Promise<DifDetectionResult> {
    const startedAt = Date.now();

    const MIN_RESPONSES = 50;

    console.log("Starting DIF detection analysis...");

    // Find ACTIVE items with ≥50 responses
    const activeItems = await prisma.item.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, organizationId: true, skill: true, cefrLevel: true },
    });

    console.log(`Found ${activeItems.length} ACTIVE items`);

    // Count responses per item
    const itemResponseCounts = await Promise.all(
      activeItems.map(async (item) => {
        const count = await prisma.response.count({
          where: { itemId: item.id },
        });
        return { item, count };
      })
    );

    const eligibleItems = itemResponseCounts
      .filter((r) => r.count >= MIN_RESPONSES)
      .map((r) => r.item);

    console.log(
      `${eligibleItems.length} items eligible for DIF analysis (≥${MIN_RESPONSES} responses)`
    );

    const results: Array<{
      itemId: string;
      responseCount: number;
      flagged: boolean;
    }> = [];

    // Analyze each item across demographic variables
    for (const item of eligibleItems) {
      try {
        const itemResults = await this.analyzeItemComprehensive(item.id);
        const flagged = itemResults.some((r) => r.classification === "C");

        results.push({
          itemId: item.id,
          responseCount: itemResults.length,
          flagged,
        });

        if (flagged) {
          // Create or update DifFlaggedItem
          const worstClassification = this.getWorstClassification(itemResults);
          await prisma.difFlaggedItem.upsert({
            where: { itemId: item.id },
            update: {
              worstClassification,
              flaggedAt: new Date(),
            },
            create: {
              itemId: item.id,
              worstClassification,
              flaggedAt: new Date(),
              totalDifResults: itemResults.filter((r) => r.classification !== "A").length,
            },
          });

          // Update item status
          await prisma.item.update({
            where: { id: item.id },
            data: { difStatus: "FLAGGED", latestDifReviewAt: new Date() },
          });

          logger.info(
            {
              itemId: item.id,
              worstClassification,
              results: itemResults.map((r) => ({
                variable: r.variable,
                groups: `${r.referenceGroup} vs ${r.focalGroup}`,
                classification: r.classification,
                delta: r.mhDelta.toFixed(3),
              })),
            },
            "dif.item.flagged"
          );
        } else {
          // Item is clear
          await prisma.item.update({
            where: { id: item.id },
            data: { difStatus: "CLEAR" },
          });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Unknown error";
        logger.warn({ itemId: item.id, error: reason }, "dif.analysis.failed");
      }
    }

    const durationMs = Date.now() - startedAt;
    const flagged = results.filter((r) => r.flagged).length;

    logger.info(
      {
        total: results.length,
        flagged,
        durationMs,
      },
      "dif.analysis.completed"
    );

    return {
      itemsAnalyzed: results.length,
      itemsFlagged: flagged,
      results,
    };
  }

  /**
   * Analyze item across all relevant demographic variables.
   * Returns array of DIF test results (one per group comparison).
   */
  private static async analyzeItemComprehensive(itemId: string): Promise<DifTestResult[]> {
    const allResults: DifTestResult[] = [];

    // Get item responses with candidate demographics
    const responses = await prisma.response.findMany({
      where: { itemId },
      select: {
        isCorrect: true,
        score: true,
        session: {
          select: {
            candidate: {
              select: {
                candidateProfile: {
                  select: {
                    gender: true,
                    nativeLanguage: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (responses.length < 50) return allResults;

    // Analyze by Gender
    const genderResults = await this.analyzeByVariable(
      itemId,
      responses,
      "gender",
      (r) => r.session.candidate.candidateProfile?.gender || "Unknown"
    );
    allResults.push(...genderResults);

    // Analyze by Native Language
    const l1Results = await this.analyzeByVariable(
      itemId,
      responses,
      "nativeLanguage",
      (r) => r.session.candidate.candidateProfile?.nativeLanguage || "Unknown"
    );
    allResults.push(...l1Results);

    // Note: ageGroup would require additional data in CandidateProfile
    // TODO: Implement after CandidateProfile migration

    return allResults;
  }

  /**
   * Analyze item for a specific demographic variable using proper stratified
   * Mantel-Haenszel analysis (ability-matched via session theta).
   *
   * DifAnalysisService.analyzeItemDif() stratifies candidates into K theta
   * quantile strata, builds 2×2 contingency tables per stratum, and computes
   * the Holland-Thayer MH chi-squared, odds ratio, delta (ETS scale), and
   * logistic regression DIF coefficients.
   */
  private static async analyzeByVariable(
    itemId: string,
    responses: Array<{
      isCorrect: boolean | null;
      score: number | null;
      session: { candidate: { candidateProfile: { gender: string | null; nativeLanguage: string | null } | null } };
    }>,
    variable: "gender" | "nativeLanguage" | "ageGroup",
    groupExtractor: (r: (typeof responses)[0]) => string
  ): Promise<DifTestResult[]> {
    const results: DifTestResult[] = [];

    // Tally group sizes to identify reference group (largest N)
    const groupCounts = new Map<string, number>();
    for (const response of responses) {
      const key = groupExtractor(response);
      groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
    }

    // Require ≥10 responses per group
    const validGroups = Array.from(groupCounts.entries())
      .filter(([, n]) => n >= 10)
      .map(([key]) => key);

    if (validGroups.length < 2) return results;

    // Largest group is reference (maximises power)
    const referenceGroup = validGroups.reduce((prev, cur) =>
      (groupCounts.get(cur) ?? 0) > (groupCounts.get(prev) ?? 0) ? cur : prev
    );

    // Run proper ability-stratified MH for each focal group
    for (const focalGroup of validGroups) {
      if (focalGroup === referenceGroup) continue;

      try {
        const difResult = await DifAnalysisService.analyzeItemDif(
          itemId,
          variable,
          referenceGroup,
          focalGroup,
          5  // 5 theta-quantile strata (standard for CAT DIF)
        );

        results.push({
          itemId,
          variable,
          referenceGroup,
          focalGroup,
          referenceN: difResult.referenceN,
          focalN: difResult.focalN,
          mhOddsRatio: difResult.mhOddsRatio,
          mhDelta: difResult.mhDelta,
          chiSquared: difResult.chiSquared,
          pValue: difResult.pValue,
          classification: difResult.classification,
          logisticUniformDif: difResult.logisticUniformDif,
          logisticNonUniformDif: difResult.logisticNonUniformDif,
        });
      } catch (err) {
        logger.warn(
          { itemId, variable, referenceGroup, focalGroup },
          "dif.test.failed"
        );
      }
    }

    return results;
  }

  /**
   * Get worst (highest severity) classification from array of results.
   */
  private static getWorstClassification(
    results: DifTestResult[]
  ): "A" | "B" | "C" {
    const hasC = results.some((r) => r.classification === "C");
    if (hasC) return "C";

    const hasB = results.some((r) => r.classification === "B");
    if (hasB) return "B";

    return "A";
  }
}
