/**
 * Cold-Start Optimizer
 *
 * Analyzes item bank coverage across (skill, CEFR, topic) combinations
 * and prioritizes pretest injection for under-tested areas.
 *
 * Goal: Ensure balanced pretest data collection across all skill-CEFR-topic combinations
 */

import { prisma } from "../prisma.js";
import type { CefrLevel, SkillType } from "@prisma/client";
import { getExposureStore } from "./exposure-store.js";

export interface CoverageGap {
  cohortKey: string; // "A1:READING:Grammar"
  skill: SkillType;
  cefrLevel: CefrLevel;
  topic: string;
  pretestCount: number;
  pretestItemIds: string[];
  activeItemCount: number;
  priority: number; // 0-1, where 1 = highest priority
}

export interface ColdStartMetrics {
  totalCohorts: number;
  coveredCohorts: number;
  underTestedCohorts: number; // < 20 pretest samples
  severelyCoveredCohorts: number; // < 5 pretest samples
  coverageRate: number; // coveredCohorts / totalCohorts
  priorityGaps: CoverageGap[];
}

const MINIMUM_PRETEST_SAMPLES = 20;
const SEVERELY_UNDER_TESTED = 5;

export class ColdStartAnalyzer {
  /**
   * Compute coverage gaps for all (skill, CEFR, topic) combinations.
   * Returns map where key = "skill:cefrLevel:topic" and value = pretest count.
   */
  static async computeCoverageGaps(organizationId: string): Promise<Map<string, number>> {
    const gaps = new Map<string, number>();

    // Get all active pretest items
    const pretestItems = await prisma.item.findMany({
      where: {
        organizationId,
        status: "PRETEST",
      },
      select: {
        id: true,
        skill: true,
        cefrLevel: true,
        tags: true,
      },
    });

    // For each pretest item, extract topic (first tag) and count by cohort
    const cohortCounts = new Map<string, number>();
    const cohortItems = new Map<string, string[]>();

    for (const item of pretestItems) {
      const topic = item.tags?.[0] || "uncategorized";
      const cohortKey = `${item.cefrLevel}:${item.skill}:${topic}`;

      cohortCounts.set(cohortKey, (cohortCounts.get(cohortKey) ?? 0) + 1);
      const items = cohortItems.get(cohortKey) ?? [];
      items.push(item.id);
      cohortItems.set(cohortKey, items);
    }

    // Build all possible cohorts (to identify completely missing combinations)
    const skills: SkillType[] = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
    const cefrLevels: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

    // Collect all unique topics from items
    const allTopics = new Set<string>();
    for (const item of pretestItems) {
      const topic = item.tags?.[0] || "uncategorized";
      allTopics.add(topic);
    }

    // Generate all possible cohorts
    for (const skill of skills) {
      for (const cefrLevel of cefrLevels) {
        for (const topic of allTopics) {
          const cohortKey = `${cefrLevel}:${skill}:${topic}`;
          if (!gaps.has(cohortKey)) {
            gaps.set(cohortKey, cohortCounts.get(cohortKey) ?? 0);
          }
        }
      }
    }

    return gaps;
  }

