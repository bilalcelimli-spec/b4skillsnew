/**
 * Item Batch Validator
 *
 * Validates all items in the database or from seed files
 * to ensure they meet validation requirements before insertion.
 *
 * Usage:
 *   npx ts-node scripts/validate-items.ts              # Validate DB items
 *   npx ts-node scripts/validate-items.ts --seeds     # Validate seed data
 *   npx ts-node scripts/validate-items.ts --strict    # Fail on any error
 */

import { PrismaClient } from "@prisma/client";
import { validateItemStructure } from "../src/lib/validation/item-schema.js";
import { validateAndReport } from "./_validation-helper.js";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isStrictMode = args.includes("--strict");
const validateSeeds = args.includes("--seeds");

async function validateDatabaseItems() {
  console.log("🔍 Validating items in database...");

  const items = await prisma.item.findMany({
    select: {
      id: true,
      itemCode: true,
      skill: true,
      content: true,
    },
  });

  console.log(`Found ${items.length} items to validate\n`);

  const valid = [];
  const invalid = [];

  for (const item of items) {
    const errors = validateItemStructure(item.skill as string, item.content);
    if (errors.length === 0) {
      valid.push(item);
    } else {
      invalid.push({ item, errors });
    }
  }

  console.log(`✅ Valid items: ${valid.length}`);
  if (invalid.length > 0) {
    console.error(`❌ Invalid items: ${invalid.length}`);
    for (const { item, errors } of invalid.slice(0, 10)) {
      console.error(
        `  [${item.itemCode || item.id}] ${errors.join("; ")}`
      );
    }
    if (invalid.length > 10) {
      console.error(`  ... and ${invalid.length - 10} more`);
    }
  }

  if (invalid.length > 0 && isStrictMode) {
    console.error("\n🛑 Validation failed in strict mode");
    return 1;
  }

  return 0;
}

async function validateSeedFiles() {
  console.log("🔍 Validating seed files...");
  console.log("⚠️  Seed validation would require loading all seed files dynamically");
  console.log("    For now, validation happens at database insert time");
  return 0;
}

async function main() {
  try {
    let exitCode = 0;

    if (validateSeeds) {
      exitCode = await validateSeedFiles();
    } else {
      exitCode = await validateDatabaseItems();
    }

    if (exitCode === 0) {
      console.log("\n✨ Validation complete!");
    }

    return exitCode;
  } catch (error) {
    console.error("Error during validation:", error);
    return 1;
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
