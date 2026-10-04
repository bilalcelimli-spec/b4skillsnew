#!/usr/bin/env tsx

/**
 * Generates listening MATCHING (DRAG_DROP) items through the gated generator.
 * Written as DRAFT (never served).
 *
 *   npx tsx scripts/jobs/generate-matching-listening.ts [--per-cell 5]
 */

import { runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";
import { mkdirSync, writeFileSync } from "node:fs";

const i = process.argv.indexOf("--per-cell");
const PER_CELL = i >= 0 ? Number(process.argv[i + 1]) : 5;

const CELLS: BlueprintCell[] = [
  { cefr: "B2", skill: "LISTENING", subskill: "DISTINGUISHING_VIEWPOINTS", genre: "discussion", topic: "work", itemType: "DRAG_DROP" },
  { cefr: "C1", skill: "LISTENING", subskill: "DISTINGUISHING_VIEWPOINTS", genre: "discussion", topic: "environment", itemType: "DRAG_DROP" },
  { cefr: "C2", skill: "LISTENING", subskill: "DISTINGUISHING_VIEWPOINTS", genre: "interview", topic: "media", itemType: "DRAG_DROP" },
];

async function main() {
  const results = await Promise.all(
    CELLS.map(async (cell) => {
      const r = await runBatchGeneration({ cell, count: PER_CELL, triggeredBy: "claude-code:matching-listening", notes: "Phase C: matching format for listening" });
      console.log(`${cell.cefr}: stored ${r.generated}/${r.requested} in ${Math.round(r.durationMs / 1000)}s${r.skippedReasons.length ? " | skipped: " + r.skippedReasons.slice(0, 3).join(" ; ").slice(0, 260) : ""}`);
      return r;
    })
  );
  const ids = results.flatMap((r) => r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, cefrLevel: true, type: true, status: true, guessing: true, metadata: true } });
  let blind = 0, scored = 0, guided = 0;
  const flags: Record<string, number> = {};
  for (const it of items) {
    const g: any = (it.metadata as any)?.generationGates ?? {};
    for (const f of g.flags ?? []) flags[f] = (flags[f] ?? 0) + 1;
    const td = g.textDependency;
    if (td && typeof td.blindExact === "boolean") { scored++; if (td.blindExact) blind++; if (td.guidedExact) guided++; }
  }
  console.log(`\nSTORED ${items.length} items (types: ${[...new Set(items.map((x) => x.type))].join(",")}; status: ${[...new Set(items.map((x) => x.status))].join(",")}; guessing: ${[...new Set(items.map((x) => x.guessing.toFixed(3)))].join(",")})`);
  console.log(`full mapping found WITHOUT recording: ${blind}/${scored} | key confirmed WITH recording: ${guided}/${scored}`);
  console.log("gate flags:", JSON.stringify(flags));
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/matching-listening-ids.json", JSON.stringify(items.map((x) => ({ id: x.id, code: x.itemCode, cefr: x.cefrLevel })), null, 1));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
