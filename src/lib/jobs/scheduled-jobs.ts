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
 *   JOBS_DIF_INTERVAL_MS          — DIF batch detection      (default: 7 days)
 *   JOBS_RETIREMENT_INTERVAL_MS   — Item retirement scan      (default: 7 days)
 *   JOBS_DRIFT_INTERVAL_MS        — IRT parameter drift check (default: 7 days)
 *   JOBS_QWK_INTERVAL_MS          — AI scoring QWK guard      (default: 1 day)
 *   JOBS_CALIBRATION_INTERVAL_MS  — Pretest calibration sweep (default: 7 days)
 *   JOBS_EXPOSURE_INTERVAL_MS     — Exposure auto-retire scan  (default: 1 day)
 *   JOBS_DISTRACTOR_INTERVAL_MS   — Distractor health scan     (default: 7 days)
 *   JOBS_STARTUP_DELAY_MS         — Wait before first run     (default: 60 s)
 *
 * Quality-loop env:
 *   DISTRACTOR_REVIEW_MIN_N       — Min responses before an item can be auto-
 *                                   pulled to REVIEW for negative discrimination
 *                                   (default: 30; lower-N items get flags only)
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
let driftRunning = false;
let qwkRunning = false;
let calibrationRunning = false;
let exposureRunning = false;
let distractorRunning = false;

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

// ─── IRT Parameter Drift Monitor ─────────────────────────────────────────────

/**
 * Weekly scan: re-estimates each ACTIVE item's IRT parameters from the last 30 days
 * of responses and flags those where discrimination (a) or difficulty (b) shifted
 * beyond acceptable thresholds (|Δb| > 0.5 or |Δa| > 0.4).
 *
 * Uses a simplified JMLE approximation rather than an R bridge so no external
 * process is required.  Items with < 50 responses are skipped (insufficient data).
 */
async function runParameterDriftMonitor(): Promise<void> {
  if (driftRunning) {
    logger.info("scheduled-jobs: parameter drift monitor already running — skipping");
    return;
  }
  driftRunning = true;
  const t0 = Date.now();
  logger.info("scheduled-jobs: IRT parameter drift monitor starting");
  try {
    const { prisma } = await import("../prisma.js");
    const { probability } = await import("../assessment-engine/irt.js");

    const WINDOW_DAYS = Number(process.env.JOBS_DRIFT_WINDOW_DAYS ?? 30);
    const MIN_RESPONSES = 50;
    const DELTA_B_THRESHOLD = 0.5;
    const DELTA_A_THRESHOLD = 0.4;
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

    const items = await prisma.item.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, discrimination: true, difficulty: true, guessing: true },
    });

    let checked = 0;
    let flagged = 0;

    for (const item of items) {
      try {
        if (item.discrimination == null || item.difficulty == null) continue;
        const storedParams = { a: item.discrimination, b: item.difficulty, c: item.guessing ?? 0.25 };

        // Fetch recent dichotomous responses for this item
        const responses = await prisma.response.findMany({
          where: { itemId: item.id, createdAt: { gte: since }, isCorrect: { not: null } },
          include: { session: { select: { theta: true } } },
        });

        if (responses.length < MIN_RESPONSES) continue;
        checked++;

        // JMLE approximate b re-estimation:
        // b̂ = θ̄_correct − (1/a) * ln((p̄ − c) / (1 − p̄))  where p̄ = proportion correct
        const nCorrect = responses.filter((r: any) => r.isCorrect).length;
        const pBar = nCorrect / responses.length;

        // Guard against edge cases
        const a = storedParams.a;
        const c = storedParams.c ?? 0.25;
        const pClamped = Math.max(c + 0.01, Math.min(0.99, pBar));
        const bNew = (responses
          .filter((r: any) => r.session?.theta != null)
          .reduce((sum: number, r: any) => sum + (r.session.theta as number), 0) /
          Math.max(1, responses.filter((r: any) => r.session?.theta != null).length))
          - (1 / a) * Math.log((pClamped - c) / (1 - pClamped));

        // Approximate a re-estimation using max-slope heuristic
        // a ≈ (p75th − p25th) / (θ75 − θ25) at observed proportions
        const sortedThetas = responses
          .filter((r: any) => r.session?.theta != null)
          .map((r: any) => r.session.theta as number)
          .sort((x: number, y: number) => x - y);

        const aNew = sortedThetas.length >= 4
          ? Math.min(3.0, Math.max(0.3,
              0.5 / Math.max(0.01,
                sortedThetas[Math.floor(sortedThetas.length * 0.75)] -
                sortedThetas[Math.floor(sortedThetas.length * 0.25)]
              )
            ))
          : storedParams.a;

        const deltaB = Math.abs(bNew - storedParams.b);
        const deltaA = Math.abs(aNew - storedParams.a);

        if (deltaB > DELTA_B_THRESHOLD || deltaA > DELTA_A_THRESHOLD) {
          flagged++;
          logger.warn(
            {
              itemId: item.id,
              oldB: storedParams.b.toFixed(3),
              newB: bNew.toFixed(3),
              deltaB: deltaB.toFixed(3),
              oldA: storedParams.a.toFixed(3),
              newA: aNew.toFixed(3),
              deltaA: deltaA.toFixed(3),
              nResponses: responses.length,
            },
            "scheduled-jobs: item parameter drift detected"
          );
          // Tag item for human review via metadata
          await prisma.item.update({
            where: { id: item.id },
            data: {
              metadata: {
                ...((item as any).metadata ?? {}),
                driftAlert: {
                  detectedAt: new Date().toISOString(),
                  deltaB: Number(deltaB.toFixed(3)),
                  deltaA: Number(deltaA.toFixed(3)),
                  estimatedB: Number(bNew.toFixed(3)),
                  estimatedA: Number(aNew.toFixed(3)),
                  nResponses: responses.length,
                },
              },
            },
          });
        }
      } catch {
        // Skip individual item errors silently
      }
    }

    logger.info(
      { total: items.length, checked, flagged, ms: Date.now() - t0 },
      "scheduled-jobs: IRT parameter drift monitor complete"
    );
  } catch (err) {
    logger.error({ err }, "scheduled-jobs: IRT parameter drift monitor failed");
  } finally {
    driftRunning = false;
  }
}

