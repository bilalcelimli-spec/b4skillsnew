#!/usr/bin/env tsx
/**
 * Dry-run only. Proposes ageSuitability / genre / topic for ACTIVE and PRETEST
 * items whose field is empty (or UNIVERSAL for age), from signals the item
 * already carries. Writes nothing to the database; there is no --apply yet —
 * applying changes the review content hash and needs explicit approval.
 *
 *   npx tsx scripts/jobs/backfill-context-fields.ts
 *
 * Output: scripts/jobs/.out/context-backfill/{proposals.jsonl,summary.json}
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { proposeContext } from "../../src/lib/content-factory/context-backfill.js";

const OUT = "scripts/jobs/.out/context-backfill";

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const rows = await db.item.findMany({
      where: { status: { in: ["ACTIVE", "PRETEST"] } },
      select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, tags: true, content: true,
        ageSuitability: true, genre: true, topic: true },
      orderBy: { id: "asc" },
    });
    const lines: string[] = [];
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
        lines.push(JSON.stringify({ id: row.id, itemCode: row.itemCode, skill: row.skill, cefrLevel: row.cefrLevel,
          status: row.status, change, evidence: proposal.evidence }));
      }
    }
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/proposals.jsonl`, lines.join("\n") + "\n");
    writeFileSync(`${OUT}/summary.json`, JSON.stringify({ generatedAt: new Date().toISOString(), itemsWithProposal: lines.length, ...summary }, null, 2));
    console.log(JSON.stringify({ itemsWithProposal: lines.length, ...summary }, null, 2));
    console.log(`dry-run only — nothing written to the database. Proposals: ${OUT}/proposals.jsonl`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Context backfill dry-run failed; the database was only read.", error);
  process.exitCode = 1;
});
