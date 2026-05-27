/**
 * CLI Validation Helper
 *
 * Shared validation utilities for seed scripts and CLI tools.
 * Validates items before database insertion to catch errors early.
 */

import { validateItemStructure } from "../src/lib/validation/item-schema.js";

export interface ValidationResult {
  valid: any[];
  invalid: Array<{
    item: any;
    errors: string[];
  }>;
}

/**
 * Validate a batch of items and separate valid from invalid
 */
export function validateItemBatch(items: any[]): ValidationResult {
  const valid = [];
  const invalid = [];

  for (const item of items) {
    const errors = validateItemStructure(item.skill, item.content);
    if (errors.length === 0) {
      valid.push(item);
    } else {
      invalid.push({ item, errors });
    }
  }

  return { valid, invalid };
}

/**
 * Print validation results to console
 */
export function reportValidationResults(
  valid: number,
  invalid: number,
  failedItems: Array<{
    item: any;
    errors: string[];
  }>
): void {
  console.log(`✅ Valid items: ${valid}`);
  if (invalid > 0) {
    console.error(`❌ Invalid items: ${invalid}`);
    for (const { item, errors } of failedItems) {
      console.error(`  ${item.itemCode || item.id || "unknown"}: ${errors.join("; ")}`);
    }
  }
}

/**
 * Validate and report, return exit code
 */
export function validateAndReport(
  items: any[],
  opts: { strict?: boolean; failFast?: boolean } = {}
): number {
  const { valid, invalid } = validateItemBatch(items);
  reportValidationResults(valid.length, invalid.length, invalid);

  if (invalid.length > 0) {
    if (opts.strict) {
      console.error(
        `\n🛑 Strict validation failed: ${invalid.length} items have errors`
      );
      return 1;
    }
    if (opts.failFast) {
      console.error(
        `\n⚠️  Validation failed for ${invalid.length} items (continuing in non-strict mode)`
      );
    }
  }

  return invalid.length > 0 && opts.strict ? 1 : 0;
}

/**
 * Drop-in fail-fast guard for scripts that generate items dynamically
 * (no pre-built `items: ItemInput[]` array). Wraps `prisma.item.create`
 * and `prisma.item.upsert` so every call is validated *before* the DB write.
 *
 * Usage (one line at the top of the script):
 *   import { installCreateGuard } from "./_validation-helper.js";
 *   installCreateGuard(prisma, "seed-script-name");
 *
 * After install, every `prisma.item.create()` and `prisma.item.upsert()`
 * call will validate its payload and process.exit(1) on the first
 * structural failure — the database write never happens.
 */
export function installCreateGuard(prisma: any, label = "seed"): void {
  if (prisma.__guardInstalled) return;
  prisma.__guardInstalled = true;

  const origCreate = prisma.item.create.bind(prisma.item);
  const origUpsert = prisma.item.upsert.bind(prisma.item);

  prisma.item.create = (args: any) => {
    const d = args?.data;
    if (d?.skill && d?.content) assertItemValid(d, label);
    return origCreate(args);
  };

  prisma.item.upsert = (args: any) => {
    const d = args?.create || args?.update;
    if (d?.skill && d?.content) assertItemValid(d, label);
    return origUpsert(args);
  };
}

/**
 * Single-item fail-fast validator for scripts that generate items
 * inline (no upfront `items: ItemInput[]` array).
 *
 * Usage:
 *   import { assertItemValid } from "./_validation-helper.js";
 *   for (...) {
 *     const data = { skill, cefrLevel, content, ... };
 *     assertItemValid(data);  // throws & exits on failure
 *     await prisma.item.create({ data });
 *   }
 *
 * Throws via process.exit(1) so the caller never reaches the DB write.
 */
export function assertItemValid(
  data: { skill: string; content: unknown; itemCode?: string },
  label = "seed"
): void {
  const errors = validateItemStructure(data.skill, data.content);
  if (errors.length === 0) return;
  const id = data.itemCode || "unknown";
  console.error(`\n❌ [${label}] Item "${id}" failed pre-save validation:`);
  for (const e of errors) console.error(`   • ${e}`);
  console.error(`\n🛑 Aborting before database write.`);
  process.exit(1);
}

/**
 * One-call fail-fast validator for seed scripts.
 *
 * Validates an items array and aborts the process with exit-code 1
 * if any item fails. On success, prints a one-line summary and returns
 * the array of valid items (useful when caller wants to keep going).
 *
 * Usage in a seed script:
 *   import { validateOrExit } from "./_validation-helper.js";
 *   const items = [...];
 *   const validItems = validateOrExit(items, "grammar-phase-N");
 *   for (const item of validItems) await prisma.item.create({ data: item });
 *
 * The `label` argument is shown in the console output for easier debugging
 * when running many seed scripts in sequence.
 */
export function validateOrExit(items: any[], label = "seed"): any[] {
  const { valid, invalid } = validateItemBatch(items);

  if (invalid.length > 0) {
    console.error(`\n❌ [${label}] Validation failed for ${invalid.length}/${items.length} items:`);
    for (const { item, errors } of invalid) {
      console.error(`   • ${item.itemCode || item.id || "unknown"}: ${errors.join("; ")}`);
    }
    console.error(`\n🛑 Aborting before any database write.`);
    process.exit(1);
  }

  console.log(`✅ [${label}] All ${items.length} items passed pre-save validation.`);
  return valid;
}
