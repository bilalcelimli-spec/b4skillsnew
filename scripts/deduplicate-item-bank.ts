/**
 * scripts/deduplicate-item-bank.ts
 *
 * Detects near-duplicate items in the active/pretest bank using n-gram Jaccard
 * similarity. Items with similarity > SIMILARITY_THRESHOLD are flagged as
 * SUSPECTED_DUPLICATE in their tags and moved to REVIEW status for human inspection.
 *
 * Does NOT use external embeddings — safe to run without OpenAI quota.
 *
 * Usage:
 *   npx tsx scripts/deduplicate-item-bank.ts [--dry-run] [--threshold 0.85]
 *
 * Options:
 *   --dry-run      Report duplicates without modifying the database (default: false)
 *   --threshold N  Jaccard similarity threshold (default: 0.85)
 *   --skill SKILL  Limit to one skill (e.g. GRAMMAR, VOCABULARY)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const THRESHOLD = (() => {
  const i = args.indexOf("--threshold");
  return i !== -1 ? parseFloat(args[i + 1]) : 0.85;
})();
const SKILL_FILTER = (() => {
  const i = args.indexOf("--skill");
  return i !== -1 ? args[i + 1] : undefined;
})();

// ─── Jaccard similarity on character 4-grams ─────────────────────────────────

function toNGrams(text: string, n = 4): Set<string> {
  const clean = text.toLowerCase().replace(/\s+/g, " ").trim();
  const grams = new Set<string>();
  for (let i = 0; i <= clean.length - n; i++) {
    grams.add(clean.slice(i, i + n));
  }
  return grams;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const g of a) {
    if (b.has(g)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function extractText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof c.prompt === "string") parts.push(c.prompt);
  if (typeof c.passage === "string") parts.push(c.passage);
  if (typeof c.question === "string") parts.push(c.question);
  if (typeof c.stem === "string") parts.push(c.stem);
  return parts.join(" ");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 Near-Duplicate Item Detection`);
  console.log(`   Threshold: Jaccard ≥ ${THRESHOLD}`);
  console.log(`   Mode:      ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE (will update DB)"}`);
  if (SKILL_FILTER) console.log(`   Skill:     ${SKILL_FILTER}`);
  console.log();

  const where: any = { status: { in: ["ACTIVE", "PRETEST"] } };
  if (SKILL_FILTER) where.skill = SKILL_FILTER;

  const items = await prisma.item.findMany({
    where,
    select: { id: true, skill: true, cefrLevel: true, type: true, content: true, tags: true, status: true },
  });

  console.log(`📦 Loaded ${items.length} items`);

  // Pre-compute n-grams per item
  const grams = items.map((item) => ({
    id: item.id,
    skill: item.skill,
    cefrLevel: item.cefrLevel,
    tags: (item.tags as string[]) ?? [],
    ngrams: toNGrams(extractText(item.content)),
  }));

  const suspectedPairs: Array<{ a: string; b: string; sim: number }> = [];
  const flaggedIds = new Set<string>();

  // O(n²) pairwise comparison — grouped by skill+CEFR to reduce n
  const groups = new Map<string, typeof grams>();
  for (const g of grams) {
    const key = `${g.skill}::${g.cefrLevel}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(g);
  }

  for (const [groupKey, groupItems] of groups) {
    console.log(`   Comparing ${groupItems.length} items in group [${groupKey}]...`);
    for (let i = 0; i < groupItems.length; i++) {
      for (let j = i + 1; j < groupItems.length; j++) {
        const sim = jaccard(groupItems[i].ngrams, groupItems[j].ngrams);
        if (sim >= THRESHOLD) {
          suspectedPairs.push({ a: groupItems[i].id, b: groupItems[j].id, sim });
          flaggedIds.add(groupItems[i].id);
          flaggedIds.add(groupItems[j].id);
        }
      }
    }
  }

  console.log(`\n⚠️  Found ${suspectedPairs.length} suspected duplicate pairs (${flaggedIds.size} unique items)`);

  if (suspectedPairs.length > 0) {
    console.log("\nTop 10 pairs by similarity:");
    suspectedPairs
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 10)
      .forEach((p) => console.log(`   [${(p.sim * 100).toFixed(1)}%] ${p.a} ↔ ${p.b}`));
  }

  if (!DRY_RUN && flaggedIds.size > 0) {
    console.log("\n💾 Writing to database...");
    let updated = 0;
    for (const id of flaggedIds) {
      const item = grams.find((g) => g.id === id)!;
      const newTags = Array.from(new Set([...item.tags, "SUSPECTED_DUPLICATE"]));
      await prisma.item.update({
        where: { id },
        data: { status: "REVIEW", tags: newTags },
      });
      updated++;
    }
    console.log(`✅ Moved ${updated} items to REVIEW with tag SUSPECTED_DUPLICATE`);
  } else if (DRY_RUN) {
    console.log("\n(dry-run: no changes made)");
  }

  console.log("\nDone.\n");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
