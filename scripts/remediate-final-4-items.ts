/**
 * Remediation Script: Fix Final 4 Items
 *
 * 1. GRAMMAR item with 2 options → Add 2 more plausible distractors
 * 2. 3 READING items with null passage field → Add passage content
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/remediate-final-4-items.ts  # Preview
 *   npx tsx scripts/remediate-final-4-items.ts             # Apply
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.env.DRY_RUN === "1";

async function main() {
  console.log(`🔧 Remediating final 4 items...\n`);
  if (isDryRun) {
    console.log("   (DRY RUN MODE - no changes will be made)\n");
  }

  // Item 1: Add 2 more options to GRAMMAR item with 2 options
  const grammarItem = await prisma.item.findUnique({
    where: { id: "cmp4fbi2c0007o76l13zpqyz0" },
  });

  if (grammarItem) {
    const content =
      typeof grammarItem.content === "string"
        ? JSON.parse(grammarItem.content)
        : grammarItem.content;

    if (content.options.length === 2) {
      console.log("📍 Adding 2 options to GRAMMAR item [cmp4fbi2c0007o76l13zpqyz0]");

      // Add 2 plausible distractors
      const newOptions = [
        ...content.options,
        {
          id: "C",
          text: "travels to",
          isCorrect: false,
          rationale:
            "Includes unnecessary preposition 'to' after the verb. While 'travels' is correct for third-person singular, 'travels to' is redundant when the destination is already specified by the preposition 'to' later in the sentence.",
        },
        {
          id: "D",
          text: "did travel",
          isCorrect: false,
          rationale:
            "Uses past tense 'did travel' instead of present simple. The adverb 'every summer' indicates a repeated action in the present, not a one-time past action, making this tense choice incorrect.",
        },
      ];

      if (!isDryRun) {
        await prisma.item.update({
          where: { id: "cmp4fbi2c0007o76l13zpqyz0" },
          data: {
            content: { ...content, options: newOptions },
          },
        });
        console.log("  ✓ Added options C and D\n");
      } else {
        console.log("  ✓ Would add options C and D\n");
      }
    }
  }

  // Items 2-4: Add passage field to READING items with null passage
  const readingItems = [
    {
      id: "cmox38rls000rnuqnchxyp3wv",
      passage:
        "The research team had spent months meticulously gathering and cross-referencing their findings. Each data point was rigorously validated, and statistical anomalies were carefully investigated to ensure maximum reliability. The principal investigator emphasised the critical importance of a flawless preliminary analysis before any conclusions could be drawn or presented. Indeed, with the foundational work now complete, the subsequent stages of theorisation and peer review could commence. It was a pivotal moment for the project, promising significant insights into the proposed hypothesis.",
    },
    {
      id: "cmox3cd55000ynuqnpde4gasn",
      passage:
        "The scientific expedition was deemed a resounding success, despite numerous unforeseen challenges. The extensive preparations had been crucial to overcoming every obstacle.",
    },
    {
      id: "cmovo0lwm001gnunk76cr48wo",
      passage:
        "Healthy Eating Workshop: Learn how to prepare quick, nutritious meals. Book your place by Friday.",
    },
  ];

  for (const item of readingItems) {
    const dbItem = await prisma.item.findUnique({ where: { id: item.id } });
    if (dbItem) {
      const content =
        typeof dbItem.content === "string"
          ? JSON.parse(dbItem.content)
          : dbItem.content;

      if (!content.passage || content.passage === "") {
        console.log(`📍 Adding passage to READING item [${item.id}]`);

        if (!isDryRun) {
          await prisma.item.update({
            where: { id: item.id },
            data: {
              content: { ...content, passage: item.passage },
            },
          });
          console.log("  ✓ Added passage\n");
        } else {
          console.log("  ✓ Would add passage\n");
        }
      }
    }
  }

  if (isDryRun) {
    console.log(
      "✓ DRY RUN: Would fix 4 items. Run without DRY_RUN=1 to apply.\n"
    );
  } else {
    console.log("✨ Fixed 4 items successfully!\n");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
