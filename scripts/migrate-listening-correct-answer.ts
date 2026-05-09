/**
 * migrate-listening-correct-answer.ts
 *
 * Migrates LISTENING items that use the old {text, isCorrect, rationale} options
 * format to the canonical {id: "A", text} + correctAnswer: "A" format.
 *
 * Also applies to READING/GRAMMAR/VOCABULARY items with the same legacy format
 * (pass --all-skills to include them).
 *
 * Usage:
 *   npx tsx scripts/migrate-listening-correct-answer.ts
 *   DRY_RUN=1 npx tsx scripts/migrate-listening-correct-answer.ts
 *   ALL_SKILLS=1 npx tsx scripts/migrate-listening-correct-answer.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";
const ALL_SKILLS = process.env.ALL_SKILLS === "1";

const LETTER = ["A", "B", "C", "D", "E"];

async function main() {
  const skillFilter = ALL_SKILLS
    ? undefined
    : { skill: { in: ["LISTENING"] as any } };

  const items = await prisma.item.findMany({
    where: { status: "ACTIVE", ...skillFilter },
    select: { id: true, skill: true, content: true },
  });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    const options = c.options as any[] | undefined;

    if (!options || options.length === 0) { skipped++; continue; }

    // Already migrated: has id on first option AND has correctAnswer
    if (options[0].id !== undefined && c.correctAnswer) { skipped++; continue; }

    // Must have isCorrect field to migrate
    if (options[0].isCorrect === undefined) { skipped++; continue; }

    // Build new options with id: "A"/"B"/"C"/"D"
    let correctId: string | null = null;
    const newOptions = options.map((opt: any, idx: number) => {
      const id = LETTER[idx] ?? String(idx);
      if (opt.isCorrect === true) correctId = id;
      const newOpt: Record<string, unknown> = { id, text: opt.text };
      // Preserve rationale if present (server-side only — not shown to student)
      if (opt.rationale) newOpt.rationale = opt.rationale;
      return newOpt;
    });

    if (!correctId) {
      console.warn(`[WARN]  ${item.id} (${item.skill}) — no option has isCorrect:true, skipping`);
      errors++;
      continue;
    }

    const newContent = { ...c, options: newOptions, correctAnswer: correctId };

    if (DRY_RUN) {
      console.log(`[DRY]   ${item.id} (${item.skill}) → correctAnswer: ${correctId}`);
      migrated++;
      continue;
    }

    try {
      await prisma.item.update({
        where: { id: item.id },
        data: { content: newContent as any },
      });
      migrated++;
    } catch (err: any) {
      console.error(`[ERR]   ${item.id} — ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`Migrated: ${migrated} | Skipped (already OK): ${skipped} | Errors: ${errors}`);
  if (DRY_RUN) console.log("DRY RUN — no writes performed.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
