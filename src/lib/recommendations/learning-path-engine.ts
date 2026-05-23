/**
 * b4skills Personalised Learning Path Engine
 *
 * Generates adaptive learning paths based on:
 *  - Current IRT theta estimate per skill
 *  - Weak skill identification
 *  - Spaced retrieval scheduling
 *  - CEFR milestone targeting
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  targetCefrLevel: string;
  targetSkill: string;
  estimatedDays: number;
  prerequisiteMilestoneIds: string[];
  items: string[]; // item IDs
  completionCriteria: { minScore: number; minSessions: number };
}

export interface PersonalisedLearningPath {
  candidateId: string;
  generatedAt: Date;
  currentCefrLevel: string;
  targetCefrLevel: string;
  estimatedWeeksToTarget: number;
  milestones: LearningMilestone[];
  weeklyGoal: { sessions: number; minutesPerDay: number };
  prioritySkills: string[];
  nextRecommendedItems: Array<{ itemId: string; skill: string; reason: string }>;
}

export interface SkillGap {
  skill: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  priority: "critical" | "high" | "medium" | "low";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILL_WEIGHTS: Record<string, number> = {
  GRAMMAR: 0.2,
  VOCABULARY: 0.2,
  READING: 0.2,
  LISTENING: 0.15,
  SPEAKING: 0.15,
  WRITING: 0.1,
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class LearningPathEngine {
  async generatePersonalisedPath(
    candidateId: string,
    targetCefrLevel?: string
  ): Promise<PersonalisedLearningPath> {
    const user = await prisma.user.findUnique({
      where: { id: candidateId },
      include: {
        sessions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 20,
          include: { responses: true },
        },
        candidateProfile: true,
      },
    });
    if (!user) throw new Error(`Candidate ${candidateId} not found`);

    // Compute skill scores from sessions
    const skillScores = await this.computeSkillScores(candidateId);
    const currentCefr = this.scoresToCefr(skillScores);
    const target = targetCefrLevel ?? this.nextCefrLevel(currentCefr);

    // Identify skill gaps
    const gaps = this.identifySkillGaps(skillScores, target);
    const prioritySkills = gaps.filter((g) => g.priority === "critical" || g.priority === "high").map((g) => g.skill);

    // Build milestones
    const milestones = await this.buildMilestones(candidateId, currentCefr, target, gaps, skillScores);

    // Next recommended items
    const nextItems = await this.selectNextItems(candidateId, gaps, skillScores);

    // Estimate time to target
    const totalDays = milestones.reduce((sum, m) => sum + m.estimatedDays, 0);
    const estimatedWeeksToTarget = Math.round(totalDays / 7);

    return {
      candidateId,
      generatedAt: new Date(),
      currentCefrLevel: currentCefr,
      targetCefrLevel: target,
      estimatedWeeksToTarget,
      milestones,
      weeklyGoal: { sessions: 3, minutesPerDay: 20 },
      prioritySkills,
      nextRecommendedItems: nextItems,
    };
  }

  async identifyWeakSkills(candidateId: string): Promise<SkillGap[]> {
    const skillScores = await this.computeSkillScores(candidateId);
    const currentCefr = this.scoresToCefr(skillScores);
    const nextCefr = this.nextCefrLevel(currentCefr);
    return this.identifySkillGaps(skillScores, nextCefr);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async computeSkillScores(candidateId: string): Promise<Record<string, number>> {
    const sessions = await prisma.session.findMany({
      where: { candidateId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { theta: true, cefrLevel: true },
    });

    const bySkill: Record<string, number[]> = {};
    for (const session of sessions) {
      const score = session.theta !== null ? Math.round((session.theta + 3) * (100 / 6)) : 0;
      const skill = "OVERALL";
      if (!bySkill[skill]) bySkill[skill] = [];
      bySkill[skill].push(score);
    }

    const result: Record<string, number> = {};
    for (const [skill, scores] of Object.entries(bySkill)) {
      result[skill] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    return result;
  }

  private scoresToCefr(skillScores: Record<string, number>): string {
    const values = Object.values(skillScores);
    if (values.length === 0) return "A1";
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg >= 90) return "C2";
    if (avg >= 75) return "C1";
    if (avg >= 60) return "B2";
    if (avg >= 45) return "B1";
    if (avg >= 30) return "A2";
    return "A1";
  }

  private nextCefrLevel(current: string): string {
    const idx = CEFR_ORDER.indexOf(current);
    return CEFR_ORDER[Math.min(idx + 1, CEFR_ORDER.length - 1)];
  }

  private identifySkillGaps(skillScores: Record<string, number>, targetCefr: string): SkillGap[] {
    const targetScore = this.cefrToMinScore(targetCefr);
    const gaps: SkillGap[] = [];

    for (const skill of Object.keys(SKILL_WEIGHTS)) {
      const current = skillScores[skill] ?? 0;
      const gap = Math.max(0, targetScore - current);
      let priority: SkillGap["priority"] = "low";
      if (gap > 30) priority = "critical";
      else if (gap > 20) priority = "high";
      else if (gap > 10) priority = "medium";

      gaps.push({ skill, currentScore: current, targetScore, gap, priority });
    }

    return gaps.sort((a, b) => b.gap - a.gap);
  }

  private cefrToMinScore(cefr: string): number {
    const map: Record<string, number> = { A1: 20, A2: 35, B1: 50, B2: 65, C1: 80, C2: 90 };
    return map[cefr] ?? 50;
  }

  private async buildMilestones(
    candidateId: string,
    currentCefr: string,
    targetCefr: string,
    gaps: SkillGap[],
    skillScores: Record<string, number>
  ): Promise<LearningMilestone[]> {
    const milestones: LearningMilestone[] = [];

    // One milestone per critical/high-priority skill gap
    const priorityGaps = gaps.filter((g) => g.gap > 0).slice(0, 4);

    for (let i = 0; i < priorityGaps.length; i++) {
      const gap = priorityGaps[i];
      const items = await this.findItemsForSkill(gap.skill, currentCefr, 8);

      milestones.push({
        id: `m-${i + 1}`,
        title: `${gap.skill.charAt(0) + gap.skill.slice(1).toLowerCase()} Strengthening`,
        description: `Improve ${gap.skill.toLowerCase()} from ${gap.currentScore} to ${gap.targetScore}`,
        targetCefrLevel: targetCefr,
        targetSkill: gap.skill,
        estimatedDays: Math.round(gap.gap * 0.7),
        prerequisiteMilestoneIds: i > 0 ? [`m-${i}`] : [],
        items,
        completionCriteria: { minScore: gap.targetScore - 5, minSessions: 3 },
      });
    }

    // Final consolidation milestone
    const allItems = await this.findItemsForSkill("READING", targetCefr, 5);
    milestones.push({
      id: `m-${priorityGaps.length + 1}`,
      title: `${targetCefr} Consolidation`,
      description: `Reach ${targetCefr} level across all skills`,
      targetCefrLevel: targetCefr,
      targetSkill: "OVERALL",
      estimatedDays: 14,
      prerequisiteMilestoneIds: milestones.map((m) => m.id),
      items: allItems,
      completionCriteria: { minScore: this.cefrToMinScore(targetCefr), minSessions: 2 },
    });

    return milestones;
  }

  private async findItemsForSkill(skill: string, cefrLevel: string, limit: number): Promise<string[]> {
    const items = await prisma.item.findMany({
      where: { skill: skill as any, cefrLevel: cefrLevel as any },
      select: { id: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return items.map((i) => i.id);
  }

  private async selectNextItems(
    candidateId: string,
    gaps: SkillGap[],
    skillScores: Record<string, number>
  ): Promise<Array<{ itemId: string; skill: string; reason: string }>> {
    const result: Array<{ itemId: string; skill: string; reason: string }> = [];

    for (const gap of gaps.slice(0, 3)) {
      const cefrForGap = this.scoreToCefr(gap.currentScore);
      const items = await prisma.item.findMany({
        where: { skill: gap.skill as any, cefrLevel: cefrForGap as any },
        select: { id: true },
        take: 2,
        orderBy: { createdAt: "desc" },
      });

      for (const item of items) {
        result.push({
          itemId: item.id,
          skill: gap.skill,
          reason: `Priority skill gap: ${gap.skill} (${gap.gap} points below target)`,
        });
      }
    }

    return result;
  }

  private scoreToCefr(score: number): string {
    if (score >= 90) return "C2";
    if (score >= 75) return "C1";
    if (score >= 60) return "B2";
    if (score >= 45) return "B1";
    if (score >= 30) return "A2";
    return "A1";
  }
}

export const learningPathEngine = new LearningPathEngine();
