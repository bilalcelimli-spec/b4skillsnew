#!/usr/bin/env tsx
/**
 * Writing and speaking review queue (read only).
 *
 *   npm run report:rubric-queue                         # Markdown to stdout
 *   npm run report:rubric-queue -- --out reports/rubric-queue.md
 *   npm run report:rubric-queue -- --json
 *
 * Lists the writing and speaking items parked in the pretest pool (PRETEST,
 * or ACTIVE with isPretest), which are never served, with what each still
 * needs before pilot promotion can make it ACTIVE: missing reviews and
 * content blockers. See docs/quality/rubric-item-activation-2026-11.md.
 *
 * Writes nothing to the database.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildRubricQueue, renderRubricQueueMarkdown, type QueueItem } from "../../src/lib/content-factory/rubric-review-queue.js";

const argOf = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const db = new PrismaClient();
  try {
    const items = await db.item.findMany({
      where: { skill: { in: ["WRITING", "SPEAKING"] }, OR: [{ status: "PRETEST" }, { status: "ACTIVE", isPretest: true }] },
      include: { itemReviews: true },
    });
    const rows = buildRubricQueue(items as unknown as QueueItem[]);
    const output = process.argv.includes("--json")
      ? JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2) + "\n"
      : renderRubricQueueMarkdown(rows, new Date());
    const out = argOf("--out");
    if (out) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, output);
      console.log(`Wrote ${out} (${rows.length} items).`);
    } else {
      process.stdout.write(output);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
