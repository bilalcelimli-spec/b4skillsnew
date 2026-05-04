/**
 * Pretest Pilot Service
 *
 * Manages the full lifecycle of pretest items:
 *   1. Response collection tracking (n per item)
 *   2. Calibration-ready detection (n ≥ MIN_RESPONSES)
 *   3. Empirical item statistics (p-value, point-biserial, distractor analysis)
 *   4. Promotion workflow: PRETEST → ACTIVE with new IRT parameters
 *   5. AIG survival-rate tracking (generation → pretest → active funnel)
 *
 * Terminology:
 *   "calibration-ready"  — enough responses to estimate IRT parameters
 *   "survival"           — a generated item that eventually becomes ACTIVE
 *
 * References:
 *   Lord (1980), Applications of IRT to Practical Testing Problems, §2
 *   Gierl & Haladyna (2013), Automatic Item Generation, §8 (field trial design)
 */

import { prisma } from "../prisma.js";
import { logger } from "../observability/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum responses before IRT calibration is attempted (rule-of-thumb: ≥ 50) */
export const MIN_RESPONSES_FOR_CALIBRATION = 50;

/** Minimum acceptable point-biserial correlation for promotion */
export const MIN_POINT_BISERIAL = 0.15;

/** Minimum acceptable p-value (item not too hard or too easy) */
export const MIN_P_VALUE = 0.15;
export const MAX_P_VALUE = 0.90;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PretestDecision = "PROMOTE" | "REVISE" | "RETIRE" | "PENDING";

export interface PretestItemStats {
  itemId: string;
  skill: string;
  cefrLevel: string;
  responseCount: number;
  /** Classical difficulty: proportion correct (0–1) */
  pValue: number;
  /** Point-biserial correlation with total score proxy */
  pointBiserial: number;
  /** Whether this item has enough responses for calibration */
  calibrationReady: boolean;
  /** Suggested action based on classical stats */
  decision: PretestDecision;
  /** Reason for the decision */
  decisionReason: string;
  /** Proposed new IRT b-parameter (logit transform of p-value) */
  proposedDifficulty: number | null;
}

export interface PretestSummary {
  totalPretestItems: number;
  calibrationReadyCount: number;
  pendingResponsesCount: number;
  stats: PretestItemStats[];
  /** AIG funnel: items that completed pretest and were promoted */
  survivalRate: number | null;
}

export interface PromotionResult {
  itemId: string;
  previousStatus: string;
  previousDifficulty: number;
  previousDiscrimination: number;
  newDifficulty: number;
  newDiscrimination: number;
  newGuessing: number;
  promotedAt: Date;
}

