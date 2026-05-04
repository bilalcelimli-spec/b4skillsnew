#!/usr/bin/env npx tsx
/**
 * DIF Audit Runner
 *
 * Runs a full Mantel-Haenszel + logistic regression DIF scan across all ACTIVE
 * items and writes results to:
 *   - stdout (JSON summary)
 *   - dif-audit-results.json (artifact picked up by CI)
 *
 * Exit codes:
 *   0 — no C-class (large) DIF found
 *   1 — one or more items with C-class DIF (alerts Sentry + fails CI gate)
 *   2 — runtime error
 */

import { writeFileSync } from "fs";
import { BatchDifDetectionService } from "../src/lib/psychometrics/batch-dif-detection.js";
import { prisma } from "../src/lib/prisma.js";

// Optional: Sentry for alerting
let Sentry: { captureMessage: (msg: string, level: string) => void } | null = null;
if (process.env.SENTRY_DSN) {
  try {
    // Dynamic import so the script works without @sentry/node installed
    const s = await import("@sentry/node");
    s.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV ?? "production" });
    Sentry = s as unknown as { captureMessage: (msg: string, level: string) => void };
    console.log("[dif-audit] Sentry initialised");
  } catch {
    console.warn("[dif-audit] @sentry/node not available — skipping Sentry init");
  }
}

const startedAt = new Date().toISOString();
let exitCode = 0;

try {
  console.log(`[dif-audit] Starting DIF audit at ${startedAt}`);

  const result = await BatchDifDetectionService.runFullDifAnalysis();

  const completedAt = new Date().toISOString();
  const output = {
    startedAt,
    completedAt,
    itemsAnalyzed: result.itemsAnalyzed,
    itemsFlagged: result.itemsFlagged,
    flagRate: result.itemsAnalyzed > 0
      ? Number((result.itemsFlagged / result.itemsAnalyzed).toFixed(4))
      : 0,
    results: result.results,
  };

  // Write artifact for CI upload
  writeFileSync("dif-audit-results.json", JSON.stringify(output, null, 2));

  // Print summary to stdout
  console.log(JSON.stringify({
    status: result.itemsFlagged > 0 ? "FLAGGED" : "CLEAN",
    itemsAnalyzed: result.itemsAnalyzed,
    itemsFlagged: result.itemsFlagged,
  }, null, 2));

  if (result.itemsFlagged > 0) {
    const flaggedIds = result.results
      .filter((r) => r.flagged)
      .map((r) => r.itemId)
      .join(", ");

    const msg = `[DIF audit] ${result.itemsFlagged} item(s) flagged with C-class DIF: ${flaggedIds}`;
    console.error(msg);

    if (Sentry) {
      Sentry.captureMessage(msg, "error");
    }

    exitCode = 1;
  }
} catch (err) {
  console.error("[dif-audit] Fatal error:", err);
  if (Sentry) {
    Sentry.captureMessage(`DIF audit crashed: ${String(err)}`, "fatal");
  }
  exitCode = 2;
} finally {
  await prisma.$disconnect();
}

process.exit(exitCode);
