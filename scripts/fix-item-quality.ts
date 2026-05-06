/**
 * Production item quality fix script.
 *
 * Fix 1 — LISTENING (200 items):
 *   passage field starts with a TTS role-marker header like:
 *   "[Ms. Green — teacher, female adult | Tom — student, male child, age 8]\n\n"
 *   Strip everything up to and including the first \n\n so only the actual
 *   dialogue is shown to test-takers.
 *
 * Fix 2 — READING (20 items):
 *   Passage heading is in ALL CAPS (e.g. "WESTFIELD SCHOOL LIBRARY — NEW OPENING HOURS")
 *   Convert fully-uppercase heading lines to Title Case.
 *
 * All other detected "caps" patterns are legitimate:
 *   - Linguistics terminology in GRAMMAR prompts (CLEFT, ELLIPSIS, MANDATIVE, etc.)
 *   - Standard acronyms (UNESCO, WTO, ICC, NATO, EOD, etc.)
 *   - Test-convention emphasis words (CORRECT, MOST, NOT, TRUE)
 *
 * Run dry-run first:
 *   DRY_RUN=1 npx tsx scripts/fix-item-quality.ts
 *
 * Apply:
 *   npx tsx scripts/fix-item-quality.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip TTS role-marker header from a listening passage.
 * Pattern: passage starts with "[...one or more role descriptors...]\n\n"
 * The bracket content may span one line (no nested brackets).
 */
function stripRoleMarker(passage: string): string {
  // Matches: "[anything]\n\n" at the very start (dotAll for —, commas, etc.)
  return passage.replace(/^\[[\s\S]*?\]\n\n/, "").trimStart();
}

/**
 * Title-case a single word, respecting em/en-dashes as separators but treating
 * the whole dash-joined phrase as separate tokens.
 */
const SMALL_WORDS = new Set([
  "a","an","the","and","but","or","nor","for","so","yet",
  "at","by","in","of","on","to","up","as","it","is"
]);

function toTitleCaseLine(line: string): string {
  // Split on spaces; convert each token
  let first = true;
  return line.replace(/\S+/g, (token) => {
    // Preserve dash separators like — and –
    if (token === "—" || token === "–" || token === "-") { first = true; return token; }
    const lower = token.toLowerCase();
    if (first || !SMALL_WORDS.has(lower)) {
      first = false;
      // Capitalise first char, lowercase rest
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    first = false;
    return lower;
  });
}

/**
 * Returns true if a line is "entirely uppercase" (all alpha tokens are uppercase).
 * Ignores punctuation, numbers, dashes, and em-dashes.
 */
function isEntirelyUppercase(line: string): boolean {
  const words = line.trim().split(/\s+/).filter(w => /[A-Za-z]/.test(w));
  if (words.length < 2) return false;
  return words.every(w => /^[A-Z0-9\-—–:•]+$/.test(w));
}

/**
 * Fix ALL_CAPS heading lines in a reading passage.
 * Only converts lines where ALL alpha tokens are uppercase.
 */
function fixCapsHeadings(passage: string): string {
  return passage
    .split("\n")
    .map(line => (isEntirelyUppercase(line) ? toTitleCaseLine(line) : line))
    .join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Item Quality Fix (${DRY_RUN ? "DRY RUN" : "LIVE"}) ===\n`);

  const items = await prisma.item.findMany({
    select: { id: true, skill: true, itemCode: true, content: true },
  });

  type Update = { id: string; skill: string; itemCode: string; newContent: Record<string, unknown> };
  const updates: Update[] = [];

  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    let changed = false;
    const updated = { ...c };

    // Fix 1: LISTENING — strip role-marker from passage
    if (item.skill === "LISTENING" && typeof c.passage === "string") {
      const fixed = stripRoleMarker(c.passage);
      if (fixed !== c.passage) {
        console.log(`[LISTENING ROLE-MARKER] ${item.itemCode}`);
        console.log(`  BEFORE: "${c.passage.substring(0, 80).replace(/\n/g, "\\n")}"`);
        console.log(`  AFTER:  "${fixed.substring(0, 80).replace(/\n/g, "\\n")}"`);
        updated.passage = fixed;
        changed = true;
      }
    }

    // Fix 2: READING — fix ALL_CAPS heading lines in passage
    if (item.skill === "READING" && typeof c.passage === "string") {
      const fixed = fixCapsHeadings(c.passage);
      if (fixed !== c.passage) {
        // Show only the lines that changed
        const beforeLines = c.passage.split("\n");
        const afterLines = fixed.split("\n");
        const changedLines = beforeLines
          .map((l, i) => ({ before: l, after: afterLines[i] }))
          .filter(p => p.before !== p.after);
        console.log(`[READING CAPS-HEADING] ${item.itemCode}`);
        changedLines.forEach(p => {
          console.log(`  BEFORE: "${p.before}"`);
          console.log(`  AFTER:  "${p.after}"`);
        });
        updated.passage = fixed;
        changed = true;
      }
    }

    if (changed) {
      updates.push({ id: item.id, skill: item.skill, itemCode: item.itemCode, newContent: updated });
    }
  }

  console.log(`\n──────────────────────────────────`);
  console.log(`Total items checked: ${items.length}`);
  console.log(`Items to update:     ${updates.length}`);
  console.log(`  LISTENING: ${updates.filter(u => u.skill === "LISTENING").length}`);
  console.log(`  READING:   ${updates.filter(u => u.skill === "READING").length}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — no changes written to DB.");
    await prisma.$disconnect();
    return;
  }

  // Apply in batches of 50
  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map(u =>
        prisma.item.update({
          where: { id: u.id },
          data: { content: u.newContent },
        })
      )
    );
    done += batch.length;
    console.log(`  Updated ${done}/${updates.length}…`);
  }

  console.log("\nDone. All items updated successfully.");
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
