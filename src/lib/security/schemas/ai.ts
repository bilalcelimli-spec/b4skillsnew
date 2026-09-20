import { z } from "zod";
import { CuidLike, LongText, NonEmptyString, CefrLevel } from "./common.js";

export const SpeakingMultimodalBody = z.object({
  itemId: CuidLike,
  sessionId: CuidLike.optional(),
  audioBase64: z.string().max(25_000_000).optional(),
  audioUrl: z.string().url().max(2048).optional(),
  transcript: LongText.optional(),
  targetCefr: CefrLevel.optional(),
  prompt: LongText.optional(),
  mimeType: z.string().max(100).optional(),
}).refine((v) => !!(v.audioBase64 || v.audioUrl || v.transcript), {
  message: "One of audioBase64, audioUrl, or transcript is required",
});

export const AIGenerateItemBody = z.object({
  cefrLevel: CefrLevel,
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"]).optional(),
  topic: NonEmptyString.max(500).optional(),
  prompt: LongText.optional(),
  count: z.number().int().min(1).max(20).default(1),
  constraints: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const AIEditItemBody = z.object({
  itemId: CuidLike,
  instructions: NonEmptyString.max(5000),
  keepOriginalAnswer: z.boolean().optional(),
}).strict();

const FlatAIValue = z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()]);
const BoundedRecord = z.record(z.string().max(100), FlatAIValue).superRefine((obj, ctx) => {
  if (Object.keys(obj).length > 50) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "record may not exceed 50 keys" });
  }
});

export const ScoreAIBody = z.object({
  itemId: CuidLike,
  response: z.union([z.string().max(100_000), BoundedRecord]),
  rubric: BoundedRecord.optional(),
  sessionId: CuidLike.optional(),
  targetCefr: CefrLevel.optional(),
}).strict();

export const AITutorBody = z.object({
  message: z.string().min(1).max(5_000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(10_000),
  })).max(20).default([]),
  context: z.object({
    cefrLevel: z.string().max(10).optional(),
    skill: z.string().max(50).optional(),
    itemId: z.string().max(100).optional(),
  }).default({}),
}).strict();

export const CertificateGenerateBody = z.object({
  sessionId: CuidLike,
  candidateId: CuidLike.optional(),
  templateId: CuidLike.optional(),
  locale: z.string().max(20).optional(),
}).strict();
