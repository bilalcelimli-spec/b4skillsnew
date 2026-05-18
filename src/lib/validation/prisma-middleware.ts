/**
 * Prisma Middleware for Item Validation
 *
 * Automatically validates items before create/update operations.
 * Prevents broken items from reaching the database.
 */

import { PrismaClient } from "@prisma/client";
import { validateItemStructure } from "./item-schema.js";

export function attachItemValidationMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    // Only validate Item create/update operations
    if (params.model === "Item" && ["create", "update"].includes(params.action)) {
      const data = params.args.data;

      if (data && typeof data === "object") {
        const skill = data.skill || params.args.where?.skill;
        const content = data.content;

        if (skill && content) {
          // Perform structural validation
          const errors = validateItemStructure(skill, content);

          if (errors.length > 0) {
            throw new Error(
              `Item validation failed: ${errors.join("; ")}. ` +
              `Skill: ${skill}. ` +
              `This item cannot be saved until issues are resolved.`
            );
          }
        }
      }
    }

    // Continue with the operation
    return next(params);
  });
}

/**
 * Optional: Strict mode that rejects any item with warnings
 * Enable in production to ensure zero broken items
 */
export function attachStrictItemValidationMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    if (params.model === "Item" && ["create", "update"].includes(params.action)) {
      const data = params.args.data;

      if (data && typeof data === "object") {
        const skill = data.skill;
        const content = data.content;

        if (skill && content) {
          // Strict validation: warn on any data quality issues
          const warnings: string[] = [];

          // Check option text length
          if (["GRAMMAR", "VOCABULARY", "READING", "LISTENING"].includes(skill)) {
            const opts = Array.isArray(content.options) ? content.options : [];
            opts.forEach((opt: any, idx: number) => {
              if ((opt.text ?? "").trim().length < 3) {
                warnings.push(`Option ${idx + 1} has very short text (${opt.text?.length} chars)`);
              }
              if ((opt.rationale ?? "").trim().length < 5) {
                warnings.push(`Option ${idx + 1} has insufficient rationale`);
              }
            });
          }

          // Check for duplicate options
          if (["GRAMMAR", "VOCABULARY", "READING"].includes(skill)) {
            const opts = Array.isArray(content.options) ? content.options : [];
            const texts = opts.map((o: any) => (o.text ?? "").trim().toLowerCase());
            const unique = new Set(texts);
            if (unique.size < texts.length) {
              warnings.push(`Duplicate option texts detected (${unique.size} unique of ${texts.length})`);
            }
          }

          if (warnings.length > 0) {
            console.warn(`[Item Validation Warning] Skill: ${skill}, Warnings: ${warnings.join("; ")}`);
            // In strict mode, you could throw instead:
            // throw new Error(`Item has quality warnings: ${warnings.join("; ")}`);
          }
        }
      }
    }

    return next(params);
  });
}
