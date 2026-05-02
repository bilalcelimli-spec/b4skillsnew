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
  byCSfR: Record<CefrLevel, { count: number; avgTheta: number; avgScore: number }>;
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
   */
  private static async computeSkillMetrics(
    organizationId: string
  ): Promise<SkillMetrics[]> {
    const skills: SkillType[] = [
      "READING",
      "LISTENING",
      "WRITING",
      "SPEAKING",
      "GRAMMAR",
      "VOCABULARY",
    ];

    const metrics: SkillMetrics[] = [];

    for (const skill of skills) {
      const sessions = await prisma.session.findMany({
        where: { organizationId },
        select: {
          id: true,
          theta: true,
          cefrLevel: true,
          responsesCount: true,
          metadata: true, // Contains skillProfiles
        },
      });

      if (sessions.length === 0) {
        metrics.push({
          skill,
          candidates: 0,
          avgTheta: 0,
          stdTheta: 0,
          avgResponses: 0,
          byCSfR: {},
        });
        continue;
      }

      // Extract skill-specific thetas from session metadata
      const skillThetas = sessions
        .map((s) => {
          const profiles = (s.metadata as any)?.skillProfiles || {};
          return profiles[skill] || s.theta;
        })
        .filter((t) => Number.isFinite(t));

      const avgTheta = skillThetas.reduce((a, b) => a + b, 0) / skillThetas.length;
      const variance =
        skillThetas.reduce((a, t) => a + (t - avgTheta) ** 2, 0) / skillThetas.length;
      const stdTheta = Math.sqrt(variance);

      const avgResponses =
        sessions.reduce((a, s) => a + s.responsesCount, 0) / sessions.length;

      // By CEFR
      const byCefr: Record<string, { count: number; avgTheta: number; avgScore: number }> = {};
      const cefrLevels: CefrLevel[] = [
        "PRE_A1" as CefrLevel,
        "A1" as CefrLevel,
        "A2" as CefrLevel,
        "B1" as CefrLevel,
        "B2" as CefrLevel,
        "C1" as CefrLevel,
        "C2" as CefrLevel,
      ];

      for (const cefr of cefrLevels) {
        const cefrSessions = sessions.filter((s) => s.cefrLevel === cefr);
        if (cefrSessions.length > 0) {
          const cefrThetas = cefrSessions
            .map((s) => {
              const profiles = (s.metadata as any)?.skillProfiles || {};
              return profiles[skill] || s.theta;
            })
            .filter((t) => Number.isFinite(t));

          byCefr[cefr] = {
            count: cefrSessions.length,
            avgTheta: cefrThetas.reduce((a, b) => a + b, 0) / cefrThetas.length,
            avgScore: 0.5, // Placeholder: would compute from Response scores
          };
        }
      }

      metrics.push({
        skill,
        candidates: sessions.length,
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
   */
  private static async computeItemDifficultyDistribution(
    organizationId: string
  ): Promise<ItemDifficultyDistribution[]> {
    const cefrLevels: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

    const distributions: ItemDifficultyDistribution[] = [];

    for (const cefr of cefrLevels) {
      const items = await prisma.item.findMany({
        where: { organizationId, cefrLevel: cefr },
        select: {
          id: true,
          difficulty: true,
          discrimination: true,
          status: true,
        },
      });

      if (items.length === 0) continue;

      const retiredCount = items.filter((i) => i.status === "RETIRED").length;
      const pretestCount = items.filter((i) => i.status === "PRETEST").length;

      const activeItems = items.filter((i) => i.status === "ACTIVE");

      distributions.push({
        cefr,
        count: items.length,
        avgDifficulty:
          activeItems.length > 0
            ? activeItems.reduce((a, i) => a + i.difficulty, 0) / activeItems.length
            : 0,
        avgDiscrimination:
          activeItems.length > 0
            ? activeItems.reduce((a, i) => a + i.discrimination, 0) / activeItems.length
            : 0,
        retiredCount,
        pretestCount,
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
   */
  private static async computePretestPipelineMetrics(
    organizationId: string
  ): Promise<PretestPipelineMetrics> {
    const pretestItems = await prisma.item.findMany({
      where: { organizationId, status: "PRETEST" },
      select: { id: true, createdAt: true },
    });

    const readyForCalibration = await Promise.all(
      pretestItems.map(async (item) => {
        const count = await prisma.response.count({
          where: { itemId: item.id, isPretest: true },
        });
        return count >= 30;
      })
    );

    const readyForPromotion = await Promise.all(
      pretestItems.map(async (item) => {
        const count = await prisma.response.count({
          where: { itemId: item.id, isPretest: true },
        });
        return count >= 50;
      })
    );

    // Items promoted this week
    const promotedThisWeek = await prisma.item.count({
      where: {
        organizationId,
        status: "ACTIVE",
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      totalPretestItems: pretestItems.length,
      readyForCalibration: readyForCalibration.filter((x) => x).length,
      readyForPromotion: readyForPromotion.filter((x) => x).length,
      promotedThisWeek,
      avgPromotionTime: 0, // TODO: Compute from audit logs
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
