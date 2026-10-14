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
 *   0 — diagnostic drift checks met (never model release approval)
 *   1 — observed drift, scoring failure or unexpected error
 *   2 — reference evidence missing or incomplete
 *
 * Required environment:
 *   DATABASE_URL    — for the Prisma client (anchor set lives in SystemConfig)
 *   GEMINI_API_KEY  — for live scoring of anchor responses
 *   SENTRY_DSN      — optional; alarms are silently suppressed when unset
 */

import { AnchorCalibrationService, type AnchorCalibrationResult } from "../src/lib/scoring/anchor-calibration-service.js";
import { logger, captureException, Sentry } from "../src/lib/observability/index.js";

export interface RunnerDecision {
  exitCode: 0 | 1 | 2;
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
  if (!Number.isInteger(result.totalItems)||!Number.isInteger(result.scoredItems)||result.totalItems<0||result.scoredItems<0||result.scoredItems>result.totalItems) {
    return {exitCode:1,alertSeverity:'error',alertMessage:'Invalid anchor calibration counts.'};
  }
  if (result.totalItems === 0) {
    return {
      exitCode: 2,
      alertSeverity: "warning",
      alertMessage: "Anchor corpus is empty — calibration evidence is missing.",
    };
  }
  if (result.scoredItems === 0 && result.excludedItems?.length && result.excludedItems.every(item=>item.reasons.every(reason=>reason!=='AI_UNAVAILABLE'&&reason!=='AI_SCORING_FAILED'))) {
    return {exitCode:2,alertSeverity:'warning',alertMessage:'Anchor reference evidence is invalid; no model scores were eligible.'};
  }
  if (result.scoredItems === 0) {
    return {
      exitCode: 1,
      alertSeverity: "error",
      alertMessage:
        `Anchor calibration could not score any of ${result.totalItems} items ` +
        `(inspect excluded-item reason codes; failure is not a zero score).`,
    };
  }
  if(result.evidenceGaps?.length) return {exitCode:2,alertSeverity:'warning',alertMessage:`Anchor evidence incomplete: ${result.evidenceGaps.join(', ')}. Scored ${result.scoredItems}/${result.totalItems}; release is not approved.`};
  if(result.scoredItems!==result.totalItems) return {exitCode:1,alertSeverity:'error',alertMessage:'Anchor scoring is incomplete; a partial result cannot pass.'};
  if(result.mae===null||result.rmse===null||result.pearsonR===null) return {exitCode:2,alertSeverity:'warning',alertMessage:'Anchor metrics are undefined; reference variation is insufficient.'};
  if(!Number.isFinite(result.mae)||!Number.isFinite(result.rmse)||!Number.isFinite(result.pearsonR)||result.mae<0||result.mae>1||result.rmse<0||result.rmse>1||Math.abs(result.pearsonR)>1) return {exitCode:1,alertSeverity:'error',alertMessage:'Invalid anchor calibration metrics.'};
  if(result.bySkill){
    for(const skill of ['WRITING','SPEAKING']){
      const metric=result.bySkill[skill];
      if(!metric||!Number.isInteger(metric.n)||metric.n<30||metric.mae===null||metric.rmse===null||metric.pearsonR===null)
        return {exitCode:2,alertSeverity:'warning',alertMessage:`Anchor evidence is incomplete for ${skill}.`};
      if(!Number.isFinite(metric.mae)||!Number.isFinite(metric.rmse)||!Number.isFinite(metric.pearsonR)||metric.mae<0||metric.mae>.08||metric.rmse<0||metric.rmse>.12||metric.pearsonR<.85||metric.pearsonR>1)
        return {exitCode:1,alertSeverity:'error',alertMessage:`Anchor drift limits failed for ${skill}.`};
    }
  }
  if (!result.meetsThreshold || result.mae>.08 || result.rmse>.12 || result.pearsonR<.85) {
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
