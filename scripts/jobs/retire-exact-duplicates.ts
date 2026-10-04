#!/usr/bin/env tsx

/**
 * Pulls EXACT duplicate items out of service. Dry-run by default.
 *
 *   npx tsx scripts/jobs/retire-exact-duplicates.ts           # list only
 *   npx tsx scripts/jobs/retire-exact-duplicates.ts --apply   # write
 *
 * Exact = same skill + CEFR level, same normalised stem, same correct answer.
 * Only ACTIVE/PRETEST items are ever changed (to REVIEW, reversible, reason in
 * metadata.statusChange). Keeper: ACTIVE over PRETEST, then more responses,
 * then older. Anchor items are never touched. Near-duplicates are not handled.
 */

import { prisma } from "../../src/lib/prisma.js";

const APPLY = process.argv.includes("--apply");
const optText = (o: any) => (typeof o === "string" ? o : String(o?.text ?? ""));

const norm = (s: string) =>
  s.toLowerCase().replace(/["'“”‘’]/g, "").replace(/_+/g, "___").replace(/\s+/g, " ").trim();

function key(it: { skill: string; cefrLevel: string; content: any }): string | null {
  const c = it.content ?? {};
  const stem = norm(String(c.question ?? c.stem ?? c.prompt ?? ""));
  if (stem.length < 12) return null;
  const opts: any[] = c.options ?? [];
  const k = opts.findIndex((o) => o?.isCorrect === true);
  if (k < 0) return null;
  const passage = norm(String(c.passage ?? c.ttsScript ?? c.transcript ?? ""));
  return [it.skill, it.cefrLevel, stem, norm(optText(opts[k])), passage].join("¦");
}

async function main() {
  const items = await prisma.item.findMany({
    where: { status: { in: ["ACTIVE", "PRETEST"] as any } },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, isAnchor: true, createdAt: true, content: true, metadata: true },
  });
  const counts = await prisma.response.groupBy({ by: ["itemId"], _count: true });
  const resp = new Map(counts.map((c) => [c.itemId, c._count]));

  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it);
  }

  const plan: Array<{ keep: (typeof items)[number]; drop: (typeof items)[number] }> = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    g.sort((a, b) =>
      (a.status === "ACTIVE" ? 0 : 1) - (b.status === "ACTIVE" ? 0 : 1) ||
      (resp.get(b.id) ?? 0) - (resp.get(a.id) ?? 0) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id)
    );
    for (const drop of g.slice(1)) plan.push({ keep: g[0], drop });
  }

  const skippedAnchor = plan.filter((p) => p.drop.isAnchor);
  const todo = plan.filter((p) => !p.drop.isAnchor);
  console.log(`exact-duplicate groups=${[...groups.values()].filter((g) => g.length > 1).length} items to pull=${todo.length} skipped(anchor)=${skippedAnchor.length}`);
  const byType: Record<string, number> = {};
  for (const p of todo) { const k = `${p.keep.status} keeps / ${p.drop.status} pulled`; byType[k] = (byType[k] ?? 0) + 1; }
  console.log("by type:", JSON.stringify(byType));
  for (const p of todo.slice(0, 40)) {
    const s = String((p.keep.content as any)?.question ?? (p.keep.content as any)?.stem ?? "").replace(/\s+/g, " ").slice(0, 60);
    console.log(`  ${p.drop.status.padEnd(7)} ${p.drop.itemCode ?? p.drop.id.slice(0, 9)} (resp ${resp.get(p.drop.id) ?? 0}) → keep ${p.keep.status} ${p.keep.itemCode ?? p.keep.id.slice(0, 9)} (resp ${resp.get(p.keep.id) ?? 0}) | ${p.keep.skill}/${p.keep.cefrLevel} | ${s}`);
  }

  if (!APPLY) { console.log("\ndry-run: nothing written. Re-run with --apply."); await prisma.$disconnect(); return; }

  const at = new Date().toISOString();
  let n = 0;
  for (const p of todo) {
    await prisma.item.update({
      where: { id: p.drop.id },
      data: {
        status: "REVIEW" as any,
        metadata: { ...((p.drop.metadata as any) ?? {}), statusChange: { from: p.drop.status, to: "REVIEW", reason: `Exact duplicate of ${p.keep.itemCode ?? p.keep.id} (same stem and key)`, duplicateOf: p.keep.id, at } } as any,
      },
    });
    n++;
  }
  console.log(`\npulled ${n} duplicate items to REVIEW`);
  console.log("ACTIVE now:", await prisma.item.count({ where: { status: "ACTIVE" as any } }), "| PRETEST now:", await prisma.item.count({ where: { status: "PRETEST" as any } }));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
