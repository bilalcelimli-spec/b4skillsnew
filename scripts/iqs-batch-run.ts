/**
 * IQS Batch Runner
 *
 * Scores every item in the item bank (or only those with iqScore = NULL) using
 * the Item Quality Score (IQS) engine and writes the result back to the DB.
 *
 * Usage:
 *   npx tsx scripts/iqs-batch-run.ts               # only unscored items
 *   npx tsx scripts/iqs-batch-run.ts --all          # re-score everything
 *   npx tsx scripts/iqs-batch-run.ts --concurrency 10
 *
 * Exit codes:
 *   0 — all items processed (failures are logged but do not abort the run)
 *   1 — fatal error (DB unreachable, etc.)
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { computeAndPersistIqs } from "../src/lib/psychometrics/item-quality-score.js";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const ALL   = args.includes("--all");
const CONC  = (() => {
  const idx = args.indexOf("--concurrency");
  return idx !== -1 ? Math.min(parseInt(args[idx + 1], 10) || 5, 20) : 5;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function bar(done: number, total: number, width = 40): string {
  const pct  = total ? done / total : 0;
  const fill = Math.round(pct * width);
  return `[${"█".repeat(fill)}${" ".repeat(width - fill)}] ${(pct * 100).toFixed(1)}%`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const where = ALL ? {} : { iqScore: null };
  const rows  = await prisma.item.findMany({ where, select: { id: true } });
  const total = rows.length;

  if (total === 0) {
    console.log(ALL ? "⚠  Item bank is empty." : "✅ All items already scored — nothing to do.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n🚀  IQS Batch Run — ${total} item(s) | concurrency=${CONC} | mode=${ALL ? "ALL" : "unscored-only"}\n`);

  const queue   = rows.map(r => r.id);
  let done      = 0;
  let failed    = 0;
  const errors: Array<{ id: string; error: string }> = [];
  const tStart  = Date.now();

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      try {
        await computeAndPersistIqs(id);
        done++;
      } catch (err: any) {
        failed++;
        errors.push({ id, error: String(err?.message ?? err) });
      }
      // Overwrite the same line with progress
      const elapsed   = ((Date.now() - tStart) / 1000).toFixed(1);
      const processed = done + failed;
      const rate      = processed > 0 ? (processed / ((Date.now() - tStart) / 1000)).toFixed(1) : "—";
      process.stdout.write(`\r  ${bar(processed, total)}  ${processed}/${total}  ✓${done} ✗${failed}  ${elapsed}s  ${rate} items/s  `);
    }
  }

  await Promise.all(Array.from({ length: CONC }, worker));

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`\n\n📊  Finished in ${elapsed}s  —  scored: ${done}  failed: ${failed}  total: ${total}`);

  if (errors.length > 0) {
    console.error(`\n⚠  ${errors.length} item(s) failed IQS computation:`);
    errors.slice(0, 20).forEach(e => console.error(`   ${e.id}: ${e.error}`));
    if (errors.length > 20) console.error(`   … and ${errors.length - 20} more.`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
