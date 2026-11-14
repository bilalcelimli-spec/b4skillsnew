#!/usr/bin/env tsx
/**
 * Re-runs the text-dependency gate on drafts stored with TEXTDEP-UNCHECKED
 * (the gate errored, e.g. judge timeout or depleted credits).
 *
 *   npx tsx scripts/jobs/recheck-text-dependency.ts            # dry run: run the gate, print verdicts
 *   npx tsx scripts/jobs/recheck-text-dependency.ts --apply    # also write the result to metadata
 *
 * Only DRAFT items are touched, and only metadata.generationGates changes:
 * TEXTDEP-UNCHECKED is replaced by the gate's own issue codes and the metrics
 * are stored. A draft that fails (SOLVABLE-BLIND / KEY-UNCONFIRMED) stays a
 * DRAFT with the failure flag, so a reviewer sees it; nothing is deleted.
 * A gate that errors again leaves the item unchanged. Previous metadata is
 * logged to scripts/jobs/.out/textdep-recheck/applied-<ts>.jsonl.
 */

import "dotenv/config"; // first: the judge reads GEMINI_API_KEY at import time
import { appendFileSync, mkdirSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { runTextDependencyGate } from "../../src/lib/ai/validation/gates/text-dependency.js";
import { runMatchingDependencyGate } from "../../src/lib/ai/validation/gates/matching-dependency.js";

const OUT = "scripts/jobs/.out/textdep-recheck";
const APPLY = process.argv.includes("--apply");
const BLOCKING = /SOLVABLE-BLIND|KEY-UNCONFIRMED/;

async function main(): Promise<void> {
  const rows = await prisma.item.findMany({
    where: { status: "DRAFT", metadata: { path: ["generationGates", "flags"], array_contains: ["TEXTDEP-UNCHECKED"] } },
    select: { id: true, itemCode: true, type: true, skill: true, cefrLevel: true, content: true, metadata: true },
    orderBy: { itemCode: "asc" },
  });
  const at = new Date().toISOString();
  const logFile = `${OUT}/applied-${at.replace(/[:.]/g, "-")}.jsonl`;
  mkdirSync(OUT, { recursive: true });
  const summary = { checked: rows.length, pass: 0, fail: 0, error: 0 };

  for (const row of rows) {
    const draft = { id: row.id, type: row.type as any, skill: row.skill as any, cefrLevel: row.cefrLevel as any, content: row.content as any };
    const gate = row.type === "DRAG_DROP"
      ? await runMatchingDependencyGate(draft).catch(() => null)
      : await runTextDependencyGate(draft).catch(() => null);
    const codes = gate?.issues.map((i) => i.code) ?? [];
    const outcome = !gate || gate.verdict === "ERROR" || gate.verdict === "SKIPPED" ? "error" : codes.some((c) => BLOCKING.test(c)) ? "fail" : "pass";
    summary[outcome]++;
    console.log(`${(row.itemCode ?? row.id).padEnd(12)} ${outcome.padEnd(5)} ${gate?.verdict ?? "no result"} ${codes.join(",")}`);
    if (!APPLY || outcome === "error") continue;

    const metadata = (row.metadata ?? {}) as Record<string, any>;
    const gates = { ...(metadata.generationGates ?? {}) };
    gates.flags = [...(gates.flags ?? []).filter((f: string) => f !== "TEXTDEP-UNCHECKED"), ...codes];
    gates.textDependency = gate!.metrics ?? null;
    gates.textDependencyNote = `${gates.textDependencyNote ?? ""} Re-checked ${at}: ${outcome.toUpperCase()}.`.trim();
    await prisma.item.update({ where: { id: row.id }, data: { metadata: { ...metadata, generationGates: gates } } });
    appendFileSync(logFile, JSON.stringify({ id: row.id, itemCode: row.itemCode, outcome, before: metadata.generationGates ?? null }) + "\n");
  }
  console.log(JSON.stringify(summary));
  console.log(APPLY ? `written. Log: ${logFile}` : "dry run — nothing written. Add --apply to write.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
