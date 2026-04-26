/**
 * Anchor Calibration Runner
 *
 * Periodic job that re-scores the anchor item corpus against the live AI
 * scoring pipeline and raises a Sentry alarm if the result fails the drift
 * thresholds (MAE > 0.08, RMSE > 0.12, Pearson r < 0.85).
 *
 * Designed to be run from:
 *   - GitHub Actions weekly cron (.github/workflows/anchor-calibration.yml)
 *   - A manual `npm run anchor:calibrate` invocation
 *   - A scheduled Render / Fly cron task
 *
 * Exit codes:
 *   0 — calibration ran and met all thresholds (or anchor set was empty)
 *   1 — calibration failed thresholds OR an unexpected error occurred
 *
 * Required environment:
 *   DATABASE_URL    — for the Prisma client (anchor set lives in SystemConfig)
 *   GEMINI_API_KEY  — for live scoring of anchor responses
 *   SENTRY_DSN      — optional; alarms are silently suppressed when unset
 */

import { AnchorCalibrationService, type AnchorCalibrationResult } from "../src/lib/scoring/anchor-calibration-service.js";
import { logger, captureException, Sentry } from "../src/lib/observability/index.js";

export interface RunnerDecision {
  exitCode: 0 | 1;
  alertSeverity: "none" | "info" | "warning" | "error";
  alertMessage: string | null;
}

/**
 * Pure decision function: given a calibration result, decide what to do.
 * Extracted so the runner's branching can be unit-tested without DB / Sentry.
 */
export function evaluateCalibrationResult(
  result: AnchorCalibrationResult
): RunnerDecision {
  if (result.totalItems === 0) {
    return {
      exitCode: 0,
      alertSeverity: "info",
      alertMessage: "Anchor corpus is empty — calibration skipped.",
    };
  }
  if (result.scoredItems === 0) {
    return {
      exitCode: 1,
      alertSeverity: "error",
      alertMessage:
        `Anchor calibration could not score any of ${result.totalItems} items ` +
        `(probable AI scoring outage).`,
    };
  }
  if (!result.meetsThreshold) {
    return {
      exitCode: 1,
      alertSeverity: "error",
      alertMessage:
        `Anchor calibration FAILED thresholds: ` +
        `MAE=${result.mae}, RMSE=${result.rmse}, r=${result.pearsonR}, ` +
        `bias=${result.biasDirection}. ` +
        `Targets: MAE ≤ 0.08, RMSE ≤ 0.12, r ≥ 0.85.`,
    };
  }
  return {
    exitCode: 0,
    alertSeverity: "none",
    alertMessage: null,
  };
}

async function main(): Promise<void> {
  let result: AnchorCalibrationResult;
  try {
    logger.info("Anchor calibration runner started");
    result = await AnchorCalibrationService.runCalibration(
      Number(process.env.ANCHOR_CONCURRENCY ?? 3)
    );
  } catch (err) {
    captureException(err as Error, { context: "anchor-calibration-runner" });
    logger.error({ err }, "Anchor calibration crashed");
    process.exit(1);
  }

  const decision = evaluateCalibrationResult(result);
  logger.info(
    {
      mae: result.mae,
      rmse: result.rmse,
      pearsonR: result.pearsonR,
      bias: result.biasDirection,
      totalItems: result.totalItems,
      scoredItems: result.scoredItems,
      decision,
    },
    "Anchor calibration completed"
  );

  if (decision.alertSeverity === "error" && decision.alertMessage) {
    Sentry.captureMessage(decision.alertMessage, "error");
  } else if (decision.alertSeverity === "warning" && decision.alertMessage) {
    Sentry.captureMessage(decision.alertMessage, "warning");
  }

  process.exit(decision.exitCode);
}

// Only execute when run directly (not when imported by tests)
const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("anchor-calibration-runner.ts") ||
  process.argv[1]?.endsWith("anchor-calibration-runner.js");
if (invokedDirectly) {
  main();
}