export interface BatchPromotionResult {
  promoted: PromotionResult[];
  skipped: Array<{ itemId: string; reason: string }>;
  retired: Array<{ itemId: string; reason: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Logit transform: p-value → IRT b-parameter approximation */
function pValueToLogit(p: number): number {
  if (p <= 0) return 4;
  if (p >= 1) return -4;
  return -Math.log(p / (1 - p));
}

/**
 * Compute point-biserial correlation between binary item scores and continuous
 * criterion (session theta). This approximates the IRT discrimination parameter.
 *
 *   r_pb = (mean_correct − mean_total) / sd_total × sqrt(p × (1 − p))
 */
function pointBiserial(
  itemScores: number[],
  criterion: number[]
): number {
  if (itemScores.length < 5) return 0;
  const n = itemScores.length;

  const meanTotal = criterion.reduce((a, b) => a + b, 0) / n;
  const sdTotal = Math.sqrt(
    criterion.reduce((s, x) => s + (x - meanTotal) ** 2, 0) / (n - 1)
  );
  if (sdTotal === 0) return 0;

  const p = itemScores.reduce((a, b) => a + b, 0) / n;
  if (p === 0 || p === 1) return 0;

  const meanCorrect = itemScores.reduce((s, score, i) => {
    return score >= 0.5 ? s + criterion[i] : s;
  }, 0) / (n * p);

  return ((meanCorrect - meanTotal) / sdTotal) * Math.sqrt(p * (1 - p));
}

function makeDecision(
  pVal: number,
  rpb: number,
  n: number
): { decision: PretestDecision; reason: string } {
  if (n < MIN_RESPONSES_FOR_CALIBRATION) {
    return { decision: "PENDING", reason: `Need ${MIN_RESPONSES_FOR_CALIBRATION - n} more responses` };
  }
  if (pVal < MIN_P_VALUE) {
    return { decision: "RETIRE", reason: `Too difficult (p=${pVal.toFixed(2)} < ${MIN_P_VALUE})` };
  }
  if (pVal > MAX_P_VALUE) {
    return { decision: "RETIRE", reason: `Too easy (p=${pVal.toFixed(2)} > ${MAX_P_VALUE})` };
  }
  if (rpb < MIN_POINT_BISERIAL) {
    return { decision: "REVISE", reason: `Low discrimination (r_pb=${rpb.toFixed(2)} < ${MIN_POINT_BISERIAL})` };
  }
  return { decision: "PROMOTE", reason: `p=${pVal.toFixed(2)}, r_pb=${rpb.toFixed(2)} — within acceptable range` };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export class PretestPilotService {
  /**
   * Fetch statistics for all PRETEST items.
   * For each item, compute p-value and point-biserial from actual responses.
   */
  static async getSummary(organizationId?: string): Promise<PretestSummary> {
    const pretestItems = await prisma.item.findMany({
      where: {
        status: "PRETEST",
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        skill: true,
        cefrLevel: true,
        difficulty: true,
        responses: {
          where: { isPretest: true },
          select: {
            score: true,
            session: { select: { theta: true } },
          },
        },
      },
    });

    // Also fetch ACTIVE items to compute survival rate
    const [activeCount, retiredPretestCount] = await Promise.all([
      prisma.item.count({
        where: {
          status: "ACTIVE",
          ...(organizationId ? { organizationId } : {}),
        },
      }),
      prisma.item.count({
        where: {
          status: "RETIRED",
          isPretest: true,
          ...(organizationId ? { organizationId } : {}),
        },
      }),
    ]);

    const stats: PretestItemStats[] = pretestItems.map((item) => {
      const responses = item.responses;
      const n = responses.length;

      const scores = responses.map((r) => r.score ?? 0);
      const thetas = responses.map((r) => r.session.theta);

      const pVal = n > 0 ? scores.reduce((a, b) => a + b, 0) / n : 0;
      const rpb = pointBiserial(scores, thetas);
      const { decision, reason } = makeDecision(pVal, rpb, n);

      return {
        itemId: item.id,
        skill: item.skill,
        cefrLevel: item.cefrLevel,
        responseCount: n,
        pValue: Number(pVal.toFixed(4)),
        pointBiserial: Number(rpb.toFixed(4)),
        calibrationReady: n >= MIN_RESPONSES_FOR_CALIBRATION,
        decision,
        decisionReason: reason,
        proposedDifficulty: n >= MIN_RESPONSES_FOR_CALIBRATION
          ? Number(pValueToLogit(pVal).toFixed(3))
          : null,
      };
    });

    const calibrationReadyCount = stats.filter((s) => s.calibrationReady).length;
    const pendingResponsesCount = stats.filter((s) => s.decision === "PENDING").length;

    // Survival rate = active / (active + retired_pretest + current_pretest)
    const totalGenerated = activeCount + retiredPretestCount + pretestItems.length;
    const survivalRate = totalGenerated > 0 ? activeCount / totalGenerated : null;

    return {
      totalPretestItems: pretestItems.length,
      calibrationReadyCount,
      pendingResponsesCount,
      stats,
      survivalRate: survivalRate !== null ? Number(survivalRate.toFixed(4)) : null,
    };
  }

  /**
   * Promote a single PRETEST item to ACTIVE, updating its IRT parameters.
   * Pass calibrated parameters from external tool (R mirt / py-irt).
   */
  static async promoteToActive(
    itemId: string,
    calibratedParams: { a: number; b: number; c: number },
    promotedBy?: string
  ): Promise<PromotionResult> {
    const item = await prisma.item.findUniqueOrThrow({
      where: { id: itemId },
      select: { status: true, difficulty: true, discrimination: true, guessing: true },
    });

    if (item.status !== "PRETEST") {
      throw new Error(`Item ${itemId} is not PRETEST (status: ${item.status})`);
    }

    const { a, b, c } = calibratedParams;

    await prisma.item.update({
      where: { id: itemId },
      data: {
        status: "ACTIVE",
        isPretest: false,
        difficulty: b,
        discrimination: a,
        guessing: c,
        metadata: {
          promotedAt: new Date().toISOString(),
          promotedBy: promotedBy ?? "system",
          priorDifficulty: item.difficulty,
          priorDiscrimination: item.discrimination,
        },
      },
    });

    logger.info({ itemId, newParams: { a, b, c } }, "Pretest item promoted to ACTIVE");

    return {
      itemId,
      previousStatus: item.status,
      previousDifficulty: item.difficulty,
      previousDiscrimination: item.discrimination,
      newDifficulty: b,
      newDiscrimination: a,
      newGuessing: c,
      promotedAt: new Date(),
    };
  }

  /**
   * Retire a PRETEST item that failed quality gates.
   */
  static async retirePretest(itemId: string, reason: string): Promise<void> {
    await prisma.item.update({
      where: { id: itemId },
      data: {
        status: "RETIRED",
        retirementReason: reason,
        retiredAt: new Date(),
        retiredBy: "pretest-pilot-service",
        canBeReactivated: true,
      },
    });
    logger.info({ itemId, reason }, "Pretest item retired after pilot");
  }

  /**
   * Batch promotion run.
   * - Items with decision=PROMOTE: update with empirical logit-b estimate (until real MLE available)
   * - Items with decision=RETIRE: mark RETIRED
   * - Items with decision=REVISE or PENDING: skip
   *
   * NOTE: In production, pass calibrated params from R mirt or py-irt to `promoteToActive`.
   * This batch method uses the p-value logit transform as a temporary proxy.
   */
  static async runBatchPromotion(
    organizationId?: string
  ): Promise<BatchPromotionResult> {
    const summary = await PretestPilotService.getSummary(organizationId);

    const promoted: PromotionResult[] = [];
    const skipped: Array<{ itemId: string; reason: string }> = [];
    const retired: Array<{ itemId: string; reason: string }> = [];

    for (const s of summary.stats) {
      if (s.decision === "PROMOTE" && s.proposedDifficulty !== null) {
        try {
          const result = await PretestPilotService.promoteToActive(s.itemId, {
            a: Math.max(0.5, Math.min(3.0, 0.5 + s.pointBiserial * 2)), // crude a estimate
            b: s.proposedDifficulty,
            c: 0.2, // default guessing (update with real MLE)
          });
          promoted.push(result);
        } catch (err) {
          logger.error({ err, itemId: s.itemId }, "Batch promotion failed for item");
          skipped.push({ itemId: s.itemId, reason: String(err) });
        }
      } else if (s.decision === "RETIRE") {
        try {
          await PretestPilotService.retirePretest(s.itemId, s.decisionReason);
          retired.push({ itemId: s.itemId, reason: s.decisionReason });
        } catch (err) {
          logger.error({ err, itemId: s.itemId }, "Batch retire failed for item");
          skipped.push({ itemId: s.itemId, reason: String(err) });
        }
      } else {
        skipped.push({ itemId: s.itemId, reason: s.decisionReason });
      }
    }

    logger.info(
      { promoted: promoted.length, retired: retired.length, skipped: skipped.length },
      "Batch pretest promotion complete"
    );

    return { promoted, skipped, retired };
  }
}
