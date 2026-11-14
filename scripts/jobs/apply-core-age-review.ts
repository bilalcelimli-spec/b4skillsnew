#!/usr/bin/env tsx
/**
 * Imports the decisions downloaded from the core age-review packet
 * (export-core-age-review.ts). Dry run by default.
 *
 *   npx tsx scripts/jobs/apply-core-age-review.ts core-age-decisions.json            # dry run
 *   npx tsx scripts/jobs/apply-core-age-review.ts core-age-decisions.json --apply    # write
 *
 * ADULT sets Item.ageSuitability = ADULT (excluded for under-16 profiles that
 * draw on the general core). UNIVERSAL keeps the value and records the review.
 * Both write metadata.ageReview { decision, reviewer, at, notes }. Only items
 * that are still general-core and UNIVERSAL are touched, so a decision never
 * overrides a label set since the export. Every write is logged with its
 * previous value to scripts/jobs/.out/core-age-review/applied-<ts>.jsonl.
 */

import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { isGeneralCoreItem } from "../../src/lib/assessment-engine/adaptive-policy.js";

const OUT = "scripts/jobs/.out/core-age-review";
const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");

interface Decision { id: string; code?: string; decision: string; notes?: string }

async function main(): Promise<void> {
  if (!file) throw new Error("usage: apply-core-age-review.ts <core-age-decisions.json> [--apply]");
  const body = JSON.parse(readFileSync(file, "utf8")) as { reviewer?: string; decisions?: Decision[] };
  const reviewer = body.reviewer?.trim();
  if (!reviewer) throw new Error("The decisions file has no reviewer name.");
  const decisions = (body.decisions ?? []).filter((d) => d && typeof d.id === "string");
  const invalid = decisions.filter((d) => d.decision !== "ADULT" && d.decision !== "UNIVERSAL");
  if (invalid.length) throw new Error(`Unknown decision for ${invalid.map((d) => d.code || d.id).join(", ")}`);

  const db = new PrismaClient();
  try {
    const summary = { reviewer, decisions: decisions.length, adult: 0, universal: 0, skipped: [] as string[] };
    const log: string[] = [];
    const at = new Date().toISOString();
    const logFile = `${OUT}/applied-${at.replace(/[:.]/g, "-")}.jsonl`;
    mkdirSync(OUT, { recursive: true });
    for (let i = 0; i < decisions.length; i += 100) {
      const chunk = decisions.slice(i, i + 100);
      const written: string[] = [];
      const run = async (tx: any) => {
        const ids = chunk.map((d) => d.id);
        if (APPLY) await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
        const rows = new Map<string, any>((await tx.item.findMany({ where: { id: { in: ids } },
          select: { id: true, itemCode: true, tags: true, content: true, ageSuitability: true, metadata: true } })).map((r: any) => [r.id, r]));
        for (const d of chunk) {
          const row = rows.get(d.id);
          if (!row || row.ageSuitability !== "UNIVERSAL" || !isGeneralCoreItem(row)) { summary.skipped.push(d.code || d.id); continue; }
          if (d.decision === "ADULT") summary.adult++; else summary.universal++;
          if (!APPLY) continue;
          const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
          const ageReview = { decision: d.decision, reviewer, at, ...(d.notes?.trim() ? { notes: d.notes.trim() } : {}) };
          await tx.item.update({ where: { id: d.id }, data: {
            ...(d.decision === "ADULT" ? { ageSuitability: "ADULT" } : {}), metadata: { ...metadata, ageReview } } });
          written.push(JSON.stringify({ id: d.id, itemCode: row.itemCode, decision: d.decision,
            before: { ageSuitability: row.ageSuitability, ageReview: metadata.ageReview ?? null } }));
        }
      };
      if (APPLY) await db.$transaction(run, { maxWait: 10000, timeout: 60000 }); else await run(db);
      if (written.length) appendFileSync(logFile, written.join("\n") + "\n");
      log.push(...written);
    }
    console.log(JSON.stringify({ ...summary, skipped: summary.skipped.length, skippedItems: summary.skipped.slice(0, 20) }, null, 1));
    console.log(APPLY ? `applied ${log.length} decisions. Log: ${logFile}` : "dry run — nothing written. Add --apply to write.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(APPLY ? "Core age review import failed; committed chunks are in the applied-*.jsonl log." : "Core age review dry run failed; nothing was written.", error);
  process.exitCode = 1;
});
