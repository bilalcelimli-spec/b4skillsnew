/**
 * LinguAdapt Item Quality Validator
 *
 * Validates assessment items against:
 *  1. Item writing guidelines (universal + skill-specific)
 *  2. IRT parameter plausibility for claimed CEFR level
 *  3. Content field completeness
 *  4. CEFR construct alignment
 *  5. Bias & fairness indicators (automated heuristics)
 *
 * Returns a structured QualityReport with issues and an overall quality score.
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";
import type { MacroSkill } from "./language-skill-framework.js";
import {
  IRT_PARAMETER_NORMS,
  BIAS_REVIEW_CHECKLIST,
  getIrtNorm,
  getItemFormatSpec,
  type ItemFormat,
} from "./item-writing-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type QualityIssueSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "INFO";

export interface QualityIssue {
  code: string;
  severity: QualityIssueSeverity;
  category: "completeness" | "irt_params" | "cefr_alignment" | "writing_guidelines" | "bias" | "format";
  message: string;
  field?: string;         // which field triggered this issue
  suggestion?: string;
}

export interface QualityReport {
  /** Overall score 0–100. ≥80 = Approved, 60–79 = Review, <60 = Reject */
  qualityScore: number;
  status: "APPROVED" | "REVIEW" | "REJECTED";
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  issues: QualityIssue[];
  /** Summary paragraph for item writers */
  summary: string;
}

