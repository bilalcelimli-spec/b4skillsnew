/**
 * LinguAdapt AI Item Generator — Three-Persona SOTA Pipeline
 *
 * Modelled after Cambridge Assessment / ETS multi-pass item development:
 *
 *  Pass 1  WRITER    Gemini 2.5 Flash — generate draft item from spec
 *  Pass 2  REVIEWER  Gemini 2.5 Flash — independent expert critique
 *  Pass 3  REVISER   Gemini 2.5 Flash — address reviewer issues, produce final version
 *  Pass 4  QA GATE   ItemQualityValidator + ReadabilityEngine — automated final check
 *
 * Auto-revision: if QA score < AUTO_REVISION_THRESHOLD, inject specific issues
 * into a new Reviser call (up to MAX_REVISION_ATTEMPTS).
 *
 * The three-persona approach prevents the primary author's blind spots from
 * persisting into the item bank undetected — the independent reviewing pass
 * uses a fundamentally different cognitive frame (finding faults vs. creating).
 */

import { GoogleGenAI } from "@google/genai";
import {
  buildItemGenerationPrompt,
  type ItemGenerationSpec,
  getIrtNorm,
} from "./item-writing-framework.js";
import { validateItem, type QualityReport } from "./item-quality-validator.js";
import { analyseText } from "./readability-engine.js";
import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const MAX_REVISION_ATTEMPTS = 3;
const AUTO_REVISION_THRESHOLD = 70;   // QA score below this triggers auto-revision
const TEMPERATURE_WRITER = 0.7;
const TEMPERATURE_REVIEWER = 0.3;     // Lower temp → more deterministic critique
const TEMPERATURE_REVISER = 0.5;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedItem {
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

export interface ItemReviewIssue {
  category: "construct_validity" | "cefr_alignment" | "item_format" | "language_quality" | "bias" | "irt_plausibility" | "distractor_quality";
  severity: "critical" | "major" | "minor";
  description: string;
  suggestion: string;
}

export interface ItemReview {
  overallVerdict: "PASS" | "REVISE" | "REJECT";
  issues: ItemReviewIssue[];
  cefrAlignmentScore: number;     // 0–5
  constructClarity: number;       // 0–5
  languageAppropriacy: number;    // 0–5
  distractorQualityScore: number; // 0–5 (N/A for open-ended → 5)
  summaryFeedback: string;
}

export interface RevisionRecord {
  attempt: number;
  qualityScore: number;
  status: "APPROVED" | "REVIEW" | "REJECTED";
  issueCount: number;
}

export interface GeneratedItemWithQuality extends GeneratedItem {
  qualityReport: QualityReport;
  itemReview?: ItemReview;
  readabilityScore?: number;
  revisionHistory: RevisionRecord[];
  totalGenerationPasses: number;
}

export interface GenerationResult {
  items: GeneratedItemWithQuality[];
  generationModel: string;
  approvedCount: number;
  reviewCount: number;
  rejectedCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE SYSTEM PERSONAS
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

You always return ONLY valid JSON as instructed. Never write preamble or explanation.
`.trim();

const ITEM_REVIEWER_SYSTEM_INSTRUCTION = `
You are a Chief Item Review Committee Member at a professional language testing body.
You are *not* the author of the item you are reviewing. Your role is to identify every flaw, ambiguity, bias risk, and construct-validity concern — no matter how minor.
You have deep knowledge of:
  • Common item-writing flaws: stem clues, implausible distractors, double-barrelled stems, cueing from grammar
  • CEFR calibration: how to identify items that are too easy or too hard for the stated level
  • Bias and fairness: DIF indicators, cultural loading, gendered language, religious or political sensitivity
  • IRT plausibility: whether discrimination (a), difficulty (b), and guessing (c) values are realistic for the format and level

Be stringent. Identify issues that the original writer likely missed.
Return ONLY valid JSON matching the ItemReview schema. No explanation outside the JSON.
`.trim();

const ITEM_REVISER_SYSTEM_INSTRUCTION = `
You are the original item writer receiving feedback from the item review committee.
You take every piece of reviewer feedback seriously and produce a corrected, improved version of the item.
All critical and major issues MUST be fully resolved. Minor issues should be addressed where possible.
Do NOT change the fundamental construct being measured, the CEFR level target, or the item format unless the reviewer explicitly requires it.
Return ONLY the corrected item as a single valid JSON object — not an array. No explanation outside the JSON.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildReviewPrompt(spec: ItemGenerationSpec, itemJson: string): string {
  return `
You are reviewing an item written for the following specification:
  Skill: ${spec.skill}
  CEFR Level: ${spec.level}
  Format: ${spec.format}
  ${spec.genre ? `Genre: ${spec.genre}` : ""}
  ${spec.topic ? `Topic: ${spec.topic}` : ""}
  ${spec.targetSubSkill ? `Target Sub-Skill: ${spec.targetSubSkill}` : ""}

Here is the item as written:
\`\`\`json
${itemJson}
\`\`\`

Your task: Critically review this item and return a JSON object with EXACTLY this schema:
{
  "overallVerdict": "PASS" | "REVISE" | "REJECT",
  "issues": [
    {
      "category": "construct_validity" | "cefr_alignment" | "item_format" | "language_quality" | "bias" | "irt_plausibility" | "distractor_quality",
      "severity": "critical" | "major" | "minor",
      "description": "specific problem found",
      "suggestion": "actionable fix"
    }
  ],
  "cefrAlignmentScore": 0-5,
  "constructClarity": 0-5,
  "languageAppropriacy": 0-5,
  "distractorQualityScore": 0-5,
  "summaryFeedback": "2-3 sentence overall assessment"
}

Return ONLY the JSON. No markdown, no preamble.
`.trim();
}

function buildRevisionPrompt(spec: ItemGenerationSpec, originalItemJson: string, review: ItemReview): string {
  const criticalIssues = review.issues.filter(i => i.severity === "critical");
  const majorIssues = review.issues.filter(i => i.severity === "major");
  const minorIssues = review.issues.filter(i => i.severity === "minor");

  return `
You originally wrote the following item for this specification:
  Skill: ${spec.skill}  |  CEFR Level: ${spec.level}  |  Format: ${spec.format}

Your original item:
\`\`\`json
${originalItemJson}
\`\`\`

The review committee has returned the following feedback:

Overall verdict: ${review.overallVerdict}
Summary: "${review.summaryFeedback}"

${criticalIssues.length > 0 ? `CRITICAL ISSUES (must fix):\n${criticalIssues.map((i, n) => `  ${n + 1}. [${i.category}] ${i.description}\n     → Suggestion: ${i.suggestion}`).join("\n")}` : ""}

${majorIssues.length > 0 ? `MAJOR ISSUES (must fix):\n${majorIssues.map((i, n) => `  ${n + 1}. [${i.category}] ${i.description}\n     → Suggestion: ${i.suggestion}`).join("\n")}` : ""}

${minorIssues.length > 0 ? `MINOR ISSUES (address where possible):\n${minorIssues.map((i, n) => `  ${n + 1}. [${i.category}] ${i.description}\n     → Suggestion: ${i.suggestion}`).join("\n")}` : ""}

Rewrite the item addressing ALL critical and major issues. Return ONLY the corrected item as a single JSON object (same schema as before). No markdown fences, no explanation.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON PARSING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();
}

function parseItemArray(raw: string): GeneratedItem[] {
  const cleaned = stripFences(raw);
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function parseSingleItem(raw: string): GeneratedItem {
  const cleaned = stripFences(raw);
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

function parseItemReview(raw: string): ItemReview {
  const cleaned = stripFences(raw);
  return JSON.parse(cleaned) as ItemReview;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class AIItemGenerator {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  // ── Pass 1: Writer ──────────────────────────────────────────────────────────
  private async callWriter(spec: ItemGenerationSpec): Promise<string> {
    const prompt = buildItemGenerationPrompt(spec);
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: ITEM_WRITER_SYSTEM_INSTRUCTION,
        temperature: TEMPERATURE_WRITER,
        topP: 0.9,
      },
    });
    return response.text ?? "";
  }

  // ── Pass 2: Reviewer ────────────────────────────────────────────────────────
  private async callReviewer(spec: ItemGenerationSpec, itemJson: string): Promise<string> {
    const prompt = buildReviewPrompt(spec, itemJson);
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: ITEM_REVIEWER_SYSTEM_INSTRUCTION,
        temperature: TEMPERATURE_REVIEWER,
        topP: 0.85,
      },
    });
    return response.text ?? "";
  }

  // ── Pass 3: Reviser ─────────────────────────────────────────────────────────
  private async callReviser(spec: ItemGenerationSpec, itemJson: string, review: ItemReview): Promise<string> {
    const prompt = buildRevisionPrompt(spec, itemJson, review);
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: ITEM_REVISER_SYSTEM_INSTRUCTION,
        temperature: TEMPERATURE_REVISER,
        topP: 0.9,
      },
    });
    return response.text ?? "";
  }

  // ── QA Gate ─────────────────────────────────────────────────────────────────
  private runQaGate(item: GeneratedItem): { qualityReport: QualityReport; readabilityScore: number } {
    const levelNorm = getIrtNorm(item.cefrLevel as CefrLevel);
    const qualityReport = validateItem({
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      type: item.type,
      discrimination: item.irtParams?.a ?? levelNorm?.a.target ?? 1.0,
      difficulty: item.irtParams?.b ?? levelNorm?.b.target ?? 0.0,
      guessing: item.irtParams?.c ?? levelNorm?.c.target ?? 0.2,
      content: item as Record<string, unknown>,
    });

    let readabilityScore = 100;
    if (item.stimulus && item.stimulus.length > 20) {
      const report = analyseText(item.stimulus, item.cefrLevel as CefrLevel);
      readabilityScore = report.qualityScore;
      if (!report.passesQualityGate) {
        qualityReport.issues.push(...report.issues.map(iss => ({
          code: "READ-GATE",
          severity: iss.severity as "critical" | "major" | "minor",
          category: "language_quality" as const,
          message: iss.message,
          field: "stimulus",
        })));
        qualityReport.qualityScore = Math.round((qualityReport.qualityScore + readabilityScore) / 2);
        if (qualityReport.status === "APPROVED" && report.issues.some(i => i.severity !== "minor")) {
          qualityReport.status = "REVIEW";
        }
      }
    }

    return { qualityReport, readabilityScore };
  }

  // ── Full Three-Persona Pipeline for ONE item ────────────────────────────────
  private async generateOneItem(spec: ItemGenerationSpec): Promise<GeneratedItemWithQuality> {
    const levelNorm = getIrtNorm(spec.level);
    const revisionHistory: RevisionRecord[] = [];
    let totalPasses = 0;

    // ── Pass 1: Write ──────────────────────────────────────────────────────
    const writerRaw = await this.callWriter({ ...spec, quantity: 1 });
    totalPasses++;

    let currentItem: GeneratedItem;
    try {
      const itemArray = parseItemArray(writerRaw);
      currentItem = {
        ...itemArray[0],
        irtParams: {
          a: itemArray[0].irtParams?.a ?? levelNorm?.a.target ?? 1.0,
          b: itemArray[0].irtParams?.b ?? levelNorm?.b.target ?? 0.0,
          c: itemArray[0].irtParams?.c ?? levelNorm?.c.target ?? 0.2,
        },
      };
    } catch {
      throw new Error(`Writer pass failed to produce valid JSON. Raw: ${writerRaw.slice(0, 300)}`);
    }

    // ── Pass 2: Review ─────────────────────────────────────────────────────
    let itemReview: ItemReview | undefined;
    try {
      const reviewerRaw = await this.callReviewer(spec, JSON.stringify(currentItem, null, 2));
      totalPasses++;
      itemReview = parseItemReview(reviewerRaw);
    } catch (err) {
      // Reviewer failure is non-fatal — proceed without review
      console.warn("[AIItemGenerator] Reviewer pass failed:", String(err));
    }

    // ── Pass 3: Revise (if reviewer found issues) ──────────────────────────
    if (itemReview && itemReview.overallVerdict !== "PASS" && itemReview.issues.length > 0) {
      try {
        const reviserRaw = await this.callReviser(spec, JSON.stringify(currentItem, null, 2), itemReview);
        totalPasses++;
        const revised = parseSingleItem(reviserRaw);
        currentItem = {
          ...revised,
          irtParams: {
            a: revised.irtParams?.a ?? currentItem.irtParams.a,
            b: revised.irtParams?.b ?? currentItem.irtParams.b,
            c: revised.irtParams?.c ?? currentItem.irtParams.c,
          },
        };
      } catch (err) {
        console.warn("[AIItemGenerator] Reviser pass failed:", String(err));
      }
    }

    // ── QA Gate ────────────────────────────────────────────────────────────
    const { qualityReport, readabilityScore } = this.runQaGate(currentItem);
    revisionHistory.push({ attempt: 1, qualityScore: qualityReport.qualityScore, status: qualityReport.status, issueCount: qualityReport.issues.length });

    // ── Auto-Revision Loop ─────────────────────────────────────────────────
    let attempt = 1;
    while (qualityReport.qualityScore < AUTO_REVISION_THRESHOLD && attempt < MAX_REVISION_ATTEMPTS) {
      attempt++;
      const autoReview: ItemReview = {
        overallVerdict: "REVISE",
        issues: qualityReport.issues.map(iss => ({
          category: (iss.category ?? "item_format") as ItemReviewIssue["category"],
          severity: iss.severity,
          description: iss.message,
          suggestion: iss.suggestion ?? "Please correct this issue.",
        })),
        cefrAlignmentScore: 3,
        constructClarity: 3,
        languageAppropriacy: 3,
        distractorQualityScore: 3,
        summaryFeedback: `Automated QA found ${qualityReport.issues.length} issue(s) requiring correction.`,
      };

      try {
        const reviserRaw = await this.callReviser(spec, JSON.stringify(currentItem, null, 2), autoReview);
        totalPasses++;
        const revised = parseSingleItem(reviserRaw);
        currentItem = {
          ...revised,
          irtParams: {
            a: revised.irtParams?.a ?? currentItem.irtParams.a,
            b: revised.irtParams?.b ?? currentItem.irtParams.b,
            c: revised.irtParams?.c ?? currentItem.irtParams.c,
          },
        };
        const newQa = this.runQaGate(currentItem);
        qualityReport.qualityScore = newQa.qualityReport.qualityScore;
        qualityReport.status = newQa.qualityReport.status;
        qualityReport.issues = newQa.qualityReport.issues;
        revisionHistory.push({
          attempt,
          qualityScore: qualityReport.qualityScore,
          status: qualityReport.status,
          issueCount: qualityReport.issues.length,
        });
      } catch (err) {
        console.warn(`[AIItemGenerator] Auto-revision attempt ${attempt} failed:`, String(err));
        break;
      }
    }

    return { ...currentItem, qualityReport, itemReview, readabilityScore, revisionHistory, totalGenerationPasses: totalPasses };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate `spec.quantity` items using the full three-persona pipeline.
   * Each item goes through Writer → Reviewer → Reviser → QA Gate.
   */
  async generate(spec: ItemGenerationSpec): Promise<GenerationResult> {
    const quantity = spec.quantity ?? 1;
    const itemsWithQuality: GeneratedItemWithQuality[] = [];

    for (let i = 0; i < quantity; i++) {
      try {
        const item = await this.generateOneItem(spec);
        itemsWithQuality.push(item);
      } catch (err) {
        console.error(`[AIItemGenerator] Item ${i + 1}/${quantity} failed: ${String(err)}`);
      }
    }

    return {
      items: itemsWithQuality,
      generationModel: "gemini-2.5-flash (3-persona pipeline)",
      approvedCount: itemsWithQuality.filter(i => i.qualityReport.status === "APPROVED").length,
      reviewCount: itemsWithQuality.filter(i => i.qualityReport.status === "REVIEW").length,
      rejectedCount: itemsWithQuality.filter(i => i.qualityReport.status === "REJECTED").length,
    };
  }

  /**
   * Generate items for multiple specs (bulk bank seeding).
   * Each spec is isolated; failures do not abort the batch.
   */
  async generateBulk(specs: ItemGenerationSpec[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    for (const spec of specs) {
      try {
        results.push(await this.generate(spec));
      } catch (err) {
        console.error(`[AIItemGenerator] Bulk spec failed ${JSON.stringify(spec)}: ${String(err)}`);
        results.push({ items: [], generationModel: "gemini-2.5-flash (3-persona pipeline)", approvedCount: 0, reviewCount: 0, rejectedCount: 0 });
      }
    }
    return results;
  }
}

// Singleton instance for server use
export const itemGenerator = new AIItemGenerator();

