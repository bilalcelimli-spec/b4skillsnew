#!/usr/bin/env tsx
/**
 * Read-only export of the operational item bank as an anonymised snapshot for
 * the production-path simulation harness.
 *
 *   npx tsx scripts/export-bank-snapshot.ts [--output test/simulation/fixtures/bank-snapshot.json]
 *
 * What is exported per ACTIVE/PRETEST item: a salted hash of the id, skill,
 * CEFR level, type, IRT a/b/c, status, pretest/anchor flags, IQS, tags, the
 * product-line pin and a hash of the passage/recording text. No prompt,
 * option, key, rubric or media text leaves the database.
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { passageKey } from "../src/lib/assessment-engine/passage-cap.js";
import type { BankSnapshot, BankSnapshotItem } from "../src/lib/assessment-engine/simulation-harness.js";

const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
};
const output = arg("output", "test/simulation/fixtures/bank-snapshot.json");
const salt = createHash("sha1").update(String(Date.now())).digest("hex").slice(0, 8);

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const rows = await db.item.findMany({
      where: { status: { in: ["ACTIVE", "PRETEST"] } },
      select: {
        id: true, skill: true, cefrLevel: true, type: true, status: true, isPretest: true, isAnchor: true,
        discrimination: true, difficulty: true, guessing: true, iqScore: true, tags: true, content: true,
      },
      orderBy: { id: "asc" },
    });
    const items: BankSnapshotItem[] = rows.map((row) => {
      const content = (row.content ?? {}) as Record<string, unknown>;
      return {
        id: "it_" + createHash("sha1").update(salt + row.id).digest("hex").slice(0, 12),
        skill: row.skill as BankSnapshotItem["skill"],
        cefrLevel: row.cefrLevel as BankSnapshotItem["cefrLevel"],
        type: row.type,
        a: row.discrimination,
        b: row.difficulty,
        c: row.guessing,
        status: row.status,
        isPretest: row.isPretest || row.status === "PRETEST",
        isAnchor: row.isAnchor,
        iqScore: row.iqScore,
        tags: row.tags,
        passageKey: passageKey({ metadata: content }),
        productLine: typeof content.productLine === "string" ? content.productLine : null,
      };
    });
    const snapshot: BankSnapshot = { generatedAt: new Date().toISOString(), source: "database", items };
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(snapshot, null, 1), { mode: 0o600 });
    console.log(`exported ${items.length} items → ${output}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Bank snapshot export failed; the database was only read.", error);
  process.exitCode = 1;
});
