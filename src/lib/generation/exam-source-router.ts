/**
 * Exam Source Router
 *
 * Routes item generation requests to the appropriate exam-specific prompt
 * builder based on the product line. Each product line maps to one or more
 * exam sources, each with its own prompt conventions, vocabulary level,
 * distractor strategy, and task format constraints.
 *
 * Hierarchy:
 *   ProductLine → examSource → promptBuilder → AI prompt string
 *
 * The router returns a ready-to-use prompt string that can be passed directly
 * to the AI item generator (ai-item-generator.ts).
 */

import type { ProductLineName } from "../product-lines/profiles.js";
import { buildCambridgePrompt } from "../cambridge/cambridge-prompts.js";
import { buildToeflJuniorPrompt } from "../toefl-junior/toefl-junior-prompts.js";
import { buildItemGenerationPrompt } from "../language-skills/item-writing-framework.js";
import type { ItemGenerationSpec, ItemFormat } from "../language-skills/item-writing-framework.js";
import type { CefrLevel } from "../cefr/cefr-framework.js";
import type { MacroSkill } from "../language-skills/language-skill-framework.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** All the information needed to route and build a prompt */
export interface GenerationRequest {
  productLine: ProductLineName;
  skill: MacroSkill;
  cefrLevel: CefrLevel;
  topic?: string;
  quantity?: number;
  /** Override the exam source (e.g. force "cambridge_yle" even for Diagnostic) */
  examSourceOverride?: string;
}

export interface RoutedPrompt {
  prompt: string;
  examSource: string;
  taskId?: string;        // Cambridge task ID or TOEFL Junior task ID, if used
  topic: string;
  expectedCount: number;
}

// ─── Skill → Cambridge task mapping ─────────────────────────────────────────
// Maps skill to the most representative Cambridge task ID per product line.
// Cambridge task IDs are defined in cambridge-framework.ts.

const PRIMARY_TASK_BY_SKILL: Record<string, string> = {
  LISTENING:  "STARTERS_L_PART1",  // Picture dialogue MCQ
  READING:    "MOVERS_RW_PART2",   // Reading MCQ
  GRAMMAR:    "MOVERS_RW_PART4",   // Cloze MCQ
  VOCABULARY: "STARTERS_RW_PART1", // Picture word match
  WRITING:    "FLYERS_RW_PART7",   // Short message writing
  SPEAKING:   "MOVERS_S_PART1",    // Spot differences
};

const JUNIOR_CAMBRIDGE_TASK_BY_SKILL: Record<string, string> = {
  LISTENING:  "KET_L_PART1",
  READING:    "PET_R_PART1",
  GRAMMAR:    "KET_RW_PART5",
  VOCABULARY: "PET_RW_PART4",
  WRITING:    "KET_W_PART9",
  SPEAKING:   "PET_S_PART3",
};

// TOEFL Junior task IDs per skill
const TOEFL_TASK_BY_SKILL: Record<string, string> = {
  LISTENING:  "TJ_L_PART1",      // Short conversations
  GRAMMAR:    "TJ_LFM_GRAMMAR",  // Grammar in context
  VOCABULARY: "TJ_LFM_VOCAB",    // Vocabulary in context
  READING:    "TJ_RC",           // Reading comprehension
};

// ─── Default topics per skill ─────────────────────────────────────────────────

const DEFAULT_TOPICS: Record<MacroSkill, string> = {
  READING:    "everyday life and current events",
  LISTENING:  "conversations about daily activities",
  GRAMMAR:    "daily routines and common situations",
  VOCABULARY: "common objects and actions",
  WRITING:    "personal experiences and opinions",
  SPEAKING:   "describing familiar places and people",
};

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Build a generation prompt for the given request.
 * Selects the exam-specific prompt builder based on product line.
 */
