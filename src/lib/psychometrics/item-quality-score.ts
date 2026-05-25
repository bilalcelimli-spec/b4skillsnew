/**
 * Item Quality Score (IQS) — Faz 1
 *
 * Composite 0–100 score used as a quality gate during item bank production.
 * Based on the CEFR Test Blueprint PhD Analysis (Section 8.1).
 *
 * Thresholds (blocking gates in production pipeline):
 *   IQS ≥ 80  →  DRAFT  → REVIEW   (allow human review)
 *   IQS ≥ 90  →  REVIEW → ACTIVE   (allow live deployment)
 *   IQS < 60  →  AUTO-REJECT        (discard, regenerate)
 *
 * Formula:
 *   IQS = structuralIntegrity      × 0.20
 *       + linguisticAlignment      × 0.20
 *       + distractorQuality        × 0.20
 *       + cognitiveLoad            × 0.15
 *       + culturalSensitivity      × 0.10
 *       + accessibilityCompliance  × 0.10
 *       + domainAuthenticity       × 0.05
 */

import { prisma } from "../../lib/db.js";
import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

export const IQS_THRESHOLD_ACTIVE  = 90;  // IQS ≥ 90 → ACTIVE
export const IQS_THRESHOLD_REVIEW  = 80;  // IQS ≥ 80 → REVIEW
export const IQS_THRESHOLD_REJECT  = 60;  // IQS < 60  → AUTO-REJECT

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION WEIGHTS (must sum to 1.00)
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  structuralIntegrity:     0.20,
  linguisticAlignment:     0.20,
  distractorQuality:       0.20,
  cognitiveLoad:           0.15,
  culturalSensitivity:     0.10,
  accessibilityCompliance: 0.10,
  domainAuthenticity:      0.05,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface IqsInput {
  skill: string;
  cefrLevel: string;
  type: string;                          // ItemType enum value
  discrimination?: number | null;        // IRT a
  difficulty?: number | null;            // IRT b
  guessing?: number | null;              // IRT c
  content?: Record<string, unknown> | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface IqsDimensionScores {
  structuralIntegrity:     number;   // 0–100
  linguisticAlignment:     number;
  distractorQuality:       number;
  cognitiveLoad:           number;
  culturalSensitivity:     number;
  accessibilityCompliance: number;
  domainAuthenticity:      number;
}

export interface IqsResult {
  iqScore: number;                       // 0–100 composite
  status: "ACTIVE" | "REVIEW" | "REJECT";
  dimensions: IqsDimensionScores;
  flags: string[];                       // Human-readable issues
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION SCORERS
// ─────────────────────────────────────────────────────────────────────────────

/** 1. Structural Integrity — schema-valid, required fields present, options balanced */
function scoreStructuralIntegrity(item: IqsInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  let deductions = 0;

  const c = item.content ?? {};

  // Required prompt / stimulus
  if (!c.prompt && !c.stimulus) {
    flags.push("Missing prompt/stimulus content");
    deductions += 30;
  }

  // MCQ / FILL_IN_BLANKS must have options
  if (
    (item.type === "MULTIPLE_CHOICE" || item.type === "FILL_IN_BLANKS") &&
    (!Array.isArray(c.options) || (c.options as unknown[]).length < 2)
  ) {
    flags.push("MCQ/FIB item has fewer than 2 options");
    deductions += 25;
  }

  // MCQ must have a correct answer
  if (item.type === "MULTIPLE_CHOICE" && !c.correctAnswer && c.correctIndex == null) {
    flags.push("MCQ item missing correct answer");
    deductions += 25;
  }

  // DRAG_DROP must have draggable items
  if (item.type === "DRAG_DROP" && !Array.isArray(c.draggableItems) && !Array.isArray(c.options)) {
    flags.push("DRAG_DROP item missing draggable items");
    deductions += 20;
  }

  // WRITING_PROMPT / SPEAKING_PROMPT must have rubric or rubricRef
  if (
    (item.type === "WRITING_PROMPT" || item.type === "SPEAKING_PROMPT") &&
    !c.rubric && !c.rubricRef
  ) {
    flags.push("Productive skill task missing rubric");
    deductions += 15;
  }

  // CEFR level must be valid
  const validLevels = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  if (!validLevels.includes(item.cefrLevel)) {
    flags.push(`Unknown CEFR level: ${item.cefrLevel}`);
    deductions += 20;
  }

  return { score: Math.max(0, 100 - deductions), flags };
}

/** 2. Linguistic Alignment — IRT b-parameter matches expected CEFR θ-band */
const CEFR_B_RANGES: Record<string, [number, number]> = {
  PRE_A1: [-5.0, -2.5],
  A1:     [-4.0, -1.5],
  A2:     [-2.5, -0.5],
  B1:     [-1.0,  0.5],
  B2:     [ 0.0,  1.5],
  C1:     [ 1.0,  2.5],
  C2:     [ 2.0,  4.0],
};

function scoreLinguisticAlignment(item: IqsInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  const b = item.difficulty;
  const range = CEFR_B_RANGES[item.cefrLevel];

  if (b == null || !range) return { score: 70, flags: ["IRT b-parameter not set — alignment unverified"] };

  if (b < range[0]) {
    const drift = range[0] - b;
    flags.push(`Item too easy for ${item.cefrLevel}: b=${b.toFixed(2)}, expected ≥ ${range[0]}`);
    return { score: Math.max(0, 100 - drift * 20), flags };
  }

  if (b > range[1]) {
    const drift = b - range[1];
    flags.push(`Item too hard for ${item.cefrLevel}: b=${b.toFixed(2)}, expected ≤ ${range[1]}`);
    return { score: Math.max(0, 100 - drift * 20), flags };
  }

  // Bonus for being within the optimal inner-quartile (middle 50% of range)
  const rangeWidth = range[1] - range[0];
  const inner = [range[0] + rangeWidth * 0.25, range[1] - rangeWidth * 0.25];
  const score = b >= inner[0] && b <= inner[1] ? 100 : 88;

  return { score, flags };
}

/** 3. Distractor Quality — discrimination (a) and guessing (c) in acceptable range */
const CEFR_A_RANGES: Record<string, [number, number]> = {
  PRE_A1: [0.3, 2.0], A1: [0.3, 2.5], A2: [0.3, 2.5],
  B1: [0.3, 2.5], B2: [0.3, 2.5], C1: [0.3, 2.5], C2: [0.3, 2.5],
};
const MAX_GUESSING_BY_TYPE: Record<string, number> = {
  MULTIPLE_CHOICE: 0.33,
  FILL_IN_BLANKS: 0.10,
  DRAG_DROP: 0.10,
  SPEAKING_PROMPT: 0.0,
  WRITING_PROMPT: 0.0,
  INTEGRATED_TASK: 0.0,
};

function scoreDistractorQuality(item: IqsInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 100;

  const a = item.discrimination;
  const c = item.guessing;
  const aRange = CEFR_A_RANGES[item.cefrLevel];
  const maxC = MAX_GUESSING_BY_TYPE[item.type] ?? 0.33;

  if (a == null) {
    flags.push("Discrimination (a) parameter not set");
    score -= 20;
  } else if (aRange && (a < aRange[0] || a > aRange[1])) {
    flags.push(`a=${a.toFixed(2)} outside acceptable range [${aRange[0]}, ${aRange[1]}]`);
    score -= 25;
  } else if (a < 0.8) {
    flags.push(`Low discrimination a=${a.toFixed(2)} — item may not differentiate well`);
    score -= 10;
  }

  if (c == null) {
    // Not always required (productive skills)
  } else if (c > maxC) {
    flags.push(`Guessing parameter c=${c.toFixed(2)} exceeds max ${maxC} for ${item.type}`);
    score -= 15;
  }

  // Check distractorRationale in metadata
  const meta = item.metadata ?? {};
  const hasDistractorRationale =
    meta.distractorRationale &&
    typeof meta.distractorRationale === "object" &&
    Object.keys(meta.distractorRationale as object).length >= 2;

  if (item.type === "MULTIPLE_CHOICE" && !hasDistractorRationale) {
    flags.push("MCQ missing distractor rationale — add 'distractorRationale' in metadata");
    score -= 10;
  }

  return { score: Math.max(0, score), flags };
}

/** 4. Cognitive Load — Flesch-Kincaid proxy via sentence length in prompt */
const FK_GRADE_TARGETS: Record<string, [number, number]> = {
  PRE_A1: [1, 3], A1: [2, 4], A2: [4, 6],
  B1: [6, 9], B2: [9, 12], C1: [11, 14], C2: [13, 17],
};

function estimateFkGrade(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + Math.max(1, (w.match(/[aeiouAEIOU]/g) || []).length), 0);
  const avgSentLen = words.length / sentences.length;
  const avgSylPerWord = syllables / words.length;
  return 0.39 * avgSentLen + 11.8 * avgSylPerWord - 15.59;
}

function scoreCognitiveLoad(item: IqsInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  const c = item.content ?? {};
  const text = String(c.prompt ?? c.stimulus ?? c.passage ?? "");

  if (!text.trim()) return { score: 70, flags: ["No text to evaluate cognitive load"] };

  const fk = estimateFkGrade(text);
  const target = FK_GRADE_TARGETS[item.cefrLevel];
  if (!target) return { score: 80, flags: [] };

  if (fk < target[0]) {
    flags.push(`Text appears too simple for ${item.cefrLevel}: FK≈${fk.toFixed(1)}, expected ${target[0]}–${target[1]}`);
    return { score: Math.max(0, 100 - (target[0] - fk) * 10), flags };
  }
  if (fk > target[1]) {
    flags.push(`Text appears too complex for ${item.cefrLevel}: FK≈${fk.toFixed(1)}, expected ${target[0]}–${target[1]}`);
    return { score: Math.max(0, 100 - (fk - target[1]) * 10), flags };
  }
  return { score: 100, flags };
}

/** 5. Cultural Sensitivity — heuristic bias-pattern scan */
const BIAS_PATTERNS: Array<{ re: RegExp; code: string; msg: string; deduction: number }> = [
  { re: /\b(gun|weapon|shoot|kill|murder|dead|death|violence|war|bomb|terrorist)\b/gi, code: "BIAS-VIOLENCE", msg: "Violence/trauma keyword", deduction: 20 },
  { re: /\b(trump|obama|biden|putin|xi jinping|boris|macron)\b/gi, code: "BIAS-POLITICAL", msg: "Current political figure", deduction: 15 },
  { re: /\b(christmas|easter|ramadan|diwali|hannukah)\b/gi, code: "BIAS-RELIGION", msg: "Religious holiday reference", deduction: 10 },
  { re: /\b(he|him|his)\b/gi, code: "BIAS-GENDER-MASC", msg: "Masculine pronoun (prefer they/their)", deduction: 5 },
  { re: /\b(she|her|hers)\b/gi, code: "BIAS-GENDER-FEM", msg: "Feminine pronoun (prefer they/their)", deduction: 5 },
];

function scoreCulturalSensitivity(item: IqsInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  const c = item.content ?? {};
  const text = [c.prompt, c.stimulus, c.passage, c.question]
    .filter(Boolean)
    .map(String)
    .join(" ");

  let deductions = 0;
  for (const { re, code: _code, msg, deduction } of BIAS_PATTERNS) {
    if (re.test(text)) {
      flags.push(msg);
      deductions += deduction;
    }
  }

  return { score: Math.max(0, 100 - deductions), flags };
}

/** 6. Accessibility Compliance — WCAG basic checks (alt-text, not colour-only) */
function scoreAccessibilityCompliance(item: IqsInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 100;

  const c = item.content ?? {};

  // If item has an image asset, check for altText in metadata
  const hasImage = item.metadata?.hasImage || (c as any).imageUrl;
  if (hasImage) {
    const hasAlt = item.metadata?.altText || (c as any).altText;
    if (!hasAlt) {
      flags.push("Image-based item missing alt-text (WCAG 2.1 §1.1.1)");
      score -= 20;
    }
  }

  // Ensure options are not colour-coded only (heuristic: check for colour keywords)
  const colourOnly = /\b(red option|blue option|green option)\b/i.test(
    JSON.stringify(c.options ?? "")
  );
  if (colourOnly) {
    flags.push("Options appear colour-coded without text label — not accessible");
    score -= 20;
  }

  // Audio items should specify transcript availability
  if (item.type === "SPEAKING_PROMPT" || item.skill === "LISTENING") {
    const hasTranscript = item.metadata?.transcriptAvailable || (c as any).transcript;
    if (!hasTranscript) {
      flags.push("Audio item missing transcript (accessibility best practice)");
      score -= 10;
    }
  }

  return { score, flags };
}

/** 7. Domain Authenticity — real-world vocabulary plausibility proxy (tag presence) */
function scoreDomainAuthenticity(item: IqsInput): { score: number; flags: string[] } {
  const flags: string[] = [];
  const tags = item.tags ?? [];

  // Items should have at least one domain tag
  if (tags.length === 0) {
    flags.push("No domain tags — add topic/domain tags for exposure control");
    return { score: 70, flags };
  }

  // Bonus: EVP/AWL/NGSL tag present
  const hasFreqTag = tags.some((t) => /evp|awl|ngsl|bvp|coca/i.test(t));
  if (!hasFreqTag && (item.skill === "VOCABULARY" || item.skill === "GRAMMAR")) {
    flags.push("Vocabulary/Grammar item missing frequency-list tag (EVP/AWL/NGSL)");
    return { score: 80, flags };
  }

  return { score: 100, flags };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE SCORE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateIqs(item: IqsInput): IqsResult {
  const s1 = scoreStructuralIntegrity(item);
  const s2 = scoreLinguisticAlignment(item);
  const s3 = scoreDistractorQuality(item);
  const s4 = scoreCognitiveLoad(item);
  const s5 = scoreCulturalSensitivity(item);
  const s6 = scoreAccessibilityCompliance(item);
  const s7 = scoreDomainAuthenticity(item);

  const iqScore = Math.round(
    s1.score * WEIGHTS.structuralIntegrity +
    s2.score * WEIGHTS.linguisticAlignment +
    s3.score * WEIGHTS.distractorQuality +
    s4.score * WEIGHTS.cognitiveLoad +
    s5.score * WEIGHTS.culturalSensitivity +
    s6.score * WEIGHTS.accessibilityCompliance +
    s7.score * WEIGHTS.domainAuthenticity
  );

  const status: IqsResult["status"] =
    iqScore >= IQS_THRESHOLD_ACTIVE ? "ACTIVE" :
    iqScore >= IQS_THRESHOLD_REVIEW ? "REVIEW" :
    "REJECT";

  return {
    iqScore,
    status,
    dimensions: {
      structuralIntegrity:     s1.score,
      linguisticAlignment:     s2.score,
      distractorQuality:       s3.score,
      cognitiveLoad:           s4.score,
      culturalSensitivity:     s5.score,
      accessibilityCompliance: s6.score,
      domainAuthenticity:      s7.score,
    },
    flags: [
      ...s1.flags,
      ...s2.flags,
      ...s3.flags,
      ...s4.flags,
      ...s5.flags,
      ...s6.flags,
      ...s7.flags,
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB HELPER — compute and persist iqScore to Item record
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute IQS for a DB item and write back `iqScore` column.
 * Returns the full IqsResult so the caller can act on status / flags.
 */
export async function computeAndPersistIqs(itemId: string): Promise<IqsResult> {
  const row = await prisma.item.findUniqueOrThrow({
    where: { id: itemId },
    select: {
      skill: true,
      cefrLevel: true,
      type: true,
      discrimination: true,
      difficulty: true,
      guessing: true,
      content: true,
      tags: true,
      metadata: true,
    },
  });

  const result = calculateIqs({
    skill: row.skill,
    cefrLevel: row.cefrLevel,
    type: row.type,
    discrimination: row.discrimination,
    difficulty: row.difficulty,
    guessing: row.guessing,
    content: row.content as Record<string, unknown> | null,
    tags: row.tags,
    metadata: row.metadata as Record<string, unknown> | null,
  });

  await prisma.item.update({
    where: { id: itemId },
    data: { iqScore: result.iqScore },
  });

  return result;
}
