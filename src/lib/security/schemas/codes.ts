import { z } from "zod";
import { CuidLike, NonEmptyString } from "./common.js";

export const GenerateCodesBody = z.object({
  productLineId: CuidLike.optional(),
  productLine: z.string().trim().max(200).optional(),
  organizationId: CuidLike.optional(),
  quantity: z.number().int().min(1).max(10_000),
  expiresAt: z.string().datetime().optional(),
  prefix: z.string().trim().regex(/^[A-Z0-9-]{0,10}$/).optional(),
  metadata: z.record(z.string().max(100), z.union([z.string().max(500), z.number(), z.boolean(), z.null()])).optional().superRefine((obj, ctx) => {
    if (obj && Object.keys(obj).length > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "metadata may not exceed 20 keys" });
    }
  }),
}).strict();

const CodeString = z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9-]+$/);

export const ValidateCodeBody = z.object({
  code: CodeString,
}).strict();

export const RedeemCodeBody = z.object({
  code: CodeString,
  candidateId: CuidLike.optional(),
  /** Candidate identity — required at runtime when no authenticated session exists. */
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  name: z.string().trim().max(200).optional(),
  surname: z.string().trim().max(200).optional(),
  school: z.string().trim().max(200).optional(),
  className: z.string().trim().max(200).optional(),
}).strict();
