import { z } from "zod";
import { CefrLevel, CuidLike, NonEmptyString } from "./common.js";

const SkillEnum = z.enum(["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"]);
const ItemTypeEnum = z.enum([
  "MULTIPLE_CHOICE",
  "FILL_IN_BLANKS",
  "DRAG_DROP",
  "SPEAKING_PROMPT",
  "WRITING_PROMPT",
  "INTEGRATED_TASK",
]);

const ItemContentSchema = z.object({
  stimulus: z.string().max(20_000).optional(),
  prompt: z.string().max(20_000).optional(),
  question: z.string().max(5_000).optional(),
  stem: z.string().max(5_000).optional(),
  options: z.array(z.string().max(2_000)).max(10).optional(),
  correctAnswer: z.union([z.string().max(2_000), z.number().int()]).optional(),
  acceptableAnswers: z.array(z.string().max(2_000)).max(20).optional(),
  distractorRationale: z
    .union([z.record(z.string(), z.string().max(2_000)), z.array(z.string().max(2_000))])
    .optional(),
  answerKey: z.string().max(5_000).optional(),
  sampleResponse: z.string().max(20_000).optional(),
  rubric: z.unknown().optional(),
}).catchall(z.unknown());

/**
 * Validate a draft item that is NOT yet in the database. Used by item
 * editors / generators to get an instant verdict before persisting.
 */
export const ValidateDraftBody = z.object({
  type: ItemTypeEnum,
  skill: SkillEnum,
  cefrLevel: CefrLevel,
  content: ItemContentSchema,
  discrimination: z.number().min(-5).max(5).optional(),
  difficulty: z.number().min(-5).max(5).optional(),
  guessing: z.number().min(0).max(1).optional(),
  tags: z.array(NonEmptyString.max(80)).max(40).optional(),
  options: z.object({
    allowEmbeddings: z.boolean().optional(),
    allowLlmJudge: z.boolean().optional(),
    disabledGates: z.array(NonEmptyString.max(80)).max(20).optional(),
    gateTimeoutMs: z.number().int().min(1_000).max(60_000).optional(),
    /**
     * If true, the server pulls a same-skill / same-CEFR bank slice for
     * duplicate detection. Skipped when false (faster).
     */
    compareAgainstBank: z.boolean().optional(),
  }).optional(),
}).strict();

/**
 * Validate an existing item by id. Pulls bank slice automatically.
 */
export const ValidateItemByIdBody = z.object({
  itemId: CuidLike,
  options: z.object({
    allowEmbeddings: z.boolean().optional(),
    allowLlmJudge: z.boolean().optional(),
    disabledGates: z.array(NonEmptyString.max(80)).max(20).optional(),
    gateTimeoutMs: z.number().int().min(1_000).max(60_000).optional(),
  }).optional(),
}).strict();
