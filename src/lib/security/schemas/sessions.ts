import { z } from "zod";
import { Id, CuidLike, NonEmptyString, LongText } from "./common.js";

export const SessionLaunchBody = z.object({
  candidateId: CuidLike.optional(),
  productLineId: CuidLike.optional(),
  examCode: z.string().trim().max(64).optional(),
  startingSkill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const SessionRespondBody = z.object({
  itemId: CuidLike,
  response: z.union([
    z.string().max(100_000),
    z.array(z.string().max(10_000)).max(100),
    z.record(z.string(), z.unknown()),
    z.number(),
    z.boolean(),
  ]),
  timeSpentMs: z.number().int().nonnegative().max(60 * 60 * 1000).optional(),
  skipped: z.boolean().optional(),
}).strict();

export const SessionCompleteBody = z.object({
  reason: z.enum(["COMPLETED", "TIMEOUT", "CANDIDATE_ABORT", "PROCTOR_ABORT", "SYSTEM_ABORT"]).optional(),
}).partial().strict();

export const SessionFeedbackBody = z.object({
  rating: z.number().int().min(1).max(5),
  comment: LongText.optional(),
  categories: z.array(z.string().max(100)).max(20).optional(),
}).strict();

export const SessionIdParam = z.object({ id: Id });
