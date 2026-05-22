#!/usr/bin/env npx tsx
/**
 * Fix MCQ Item Bank: Add option IDs and shuffle answer positions
 *
 * Problem: 42.6% of correct answers in position 0 (A) due to:
 *  1. Missing options[].id (A/B/C/D)
 *  2. Missing correctAnswer field
 *  3. shuffleMcqOptions() returns null → silent skip
 *
 * Solution:
 *  1. Add options[].id sequentially (A, B, C, D)
 *  2. Shuffle options with round-robin distribution (targetPos = itemIndex % 4)
 *  3. Add correctAnswer field with post-shuffle letter
 *
 * Flags:
 *  DRY_RUN=1    — Preview changes, don't touch database
 *  SKIP_SHUFFLE=1 — Only add id/correctAnswer, don't reorder options
 *
 * Usage:
 *  DRY_RUN=1 npx tsx scripts/fix-mcq-ids-and-shuffle.ts    # Preview
 *  npx tsx scripts/fix-mcq-ids-and-shuffle.ts              # Apply
 */

import { prisma } from "../src/lib/prisma.js";

const DRY_RUN = process.env.DRY_RUN === "1";
const SKIP_SHUFFLE = process.env.SKIP_SHUFFLE === "1";

const LABELS = ["A", "B", "C", "D"];

interface MCQOption {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface MCQContent {
  type: "MULTIPLE_CHOICE";
  question: string;
  options: MCQOption[];
  explanation?: string;
  correctAnswer?: string;
}

function addIdsToOptions(options: MCQOption[]): MCQOption[] {
  return options.map((opt, i) => ({
    ...opt,
    id: LABELS[i % 4],
  }));
}

function shuffleOptionsRoundRobin(
  options: MCQOption[],
  itemIndex: number
): MCQOption[] {
  if (options.length !== 4) {
    console.warn(
      `  ⚠️  Item has ${options.length} options (expected 4), skipping shuffle`
    );
    return options;
  }

  const targetPos = itemIndex % 4;
  const currentCorrectPos = options.findIndex((o) => o.isCorrect);

  if (currentCorrectPos === -1) {
    console.warn(`  ⚠️  No option marked isCorrect, skipping shuffle`);
    return options;
  }

  // Calculate rotation
  const rotateBy = (targetPos - currentCorrectPos + 4) % 4;
  const rotated = [
    ...options.slice(rotateBy),
    ...options.slice(0, rotateBy),
  ];

  return rotated;
}

async function processMCQItems(): Promise<void> {
  const skills = ["GRAMMAR", "VOCABULARY", "READING"];
  let totalProcessed = 0;
  let totalUpdated = 0;
  const errors: Array<{ itemCode: string; error: string }> = [];

  for (const skill of skills) {
    console.log(`\n📚 Processing ${skill} items...`);

    const items = await prisma.item.findMany({
      where: { skill },
      select: {
        id: true,
        itemCode: true,
        skill: true,
        content: true,
      },
      orderBy: { itemCode: "asc" },
    });

    if (items.length === 0) {
      console.log(`  ℹ️  No items found`);
      continue;
    }

    const mcqItems = items.filter(
      (item) => (item.content as MCQContent).type === "MULTIPLE_CHOICE"
    );

    if (mcqItems.length === 0) {
      console.log(`  ℹ️  No MCQ items found (${items.length} total items)`);
      continue;
    }

    console.log(`  Found ${mcqItems.length} MCQ items (out of ${items.length})`);

    for (let idx = 0; idx < mcqItems.length; idx++) {
      const item = mcqItems[idx];
      const content = item.content as MCQContent;

      if (content.type !== "MULTIPLE_CHOICE" || !content.options) {
        errors.push({
          itemCode: item.itemCode,
          error: "Invalid content structure",
        });
        continue;
      }

      try {
        // Check if needs update
        const needsIdUpdate = content.options.some((opt) => !opt.id);
        const needsCorrectAnswerUpdate = !("correctAnswer" in content);

        if (!needsIdUpdate && !needsCorrectAnswerUpdate) {
          if (DRY_RUN) {
            console.log(
              `  [DRY RUN] ${item.itemCode}: already has id/correctAnswer`
            );
          }
          continue;
        }

        // Step 1: Add IDs if missing
        let updatedOptions = content.options.map((opt, i) =>
          opt.id
            ? opt
            : {
                ...opt,
                id: LABELS[i % 4],
              }
        );

        // Step 2: Shuffle if not skipped
        if (!SKIP_SHUFFLE && needsIdUpdate) {
          updatedOptions = shuffleOptionsRoundRobin(updatedOptions, idx);
        }

        // Step 3: Add correctAnswer field
        const correctPos = updatedOptions.findIndex((o) => o.isCorrect);
        const correctAnswer = correctPos >= 0 ? LABELS[correctPos] : "A";

        const updatedContent: MCQContent = {
          ...content,
          options: updatedOptions,
          correctAnswer,
        };

        if (DRY_RUN) {
          console.log(
            `  [DRY RUN] ${item.itemCode}: shuffle ${!SKIP_SHUFFLE && needsIdUpdate ? "enabled" : "disabled"}, correctAnswer=${correctAnswer}`
          );
        } else {
          await prisma.item.update({
            where: { id: item.id },
            data: { content: updatedContent },
          });
          console.log(
            `  ✅ ${item.itemCode}: correctAnswer=${correctAnswer}${!SKIP_SHUFFLE && needsIdUpdate ? " (shuffled)" : ""}`
          );
        }

        totalUpdated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ itemCode: item.itemCode, error: msg });
        console.error(`  ❌ ${item.itemCode}: ${msg}`);
      }

      totalProcessed++;
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total MCQ items processed: ${totalProcessed}`);
  console.log(`Items updated: ${totalUpdated}`);
  if (errors.length > 0) {
    console.error(`Errors: ${errors.length}`);
    for (const { itemCode, error } of errors.slice(0, 10)) {
      console.error(`  - ${itemCode}: ${error}`);
    }
    if (errors.length > 10) {
      console.error(`  ... and ${errors.length - 10} more`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN MODE — No database changes made`);
    console.log(`Remove DRY_RUN=1 to apply changes`);
  } else {
    console.log(`\n✨ Database updated successfully`);
  }

  if (SKIP_SHUFFLE) {
    console.log(`\n⚠️  SKIP_SHUFFLE=1 — Options NOT reordered`);
    console.log(`Remove SKIP_SHUFFLE=1 to enable shuffling`);
  }
}

// Main
processMCQItems()
  .then(() => {
    console.log(`\nDone.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
