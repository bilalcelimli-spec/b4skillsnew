/**
 * Pretest Calibration Pipeline
 *
 * Orchestrates end-to-end online calibration for PRETEST items:
 *
 *   1. Query all PRETEST items with ≥ MIN_N accumulated responses.
 *   2. Collect (θ, score) observations from completed sessions.
 *   3. Run one concurrent EM cycle per item (Stocking 1990).
 *   4. Persist results to CalibrationRun table.
 *   5. Record a DRAFT ItemParameterVersion with the publish-gate verdict
 *      (calibration-policy.ts). Publishing / promotion is explicit.
 *
 * Triggered by:
 *   - Scheduled job (weekly) — src/lib/jobs/scheduled-jobs.ts
 *   - Manual API — POST /api/psychometrics/calibration/run
 *
 * References
 * ──────────
 * Stocking, M.L. (1990). Specifying optimum examinees for summary statistics
 *   in item parameter estimation. Psychometrika, 55(3), 461-472.
 *
 * Wainer, H. et al. (2007). Computerized Adaptive Testing: A Primer.
 *   Erlbaum, ch. 8 (Online calibration).
 */

import { prisma } from "../prisma.js";
import { calibratePretestItem, type PretestObservation } from "./online-calibration.js";
import { logger } from "../observability/logger.js";
import type { IrtParameters } from "../assessment-engine/types.js";
import { CALIBRATION_POLICY } from "./calibration-policy.js";
import { createDraftVersion } from "./item-parameter-versions.js";
import { calibrateGrmItem, scoreToCategory } from "./grm-item-calibration.js";
import { rubricToGrmParams, type GrmParameters } from "./graded-response-model.js";

// ─── Config ──────────────────────────────────────────────────────────────────
// Faz 2: every threshold comes from calibration-policy.ts. The sweep records
// DRAFT ItemParameterVersions; publishing (and PRETEST → ACTIVE promotion) is a
// separate, explicit step — see item-parameter-versions.ts.

const MIN_N = CALIBRATION_POLICY.estimateMinN;

/** Exposure rate ceiling — items above this are auto-retired (Sympson-Hetter ψ threshold). */
const EXPOSURE_RETIRE_THRESHOLD = Number(process.env.EXPOSURE_RETIRE_PSI ?? 0.35);

/** Exposure rate warning level. */
const EXPOSURE_WARN_THRESHOLD = Number(process.env.EXPOSURE_WARN_PSI ?? 0.25);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalibrationPipelineResult {
  itemsEligible: number;       // Items with n ≥ MIN_N
  itemsCalibrated: number;     // Items that completed EM cycle
  itemsStable: number;         // Items where stable = true
  draftsCreated: number;       // DRAFT ItemParameterVersions written
  draftsEligible: number;      // drafts that pass the publish gate (awaiting publication)
  itemsRejected: number;       // Items where stable = false
  errors: number;              // Items that threw an exception
  durationMs: number;
}

