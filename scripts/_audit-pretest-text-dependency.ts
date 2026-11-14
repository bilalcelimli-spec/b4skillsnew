#!/usr/bin/env tsx
/**
 * Read-only audit. Runs the text-dependency gate (blind solver) on reading /
 * listening items that never went through it, by default the reading PRETEST
 * pool (482 items on 2026-11-14, none with generationGates metadata).
 * Nothing is written to the database.
 *
 *   npx tsx scripts/_audit-pretest-text-dependency.ts [--skill READING] [--status PRETEST] [--limit N] [--concurrency 2]
 *   npx tsx scripts/_audit-pretest-text-dependency.ts --resume   # keep decided items, re-run only errored / missing ones
 *   → scripts/jobs/.out/pretest-textdep/audit-<skill>-<status>.json
 *
 * Interpretation: with 4 options a fully text-dependent item is still solved
 * blind about 25% of the time, so a pool rate near 25% is the floor, not a
 * problem. The per-item verdict is a review hint, not a decision.
 */

import "dotenv/config"; // first: the judge reads GEMINI_API_KEY at import time
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma.js";
import { runTextDependencyGate } from "../src/lib/ai/validation/gates/text-dependency.js";
import { runMatchingDependencyGate } from "../src/lib/ai/validation/gates/matching-dependency.js";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const SKILL = arg("--skill") ?? "READING";
const STATUS = arg("--status") ?? "PRETEST";
const LIMIT = arg("--limit") ? Number(arg("--limit")) : undefined;
const CONCURRENCY = Number(arg("--concurrency") ?? 2);
const OUT = "scripts/jobs/.out/pretest-textdep";
const BLOCKING = /SOLVABLE-BLIND|KEY-UNCONFIRMED/;
const RESUME = process.argv.includes("--resume");
const FILE = `${OUT}/audit-${SKILL}-${STATUS}.json`;

async function main(): Promise<void> {
  const rows = await prisma.item.findMany({
    where: { skill: SKILL as any, status: STATUS as any },
    select: { id: true, itemCode: true, type: true, skill: true, cefrLevel: true, subskill: true, content: true, metadata: true, tags: true },
    orderBy: [{ cefrLevel: "asc" }, { itemCode: "asc" }],
    take: LIMIT,
  });
  const results: Array<Record<string, unknown>> = [];
  if (RESUME && existsSync(FILE)) {
    const ids = new Set(rows.map((r) => r.id));
    const prev = (JSON.parse(readFileSync(FILE, "utf8")).results as Array<Record<string, unknown>>)
      .filter((r) => r.outcome !== "error" && ids.has(r.id as string));
    results.push(...prev);
    const done = new Set(prev.map((r) => r.id));
    rows.splice(0, rows.length, ...rows.filter((r) => !done.has(r.id)));
    console.log(`resume: ${prev.length} kept, ${rows.length} to run`);
  }
  let next = 0;
  const worker = async () => {
    while (next < rows.length) {
      const row = rows[next++]!;
      const draft = { id: row.id, type: row.type as any, skill: row.skill as any, cefrLevel: row.cefrLevel as any, content: row.content as any };
      const run = () => (row.type === "DRAG_DROP" ? runMatchingDependencyGate(draft) : runTextDependencyGate(draft)).catch(() => null);
      let gate = await run();
      if (!gate || gate.verdict === "ERROR") gate = await run();
      const codes = gate?.issues.map((i) => i.code) ?? [];
      const outcome = !gate || gate.verdict === "ERROR" ? "error" : gate.verdict === "SKIPPED" ? "skipped"
        : codes.some((c) => BLOCKING.test(c)) ? (codes.some((c) => /KEY-UNCONFIRMED/.test(c)) ? "key-unconfirmed" : "blind") : "pass";
      results.push({ id: row.id, itemCode: row.itemCode, type: row.type, cefr: row.cefrLevel, subskill: row.subskill,
        outcome, codes, skipReason: gate?.verdict === "SKIPPED" ? (gate.metrics as any)?.reason : undefined });
      if (next % 50 === 0) console.log(`${next}/${rows.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const byCefr: Record<string, Record<string, number>> = {};
  for (const r of results) {
    const c = (byCefr[r.cefr as string] ??= {});
    c[r.outcome as string] = (c[r.outcome as string] ?? 0) + 1;
  }
  const total = results.reduce((t, r) => ({ ...t, [r.outcome as string]: ((t as any)[r.outcome as string] ?? 0) + 1 }), {} as Record<string, number>);
  mkdirSync(OUT, { recursive: true });
  const file = FILE;
  writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), skill: SKILL, status: STATUS, total, byCefr, results }, null, 1));
  console.log(JSON.stringify({ total, byCefr }, null, 1));
  console.log(`wrote ${file} (read-only: the database was not changed)`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
