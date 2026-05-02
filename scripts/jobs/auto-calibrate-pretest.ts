#!/usr/bin/env tsx

/**
 * Nightly auto-calibration job for PRETEST items.
 *
 * Run via: npm run db:job:auto-calibrate
 * Or via cron: 0 2 * * * cd /app && npm run db:job:auto-calibrate
 *
 * Finds all PRETEST items with sufficient responses (≥30) and:
 *  1. Fits IRT 2PL/3PL parameters using live response data
 *  2. Checks if the fit meets quality thresholds (discrimination, difficulty, p-value)
 *  3. Promotes to ACTIVE if acceptable
 *  4. Logs the result for monitoring
 */

import { autoCalibratePretestItems, getPretestStatistics } from "../../src/lib/assessment-engine/pretest-manager.js";
import { logger } from "../../src/lib/observability/logger.js";

async function main() {
  try {
    console.log("Starting nightly PRETEST auto-calibration job...");

    const before = await getPretestStatistics();
    console.log(`Before: ${before.totalPretestItems} PRETEST items, ${before.readyForCalibration} ready`);

    const result = await autoCalibratePretestItems();
    console.log(
      `Processed: ${result.processed} items, Promoted: ${result.promoted}, Failed: ${result.failed}`
    );

    const after = await getPretestStatistics();
    console.log(`After: ${after.totalPretestItems} PRETEST items, ${after.readyForCalibration} ready`);

    console.log("\nDetailed results:");
    result.results.forEach((r) => {
      console.log(
        `  ${r.itemId}: ${r.responseCount} responses → ${r.promoted ? "✓ PROMOTED" : `✗ ${r.reason}`}`
      );
    });

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "auto-calibrate-pretest job failed");
    console.error("Job failed:", err);
    process.exit(1);
  }
}

main();
