/**
 * b4skills Cultural Learning Path Adapter
 * Adapts base learning paths for cultural context (instructional style, pacing, examples).
 */

import { getCulturalContext, getInstructionalStyle, getFeedbackStyle } from "../i18n/cultural-framework.js";
import { dialectEngine } from "../i18n/dialect-engine.js";
import type { PersonalisedLearningPath } from "./learning-path-engine.js";

export interface CulturallyAdaptedPath extends PersonalisedLearningPath {
  region: string;
  instructionalStyle: "direct" | "narrative" | "socratic" | "mixed";
  feedbackStyle: "direct" | "indirect" | "narrative" | "peer";
  paceAdjustmentFactor: number; // 1.0 = normal, 1.2 = slower for high uncertainty avoidance
  groupworkExpectation: number; // 0-100 % collaborative work
  competitiveRankingEnabled: boolean;
  culturalNotes: string[];
}

export class CulturalLearningPathAdapter {
  adapt(basePath: PersonalisedLearningPath, region: string): CulturallyAdaptedPath {
    const ctx = getCulturalContext(region);
    const instructionalStyle = getInstructionalStyle(ctx);
    const feedbackStyle = getFeedbackStyle(ctx);
    const dialect = dialectEngine.mapRegionToDialect(region);

    // Pace adjustment: high uncertainty avoidance cultures prefer slower, more structured progression
    const paceAdjustmentFactor = ctx.culturalValues.uncertaintyAvoidance > 70 ? 1.25 :
      ctx.culturalValues.uncertaintyAvoidance > 50 ? 1.1 : 1.0;

    // Group work expectation based on individualism index
    const groupworkExpectation = ctx.culturalValues.individualismIndex < 40 ? 60 :
      ctx.culturalValues.individualismIndex < 60 ? 30 : 15;

    const competitiveRankingEnabled =
      ctx.assessmentPreferences.competitiveVsCollaborative !== "collaborative";

    const culturalNotes: string[] = [];
    if (instructionalStyle === "direct") {
      culturalNotes.push("Instruction delivered in direct, authoritative style appropriate for this culture");
    }
    if (ctx.assessmentPreferences.contextVsLinear === "high-context") {
      culturalNotes.push("Enhanced narrative context added to assessment items for high-context culture");
    }
    if (ctx.contentRestrictions.foodCulturalSensitivity.length > 0) {
      culturalNotes.push(`Food sensitivities applied: ${ctx.contentRestrictions.foodCulturalSensitivity.join(", ")}`);
    }
    if (paceAdjustmentFactor > 1.0) {
      culturalNotes.push(`Pacing slowed by ${Math.round((paceAdjustmentFactor - 1) * 100)}% to accommodate preference for structured progression`);
    }

    // Adapt milestone titles using dialect
    const adaptedMilestones = basePath.milestones.map((m) => ({
      ...m,
      title: dialectEngine.adaptText(m.title, dialect),
      description: dialectEngine.adaptText(m.description, dialect),
      estimatedDays: Math.round(m.estimatedDays * paceAdjustmentFactor),
    }));

    return {
      ...basePath,
      milestones: adaptedMilestones,
      region,
      instructionalStyle,
      feedbackStyle,
      paceAdjustmentFactor,
      groupworkExpectation,
      competitiveRankingEnabled,
      culturalNotes,
      estimatedWeeksToTarget: Math.round(basePath.estimatedWeeksToTarget * paceAdjustmentFactor),
    };
  }
}

export const culturalLearningPathAdapter = new CulturalLearningPathAdapter();
