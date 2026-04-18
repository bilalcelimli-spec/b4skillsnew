import { prisma } from "../prisma";
import { CalibrationService } from "../assessment-engine/calibration-service";
import { validateItem } from "../language-skills/item-quality-validator";

/**
 * AI Item Generation Pipeline
 * 
 * End-to-end pipeline from AI generation to item bank activation:
 * 
 * Stage 1: GENERATE - AI generates item drafts (via existing ai-item-generator)
 * Stage 2: AUTO-QA  - Automated quality checks (readability, distractor plausibility, IRT norms)
 * Stage 3: EXPERT-REVIEW - Queue for human expert review
 * Stage 4: PRETEST  - Deploy as pretest item in live sessions
 * Stage 5: CALIBRATE - Calculate IRT parameters from real responses
 * Stage 6: ACTIVATE - Move to active item bank if quality criteria met
 */

export type PipelineStage = 
  | "GENERATED"
  | "AUTO_QA_PASSED" 
  | "AUTO_QA_FAILED"
  | "EXPERT_REVIEW"
  | "EXPERT_APPROVED"
  | "EXPERT_REJECTED"
  | "PRETEST"
  | "CALIBRATING"
  | "ACTIVATED"
  | "RETIRED";

export interface PipelineItem {
  itemId: string;
  stage: PipelineStage;
  autoQaScore?: number;
  autoQaIssues?: string[];
  expertReviewerId?: string;
  expertNotes?: string;
  pretestResponses?: number;
  calibrationResult?: {
    discrimination: number;
    difficulty: number;
    guessing: number;
    fit: { infit: number; outfit: number };
  };
}

/** Minimum criteria for activating a pretest item */
const ACTIVATION_CRITERIA = {
  minPretestResponses: 50,
  minDiscrimination: 0.5,
  maxDiscrimination: 3.0,
  minPValue: 0.1,
  maxPValue: 0.95,
  maxOutfit: 2.0,
  maxInfit: 1.5,
  minPointBiserial: 0.15,
};

