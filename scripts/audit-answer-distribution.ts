/**
 * scripts/audit-answer-distribution.ts
 *
 * Checks the distribution of correctAnswer values (A/B/C/D) across all MCQ
 * items in the database and reports any skew.
 *
 * Usage:  npx tsx scripts/audit-answer-distribution.ts
 */

import { prisma } from "../src/lib/prisma";

async function main() {
  const items = await prisma.item.findMany({
    select: { id: true, skill: true, cefrLevel: true, content: true },
  });

  const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, other: 0 };
  const bySkill: Record<string, Record<string, number>> = {};

  for (const item of items) {
    const content = item.content as Record<string, unknown> | null;
    if (!content) continue;
    const ca = typeof content.correctAnswer === "string" ? content.correctAnswer.trim().toUpperCase() : null;
    if (!ca) continue;

    const bucket = ["A", "B", "C", "D"].includes(ca) ? ca : "other";
    counts[bucket] = (counts[bucket] ?? 0) + 1;

    const skillKey = (item.skill ?? "UNKNOWN") as string;
    bySkill[skillKey] = bySkill[skillKey] ?? { A: 0, B: 0, C: 0, D: 0, other: 0 };
    bySkill[skillKey][bucket] = (bySkill[skillKey][bucket] ?? 0) + 1;
  }

  const mcqTotal = counts.A + counts.B + counts.C + counts.D;
  console.log("\n══════════════════════════════════════════");
  console.log("  ANSWER POSITION DISTRIBUTION AUDIT");
  console.log("══════════════════════════════════════════");
  console.log(`Total MCQ items analysed: ${mcqTotal}  (${counts.other} non-MCQ/other skipped)\n`);

  if (mcqTotal === 0) {
    console.log("No MCQ items found with correctAnswer A/B/C/D.");
    return;
  }

  for (const letter of ["A", "B", "C", "D"]) {
    const n = counts[letter] ?? 0;
    const pct = ((n / mcqTotal) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(n / mcqTotal * 40));
    const flag = Number(pct) > 40 ? "  ⚠️  SKEWED" : Number(pct) < 10 ? "  ⚠️  UNDER-REPRESENTED" : "";
    console.log(`  ${letter}: ${String(n).padStart(5)}  (${pct.padStart(5)}%)  ${bar}${flag}`);
  }

  // Chi-squared uniformity test (df=3, α=0.05 critical = 7.815)
  const expected = mcqTotal / 4;
  const chiSq = ["A", "B", "C", "D"].reduce(
    (acc, l) => acc + Math.pow((counts[l] ?? 0) - expected, 2) / expected,
    0,
  );
  const biased = chiSq > 7.815;
  console.log(`\n  χ²(3) = ${chiSq.toFixed(2)}  (critical 7.815 at α=0.05)`);
  console.log(biased
    ? "  ⚠️  SIGNIFICANT POSITION BIAS — item bank review required"
    : "  ✓  No significant position bias detected");

  console.log("\n── By Skill ─────────────────────────────");
  for (const [skill, sc] of Object.entries(bySkill).sort()) {
    const tot = (sc.A ?? 0) + (sc.B ?? 0) + (sc.C ?? 0) + (sc.D ?? 0);
    if (tot === 0) continue;
    const summary = (["A", "B", "C", "D"] as const)
      .map((l) => `${l}:${sc[l] ?? 0}(${(((sc[l] ?? 0) / tot) * 100).toFixed(0)}%)`)
      .join("  ");
    const maxPct = Math.max(...(["A", "B", "C", "D"] as const).map((l) => (sc[l] ?? 0) / tot));
    const flag = maxPct > 0.5 ? "  ⚠️  BIASED" : "";
    console.log(`  ${skill.padEnd(12)} ${summary}${flag}`);
  }

  // Per CEFR level breakdown
  const byCefr: Record<string, Record<string, number>> = {};
  for (const item of items) {
    const content = item.content as Record<string, unknown> | null;
    if (!content) continue;
    const ca = typeof content.correctAnswer === "string" ? content.correctAnswer.trim().toUpperCase() : null;
    if (!ca || !["A", "B", "C", "D"].includes(ca)) continue;
    const lvl = (item.cefrLevel ?? "UNKNOWN") as string;
    byCefr[lvl] = byCefr[lvl] ?? { A: 0, B: 0, C: 0, D: 0 };
    byCefr[lvl][ca] = (byCefr[lvl][ca] ?? 0) + 1;
  }
  const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2", "UNKNOWN"];
  console.log("\n── By CEFR Level ────────────────────────");
  for (const lvl of CEFR_ORDER) {
    const sc = byCefr[lvl];
    if (!sc) continue;
    const tot = (sc.A ?? 0) + (sc.B ?? 0) + (sc.C ?? 0) + (sc.D ?? 0);
    if (tot === 0) continue;
    const summary = (["A", "B", "C", "D"] as const)
      .map((l) => `${l}:${sc[l] ?? 0}(${(((sc[l] ?? 0) / tot) * 100).toFixed(0)}%)`)
      .join("  ");
    const maxPct = Math.max(...(["A", "B", "C", "D"] as const).map((l) => (sc[l] ?? 0) / tot));
    const flag = maxPct > 0.5 ? "  ⚠️  BIASED" : "";
    console.log(`  ${lvl.padEnd(8)} ${summary}${flag}`);
  }

  console.log("\nExpected ideal: ~25% per position.");
  console.log("Positions with >40% or <10% warrant item-bank review.");
  console.log("Runtime shuffle in server-engine.ts randomises positions for candidates.");
  console.log("══════════════════════════════════════════\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
