/**
 * Pretest Infrastructure Manager
 *
 * Pretest items reach candidates through the engine's own slot logic
 * (engine.ts + pretest-selection.ts); responses are tagged isPretest, and
 * exposureCount is incremented in server-engine.ts each time an item is served.
 * This module only holds the calibration and promotion side:
 *  1. Auto-calibration trigger — when an item reaches 30+ PRETEST responses, calibrate it
 *  2. Promotion — PRETEST → ACTIVE happens only when a draft ItemParameterVersion
 *     that passes the publish gate is published (item-parameter-versions.ts).
 *     `autoCalibratePretestItems` therefore reports readiness and never changes status.
 */

import { prisma } from "../prisma.js";
import { CalibrationService } from "./calibration-service.js";
import { logger } from "../observability/logger.js";
import { CALIBRATION_POLICY } from "../psychometrics/calibration-policy.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

// Faz 2: a single policy (calibration-policy.ts) replaces the former 30 / 50 thresholds.
const PRETEST_CALIBRATION_THRESHOLD = CALIBRATION_POLICY.estimateMinN;
const PRETEST_ACTIVATION_THRESHOLD = CALIBRATION_POLICY.publishMinN;
const ACTIVATION_MIN_DISCRIMINATION = CALIBRATION_POLICY.aRange.min;
const ACTIVATION_MAX_DISCRIMINATION = CALIBRATION_POLICY.aRange.max;
const ACTIVATION_MIN_P = 0.1; // Minimum difficulty (% correct)
const ACTIVATION_MAX_P = 0.95; // Maximum difficulty

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-CALIBRATION JOB (nightly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Batch calibration job — run nightly (via cron).
 *
 * For each PRETEST item:
 *   1. Count responses
 *   2. If ≥ threshold, fit IRT 2PL/3PL
 *   3. Check if fit is good (discrimination, difficulty, p-value)
 *   4. If acceptable, promote to ACTIVE
 *   5. Log result
 */
export async function autoCalibratePretestItems(): Promise<{
  processed: number;
  promoted: number;
  failed: number;
  results: Array<{
    itemId: string;
    responseCount: number;
    promoted: boolean;
    reason?: string;
  }>;
}> {
  const startedAt = Date.now();
  const results: Array<{
    itemId: string;
    responseCount: number;
    promoted: boolean;
    reason?: string;
  }> = [];

  // Find all PRETEST items
  const pretestItems = await prisma.item.findMany({
    where: { status: "PRETEST" },
    select: { id: true, organizationId: true },
  });

  for (const item of pretestItems) {
    const responseCount = await prisma.response.count({
      where: {
        itemId: item.id,
        isPretest: true,
      },
    });

    // Too few responses — skip
    if (responseCount < PRETEST_CALIBRATION_THRESHOLD) {
      results.push({
        itemId: item.id,
        responseCount,
        promoted: false,
        reason: `Below threshold (${responseCount} < ${PRETEST_CALIBRATION_THRESHOLD})`,
      });
      continue;
    }

    try {
      // Fit IRT parameters
      await CalibrationService.recalibrateItem(item.id);

      // Fetch updated item (now has fitted a, b, c)
      const updated = await prisma.item.findUnique({
        where: { id: item.id },
      });

      if (!updated) {
        results.push({
          itemId: item.id,
          responseCount,
          promoted: false,
          reason: "Item not found after calibration",
        });
        continue;
      }

      // Check acceptance criteria
      const acceptable = checkActivationCriteria(
        updated,
        responseCount
      );

      if (acceptable.passed) {
        // Faz 2: readiness only. Promotion happens when the draft version is published.
        logger.info(
          { itemId: item.id, discrimination: updated.discrimination, difficulty: updated.difficulty, responseCount },
          "pretest.ready.for.publication"
        );
        results.push({
          itemId: item.id,
          responseCount,
          promoted: false,
          reason: "READY_FOR_PUBLICATION",
        });
      } else {
        results.push({
          itemId: item.id,
          responseCount,
          promoted: false,
          reason: acceptable.reason,
        });
      }
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Unknown calibration error";
      logger.warn(
        { itemId: item.id, responseCount, error: reason },
        "pretest.calibration.failed"
      );

      results.push({
        itemId: item.id,
        responseCount,
        promoted: false,
        reason,
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  const promoted = results.filter((r) => r.promoted).length;
  const failed = results.filter((r) => !r.promoted && r.reason).length;

  logger.info(
    {
      total: results.length,
      promoted,
      failed,
      durationMs,
      summary: results,
    },
    "pretest.auto.calibration.completed"
  );

  return {
    processed: results.length,
    promoted,
    failed,
    results,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────


export function checkActivationCriteria(
  item: { discrimination: number; difficulty: number; guessing: number },
  responseCount: number
): { passed: boolean; reason?: string } {
  // Must have enough responses to be confident
  if (responseCount < PRETEST_ACTIVATION_THRESHOLD) {
    return {
      passed: false,
      reason: `Insufficient responses (${responseCount} < ${PRETEST_ACTIVATION_THRESHOLD})`,
    };
  }

  // Discrimination (a) must be in acceptable range
  if (item.discrimination < ACTIVATION_MIN_DISCRIMINATION) {
    return {
      passed: false,
      reason: `Discrimination too low (${item.discrimination.toFixed(2)} < ${ACTIVATION_MIN_DISCRIMINATION})`,
    };
  }
  if (item.discrimination > ACTIVATION_MAX_DISCRIMINATION) {
    return {
      passed: false,
      reason: `Discrimination too high (${item.discrimination.toFixed(2)} > ${ACTIVATION_MAX_DISCRIMINATION})`,
    };
  }

  // Difficulty (b) should be reasonable (not all easy, not all hard)
  // For a given set of responses, compute empirical p-value
  // This is handled post-calibration in CalibrationService

  return { passed: true };
}

/**
 * Get pretest statistics for dashboard / monitoring.
 */
export async function getPretestStatistics() {
  const pretestItems = await prisma.item.findMany({
    where: { status: "PRETEST" },
    select: {
      id: true,
      skill: true,
      cefrLevel: true,
      discrimination: true,
      difficulty: true,
    },
  });

  const responsesByItem = await Promise.all(
    pretestItems.map(async (item) => {
      const count = await prisma.response.count({
        where: { itemId: item.id, isPretest: true },
      });
      return { itemId: item.id, responseCount: count };
    })
  );

  return {
    totalPretestItems: pretestItems.length,
    itemDetails: pretestItems,
    responses: responsesByItem,
    readyForCalibration: responsesByItem.filter(
      (r) => r.responseCount >= PRETEST_CALIBRATION_THRESHOLD
    ).length,
    readyForPromotion: responsesByItem.filter(
      (r) => r.responseCount >= PRETEST_ACTIVATION_THRESHOLD
    ).length,
  };
}
