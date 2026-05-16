/**
 * fix-remaining-items.ts
 * Run with:  npx tsx fix-remaining-items.ts
 *
 * Fixes:
 *  A. cmp4gujik0 — correctAnswer:"There are" text, but no isCorrect:true on options → fix
 *  B. Retire 6 items with [object Object] content or no options (unrecoverable)
 *  C. Retire cmp4h48kc0 — empty prompt (PRETEST)
 *  D. Retire cmox38rls0, cmox3cd550 — DRAFT READING items with empty passage
 */

import { prisma } from "./src/lib/prisma.js";

type Option = { id?: string; text?: string; isCorrect?: boolean; rationale?: string };

async function main() {
  let totalFixed = 0;
  let totalRetired = 0;

  // ── Fix A: cmp4gujik0 — correctAnswer text → set isCorrect:true ────────────

  console.log("=== Fix A: cmp4gujik0 — match correctAnswer text to option ===\n");

  const gujik = await prisma.item.findFirst({
    where: { id: { startsWith: "cmp4gujik0" } },
    select: { id: true, content: true },
  });

  if (!gujik) {
    console.log("  ❌ Item cmp4gujik0 not found — skipping.\n");
  } else {
    const c = gujik.content as any;
    const correctText = String(c.correctAnswer ?? "").trim().toLowerCase();
    const opts: Option[] = Array.isArray(c.options) ? c.options : [];

    const updated = opts.map((o) => ({
      ...o,
      isCorrect: (o.text ?? "").trim().toLowerCase() === correctText,
    }));

    const matchCount = updated.filter((o) => o.isCorrect).length;
    if (matchCount === 0) {
      console.log(
        `  ⚠️  No option text matched correctAnswer "${c.correctAnswer}". Options: ${opts.map((o) => o.text).join(" | ")}`
      );
    } else {
      await prisma.item.update({
        where: { id: gujik.id },
        data: { content: { ...c, options: updated } },
      });
      totalFixed++;
      console.log(
        `  ✅ [${gujik.id.slice(0, 10)}] Set isCorrect:true on option "${
          updated.find((o) => o.isCorrect)?.text
        }"\n`
      );
    }
  }

  // ── Fix B & C: Retire unrecoverable items ─────────────────────────────────

  console.log("=== Fix B+C: Retire unrecoverable items ===\n");

  const RETIRE_IDS = [
    "cmp4hf8af0", // [object Object] options × 5
    "cmp4ieikq0", // [object Object] options × 4
    "cmp4j5mru0", // [object Object] options × 4
    "cmp4hurh00", // no options at all
    "cmp4ilst90", // no options at all
    "cmp4izkjw0", // no options at all
    "cmp4h48kc0", // empty prompt
  ];

  for (const prefix of RETIRE_IDS) {
    const item = await prisma.item.findFirst({
      where: { id: { startsWith: prefix } },
      select: { id: true, status: true, itemCode: true },
    });
    if (!item) {
      console.log(`  ⚠️  ${prefix} — not found, skipping.`);
      continue;
    }
    if (item.status === "RETIRED") {
      console.log(`  ℹ️  [${item.itemCode ?? item.id.slice(0, 10)}] Already RETIRED.`);
      continue;
    }
    await prisma.item.update({
      where: { id: item.id },
      data: { status: "RETIRED" },
    });
    totalRetired++;
    console.log(`  ✅ [${item.itemCode ?? item.id.slice(0, 10)}] → RETIRED`);
  }

  // ── Fix D: Retire DRAFT READING items with empty passage ──────────────────

  console.log("\n=== Fix D: Retire DRAFT READING items with empty passage ===\n");

  const DRAFT_READING_RETIRE = ["cmox38rls0", "cmox3cd550"];

  for (const prefix of DRAFT_READING_RETIRE) {
    const item = await prisma.item.findFirst({
      where: { id: { startsWith: prefix } },
      select: { id: true, status: true, itemCode: true, content: true },
    });
    if (!item) {
      console.log(`  ⚠️  ${prefix} — not found, skipping.`);
      continue;
    }
    const c = item.content as any;
    const passage = String(c.passage ?? "").trim();
    if (passage.length >= 30) {
      console.log(
        `  ℹ️  [${item.itemCode ?? item.id.slice(0, 10)}] Passage now present (${passage.length} chars) — leaving status as-is.`
      );
      continue;
    }
    await prisma.item.update({
      where: { id: item.id },
      data: { status: "RETIRED" },
    });
    totalRetired++;
    console.log(
      `  ✅ [${item.itemCode ?? item.id.slice(0, 10)}] DRAFT→RETIRED (empty passage, ${passage.length} chars)`
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n══════════════════════════════════════════");
  console.log(`  Correct-answer fixes applied : ${totalFixed}`);
  console.log(`  Items retired                : ${totalRetired}`);
  console.log("══════════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
