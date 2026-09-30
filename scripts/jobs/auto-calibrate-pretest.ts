#!/usr/bin/env tsx

/**
 * Nightly empirical calibration job for PRETEST items and ACTIVE items that
 * still carry cold-start prior parameters.
 *
 * Run via: npm run db:job:auto-calibrate
 * Or via cron: 0 2 * * * cd /app && npm run db:job:auto-calibrate
 *
 * The shared production pipeline uses only completed-session responses. It
 * promotes eligible PRETEST items and upgrades stable prior-based ACTIVE items
 * in place by setting metadata.paramSource to "calibrated".
 */

import { PretestCalibrationPipeline } from "../../src/lib/psychometrics/pretest-calibration-pipeline.js";
import { logger } from "../../src/lib/observability/logger.js";

async function main() {
  try {
    console.log("Starting empirical item calibration sweep...");
    const result = await PretestCalibrationPipeline.runCalibrationSweep({
      triggerSource: "CLI_JOB",
    });
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "auto-calibrate-pretest job failed");
    console.error("Job failed:", err);
    process.exit(1);
  }
}

main();
