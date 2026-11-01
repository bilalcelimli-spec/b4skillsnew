#!/usr/bin/env tsx

/**
 * Splits the 5-blank Primary listening worksheets (Cambridge Movers/Flyers
 * Part 1 style) into single-blank items. As one item they were scored
 * right/wrong on all five blanks, so one slip failed the item and the
 * dichotomous seed parameters overstated their information (bank review
 * 2026-11-01). One blank per item keeps the engine dichotomous; the passage
 * cap (≤ 2 per recording) and the task-family cap (≤ 2 per template) bound the
 * local dependence between items cut from one recording.
 *
 *   npx tsx scripts/jobs/split-listening-worksheets.ts            # list every new item (writes nothing)
 *   npx tsx scripts/jobs/split-listening-worksheets.ts --apply    # write them as DRAFT
 *
 * New items share the source's recording, script, tags and task id, are DRAFT
 * (pipelineStage EDITING) and point back to the source in metadata.splitFrom.
 * The sources stay ACTIVE until the new items are reviewed and promoted.
 * Running --apply twice writes nothing the second time.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { nextItemCode } from "../../src/lib/content-factory/item-codes.js";

const APPLY = process.argv.includes("--apply");
const ACTOR = "claude-code:split-listening-worksheets";
const GAP = /_{3,}/g;

interface Piece { gapLine: string; prompt: string; key: string }

/**
 * Manual read of the 60 split items (2026-11-01). The Movers sheets ask the
 * same thing twice ("Drinking: ___ juice" → orange, then "Drink type: ___" →
 * orange); as separate items that is one question asked twice, so the second
 * is dropped. Blank numbers are 1-based.
 */
const DROP: Record<string, number[]> = {
  "LIS-A1-0063-MVX1N79H": [5], // Drink type = Drinking (orange)
  "LIS-A1-0069": [5],          // Drink type = Drinking (chocolate)
  "LIS-A1-0070": [5],          // Type of food = Eating (burger)
  "LIS-A1-0072": [5],          // Type of fruit = Eating (banana)
};
/** Accepted spellings. A pipe in a single-gap key lists alternatives (objective-response.ts). */
const ALTERNATIVES: Record<string, string> = {
  "t-shirt": "t-shirt|tshirt|t shirt", blonde: "blonde|blond", seven: "seven|7",
  racket: "racket|racquet", checked: "checked|chequered|checkered",
};
/** The recording says "long, curly hair" for Mum: both describe the hair type. */
const ITEM_KEY_OVERRIDE: Record<string, Record<number, string>> = { "LIS-A1-0071": { 1: "long|curly" } };

/** Header = the scaffold's text before the first gap line; gap lines lose their "1." numbering. */
export function splitScaffold(scaffold: string, correctAnswer: string): Piece[] {
  const lines = scaffold.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = lines.findIndex((l) => GAP.test(l));
  GAP.lastIndex = 0;
  const header = lines.slice(0, first).join(" ").trim();
  const gapLines = lines.slice(first).filter((l) => { const has = /_{3,}/.test(l); return has; });
  const keys = correctAnswer.split("|").map((k) => k.trim());
  if (gapLines.length !== keys.length) throw new Error(`${gapLines.length} gap lines but ${keys.length} keys`);
  if (gapLines.some((l) => (l.match(/_{3,}/g) ?? []).length !== 1)) throw new Error("a line has more than one gap");
  return gapLines.map((line, i) => {
    const gapLine = line.replace(/^\d+[.)]\s*/, "").replace(/_{3,}/, "___");
    const prompt = header ? `${header}\n${gapLine}` : gapLine;
    return { gapLine, prompt, key: keys[i] };
  });
}

async function main() {
  const sources = (await prisma.item.findMany({
    where: { status: "ACTIVE", skill: "LISTENING", type: "FILL_IN_BLANKS" },
    select: { id: true, itemCode: true, cefrLevel: true, difficulty: true, tags: true, subskill: true, genre: true, topic: true, ageSuitability: true, content: true },
    orderBy: { itemCode: "asc" },
  })).filter((s) => ((s.content as any)?.options ?? []).length === 0 && String((s.content as any)?.prompt ?? "").match(/_{3,}/g)?.length! > 3);
  console.log(`${sources.length} multi-blank listening worksheets${APPLY ? "" : " (dry run)"}`);

  const done = await prisma.item.findMany({ where: { metadata: { path: ["splitFrom", "by"], equals: ACTOR } }, select: { metadata: true } });
  const alreadySplit = new Set(done.map((d) => (d.metadata as any).splitFrom.id));

  const written: { source: string; code: string | null; id: string }[] = [];
  for (const src of sources) {
    const c = src.content as Record<string, any>;
    const pieces = splitScaffold(String(c.prompt), String(c.correctAnswer))
      .map((p, i) => ({ ...p, blank: i + 1, key: ITEM_KEY_OVERRIDE[src.itemCode!]?.[i + 1] ?? ALTERNATIVES[p.key.toLowerCase()] ?? p.key }))
      .filter((p) => !(DROP[src.itemCode!] ?? []).includes(p.blank));
    console.log(`\n${src.itemCode} (${src.cefrLevel}, b=${src.difficulty}) → ${pieces.length} items${alreadySplit.has(src.id) ? "  [already split — skipped]" : ""}`);
    for (const p of pieces) console.log(`   ${p.prompt.replace(/\n/g, " | ").padEnd(70)} key: ${p.key}`);
    if (!APPLY || alreadySplit.has(src.id)) continue;

    for (const p of pieces) {
      const { prompt: _p, correctAnswer: _k, scaffold: _s, ...rest } = c;
      const item = await prisma.item.create({ data: {
        itemCode: await nextItemCode("LISTENING", src.cefrLevel),
        skill: "LISTENING", type: "FILL_IN_BLANKS", cefrLevel: src.cefrLevel,
        status: "DRAFT", pipelineStage: "EDITING",
        difficulty: src.difficulty, discrimination: 1.0, guessing: 0,
        subskill: src.subskill, genre: src.genre, topic: src.topic, ageSuitability: src.ageSuitability,
        tags: src.tags,
        content: { ...rest, prompt: p.prompt, correctAnswer: p.key } as any,
        metadata: { triggeredBy: ACTOR, splitFrom: { by: ACTOR, id: src.id, code: src.itemCode, blank: p.blank, of: 5, at: new Date().toISOString(),
          note: "seed b copied from the 5-blank source; one blank is easier than five — recalibrate from data" } } as any,
      }, select: { id: true, itemCode: true } });
      written.push({ source: src.itemCode!, code: item.itemCode, id: item.id });
    }
  }

  if (APPLY && written.length) {
    mkdirSync("scripts/jobs/.out", { recursive: true });
    writeFileSync("scripts/jobs/.out/split-worksheet-ids.json", JSON.stringify(written, null, 1));
  }
  console.log(APPLY ? `\nwrote ${written.length} DRAFT items` : "\nno changes written");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
