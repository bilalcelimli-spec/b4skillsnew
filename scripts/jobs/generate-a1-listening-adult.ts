#!/usr/bin/env tsx

/**
 * Adult A1 listening drafts for the general pool. Excluding Primary items
 * from adult profiles (027815c) left General English LISTENING/A1 at 5 items
 * (coverage target 6). Items go through the gated generator as DRAFT and are
 * never served until reviewed and promoted.
 *
 *   npx tsx scripts/jobs/generate-a1-listening-adult.ts [--per-cell 4]
 *   npx tsx scripts/jobs/generate-a1-listening-adult.ts --review    # apply the manual read below
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";

const i = process.argv.indexOf("--per-cell");
const PER_CELL = i >= 0 ? Number(process.argv[i + 1]) : 4;
const TRIGGER = "claude-code:a1-listening-adult";

const BASE: Partial<BlueprintCell> = { cefr: "A1", skill: "LISTENING", ageSuitability: "ADULT", culturalLoad: "LOW", englishVariant: "INTERNATIONAL" };
const CELLS: BlueprintCell[] = [
  { ...BASE, subskill: "FACTUAL_DETAIL", genre: "service_interaction", topic: "consumer" },
  { ...BASE, subskill: "SPECIFIC_INFORMATION", genre: "announcement", topic: "transport" },
  { ...BASE, subskill: "FACTUAL_DETAIL", genre: "conversation", topic: "work" },
  { ...BASE, subskill: "SPECIFIC_INFORMATION", genre: "conversation", topic: "leisure" },
] as BlueprintCell[];

// ── --review: manual read of the 16 drafts (2026-11-01) ──
const TWO_KEYS = "more than one option is true according to the script";
const REJECTED: Record<string, string> = {
  "LIS-A1-0084": `${TWO_KEYS} ('On Sunday afternoon' / 'At two o'clock'); options mix day, time and person`,
  "LIS-A1-0085": `${TWO_KEYS} ('Play basketball' / 'Go to the gym')`,
  "LIS-A1-0086": `${TWO_KEYS} ('Vegetable pizza' / 'Food from a new place')`,
  "LIS-A1-0080": `${TWO_KEYS} (he also sorts mail and answers calls; 'main' carries the item); key found without the recording`,
  "LIS-A1-0076": "language above A1 (regarding, shuttle, depart, dorms)",
  "LIS-A1-0077": "language above A1 (due to unexpected road construction, apologise for any inconvenience); 'The time was adjusted' is also true",
  "LIS-A1-0079": "near-duplicate of LIS-A1-0078 (bus moved to another stop); language above A1",
  "LIS-A1-0081": "off-category option ('He helps children with activities' among places)",
};
/** Stage directions are read aloud by TTS; drop them from the script. */
const STAGE_LINE = /^\s*\*?\(\s*sound of[^)]*\)\*?\s*$/im;

async function review() {
  const items = await prisma.item.findMany({ where: { status: "DRAFT", metadata: { path: ["triggeredBy"], equals: TRIGGER } }, select: { id: true, itemCode: true, content: true, metadata: true } });
  const at = new Date().toISOString();
  let retired = 0, cleaned = 0;
  for (const it of items) {
    const m: any = it.metadata ?? {};
    const c: any = it.content ?? {};
    const reason = REJECTED[it.itemCode ?? ""];
    if (reason) {
      await prisma.item.update({ where: { id: it.id }, data: { status: "RETIRED", pipelineStage: "RETIRED",
        metadata: { ...m, statusChange: { from: "DRAFT", fromStage: "AI_DRAFT", to: "RETIRED", at, by: `${TRIGGER}-review`, reason } } } });
      retired++;
    } else if (typeof c.ttsScript === "string" && STAGE_LINE.test(c.ttsScript)) {
      const ttsScript = c.ttsScript.split(/\r?\n/).filter((l: string) => !STAGE_LINE.test(l)).join("\n").trim();
      await prisma.item.update({ where: { id: it.id }, data: { content: { ...c, ttsScript }, version: { increment: 1 },
        metadata: { ...m, editorialRevision: { at, by: `${TRIGGER}-review`, reason: "stage direction removed from ttsScript (TTS reads it aloud)", previous: { ttsScript: c.ttsScript } } } } });
      cleaned++;
    }
  }
  console.log(`retired ${retired}, cleaned ${cleaned}; ${items.length - retired} drafts remain`);
}

async function main() {
  if (process.argv.includes("--review")) return review();
  const ids: string[] = [];
  // Item codes are numbered per skill+CEFR, so all cells run in sequence.
  for (const cell of CELLS) {
    const r = await runBatchGeneration({ cell, count: PER_CELL, triggeredBy: TRIGGER, notes: "General English LISTENING/A1 coverage gap, 2026-11-01" });
    ids.push(...r.storedIds);
    console.log(`${cell.subskill}/${cell.genre}/${cell.topic}: stored ${r.generated}/${r.requested}${r.skippedReasons.length ? " | " + r.skippedReasons.slice(0, 2).join(" ; ").slice(0, 200) : ""}`);
  }
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true } });
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/a1-listening-adult-ids.json", JSON.stringify(items.map((x) => ({ id: x.id, code: x.itemCode })), null, 1));
  console.log(`stored ${items.length} DRAFT items → scripts/jobs/.out/a1-listening-adult-ids.json`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
