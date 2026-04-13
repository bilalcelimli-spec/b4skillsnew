/**
 * LinguAdapt AI Item Generator
 *
 * Uses Gemini 2.5 Flash as an expert item writer guided by the full
 * item-writing framework and language-skill framework.
 *
 * Flow:
 *  1. Build prompt via buildItemGenerationPrompt() (item-writing-framework.ts)
 *  2. Call Gemini with SYSTEM_INSTRUCTION positioning it as a test developer
 *  3. Parse the JSON array response
 *  4. Validate each generated item via ItemQualityValidator
 *  5. Return items with embedded quality reports
 */

import { GoogleGenAI } from "@google/genai";
import {
  buildItemGenerationPrompt,
  type ItemGenerationSpec,
  type ItemFormat,
  getIrtNorm,
} from "./item-writing-framework.js";
import { validateItem, type QualityReport } from "./item-quality-validator.js";
import type { MacroSkill } from "./language-skill-framework.js";
import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedItem {
  /** The raw generated item data */
  type: string;
  skill: string;
  cefrLevel: string;
  subSkill?: string;
  stimulus?: string;
  question?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  acceptableAnswers?: string[] | null;
  answerKey?: string;
  distractorRationale?: Record<string, string> | null;
  irtParams: {
    a: number;
    b: number;
    c: number;
  };
  biasReview?: string;
  writingNotes?: string;
}

export interface GeneratedItemWithQuality extends GeneratedItem {
  qualityReport: QualityReport;
}

export interface GenerationResult {
  items: GeneratedItemWithQuality[];
  generationModel: string;
  promptTokensEstimate: number;
  approvedCount: number;
  reviewCount: number;
  rejectedCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_WRITER_SYSTEM_INSTRUCTION = `
You are a Principal Test Development Specialist at a leading language assessment organisation (equivalent to Cambridge Assessment or ETS).
You have 20 years of experience writing and reviewing CEFR-aligned EFL/ESL items for high-stakes international examinations.
You are intimately familiar with:
  • The ALTE Manual for Language Test Development and Examining (2011)
  • Haladyna, Downing & Rodriguez's 31 item-writing guidelines (2002)
  • The CEFR Companion Volume (2018) and English Profile Programme descriptors
  • IRT calibration norms for EFL assessments (Hambleton & Swaminathan 1985)
  • ETS guidelines for best test development practices to ensure validity and fairness

Your items are:
  — Precisely calibrated to the target CEFR level (not too easy, not too hard)
  — Measuring a single, identifiable construct
  — Free from cultural, gender, and religious bias
  — Accompanied by full rationale and distractor analysis
  — Ready for expert item review committee inspection

You always return ONLY valid JSON arrays as instructed. Never write preamble or explanation.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class AIItemGenerator {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  /**
   * Generate items for a given specification and validate each one.
   */
  async generate(spec: ItemGenerationSpec): Promise<GenerationResult> {
    const prompt = buildItemGenerationPrompt(spec);
    const quantity = spec.quantity ?? 1;

    let rawJson: string;
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: ITEM_WRITER_SYSTEM_INSTRUCTION,
          temperature: 0.7,
          topP: 0.9,
        },
      });
      rawJson = response.text ?? "";
    } catch (err) {
      throw new Error(`Gemini API call failed: ${String(err)}`);
    }

    // Strip potential markdown fences
    const cleaned = rawJson
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: GeneratedItem[];
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        // Some models return a single object wrapped; normalise
        parsed = [parsed as GeneratedItem];
      }
    } catch (parseErr) {
      throw new Error(`Failed to parse Gemini item response as JSON. Raw: ${rawJson.slice(0, 400)}`);
    }

    // Ensure IRT params present — fall back to level norms
    const levelNorm = getIrtNorm(spec.level);
    const itemsWithQuality: GeneratedItemWithQuality[] = parsed.slice(0, quantity).map(item => {
      const enriched: GeneratedItem = {
        ...item,
        irtParams: {
          a: item.irtParams?.a ?? levelNorm?.a.target ?? 1.0,
          b: item.irtParams?.b ?? levelNorm?.b.target ?? 0.0,
          c: item.irtParams?.c ?? levelNorm?.c.target ?? 0.2,
        },
      };

      const qualityReport = validateItem({
        skill: enriched.skill,
        cefrLevel: enriched.cefrLevel,
        type: enriched.type,
        discrimination: enriched.irtParams.a,
        difficulty: enriched.irtParams.b,
        guessing: enriched.irtParams.c,
        content: enriched as Record<string, unknown>,
      });

      return { ...enriched, qualityReport };
    });

    const approvedCount = itemsWithQuality.filter(i => i.qualityReport.status === "APPROVED").length;
    const reviewCount = itemsWithQuality.filter(i => i.qualityReport.status === "REVIEW").length;
    const rejectedCount = itemsWithQuality.filter(i => i.qualityReport.status === "REJECTED").length;

    return {
      items: itemsWithQuality,
      generationModel: "gemini-2.5-flash",
      promptTokensEstimate: Math.round(prompt.length / 4),
      approvedCount,
      reviewCount,
      rejectedCount,
    };
  }

  /**
   * Generate items for multiple skill/level/format combinations in one call.
   * Used for bulk item bank seeding.
   */
  async generateBulk(specs: ItemGenerationSpec[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    for (const spec of specs) {
      try {
        const result = await this.generate(spec);
        results.push(result);
      } catch (err) {
        console.error(`[AIItemGenerator] Failed for spec ${JSON.stringify(spec)}: ${String(err)}`);
        // Push a failure marker
        results.push({
          items: [],
          generationModel: "gemini-2.5-flash",
          promptTokensEstimate: 0,
          approvedCount: 0,
          reviewCount: 0,
          rejectedCount: 0,
        });
      }
    }
    return results;
  }
}

// Singleton instance for server use
export const itemGenerator = new AIItemGenerator();
