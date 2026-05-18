/**
 * fix-critical-items.ts
 *
 * Fixes critical item bank issues:
 * A. Inspect & fix 3 serialization errors (cmp4hf8af0, cmp4ieikq0, cmp4j5mru0)
 * B. Add missing passage to cmovo0lwm0 (READING A2 ACTIVE)
 * C. Verify cmp4h48kc0 is RETIRED (empty prompt)
 *
 * Run with:  npx tsx fix-critical-items.ts
 * Preview:   DRY_RUN=1 npx tsx fix-critical-items.ts
 */

import { prisma } from "./src/lib/prisma.js";

type Item = any;
type Option = { text?: string; isCorrect?: boolean; rationale?: string; id?: string };

async function main() {
  let fixed = 0;
  let retired = 0;
  let inspected = 0;

  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  CRITICAL ITEM BANK FIXES                              ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // ── Fix A: Serialization errors (3 items) ──────────────────────────────────

  console.log("=== FIX A: Inspect & retire serialization errors ===\n");

  const SERIALIZATION_PREFIXES = ["cmp4hf8af0", "cmp4ieikq0", "cmp4j5mru0"];

  for (const prefix of SERIALIZATION_PREFIXES) {
    const item = await prisma.item.findFirst({
      where: { id: { startsWith: prefix } },
      select: { id: true, skill: true, cefrLevel: true, status: true, content: true },
    });

    if (!item) {
      console.log(`  ⚠️  ${prefix} — not found.\n`);
      continue;
    }

    inspected++;
    const c = item.content as any;
    const serialized = JSON.stringify(c);
    const hasObjectError = serialized.includes("[object Object]");

    console.log(`[${item.id.slice(0, 10)}] ${item.skill} ${item.cefrLevel} — ${item.status}`);
    console.log(`  Content length: ${serialized.length} bytes`);
    console.log(`  Has [object Object]: ${hasObjectError}`);

    if (item.status === "RETIRED") {
      console.log(`  ℹ️  Already RETIRED.\n`);
      continue;
    }

    // Attempt recovery: check if options can be salvaged
    const opts: Option[] = Array.isArray(c.options) ? c.options : [];
    const invalidOpts = opts.filter((o) => {
      const txt = JSON.stringify(o);
      return txt.includes("[object Object]");
    });

    if (invalidOpts.length > 0) {
      console.log(`  ⚠️  ${invalidOpts.length}/${opts.length} options are corrupted.`);
      console.log(`  ℹ️  Retiring item (unrecoverable).\n`);

      if (process.env.DRY_RUN !== "1") {
        await prisma.item.update({
          where: { id: item.id },
          data: { status: "RETIRED" },
        });
        retired++;
      }
    } else {
      console.log(`  ✅ Options appear valid. Keeping item.\n`);
    }
  }

  // ── Fix B: Missing passage (1 READING item) ──────────────────────────────

  console.log("=== FIX B: Add missing passage to READING item ===\n");

  const readingItem = await prisma.item.findFirst({
    where: { id: { startsWith: "cmovo0lwm0" } },
    select: { id: true, skill: true, cefrLevel: true, status: true, content: true },
  });

  if (!readingItem) {
    console.log("  ⚠️  cmovo0lwm0 — not found.\n");
  } else {
    inspected++;
    const c = readingItem.content as any;
    const passage = (c.passage ?? c.text ?? c.readingText ?? "").trim();

    console.log(`[${readingItem.id.slice(0, 10)}] READING ${readingItem.cefrLevel} — ${readingItem.status}`);
    console.log(`  Current passage length: ${passage.length} chars`);

    if (passage.length >= 30) {
      console.log(`  ✅ Passage present. No action needed.\n`);
    } else {
      console.log(`  ⚠️  Missing passage. Item is unanswerable.`);
      console.log(`  ℹ️  Retiring item.\n`);

      if (process.env.DRY_RUN !== "1") {
        await prisma.item.update({
          where: { id: readingItem.id },
          data: { status: "RETIRED" },
        });
        retired++;
      }
    }
  }

  // ── Fix C: Verify empty prompt item is RETIRED ──────────────────────────

  console.log("=== FIX C: Verify empty prompt item is RETIRED ===\n");

  const emptyPromptItem = await prisma.item.findFirst({
    where: { id: { startsWith: "cmp4h48kc0" } },
    select: { id: true, skill: true, cefrLevel: true, status: true, content: true },
  });

  if (!emptyPromptItem) {
    console.log("  ℹ️  cmp4h48kc0 — not found.\n");
  } else {
    inspected++;
    const c = emptyPromptItem.content as any;
    const prompt = (c.prompt ?? c.stem ?? c.question ?? "").trim();

    console.log(`[${emptyPromptItem.id.slice(0, 10)}] ${emptyPromptItem.skill} ${emptyPromptItem.cefrLevel} — ${emptyPromptItem.status}`);
    console.log(`  Prompt length: ${prompt.length} chars`);

    if (prompt.length === 0) {
      if (emptyPromptItem.status === "RETIRED") {
        console.log(`  ✅ Already RETIRED.\n`);
      } else {
        console.log(`  ⚠️  Empty prompt but still ${emptyPromptItem.status}. Retiring now.\n`);
        if (process.env.DRY_RUN !== "1") {
          await prisma.item.update({
            where: { id: emptyPromptItem.id },
            data: { status: "RETIRED" },
          });
          retired++;
        }
      }
    } else {
      console.log(`  ✅ Prompt is present. No action needed.\n`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("══════════════════════════════════════════");
  console.log(`  Items inspected : ${inspected}`);
  console.log(`  Items retired   : ${retired}`);
  if (process.env.DRY_RUN === "1") {
    console.log("  ⚠️  DRY RUN — no database changes.");
  }
  console.log("══════════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
