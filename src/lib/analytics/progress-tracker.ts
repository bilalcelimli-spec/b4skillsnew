/**
 * Longitudinal Progress Tracker
 *
 * Tracks a candidate's θ (ability) trajectory across multiple test sessions,
 * enabling teachers and institutions to monitor genuine learning growth over
 * time. Distinguishes real improvement from measurement error using SEM-based
 * confidence intervals and reliable change indices (RCI).
 *
 * Key features:
 *   - **Growth trajectory**: θ over time per skill and overall
 *   - **Reliable Change Index (RCI)**: Jacobson & Truax (1991) — determines
 *     whether observed change exceeds measurement error at p < 0.05
 *   - **CEFR milestone detection**: identifies first confirmed level-up events
 *   - **Skill profile evolution**: shows which skills improved, plateaued, or
 *     regressed relative to the candidate's initial baseline
 *   - **Percentile rank in cohort**: where the candidate stands vs. org peers
 *
 * References
 * ----------
 * Jacobson, N. S., & Truax, P. (1991). Clinical significance: a statistical
 *   approach to defining meaningful change in psychotherapy research. Journal
 *   of Consulting and Clinical Psychology, 59(1), 12–19.
 *
 * Embretson, S. E., & Reise, S. P. (2000). Item Response Theory for
 *   Psychologists. Lawrence Erlbaum Associates.
 */

import { prisma } from "../prisma.js";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ThetaSnapshot {
  sessionId: string;
  completedAt: Date;
  theta: number;
  sem: number;
  cefrLevel: string | null;
  /** 95% CI lower bound (θ − 1.96 × SEM) */
  ciLower: number;
  /** 95% CI upper bound (θ + 1.96 × SEM) */
  ciUpper: number;
}

export interface SkillProgressPoint {
  sessionId: string;
  completedAt: Date;
  skill: string;
  /** Mean score on this skill's items in the session (0–1) */
  meanScore: number;
  /** Number of items answered for this skill */
  itemCount: number;
}

export interface ReliableChangeResult {
  /** Observed change Δθ = θ_post − θ_pre */
  deltaTheta: number;
  /** Reliable Change Index (Jacobson & Truax 1991) */
  rci: number;
  /** Whether change exceeds measurement error at α = 0.05 (|RCI| > 1.96) */
  isReliable: boolean;
  /** Direction of change */
  direction: "IMPROVEMENT" | "DECLINE" | "STABLE";
}

export interface CefrMilestone {
  sessionId: string;
  achievedAt: Date;
  level: string;
  /** True if the level was maintained in the subsequent session */
  confirmed: boolean;
}

export interface ProgressReport {
  candidateId: string;
  organizationId: string;
  /** Ordered by completedAt ascending */
  thetaTrajectory: ThetaSnapshot[];
  /** Skill-level breakdown across sessions */
  skillProgress: Record<string, SkillProgressPoint[]>;
  /** Change from first to last session */
  overallChange: ReliableChangeResult | null;
  /** All CEFR levels first achieved */
  cefrMilestones: CefrMilestone[];
  /** Percentile rank in org cohort (0–100) at latest session */
  latestPercentileRank: number | null;
  /** Number of completed sessions */
  totalSessions: number;
  /** Days elapsed from first to latest session */
  daysElapsed: number;
}

// ─── RCI helpers ────────────────────────────────────────────────────────────

/**
 * Reliable Change Index (Jacobson & Truax, 1991).
 *
 * RCI = Δθ / SE_diff
 * SE_diff = √(SEM₁² + SEM₂²)   (pooled error of two independent measurements)
 *
 * |RCI| > 1.96 → change is reliable at α = 0.05 (two-tailed).
 */
function computeRCI(
  thetaBefore: number,
  semBefore: number,
  thetaAfter: number,
  semAfter: number
): ReliableChangeResult {
  const deltaTheta = thetaAfter - thetaBefore;
  const seDiff = Math.sqrt(semBefore ** 2 + semAfter ** 2);
  const rci = seDiff > 0 ? deltaTheta / seDiff : 0;
  const isReliable = Math.abs(rci) > 1.96;
  const direction =
    !isReliable ? "STABLE" : deltaTheta > 0 ? "IMPROVEMENT" : "DECLINE";
  return { deltaTheta, rci, isReliable, direction };
}

// ─── Main service ────────────────────────────────────────────────────────────

