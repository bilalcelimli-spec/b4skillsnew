#!/usr/bin/env tsx
/**
 * Faz 2 pilot: first gated batch of reading/listening stimuli after the
 * generator changes (age-context gate, age-specific settings, name/setting
 * rotation, strict text dependency). Its purpose is to measure gate pass
 * rates before scaling up, not to fill the bank.
 *
 * Priorities from the capacity report (General English, 2026-11-14):
 *   listening A1  5 recordings (min 17)   reading A1  7 texts (min 20)
 *   listening C1 15 recordings (min 17)   reading A2  5 texts (min 20)
 *   plus hard listening (few items with b ≥ 1.0) and a Junior TEEN re-run of
 *   the Faz 1 cells that drifted to adult settings.
 *
 * Stored as DRAFT / AI_DRAFT. Listening drafts carry a ttsScript; audio is a
 * separate step (generate-draft-listening-audio.ts).
 *
 *   npx tsx scripts/jobs/generate-phase2-pilot.ts
 *   npx tsx scripts/jobs/generate-phase2-pilot.ts --mcq-only --tag v3   # MCQ cells only, after a prompt change
 *   npx tsx scripts/jobs/generate-phase2-pilot.ts --mcq-only --per-cell 10 --tag v3n10   # larger sample per cell
 *   npx tsx scripts/jobs/generate-phase2-pilot.ts --matching-only --only "C1" --per-cell 5 --tag c1match
 * Cells without an explicit itemType follow resolveItemType (B2+ inference / attitude / gist → matching).
 *   → scripts/jobs/.out/phase2/pilot-ids.json, pilot-results.json
 */

