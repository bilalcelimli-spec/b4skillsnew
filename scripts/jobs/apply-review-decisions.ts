#!/usr/bin/env tsx

/**
 * Applies expert review decisions exported from the review packet.
 * Dry-run by default.
 *
 *   npx tsx scripts/jobs/apply-review-decisions.ts decisions.json           # plan only
 *   npx tsx scripts/jobs/apply-review-decisions.ts decisions.json --apply   # write
 */

import { readFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { planReviewDecisions, type ReviewRecord } from "../../src/lib/content-factory/review-decisions.js";

const file = process.argv[2];
if (!file) { console.error("usage: apply-review-decisions.ts decisions.json [--apply]"); process.exit(1); }
const APPLY = process.argv.includes("--apply");

async function main() {
  const records: ReviewRecord[] = JSON.parse(readFileSync(file, "utf8"));
  const items = await prisma.item.findMany({ where: { id: { in: records.map((r) => r.id) } }, select: { id: true, status: true, metadata: true } });
  const plan = planReviewDecisions(records, items.map((i) => ({ id: i.id, status: String(i.status), metadata: i.metadata as any })));

  const by: Record<string, number> = {};
  for (const u of plan.updates) { const k = u.status ? `reject → ${u.status}` : u.pipelineStage ?? "?"; by[k] = (by[k] ?? 0) + 1; }
  console.log(`records=${records.length} to update=${plan.updates.length} skipped=${plan.skipped.length}`);
  console.log("updates:", JSON.stringify(by));
  for (const s of plan.skipped) console.log(`  skipped ${s.id.slice(0, 10)}: ${s.reason}`);
  if (!APPLY) { console.log("\ndry-run: nothing written. Re-run with --apply."); await prisma.$disconnect(); return; }

  for (const u of plan.updates) {
    await prisma.item.update({
      where: { id: u.id },
      data: { ...(u.status ? { status: u.status as any } : {}), ...(u.pipelineStage ? { pipelineStage: u.pipelineStage as any } : {}), metadata: u.metadata as any },
    });
  }
  console.log(`applied ${plan.updates.length} decisions`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
