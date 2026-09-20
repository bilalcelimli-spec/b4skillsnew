import { z } from "zod";
import { CuidLike } from "./common.js";

export const CalibrationStudyBody = z.object({
  itemIds: z.array(CuidLike).min(1).max(10_000).optional(),
  sampleSize: z.number().int().min(30).max(1_000_000).optional(),
  method: z.enum(["2PL", "3PL", "RASCH", "GRM", "PCM"]).optional(),
  filter: z.record(z.string().max(100), z.union([z.string().max(500), z.number(), z.boolean(), z.null(), z.array(z.string().max(500)).max(100)])).optional().superRefine((obj, ctx) => {
    if (obj && Object.keys(obj).length > 30) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "filter may not exceed 30 keys" });
    }
  }),
}).strict();

export const CalibrationApplyBody = z.object({
  studyId: CuidLike.optional(),
  itemIds: z.array(CuidLike).max(10_000).optional(),
  overwrite: z.boolean().optional(),
}).strict();

export const CalibrationPretestBody = z.object({
  itemIds: z.array(CuidLike).min(1).max(10_000),
  targetResponses: z.number().int().min(10).max(100_000).optional(),
}).strict();

export const CalibrationPromoteBody = z.object({
  itemIds: z.array(CuidLike).min(1).max(10_000),
  minResponses: z.number().int().min(1).max(100_000).optional(),
}).strict();

export const SystemConfigBody = z.object({
  config: z.record(z.string().max(200), z.unknown()).superRefine((obj, ctx) => {
    if (Object.keys(obj).length > 200) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "config may not exceed 200 keys" });
    }
  }),
}).strict();