import "dotenv/config"; // first: batch-generator reads GEMINI_API_KEY at import time
import { mkdirSync, writeFileSync } from "node:fs";
import { runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import { resolveItemType, type BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";

const OUT = "scripts/jobs/.out/phase2";
/** --mcq-only --tag v3: re-run only the MCQ cells (prompt revision) into pilot-<tag>-*.json. */
const MCQ_ONLY = process.argv.includes("--mcq-only");
const MATCHING_ONLY = process.argv.includes("--matching-only");
const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
/** --per-cell N overrides every cell's count; --only <regex> keeps cells whose group or label matches. */
const PER_CELL = arg("--per-cell") ? Number(arg("--per-cell")) : undefined;
const ONLY = arg("--only") ? new RegExp(arg("--only")!) : undefined;
const TAG = arg("--tag") ? `-${arg("--tag")}` : "";
const GENERAL: Partial<BlueprintCell> = { ageSuitability: "UNIVERSAL", culturalLoad: "LOW", englishVariant: "INTERNATIONAL" };
const TEEN: Partial<BlueprintCell> = { productLine: "junior", ageSuitability: "TEEN", ageRange: [11, 14], culturalLoad: "LOW", englishVariant: "INTERNATIONAL" };
const c = (group: string, base: Partial<BlueprintCell>, cell: Partial<BlueprintCell>, count: number) =>
  ({ group, cell: { ...base, ...cell } as BlueprintCell, count });

const CELLS = [
  // A1 listening (general pool: 5 recordings)
  c("A1 listening", GENERAL, { cefr: "A1", skill: "LISTENING", subskill: "FACTUAL_DETAIL", genre: "conversation", topic: "daily_life" }, 4),
  c("A1 listening", GENERAL, { cefr: "A1", skill: "LISTENING", subskill: "SPECIFIC_INFORMATION", genre: "announcement", topic: "travel" }, 4),
  // A1 / A2 reading (7 and 5 texts)
  c("A1-A2 reading", GENERAL, { cefr: "A1", skill: "READING", subskill: "SPECIFIC_INFORMATION", genre: "notice", topic: "daily_life" }, 4),
  c("A1-A2 reading", GENERAL, { cefr: "A2", skill: "READING", subskill: "FACTUAL_DETAIL", genre: "email", topic: "leisure" }, 4),
  c("A1-A2 reading", GENERAL, { cefr: "A2", skill: "READING", subskill: "MAIN_IDEA", genre: "article", topic: "food", itemType: "DRAG_DROP" }, 3),
  // Hard listening (C1: 15 recordings; b ≥ 1 scarce)
  c("C1 listening", GENERAL, { cefr: "C1", skill: "LISTENING", subskill: "SPEAKER_ATTITUDE", genre: "interview", topic: "media" }, 4),
  c("C1 listening", GENERAL, { cefr: "C1", skill: "LISTENING", subskill: "INFERENCE", genre: "discussion", topic: "science" }, 4),
  c("C1 listening", GENERAL, { cefr: "C1", skill: "LISTENING", subskill: "DISTINGUISHING_VIEWPOINTS", genre: "discussion", topic: "society", itemType: "DRAG_DROP" }, 3),
  // C1 attitude / inference as matching: v3 MCQ stayed blind-solvable here (3/4)
  c("C1 listening", GENERAL, { cefr: "C1", skill: "LISTENING", subskill: "SPEAKER_ATTITUDE", genre: "interview", topic: "media", itemType: "DRAG_DROP" }, 3),
  c("C1 listening", GENERAL, { cefr: "C1", skill: "LISTENING", subskill: "INFERENCE", genre: "discussion", topic: "science", itemType: "DRAG_DROP" }, 3),
  // Fill to target: the only General English cells still below target even if the whole queue were approved
  // (verify:capacity --with-queue, 2026-11-14: reading A1 23/30, listening A2 19/26). Run with --only Fill.
  c("Fill to target", GENERAL, { cefr: "A1", skill: "READING", subskill: "SPECIFIC_INFORMATION", genre: "message", topic: "shopping" }, 8),
  c("Fill to target", GENERAL, { cefr: "A1", skill: "READING", subskill: "EXPLICIT_DETAIL", genre: "notice", topic: "travel" }, 8),
  c("Fill to target", GENERAL, { cefr: "A2", skill: "LISTENING", subskill: "FACTUAL_DETAIL", genre: "conversation", topic: "shopping" }, 6),
  c("Fill to target", GENERAL, { cefr: "A2", skill: "LISTENING", subskill: "SPECIFIC_INFORMATION", genre: "announcement", topic: "leisure" }, 6),
  // Junior TEEN re-run of the Faz 1 cells that drifted (university / professor settings)
  c("Junior TEEN re-run", TEEN, { cefr: "B2", skill: "LISTENING", subskill: "GIST", genre: "conversation", topic: "education" }, 3),
  c("Junior TEEN re-run", TEEN, { cefr: "B2", skill: "LISTENING", subskill: "SPEAKER_ATTITUDE", genre: "interview", topic: "media" }, 3),
  c("Junior TEEN re-run", TEEN, { cefr: "B2", skill: "READING", subskill: "INFERENCE", genre: "blog", topic: "technology" }, 3),
];

const label = (x: BlueprintCell) => `${x.cefr}/${x.skill}/${x.subskill}/${x.genre}${resolveItemType(x) === "DRAG_DROP" ? "/matching" : ""}${x.ageSuitability === "TEEN" ? "/teen" : ""}`;

/** Skip reasons grouped by gate so the report can show where drafts are lost. */
function gateOf(reason: string): string {
  if (/AGE_CONTEXT/.test(reason)) return "age-context";
  if (/gate unavailable/.test(reason)) return "gate-unavailable";
  if (/text dependency \(strict\)/.test(reason)) return /KEY-UNCONFIRMED/.test(reason) ? "key-unconfirmed" : "solvable-blind";
  if (/content-integrity/.test(reason)) return "content-integrity";
  if (/Duplicate blocked/.test(reason)) return "duplicate";
  if (/cognitiveDemand/.test(reason)) return "cognitive-demand";
  if (/Position-revealing/.test(reason)) return "positional-headings";
  if (/JSON parse|AI call failed/.test(reason)) return "model-output";
  if (/COMMON_SENSE_KEY/.test(reason)) return "common-sense-key";
  if (/Embedding failed/.test(reason)) return "embedding (stored anyway)";
  return "structure";
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const results = [];
  const cells = CELLS
    .filter((x) => !MCQ_ONLY || resolveItemType(x.cell) !== "DRAG_DROP")
    .filter((x) => !MATCHING_ONLY || resolveItemType(x.cell) === "DRAG_DROP")
    .filter((x) => !ONLY || ONLY.test(x.group) || ONLY.test(label(x.cell)));
  for (const { group, cell, count: baseCount } of cells) {
    const count = PER_CELL ?? baseCount;
    const r = await runBatchGeneration({ cell, count, triggeredBy: "claude-code:phase2-pilot", notes: "Faz 2 pilot (2026-11-14)", strictTextDependency: true });
    const gates: Record<string, number> = {};
    for (const reason of r.skippedReasons) gates[gateOf(reason)] = (gates[gateOf(reason)] ?? 0) + 1;
    console.log(`${group.padEnd(20)} ${label(cell).padEnd(48)} stored ${r.generated}/${r.requested}  ${JSON.stringify(gates)}`);
    results.push({ group, cell: label(cell), requested: r.requested, stored: r.generated, storedIds: r.storedIds, gates, skippedReasons: r.skippedReasons });
  }
  const ids = results.flatMap((r) => r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true } });
  writeFileSync(`${OUT}/pilot${TAG}-ids.json`, JSON.stringify(items, null, 1));
  writeFileSync(`${OUT}/pilot${TAG}-results.json`, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 1));
  const requested = results.reduce((s, r) => s + r.requested, 0);
  console.log(`STORED ${items.length}/${requested} (status: ${[...new Set(items.map((x) => x.status))].join(",") || "-"})`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
