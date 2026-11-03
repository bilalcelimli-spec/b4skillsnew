import { z } from "zod";
import { PURCHASE_POLICY_VERSION } from "../../payments/purchase-policy";

export const CheckoutBody = z.object({
  planId: z.enum(['full-assessment', 'pro-bundle']),
  requestId: z.string().uuid(),
  policyVersion: z.literal(PURCHASE_POLICY_VERSION),
  acceptedPurchaseTerms: z.literal(true),
}).strict();

export const EarlyStartBody = z.object({
  transactionId: z.string().min(1).max(250),
  policyVersion: z.string().min(1).max(100),
  requestEarlyStart: z.literal(true),
  acknowledgeWithdrawalEffect: z.literal(true),
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
