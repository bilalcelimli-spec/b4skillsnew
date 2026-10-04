#!/usr/bin/env tsx

/**
 * In-memory (no DB writes): generates matching items, then measures how often
 * a solver reproduces the key WITHOUT and WITH the source.
 *
 *   npx tsx scripts/jobs/eval-matching.ts [--n 6]
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { generateDrafts } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { assembleMatching, chanceOfExactMatch, type RawMatching } from "../../src/lib/content-factory/matching-items.js";
import { solveMatching, scoreMapping } from "../../src/lib/ai/validation/gates/matching-dependency.js";

const nIdx = process.argv.indexOf("--n");
const N = nIdx >= 0 ? Number(process.argv[nIdx + 1]) : 6;

const CELLS: BlueprintCell[] = [
  { cefr: "B2", skill: "LISTENING", subskill: "DISTINGUISHING_VIEWPOINTS", genre: "discussion", topic: "work", itemType: "DRAG_DROP" },
  { cefr: "C1", skill: "LISTENING", subskill: "DISTINGUISHING_VIEWPOINTS", genre: "discussion", topic: "environment", itemType: "DRAG_DROP" },
  { cefr: "B2", skill: "READING", subskill: "PARAGRAPH_RELATIONSHIPS", genre: "article", topic: "technology", itemType: "DRAG_DROP" },
  { cefr: "C1", skill: "READING", subskill: "COMPETING_VIEWPOINTS", genre: "opinion_column", topic: "society", itemType: "DRAG_DROP" },
];

async function runCell(cell: BlueprintCell) {
  const { items, skippedReasons } = await generateDrafts(cell, N);
  const rows: any[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const raw: any = items[idx];
      const c: any = raw.content;
      if (!Array.isArray(c.pairs)) continue;
      const m = assembleMatching(c as RawMatching, `${cell.skill}${cell.cefr}${idx}`);
      const kind = cell.skill === "LISTENING" ? "recording transcript" : "passage";
      const source = String(c.passage ?? c.ttsScript ?? "");
      const [blind, guided] = await Promise.all([
        solveMatching(m.prompt, m.dropZones, m.draggableItems, null, kind),
        solveMatching(m.prompt, m.dropZones, m.draggableItems, source.slice(0, 6000), kind),
      ]);
      if (!blind || !guided) continue;
      const b = scoreMapping(blind, m.correctMapping, m.dropZones.length);
      const g = scoreMapping(guided, m.correctMapping, m.dropZones.length);
      rows.push({
        cell: `${cell.skill}/${cell.cefr}`, zones: m.dropZones.length, items: m.draggableItems.length,
        chance: chanceOfExactMatch(m.dropZones.length, m.draggableItems.length),
        blindExact: b.exact, blindFraction: b.fraction, guidedExact: g.exact, guidedFraction: g.fraction,
        demand: raw.cognitiveDemand,
      });
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  console.log(`${cell.skill}/${cell.cefr}: ${rows.length}/${N} usable${skippedReasons.length ? " | skipped: " + skippedReasons.slice(0, 2).join(" ; ").slice(0, 200) : ""}`);
  return rows;
}

async function main() {
  const all = (await Promise.all(CELLS.map(runCell))).flat();
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/eval-matching.json", JSON.stringify(all, null, 2));
  const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "n/a");
  console.log("\n=== RESULT ===");
  console.log("blind exact match:   ", pct(all.filter((r) => r.blindExact).length, all.length), "  (MCQ baseline: key found blind ≈ 91–100%)");
  console.log("blind partial (mean):", all.length ? (all.reduce((s, r) => s + r.blindFraction, 0) / all.length).toFixed(2) : "n/a", " (random ≈ 1/items)");
  console.log("guided exact match:  ", pct(all.filter((r) => r.guidedExact).length, all.length), " (key confirmed with source)");
  console.log("mean chance of exact guess:", all.length ? (all.reduce((s, r) => s + r.chance, 0) / all.length).toFixed(3) : "n/a");
  for (const c of CELLS) {
    const rs = all.filter((r) => r.cell === `${c.skill}/${c.cefr}`);
    console.log(`  ${c.skill}/${c.cefr}`.padEnd(18), "blind exact", pct(rs.filter((r) => r.blindExact).length, rs.length), "| blind frac", rs.length ? (rs.reduce((s, r) => s + r.blindFraction, 0) / rs.length).toFixed(2) : "n/a", "| guided exact", pct(rs.filter((r) => r.guidedExact).length, rs.length));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