export const ProgressTracker = {
  /**
   * Build a full longitudinal progress report for a candidate.
   *
   * @param candidateId  - user ID of the candidate
   * @param organizationId - scope to one org (multi-tenant isolation)
   * @param limit - max number of past sessions to include (default: 20)
   */
  async getProgressReport(
    candidateId: string,
    organizationId: string,
    limit = 20
  ): Promise<ProgressReport> {
    // ── 1. Fetch completed sessions ordered by completedAt ─────────────────
    const sessions = await prisma.session.findMany({
      where: { candidateId, organizationId, status: "COMPLETED" },
      orderBy: { completedAt: "asc" },
      take: limit,
      select: {
        id: true,
        theta: true,
        sem: true,
        cefrLevel: true,
        completedAt: true,
        responses: {
          where: { isPretest: false },
          select: {
            score: true,
            item: { select: { skill: true } },
          },
        },
      },
    });

    if (sessions.length === 0) {
      return {
        candidateId,
        organizationId,
        thetaTrajectory: [],
        skillProgress: {},
        overallChange: null,
        cefrMilestones: [],
        latestPercentileRank: null,
        totalSessions: 0,
        daysElapsed: 0,
      };
    }

    // ── 2. Build theta trajectory with 95% CIs ─────────────────────────────
    const thetaTrajectory: ThetaSnapshot[] = sessions.map((s) => ({
      sessionId: s.id,
      completedAt: s.completedAt!,
      theta: s.theta,
      sem: s.sem,
      cefrLevel: s.cefrLevel ?? null,
      ciLower: s.theta - 1.96 * s.sem,
      ciUpper: s.theta + 1.96 * s.sem,
    }));

    // ── 3. Skill progress across sessions ──────────────────────────────────
    const skillProgress: Record<string, SkillProgressPoint[]> = {};
    for (const s of sessions) {
      // Group responses by skill
      const skillMap = new Map<string, number[]>();
      for (const r of s.responses) {
        const skill = r.item.skill;
        if (r.score !== null) {
          if (!skillMap.has(skill)) skillMap.set(skill, []);
          skillMap.get(skill)!.push(r.score);
        }
      }
      for (const [skill, scores] of skillMap) {
        if (!skillProgress[skill]) skillProgress[skill] = [];
        skillProgress[skill].push({
          sessionId: s.id,
          completedAt: s.completedAt!,
          skill,
          meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          itemCount: scores.length,
        });
      }
    }

    // ── 4. RCI from first to last session ──────────────────────────────────
    const first = thetaTrajectory[0];
    const last = thetaTrajectory[thetaTrajectory.length - 1];
    const overallChange =
      thetaTrajectory.length >= 2
        ? computeRCI(first.theta, first.sem, last.theta, last.sem)
        : null;

    // ── 5. CEFR milestone detection ────────────────────────────────────────
    const cefrMilestones: CefrMilestone[] = [];
    const seenLevels = new Set<string>();
    for (let i = 0; i < thetaTrajectory.length; i++) {
      const snap = thetaTrajectory[i];
      if (snap.cefrLevel && !seenLevels.has(snap.cefrLevel)) {
        seenLevels.add(snap.cefrLevel);
        // Confirm if next session also reports this level or higher
        const nextSnap = thetaTrajectory[i + 1];
        cefrMilestones.push({
          sessionId: snap.sessionId,
          achievedAt: snap.completedAt,
          level: snap.cefrLevel,
          confirmed: nextSnap
            ? (nextSnap.cefrLevel ?? "") >= snap.cefrLevel
            : false,
        });
      }
    }

    // ── 6. Percentile rank in org cohort ───────────────────────────────────
    let latestPercentileRank: number | null = null;
    if (thetaTrajectory.length > 0) {
      const latestTheta = last.theta;
      const [totalCandidates, below] = await Promise.all([
        prisma.session.count({
          where: { organizationId, status: "COMPLETED" },
        }),
        prisma.session.count({
          where: {
            organizationId,
            status: "COMPLETED",
            theta: { lt: latestTheta },
          },
        }),
      ]);
      if (totalCandidates > 0) {
        latestPercentileRank = Math.round((below / totalCandidates) * 100);
      }
    }

    const daysElapsed =
      thetaTrajectory.length >= 2
        ? Math.round(
            (last.completedAt.getTime() - first.completedAt.getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : 0;

    return {
      candidateId,
      organizationId,
      thetaTrajectory,
      skillProgress,
      overallChange,
      cefrMilestones,
      latestPercentileRank,
      totalSessions: sessions.length,
      daysElapsed,
    };
  },

  /**
   * Cohort-level growth summary: average θ change per org over a date window.
   * Useful for institutional reporting ("our students improved X points on avg").
   */
  async getCohortGrowthSummary(
    organizationId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{
    candidatesAnalyzed: number;
    avgDeltaTheta: number;
    reliableImprovers: number;
    reliableDecliners: number;
    stableCount: number;
    avgSessionsPerCandidate: number;
  }> {
    // Get all candidates with ≥2 completed sessions in the window
    const candidateGroups = await prisma.session.groupBy({
      by: ["candidateId"],
      where: {
        organizationId,
        status: "COMPLETED",
        completedAt: { gte: fromDate, lte: toDate },
      },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
    });

    if (candidateGroups.length === 0) {
      return {
        candidatesAnalyzed: 0,
        avgDeltaTheta: 0,
        reliableImprovers: 0,
        reliableDecliners: 0,
        stableCount: 0,
        avgSessionsPerCandidate: 0,
      };
    }

    let totalDelta = 0;
    let reliableImprovers = 0;
    let reliableDecliners = 0;
    let stableCount = 0;
    let totalSessions = 0;

    for (const cg of candidateGroups) {
      const sessions = await prisma.session.findMany({
        where: {
          candidateId: cg.candidateId,
          organizationId,
          status: "COMPLETED",
          completedAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { completedAt: "asc" },
        select: { theta: true, sem: true },
      });

      if (sessions.length < 2) continue;

      const first = sessions[0];
      const last = sessions[sessions.length - 1];
      const rci = computeRCI(first.theta, first.sem, last.theta, last.sem);

      totalDelta += rci.deltaTheta;
      totalSessions += sessions.length;

      if (rci.direction === "IMPROVEMENT") reliableImprovers++;
      else if (rci.direction === "DECLINE") reliableDecliners++;
      else stableCount++;
    }

    const n = candidateGroups.length;
    return {
      candidatesAnalyzed: n,
      avgDeltaTheta: n > 0 ? totalDelta / n : 0,
      reliableImprovers,
      reliableDecliners,
      stableCount,
      avgSessionsPerCandidate: n > 0 ? totalSessions / n : 0,
    };
  },
};
