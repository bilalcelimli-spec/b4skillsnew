/**
 * Nightly Item Retirement Job (Phase 3)
 *
 * Run via: npm run db:job:retire-items
 * Or via cron: 0 1 * * * cd /app && npm run db:job:retire-items
 *
 * Scans all ACTIVE items with ≥100 responses and:
 *  1. Computes retirement score
 *  2. Flags items with score ≥ 0.60 for review
 *  3. Auto-retires items with score ≥ 0.70 AND declining trend
 *  4. Logs all actions to RetirementAuditLog
 *  5. Sends notifications to ASSESSMENT_DIRECTOR users
 */

import { prisma } from "../../src/lib/prisma.js";
import { ItemRetirementService } from "../../src/lib/assessment-engine/item-retirement-service.js";
import { logger } from "../../src/lib/observability/logger.js";

async function main() {
  try {
    console.log("Starting nightly item retirement analysis...");

    const result = await runRetirementAnalysis();

    console.log(
      `Analyzed: ${result.analyzed} items, Flagged: ${result.flagged}, Auto-retired: ${result.autoRetired}`
    );

    if (result.results.length > 0) {
      console.log("\nDetailed results:");
      result.results.forEach((r) => {
        const status = r.autoRetired ? "✓ AUTO-RETIRED" : `✗ FLAGGED (score: ${r.score.toFixed(3)})`;
        console.log(`  ${r.itemId}: ${status}`);
      });
    }

    // Send notification email (if configured)
    if (result.flagged > 0 || result.autoRetired > 0) {
      await notifyAssessmentDirectors(result);
    }

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "item-retirement job failed");
    console.error("Job failed:", err);
    process.exit(1);
  }
}

/**
 * Main retirement analysis job.
 */
