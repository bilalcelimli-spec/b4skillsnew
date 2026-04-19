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

const ItemPayload = z.record(z.string(), z.unknown());

export const CreateItemBody = z.object({
  type: ItemType,
  cefrLevel: CefrLevel,
  skill: Skill.optional(),
  stem: LongText.optional(),
  prompt: LongText.optional(),
  options: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
  answer: z.union([z.string().max(10_000), z.array(z.string().max(10_000)).max(50), z.record(z.string(), z.unknown())]).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  audioUrl: z.string().url().max(2048).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

export const PreviewItemBody = z.object({
  payload: z.record(z.string(), z.unknown()),
  type: ItemType.optional(),
}).strict();

export const EditItemBody = z.object({
  id: CuidLike,
  changes: z.record(z.string(), z.unknown()),
  reason: NonEmptyString.max(2000).optional(),
}).strict();

export const AssetUploadBody = z.object({
  kind: z.enum(["image", "audio", "video", "document"]),
  url: z.string().url().max(2048),
  mimeType: z.string().max(100).optional(),
  sizeBytes: z.number().int().nonnegative().max(100 * 1024 * 1024).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const RatingClaimBody = z.object({
  raterId: CuidLike.optional(),
}).partial().strict();

export const RatingSubmitBody = z.object({
  score: z.number().min(0).max(100),
  rubricScores: z.record(z.string(), z.number().min(0).max(100)).optional(),
  comments: LongText.optional(),
  flags: z.array(z.string().max(100)).max(20).optional(),
}).strict();
