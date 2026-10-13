import { z } from "zod";
import { CuidLike, Email } from "./common.js";

import { resolveAssessmentProduct } from '../../product-lines/assessment-catalog';
import { OZGUN_PRODUCT } from '../../fixed-forms/ozgun-kids';

export const AssessmentProduct = z.string().trim().min(1).max(200).transform((value, ctx) => {
  const resolved = resolveAssessmentProduct(value);
  if (resolved) return resolved;
  ctx.addIssue({code: 'custom', message: 'Unknown assessment product'});
  return z.NEVER;
});

export const SendExamInviteBody = z.object({
  email: Email,
  name: z.string().trim().max(200).optional(),
  productLine: AssessmentProduct,
  organizationId: CuidLike.optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
}).strict();

const LocalOrOffsetDate = z.string().datetime({offset: true, local: true});
export const CreateAssignmentBody = z.object({
  classId: CuidLike.optional(),
  productLine: AssessmentProduct.refine(value => value !== OZGUN_PRODUCT, 'Fixed forms require an exam code'),
  title: z.string().trim().max(200).optional(),
  openAt: LocalOrOffsetDate.optional(),
  dueAt: LocalOrOffsetDate.optional(),
  maxAttempts: z.number().int().min(1).max(100).optional(),
}).strict().refine(body => !body.openAt || !body.dueAt || Date.parse(body.dueAt) > Date.parse(body.openAt),
  {message: 'Due date must be after opening date', path: ['dueAt']});

export const GenerateCodesBody = z.object({
  productLineId: CuidLike.optional(),
  productLine: AssessmentProduct.optional(),
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

const CodeString = z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9-]+$/).transform(code => code.toUpperCase());

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