async function runRetirementAnalysis(): Promise<{
  analyzed: number;
  flagged: number;
  autoRetired: number;
  results: Array<{
    itemId: string;
    score: number;
    flagged: boolean;
    autoRetired: boolean;
  }>;
}> {
  const startedAt = Date.now();
  const results: Array<{
    itemId: string;
    score: number;
    flagged: boolean;
    autoRetired: boolean;
  }> = [];

  const MIN_RESPONSES = 100;
  const GRACE_PERIOD_DAYS = 7;

  // Find ACTIVE items with ≥100 responses
  const activeItems = await prisma.item.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      organizationId: true,
      createdAt: true,
      retirementScore: true,
    },
  });

  // Count responses per item
  const itemResponseCounts = await Promise.all(
    activeItems.map(async (item) => {
      const count = await prisma.response.count({
        where: { itemId: item.id },
      });
      return { itemId: item.id, count, item };
    })
  );

  // Filter items with ≥100 responses
  const eligibleItems = itemResponseCounts
    .filter((r) => r.count >= MIN_RESPONSES)
    .map((r) => r.item);

  console.log(`Found ${eligibleItems.length} eligible items (≥${MIN_RESPONSES} responses)`);

  for (const item of eligibleItems) {
    try {
      // Compute retirement score
      const scoreResult = await ItemRetirementService.computeRetirementScore(item.id);
      const score = scoreResult.score;

      let flagged = false;
      let autoRetired = false;

      // Check if within grace period (min 7 days since activation)
      const daysSinceCreation = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const isInGracePeriod = daysSinceCreation < GRACE_PERIOD_DAYS;

      if (isInGracePeriod) {
        // Don't retire items within grace period
        console.log(`  ${item.id}: Grace period active (${daysSinceCreation.toFixed(1)} days), skipping`);
      } else if (score >= 0.7) {
        // Check for declining trend: compare last 7 days vs previous 7 days
        const trend = await checkDecliningTrend(item.id);

        if (trend.declining) {
          // Auto-retire with trend confirmation
          await prisma.item.update({
            where: { id: item.id },
            data: {
              status: "RETIRED",
              retiredAt: new Date(),
              retiredBy: "BATCH_JOB",
              retirementReason: scoreResult.reasoning,
              retirementScore: score,
            },
          });

          // Log audit entry
          await prisma.retirementAuditLog.create({
            data: {
              itemId: item.id,
              action: "AUTO_RETIRED",
              score,
              reason: `${scoreResult.reasoning}. Declining trend detected.`,
              triggeredBy: "BATCH_JOB",
              approvalStatus: "APPROVED",
              approvedBy: "BATCH_JOB",
              approvalDate: new Date(),
            },
          });

          autoRetired = true;

          logger.info(
            { itemId: item.id, score: score.toFixed(3), trend: trend },
            "item.auto.retired"
          );
        } else {
          // Flag for review (score high but no trend yet)
          await prisma.item.update({
            where: { id: item.id },
            data: {
              retirementScore: score,
            },
          });

          await prisma.retirementAuditLog.create({
            data: {
              itemId: item.id,
              action: "FLAGGED_FOR_REVIEW",
              score,
              reason: `${scoreResult.reasoning}. Score ≥ 0.70 but trend not confirmed yet.`,
              triggeredBy: "BATCH_JOB",
              approvalStatus: "PENDING",
            },
          });

          flagged = true;
        }
      } else if (score >= 0.6) {
        // Flag for review (score in review threshold)
        await prisma.item.update({
          where: { id: item.id },
          data: {
            retirementScore: score,
          },
        });

        await prisma.retirementAuditLog.create({
          data: {
            itemId: item.id,
            action: "FLAGGED_FOR_REVIEW",
            score,
            reason: scoreResult.reasoning,
            triggeredBy: "BATCH_JOB",
            approvalStatus: "PENDING",
          },
        });

        flagged = true;
      } else {
        // Score < 0.6: item is acceptable, update score for monitoring
        await prisma.item.update({
          where: { id: item.id },
          data: {
            retirementScore: score,
          },
        });
      }

      results.push({
        itemId: item.id,
        score,
        flagged,
        autoRetired,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      logger.warn({ itemId: item.id, error: reason }, "item.retirement.analysis.failed");

      results.push({
        itemId: item.id,
        score: 0,
        flagged: false,
        autoRetired: false,
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  const flagged = results.filter((r) => r.flagged).length;
  const autoRetired = results.filter((r) => r.autoRetired).length;

  logger.info(
    {
      total: results.length,
      flagged,
      autoRetired,
      durationMs,
    },
    "item.retirement.analysis.completed"
  );

  return {
    analyzed: results.length,
    flagged,
    autoRetired,
    results,
  };
}

/**
 * Check if item performance is declining (last 7 days worse than previous 7 days).
 */
async function checkDecliningTrend(itemId: string): Promise<{
  declining: boolean;
  recent7DayAvgScore: number;
  previous7DayAvgScore: number;
}> {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get responses from last 7 days
  const recent = await prisma.response.findMany({
    where: {
      itemId,
      createdAt: { gte: last7Days },
    },
    select: { score: true, isCorrect: true },
  });

  // Get responses from previous 7 days
  const previous = await prisma.response.findMany({
    where: {
      itemId,
      createdAt: { gte: last14Days, lt: last7Days },
    },
    select: { score: true, isCorrect: true },
  });

  if (recent.length < 10 || previous.length < 10) {
    // Not enough data for trend analysis
    return {
      declining: false,
      recent7DayAvgScore: 0,
      previous7DayAvgScore: 0,
    };
  }

  const recentAvg = recent.reduce((sum, r) => sum + (r.score ?? (r.isCorrect ? 1 : 0)), 0) / recent.length;
  const previousAvg = previous.reduce((sum, r) => sum + (r.score ?? (r.isCorrect ? 1 : 0)), 0) / previous.length;

  // Declining if recent < previous (performance got worse)
  return {
    declining: recentAvg < previousAvg - 0.1, // 10% difference threshold
    recent7DayAvgScore: recentAvg,
    previous7DayAvgScore: previousAvg,
  };
}

/**
 * Send notification to ASSESSMENT_DIRECTOR users.
 */
async function notifyAssessmentDirectors(result: {
  flagged: number;
  autoRetired: number;
  results: Array<{ itemId: string; score: number; autoRetired: boolean }>;
}): Promise<void> {
  // TODO: Implement email notification
  // For now, just log that notification would be sent
  logger.info(
    {
      flagged: result.flagged,
      autoRetired: result.autoRetired,
    },
    "item.retirement.notification.would.send"
  );
}

main();