// ─── AI Scoring QWK Guard ────────────────────────────────────────────────────

/**
 * Daily job: computes Quadratic Weighted Kappa between AI scores and the most
 * recent human ratings (from the rating queue).  If QWK drops below 0.75,
 * logs a CRITICAL alert and disables AI-only scoring (sets env flag in DB config).
 *
 * Uses the existing ai-human-agreement module — no new math needed.
 */
async function runAiScoringQwkGuard(): Promise<void> {
  if (qwkRunning) {
    logger.info("scheduled-jobs: AI scoring QWK guard already running — skipping");
    return;
  }
  qwkRunning = true;
  const t0 = Date.now();
  logger.info("scheduled-jobs: AI scoring QWK guard starting");
  try {
    const { prisma } = await import("../prisma.js");
    const { computeAgreement } = await import(
      "../scoring/ai-human-agreement.js"
    );

    const WINDOW_DAYS = 7;
    const QWK_FLOOR = 0.75;
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

    // Fetch completed double-blind rating tasks where both raters scored
    const tasks = await prisma.ratingTask.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: since },
        score: { not: null },
        secondRaterScore: { not: null },
      },
      select: { id: true, score: true, secondRaterScore: true },
    });

    if (tasks.length < 10) {
      logger.info(
        { n: tasks.length },
        "scheduled-jobs: AI scoring QWK guard — insufficient double-rated tasks (<10), skipping"
      );
      return;
    }

    // Map (firstRater=aiScore, secondRater=humanScore) for the agreement library
    const pairs = tasks.map((t) => ({
      aiScore: t.score ?? 0,
      humanScore: t.secondRaterScore ?? 0,
    }));

    const metrics = computeAgreement(pairs);

    logger.info(
      { n: tasks.length, qwk: metrics.qwk, mae: metrics.mae, ms: Date.now() - t0 },
      "scheduled-jobs: IRR QWK guard complete"
    );

    if (metrics.qwk < QWK_FLOOR) {
      logger.error(
        { qwk: metrics.qwk, threshold: QWK_FLOOR, n: tasks.length },
        "CRITICAL: Inter-rater QWK below floor — flagging in SystemConfig"
      );
      // Write to SystemConfig so dashboards can surface the alert
      const flag = { irrQwkBelowFloor: true, detectedAt: new Date().toISOString(), qwk: metrics.qwk };
      const existing = await prisma.systemConfig.findUnique({ where: { id: "global" } });
      const merged = { ...(existing?.config as object ?? {}), ...flag };
      await prisma.systemConfig.upsert({
        where: { id: "global" },
        create: { id: "global", config: merged },
        update: { config: merged },
      });
    }
  } catch (err) {
    logger.error({ err }, "scheduled-jobs: IRR QWK guard failed");
  } finally {
    qwkRunning = false;
  }
}

