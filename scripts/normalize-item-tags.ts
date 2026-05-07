/**
 * normalize-item-tags.ts
 *
 * Normalizes product-line tags so the engine's tag filter works correctly.
 *
 * Problems being fixed:
 * 1. Old seed scripts used capitalized/spaced tags:
 *    "Corporate" → engine looks for "corporate"
 *    "Language Schools" → engine looks for "language-schools"
 *    "Academia" → engine looks for "academia"
 *    "Primary (7-10)" → engine looks for "primary"
 *    "Junior Suite (11-14)" → engine looks for "junior"
 *    "15-Min Diagnostic" → engine uses no tag filter, but add "general" anyway
 *
 * 2. 374 items have NO product-line tag at all (mainly Grammar from seed-grammar-*):
 *    → Add "general" tag so they appear for all product lines
 *
 * Strategy: ADDITIVE — never remove existing tags, only add the canonical version.
 *
 * Usage:
 *   npx tsx scripts/normalize-item-tags.ts
 *   DRY_RUN=1 npx tsx scripts/normalize-item-tags.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

// Mapping: old tag → canonical tag to ADD (not replace)
const TAG_MAP: Record<string, string> = {
  // Old-style capitalized/spaced tags from early seed scripts
  "Corporate":            "corporate",
  "Language Schools":     "language-schools",
  "Academia":             "academia",
  "Primary (7-10)":       "primary",
  "Junior Suite (11-14)": "junior",
  "15-Min Diagnostic":    "general",
  // Underscore variants used in some seed scripts
  "language_schools":     "language-schools",
  "junior_suite":         "junior",
  "primary_7_10":         "primary",
  // Already-canonical (idempotency)
  "corporate":            "corporate",
  "language-schools":     "language-schools",
  "academia":             "academia",
  "primary":              "primary",
  "junior":               "junior",
  "general":              "general",
  "suite":                "junior",   // "junior,suite" → already has junior
};

// Product-line tags (to detect items that have ANY of them)
const ALL_PL_TAGS = new Set(Object.keys(TAG_MAP));

async function main() {
  const items = await prisma.item.findMany({
    where: { status: { in: ["ACTIVE", "PRETEST", "DRAFT", "REVIEW"] } },
    select: { id: true, tags: true, skill: true },
  });

  console.log(`\nTotal items: ${items.length}`);

  let tagAdded = 0;    // Items that got a new canonical tag
  let generalAdded = 0; // Items that got "general" because they had no PL tag

  const updates: { id: string; newTags: string[] }[] = [];

  for (const item of items) {
    const tags = item.tags as string[];
    let newTags = [...tags];
    let changed = false;

    // 1. Normalize old-style PL tags → add canonical equivalent
    for (const tag of tags) {
      const canonical = TAG_MAP[tag];
      if (canonical && !newTags.includes(canonical)) {
        newTags.push(canonical);
        changed = true;
      }
    }

    // 2. If still no product-line tag → add "general"
    const hasPlTag = newTags.some((t) => ALL_PL_TAGS.has(t));
    if (!hasPlTag) {
      newTags.push("general");
      changed = true;
      generalAdded++;
    }

    if (changed) {
      updates.push({ id: item.id, newTags });
      tagAdded++;
    }
  }

  console.log(`Items needing tag updates: ${updates.length}`);
  console.log(`  → Normalized old-style PL tags (+ canonical added): ${updates.length - generalAdded}`);
  console.log(`  → "general" added (had no PL tag): ${generalAdded}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — sample updates:");
    for (const u of updates.slice(0, 10)) {
      const item = items.find((i) => i.id === u.id)!;
      console.log(`  ${item.skill.padEnd(12)} [${(item.tags as string[]).join(",")}] → add: ${u.newTags.filter(t => !(item.tags as string[]).includes(t)).join(",")}`);
    }
    console.log(`\nDRY RUN — no writes performed.`);
    return;
  }

  // Batch updates using Promise.all in chunks
  const CHUNK = 100;
  let processed = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map((u) =>
        prisma.item.update({
          where: { id: u.id },
          data: { tags: u.newTags },
        })
      )
    );
    processed += chunk.length;
    process.stdout.write(`\r  Updated ${processed}/${updates.length}...`);
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`Total updated: ${updates.length} items`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
