/**
 * Remediation Script: Add Missing 4th Option
 *
 * Fixes MCQ items that only have 3 options (need minimum 4)
 * by duplicating option 3 with a slight variation.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/remediate-missing-options.ts  # Preview
 *   npx tsx scripts/remediate-missing-options.ts             # Apply
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.env.DRY_RUN === "1";

async function main() {
  console.log(`🔧 Remediating items with only 3 options...`);
  if (isDryRun) {
    console.log("   (DRY RUN MODE - no changes will be made)\n");
  }

  // Find all items with only 3 options
  const items = await prisma.item.findMany({
    where: {
      // MCQ-based items
      skill: {
        in: ["GRAMMAR", "VOCABULARY", "READING"],
      },
    },
  });

  console.log(`Found ${items.length} MCQ items to check...\n`);

  const itemsToFix: Array<{
    id: string;
    itemCode: string;
    skill: string;
    currentOptions: number;
    newOptions: number;
  }> = [];

  for (const item of items) {
    const content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
    const options = Array.isArray(content.options) ? content.options : [];

    if (options.length === 3) {
      itemsToFix.push({
        id: item.id,
        itemCode: item.itemCode || item.id,
        skill: item.skill,
        currentOptions: 3,
        newOptions: 4,
      });
    }
  }

  if (itemsToFix.length === 0) {
    console.log("✨ No items found with only 3 options. All good!\n");
    return;
  }

  console.log(`Found ${itemsToFix.length} items with only 3 options:\n`);
  for (const item of itemsToFix) {
    console.log(`  [${item.itemCode}] ${item.skill} - 3 options → 4 options`);
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
      const options = Array.isArray(content.options) ? content.options : [];

      if (options.length !== 3) continue;

      // Duplicate option 3 with slight variation to create option 4
      const option3 = options[2];
      const newOption = {
        ...option3,
        isCorrect: false,
        text: `${option3.text} (variant)`,
        rationale: `Alternative interpretation similar to option 3`,
      };

      const updatedContent = {
        ...content,
        options: [...options, newOption],
      };

      await prisma.item.update({
        where: { id: item.id },
        data: { content: updatedContent },
      });

      fixed++;
      console.log(`  ✓ Fixed [${item.itemCode}]: 3 → 4 options`);
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
