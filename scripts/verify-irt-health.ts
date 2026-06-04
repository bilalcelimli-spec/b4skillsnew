#!/usr/bin/env npx tsx
/**
 * IRT Health Verifier — CI gate + diagnostic report.
 *
 * Asserts that the operational item bank cannot silently degrade the CAT
 * selector:
 *   1. No ACTIVE item may have discrimination a ≤ 0 (zero Fisher information →
 *      invisible to the Maximum-Fisher-Information selector).
 *   2. Reports the parameter-source distribution (synthetic / prior / calibrated)
 *      so we can track cold-start → calibrated migration over time.
 *   3. Reports IQS coverage (how many ACTIVE items have an iqScore).
 *
 * Exit code 1 (CI fail) if any ACTIVE item has a ≤ 0.
 *
 * Usage:
 *   npm run verify:irt
 *   STRICT_PRIOR=1 npm run verify:irt   # also fail if any ACTIVE item is still synthetic (no paramSource)
 */

import { prisma } from "../src/lib/prisma.js";

const STRICT_PRIOR = process.env.STRICT_PRIOR === "1";

interface Row {
  id: string;
  skill: string;
  cefrLevel: string;
  discrimination: number;
  guessing: number;
  iqScore: number | null;
  metadata: any;
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

async function main() {
  console.log("\n=== IRT Health Check (ACTIVE bank) ===\n");

  const items = (await prisma.item.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      skill: true,
      cefrLevel: true,
      discrimination: true,
      guessing: true,
      iqScore: true,
      metadata: true,
    },
  })) as unknown as Row[];

  const total = items.length;
  console.log(`Total ACTIVE items: ${total}`);

  if (total === 0) {
    console.log("⚠️  No ACTIVE items found — nothing to verify.");
    await prisma.$disconnect();
    return;
  }

  // ── 1. Zero-information guard ────────────────────────────────────────────────
  const zeroInfo = items.filter((it) => it.discrimination <= 0);
  console.log(`\n[1] Zero-information items (a ≤ 0): ${zeroInfo.length}`);
  if (zeroInfo.length > 0) {
    for (const it of zeroInfo.slice(0, 10)) {
      console.log(`    ❌ ${it.id.slice(0, 8)} ${it.skill}/${it.cefrLevel} a=${it.discrimination}`);
    }
    if (zeroInfo.length > 10) console.log(`    … and ${zeroInfo.length - 10} more`);
  } else {
    console.log("    ✅ none — every ACTIVE item carries Fisher information");
  }

  // ── 2. Parameter-source distribution ─────────────────────────────────────────
  const srcCounts: Record<string, number> = { synthetic: 0, prior: 0, calibrated: 0 };
  for (const it of items) {
    const src = (it.metadata as any)?.paramSource;
    if (src === "prior") srcCounts.prior++;
    else if (src === "calibrated") srcCounts.calibrated++;
    else srcCounts.synthetic++;
  }
  console.log(`\n[2] Parameter source distribution:`);
  console.log(`    synthetic (untagged): ${srcCounts.synthetic} (${pct(srcCounts.synthetic, total)})`);
  console.log(`    prior (norm-based):   ${srcCounts.prior} (${pct(srcCounts.prior, total)})`);
  console.log(`    calibrated (real):    ${srcCounts.calibrated} (${pct(srcCounts.calibrated, total)})`);

  // ── 3. IQS coverage ──────────────────────────────────────────────────────────
  const withIqs = items.filter((it) => it.iqScore != null);
  const avgIqs =
    withIqs.length > 0
      ? (withIqs.reduce((s, it) => s + (it.iqScore as number), 0) / withIqs.length).toFixed(1)
      : "n/a";
  console.log(`\n[3] IQS coverage: ${withIqs.length}/${total} (${pct(withIqs.length, total)}), avg=${avgIqs}`);

  // ── Verdict ──────────────────────────────────────────────────────────────────
  let failed = false;
  console.log("\n=== Verdict ===");
  if (zeroInfo.length > 0) {
    console.error(`❌ FAIL: ${zeroInfo.length} ACTIVE items have a ≤ 0 — run: npx tsx scripts/backfill-irt-priors.ts`);
    failed = true;
  }
  if (STRICT_PRIOR && srcCounts.synthetic > 0) {
    console.error(`❌ FAIL (STRICT_PRIOR): ${srcCounts.synthetic} ACTIVE items still untagged — run backfill.`);
    failed = true;
  }
  if (!failed) console.log("✅ PASS — item bank is healthy for adaptive delivery.");

  await prisma.$disconnect();
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
