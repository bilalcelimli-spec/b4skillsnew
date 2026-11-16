#!/usr/bin/env tsx
/**
 * Faz 1 — teen-appropriate Junior Suite (11-14) drafts for the cells whose
 * only other source is the adult general core (phase1-gap-triage.ts,
 * 2026-11-14): B2 reading / listening / speaking / vocabulary and A1
 * listening. Gated generator, stored as DRAFT with the "junior" tag and
 * content.productLine, TEEN age suitability. Listening drafts carry a
 * ttsScript; audio is a separate step.
 *
 *   npx tsx scripts/jobs/generate-phase1-junior-teen.ts --dry-run   # 1 per cell, no DB writes
 *   npx tsx scripts/jobs/generate-phase1-junior-teen.ts             # full run (DRAFT)
 */

import "dotenv/config"; // first: batch-generator reads GEMINI_API_KEY at import time
import { mkdirSync, writeFileSync } from "node:fs";
import { generateDrafts, runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";

const DRY = process.argv.includes("--dry-run");
const OUT = "scripts/jobs/.out/phase1";
const TEEN: Partial<BlueprintCell> = {
  productLine: "junior", ageSuitability: "TEEN", ageRange: [11, 14], culturalLoad: "LOW", englishVariant: "INTERNATIONAL",
};
const c = (cell: Partial<BlueprintCell>, count: number) => ({ cell: { ...TEEN, ...cell } as BlueprintCell, count });

const CELLS = [
  // B2 reading — one heading-matching cell (more robust to answering without the text) and two MCQ cells
  c({ cefr: "B2", skill: "READING", subskill: "PARAGRAPH_RELATIONSHIPS", genre: "article", topic: "science", itemType: "DRAG_DROP", format: "HEADINGS" }, 3),
  c({ cefr: "B2", skill: "READING", subskill: "INFERENCE", genre: "blog", topic: "technology" }, 4),
  c({ cefr: "B2", skill: "READING", subskill: "WRITER_ATTITUDE", genre: "review", topic: "leisure" }, 4),
  // B2 listening
  c({ cefr: "B2", skill: "LISTENING", subskill: "GIST", genre: "conversation", topic: "education" }, 3),
  c({ cefr: "B2", skill: "LISTENING", subskill: "SPEAKER_ATTITUDE", genre: "interview", topic: "media" }, 3),
  c({ cefr: "B2", skill: "LISTENING", subskill: "FACTUAL_DETAIL", genre: "short_talk", topic: "environment" }, 3),
  // B2 speaking
  c({ cefr: "B2", skill: "SPEAKING", subskill: "DISCOURSE_MANAGEMENT", genre: "opinion", topic: "education" }, 3),
  c({ cefr: "B2", skill: "SPEAKING", subskill: "INTERACTION", genre: "problem_solving", topic: "environment" }, 3),
  // B2 vocabulary
  c({ cefr: "B2", skill: "VOCABULARY", subskill: "COLLOCATION", genre: "gap_fill", topic: "education" }, 4),
  // Dry run returned "Choose the correct form of 'develop'" with no sentence; the construct names the gapped sentence.
  c({ cefr: "B2", skill: "VOCABULARY", subskill: "WORD_FORMATION", genre: "word_formation", topic: "technology",
    construct: "Word formation: a complete sentence with one gap ______ and the base word in brackets, e.g. 'The ______ (DEVELOP) of the app took two years.'" }, 4),
  // A1 listening
  c({ cefr: "A1", skill: "LISTENING", subskill: "FACTUAL_DETAIL", genre: "conversation", topic: "education" }, 4),
  c({ cefr: "A1", skill: "LISTENING", subskill: "SPECIFIC_INFORMATION", genre: "announcement", topic: "leisure" }, 4),
];

const label = (x: BlueprintCell) => `${x.cefr}/${x.skill}/${x.subskill}/${x.genre}${x.format ? "/" + x.format : ""}`;

async function dryRun(): Promise<void> {
  const out: unknown[] = [];
  for (const { cell } of CELLS) {
    const r = await generateDrafts(cell, 1);
    console.log(`${label(cell)}: ${r.items.length} drafts${r.skippedReasons.length ? " | " + r.skippedReasons.join(" ; ").slice(0, 240) : ""}`);
    out.push({ cell: label(cell), items: r.items, skipped: r.skippedReasons });
  }
  writeFileSync(`${OUT}/junior-teen-dryrun.json`, JSON.stringify(out, null, 1));
}

async function run(): Promise<void> {
  const results = [];
  for (const { cell, count } of CELLS) {
    const r = await runBatchGeneration({ cell, count, triggeredBy: "claude-code:phase1-junior-teen", notes: "Faz 1 Junior teen drafts (2026-11-14)" });
    console.log(`${label(cell)}: stored ${r.generated}/${r.requested}${r.skippedReasons.length ? " | skipped: " + r.skippedReasons.slice(0, 2).join(" ; ").slice(0, 240) : ""}`);
    results.push({ cell: label(cell), ...r });
  }
  const ids = results.flatMap((r) => r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true } });
  console.log(`STORED ${items.length} (status: ${[...new Set(items.map((x) => x.status))].join(",")})`);
  writeFileSync(`${OUT}/junior-teen-ids.json`, JSON.stringify(items, null, 1));
  writeFileSync(`${OUT}/junior-teen-skips.json`, JSON.stringify(results.map((r) => ({ cell: r.cell, skipped: r.skippedReasons })), null, 1));
}

mkdirSync(OUT, { recursive: true });
(DRY ? dryRun() : run())
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
