#!/usr/bin/env tsx

/**
 * Paired experiment, no DB writes: generate drafts with the current prompt,
 * then harden distractors and compare blind-solvability before vs after on the
 * SAME items.
 *
 *   npx tsx scripts/jobs/eval-hardening.ts [--n 6]
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { generateDrafts } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { hardenDistractors } from "../../src/lib/content-factory/distractor-hardening.js";
import { runContentIntegrityGate } from "../../src/lib/ai/validation/gates/content-integrity.js";

const nIdx = process.argv.indexOf("--n");
const N = nIdx >= 0 ? Number(process.argv[nIdx + 1]) : 6;

const CELLS: BlueprintCell[] = [
  { cefr: "B2", skill: "READING", subskill: "INFERENCE", genre: "article", topic: "technology" },
  { cefr: "C1", skill: "READING", subskill: "STANCE", genre: "opinion_column", topic: "society" },
  { cefr: "B2", skill: "LISTENING", subskill: "IMPLICATION", genre: "discussion", topic: "education" },
  { cefr: "C1", skill: "LISTENING", subskill: "ARGUMENT_DEVELOPMENT", genre: "lecture", topic: "science" },
];

async function runCell(cell: BlueprintCell) {
  const { items } = await generateDrafts(cell, N);
  const rows: any[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const raw = items[idx];
      const content: any = { ...raw.content };
      content.options = (content.options ?? []).map((o: any) => ({ id: o.id ?? o.label, text: o.text ?? o.content, isCorrect: !!o.isCorrect }));
      const before = await runContentIntegrityGate({ type: "MULTIPLE_CHOICE" as any, skill: cell.skill as any, cefrLevel: cell.cefr as any, content });
      const h = await hardenDistractors({ skill: cell.skill, cefr: cell.cefr, content }, { seed: `${cell.skill}${cell.cefr}${idx}` });
      const after = await runContentIntegrityGate({ type: "MULTIPLE_CHOICE" as any, skill: cell.skill as any, cefrLevel: cell.cefr as any, content: h.content });
      rows.push({
        cell: `${cell.skill}/${cell.cefr}`, status: h.status, rounds: h.rounds,
        blindBefore: h.blindBefore, blindAfter: h.blindAfter, guidedOk: h.guidedOk,
        flagsBefore: before.issues.map((i) => i.code.replace("INTEG-", "")),
        flagsAfter: after.issues.map((i) => i.code.replace("INTEG-", "")),
        sample: h.status === "hardened" ? { q: h.content.question, options: h.content.options.map((o: any) => `${o.isCorrect ? "*" : " "} ${o.text}`) } : undefined,
      });
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  console.log(`${cell.skill}/${cell.cefr}: ${rows.length}/${N} drafts processed`);
  return rows;
}

async function main() {
  const all = (await Promise.all(CELLS.map(runCell))).flat();
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/eval-hardening.json", JSON.stringify(all, null, 2));

  const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "n/a");
  const scored = all.filter((r) => r.blindBefore !== null && r.blindAfter !== null);
  const st: Record<string, number> = {};
  for (const r of all) st[r.status] = (st[r.status] ?? 0) + 1;
  console.log("\n=== RESULT (paired, same drafts) ===");
  console.log("status:", JSON.stringify(st));
  console.log("key found WITHOUT text  before:", pct(scored.filter((r) => r.blindBefore).length, scored.length), " after:", pct(scored.filter((r) => r.blindAfter).length, scored.length));
  console.log("key still confirmed WITH text after:", pct(scored.filter((r) => r.guidedOk).length, scored.length));
  const fb = all.filter((r) => r.flagsBefore.length).length, fa = all.filter((r) => r.flagsAfter.length).length;
  console.log("integrity-flagged before:", pct(fb, all.length), " after:", pct(fa, all.length));
  for (const c of CELLS) {
    const rs = scored.filter((r) => r.cell === `${c.skill}/${c.cefr}`);
    console.log(`  ${c.skill}/${c.cefr}`.padEnd(18), "blind before", pct(rs.filter((r) => r.blindBefore).length, rs.length), "→ after", pct(rs.filter((r) => r.blindAfter).length, rs.length));
  }
  const ex = all.find((r) => r.sample);
  if (ex) console.log("\nExample hardened item:\nQ:", ex.sample.q, "\n" + ex.sample.options.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });
