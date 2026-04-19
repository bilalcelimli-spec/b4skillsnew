import { z } from "zod";
import { CuidLike, NonEmptyString } from "./common.js";

export const GenerateCodesBody = z.object({
  productLineId: CuidLike.optional(),
  organizationId: CuidLike.optional(),
  quantity: z.number().int().min(1).max(10_000),
  expiresAt: z.string().datetime().optional(),
  prefix: z.string().trim().regex(/^[A-Z0-9-]{0,10}$/).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

const CodeString = z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9-]+$/);

export const ValidateCodeBody = z.object({
  code: CodeString,
}).strict();

export const RedeemCodeBody = z.object({
  code: CodeString,
  candidateId: CuidLike.optional(),
}).strict();
