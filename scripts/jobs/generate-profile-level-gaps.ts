#!/usr/bin/env tsx
/**
 * Drafts for profile × skill × CEFR cells with no eligible ACTIVE item and no
 * pending draft (audit:adaptive `missingLevels` + pending-draft check, 2026-11-16):
 *
 *   Academia          LISTENING B1
 *   Corporate         READING A2, SPEAKING A2
 *   Language Schools  READING A1, READING C1
 *
 * Primary A2 writing/speaking, Junior A1/B2 and Corporate A2 writing already
 * have drafts awaiting expert review, so they are not regenerated here.
 *
 * Gated generator only; items are stored as DRAFT (never served) with the
 * product tag + content.productLine. Listening drafts carry a ttsScript; audio
 * is a separate step. C1 reading uses DRAG_DROP (HEADINGS / MATCHING), which is
 * more robust to answering without the text than MCQ.
 *
 *   npx tsx scripts/jobs/generate-profile-level-gaps.ts --dry-run   # 1 per cell, no DB writes
 *   npx tsx scripts/jobs/generate-profile-level-gaps.ts             # full run (DRAFT)
 */

import "dotenv/config"; // first: batch-generator reads GEMINI_API_KEY at import time
import { mkdirSync, writeFileSync } from "node:fs";
import { generateDrafts, runBatchGeneration } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";

const DRY = process.argv.includes("--dry-run");
const TRIGGER = "claude-code:profile-level-gaps";
const OUT = "scripts/jobs/.out/profile-level-gaps";

const BASE: Partial<BlueprintCell> = { culturalLoad: "LOW", englishVariant: "INTERNATIONAL" };
const ACADEMIA: Partial<BlueprintCell> = { ...BASE, productLine: "academia", ageSuitability: "ADULT", ageRange: [16, 60], register: "academic" };
const CORPORATE: Partial<BlueprintCell> = { ...BASE, productLine: "corporate", ageSuitability: "ADULT", register: "neutral" };
// Language Schools serves ages 12+, so content must suit teenagers as well as adults.
const SCHOOLS: Partial<BlueprintCell> = { ...BASE, productLine: "language-schools", ageSuitability: "UNIVERSAL", ageRange: [12, 60] };

const c = (base: Partial<BlueprintCell>, cell: Partial<BlueprintCell>, count: number) =>
  ({ cell: { ...base, ...cell } as BlueprintCell, count });

const CELLS = [
  // Academia — LISTENING B1
  c(ACADEMIA, { cefr: "B1", skill: "LISTENING", subskill: "GIST", genre: "lecture", topic: "science" }, 4),
  c(ACADEMIA, { cefr: "B1", skill: "LISTENING", subskill: "FACTUAL_DETAIL", genre: "short_talk", topic: "education",
    construct: "Understanding factual details in a short talk given to students, e.g. a tutor explaining an assignment, library service or study schedule" }, 4),
  // Corporate — READING A2
  c(CORPORATE, { cefr: "A2", skill: "READING", subskill: "EXPLICIT_DETAIL", genre: "notice", topic: "work",
    construct: "Finding explicit information in a short workplace notice (office hours, meeting room changes, safety, deliveries)" }, 4),
  c(CORPORATE, { cefr: "A2", skill: "READING", subskill: "SPECIFIC_INFORMATION", genre: "email", topic: "work",
    construct: "Finding specific information (time, place, person, quantity) in a short work email between colleagues or with a customer" }, 4),
  // Corporate — SPEAKING A2
  c(CORPORATE, { cefr: "A2", skill: "SPEAKING", subskill: "TASK_FULFILMENT", genre: "situational", topic: "work",
    construct: "Handling a simple everyday work situation: arranging a meeting time, asking a colleague for help, explaining a small delay" }, 3),
  c(CORPORATE, { cefr: "A2", skill: "SPEAKING", subskill: "COHERENCE", genre: "personal_questions", topic: "work",
    construct: "Describing one's job, workplace and daily work routine in simple connected sentences" }, 3),
  // Language Schools — READING A1
  c(SCHOOLS, { cefr: "A1", skill: "READING", subskill: "EXPLICIT_DETAIL", genre: "notice", topic: "education" }, 4),
  c(SCHOOLS, { cefr: "A1", skill: "READING", subskill: "SPECIFIC_INFORMATION", genre: "email", topic: "leisure" }, 4),
  // Language Schools — READING C1 (matching-first)
  c(SCHOOLS, { cefr: "C1", skill: "READING", subskill: "PARAGRAPH_RELATIONSHIPS", genre: "article", topic: "society", itemType: "DRAG_DROP", format: "HEADINGS" }, 3),
  c(SCHOOLS, { cefr: "C1", skill: "READING", subskill: "INFERENCE", genre: "opinion_column", topic: "culture", itemType: "DRAG_DROP", format: "MATCHING" }, 3),
];

const label = (x: BlueprintCell) => `${x.productLine}/${x.cefr}/${x.skill}/${x.subskill}/${x.genre}${x.format ? "/" + x.format : ""}`;

async function dryRun(): Promise<void> {
  const out: unknown[] = [];
  for (const { cell } of CELLS) {
    const r = await generateDrafts(cell, 1);
    console.log(`${label(cell)}: ${r.items.length} drafts${r.skippedReasons.length ? " | " + r.skippedReasons.join(" ; ").slice(0, 300) : ""}`);
    out.push({ cell: label(cell), items: r.items, skipped: r.skippedReasons });
  }
  writeFileSync(`${OUT}/dryrun.json`, JSON.stringify(out, null, 1));
  console.log(`written: ${OUT}/dryrun.json (no DB writes)`);
}

async function run(): Promise<void> {
  const results = [];
  for (const { cell, count } of CELLS) {
    const r = await runBatchGeneration({ cell, count, triggeredBy: TRIGGER, notes: "Profile CEFR-level gap (2026-11-16)" });
    console.log(`${label(cell)}: stored ${r.generated}/${r.requested}${r.skippedReasons.length ? " | skipped: " + r.skippedReasons.slice(0, 3).join(" ; ").slice(0, 300) : ""}`);
    results.push({ cell: label(cell), ...r });
  }
  const ids = results.flatMap((r) => r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, tags: true } });
  console.log(`STORED ${items.length} (status: ${[...new Set(items.map((x) => x.status))].join(",") || "—"})`);
  writeFileSync(`${OUT}/ids.json`, JSON.stringify(items, null, 1));
  writeFileSync(`${OUT}/skips.json`, JSON.stringify(results.map((r) => ({ cell: r.cell, skipped: r.skippedReasons })), null, 1));
}

mkdirSync(OUT, { recursive: true });
(DRY ? dryRun() : run())
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
