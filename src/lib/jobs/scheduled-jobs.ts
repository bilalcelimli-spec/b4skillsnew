/**
 * Scheduled Jobs — LinguAdapt Platform
 *
 * Runs in-process using `setInterval`. Jobs are guarded so that:
 *   1. Only one instance runs at a time (re-entrancy guard).
 *   2. Each job fires on server startup (after a short delay) and then on schedule.
 *   3. Errors inside a job never crash the process — they are logged and the next
 *      scheduled run proceeds normally.
 *
 * Schedule defaults (overridable via env vars):
 *   JOBS_DIF_INTERVAL_MS        — DIF batch detection  (default: 7 days)
 *   JOBS_RETIREMENT_INTERVAL_MS — Item retirement scan  (default: 7 days)
 *   JOBS_STARTUP_DELAY_MS       — Wait before first run (default: 60 s)
 */

import { logger } from "../observability/index.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function ms(envKey: string, fallback: number): number {
  const val = Number(process.env[envKey]);
  return Number.isFinite(val) && val > 0 ? val : fallback;
}

// ─── Re-entrancy guards ───────────────────────────────────────────────────────
let difRunning = false;
let retirementRunning = false;

// ─── DIF Batch Detection ──────────────────────────────────────────────────────

async function runDifDetection(): Promise<void> {
  if (difRunning) {
    logger.info("scheduled-jobs: DIF detection already running — skipping");
    return;
  }
  difRunning = true;
  const t0 = Date.now();
  logger.info("scheduled-jobs: DIF batch detection starting");
  try {
    const { BatchDifDetectionService } = await import(
      "../psychometrics/batch-dif-detection.js"
    );
    const result = await BatchDifDetectionService.runFullDifAnalysis();
    logger.info(
      { itemsAnalyzed: result.itemsAnalyzed, itemsFlagged: result.itemsFlagged, ms: Date.now() - t0 },
      "scheduled-jobs: DIF batch detection complete"
    );
  } catch (err) {
    logger.error({ err }, "scheduled-jobs: DIF batch detection failed");
  } finally {
    difRunning = false;
  }
}

// ─── Item Retirement Scan ─────────────────────────────────────────────────────

async function runItemRetirement(): Promise<void> {
  if (retirementRunning) {
    logger.info("scheduled-jobs: item retirement scan already running — skipping");
    return;
  }
  retirementRunning = true;
  const t0 = Date.now();
  logger.info("scheduled-jobs: item retirement scan starting");
  try {
    const { prisma } = await import("../prisma.js");
    const { ItemRetirementService } = await import(
      "../assessment-engine/item-retirement-service.js"
    );
    // Evaluate all ACTIVE items
    const items = await prisma.item.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    let retired = 0;
    let flagged = 0;
    for (const item of items) {
      try {
        const result = await ItemRetirementService.computeRetirementScore(item.id);
        if ((result as any)?.action === "RETIRE") retired++;
        else if ((result as any)?.action === "FLAG") flagged++;
      } catch {
        // Skip individual item errors
      }
    }
    logger.info(
      { total: items.length, retired, flagged, ms: Date.now() - t0 },
      "scheduled-jobs: item retirement scan complete"
    );
  } catch (err) {
    logger.error({ err }, "scheduled-jobs: item retirement scan failed");
  } finally {
    retirementRunning = false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

let started = false;

/**
 * Start all scheduled jobs. Safe to call multiple times — subsequent calls are no-ops.
 */
export function startScheduledJobs(): void {
  if (started) return;
  started = true;

  const startupDelay = ms("JOBS_STARTUP_DELAY_MS", 60_000);
  const difInterval  = ms("JOBS_DIF_INTERVAL_MS",  SEVEN_DAYS_MS);
  const retInterval  = ms("JOBS_RETIREMENT_INTERVAL_MS", SEVEN_DAYS_MS);

  logger.info(
    { startupDelay, difIntervalDays: difInterval / 86_400_000, retIntervalDays: retInterval / 86_400_000 },
    "scheduled-jobs: registering scheduled jobs"
  );

  // Fire once after startup delay, then on schedule
  setTimeout(() => {
    runDifDetection();
    setInterval(runDifDetection, difInterval);
  }, startupDelay);

  setTimeout(() => {
    runItemRetirement();
    setInterval(runItemRetirement, retInterval);
  }, startupDelay + 5_000); // Stagger by 5 s to avoid simultaneous DB load
}
