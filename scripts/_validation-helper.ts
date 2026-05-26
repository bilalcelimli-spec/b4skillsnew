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
