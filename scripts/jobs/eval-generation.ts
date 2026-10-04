#!/usr/bin/env tsx

/**
 * A/B evaluation of the generation prompt. Generates drafts in memory (NO DB
 * writes) with the legacy and the current prompt, then scores both with the
 * same gates.
 *
 *   npx tsx scripts/jobs/eval-generation.ts [--n 10]
 *
 * Primary metric: share of drafts whose key is found WITHOUT the text.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { generateDrafts } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { runContentIntegrityGate } from "../../src/lib/ai/validation/gates/content-integrity.js";
import { runTextDependencyGate } from "../../src/lib/ai/validation/gates/text-dependency.js";

const nIdx = process.argv.indexOf("--n");
const N = nIdx >= 0 ? Number(process.argv[nIdx + 1]) : 10;

const CELLS: BlueprintCell[] = [
  { cefr: "B2", skill: "READING", subskill: "INFERENCE", genre: "article", topic: "technology" },
  { cefr: "C1", skill: "READING", subskill: "STANCE", genre: "opinion_column", topic: "society" },
  { cefr: "B2", skill: "LISTENING", subskill: "IMPLICATION", genre: "discussion", topic: "education" },
  { cefr: "C1", skill: "LISTENING", subskill: "ARGUMENT_DEVELOPMENT", genre: "lecture", topic: "science" },
];

interface Row { variant: string; cell: string; yield: number; blindOk: boolean | null; guidedOk: boolean | null; flags: string[] }

async function evaluate(variant: "legacy" | "v2", cell: BlueprintCell): Promise<{ rows: Row[]; requested: number; skipped: number }> {
  const { items, skippedReasons } = await generateDrafts(cell, N, { legacy: variant === "legacy" });
  const rows: Row[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const raw = items[cursor++];
      const c: any = { ...raw.content };
      if (Array.isArray(c.options)) c.options = c.options.map((o: any) => ({ id: o.id ?? o.label, text: o.text ?? o.content, isCorrect: !!o.isCorrect }));
      const draft = { id: `${variant}-${cell.skill}-${cell.cefr}-${cursor}`, type: "MULTIPLE_CHOICE" as any, skill: cell.skill as any, cefrLevel: cell.cefr as any, content: c };
      const integrity = await runContentIntegrityGate({ ...draft, content: variant === "v2" && raw.cognitiveDemand ? { ...c, cognitiveDemand: raw.cognitiveDemand } : c });
      const td = await runTextDependencyGate(draft);
      rows.push({
        variant, cell: `${cell.skill}/${cell.cefr}`, yield: 1,
        blindOk: td.metrics?.blindOk as boolean | null ?? null,
        guidedOk: td.metrics?.guidedOk as boolean | null ?? null,
        flags: integrity.issues.map((i) => i.code.replace("INTEG-", "")),
      });
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  return { rows, requested: N, skipped: N - items.length + 0 * skippedReasons.length };
}

async function main() {
  const all: Row[] = [];
  const yields: Record<string, { requested: number; got: number }> = {};
  const jobs = CELLS.flatMap((cell) => (["legacy", "v2"] as const).map((variant) => ({ cell, variant })));
  const results = await Promise.all(
    jobs.map(async ({ cell, variant }) => {
      const r = await evaluate(variant, cell);
      console.log(`${variant.padEnd(7)} ${cell.skill}/${cell.cefr}: generated ${r.rows.length}/${r.requested}`);
      return { variant, r };
    })
  );
  for (const { variant, r } of results) {
    all.push(...r.rows);
    yields[variant] ??= { requested: 0, got: 0 };
    yields[variant].requested += r.requested;
    yields[variant].got += r.rows.length;
  }
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/eval-generation.json", JSON.stringify(all, null, 2));

  const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "n/a");
  console.log("\n=== RESULT ===");
  for (const variant of ["legacy", "v2"]) {
    const rows = all.filter((r) => r.variant === variant);
    const scored = rows.filter((r) => r.blindOk !== null);
    const flagged = rows.filter((r) => r.flags.length);
    const byFlag: Record<string, number> = {};
    for (const r of rows) for (const f of r.flags) byFlag[f] = (byFlag[f] ?? 0) + 1;
    console.log(`\n${variant}: yield ${pct(yields[variant].got, yields[variant].requested)}`);
    console.log(`  key found WITHOUT text: ${pct(scored.filter((r) => r.blindOk).length, scored.length)}`);
    console.log(`  key confirmed WITH text: ${pct(scored.filter((r) => r.guidedOk).length, scored.length)}`);
    console.log(`  integrity-flagged: ${pct(flagged.length, rows.length)}  ${JSON.stringify(byFlag)}`);
    for (const cell of CELLS) {
      const cr = scored.filter((r) => r.cell === `${cell.skill}/${cell.cefr}`);
      console.log(`    ${cell.skill}/${cell.cefr}`.padEnd(20), `blind ok ${pct(cr.filter((r) => r.blindOk).length, cr.length)}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