export interface ExposureAutoRetireResult {
  itemsChecked: number;
  itemsWarned: number;
  itemsRetired: number;
  durationMs: number;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export class PretestCalibrationPipeline {
  /**
   * Run a full calibration sweep across all eligible PRETEST items.
   */
  static async runCalibrationSweep(
    options: { triggerSource?: string } = {}
  ): Promise<CalibrationPipelineResult> {
    const t0 = Date.now();
    const triggerSource = options.triggerSource ?? "SCHEDULED";

    const result: CalibrationPipelineResult = {
      itemsEligible: 0,
      itemsCalibrated: 0,
      itemsStable: 0,
      draftsCreated: 0,
      draftsEligible: 0,
      itemsRejected: 0,
      errors: 0,
      durationMs: 0,
    };

    // 1. Find all PRETEST items with enough responses
    // We load the IRT seed params (discrimination/difficulty/guessing) directly
    // and count pretest responses in a separate aggregation to avoid _count
    // filter limitations in some Prisma configurations.
    const pretestItems = await prisma.item.findMany({
      where: { status: "PRETEST" },
      select: {
        id: true,
        discrimination: true,
        difficulty: true,
        guessing: true,
      },
    });

    // Count pretest responses per item in one aggregation pass
    const responseCounts = await prisma.response.groupBy({
      by: ["itemId"],
      where: {
        item: { status: "PRETEST" },
        isPretest: true,
        session: { status: "COMPLETED" },
      },
      _count: { _all: true },
    });
    const countMap = new Map(responseCounts.map((r) => [r.itemId, r._count._all]));

    const eligible = pretestItems.filter((it) => (countMap.get(it.id) ?? 0) >= MIN_N);
    result.itemsEligible = eligible.length;

    logger.info(
      { total: pretestItems.length, eligible: eligible.length, triggerSource },
      "calibration-pipeline: starting sweep"
    );

    for (const item of eligible) {
      try {
        // 2. Collect observations: (theta from session, score from response)
        const responses = await prisma.response.findMany({
          where: {
            itemId: item.id,
            isPretest: true,
            isCorrect: { not: null },
            session: { status: "COMPLETED", theta: { not: null } },
          },
          select: {
            isCorrect: true,
            session: { select: { theta: true } },
          },
        });

        if (responses.length < MIN_N) continue; // re-check with join filter

        const observations: PretestObservation[] = responses
          .filter((r): r is typeof r & { session: { theta: number } } =>
            r.session?.theta != null && r.isCorrect != null
          )
          .map((r) => ({
            theta: r.session.theta,
            score: r.isCorrect ? 1 : (0 as 0 | 1),
          }));

        if (observations.length < MIN_N) continue;

        // 3. Determine current parameters (seed values from Item fields)
        const currentParams: IrtParameters = {
          a: item.discrimination ?? 1.0,
          b: item.difficulty ?? 0.0,
          c: item.guessing ?? 0.25,
        };

        // 4. Run EM cycle
        const calResult = calibratePretestItem(currentParams, observations, {
          minN: MIN_N,
        });

        result.itemsCalibrated++;

        // 5. Fetch previous best run for delta comparison
        const lastRun = await prisma.calibrationRun.findFirst({
          where: { itemId: item.id, stable: true },
          orderBy: { runAt: "desc" },
          select: { bEstimate: true, aEstimate: true, cEstimate: true },
        });

        // 6. Persist CalibrationRun record
        const run = await prisma.calibrationRun.create({
          data: {
            itemId: item.id,
            triggerSource,
            nResponses: observations.length,
            nPretest: observations.length,
            prevA: lastRun?.aEstimate ?? currentParams.a,
            prevB: lastRun?.bEstimate ?? currentParams.b,
            prevC: lastRun?.cEstimate ?? currentParams.c,
            aEstimate: calResult.params.a,
            bEstimate: calResult.params.b,
            cEstimate: calResult.params.c,
            deltaB: calResult.deltaB,
            deltaA: calResult.deltaA,
            logLikelihood: calResult.logLikelihood ?? null,
            stable: calResult.stable,
            rejectionReason: calResult.rejectionReason ?? null,
            promotedToActive: false,
          },
        });

        if (!calResult.stable) {
          result.itemsRejected++;
          logger.warn(
            { itemId: item.id, reason: calResult.rejectionReason, n: observations.length },
            "calibration-pipeline: item calibration rejected"
          );
          continue;
        }

        result.itemsStable++;

        // 7. Record a DRAFT version; publication (and PRETEST → ACTIVE) is explicit.
        const iq = await prisma.item.findUnique({ where: { id: item.id }, select: { iqScore: true } });
        const draft = await createDraftVersion(prisma, {
          itemId: item.id,
          a: calResult.params.a, b: calResult.params.b, c: calResult.params.c,
          aSe: calResult.aSe, bSe: calResult.bSe,
          n: observations.length,
          method: "STOCKING_EM",
          deltaB: lastRun ? Math.abs(calResult.params.b - lastRun.bEstimate) : null,
          iqScore: iq?.iqScore ?? null,
          sourceRunId: run.id,
          createdBy: `job:${triggerSource}`,
        });
        result.draftsCreated++;
        if (draft.gate.eligible) result.draftsEligible++;
        logger.info(
          { itemId: item.id, n: observations.length, version: draft.version, eligible: draft.gate.eligible, reasons: draft.gate.reasons },
          "calibration-pipeline: draft parameter version recorded"
        );
      } catch (err) {
        result.errors++;
        logger.error({ err, itemId: item.id }, "calibration-pipeline: error processing item");
      }
    }

    // ── Prior-param ACTIVE items ────────────────────────────────────────────
    // Items backfilled with cold-start norm priors (metadata.paramSource ===
    // "prior") are delivered operationally while still carrying *estimated*
    // rather than *calibrated* parameters. Once enough real (isPretest:false)
    // responses accumulate, replace the priors with empirical estimates and
    // re-tag paramSource → "calibrated". These items are already ACTIVE, so
    // there is no promotion step — a stable run upgrades the params in place.
    await PretestCalibrationPipeline._calibratePriorActiveItems(triggerSource, result);
    await PretestCalibrationPipeline._calibrateProductiveItems(triggerSource, result);

    result.durationMs = Date.now() - t0;

    logger.info(
      result,
      "calibration-pipeline: sweep complete"
    );

    return result;
  }

  /**
   * Calibrate ACTIVE items still on cold-start priors using their operational
   * (non-pretest) responses. Mutates `result` in place.
   */
  private static async _calibratePriorActiveItems(
    triggerSource: string,
    result: CalibrationPipelineResult
  ): Promise<void> {
    // Fetch ACTIVE items and keep only those tagged paramSource === "prior".
    // (JSON-path filtering varies by DB; filter in JS for portability — at pilot
    // scale the ACTIVE set is small.)
    const activeItems = await prisma.item.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        discrimination: true,
        difficulty: true,
        guessing: true,
        metadata: true,
        iqScore: true,
      },
    });
    const priorItems = activeItems.filter(
      (it) => (it.metadata as any)?.paramSource === "prior"
    );
    if (priorItems.length === 0) return;

    // Count operational responses per prior item in one pass.
    const counts = await prisma.response.groupBy({
      by: ["itemId"],
      where: {
        itemId: { in: priorItems.map((it) => it.id) },
        isPretest: false,
        session: { status: "COMPLETED" },
      },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((r) => [r.itemId, r._count._all]));
    const eligible = priorItems.filter((it) => (countMap.get(it.id) ?? 0) >= MIN_N);
    result.itemsEligible += eligible.length;

    logger.info(
      { priorActive: priorItems.length, eligible: eligible.length, triggerSource },
      "calibration-pipeline: prior-ACTIVE calibration pass"
    );

    for (const item of eligible) {
      try {
        const responses = await prisma.response.findMany({
          where: {
            itemId: item.id,
            isPretest: false,
            isCorrect: { not: null },
            session: { status: "COMPLETED", theta: { not: null } },
          },
          select: { isCorrect: true, session: { select: { theta: true } } },
        });

        const observations: PretestObservation[] = responses
          .filter((r): r is typeof r & { session: { theta: number } } =>
            r.session?.theta != null && r.isCorrect != null
          )
          .map((r) => ({ theta: r.session.theta, score: (r.isCorrect ? 1 : 0) as 0 | 1 }));

        if (observations.length < MIN_N) continue;

        const currentParams: IrtParameters = {
          a: item.discrimination ?? 1.0,
          b: item.difficulty ?? 0.0,
          c: item.guessing ?? 0.25,
        };

        const calResult = calibratePretestItem(currentParams, observations, { minN: MIN_N });
        result.itemsCalibrated++;

        const lastRun = await prisma.calibrationRun.findFirst({
          where: { itemId: item.id, stable: true },
          orderBy: { runAt: "desc" },
          select: { bEstimate: true, aEstimate: true, cEstimate: true },
        });

        await prisma.calibrationRun.create({
          data: {
            itemId: item.id,
            triggerSource,
            nResponses: observations.length,
            nPretest: 0,
            prevA: lastRun?.aEstimate ?? currentParams.a,
            prevB: lastRun?.bEstimate ?? currentParams.b,
            prevC: lastRun?.cEstimate ?? currentParams.c,
            aEstimate: calResult.params.a,
            bEstimate: calResult.params.b,
            cEstimate: calResult.params.c,
            deltaB: calResult.deltaB,
            deltaA: calResult.deltaA,
            logLikelihood: calResult.logLikelihood ?? null,
            stable: calResult.stable,
            rejectionReason: calResult.rejectionReason ?? null,
            promotedToActive: false,
          },
        });

        if (!calResult.stable) {
          result.itemsRejected++;
          continue;
        }

        result.itemsStable++;

        // Stable → record a DRAFT version; the Item keeps its prior until published.
        const draft = await createDraftVersion(prisma, {
          itemId: item.id,
          a: calResult.params.a, b: calResult.params.b, c: calResult.params.c,
          aSe: calResult.aSe, bSe: calResult.bSe,
          n: observations.length,
          method: "STOCKING_EM",
          deltaB: lastRun ? Math.abs(calResult.params.b - lastRun.bEstimate) : null,
          iqScore: (item as { iqScore?: number | null }).iqScore ?? null,
          createdBy: `job:${triggerSource}`,
        });
        result.draftsCreated++;
        if (draft.gate.eligible) result.draftsEligible++;
        logger.info(
          { itemId: item.id, n: observations.length, version: draft.version, eligible: draft.gate.eligible },
          "calibration-pipeline: prior-ACTIVE draft version recorded"
        );
      } catch (err) {
        result.errors++;
        logger.error({ err, itemId: item.id }, "calibration-pipeline: error on prior-ACTIVE item");
      }
    }
  }

  /**
   * Faz 4: GRM threshold estimation for writing/speaking tasks from graded
   * responses (AI or human score 0–1 → category of the task's K-point scale)
   * with the session θ as the concurrent ability. Records DRAFT versions with
   * `thresholds`; publishing copies them to Item.metadata.grm.
   */
  private static async _calibrateProductiveItems(
    triggerSource: string,
    result: CalibrationPipelineResult
  ): Promise<void> {
    const tasks = await prisma.item.findMany({
      where: { status: { in: ["ACTIVE", "PRETEST"] }, skill: { in: ["WRITING", "SPEAKING"] },
        type: { notIn: ["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "DRAG_DROP"] } },
      select: { id: true, discrimination: true, difficulty: true, metadata: true, iqScore: true },
    });
    if (tasks.length === 0) return;
    const counts = await prisma.response.groupBy({
      by: ["itemId"],
      where: { itemId: { in: tasks.map((t) => t.id) }, score: { not: null }, session: { status: "COMPLETED" } },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((r) => [r.itemId, r._count._all]));
    const eligible = tasks.filter((t) => (countMap.get(t.id) ?? 0) >= MIN_N);
    result.itemsEligible += eligible.length;
    for (const task of eligible) {
      try {
        const responses = await prisma.response.findMany({
          where: { itemId: task.id, score: { not: null }, session: { status: "COMPLETED", theta: { not: null } } },
          select: { score: true, session: { select: { theta: true } } },
        });
        const existing = (task.metadata as { grm?: GrmParameters } | null)?.grm;
        const seed: GrmParameters = existing && Array.isArray(existing.b) && typeof existing.a === "number"
          ? existing
          : rubricToGrmParams(task.discrimination, task.difficulty, 11);
        const observations = responses
          .filter((r): r is typeof r & { score: number; session: { theta: number } } => r.score != null && r.session?.theta != null)
          .map((r) => ({ theta: r.session.theta, category: scoreToCategory(r.score, seed.categories) }));
        if (observations.length < MIN_N) continue;
        const fit = calibrateGrmItem(seed, observations, { minN: MIN_N });
        result.itemsCalibrated++;
        if (!fit.stable) { result.itemsRejected++; continue; }
        result.itemsStable++;
        const location = fit.params.b.reduce((sum, b) => sum + b, 0) / fit.params.b.length;
        const locationSe = fit.thresholdSe.some((se) => se == null) ? null
          : Math.sqrt(fit.thresholdSe.reduce((sum, se) => sum + (se as number) ** 2, 0)) / fit.params.b.length;
        const draft = await createDraftVersion(prisma, {
          itemId: task.id,
          a: fit.params.a, b: location, c: 0,
          aSe: fit.aSe, bSe: locationSe,
          n: observations.length,
          method: "GRM_PML",
          thresholds: fit.params.b,
          deltaB: fit.maxDeltaB,
          iqScore: task.iqScore,
          createdBy: `job:${triggerSource}`,
          notes: fit.emptyCategories.length ? `empty categories: ${fit.emptyCategories.join(",")}` : null,
        });
        result.draftsCreated++;
        if (draft.gate.eligible) result.draftsEligible++;
        logger.info({ itemId: task.id, n: observations.length, version: draft.version, eligible: draft.gate.eligible },
          "calibration-pipeline: GRM threshold draft recorded");
      } catch (err) {
        result.errors++;
        logger.error({ err, itemId: task.id }, "calibration-pipeline: error on productive item");
      }
    }
  }

  /**
   * Retrieve calibration history for a specific item.
   */
  static async getItemHistory(itemId: string, limit = 20) {
    return prisma.calibrationRun.findMany({
      where: { itemId },
      orderBy: { runAt: "desc" },
      take: limit,
    });
  }

  /**
   * Retrieve the most recent calibration run summary across all items.
   */
  static async getRecentRuns(limit = 50) {
    return prisma.calibrationRun.findMany({
      orderBy: { runAt: "desc" },
      take: limit,
      select: {
        id: true,
        itemId: true,
        runAt: true,
        nResponses: true,
        aEstimate: true,
        bEstimate: true,
        cEstimate: true,
        deltaB: true,
        deltaA: true,
        stable: true,
        promotedToActive: true,
        rejectionReason: true,
        item: { select: { skill: true, cefrLevel: true } },
      },
    });
  }
}

// ─── Exposure Auto-Retire ──────────────────────────────────────────────────────

export class ExposureAutoRetireService {
  /**
   * Scan ACTIVE items for over-exposure.
   *
   * Sympson-Hetter thresholds:
   *   ψ > EXPOSURE_WARN_THRESHOLD  → item.difStatus = 'OVER_EXPOSED' (warning)
   *   ψ > EXPOSURE_RETIRE_THRESHOLD → item status = RETIRED (auto-retire)
   *
   * ψ = globalExposureRate = item.exposureCount / totalCompletedSessions
   */
  static async runExposureScan(): Promise<ExposureAutoRetireResult> {
    const t0 = Date.now();
    const result: ExposureAutoRetireResult = {
      itemsChecked: 0,
      itemsWarned: 0,
      itemsRetired: 0,
      durationMs: 0,
    };

    // Total completed sessions in the platform
    const totalSessions = await prisma.session.count({
      where: { status: "COMPLETED" },
    });

    if (totalSessions < 100) {
      logger.info(
        { totalSessions },
        "exposure-auto-retire: insufficient sessions (<100), skipping"
      );
      result.durationMs = Date.now() - t0;
      return result;
    }

    const activeItems = await prisma.item.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, exposureCount: true, skill: true, cefrLevel: true },
    });

    result.itemsChecked = activeItems.length;

    for (const item of activeItems) {
      const psi = (item.exposureCount ?? 0) / totalSessions;

      if (psi > EXPOSURE_RETIRE_THRESHOLD) {
        await prisma.item.update({
          where: { id: item.id },
          data: { status: "RETIRED" },
        });

        await prisma.retirementAuditLog.create({
          data: {
            itemId: item.id,
            action: "RETIRE",
            reason: `Auto-retired: exposure rate ψ=${psi.toFixed(4)} > threshold ${EXPOSURE_RETIRE_THRESHOLD}`,
            triggeredBy: "BATCH_JOB",
            score: psi,
          },
        });

        result.itemsRetired++;
        logger.warn(
          { itemId: item.id, psi: psi.toFixed(4), skill: item.skill, cefrLevel: item.cefrLevel },
          "exposure-auto-retire: item auto-retired (ψ > retire threshold)"
        );
      } else if (psi > EXPOSURE_WARN_THRESHOLD) {
        // Flag in difStatus field as a warning (no status change yet)
        await prisma.item.update({
          where: { id: item.id },
          data: { difStatus: "FLAGGED" },
        });

        result.itemsWarned++;
        logger.warn(
          { itemId: item.id, psi: psi.toFixed(4), skill: item.skill },
          "exposure-auto-retire: item exposure warning (ψ > warn threshold)"
        );
      }
    }

    result.durationMs = Date.now() - t0;
    logger.info(result, "exposure-auto-retire: scan complete");
    return result;
  }
}