/** Minimum shape of an item to validate. Matches Prisma item content shape. */
export interface ItemToValidate {
  skill: string;
  cefrLevel: string;
  type?: string | null;
  discrimination?: number | null;  // IRT a
  difficulty?: number | null;      // IRT b
  guessing?: number | null;        // IRT c
  content?: Record<string, unknown> | null;
  tags?: string[] | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_SKILLS: string[] = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
const SUPPORTED_LEVELS: string[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

// Bias heuristics: word patterns that may indicate cultural or gender bias
const BIAS_PATTERNS: Array<{ pattern: RegExp; code: string; message: string }> = [
  { pattern: /\b(he|him|his)\b/gi, code: "BIAS-GENDER-MASC", message: "Masculine pronoun detected — use 'they/their' or a proper name unless scenario requires it." },
  { pattern: /\b(she|her|hers)\b/gi, code: "BIAS-GENDER-FEM", message: "Feminine pronoun detected — use 'they/their' or a proper name unless scenario requires it." },
  { pattern: /\b(christmas|easter|ramadan|diwali|hannukah)\b/gi, code: "BIAS-RELIGION", message: "Religious reference detected — ensure balanced or neutral treatment." },
  { pattern: /\b(gun|weapon|shoot|kill|murder|dead|death|violence|war|bomb|terrorist)\b/gi, code: "BIAS-VIOLENCE", message: "Violence/trauma keyword detected — review for appropriateness in assessment context." },
  { pattern: /\b(trump|obama|biden|putin|xi jinping|boris|macron)\b/gi, code: "BIAS-POLITICAL", message: "Political figure's name detected — items should avoid current political figures." },
  { pattern: /\b(white|black) people\b/gi, code: "BIAS-RACE", message: "Racial identifier detected — review context carefully." },
];

// Suspicious negative stem words that should be emphasised
const NEGATIVE_STEM_PATTERNS: RegExp[] = [/\bnot\b/i, /\bexcept\b/i, /\bfalse\b/i, /\bincorrect\b/i];

export class ItemQualityValidator {
  /**
   * Validate an item and return a full quality report.
   */
  static validate(item: ItemToValidate): QualityReport {
    const issues: QualityIssue[] = [];

    // 1. Completeness checks
    issues.push(...this.checkCompleteness(item));

    // 2. IRT parameter plausibility
    if (item.cefrLevel && SUPPORTED_LEVELS.includes(item.cefrLevel)) {
      issues.push(...this.checkIrtParams(item));
    }

    // 3. CEFR alignment
    if (item.cefrLevel && item.difficulty !== null && item.difficulty !== undefined) {
      issues.push(...this.checkCefrAlignment(item));
    }

    // 4. Content-level writing guideline checks
    if (item.content) {
      issues.push(...this.checkContentGuidelines(item));
    }

    // 5. Bias heuristics
    if (item.content) {
      issues.push(...this.checkBiasHeuristics(item));
    }

    return this.buildReport(issues, item);
  }

  // ─── 1. COMPLETENESS ───────────────────────────────────────────────────────

  private static checkCompleteness(item: ItemToValidate): QualityIssue[] {
    const issues: QualityIssue[] = [];

    if (!item.skill || !SUPPORTED_SKILLS.includes(item.skill)) {
      issues.push({ code: "COMP-01", severity: "CRITICAL", category: "completeness", field: "skill", message: `Missing or unrecognised skill. Must be one of: ${SUPPORTED_SKILLS.join(", ")}.` });
    }

    if (!item.cefrLevel || !SUPPORTED_LEVELS.includes(item.cefrLevel)) {
      issues.push({ code: "COMP-02", severity: "CRITICAL", category: "completeness", field: "cefrLevel", message: `Missing or unrecognised cefrLevel. Must be one of: ${SUPPORTED_LEVELS.join(", ")}.` });
    }

    if (item.discrimination === null || item.discrimination === undefined) {
      issues.push({ code: "COMP-03", severity: "MAJOR", category: "completeness", field: "discrimination", message: "IRT discrimination (a) is missing. Use estimated value before calibration.", suggestion: "Set a = 1.0 as a neutral prior before empirical calibration." });
    }

    if (item.difficulty === null || item.difficulty === undefined) {
      issues.push({ code: "COMP-04", severity: "MAJOR", category: "completeness", field: "difficulty", message: "IRT difficulty (b) is missing. Use the theta midpoint of the target CEFR level.", suggestion: "Set b based on IRT_PARAMETER_NORMS for the target level." });
    }

    if (!item.content || Object.keys(item.content).length === 0) {
      issues.push({ code: "COMP-05", severity: "CRITICAL", category: "completeness", field: "content", message: "Item content is empty. At minimum a 'stimulus' or 'prompt' field must be present." });
    }

    // Check expected content fields by skill
    if (item.content) {
      const skill = item.skill?.toUpperCase();
      if (["READING", "LISTENING", "GRAMMAR", "VOCABULARY"].includes(skill ?? "")) {
        if (!item.content["question"] && !item.content["stem"]) {
          issues.push({ code: "COMP-06", severity: "MAJOR", category: "completeness", field: "content.question", message: "Receptive/structural item is missing a question stem.", suggestion: "Add a 'question' field to the content object." });
        }
        if (!item.content["options"] || !Array.isArray(item.content["options"]) || (item.content["options"] as unknown[]).length < 2) {
          issues.push({ code: "COMP-07", severity: "MAJOR", category: "completeness", field: "content.options", message: "MCQ/structural item is missing options or has fewer than 2.", suggestion: "Provide 4 options (A–D) for MCQ formats." });
        }
        if (!item.content["correctAnswer"] && !item.content["answer"] && !item.content["acceptableAnswers"]) {
          issues.push({ code: "COMP-08", severity: "CRITICAL", category: "completeness", field: "content.correctAnswer", message: "Item is missing a correct answer definition.", suggestion: "Add 'correctAnswer' or 'acceptableAnswers' to content." });
        }
      }
      if (["WRITING", "SPEAKING"].includes(skill ?? "")) {
        if (!item.content["prompt"] && !item.content["stimulus"]) {
          issues.push({ code: "COMP-09", severity: "CRITICAL", category: "completeness", field: "content.prompt", message: "Writing/Speaking item is missing a task prompt.", suggestion: "Add a 'prompt' field describing the task." });
        }
      }
    }

    return issues;
  }

  // ─── 2. IRT PARAMETER PLAUSIBILITY ────────────────────────────────────────

  private static checkIrtParams(item: ItemToValidate): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const norm = getIrtNorm(item.cefrLevel as CefrLevel);
    if (!norm) return issues;

    const a = item.discrimination;
    const b = item.difficulty;
    const c = item.guessing;

    if (a !== null && a !== undefined) {
      if (a < 0.3) issues.push({ code: "IRT-01", severity: "MAJOR", category: "irt_params", field: "discrimination", message: `Discrimination a=${a.toFixed(2)} is below the acceptable minimum (0.30). Item may not distinguish ability levels.`, suggestion: `Target a ≈ ${norm.a.target}` });
      if (a > 2.5) issues.push({ code: "IRT-02", severity: "MINOR", category: "irt_params", field: "discrimination", message: `Discrimination a=${a.toFixed(2)} is unusually high (>2.50) — check calibration data.`, suggestion: `Target a ≈ ${norm.a.target}` });
    }

    if (b !== null && b !== undefined) {
      if (b < norm.b.min - 0.5) issues.push({ code: "IRT-03", severity: "MAJOR", category: "irt_params", field: "difficulty", message: `Difficulty b=${b.toFixed(2)} is much easier than expected for ${item.cefrLevel} (min ${norm.b.min}). Item may not target the claimed level.`, suggestion: `Target b ≈ ${norm.b.target} for ${item.cefrLevel}` });
      if (b > norm.b.max + 0.5) issues.push({ code: "IRT-04", severity: "MAJOR", category: "irt_params", field: "difficulty", message: `Difficulty b=${b.toFixed(2)} is harder than expected for ${item.cefrLevel} (max ${norm.b.max}). Consider re-labelling as ${this.suggestHigherLevel(item.cefrLevel as CefrLevel)}.`, suggestion: `Target b ≈ ${norm.b.target} for ${item.cefrLevel}` });
    }

    if (c !== null && c !== undefined) {
      if (c > norm.c.max) issues.push({ code: "IRT-05", severity: "MINOR", category: "irt_params", field: "guessing", message: `Guessing c=${c.toFixed(2)} exceeds recommended maximum (${norm.c.max}) for ${item.cefrLevel}. Higher-level items should not be susceptible to guessing.`, suggestion: `Target c ≈ ${norm.c.target}` });
      if (c < 0) issues.push({ code: "IRT-06", severity: "CRITICAL", category: "irt_params", field: "guessing", message: "Guessing parameter c cannot be negative.", suggestion: "Set c ≥ 0" });
    }

    return issues;
  }

  // ─── 3. CEFR ALIGNMENT CHECK ──────────────────────────────────────────────

  private static checkCefrAlignment(item: ItemToValidate): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Cross-check b vs cefrLevel
    const levelNorm = getIrtNorm(item.cefrLevel as CefrLevel);
    if (levelNorm && item.difficulty !== null && item.difficulty !== undefined) {
      const b = item.difficulty;
      const diff = Math.abs(b - levelNorm.b.target);
      if (diff > 1.5) {
        issues.push({
          code: "CEFR-01",
          severity: "MAJOR",
          category: "cefr_alignment",
          message: `Item difficulty (b=${b.toFixed(2)}) deviates >1.5 logits from the ${item.cefrLevel} target (${levelNorm.b.target}). Consider re-assigning CEFR level or revising item difficulty.`,
          suggestion: `For ${item.cefrLevel}, target b ≈ ${levelNorm.b.target}`,
        });
      }
    }

    return issues;
  }

