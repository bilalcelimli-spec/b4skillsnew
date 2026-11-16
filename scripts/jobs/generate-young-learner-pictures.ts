#!/usr/bin/env tsx
/**
 * Young-learner picture tasks (plan: docs/quality/young-learner-expansion-plan-2026-11.md).
 * Stores DRAFT / AI_DRAFT items with Gemini illustrations that passed the vision check.
 *
 *   npx tsx scripts/jobs/generate-young-learner-pictures.ts                    # pilot cells (3 each)
 *   npx tsx scripts/jobs/generate-young-learner-pictures.ts --only L-PIC3 --per-cell 2 --tag try
 *   npx tsx scripts/jobs/generate-young-learner-pictures.ts --set wave1a --tag wave1a
 *   → scripts/jobs/.out/young-learners/<tag>-ids.json, <tag>-results.json
 *
 * Listening audio afterwards:
 *   npx tsx scripts/jobs/generate-primary-listening-audio.ts --trigger claude-code:yl-pictures --apply
 */

import "dotenv/config"; // first: the generators read GEMINI_API_KEY at import time
import { mkdirSync, writeFileSync } from "node:fs";
import { runPictureBatch, type PictureCell } from "../../src/lib/content-factory/picture-items.js";
import { prisma } from "../../src/lib/prisma.js";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const OUT = "scripts/jobs/.out/young-learners";
const TAG = arg("--tag") ?? "pilot";
const PER_CELL = arg("--per-cell") ? Number(arg("--per-cell")) : undefined;
const ONLY = arg("--only") ? new RegExp(arg("--only")!) : undefined;
const TRIGGER = "claude-code:yl-pictures";

const c = (task: PictureCell["task"], productLine: PictureCell["productLine"], cefr: PictureCell["cefr"], topic: string, count = 3): PictureCell =>
  ({ task, productLine, cefr, topic, count });

export const PILOT: PictureCell[] = [
  c("L-PIC3", "primary", "PRE_A1", "toys"),
  c("L-PIC3", "primary", "A1", "food"),
  c("L-PIC3", "junior", "A2", "free time"),
  c("R-PICSENT", "primary", "PRE_A1", "animals"),
  c("R-PICSENT", "primary", "A1", "the home"),
  c("V-PICWORD", "primary", "PRE_A1", "food"),
  c("V-PICWORD", "primary", "A1", "clothes"),
  c("S-PIC", "primary", "A1", "the park"),
  c("S-PIC", "junior", "A2", "school"),
  c("W-PICSTORY", "primary", "A2", "holidays"),
  c("W-PICSTORY", "junior", "B1", "sport"),
];

/** Wave 1, batch A (2026-11-16): the four task types ready after the pilot, plus an R-PICSENT re-pilot. ~151 drafts. */
export const WAVE1A: PictureCell[] = [
  // Primary listening today (live stimuli, min 20): Pre-A1 3, A1 8, A2 6
  c("L-PIC3", "primary", "PRE_A1", "animals", 6), c("L-PIC3", "primary", "PRE_A1", "family", 6), c("L-PIC3", "primary", "PRE_A1", "colours and clothes", 6),
  c("L-PIC3", "primary", "A1", "school", 6), c("L-PIC3", "primary", "A1", "weather", 6), c("L-PIC3", "primary", "A1", "sports and games", 6),
  c("L-PIC3", "primary", "A2", "holidays", 6), c("L-PIC3", "primary", "A2", "places in town", 6),
  // Primary vocabulary: Pre-A1 9 of 40, A1 27
  c("V-PICWORD", "primary", "PRE_A1", "animals", 6), c("V-PICWORD", "primary", "PRE_A1", "the body", 6), c("V-PICWORD", "primary", "PRE_A1", "toys", 6),
  c("V-PICWORD", "primary", "A1", "food", 6), c("V-PICWORD", "primary", "A1", "transport", 6), c("V-PICWORD", "primary", "A1", "the home", 6),
  // Primary speaking / writing
  c("S-PIC", "primary", "PRE_A1", "the beach", 5), c("S-PIC", "primary", "A1", "a birthday party", 5), c("S-PIC", "primary", "A2", "the zoo", 5),
  c("W-PICSTORY", "primary", "A1", "pets", 5), c("W-PICSTORY", "primary", "A2", "a school trip", 5),
  // Junior (A1 listening has 0 stimuli)
  c("L-PIC3", "junior", "A1", "sport", 6), c("L-PIC3", "junior", "A2", "shopping", 6), c("L-PIC3", "junior", "B1", "travel", 6),
  c("S-PIC", "junior", "A2", "a sports day", 4), c("S-PIC", "junior", "B1", "a science fair", 4),
  c("W-PICSTORY", "junior", "A2", "a lost phone", 4), c("W-PICSTORY", "junior", "B1", "a camping trip", 4),
  // R-PICSENT re-pilot after the plausibility rule
  c("R-PICSENT", "primary", "PRE_A1", "the garden", 4), c("R-PICSENT", "primary", "A1", "the classroom", 4),
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const set = arg("--set") === "wave1a" ? WAVE1A : PILOT;
  const cells = set.filter((x) => !ONLY || ONLY.test(`${x.task}/${x.productLine}/${x.cefr}/${x.topic}`))
    .map((x) => ({ ...x, count: PER_CELL ?? x.count }));
  const results = [];
  for (const cell of cells) {
    const t = Date.now();
    const r = await runPictureBatch(cell, { triggeredBy: TRIGGER, notes: `Young learners ${TAG} (2026-11-16)` });
    console.log(`${r.cell.padEnd(40)} stored ${r.stored}/${r.requested}  images ${r.images.generated} (rejected ${r.images.rejected})  ${Math.round((Date.now() - t) / 1000)}s`);
    for (const s of r.skipped) console.log(`    - ${s.slice(0, 200)}`);
    results.push(r);
  }
  const ids = results.flatMap((r) => r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true } });
  writeFileSync(`${OUT}/${TAG}-ids.json`, JSON.stringify(items, null, 1));
  writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 1));
  const img = results.reduce((s, r) => ({ g: s.g + r.images.generated, x: s.x + r.images.rejected }), { g: 0, x: 0 });
  console.log(`STORED ${items.length}/${cells.reduce((s, x) => s + x.count, 0)}  images generated ${img.g}, rejected ${img.x}`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