  /**
   * Get top N coverage gaps (most severely under-tested combinations).
   */
  static async getHighestPriorityGaps(
    organizationId: string,
    topN: number = 5
  ): Promise<CoverageGap[]> {
    const gaps = new Map<string, number>();
    const itemsByGap = new Map<string, string[]>();

    // Get all pretest items
    const pretestItems = await prisma.item.findMany({
      where: {
        organizationId,
        status: "PRETEST",
      },
      select: {
        id: true,
        skill: true,
        cefrLevel: true,
        tags: true,
      },
    });

    // Count pretest items per cohort
    for (const item of pretestItems) {
      const topic = item.tags?.[0] || "uncategorized";
      const cohortKey = `${item.cefrLevel}:${item.skill}:${topic}`;

      gaps.set(cohortKey, (gaps.get(cohortKey) ?? 0) + 1);
      const items = itemsByGap.get(cohortKey) ?? [];
      items.push(item.id);
      itemsByGap.set(cohortKey, items);
    }

    // Get count of active items per cohort
    const activeItems = await prisma.item.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        skill: true,
        cefrLevel: true,
        tags: true,
      },
    });

    const activeCounts = new Map<string, number>();
    for (const item of activeItems) {
      const topic = item.tags?.[0] || "uncategorized";
      const cohortKey = `${item.cefrLevel}:${item.skill}:${topic}`;
      activeCounts.set(cohortKey, (activeCounts.get(cohortKey) ?? 0) + 1);
    }

    // Convert to array and sort by priority
    const gapArray: CoverageGap[] = Array.from(gaps.entries()).map(([cohortKey, count]) => {
      const [cefrLevel, skill, topic] = cohortKey.split(":");

      // Calculate priority: lower count = higher priority
      // If count is 0, priority = 1.0 (highest)
      // If count >= MINIMUM_PRETEST_SAMPLES, priority = 0.1 (lowest)
      const priority = Math.max(0.1, 1.0 - (count / MINIMUM_PRETEST_SAMPLES));

      return {
        cohortKey,
        skill: skill as SkillType,
        cefrLevel: cefrLevel as CefrLevel,
        topic,
        pretestCount: count,
        pretestItemIds: itemsByGap.get(cohortKey) ?? [],
        activeItemCount: activeCounts.get(cohortKey) ?? 0,
        priority,
      };
    });

    // Sort by priority descending
    gapArray.sort((a, b) => b.priority - a.priority);

    return gapArray.slice(0, topN);
  }

  /**
   * Compute overall cold-start metrics for the organization.
   */
  static async computeMetrics(organizationId: string): Promise<ColdStartMetrics> {
    const gaps = await this.computeCoverageGaps(organizationId);
    const priorityGaps = await this.getHighestPriorityGaps(organizationId, 10);

    const totalCohorts = gaps.size;
    let coveredCohorts = 0;
    let underTestedCohorts = 0;
    let severelyCoveredCohorts = 0;

    for (const [_, count] of gaps.entries()) {
      if (count > 0) {
        coveredCohorts++;
      }
      if (count < MINIMUM_PRETEST_SAMPLES && count > 0) {
        underTestedCohorts++;
      }
      if (count < SEVERELY_UNDER_TESTED) {
        severelyCoveredCohorts++;
      }
    }

    const coverageRate = totalCohorts > 0 ? coveredCohorts / totalCohorts : 0;

    return {
      totalCohorts,
      coveredCohorts,
      underTestedCohorts,
      severelyCoveredCohorts,
      coverageRate,
      priorityGaps,
    };
  }

  /**
   * Get items that should be prioritized for injection based on coverage gaps.
   * Returns pretest items sorted by their gap priority.
   */
  static async getPrioritizedPretestItems(
    organizationId: string,
    limit: number = 20
  ): Promise<Array<{ id: string; skill: SkillType; cefrLevel: CefrLevel; topic: string; priority: number }>> {
    const priorityGaps = await this.getHighestPriorityGaps(organizationId, 10);
    const prioritizedItems: Array<{ id: string; skill: SkillType; cefrLevel: CefrLevel; topic: string; priority: number }> = [];

    // For each gap, select items that should be injected
    for (const gap of priorityGaps) {
      const items = await prisma.item.findMany({
        where: {
          id: { in: gap.pretestItemIds },
        },
        select: {
          id: true,
          skill: true,
          cefrLevel: true,
          tags: true,
        },
        take: Math.ceil(limit / priorityGaps.length), // Distribute across gaps
      });

      for (const item of items) {
        const topic = item.tags?.[0] || "uncategorized";
        prioritizedItems.push({
          id: item.id,
          skill: item.skill as SkillType,
          cefrLevel: item.cefrLevel as CefrLevel,
          topic,
          priority: gap.priority,
        });
      }
    }

    // Sort by priority descending
    prioritizedItems.sort((a, b) => b.priority - a.priority);

    return prioritizedItems.slice(0, limit);
  }
}
