import { z } from "zod";
import { CuidLike } from "./common.js";

export const CalibrationStudyBody = z.object({
  itemIds: z.array(CuidLike).min(1).max(10_000).optional(),
  sampleSize: z.number().int().min(30).max(1_000_000).optional(),
  method: z.enum(["2PL", "3PL", "RASCH", "GRM", "PCM"]).optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
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
  config: z.record(z.string(), z.unknown()),
}).strict();
