/**
 * Live Metrics Engine (Phase 4, Priority 1)
 *
 * Computes real-time analytics from database:
 * - Per-skill ability distribution
 * - Item difficulty curve
 * - Session completion rates
 * - Pretest pipeline health
 * - Retirement flags
 * - MIRT dimension tracking
 *
 * Performance notes (Sprint 2 refactor):
 *   - computeSkillMetrics: 6 identical session scans → 1 query + 1 aggregate
 *   - computeItemDifficultyDistribution: 7 CEFR-filtered queries → 1 groupBy
 *   - computePretestPipelineMetrics: N+N response.count loops → 1 groupBy
 */

import { prisma } from "../prisma.js";
import type { CefrLevel, SkillType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillMetrics {
  skill: SkillType;
  candidates: number;
  avgTheta: number;
  stdTheta: number;
  avgResponses: number;
  byCSfR: Partial<Record<CefrLevel, { count: number; avgTheta: number; avgScore: number }>>;
}

export interface ItemDifficultyDistribution {
  cefr: CefrLevel;
  count: number;
  avgDifficulty: number;
  avgDiscrimination: number;
  retiredCount: number;
  pretestCount: number;
}

export interface SessionMetrics {
  totalSessions: number;
  avgItemsToCompletion: number;
  completionRate: number;
  avgDuration: number;
  avgTheta: number;
}

export interface PretestPipelineMetrics {
  totalPretestItems: number;
  readyForCalibration: number; // >= 30 responses
  readyForPromotion: number; // >= 50 responses
  promotedThisWeek: number;
  avgPromotionTime: number; // Days from creation to ACTIVE
}

export interface RetirementMetrics {
  flaggedThisWeek: number;
  autoRetiredThisWeek: number;
  pendingApproval: number;
  totalRetired: number;
}

export interface MirtMetrics {
  dim0Avg: number; // READING
  dim1Avg: number; // LISTENING
  dim2Avg: number; // WRITING
  dim3Avg: number; // SPEAKING
  dim4Avg: number; // GRAMMAR
  dim5Avg: number; // VOCABULARY
  dim0Std: number;
  dim1Std: number;
  dim2Std: number;
  dim3Std: number;
  dim4Std: number;
  dim5Std: number;
}

export interface LiveAnalyticsSnapshot {
  timestamp: Date;
  skills: SkillMetrics[];
  itemDifficulty: ItemDifficultyDistribution[];
  sessions: SessionMetrics;
  pretestPipeline: PretestPipelineMetrics;
  retirementStatus: RetirementMetrics;
  mirt: MirtMetrics;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE METRICS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class LiveMetricsEngine {
  /**
   * Compute all analytics metrics for an organization.
   */
  static async computeSnapshot(organizationId: string): Promise<LiveAnalyticsSnapshot> {
    const [
      skills,
      itemDifficulty,
      sessions,
      pretestPipeline,
      retirementStatus,
      mirt,
    ] = await Promise.all([
      this.computeSkillMetrics(organizationId),
      this.computeItemDifficultyDistribution(organizationId),
      this.computeSessionMetrics(organizationId),
      this.computePretestPipelineMetrics(organizationId),
      this.computeRetirementMetrics(organizationId),
      this.computeMirtMetrics(organizationId),
    ]);

    return {
      timestamp: new Date(),
      skills,
      itemDifficulty,
      sessions,
      pretestPipeline,
      retirementStatus,
      mirt,
    };
  }

  /**
   * Per-skill ability distribution with CEFR breakdown.
   *
   * Refactored (Sprint 2): was 6 identical session.findMany() + 6 response.findMany()
   * calls inside a skill loop. Now: 1 session fetch + 1 response groupBy aggregate.
   */
  private static async computeSkillMetrics(
    organizationId: string
  ): Promise<SkillMetrics[]> {
    const skillOrder: SkillType[] = [
      "READING",
      "LISTENING",
      "WRITING",
      "SPEAKING",
      "GRAMMAR",
      "VOCABULARY",
    ];

    // ── 1 query: all sessions for this org ──────────────────────────────────
    const allSessions = await prisma.session.findMany({
      where: { organizationId },
      select: {
        id: true,
        theta: true,
        cefrLevel: true,
        responsesCount: true,
        metadata: true, // contains skillProfiles
      },
    });

    if (allSessions.length === 0) {
      return skillOrder.map((skill) => ({
        skill,
        candidates: 0,
        avgTheta: 0,
        stdTheta: 0,
        avgResponses: 0,
        byCSfR: {},
      }));
    }

    // ── 1 query: skill-tagged response scores for all sessions ───────────────
    const sessionIds = allSessions.map((s) => s.id);
    const allSkillResponses = await prisma.response.findMany({
      where: { sessionId: { in: sessionIds } },
      select: {
        sessionId: true,
        score: true,
        item: { select: { skill: true } },
      },
    });

    // Pre-group responses by skill then by sessionId for O(1) look-up
    const responsesBySkill = new Map<SkillType, Map<string, number[]>>();
    for (const r of allSkillResponses) {
      const skill = r.item?.skill as SkillType | undefined;
      if (!skill || r.score === null) continue;
      if (!responsesBySkill.has(skill)) responsesBySkill.set(skill, new Map());
      const bySession = responsesBySkill.get(skill)!;
      if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, []);
      bySession.get(r.sessionId)!.push(r.score);
    }

    const cefrLevels: CefrLevel[] = [
      "PRE_A1" as CefrLevel,
      "A1" as CefrLevel,
      "A2" as CefrLevel,
      "B1" as CefrLevel,
      "B2" as CefrLevel,
      "C1" as CefrLevel,
      "C2" as CefrLevel,
    ];

    // ── Process each skill in JS (no additional DB calls) ───────────────────
    const metrics: SkillMetrics[] = [];

    for (const skill of skillOrder) {
      const skillResponsesBySession = responsesBySkill.get(skill) ?? new Map<string, number[]>();

      // Mean session score per sessionId for this skill
      const scoreBySession = new Map<string, number>();
      for (const [sid, scores] of skillResponsesBySession) {
        scoreBySession.set(sid, scores.reduce((a, b) => a + b, 0) / scores.length);
      }

      // Extract skill-specific thetas from session metadata
      const skillThetas = allSessions
        .map((s) => {
          const profiles = (s.metadata as any)?.skillProfiles || {};
          return profiles[skill] ?? s.theta;
        })
        .filter((t) => Number.isFinite(t));

      const avgTheta = skillThetas.length > 0
        ? skillThetas.reduce((a, b) => a + b, 0) / skillThetas.length
        : 0;
      const variance = skillThetas.length > 0
        ? skillThetas.reduce((a, t) => a + (t - avgTheta) ** 2, 0) / skillThetas.length
        : 0;
      const stdTheta = Math.sqrt(variance);

      const avgResponses =
        allSessions.reduce((a, s) => a + s.responsesCount, 0) / allSessions.length;

      // Per-CEFR breakdown
      const byCefr: Record<string, { count: number; avgTheta: number; avgScore: number }> = {};

      for (const cefr of cefrLevels) {
        const cefrSessions = allSessions.filter((s) => s.cefrLevel === cefr);
        if (cefrSessions.length === 0) continue;

        const cefrThetas = cefrSessions
          .map((s) => {
            const profiles = (s.metadata as any)?.skillProfiles || {};
            return profiles[skill] ?? s.theta;
          })
          .filter((t) => Number.isFinite(t));

        const cefrScores = cefrSessions
          .map((s) => scoreBySession.get(s.id))
          .filter((v): v is number => v !== undefined);

        byCefr[cefr] = {
          count: cefrSessions.length,
          avgTheta: cefrThetas.length > 0
            ? cefrThetas.reduce((a, b) => a + b, 0) / cefrThetas.length
            : 0,
          avgScore: cefrScores.length > 0
            ? cefrScores.reduce((a, b) => a + b, 0) / cefrScores.length
            : 0,
        };
      }

      metrics.push({
        skill,
        candidates: allSessions.length,
        avgTheta,
        stdTheta,
        avgResponses,
        byCSfR: byCefr,
      });
    }

    return metrics;
  }

  /**
   * Item difficulty distribution by CEFR.
   *
   * Refactored (Sprint 2): was 7 item.findMany() calls inside a CEFR loop.
   * Now: 1 groupBy aggregate covering all levels in one round-trip.
   */
  private static async computeItemDifficultyDistribution(
    organizationId: string
  ): Promise<ItemDifficultyDistribution[]> {
    const cefrLevels: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

    // ── 1 query: group by (cefrLevel, status) with avg difficulty/discrimination ──
    const grouped = await prisma.item.groupBy({
      by: ["cefrLevel", "status"],
      where: { organizationId },
      _count: { id: true },
      _avg: { difficulty: true, discrimination: true },
    });

    // Pivot the grouped result into per-CEFR structs
    const distributions: ItemDifficultyDistribution[] = [];

    for (const cefr of cefrLevels) {
      const rows = grouped.filter((r) => r.cefrLevel === cefr);
      if (rows.length === 0) continue;

      const totalCount = rows.reduce((a, r) => a + r._count.id, 0);
      const retiredRow = rows.find((r) => r.status === "RETIRED");
      const pretestRow = rows.find((r) => r.status === "PRETEST");
      const activeRow  = rows.find((r) => r.status === "ACTIVE");

      distributions.push({
        cefr,
        count: totalCount,
        avgDifficulty: activeRow?._avg.difficulty ?? 0,
        avgDiscrimination: activeRow?._avg.discrimination ?? 0,
        retiredCount: retiredRow?._count.id ?? 0,
        pretestCount: pretestRow?._count.id ?? 0,
      });
    }

    return distributions;
  }

  /**
   * Session-level metrics.
   */
  private static async computeSessionMetrics(
    organizationId: string
  ): Promise<SessionMetrics> {
    const sessions = await prisma.session.findMany({
      where: { organizationId },
      select: {
        id: true,
        theta: true,
        responsesCount: true,
        createdAt: true,
        status: true,
      },
    });

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        avgItemsToCompletion: 0,
        completionRate: 0,
        avgDuration: 0,
        avgTheta: 0,
      };
    }

    const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
    const completionRate = completedSessions.length / sessions.length;

    const avgDuration =
      completedSessions.length > 0
        ? completedSessions.reduce((a, s) => a + (Date.now() - s.createdAt.getTime()), 0) /
          completedSessions.length /
          1000 /
          60 // Convert to minutes
        : 0;

    return {
      totalSessions: sessions.length,
      avgItemsToCompletion: sessions.reduce((a, s) => a + s.responsesCount, 0) / sessions.length,
      completionRate,
      avgDuration,
      avgTheta: sessions.reduce((a, s) => a + s.theta, 0) / sessions.length,
    };
  }

  /**
   * Pretest pipeline health.
   *
   * Refactored (Sprint 2): was N+N response.count() calls (one per pretest item,
   * repeated for calibration and promotion thresholds). Now: 1 response.groupBy()
   * aggregate that counts all pretest responses per item in one round-trip.
   */
  private static async computePretestPipelineMetrics(
    organizationId: string
  ): Promise<PretestPipelineMetrics> {
    // ── 1 query: all PRETEST items ────────────────────────────────────────────
    const pretestItems = await prisma.item.findMany({
      where: { organizationId, status: "PRETEST" },
      select: { id: true, createdAt: true },
    });

    let readyForCalibration = 0;
    let readyForPromotion = 0;

    if (pretestItems.length > 0) {
      // ── 1 query: response counts per pretest item (replaces N+N count calls) ──
      const responseCounts = await prisma.response.groupBy({
        by: ["itemId"],
        where: {
          itemId: { in: pretestItems.map((i) => i.id) },
          isPretest: true,
        },
        _count: { id: true },
      });

      const countByItem = new Map<string, number>(
        responseCounts.map((r) => [r.itemId, r._count.id])
      );

      for (const item of pretestItems) {
        const n = countByItem.get(item.id) ?? 0;
        if (n >= 30) readyForCalibration++;
        if (n >= 50) readyForPromotion++;
      }
    }

    // ── 1 query: items promoted this week ────────────────────────────────────
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [promotedThisWeek, recentlyPromoted] = await Promise.all([
      prisma.item.count({
        where: {
          organizationId,
          status: "ACTIVE",
          updatedAt: { gte: oneWeekAgo },
        },
      }),
      prisma.item.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          updatedAt: { gte: oneWeekAgo },
        },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    const avgPromotionTime =
      recentlyPromoted.length > 0
        ? recentlyPromoted.reduce(
            (a, i) => a + (i.updatedAt.getTime() - i.createdAt.getTime()),
            0
          ) /
          recentlyPromoted.length /
          (24 * 60 * 60 * 1000) // ms → days
        : 0;

    return {
      totalPretestItems: pretestItems.length,
      readyForCalibration,
      readyForPromotion,
      promotedThisWeek,
      avgPromotionTime,
    };
  }

  /**
   * Retirement metrics.
   */
  private static async computeRetirementMetrics(
    organizationId: string
  ): Promise<RetirementMetrics> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      flaggedThisWeek,
      autoRetiredThisWeek,
      pendingApproval,
      totalRetired,
    ] = await Promise.all([
      prisma.retirementAuditLog.count({
        where: {
          action: "FLAGGED_FOR_REVIEW",
          createdAt: { gte: oneWeekAgo },
          item: { organizationId },
        },
      }),
      prisma.retirementAuditLog.count({
        where: {
          action: "AUTO_RETIRED",
          createdAt: { gte: oneWeekAgo },
          item: { organizationId },
        },
      }),
      prisma.retirementAuditLog.count({
        where: {
          approvalStatus: "PENDING",
          item: { organizationId },
        },
      }),
      prisma.item.count({
        where: { organizationId, status: "RETIRED" },
      }),
    ]);

    return {
      flaggedThisWeek,
      autoRetiredThisWeek,
      pendingApproval,
      totalRetired,
    };
  }

  /**
   * MIRT dimension metrics (6D ability vector).
   */
  private static async computeMirtMetrics(
    organizationId: string
  ): Promise<MirtMetrics> {
    const sessions = await prisma.session.findMany({
      where: { organizationId },
      select: {
        metadata: true,
      },
    });

    if (sessions.length === 0) {
      return {
        dim0Avg: 0,
        dim1Avg: 0,
        dim2Avg: 0,
        dim3Avg: 0,
        dim4Avg: 0,
        dim5Avg: 0,
        dim0Std: 0,
        dim1Std: 0,
        dim2Std: 0,
        dim3Std: 0,
        dim4Std: 0,
        dim5Std: 0,
      };
    }

    // Extract 6D ability vectors from session metadata
    const dims = Array(6)
      .fill(null)
      .map(() => [] as number[]);

    for (const session of sessions) {
      const vector = (session.metadata as any)?.mirtAbilityVector || [0, 0, 0, 0, 0, 0];
      for (let i = 0; i < 6; i++) {
        const val = vector[i];
        if (Number.isFinite(val)) dims[i].push(val);
      }
    }

    const averages = dims.map((d) => (d.length > 0 ? d.reduce((a, b) => a + b) / d.length : 0));
    const stdevs = dims.map((d, i) => {
      if (d.length === 0) return 0;
      const avg = averages[i];
      const variance = d.reduce((a, x) => a + (x - avg) ** 2, 0) / d.length;
      return Math.sqrt(variance);
    });

    return {
      dim0Avg: averages[0],
      dim1Avg: averages[1],
      dim2Avg: averages[2],
      dim3Avg: averages[3],
      dim4Avg: averages[4],
      dim5Avg: averages[5],
      dim0Std: stdevs[0],
      dim1Std: stdevs[1],
      dim2Std: stdevs[2],
      dim3Std: stdevs[3],
      dim4Std: stdevs[4],
      dim5Std: stdevs[5],
    };
  }
}