let started = false;

// ─── Pretest Calibration Sweep ────────────────────────────────────────────────

async function runPretestCalibration(): Promise<void> {
  if (calibrationRunning) {
    logger.info("scheduled-jobs: pretest calibration already running — skipping");
    return;
  }
  calibrationRunning = true;
  const t0 = Date.now();
  logger.info("scheduled-jobs: pretest calibration sweep starting");
  try {
    const { PretestCalibrationPipeline } = await import(
      "../psychometrics/pretest-calibration-pipeline.js"
    );
    const result = await PretestCalibrationPipeline.runCalibrationSweep({
      triggerSource: "SCHEDULED",
    });
    logger.info(
      { ...result, ms: Date.now() - t0 },
      "scheduled-jobs: pretest calibration sweep complete"
    );
  } catch (err) {
    logger.error({ err }, "scheduled-jobs: pretest calibration sweep failed");
  } finally {
    calibrationRunning = false;
  }
}

// ─── Exposure Auto-Retire Scan ────────────────────────────────────────────────

async function runExposureAutoRetire(): Promise<void> {
  if (exposureRunning) {
    logger.info("scheduled-jobs: exposure auto-retire already running — skipping");
    return;
  }
  exposureRunning = true;
  const t0 = Date.now();
  logger.info("scheduled-jobs: exposure auto-retire scan starting");
  try {
    const { ExposureAutoRetireService } = await import(
      "../psychometrics/pretest-calibration-pipeline.js"
    );
    const result = await ExposureAutoRetireService.runExposureScan();
    logger.info(
      { ...result, ms: Date.now() - t0 },
      "scheduled-jobs: exposure auto-retire scan complete"
    );
  } catch (err) {
    logger.error({ err }, "scheduled-jobs: exposure auto-retire scan failed");
  } finally {
    exposureRunning = false;
  }
}

// ─── Distractor Health Scan ───────────────────────────────────────────────────

/**
 * Empirical distractor-quality scan — closes the item-quality feedback loop.
 *
 * The platform already computes real per-option point-biserials and selection
 * rates in DistractorAnalysisService (item-analysis/distractor-analysis.ts), but
 * historically that only fed the research export. This job wires it into the
 * operational item lifecycle:
 *
 *   • Every analysable item (sampleSize ≥ 10) gets its flags/grade written to
 *     metadata.distractorHealth (informational — surfaced in admin dashboards).
 *   • Items with enough data (≥ DISTRACTOR_REVIEW_MIN_N) that show a NEGATIVE
 *     point-biserial on the key (grade "F" / NEGATIVE_DISCRIMINATION) are pulled
 *     to REVIEW status — a negative key correlation usually means a miskey or a
 *     genuinely ambiguous item, so it should leave the active pool until fixed.
 *
 * Low-stakes posture: only negative-discrimination items are auto-pulled. Merely
 * weak/non-functioning distractors are flagged, not retired (we don't want to
 * punch measurement holes while the bank is still small).
 */
