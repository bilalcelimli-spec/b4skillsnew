#!/usr/bin/env tsx

/**
 * Read-only scan of ACTIVE items with the content IQS. Writes nothing to the DB.
 *
 *   npx tsx scripts/jobs/scan-content-quality.ts
 *
 * Output: summary on stdout + scripts/jobs/.out/content-quality.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { calculateContentIqs } from "../../src/lib/psychometrics/content-iqs.js";

async function main() {
  const items = await prisma.item.findMany({
    where: { status: "ACTIVE" as any },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, type: true, content: true, metadata: true, iqScore: true },
  });

  const rows = items.map((it) => {
    const r = calculateContentIqs({ skill: it.skill, cefrLevel: it.cefrLevel, type: it.type, content: it.content as any, metadata: it.metadata as any });
    return { id: it.id, itemCode: it.itemCode, skill: it.skill, cefr: it.cefrLevel, legacyIqs: it.iqScore, contentIqs: r.score, flags: r.flags };
  });

  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/content-quality.json", JSON.stringify(rows, null, 2));

  const flagged = rows.filter((r) => r.flags.length);
  const byCode: Record<string, number> = {};
  for (const r of flagged) for (const f of r.flags) byCode[f.code] = (byCode[f.code] ?? 0) + 1;
  console.log(`scanned=${rows.length} flagged=${flagged.length} (${((100 * flagged.length) / rows.length).toFixed(1)}%)`);
  console.log("flags by code:", JSON.stringify(byCode));

  const bands = { "100": 0, "80-99": 0, "60-79": 0, "<60": 0 };
  for (const r of rows) bands[r.contentIqs === 100 ? "100" : r.contentIqs >= 80 ? "80-99" : r.contentIqs >= 60 ? "60-79" : "<60"]++;
  console.log("contentIQS bands:", JSON.stringify(bands));

  const cells: Record<string, { n: number; flagged: number }> = {};
  for (const r of rows.filter((x) => x.skill === "READING" || x.skill === "LISTENING")) {
    const k = `${r.skill}/${r.cefr}`;
    const c = (cells[k] ??= { n: 0, flagged: 0 });
    c.n++;
    if (r.flags.length) c.flagged++;
  }
  console.log("reading/listening flagged by cell:");
  for (const [k, v] of Object.entries(cells).sort()) console.log(`  ${k.padEnd(18)} ${v.flagged}/${v.n}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
