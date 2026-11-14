#!/usr/bin/env tsx
/**
 * Proposes ageSuitability / genre / topic for ACTIVE, PRETEST, REVIEW and DRAFT
 * items whose field is empty (or UNIVERSAL for age), from signals the item
 * already carries. Dry run by default.
 *
 *   npx tsx scripts/jobs/backfill-context-fields.ts            # dry run
 *   npx tsx scripts/jobs/backfill-context-fields.ts --apply    # write (approved 2026-11-14)
 *
 * --apply locks each item, re-reads it and fills only fields that are still
 * empty, so a concurrent edit is never overwritten. The fields are part of the
 * review content hash: apply before expert reviews, never after. `version` is
 * not bumped (content is unchanged); `metadata.contextBackfill` records what
 * was set and why. Every write is logged with its previous value to
 * applied-<timestamp>.jsonl, which is enough to roll the run back.
 *
 * Output: scripts/jobs/.out/context-backfill/{proposals.jsonl,summary.json}
 */

import "dotenv/config";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { proposeContext } from "../../src/lib/content-factory/context-backfill.js";

const OUT = "scripts/jobs/.out/context-backfill";
const APPLY = process.argv.includes("--apply");
const STATUSES = ["ACTIVE", "PRETEST", "REVIEW", "DRAFT"] as const;
const POLICY_VERSION = "1.0";

type Change = { id: string; change: Record<string, string>; evidence: unknown };

/** Writes in chunks; each chunk is one transaction under row locks. Returns the applied log lines. */
async function apply(db: PrismaClient, changes: Change[], file: string): Promise<string[]> {
  const log: string[] = [];
  const at = new Date().toISOString();
  for (let i = 0; i < changes.length; i += 100) {
    const chunk = changes.slice(i, i + 100);
    const written: string[] = [];
    await db.$transaction(async (tx) => {
      const ids = chunk.map((c) => c.id);
      await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
      const current = new Map((await tx.item.findMany({ where: { id: { in: ids } },
        select: { id: true, ageSuitability: true, genre: true, topic: true, metadata: true } })).map((r) => [r.id, r]));
      for (const c of chunk) {
        const row = current.get(c.id);
        if (!row) continue;
        const data: Record<string, string> = {};
        const before: Record<string, string | null> = {};
        if (c.change.ageSuitability && row.ageSuitability === "UNIVERSAL") { data.ageSuitability = c.change.ageSuitability; before.ageSuitability = row.ageSuitability; }
        if (c.change.genre && !row.genre) { data.genre = c.change.genre; before.genre = row.genre; }
        if (c.change.topic && !row.topic) { data.topic = c.change.topic; before.topic = row.topic; }
        if (!Object.keys(data).length) continue;
        const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
        await tx.item.update({ where: { id: c.id }, data: { ...data,
          metadata: { ...metadata, contextBackfill: { policyVersion: POLICY_VERSION, at, fields: Object.keys(data), evidence: c.evidence } } } as any });
        written.push(JSON.stringify({ id: c.id, set: data, before }));
      }
    }, { maxWait: 10000, timeout: 60000 });
    // Appended after each committed chunk, so a failure mid-run still leaves a complete log of what was written.
    if (written.length) appendFileSync(file, written.join("\n") + "\n");
    log.push(...written);
  }
  return log;
}

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const rows = await db.item.findMany({
      where: { status: { in: [...STATUSES] } },
      select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, tags: true, content: true,
        ageSuitability: true, genre: true, topic: true },
      orderBy: { id: "asc" },
    });
    const lines: string[] = [];
    const changes: Change[] = [];
    const summary = {
      items: rows.length,
      ageSuitability: { empty: 0, proposed: 0, byValue: {} as Record<string, number> },
      genre: { empty: 0, proposed: 0, byValue: {} as Record<string, number> },
      topic: { empty: 0, proposed: 0, byValue: {} as Record<string, number> },
      bySkill: {} as Record<string, { items: number; genre: number; topic: number; age: number }>,
    };
    const bump = (map: Record<string, number>, key: string) => { map[key] = (map[key] ?? 0) + 1; };

    for (const row of rows) {
      const proposal = proposeContext({ skill: row.skill, tags: row.tags, content: row.content as Record<string, unknown> });
      const skill = (summary.bySkill[row.skill] ??= { items: 0, genre: 0, topic: 0, age: 0 });
      skill.items++;
      const change: Record<string, string> = {};
      if (row.ageSuitability === "UNIVERSAL") {
        summary.ageSuitability.empty++;
        if (proposal.ageSuitability && proposal.ageSuitability !== "UNIVERSAL") {
          change.ageSuitability = proposal.ageSuitability; summary.ageSuitability.proposed++; skill.age++;
          bump(summary.ageSuitability.byValue, proposal.ageSuitability);
        }
      }
      if (!row.genre) {
        summary.genre.empty++;
        if (proposal.genre) { change.genre = proposal.genre; summary.genre.proposed++; skill.genre++; bump(summary.genre.byValue, proposal.genre); }
      }
      if (!row.topic) {
        summary.topic.empty++;
        if (proposal.topic) { change.topic = proposal.topic; summary.topic.proposed++; skill.topic++; bump(summary.topic.byValue, proposal.topic); }
      }
      if (Object.keys(change).length) {
        changes.push({ id: row.id, change, evidence: proposal.evidence });
        lines.push(JSON.stringify({ id: row.id, itemCode: row.itemCode, skill: row.skill, cefrLevel: row.cefrLevel,
          status: row.status, change, evidence: proposal.evidence }));
      }
    }
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/proposals.jsonl`, lines.join("\n") + "\n");
    writeFileSync(`${OUT}/summary.json`, JSON.stringify({ generatedAt: new Date().toISOString(), itemsWithProposal: lines.length, ...summary }, null, 2));
    console.log(JSON.stringify({ itemsWithProposal: lines.length, ...summary }, null, 2));
    if (!APPLY) {
      console.log(`dry run — nothing written to the database. Proposals: ${OUT}/proposals.jsonl`);
      return;
    }
    const file = `${OUT}/applied-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
    const log = await apply(db, changes, file);
    console.log(`applied to ${log.length} items (${changes.length - log.length} skipped: changed since read). Log: ${file}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(APPLY ? "Context backfill failed; every committed chunk is in the applied-*.jsonl log, the rest was rolled back — re-run to finish." : "Context backfill dry run failed; the database was only read.", error);
  process.exitCode = 1;
});
