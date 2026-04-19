import { z } from "zod";

export const Email = z.string().trim().toLowerCase().email().max(254);

export const Password = z.string().min(8).max(200);

export const Id = z.string().trim().min(1).max(100);

export const CuidLike = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_-]+$/, "must be an alphanumeric identifier")
  .min(1)
  .max(100);

export const NonEmptyString = z.string().trim().min(1).max(2000);

export const ShortText = z.string().trim().max(500);

export const LongText = z.string().max(50_000);

export const Url = z.string().trim().url().max(2048);

export const CefrLevel = z.enum(["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"]);

export const Role = z.enum([
  "SUPER_ADMIN",
  "ASSESSMENT_DIRECTOR",
  "INST_ADMIN",
  "INSTRUCTOR",
  "CANDIDATE",
  "ITEM_WRITER",
  "RATER",
]);

export const Pagination = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const IdParam = z.object({ id: Id });

export const OrgIdParam = z.object({ id: CuidLike });
