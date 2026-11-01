#!/usr/bin/env tsx

/**
 * Pulls the items the 2026-11-01 bank review found unservable out of service.
 * Dry-run by default; --apply sets status REVIEW (reversible) and records the
 * reason in metadata.statusChange. A second --apply changes nothing.
 *
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts --apply
 *
 * Report: scripts/jobs/.out/bank-review-2026-11-01.md
 */

import { prisma } from "../../src/lib/prisma.js";

const APPLY = process.argv.includes("--apply");
const ACTOR = "claude-code:bank-review-2026-11-01";

const KET = "Cambridge KET Part 1 task flattened into an MCQ: 8 options, no question stored, option set shared across the task's items";
const PICTURE = "asks about a picture that does not exist (no imageUrl; picture described in text)";

const BY_CODE: Record<string, string> = {
  "REA-A2-0150-MVX1N7S2": KET, "REA-A2-0150-MVX1N7VY": KET, "REA-A2-0150-MVX1N7QX": KET,
  "REA-A2-0150-MVX1N7UG": KET, "REA-A2-0150-MVX1N7T6": KET, "REA-A2-0150-MVX1N7XJ": KET,
  "WRI-PRE_A1-0031": PICTURE,
};
const BY_ID: Record<string, string> = {
  cmp4fgw580002o79b4x90pzva: PICTURE, cmp4fgw5b0003o79byupa4ggk: PICTURE, cmp4fk18k0005o79bl9kp7o3e: PICTURE,
};

async function main() {
  const items = await prisma.item.findMany({
    where: { OR: [{ itemCode: { in: Object.keys(BY_CODE) } }, { id: { in: Object.keys(BY_ID) } }] },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, content: true, metadata: true },
  });
  const expected = Object.keys(BY_CODE).length + Object.keys(BY_ID).length;
  console.log(`${items.length}/${expected} items found${APPLY ? "" : " (dry run)"}`);
  let changed = 0;
  for (const it of items) {
    const reason = BY_ID[it.id] ?? BY_CODE[it.itemCode ?? ""];
    const opts = Array.isArray((it.content as any)?.options) ? (it.content as any).options.length : "-";
    const line = `${(it.itemCode ?? it.id).padEnd(26)} ${it.skill} ${it.cefrLevel} ${it.status} options=${opts}`;
    if (!["ACTIVE", "PRETEST"].includes(it.status)) { console.log(`${line}  skip (not in service)`); continue; }
    console.log(`${line}  → REVIEW: ${reason}`);
    if (!APPLY) continue;
    await prisma.item.update({ where: { id: it.id }, data: {
      status: "REVIEW",
      metadata: { ...((it.metadata as object) ?? {}), statusChange: { from: it.status, to: "REVIEW", at: new Date().toISOString(), by: ACTOR, reason } },
    } });
    changed++;
  }
  console.log(APPLY ? `moved ${changed} items to REVIEW` : "no changes written");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
