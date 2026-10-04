#!/usr/bin/env tsx

/**
 * Generates B2–C2 listening items aimed at the demand gap found in the bank
 * audit (inference / attitude / synthesis instead of detail retrieval).
 * Items are written as DRAFT (never served) through the gated generator.
 *
 *   npx tsx scripts/jobs/generate-listening-expansion.ts [--per-cell 5]
 */

import { runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";

const i = process.argv.indexOf("--per-cell");
const PER_CELL = i >= 0 ? Number(process.argv[i + 1]) : 5;

const CELLS: BlueprintCell[] = [
  { cefr: "C2", skill: "LISTENING", subskill: "SYNTHESISING_INFORMATION", genre: "discussion", topic: "society" },
  { cefr: "C2", skill: "LISTENING", subskill: "DISTINGUISHING_VIEWPOINTS", genre: "interview", topic: "media" },
  { cefr: "C1", skill: "LISTENING", subskill: "SPEAKER_ATTITUDE", genre: "discussion", topic: "work" },
  { cefr: "C1", skill: "LISTENING", subskill: "ARGUMENT_DEVELOPMENT", genre: "lecture", topic: "environment" },
  { cefr: "B2", skill: "LISTENING", subskill: "INFERRED_INTENTION", genre: "discussion", topic: "education" },
  { cefr: "B2", skill: "LISTENING", subskill: "IMPLICATION", genre: "presentation", topic: "health" },
];

async function main() {
  let cursor = 0;
  const results: any[] = [];
  async function worker() {
    while (cursor < CELLS.length) {
      const cell = CELLS[cursor++];
      const r = await runBatchGeneration({ cell, count: PER_CELL, triggeredBy: "claude-code:listening-expansion", notes: "Bank audit 2026-10: fill inference/attitude/synthesis gap" });
      results.push({ cell: `${cell.cefr}/${cell.subskill}`, r });
      console.log(`${cell.cefr}/${cell.subskill}: stored ${r.generated}/${r.requested} in ${Math.round(r.durationMs / 1000)}s${r.skippedReasons.length ? " | skipped: " + r.skippedReasons.slice(0, 3).join(" ; ").slice(0, 300) : ""}`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));

  const ids = results.flatMap((x) => x.r.storedIds as string[]);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, cefrLevel: true, status: true, metadata: true } });
  const hard: Record<string, number> = {}; const flags: Record<string, number> = {}; const demand: Record<string, number> = {};
  let blind = 0, scored = 0;
  for (const it of items) {
    const m: any = it.metadata ?? {};
    const g = m.generationGates ?? {};
    const h = g.hardening?.status ?? "n/a"; hard[h] = (hard[h] ?? 0) + 1;
    for (const f of g.flags ?? []) flags[f] = (flags[f] ?? 0) + 1;
    if (m.cognitiveDemand) demand[m.cognitiveDemand] = (demand[m.cognitiveDemand] ?? 0) + 1;
    if (typeof g.textDependency?.blindOk === "boolean") { scored++; if (g.textDependency.blindOk) blind++; }
  }
  console.log(`\nSTORED ${items.length} DRAFT items (status: ${[...new Set(items.map((x) => x.status))].join(",")})`);
  console.log("hardening:", JSON.stringify(hard));
  console.log("gate flags:", JSON.stringify(flags));
  console.log("cognitiveDemand:", JSON.stringify(demand));
  console.log(`key found without recording: ${blind}/${scored}`);
  console.log("ids file: scripts/jobs/.out/listening-expansion-ids.json");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/listening-expansion-ids.json", JSON.stringify(items.map((x) => ({ id: x.id, code: x.itemCode, cefr: x.cefrLevel })), null, 1));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
