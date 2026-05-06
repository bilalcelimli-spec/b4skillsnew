/**
 * Remove topic-label parentheses from question stems.
 *
 * Removes:
 *   GRAMMAR (105 items) — trailing topic labels, e.g. (Parallel contrast), (Passive, prior action)
 *   VOCABULARY (16 items) — trailing hint labels, e.g. (thing you use to write), (colour)
 *   GRAMMAR inline (5 specific items) — parenthetical definitions inside the prompt,
 *     e.g. "ELLIPSIS (avoiding repetition)" → "ELLIPSIS"
 *
 * Does NOT touch:
 *   READING, LISTENING — parens are paragraph references / inline content
 *   WRITING, SPEAKING — parens are task instructions / e.g. examples
 *   GRM-C2-0054 — contains (A) / (B) option labels, not topic labels
 *
 * Dry-run:  DRY_RUN=1 npx tsx scripts/fix-prompt-parens.ts
 * Apply:    npx tsx scripts/fix-prompt-parens.ts
 */
import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

/** Remove a trailing (...) from a string, e.g. "sentence. (Topic label)" → "sentence." */
function stripTrailingParen(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*$/, "").trimEnd();
}

/** Item codes that have inline definition parens to remove (not trailing) */
const INLINE_PAREN_FIXES: Record<string, RegExp> = {
  "GRM-C2-0014": /\s*\(avoiding repetition\)/,
  "GRM-C2-0025": /\s*\(pseudo-cleft\)/,
  "GRM-C2-0031": /\s*\(pronoun before antecedent\)/,
  "GRM-C2-0046": /\s*\(a nominal clause inside a relative clause\)/,
  "GRM-B1-0095": /\s*\(not a state\)/,
};

async function main() {
  console.log(`\n=== Fix Prompt Parens (${DRY_RUN ? "DRY RUN" : "LIVE"}) ===\n`);

  const items = await prisma.item.findMany({
    select: { id: true, skill: true, itemCode: true, content: true },
    where: { skill: { in: ["GRAMMAR", "VOCABULARY"] } },
  });

  type Update = { id: string; itemCode: string; newContent: Record<string, unknown> };
  const updates: Update[] = [];

  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    const prompt = c.prompt;
    if (typeof prompt !== "string") continue;

    let fixed = prompt;

    // Inline definition parens (specific item codes)
    const inlineRe = INLINE_PAREN_FIXES[item.itemCode ?? ""];
    if (inlineRe) {
      fixed = fixed.replace(inlineRe, "");
    }

    // Trailing topic/hint paren for all GRAMMAR and VOCABULARY items
    // (except GRM-C2-0054 which has (A)/(B) option labels)
    if (item.itemCode !== "GRM-C2-0054") {
      fixed = stripTrailingParen(fixed);
    }

    if (fixed !== prompt) {
      console.log(`[${item.itemCode}]`);
      console.log(`  BEFORE: "${prompt}"`);
      console.log(`  AFTER:  "${fixed}"`);
      updates.push({ id: item.id, itemCode: item.itemCode, newContent: { ...c, prompt: fixed } });
    }
  }

  console.log(`\n──────────────────────────────────`);
  console.log(`Items checked: ${items.length}`);
  console.log(`Items to update: ${updates.length}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — no changes written.");
    await prisma.$disconnect();
    return;
  }

  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map(u =>
        prisma.item.update({ where: { id: u.id }, data: { content: u.newContent as Prisma.InputJsonValue } })
      )
    );
    done += batch.length;
    console.log(`  Updated ${done}/${updates.length}…`);
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
