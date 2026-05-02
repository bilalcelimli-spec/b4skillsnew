#!/usr/bin/env tsx

/**
 * Nightly DIF Detection Job (Phase 3, Task 2)
 *
 * Run via: npm run db:job:detect-dif
 * Or via cron: 0 2 * * * cd /app && npm run db:job:detect-dif
 *
 * Detects Differential Item Functioning for ACTIVE items.
 * Flags items that perform differently across:
 *  - Gender (M/F/Other)
 *  - Native Language (L1)
 *  - Age Group
 */

import { BatchDifDetectionService } from "../../src/lib/psychometrics/batch-dif-detection.js";
import { logger } from "../../src/lib/observability/logger.js";

async function main() {
  try {
    console.log("Starting nightly DIF detection job...");

    const result = await BatchDifDetectionService.runFullDifAnalysis();

    console.log(
      `Analyzed: ${result.itemsAnalyzed} items, Flagged: ${result.itemsFlagged}`
    );

    if (result.itemsFlagged > 0) {
      console.log("\nFlagged items:");
      result.results
        .filter((r) => r.flagged)
        .forEach((r) => {
          console.log(`  ${r.itemId}: ${r.responseCount} responses`);
        });
    }

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "dif-detection job failed");
    console.error("Job failed:", err);
    process.exit(1);
  }
}

main();
