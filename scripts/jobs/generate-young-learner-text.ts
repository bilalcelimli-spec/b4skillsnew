#!/usr/bin/env tsx
/**
 * Young learners, Wave 1 batch B (plan: docs/quality/young-learner-expansion-plan-2026-11.md §10):
 * text-based tasks through the gated generator (strict text dependency, age gate,
 * matching-first for B2+ inference/attitude/gist). Picture tasks cannot close
 * Junior's grammar/vocabulary/reading gaps or Primary's A2 vocabulary/grammar.
 * Stored as DRAFT / AI_DRAFT with the product tag.
 *
 *   npx tsx scripts/jobs/generate-young-learner-text.ts [--only "junior|GRAMMAR"] [--per-cell N] [--tag wave1b]
 *   → scripts/jobs/.out/young-learners/<tag>-ids.json, <tag>-results.json
 * Listening audio afterwards:
 *   npx tsx scripts/jobs/generate-primary-listening-audio.ts --trigger claude-code:yl-text --apply
 */

import "dotenv/config"; // first: batch-generator reads GEMINI_API_KEY at import time
import { mkdirSync, writeFileSync } from "node:fs";
import { runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import { resolveItemType, type BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { makeCellFilter } from "../../src/lib/content-factory/cli-filter.js";
import { prisma } from "../../src/lib/prisma.js";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const OUT = "scripts/jobs/.out/young-learners";
const TAG = arg("--tag") ?? "wave1b";
const PER_CELL = arg("--per-cell") ? Number(arg("--per-cell")) : undefined;
const ONLY = makeCellFilter(arg("--only"));
const TRIGGER = "claude-code:yl-text";

const JUNIOR: Partial<BlueprintCell> = { productLine: "junior", ageSuitability: "TEEN", ageRange: [11, 14], culturalLoad: "LOW", englishVariant: "INTERNATIONAL" };
const PRIMARY: Partial<BlueprintCell> = { productLine: "primary", ageSuitability: "YOUNG_LEARNER", ageRange: [7, 10], culturalLoad: "LOW", englishVariant: "INTERNATIONAL" };
const c = (base: Partial<BlueprintCell>, cell: Partial<BlueprintCell>, count: number) => ({ cell: { ...base, ...cell } as BlueprintCell, count });
const FIB = { itemType: "FILL_IN_BLANKS" } as const;

/** ~150 drafts. Junior with-queue today: grammar A1 18 / A2 27 / B1 30 / B2 1, vocabulary 26 / 32 / 28 / 10, reading 7 / 11 / 16 / 11 (min 50 / 50 / 25). */
export const WAVE1B = [
  // Junior grammar — FIB for the non-MC share (0% today), MCQ for dialogue/function
  c(JUNIOR, { cefr: "A1", skill: "GRAMMAR", subskill: "TENSE_ASPECT", genre: "gap_fill", topic: "school", ...FIB }, 8),
  c(JUNIOR, { cefr: "A1", skill: "GRAMMAR", subskill: "DETERMINERS", genre: "dialogue", topic: "free time" }, 6),
  c(JUNIOR, { cefr: "A2", skill: "GRAMMAR", subskill: "COMPARISON", genre: "gap_fill", topic: "friends", ...FIB }, 8),
  c(JUNIOR, { cefr: "B1", skill: "GRAMMAR", subskill: "MODALITY", genre: "gap_fill", topic: "technology", ...FIB }, 8),
  c(JUNIOR, { cefr: "B2", skill: "GRAMMAR", subskill: "CONDITIONALS", genre: "gap_fill", topic: "environment", ...FIB }, 8),
  c(JUNIOR, { cefr: "B2", skill: "GRAMMAR", subskill: "RELATIVE_CLAUSES", genre: "article", topic: "science" }, 8),
  // Junior vocabulary
  c(JUNIOR, { cefr: "A1", skill: "VOCABULARY", subskill: "RECEPTIVE_VOCABULARY", genre: "gap_fill", topic: "daily_life", ...FIB }, 8),
  c(JUNIOR, { cefr: "A2", skill: "VOCABULARY", subskill: "COLLOCATION", genre: "gap_fill", topic: "sport", ...FIB }, 8),
  c(JUNIOR, { cefr: "B1", skill: "VOCABULARY", subskill: "PHRASAL_VERBS", genre: "gap_fill", topic: "travel", ...FIB }, 8),
  c(JUNIOR, { cefr: "B2", skill: "VOCABULARY", subskill: "WORD_FORMATION", genre: "word_formation", topic: "media", ...FIB }, 8),
  c(JUNIOR, { cefr: "B2", skill: "VOCABULARY", subskill: "CONTEXTUAL_MEANING", genre: "article", topic: "education" }, 6),
  // Junior reading — notices/messages at A1-A2 (Key Part 1 style), MCQ detail at B1, matching at B2
  c(JUNIOR, { cefr: "A1", skill: "READING", subskill: "SPECIFIC_INFORMATION", genre: "notice", topic: "school" }, 8),
  c(JUNIOR, { cefr: "A2", skill: "READING", subskill: "SPECIFIC_INFORMATION", genre: "message", topic: "free time" }, 6),
  c(JUNIOR, { cefr: "B1", skill: "READING", subskill: "EXPLICIT_DETAIL", genre: "article", topic: "hobbies" }, 6),
  c(JUNIOR, { cefr: "B2", skill: "READING", subskill: "INFERENCE", genre: "blog", topic: "technology" }, 5),
  // Junior listening (A2 has 8 stimuli with the queue)
  c(JUNIOR, { cefr: "A2", skill: "LISTENING", subskill: "SPECIFIC_INFORMATION", genre: "conversation", topic: "shopping" }, 6),
  c(JUNIOR, { cefr: "B1", skill: "LISTENING", subskill: "FACTUAL_DETAIL", genre: "short_talk", topic: "nature" }, 6),
  // Primary: reading Pre-A1 (18/20), vocabulary A2 (28/40), grammar A2
  c(PRIMARY, { cefr: "PRE_A1", skill: "READING", subskill: "SPECIFIC_INFORMATION", genre: "message", topic: "family" }, 6),
  c(PRIMARY, { cefr: "A2", skill: "VOCABULARY", subskill: "RECEPTIVE_VOCABULARY", genre: "gap_fill", topic: "animals", ...FIB }, 8),
  c(PRIMARY, { cefr: "A2", skill: "VOCABULARY", subskill: "CONTEXTUAL_MEANING", genre: "narrative", topic: "holidays" }, 6),
  c(PRIMARY, { cefr: "A2", skill: "GRAMMAR", subskill: "TENSE_ASPECT", genre: "gap_fill", topic: "weekend", ...FIB }, 8),
];

const label = (x: BlueprintCell) => `${x.productLine}/${x.cefr}/${x.skill}/${x.subskill}/${x.genre}/${resolveItemType(x)}`;

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const cells = WAVE1B.filter((x) => !ONLY || ONLY(label(x.cell))).map((x) => ({ ...x, count: PER_CELL ?? x.count }));
  const results = [];
  for (const { cell, count } of cells) {
    const t = Date.now();
    const r = await runBatchGeneration({ cell, count, triggeredBy: TRIGGER, notes: `Young learners ${TAG} (2026-11-16)`, strictTextDependency: true });
    console.log(`${label(cell).padEnd(64)} stored ${r.generated}/${r.requested}  ${Math.round((Date.now() - t) / 1000)}s`);
    for (const s of r.skippedReasons) console.log(`    - ${s.slice(0, 200)}`);
    results.push({ cell: label(cell), requested: r.requested, stored: r.generated, storedIds: r.storedIds, skippedReasons: r.skippedReasons });
  }
  const ids = results.flatMap((r) => r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true } });
  writeFileSync(`${OUT}/${TAG}-ids.json`, JSON.stringify(items, null, 1));
  writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 1));
  console.log(`STORED ${items.length}/${cells.reduce((s, x) => s + x.count, 0)}`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