export const ItemGenerationPipeline = {
  /**
   * Stage 2: Run automated QA on a generated item
   */
  async runAutoQA(itemId: string): Promise<{ passed: boolean; score: number; issues: string[] }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Item not found");

    const content = item.content as any;
    const report = validateItem({
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      type: item.type,
      discrimination: item.discrimination,
      difficulty: item.difficulty,
      guessing: item.guessing,
      content,
    });

    const issues: string[] = [];
    let score = 100;

    // Check passage readability for CEFR alignment
    if (content?.passage) {
      const wordCount = content.passage.split(/\s+/).length;
      const cefrWordLimits: Record<string, [number, number]> = {
        A1: [50, 150], A2: [100, 250], B1: [150, 350],
        B2: [200, 450], C1: [250, 600], C2: [300, 800],
      };
      const limits = cefrWordLimits[item.cefrLevel] || [50, 500];
      if (wordCount < limits[0]) { issues.push(`Passage too short (${wordCount} words, min ${limits[0]})`); score -= 15; }
      if (wordCount > limits[1]) { issues.push(`Passage too long (${wordCount} words, max ${limits[1]})`); score -= 10; }
    }

    // Check distractor count
    if (content?.options) {
      if (content.options.length < 3) { issues.push("Too few options (min 3)"); score -= 20; }
      if (content.options.length > 5) { issues.push("Too many options (max 5)"); score -= 5; }

      // Check for duplicate options
      const texts = content.options.map((o: any) => (typeof o === "string" ? o : o.text).toLowerCase().trim());
      const unique = new Set(texts);
      if (unique.size < texts.length) { issues.push("Duplicate options detected"); score -= 25; }

      // Check correct answer exists
      const hasCorrect = content.options.some((o: any) => typeof o === "object" && o.isCorrect);
      if (!hasCorrect && content.correctIndex === undefined) { issues.push("No correct answer specified"); score -= 30; }
    }

    // Check prompt exists
    if (!content?.prompt) { issues.push("Missing prompt"); score -= 20; }

    // IRT parameter plausibility
    if (item.discrimination < 0.3) { issues.push("Very low discrimination"); score -= 15; }
    if (item.discrimination > 3.0) { issues.push("Unrealistically high discrimination"); score -= 10; }
    if (item.guessing > 0.35) { issues.push("High guessing parameter"); score -= 10; }

    // Quality validator issues
    if (report && !report.isValid) {
      issues.push(...(report.errors || []).map((e: any) => typeof e === 'string' ? e : e.message || String(e)));
      score -= 15;
    }

    score = Math.max(0, score);
    const passed = score >= 70;

    // Update item metadata with QA results
    await prisma.item.update({
      where: { id: itemId },
      data: {
        metadata: {
          ...(item.metadata as any || {}),
          pipelineStage: passed ? "AUTO_QA_PASSED" : "AUTO_QA_FAILED",
          autoQaScore: score,
          autoQaIssues: issues,
          autoQaTimestamp: new Date().toISOString(),
        },
      },
    });

    return { passed, score, issues };
  },

  /**
   * Stage 3: Submit item for expert review
   */
  async submitForExpertReview(itemId: string) {
    await prisma.item.update({
      where: { id: itemId },
      data: {
        metadata: {
          ...(await prisma.item.findUnique({ where: { id: itemId } }).then(i => (i?.metadata as any) || {})),
          pipelineStage: "EXPERT_REVIEW",
          expertReviewSubmittedAt: new Date().toISOString(),
        },
      },
    });
  },

  /**
   * Stage 3b: Expert approves or rejects
   */
  async processExpertReview(itemId: string, approved: boolean, reviewerId: string, notes?: string) {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Item not found");

    const meta = (item.metadata as any) || {};
    const stage = approved ? "EXPERT_APPROVED" : "EXPERT_REJECTED";

    await prisma.item.update({
      where: { id: itemId },
      data: {
        metadata: {
          ...meta,
          pipelineStage: stage,
          expertReviewerId: reviewerId,
          expertNotes: notes,
          expertReviewTimestamp: new Date().toISOString(),
        },
      },
    });

    // If approved, move to pretest
    if (approved) {
      await this.deployAsPretest(itemId);
    }
  },

  /**
   * Stage 4: Deploy as pretest item in live sessions
   */
  async deployAsPretest(itemId: string) {
    await prisma.item.update({
      where: { id: itemId },
      data: {
        status: "PRETEST" as any,
        metadata: {
          ...(await prisma.item.findUnique({ where: { id: itemId } }).then(i => (i?.metadata as any) || {})),
          pipelineStage: "PRETEST",
          pretestDeployedAt: new Date().toISOString(),
        },
      },
    });
  },

  /**
   * Stage 5: Check if pretest item has enough responses and calibrate
   */
  async checkAndCalibrate(itemId: string): Promise<{ ready: boolean; responseCount: number }> {
    const responseCount = await prisma.response.count({ where: { itemId } });

    if (responseCount < ACTIVATION_CRITERIA.minPretestResponses) {
      return { ready: false, responseCount };
    }

    // Trigger calibration
    try {
      await CalibrationService.recalibrateItem(itemId);
    } catch (e) {
      console.warn(`Calibration failed for ${itemId}:`, e);
    }

    // Update pipeline stage
    await prisma.item.update({
      where: { id: itemId },
      data: {
        metadata: {
          ...(await prisma.item.findUnique({ where: { id: itemId } }).then(i => (i?.metadata as any) || {})),
          pipelineStage: "CALIBRATING",
          calibratedAt: new Date().toISOString(),
          pretestResponseCount: responseCount,
        },
      },
    });

    return { ready: true, responseCount };
  },

  /**
   * Stage 6: Evaluate calibrated item and activate if criteria met
   */
  async evaluateAndActivate(itemId: string): Promise<{ activated: boolean; reasons: string[] }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Item not found");

    const reasons: string[] = [];

    // Check discrimination
    if (item.discrimination < ACTIVATION_CRITERIA.minDiscrimination) {
      reasons.push(`Discrimination too low (${item.discrimination} < ${ACTIVATION_CRITERIA.minDiscrimination})`);
    }
    if (item.discrimination > ACTIVATION_CRITERIA.maxDiscrimination) {
      reasons.push(`Discrimination too high (${item.discrimination} > ${ACTIVATION_CRITERIA.maxDiscrimination})`);
    }

    // Check p-value (proportion correct from responses)
    const responses = await prisma.response.findMany({ where: { itemId } });
    const correctCount = responses.filter(r => r.isCorrect).length;
    const pValue = responses.length > 0 ? correctCount / responses.length : 0;

    if (pValue < ACTIVATION_CRITERIA.minPValue) {
      reasons.push(`P-value too low (${pValue.toFixed(2)} < ${ACTIVATION_CRITERIA.minPValue})`);
    }
    if (pValue > ACTIVATION_CRITERIA.maxPValue) {
      reasons.push(`P-value too high (${pValue.toFixed(2)} > ${ACTIVATION_CRITERIA.maxPValue})`);
    }

    const activated = reasons.length === 0;

    await prisma.item.update({
      where: { id: itemId },
      data: {
        status: activated ? "ACTIVE" as any : "PRETEST" as any,
        metadata: {
          ...((item.metadata as any) || {}),
          pipelineStage: activated ? "ACTIVATED" : "CALIBRATING",
          activationResult: { activated, reasons, evaluatedAt: new Date().toISOString() },
        },
      },
    });

    return { activated, reasons };
  },

  /**
   * Get pipeline status for all items
   */
  async getPipelineStatus() {
    const items = await prisma.item.findMany({
      where: {
        metadata: { path: ["pipelineStage"], not: undefined as any },
      },
      select: { id: true, skill: true, cefrLevel: true, status: true, metadata: true },
    });

    const stages: Record<string, number> = {};
    for (const item of items) {
      const stage = (item.metadata as any)?.pipelineStage || "UNKNOWN";
      stages[stage] = (stages[stage] || 0) + 1;
    }

    return { totalPipelineItems: items.length, stageDistribution: stages, items };
  },

  /**
   * Batch process: check all pretest items for calibration readiness
   */
  async batchCheckPretestItems() {
    const pretestItems = await prisma.item.findMany({
      where: { status: "PRETEST" as any },
      select: { id: true },
    });

    const results = [];
    for (const item of pretestItems) {
      const result = await this.checkAndCalibrate(item.id);
      if (result.ready) {
        const activation = await this.evaluateAndActivate(item.id);
        results.push({ itemId: item.id, ...result, ...activation });
      } else {
        results.push({ itemId: item.id, ...result });
      }
    }

    return results;
  },
};
