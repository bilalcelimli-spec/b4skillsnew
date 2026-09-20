import { z } from "zod";
import { CuidLike, NonEmptyString, Url } from "./common.js";

export const CheckoutBody = z.object({
  priceId: NonEmptyString.max(200),
  quantity: z.number().int().min(1).max(10_000).optional(),
  mode: z.enum(["payment", "subscription", "setup"]).optional(),
  successUrl: Url.optional(),
  cancelUrl: Url.optional(),
  customerEmail: z.string().email().max(254).optional(),
  organizationId: CuidLike.optional(),
  metadata: z.record(z.string(), z.string().max(500)).optional(),
}).strict();

export const OnboardingBulkBody = z.object({
  records: z.array(
    z.record(z.string().max(100), z.union([z.string().max(1_000), z.number(), z.boolean(), z.null()])).superRefine((obj, ctx) => {
      if (Object.keys(obj).length > 30) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "record may not exceed 30 keys" });
      }
    })
  ).min(1).max(10_000),
  dryRun: z.boolean().optional(),
}).strict();
