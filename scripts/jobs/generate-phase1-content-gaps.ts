#!/usr/bin/env tsx
/**
 * Faz 1 — drafts for the coverage cells that neither the general core nor the
 * existing queue can close (scripts/jobs/phase1-gap-triage.ts, 2026-11-14):
 * Junior Suite WRITING/B2 and Corporate WRITING/A2. Items go through the gated
 * generator as DRAFT (never served until reviewed and promoted) and carry the
 * product tag + content.productLine so the profile's pool picks them up.
 *
 *   npx tsx scripts/jobs/generate-phase1-content-gaps.ts --dry-run   # 2 per cell, no DB writes
 *   npx tsx scripts/jobs/generate-phase1-content-gaps.ts             # full run (DRAFT)
 */

import "dotenv/config"; // first: batch-generator reads GEMINI_API_KEY at import time
import { mkdirSync, writeFileSync } from "node:fs";
import { generateDrafts, runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";

const DRY = process.argv.includes("--dry-run");
const TRIGGER = "claude-code:phase1-content-gaps";
const OUT = "scripts/jobs/.out/phase1";

const JUNIOR: Partial<BlueprintCell> = {
  cefr: "B2", skill: "WRITING", productLine: "junior", ageSuitability: "TEEN", ageRange: [11, 14],
  culturalLoad: "LOW", englishVariant: "INTERNATIONAL",
};
const CORPORATE: Partial<BlueprintCell> = {
  cefr: "A2", skill: "WRITING", productLine: "corporate", ageSuitability: "ADULT",
  culturalLoad: "LOW", englishVariant: "INTERNATIONAL", register: "neutral",
};

// Task positions follow profile.writingTaskSpecs: short (40–60), paragraph (80–120), extended (200–270).
const CELLS: Array<{ cell: BlueprintCell; count: number; notes?: string }> = [
  { cell: { ...JUNIOR, subskill: "TASK_FULFILMENT", genre: "email", topic: "education", wordCountMin: 40, wordCountMax: 60 } as BlueprintCell, count: 4 },
  { cell: { ...JUNIOR, subskill: "ORGANISATION", genre: "review", topic: "leisure", wordCountMin: 80, wordCountMax: 120 } as BlueprintCell, count: 4 },
  { cell: { ...JUNIOR, subskill: "COHERENCE", genre: "essay", topic: "technology", wordCountMin: 200, wordCountMax: 270 } as BlueprintCell, count: 4 },
  { cell: { ...CORPORATE, subskill: "TASK_FULFILMENT", genre: "email", topic: "work", wordCountMin: 40, wordCountMax: 60 } as BlueprintCell, count: 5 },
  // Dry run 2026-11-14 drifted to private-life requests (enrolling on a course); keep it a workplace email.
  // `construct` is part of the generator prompt (`notes` is only stored in metadata).
  { cell: { ...CORPORATE, subskill: "REGISTER", genre: "email", topic: "work", wordCountMin: 80, wordCountMax: 120,
    construct: "Writing a neutral workplace email to a customer, supplier or manager about orders, deliveries, schedules or a small problem at work (not a private request)" } as BlueprintCell, count: 5 },
];

const label = (c: BlueprintCell) => `${c.productLine}/${c.cefr}/${c.skill}/${c.subskill}/${c.genre}`;

async function dryRun(): Promise<void> {
  const out: unknown[] = [];
  for (const { cell } of CELLS) {
    const r = await generateDrafts(cell, 2);
    console.log(`${label(cell)}: ${r.items.length} drafts${r.skippedReasons.length ? " | " + r.skippedReasons.join(" ; ").slice(0, 300) : ""}`);
    out.push({ cell: label(cell), items: r.items, skipped: r.skippedReasons });
  }
  writeFileSync(`${OUT}/content-gaps-dryrun.json`, JSON.stringify(out, null, 1));
  console.log(`written: ${OUT}/content-gaps-dryrun.json (no DB writes)`);
}

async function run(): Promise<void> {
  const results = [];
  for (const { cell, count, notes } of CELLS) {
    const r = await runBatchGeneration({ cell, count, triggeredBy: TRIGGER, notes: notes ?? "Faz 1 coverage gap (2026-11-14)" });
    console.log(`${label(cell)}: stored ${r.generated}/${r.requested}${r.skippedReasons.length ? " | skipped: " + r.skippedReasons.slice(0, 3).join(" ; ").slice(0, 300) : ""}`);
    results.push({ cell: label(cell), ...r });
  }
  const ids = results.flatMap((r) => r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, cefrLevel: true, status: true, tags: true } });
  console.log(`STORED ${items.length} (status: ${[...new Set(items.map((x) => x.status))].join(",")})`);
  writeFileSync(`${OUT}/content-gaps-ids.json`, JSON.stringify(items, null, 1));
  writeFileSync(`${OUT}/content-gaps-skips.json`, JSON.stringify(results.map((r) => ({ cell: r.cell, skipped: r.skippedReasons })), null, 1));
}

mkdirSync(OUT, { recursive: true });
(DRY ? dryRun() : run())
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
