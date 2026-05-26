/**
 * Item Validation Schema
 *
 * Pre-save validation to prevent broken items from reaching database.
 * Enforces skill-specific constraints and content integrity.
 */

import z from "zod";

// ── Option Schema ────────────────────────────────────────────────────────────

export const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(2, "Option text must be at least 2 characters"),
  isCorrect: z.boolean().optional().default(false),
  rationale: z.string().min(5, "Rationale must be at least 5 characters").optional(),
});

export type Option = z.infer<typeof optionSchema>;

// ── Base Item Content Schema ─────────────────────────────────────────────────

const baseContentSchema = z.object({
  prompt: z.string().min(5, "Prompt must be at least 5 characters").optional(),
  stem: z.string().min(5, "Stem must be at least 5 characters").optional(),
  question: z.string().min(5, "Question must be at least 5 characters").optional(),
});

// ── Skill-Specific Schemas ───────────────────────────────────────────────────

// MCQ Skills (GRAMMAR, VOCABULARY, READING)
export const mcqContentSchema = baseContentSchema.extend({
  options: z.array(optionSchema).min(4, "MCQ items must have at least 4 options"),
  correctAnswer: z.string().optional(),
}).refine(
  (data) => data.prompt || data.stem || data.question,
  { message: "Item must have prompt, stem, or question" }
).refine(
  (data) => data.options.some((opt) => opt.isCorrect === true),
  { message: "MCQ items must have at least 1 correct option marked (isCorrect: true)" }
).refine(
  (data) => {
    // Check for duplicate option texts
    const texts = data.options.map((o) => (o.text ?? "").trim().toLowerCase());
    const unique = new Set(texts);
    return unique.size === texts.length;
  },
  { message: "Option texts must be unique (no duplicates)" }
).refine(
  (data) => {
    // All options must have rationales
    return data.options.every((o) => o.rationale && o.rationale.trim().length >= 5);
  },
  { message: "All options must have rationale text (5+ characters)" }
);

// READING Specific
// Note: passage validation moved to validateItemStructure() due to Zod complexity
export const readingContentSchema = z.object({
  prompt: z.string().min(5).optional(),
  stem: z.string().min(5).optional(),
  question: z.string().min(5).optional(),
  passage: z.string().min(30).optional(),
  text: z.string().min(30).optional(),
  readingText: z.string().min(30).optional(),
  options: z.array(optionSchema).min(4).optional(),
  correctAnswer: z.string().optional(),
});

// LISTENING Specific (can be MCQ or audio comprehension)
// Note: refine checks moved to validateItemStructure() due to Zod complexity
export const listeningContentSchema = z.object({
  prompt: z.string().min(5).optional(),
  stem: z.string().min(5).optional(),
  question: z.string().min(5).optional(),
  audioUrl: z.string().url().optional(),
  ttsScript: z.string().min(20).optional(),
  transcript: z.string().optional(),
  options: z.array(optionSchema).optional(),
  correctAnswer: z.string().optional(),
});

// SPEAKING Specific (validation done in structural check function due to Zod complexity)
export const speakingContentSchema = z.object({
  prompt: z.string().min(5).optional(),
  stem: z.string().min(5).optional(),
  question: z.string().min(5).optional(),
  responseTime: z.number().positive(),
  prepTime: z.number().positive(),
  scoringRubric: z.record(z.string(), z.any()).optional(),
  rubric: z.record(z.string(), z.any()).optional(),
  taskType: z.string().optional(),
  cefrDescriptor: z.string().optional(),
});

// WRITING Specific (minimal validation as it's essay-based)
export const writingContentSchema = baseContentSchema.extend({
  rubric: z.record(z.string(), z.any()).optional(),
  maxWords: z.number().optional(),
  minWords: z.number().optional(),
}).refine(
  (data) => data.prompt || data.stem || data.question,
  { message: "WRITING items must have prompt, stem, or question" }
);

// ── Master Item Schema ───────────────────────────────────────────────────────

export const itemCreateSchema = z.object({
  skill: z.enum(["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "SPEAKING", "WRITING"]),
  cefrLevel: z.enum(["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"]),
  content: z.union([
    readingContentSchema,
    listeningContentSchema,
    speakingContentSchema,
    writingContentSchema,
    mcqContentSchema,
  ]).refine(
    (data) => {
      // Ensure content doesn't have [object Object] serialization errors
      const serialized = JSON.stringify(data);
      return !serialized.includes("[object Object]");
    },
    { message: "Content contains invalid serialized data ([object Object])" }
  ),
  tags: z.array(z.string()).optional(),
});

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;

// ── Validation Functions ─────────────────────────────────────────────────────

/**
 * Validates item content before database save
 */
export async function validateItemBeforeSave(
  skill: string,
  content: any
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Route to skill-specific schema
    let schema: z.ZodSchema;

    switch (skill) {
      case "READING":
        schema = readingContentSchema;
        break;
      case "LISTENING":
        schema = listeningContentSchema;
        break;
      case "SPEAKING":
        schema = speakingContentSchema;
        break;
      case "WRITING":
        schema = writingContentSchema;
        break;
      case "GRAMMAR":
      case "VOCABULARY":
      default:
        schema = mcqContentSchema;
    }

    const validation = await schema.safeParseAsync(content);

    if (!validation.success) {
      const errors = validation.error.flatten();
      const messages = Object.entries(errors.fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[] | undefined)?.join(", ")}`)
        .join("; ");

      return {
        success: false,
        error: messages || "Content validation failed",
      };
    }

    return {
      success: true,
      data: validation.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown validation error",
    };
  }
}

/**
 * Quick structural check (no async operations)
 */
export function validateItemStructure(skill: string, content: any): string[] {
  const errors: string[] = [];

  // Check for prompt
  if (!content.prompt && !content.stem && !content.question) {
    errors.push("Missing prompt/stem/question");
  }

  // Skill-specific checks
  if (["GRAMMAR", "VOCABULARY", "READING"].includes(skill)) {
    const opts = Array.isArray(content.options) ? content.options : [];
    if (opts.length < 4) {
      errors.push(`Only ${opts.length} options (need 4+)`);
    }
    if (!opts.some((o: any) => o.isCorrect === true)) {
      errors.push("No correct option marked (isCorrect: true)");
    }
  }

  if (skill === "READING") {
    const passage = (content.passage ?? content.text ?? content.readingText ?? "").toString();
    if (passage.trim().length < 30) {
      errors.push(`Passage too short (${passage.length} chars, need 30+)`);
    }
  }

  if (skill === "LISTENING") {
    const hasAudio = !!content.audioUrl;
    const hasTts = !!content.ttsScript;
    const hasTranscript = !!content.transcript;
    if (!hasAudio && !hasTts && !hasTranscript) {
      errors.push("Missing audio, TTS script, or transcript");
    }
  }

  if (skill === "SPEAKING") {
    if (!content.scoringRubric && !content.rubric) {
      errors.push("Missing scoringRubric or rubric");
    }
    if (!content.responseTime || !content.prepTime) {
      errors.push("Missing responseTime or prepTime");
    }
  }

  // Check for serialization errors
  const serialized = JSON.stringify(content);
  if (serialized.includes("[object Object]")) {
    errors.push("Content contains invalid serialization");
  }

  return errors;
}
