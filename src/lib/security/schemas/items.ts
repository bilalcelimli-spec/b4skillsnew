import { z } from "zod";
import { CuidLike, NonEmptyString, LongText, CefrLevel } from "./common.js";

const ItemType = z.enum([
  "MULTIPLE_CHOICE",
  "FILL_IN_BLANKS",
  "DRAG_DROP",
  "ORDERING",
  "MATCHING",
  "SHORT_ANSWER",
  "ESSAY",
  "LISTENING_MCQ",
  "LISTENING_FIB",
  "READING_MCQ",
  "READING_FIB",
  "SPEAKING",
  "WRITING",
]);

const ItemStatus = z.enum(["DRAFT", "REVIEW", "ACTIVE", "PRETEST", "RETIRED"]);

const Skill = z.enum(["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"]);

const FlatItemValue = z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()]);
const BoundedOption = z.record(z.string().max(100), FlatItemValue).superRefine((obj, ctx) => {
  if (Object.keys(obj).length > 20) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "option record may not exceed 20 keys" });
  }
});
const ItemPayload = z.record(z.string().max(200), z.unknown()).superRefine((obj, ctx) => {
  if (Object.keys(obj).length > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "item payload may not exceed 100 keys" });
  }
});

export const CreateItemBody = z.object({
  type: ItemType,
  cefrLevel: CefrLevel,
  skill: Skill.optional(),
  stem: LongText.optional(),
  prompt: LongText.optional(),
  options: z.array(BoundedOption).max(20).optional(),
  answer: z.union([z.string().max(10_000), z.array(z.string().max(10_000)).max(50), z.record(z.string().max(100), FlatItemValue)]).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  audioUrl: z.string().url().max(2048).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
  metadata: z.record(z.string().max(100), FlatItemValue).optional().superRefine((obj, ctx) => {
    if (obj && Object.keys(obj).length > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "metadata may not exceed 20 keys" });
    }
  }),
  status: ItemStatus.optional(),
  payload: ItemPayload.optional(),
}).strict().passthrough();

export const UpdateItemBody = CreateItemBody.partial();

export const GenerateItemBody = z.object({
  skill: Skill.optional(),
  cefrLevel: CefrLevel,
  type: ItemType.optional(),
  topic: NonEmptyString.max(500).optional(),
  count: z.number().int().min(1).max(50).default(1),
  instructions: LongText.optional(),
}).strict();

export const BulkGenerateItemsBody = GenerateItemBody.extend({
  count: z.number().int().min(1).max(200),
}).strict();

/**
 * Route-level schema for POST /api/items/generate — matches the field names
 * that `ai-item-generator` actually reads (`level`, `format`, `quantity`).
 * The canonical schema above (GenerateItemBody) uses the standard names.
 */
const GenerateSpecShape = z.object({
  skill: Skill,
  level: z.string().trim().max(10),        // CEFR level string, e.g. "B2"
  format: z.string().trim().max(100),       // item format / type
  quantity: z.number().int().min(1).max(50).default(1),
  topic: z.string().trim().max(500).optional(),
  instructions: LongText.optional(),
  productLine: z.string().trim().max(200).optional(),
  promptOverride: LongText.optional(),
}).passthrough();                            // passthrough for exam-source-router extras

export const GenerateItemRouteBody = GenerateSpecShape;

export const BulkGenerateRouteBody = z.object({
  specs: z.array(GenerateSpecShape).min(1).max(20),
}).strict();

export const PreviewItemBody = z.object({
  payload: ItemPayload,
  type: ItemType.optional(),
}).strict();

export const EditItemBody = z.object({
  id: CuidLike,
  changes: ItemPayload,
  reason: NonEmptyString.max(2000).optional(),
}).strict();

export const AssetUploadBody = z.object({
  kind: z.enum(["image", "audio", "video", "document"]),
  url: z.string().url().max(2048),
  mimeType: z.string().max(100).optional(),
  sizeBytes: z.number().int().nonnegative().max(100 * 1024 * 1024).optional(),
  metadata: z.record(z.string().max(100), z.union([z.string().max(500), z.number(), z.boolean(), z.null()])).optional().superRefine((obj, ctx) => {
    if (obj && Object.keys(obj).length > 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "metadata may not exceed 10 keys" });
    }
  }),
}).strict();

const PipelineStage = z.enum([
  "AI_DRAFT", "HUMAN_DRAFT", "EDITING", "LANGUAGE_REVIEW",
  "CEFR_REVIEW", "FAIRNESS_REVIEW", "MODERATION", "APPROVED_FOR_PILOT",
  "PILOT", "ANALYSIS", "CALIBRATION", "LIVE", "FLAGGED",
  "SUSPENDED", "RETIRED", "COMPROMISED",
]);

export const ItemPipelineBody = z.object({
  stage: PipelineStage,
}).strict();

export const ItemReviewBody = z.object({
  reviewType: z.string().max(50).optional(),
  verdict: z.enum(["APPROVE", "MINOR_REVISION", "MAJOR_REVISION", "REJECT"]),
  stageTarget: PipelineStage.optional(),
  notes: z.string().max(5_000).optional(),
  revisionsReq: z.array(z.string().max(500)).max(20).optional(),
  constructClarity: z.number().int().min(1).max(5).nullable().optional(),
  cefrFit: z.number().int().min(1).max(5).nullable().optional(),
  cefrFitLabel: z.string().max(10).nullable().optional(),
  languageNaturalness: z.number().int().min(1).max(5).nullable().optional(),
  distractorQuality: z.number().int().min(1).max(5).nullable().optional(),
  fairnessScore: z.number().int().min(1).max(5).nullable().optional(),
  ambiguityRisk: z.number().int().min(1).max(5).nullable().optional(),
}).strict();

export const ItemContentPatchBody = z.object({
  content: z.record(z.string().max(200), z.unknown()).superRefine((obj, ctx) => {
    if (Object.keys(obj).length > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "content may not exceed 100 keys" });
    }
  }),
  reason: z.string().max(2_000).optional(),
}).strict();

export const RatingClaimBody = z.object({
  raterId: CuidLike.optional(),
}).partial().strict();

export const RatingSubmitBody = z.object({
  score: z.number().min(0).max(100),
  rubricScores: z.record(z.string(), z.number().min(0).max(100)).optional(),
  /** Free-text reviewer feedback (also exposed as `comments` in some clients). */
  feedback: LongText.optional(),
  flags: z.array(z.string().max(100)).max(20).optional(),
}).strict();
