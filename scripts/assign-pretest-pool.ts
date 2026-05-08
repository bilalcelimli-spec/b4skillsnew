/**
 * assign-pretest-pool.ts
 *
 * Selects a stratified sample of ACTIVE items and marks them as isPretest=true.
 * Strategy:
 *   - For each (skill × cefrLevel) cell, take up to QUOTA items with the lowest
 *     exposureCount (i.e. freshest items, least likely to be over-exposed).
 *   - DRAFT items are included first — they are freshly generated and ideal
 *     pretest candidates.
 *   - Total target: ~240 items (≈10% of 2,234 item bank), 2 per cell minimum.
 *
 * Usage:
 *   npx tsx scripts/assign-pretest-pool.ts          # dry-run (no writes)
 *   DRY_RUN=0 npx tsx scripts/assign-pretest-pool.ts # commit to DB
 */

import { prisma } from "../src/lib/prisma.js";

const DRY_RUN = (process.env.DRY_RUN ?? "1") !== "0";
const QUOTA_PER_CELL = parseInt(process.env.QUOTA ?? "6", 10);

const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "SPEAKING", "WRITING"] as const;
const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

async function main() {
  console.log(`\n🎯 Pretest Pool Assigner — DRY_RUN=${DRY_RUN}, QUOTA_PER_CELL=${QUOTA_PER_CELL}\n`);

  // Reset existing pretest flags first (clean slate on each run)
  if (!DRY_RUN) {
    const reset = await prisma.item.updateMany({
      where: { isPretest: true },
      data: { isPretest: false },
    });
    console.log(`  ♻️  Reset ${reset.count} existing pretest flags`);
  }

  const idsToMark: string[] = [];
  let totalFound = 0;

  for (const skill of SKILLS) {
    for (const cefrLevel of CEFR_LEVELS) {
      // Prioritise DRAFT first (newly generated, unexamined), then ACTIVE low-exposure
      const items = await prisma.item.findMany({
        where: {
          skill,
          cefrLevel,
          status: { in: ["DRAFT", "ACTIVE"] },
        },
        orderBy: [
          { status: "asc" },        // ACTIVE < DRAFT alphabetically — we want DRAFT first
          { exposureCount: "asc" },
        ],
        take: QUOTA_PER_CELL,
        select: { id: true, status: true, exposureCount: true, itemCode: true },
      });

      // Sort so DRAFT comes first
      const sorted = items.sort((a, b) => {
        if (a.status === "DRAFT" && b.status !== "DRAFT") return -1;
        if (b.status === "DRAFT" && a.status !== "DRAFT") return 1;
        return a.exposureCount - b.exposureCount;
      });

      const cell = sorted.slice(0, QUOTA_PER_CELL);
      totalFound += cell.length;

      if (cell.length > 0) {
        console.log(`  ${skill.padEnd(12)} / ${cefrLevel.padEnd(7)} → ${cell.length} items`);
        idsToMark.push(...cell.map((i) => i.id));
      } else {
        console.log(`  ${skill.padEnd(12)} / ${cefrLevel.padEnd(7)} → ⚠️  0 items (gap!)`);
      }
    }
  }

  console.log(`\n  Total selected: ${idsToMark.length} items`);

  if (!DRY_RUN) {
    const result = await prisma.item.updateMany({
      where: { id: { in: idsToMark } },
      data: { isPretest: true },
    });
    console.log(`  ✅ Marked ${result.count} items as isPretest=true\n`);
  } else {
    console.log(`  [DRY RUN] Would mark ${idsToMark.length} items — set DRY_RUN=0 to commit.\n`);
  }

  // Summary table
  const summary = await prisma.item.groupBy({
    by: ["skill"],
    where: DRY_RUN ? { id: { in: idsToMark } } : { isPretest: true },
    _count: true,
  });
  console.log("  Breakdown by skill:");
  summary.forEach((r) => console.log(`    ${r.skill.padEnd(12)} : ${r._count}`));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