  // ─── 4. CONTENT WRITING GUIDELINE CHECKS ──────────────────────────────────

  private static checkContentGuidelines(item: ItemToValidate): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const content = item.content as Record<string, unknown>;

    const questionText: string = String(content["question"] ?? content["stem"] ?? "");
    const optionsList: string[] = (content["options"] as string[]) ?? [];
    const stimulus: string = String(content["stimulus"] ?? content["prompt"] ?? "");

    // STEM-02: Negative stems without emphasis
    for (const pattern of NEGATIVE_STEM_PATTERNS) {
      if (pattern.test(questionText)) {
        const match = questionText.match(pattern);
        if (match && match[0] !== match[0].toUpperCase()) {
          issues.push({
            code: "GUIDE-STEM-02",
            severity: "MAJOR",
            category: "writing_guidelines",
            field: "content.question",
            message: `Negation word "${match[0]}" in the stem is not capitalised/emphasised (e.g. NOT, EXCEPT). This may be missed by candidates.`,
            suggestion: 'Replace with e.g. "...is NOT true" / "...EXCEPT".',
          });
        }
      }
    }

    // OPT-04: Avoid "all/none of the above"
    const combinedOptions = optionsList.join(" ").toLowerCase();
    if (/\ball of the above\b/.test(combinedOptions) || /\bnone of the above\b/.test(combinedOptions)) {
      issues.push({ code: "GUIDE-OPT-04", severity: "MAJOR", category: "writing_guidelines", field: "content.options", message: "'All of the above' or 'None of the above' options detected. These reduce measurement quality.", suggestion: "Replace with a substantive, plausible distractor." });
    }

    // OPT-03: Option length variability (longest option might be the key)
    if (optionsList.length >= 2) {
      const lengths = optionsList.map(o => String(o).length);
      const maxLen = Math.max(...lengths);
      const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      if (maxLen > avgLen * 2.5) {
        issues.push({ code: "GUIDE-OPT-03", severity: "MINOR", category: "writing_guidelines", field: "content.options", message: "Option length varies significantly — the longest option may stand out as the correct answer.", suggestion: "Equalise option lengths to within ±30% of the mean." });
      }
    }

