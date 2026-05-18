/**
 * Analyze Broken Items
 *
 * Provides detailed information on all broken items to help
 * decide whether to fix, delete, or manually review them.
 */

import { PrismaClient } from "@prisma/client";
import { validateItemStructure } from "../src/lib/validation/item-schema.js";

const prisma = new PrismaClient();

async function main() {
  console.log(`🔍 Analyzing broken items in database...\n`);

  const items = await prisma.item.findMany({
    select: {
      id: true,
      itemCode: true,
      skill: true,
      content: true,
      createdAt: true,
    },
  });

  const broken: Record<
    string,
    Array<{
      id: string;
      itemCode: string;
      skill: string;
      errors: string[];
      content: any;
      recommendation: string;
    }>
  > = {};

  for (const item of items) {
    const errors = validateItemStructure(item.skill, item.content);
    if (errors.length > 0) {
      const content =
        typeof item.content === "string"
          ? JSON.parse(item.content)
          : item.content;

      // Categorize error
      let category = "other";
      if (errors.some((e) => e.includes("0 options"))) {
        category = "zero-options";
      } else if (errors.some((e) => e.includes("options"))) {
        category = "insufficient-options";
      } else if (errors.some((e) => e.includes("prompt"))) {
        category = "missing-prompt";
      } else if (errors.some((e) => e.includes("short"))) {
        category = "short-passage";
      } else if (errors.some((e) => e.includes("serialization"))) {
        category = "serialization-error";
      }

      if (!broken[category]) {
        broken[category] = [];
      }

      // Determine recommendation
      let recommendation = "";
      if (category === "zero-options" || category === "serialization-error") {
        recommendation = "DELETE (content corrupted)";
      } else if (category === "missing-prompt") {
        recommendation = "DELETE (incomplete item)";
      } else if (category === "short-passage") {
        recommendation = "MANUAL REVIEW (expand or delete)";
      } else if (category === "insufficient-options") {
        recommendation = "MANUAL FIX (add options or delete)";
      }

      broken[category].push({
        id: item.id,
        itemCode: item.itemCode || item.id,
        skill: item.skill,
        errors,
        content,
        recommendation,
      });
    }
  }

  // Report by category
  const categories = [
    "zero-options",
    "insufficient-options",
    "missing-prompt",
    "short-passage",
    "serialization-error",
    "other",
  ];

  let totalBroken = 0;
  let totalDelete = 0;

  for (const category of categories) {
    if (!broken[category] || broken[category].length === 0) continue;

    const items = broken[category];
    totalBroken += items.length;

    console.log(`\n📌 ${category.toUpperCase()} (${items.length} items):`);
    console.log(`   Recommendation: ${items[0].recommendation}\n`);

    for (const item of items) {
      console.log(`   [${item.itemCode}] ${item.skill}`);
      for (const error of item.errors) {
        console.log(`     - ${error}`);
      }
      console.log(`     → ${item.recommendation}`);
      if (item.recommendation.startsWith("DELETE")) {
        totalDelete++;
      }
    }
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total broken items: ${totalBroken}`);
  console.log(`   Recommend DELETE: ${totalDelete}`);
  console.log(`   Recommend MANUAL FIX: ${totalBroken - totalDelete}\n`);

  console.log(`✨ Analysis complete!\n`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