export function routeGenerationRequest(req: GenerationRequest): RoutedPrompt {
  const {
    productLine,
    skill,
    cefrLevel,
    topic = DEFAULT_TOPICS[skill] ?? "general topics",
    quantity = 5,
    examSourceOverride,
  } = req;

  // Determine effective exam source
  const examSource = examSourceOverride ?? resolveExamSource(productLine, skill);

  switch (examSource) {
    case "cambridge_yle":
    case "cambridge_starters":
    case "cambridge_movers":
    case "cambridge_flyers": {
      const taskId = PRIMARY_TASK_BY_SKILL[skill] ?? "MOVERS_RW_PART2";
      return {
        prompt: buildCambridgePrompt(taskId, topic, quantity),
        examSource,
        taskId,
        topic,
        expectedCount: quantity,
      };
    }

    case "cambridge_ket":
    case "cambridge_pet": {
      const taskId = JUNIOR_CAMBRIDGE_TASK_BY_SKILL[skill] ?? "KET_RW_PART5";
      return {
        prompt: buildCambridgePrompt(taskId, topic, quantity),
        examSource,
        taskId,
        topic,
        expectedCount: quantity,
      };
    }

    case "toefl_junior": {
      const taskId = TOEFL_TASK_BY_SKILL[skill] ?? "TJ_LFM_GRAMMAR";
      return {
        prompt: buildToeflJuniorPrompt(taskId, topic, quantity),
        examSource,
        taskId,
        topic,
        expectedCount: quantity,
      };
    }

    case "ielts_academic": {
      const spec: ItemGenerationSpec = {
        skill: skill as any,
        level: cefrLevel,
        format: ieltsFormatForSkill(skill),
        topic: `${topic} (academic register, IELTS Academic style)`,
        quantity,
      };
      return {
        prompt: buildItemGenerationPrompt(spec),
        examSource,
        topic,
        expectedCount: quantity,
      };
    }

    case "bec":
    case "bulats": {
      const spec: ItemGenerationSpec = {
        skill: skill as any,
        level: cefrLevel,
        format: corporateFormatForSkill(skill),
        topic: `${topic} (business English, professional workplace context)`,
        quantity,
      };
      return {
        prompt: buildItemGenerationPrompt(spec),
        examSource,
        topic,
        expectedCount: quantity,
      };
    }

    case "general":
    default: {
      const spec: ItemGenerationSpec = {
        skill: skill as any,
        level: cefrLevel,
        format: generalFormatForSkill(skill),
        topic,
        quantity,
      };
      return {
        prompt: buildItemGenerationPrompt(spec),
        examSource: "general",
        topic,
        expectedCount: quantity,
      };
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function resolveExamSource(productLine: ProductLineName, skill: MacroSkill): string {
  switch (productLine) {
    case "Primary (7-10)":
      return "cambridge_yle";

    case "Junior Suite (11-14)":
      // Listening: TOEFL Junior style; LFM: TOEFL Junior; RC: split 50/50
      if (skill === "LISTENING" || skill === "GRAMMAR" || skill === "VOCABULARY") {
        return "toefl_junior";
      }
      return skill === "READING" ? "toefl_junior" : "cambridge_ket";

    case "Academia":
      return "ielts_academic";

    case "Corporate":
      return "bec";

    case "15-Min Diagnostic":
    case "Language Schools":
    default:
      return "general";
  }
}

function ieltsFormatForSkill(skill: MacroSkill): ItemFormat {
  const map: Record<string, ItemFormat> = {
    READING:    "MULTIPLE_CHOICE_SINGLE",
    LISTENING:  "GAP_FILL_CLOSED",
    WRITING:    "WRITING_ESSAY",
    SPEAKING:   "SPEAKING_MONOLOGUE",
    GRAMMAR:    "CLOZE_PASSAGE",
    VOCABULARY: "MULTIPLE_CHOICE_SINGLE",
  };
  return map[skill] ?? "MULTIPLE_CHOICE_SINGLE";
}

function corporateFormatForSkill(skill: MacroSkill): ItemFormat {
  const map: Record<string, ItemFormat> = {
    READING:    "MULTIPLE_CHOICE_SINGLE",
    LISTENING:  "GAP_FILL_CLOSED",
    WRITING:    "WRITING_EMAIL",
    SPEAKING:   "SPEAKING_ROLE_PLAY",
    GRAMMAR:    "CLOZE_PASSAGE",
    VOCABULARY: "MULTIPLE_CHOICE_SINGLE",
  };
  return map[skill] ?? "MULTIPLE_CHOICE_SINGLE";
}

function generalFormatForSkill(skill: MacroSkill): ItemFormat {
  const map: Record<string, ItemFormat> = {
    READING:    "MULTIPLE_CHOICE_SINGLE",
    LISTENING:  "MULTIPLE_CHOICE_SINGLE",
    WRITING:    "WRITING_ESSAY",
    SPEAKING:   "SPEAKING_OPINION",
    GRAMMAR:    "GAP_FILL_CLOSED",
    VOCABULARY: "MULTIPLE_CHOICE_SINGLE",
  };
  return map[skill] ?? "MULTIPLE_CHOICE_SINGLE";
}