    // STIM-04: Stimulus text very short for claimed level (B2+ should have substantial stimulus)
    if (["B2", "C1", "C2"].includes(item.cefrLevel ?? "") && ["READING"].includes(item.skill ?? "")) {
      const wordCount = stimulus.split(/\s+/).length;
      if (wordCount < 100 && wordCount > 0) {
        issues.push({ code: "GUIDE-STIM-04", severity: "MINOR", category: "writing_guidelines", field: "content.stimulus", message: `Stimulus is only ${wordCount} words. For ${item.cefrLevel} reading items, a richer text (150+ words) is expected.`, suggestion: "Expand the stimulus text or use a longer authentic passage." });
      }
    }

    // SCORE-01: Answer key rationale missing
    if (!content["answerKey"] && !content["distractorRationale"]) {
      issues.push({ code: "GUIDE-SCORE-01", severity: "MINOR", category: "writing_guidelines", field: "content.answerKey", message: "No answer key rationale or distractor rationale found in content.", suggestion: "Add 'answerKey' and 'distractorRationale' to support rater training and review." });
    }

    return issues;
  }

  // ─── 5. BIAS HEURISTIC CHECKS ─────────────────────────────────────────────

  private static checkBiasHeuristics(item: ItemToValidate): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const content = item.content as Record<string, unknown>;

    // Flatten all text content for scanning
    const allText = [
      content["stimulus"],
      content["prompt"],
      content["question"],
      content["stem"],
      ...(Array.isArray(content["options"]) ? content["options"] as string[] : []),
    ]
      .filter(Boolean)
      .join(" ");

    for (const biasCheck of BIAS_PATTERNS) {
      if (biasCheck.pattern.test(allText)) {
        // Reset regex state
        biasCheck.pattern.lastIndex = 0;
        issues.push({
          code: biasCheck.code,
          severity: "MINOR",
          category: "bias",
          message: biasCheck.message,
          suggestion: "Review content for potential bias; replace or contextualise the flagged term.",
        });
      }
      biasCheck.pattern.lastIndex = 0;
    }

    return issues;
  }

  // ─── REPORT BUILDER ────────────────────────────────────────────────────────

  private static buildReport(issues: QualityIssue[], item: ItemToValidate): QualityReport {
    const criticalCount = issues.filter(i => i.severity === "CRITICAL").length;
    const majorCount = issues.filter(i => i.severity === "MAJOR").length;
    const minorCount = issues.filter(i => i.severity === "MINOR").length;

    // Score: starts at 100, penalise per issue
    let score = 100;
    score -= criticalCount * 25;
    score -= majorCount * 10;
    score -= minorCount * 3;
    score = Math.max(0, score);

    let status: "APPROVED" | "REVIEW" | "REJECTED";
    if (criticalCount > 0 || score < 60) {
      status = "REJECTED";
    } else if (majorCount > 0 || score < 80) {
      status = "REVIEW";
    } else {
      status = "APPROVED";
    }

    const summary = this.buildSummary(status, criticalCount, majorCount, minorCount, score, item);

    return { qualityScore: score, status, criticalCount, majorCount, minorCount, issues, summary };
  }

  private static buildSummary(
    status: string, critical: number, major: number, minor: number, score: number, item: ItemToValidate
  ): string {
    if (status === "APPROVED") {
      return `Item APPROVED (score: ${score}/100). Skill: ${item.skill}, Level: ${item.cefrLevel}. ${minor > 0 ? `${minor} minor suggestion(s) to consider.` : "No issues found."}`;
    }
    if (status === "REVIEW") {
      return `Item requires REVIEW (score: ${score}/100). ${major} major issue(s) detected that may affect measurement quality. Address these before deployment.`;
    }
    return `Item REJECTED (score: ${score}/100). ${critical} critical issue(s) found. This item cannot be used until critical issues are resolved.`;
  }

  private static suggestHigherLevel(level: CefrLevel): string {
    const order: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const idx = order.indexOf(level);
    return idx < order.length - 1 ? order[idx + 1] : "C2";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export function validateItem(item: ItemToValidate): QualityReport {
  return ItemQualityValidator.validate(item);
}

/**
 * Validate multiple items and return aggregate stats + individual reports.
 */
export function validateItemBank(items: ItemToValidate[]): {
  totalItems: number;
  approved: number;
  review: number;
  rejected: number;
  avgQualityScore: number;
  reports: QualityReport[];
} {
  const reports = items.map(item => ItemQualityValidator.validate(item));
  const approved = reports.filter(r => r.status === "APPROVED").length;
  const review = reports.filter(r => r.status === "REVIEW").length;
  const rejected = reports.filter(r => r.status === "REJECTED").length;
  const avgQualityScore = reports.reduce((sum, r) => sum + r.qualityScore, 0) / (reports.length || 1);

  return { totalItems: items.length, approved, review, rejected, avgQualityScore: Math.round(avgQualityScore), reports };
}
