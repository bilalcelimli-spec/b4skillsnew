/**
 * Remediation Script: Add Missing SPEAKING Timing Fields
 *
 * Fixes SPEAKING items that are missing responseTime and/or prepTime.
 * Adds default values: responseTime=120 seconds, prepTime=30 seconds
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/remediate-speaking-timing.ts  # Preview
 *   npx tsx scripts/remediate-speaking-timing.ts             # Apply
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.env.DRY_RUN === "1";

async function main() {
  console.log(`🔧 Remediating SPEAKING items with missing timing fields...\n`);
  if (isDryRun) {
    console.log("   (DRY RUN MODE - no changes will be made)\n");
  }

  // Find all SPEAKING items
  const items = await prisma.item.findMany({
    where: {
      skill: "SPEAKING",
    },
  });

  console.log(`Found ${items.length} SPEAKING items to check...\n`);

  const itemsToFix: Array<{
    id: string;
    itemCode: string;
    missingFields: string[];
  }> = [];

  for (const item of items) {
    const content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
    const missingFields: string[] = [];

    if (!content.responseTime || content.responseTime === 0) {
      missingFields.push("responseTime");
    }
    if (!content.prepTime || content.prepTime === 0) {
      missingFields.push("prepTime");
    }

    if (missingFields.length > 0) {
      itemsToFix.push({
        id: item.id,
        itemCode: item.itemCode || item.id,
        missingFields,
      });
    }
  }

  if (itemsToFix.length === 0) {
    console.log("✨ All SPEAKING items have timing fields. All good!\n");
    return;
  }

  console.log(`Found ${itemsToFix.length} SPEAKING items missing timing:\n`);
  for (const item of itemsToFix) {
    console.log(`  [${item.itemCode}] Missing: ${item.missingFields.join(", ")}`);
  }

  if (isDryRun) {
    console.log(
      `\n✓ DRY RUN: Would fix ${itemsToFix.length} items. Run without DRY_RUN=1 to apply.\n`
    );
    return;
  }

  console.log(`\n⚠️  Applying fixes to ${itemsToFix.length} items...\n`);

  let fixed = 0;
  for (const item of itemsToFix) {
    try {
      const dbItem = await prisma.item.findUnique({ where: { id: item.id } });
      if (!dbItem) continue;

      const content = typeof dbItem.content === "string" ? JSON.parse(dbItem.content) : dbItem.content;

      // Add missing timing fields with sensible defaults
      const updatedContent = {
        ...content,
        responseTime: content.responseTime || 120, // 2 minutes default
        prepTime: content.prepTime || 30, // 30 seconds default
      };

      await prisma.item.update({
        where: { id: item.id },
        data: { content: updatedContent },
      });

      fixed++;
      const fields = item.missingFields.join(", ");
      console.log(
        `  ✓ Fixed [${item.itemCode}]: Added ${fields} (response=120s, prep=30s)`
      );
    } catch (error) {
      console.error(`  ✗ Failed [${item.itemCode}]:`, error);
    }
  }

  console.log(`\n✨ Fixed ${fixed}/${itemsToFix.length} items successfully!\n`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
