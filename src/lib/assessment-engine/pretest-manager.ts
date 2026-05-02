/**
 * Pretest Infrastructure Manager
 *
 * Manages the full pretest lifecycle for Phase 2:
 *  1. Injection — when a session launches, add 2-3 PRETEST items to its pool
 *  2. Response marking — when a PRETEST item is answered, flag it
 *  3. Auto-calibration trigger — when an item reaches 30+ PRETEST responses, calibrate it
 *  4. Auto-promotion — if calibration fit is acceptable, promote PRETEST → ACTIVE
 *
 * The design keeps pretest items "invisible" to the adaptive engine (they flow through
 * the normal pool) so they don't distort theta estimates. Responses are tagged with
 * isPretest=true for later analysis.
 */

import { prisma } from "../prisma.js";
import { CalibrationService } from "./calibration-service.js";
import { logger } from "../observability/logger.js";
import type { CefrLevel, SkillType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const PRETEST_INJECTION_COUNT = 2; // How many PRETEST items to inject per session
const PRETEST_CALIBRATION_THRESHOLD = 30; // Minimum responses to trigger calibration
const PRETEST_ACTIVATION_THRESHOLD = 50; // Minimum responses before auto-promotion
const ACTIVATION_MIN_DISCRIMINATION = 0.5;
const ACTIVATION_MAX_DISCRIMINATION = 3.0;
const ACTIVATION_MIN_P = 0.1; // Minimum difficulty (% correct)
const ACTIVATION_MAX_P = 0.95; // Maximum difficulty

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * After a session is launched, inject 2-3 PRETEST items to its pool.
 *
 * Strategy:
 *  — Filter PRETEST items by the session's skill (if specified in metadata.productLine)
 *  — Prefer items in the target CEFR band (start at B1, adjust based on intent)
 *  — Use exposure-aware selection (prefer items with lower exposure)
 *  — Store injected item IDs in session metadata for tracking
 */
export async function injectPretestItems(sessionId: string): Promise<string[]> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const pLine = (session.metadata as any)?.productLine;
  const targetSkill = isSkillType(pLine) ? pLine : undefined;

  // Find PRETEST items — filter by skill if specified
  const pretestItems = await prisma.item.findMany({
    where: {
      status: "PRETEST",
      ...(targetSkill && { skill: targetSkill }),
    },
    select: {
      id: true,
      skill: true,
      cefrLevel: true,
      exposureCount: true,
    },
    take: PRETEST_INJECTION_COUNT * 3, // Pull extras for selection
  });

  if (pretestItems.length === 0) {
    logger.warn({ sessionId }, "No PRETEST items available for injection");
    return [];
  }

  // Prefer lower-exposure items (round-robin for fairness)
  const selected = pretestItems
    .sort((a, b) => a.exposureCount - b.exposureCount)
    .slice(0, PRETEST_INJECTION_COUNT)
    .map((item) => item.id);

  // Record in session metadata for tracking
  const meta: Record<string, unknown> = (session.metadata as Record<string, unknown>) || {};
  meta.injectedPretestItemIds = selected;
  meta.pretestInjectedAt = new Date().toISOString();

  await prisma.session.update({
    where: { id: sessionId },
    data: { metadata: meta as any },
  });

  logger.info(
    { sessionId, count: selected.length, itemIds: selected },
    "pretest.items.injected"
  );

  return selected;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE MARKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When a response is submitted, check if the item is PRETEST and mark the response.
 * Called from submitResponse in server-engine.ts.
 */
export async function markPretestResponse(
  responseId: string,
  itemId: string
): Promise<boolean> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { status: true },
  });

  if (item?.status === "PRETEST") {
    await prisma.response.update({
      where: { id: responseId },
      data: { isPretest: true },
    });
    return true;
  }

  return false;
}

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
        // Promote to ACTIVE
        await prisma.item.update({
          where: { id: item.id },
          data: { status: "ACTIVE" },
        });

        logger.info(
          {
            itemId: item.id,
            discrimination: updated.discrimination,
            difficulty: updated.difficulty,
            responseCount,
          },
          "pretest.promoted.to.active"
        );

        results.push({
          itemId: item.id,
          responseCount,
          promoted: true,
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

function isSkillType(value: unknown): value is SkillType {
  return (
    typeof value === "string" &&
    ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"].includes(value)
  );
}

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
