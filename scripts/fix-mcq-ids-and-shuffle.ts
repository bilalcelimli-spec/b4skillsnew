/**
 * Fix MCQ Option IDs and Shuffle Answer Positions
 *
 * Problem: MCQ items (GRAMMAR, VOCABULARY, READING) lack:
 *   - options[].id fields (A/B/C/D) required by shuffleMcqOptions()
 *   - correctAnswer field required by shuffleMcqOptions()
 * Result: Server-side shuffle silently returns null → candidates always see
 *         options in DB order → correct answer was at pos0 (A) 42.6% of the time.
 *
 * Fix:
 *   1. Add id fields (A, B, C, D) to each option
 *   2. Rotate options so correct answer is evenly distributed (round-robin)
 *   3. Set correctAnswer to the letter at the correct position
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/fix-mcq-ids-and-shuffle.ts    # preview only
 *   npx tsx scripts/fix-mcq-ids-and-shuffle.ts              # apply
 *   SKIP_SHUFFLE=1 npx tsx scripts/fix-mcq-ids-and-shuffle.ts  # add ids/correctAnswer, keep order
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.env.DRY_RUN === "1";
const skipShuffle = process.env.SKIP_SHUFFLE === "1";

// Standard MCQ labels (used by server-side shuffle, max A-D)
const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const MCQ_SKILLS = ["GRAMMAR", "VOCABULARY", "READING"];
// Server shuffleMcqOptions only handles A-D; items with 5+ options are skipped for shuffle
const MAX_SHUFFLEABLE = 4;

function rotateArray<T>(arr: T[], by: number): T[] {
  if (by === 0) return arr;
  return [...arr.slice(by), ...arr.slice(0, by)];
}

async function main() {
  console.log(`🔀 Fixing MCQ option IDs and shuffling answer positions…\n`);
  if (isDryRun) console.log("   (DRY RUN — no DB changes)\n");
  if (skipShuffle) console.log("   (SKIP_SHUFFLE — adding ids/correctAnswer only)\n");

  const items = await prisma.item.findMany({
    where: { skill: { in: MCQ_SKILLS as any[] } },
    select: { id: true, itemCode: true, skill: true, content: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${items.length} MCQ items to process.\n`);

  // Before distribution
  const beforeDist: Record<string, number> = {};
  for (const item of items) {
    const c = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
    const opts: any[] = c.options || [];
    const pos = opts.findIndex((o) => o.isCorrect);
    const key = pos === -1 ? "none" : `pos${pos}`;
    beforeDist[key] = (beforeDist[key] || 0) + 1;
  }
  console.log("Before distribution:");
  for (const [k, v] of Object.entries(beforeDist).sort()) {
    console.log(`  ${k}: ${v} (${((v / items.length) * 100).toFixed(1)}%)`);
  }
  console.log();

  let updated = 0;
  let skipped = 0;
  const afterDist: Record<string, number> = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const content =
      typeof item.content === "string" ? JSON.parse(item.content) : item.content;
    const options: any[] = content.options || [];

    if (options.length < 2) {
      skipped++;
      continue;
    }

    const currentCorrectPos = options.findIndex((o) => o.isCorrect);
    if (currentCorrectPos === -1) {
      skipped++;
      continue;
    }

    let finalOptions: any[];
    const canShuffle = options.length <= MAX_SHUFFLEABLE && !skipShuffle;

    if (!canShuffle) {
      // Items with 5+ options (e.g. KET matching) or SKIP_SHUFFLE: just add ids, keep order
      finalOptions = options.map((o, idx) => ({ ...o, id: LABELS[idx] }));
    } else {
      // Round-robin target: distribute correct answers evenly across A/B/C/D
      const targetPos = i % 4;
      const rotateBy = (targetPos - currentCorrectPos + options.length) % options.length;
      const rotated = rotateArray(options, rotateBy);
      finalOptions = rotated.map((o, idx) => ({ ...o, id: LABELS[idx] }));
    }

    const newCorrectPos = finalOptions.findIndex((o) => o.isCorrect);
    // Only set correctAnswer for items with ≤4 options (server shuffle requires A-D)
    const correctAnswer = options.length <= MAX_SHUFFLEABLE ? LABELS[newCorrectPos] : undefined;

    const posKey = `pos${newCorrectPos}`;
    afterDist[posKey] = (afterDist[posKey] || 0) + 1;

    if (!isDryRun) {
      const updatedContent: any = { ...content, options: finalOptions };
      if (correctAnswer !== undefined) updatedContent.correctAnswer = correctAnswer;
      await prisma.item.update({
        where: { id: item.id },
        data: { content: updatedContent },
      });
    }

    updated++;
  }

  console.log(`\nAfter distribution (${isDryRun ? "projected" : "applied"}):`);
  for (const [k, v] of Object.entries(afterDist).sort()) {
    console.log(`  ${k}: ${v} (${((v / updated) * 100).toFixed(1)}%)`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${updated}`);
  console.log(`   Skipped:   ${skipped} (no options or no correct answer)`);

  if (isDryRun) {
    console.log(`\n✓ DRY RUN complete. Run without DRY_RUN=1 to apply.\n`);
  } else {
    console.log(`\n✨ Done! ${updated} items updated.\n`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
