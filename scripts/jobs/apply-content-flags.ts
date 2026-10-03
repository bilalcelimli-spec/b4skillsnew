#!/usr/bin/env tsx

/**
 * Merges scan results into an additive `metadata.contentQuality` block and
 * writes a prioritised revision queue. Never changes status, content or IRT.
 *
 *   npx tsx scripts/jobs/apply-content-flags.ts           # dry-run, writes queue only
 *   npx tsx scripts/jobs/apply-content-flags.ts --apply   # also writes metadata
 *
 * Inputs (produced by the scan scripts):
 *   scripts/jobs/.out/content-quality.json   (scan-content-quality.ts)
 *   scripts/jobs/.out/text-gap.json          (scan-text-gap.ts)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";

const APPLY = process.argv.includes("--apply");
const dir = "scripts/jobs/.out";

const content: any[] = JSON.parse(readFileSync(`${dir}/content-quality.json`, "utf8"));
const gap = new Map<string, any>(JSON.parse(readFileSync(`${dir}/text-gap.json`, "utf8")).map((r: any) => [r.id, r]));

interface Entry {
  id: string; itemCode: string | null; skill: string; cefr: string;
  contentIqs: number; flags: string[]; textNeeded: boolean | null; priority: number;
}

const entries: Entry[] = [];
for (const r of content) {
  const g = gap.get(r.id);
  const textNeeded = g ? !(g.blindOk && g.guidedOk) : null;
  const flags: string[] = r.flags.map((f: any) => f.code);
  if (textNeeded === false) flags.push("TEXT_NOT_REQUIRED");
  if (g && !g.guidedOk) flags.push("KEY_UNCONFIRMED_WITH_TEXT");
  if (!flags.length) continue;
  const priority =
    (textNeeded === false ? 50 : 0) +
    (g && !g.guidedOk ? 40 : 0) +
    r.flags.reduce((s: number, f: any) => s + f.deduction, 0) +
    (["C1", "C2"].includes(r.cefr) ? 5 : 0);
  entries.push({ id: r.id, itemCode: r.itemCode, skill: r.skill, cefr: r.cefr, contentIqs: r.contentIqs, flags, textNeeded, priority });
}
entries.sort((a, b) => b.priority - a.priority);

writeFileSync(`${dir}/revision-queue.json`, JSON.stringify(entries, null, 2));
const byFlag: Record<string, number> = {};
for (const e of entries) for (const f of e.flags) byFlag[f] = (byFlag[f] ?? 0) + 1;
console.log(`queue=${entries.length} of ${content.length} items; flags: ${JSON.stringify(byFlag)}`);
console.log("top cells:", JSON.stringify(Object.entries(entries.reduce((m: Record<string, number>, e) => ((m[`${e.skill}/${e.cefr}`] = (m[`${e.skill}/${e.cefr}`] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 6)));

async function main() {
  if (!APPLY) { console.log("dry-run: metadata not written. Re-run with --apply."); return; }
  const at = new Date().toISOString();
  let n = 0;
  for (const e of entries) {
    const row = await prisma.item.findUnique({ where: { id: e.id }, select: { metadata: true } });
    const meta = (row?.metadata as Record<string, unknown> | null) ?? {};
    await prisma.item.update({
      where: { id: e.id },
      data: { metadata: { ...meta, contentQuality: { at, contentIqs: e.contentIqs, flags: e.flags, textNeeded: e.textNeeded, priority: e.priority } } as any },
    });
    if (++n % 100 === 0) console.log(`  written ${n}/${entries.length}`);
  }
  console.log(`metadata.contentQuality written for ${n} items`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