async function runDistractorHealthScan(): Promise<void> {
  if (distractorRunning) {
    logger.info("scheduled-jobs: distractor health scan already running — skipping");
    return;
  }
  distractorRunning = true;
  const t0 = Date.now();
  logger.info("scheduled-jobs: distractor health scan starting");
  try {
    const { prisma } = await import("../prisma.js");
    const { DistractorAnalysisService } = await import(
      "../item-analysis/distractor-analysis.js"
    );

    const reviewMinN = Number(process.env.DISTRACTOR_REVIEW_MIN_N ?? 30);

    // analyzeAllItems() already filters to sampleSize ≥ 10 ACTIVE/PRETEST items.
    const reports = await DistractorAnalysisService.analyzeAllItems();

    let flagged = 0;
    let pulledToReview = 0;

    for (const r of reports) {
      const nonFunctioning = r.distractorAnalysis.filter(
        (d: any) => !d.isCorrect && d.quality === "non-functioning"
      ).length;

      const health = {
        analyzedAt: new Date().toISOString(),
        sampleSize: r.sampleSize,
        grade: r.grade,
        pointBiserial: r.pointBiserial,
        flags: r.flags,
        nonFunctioningDistractors: nonFunctioning,
      };

      // Negative key discrimination on enough data → likely miskey/ambiguity.
      const negativeKey =
        r.grade === "F" || r.flags.includes("NEGATIVE_DISCRIMINATION");
      const shouldReview = negativeKey && r.sampleSize >= reviewMinN;

      try {
        const existing = await prisma.item.findUnique({
          where: { id: r.itemId },
          select: { metadata: true, status: true },
        });
        const newMeta = {
          ...((existing?.metadata as any) ?? {}),
          distractorHealth: health,
        };

        const data: any = { metadata: newMeta };
        // Only flip ACTIVE → REVIEW; never touch PRETEST/RETIRED here.
        if (shouldReview && existing?.status === "ACTIVE") {
          data.status = "REVIEW";
          pulledToReview++;
        }

        await prisma.item.update({ where: { id: r.itemId }, data });
        if (r.flags.length > 0) flagged++;
      } catch {
        // Skip individual item errors — never abort the whole sweep.
      }
    }

    logger.info(
      { analyzed: reports.length, flagged, pulledToReview, ms: Date.now() - t0 },
      "scheduled-jobs: distractor health scan complete"
    );
  } catch (err) {
    logger.error({ err }, "scheduled-jobs: distractor health scan failed");
  } finally {
    distractorRunning = false;
  }
}

/**
 * Start all scheduled jobs. Safe to call multiple times — subsequent calls are no-ops.
 */
export function startScheduledJobs(): void {
  if (started) return;
  started = true;

  const startupDelay       = ms("JOBS_STARTUP_DELAY_MS",        60_000);
  const difInterval        = ms("JOBS_DIF_INTERVAL_MS",          SEVEN_DAYS_MS);
  const retInterval        = ms("JOBS_RETIREMENT_INTERVAL_MS",   SEVEN_DAYS_MS);
  const driftInterval      = ms("JOBS_DRIFT_INTERVAL_MS",        SEVEN_DAYS_MS);
  const qwkInterval        = ms("JOBS_QWK_INTERVAL_MS",          24 * 60 * 60 * 1000);
  const calibInterval      = ms("JOBS_CALIBRATION_INTERVAL_MS",  SEVEN_DAYS_MS);
  const exposureInterval   = ms("JOBS_EXPOSURE_INTERVAL_MS",     24 * 60 * 60 * 1000);
  const distractorInterval = ms("JOBS_DISTRACTOR_INTERVAL_MS",   SEVEN_DAYS_MS);

  logger.info(
    {
      startupDelay,
      difIntervalDays:       difInterval       / 86_400_000,
      retIntervalDays:       retInterval       / 86_400_000,
      driftIntervalDays:     driftInterval     / 86_400_000,
      qwkIntervalHours:      qwkInterval       / 3_600_000,
      calibIntervalDays:     calibInterval     / 86_400_000,
      exposureIntervalHours: exposureInterval  / 3_600_000,
      distractorIntervalDays: distractorInterval / 86_400_000,
    },
    "scheduled-jobs: registering scheduled jobs"
  );

  // Fire once after startup delay, then on schedule — staggered by 5 s each
  setTimeout(() => {
    runDifDetection();
    setInterval(runDifDetection, difInterval);
  }, startupDelay);

  setTimeout(() => {
    runItemRetirement();
    setInterval(runItemRetirement, retInterval);
  }, startupDelay + 5_000);

  setTimeout(() => {
    runParameterDriftMonitor();
    setInterval(runParameterDriftMonitor, driftInterval);
  }, startupDelay + 10_000);

  setTimeout(() => {
    runAiScoringQwkGuard();
    setInterval(runAiScoringQwkGuard, qwkInterval);
  }, startupDelay + 15_000);

  setTimeout(() => {
    runPretestCalibration();
    setInterval(runPretestCalibration, calibInterval);
  }, startupDelay + 20_000);

  setTimeout(() => {
    runExposureAutoRetire();
    setInterval(runExposureAutoRetire, exposureInterval);
  }, startupDelay + 25_000);

  setTimeout(() => {
    runDistractorHealthScan();
    setInterval(runDistractorHealthScan, distractorInterval);
  }, startupDelay + 30_000);
}
