/**
 * AIG Quality Report — b-parameter correlation & generation funnel
 *
 * Evaluates the quality of AI-generated items by:
 *
 *   1. CEFR→expected-b mapping: each CEFR level has an expected IRT difficulty.
 *      The LLM "predicts" a difficulty when it targets a level (e.g., B1 → b ≈ −0.5).
 *
 *   2. Empirical b correlation: compare expected b (from cefrLevel) with the
 *      calibrated b (item.difficulty) for all ACTIVE items with calibration data.
 *      High r means the generator reliably hits its target difficulty.
 *
 *   3. Miscalibration flags: items where |expected_b − empirical_b| > DELTA_THRESHOLD.
 *      These indicate systematic generator drift (too hard/easy for the intended level).
 *
 *   4. AIG funnel: DRAFT → PRETEST → ACTIVE counts and survival rates by skill.
 *      Also shows the per-generator funnel if metadata.generatedBy is set.
 *
 *   5. Point-biserial health: mean rpb for generated vs manually authored items.
 *
 * Output: JSON to stdout; structured for the weekly health workflow and admin API.
 *
 * Usage:
 *   npx tsx scripts/aig-quality-report.ts
 *   OUTPUT=table npx tsx scripts/aig-quality-report.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const OUTPUT = process.env.OUTPUT ?? "json";
const prisma = new PrismaClient();

// ─── CEFR → expected IRT b-parameter ─────────────────────────────────────────
// Based on CEFR theta benchmarks from the standard-setting report:
// A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5
const CEFR_EXPECTED_B: Record<string, number> = {
  A1: -2.5,
  A2: -1.5,
  B1: -0.5,
  B2:  0.5,
  C1:  1.5,
  C2:  2.5,
};

// Flag items where empirical b deviates from expected by more than this
const DELTA_THRESHOLD = 0.80;

// ─── Math helpers ─────────────────────────────────────────────────────────────

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dxi = xs[i] - mx;
    const dyi = ys[i] - my;
    num += dxi * dyi;
    dx2 += dxi * dxi;
    dy2 += dyi * dyi;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom < 1e-9 ? NaN : num / denom;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Fetch items ──────────────────────────────────────────────────────────────
  const allItems = await prisma.item.findMany({
    select: {
      id: true,
      skill: true,
      cefrLevel: true,
      status: true,
      difficulty: true,
      discrimination: true,
      pVal: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const total = allItems.length;

  // ── AIG Funnel ────────────────────────────────────────────────────────────────
  // An "AIG item" is one that has metadata.generatedBy set (any non-empty value)
  // OR was programmatically generated (fallback: all items since seeding scripts set metadata).
  // For funnel purposes, treat every item as AIG-generated (this is a generation-only bank).

  const byStatus = { DRAFT: 0, REVIEW: 0, PRETEST: 0, ACTIVE: 0, RETIRED: 0 };
  const funnelBySkill: Record<string, { DRAFT: number; PRETEST: number; ACTIVE: number; RETIRED: number }> = {};

  for (const item of allItems) {
    const s = item.status as string;
    if (s in byStatus) (byStatus as any)[s]++;

    if (!funnelBySkill[item.skill]) {
      funnelBySkill[item.skill] = { DRAFT: 0, PRETEST: 0, ACTIVE: 0, RETIRED: 0 };
    }
    if (s in funnelBySkill[item.skill]) {
      (funnelBySkill[item.skill] as any)[s]++;
    }
  }

  const survivalNumerator   = byStatus.ACTIVE;
  const survivalDenominator = total - byStatus.DRAFT - byStatus.REVIEW;
  const survivalRatePct = survivalDenominator > 0
    ? Number(((survivalNumerator / survivalDenominator) * 100).toFixed(1))
    : null;

  // ── b-parameter correlation ───────────────────────────────────────────────────
  // Only calibrated ACTIVE items have a meaningful empirical b
  const calibratedItems = allItems.filter(
    (item) =>
      item.status === "ACTIVE" &&
      item.difficulty !== 0 &&          // non-default = has been calibrated
      item.cefrLevel in CEFR_EXPECTED_B
  );

  const expectedBs  = calibratedItems.map((i) => CEFR_EXPECTED_B[i.cefrLevel]);
  const empiricalBs = calibratedItems.map((i) => i.difficulty);

  const bCorrelation = calibratedItems.length >= 3
    ? Number(pearson(expectedBs, empiricalBs).toFixed(3))
    : null;

  // ── Miscalibration flags ──────────────────────────────────────────────────────
  const miscalibrated = calibratedItems.filter((item) => {
    const delta = Math.abs(CEFR_EXPECTED_B[item.cefrLevel] - item.difficulty);
    return delta > DELTA_THRESHOLD;
  });

  // Group miscalibrated items by CEFR level
  const miscalByLevel: Record<string, number> = {};
  for (const item of miscalibrated) {
    miscalByLevel[item.cefrLevel] = (miscalByLevel[item.cefrLevel] ?? 0) + 1;
  }

  // Per-generator survival if metadata.generatedBy is present
  const byGenerator: Record<string, { total: number; active: number }> = {};
  for (const item of allItems) {
    const meta = item.metadata as Record<string, any> | null;
    const gen = meta?.generatedBy ?? "unknown";
    if (!byGenerator[gen]) byGenerator[gen] = { total: 0, active: 0 };
    byGenerator[gen].total++;
    if (item.status === "ACTIVE") byGenerator[gen].active++;
  }

  const generatorStats = Object.entries(byGenerator).map(([generator, counts]) => ({
    generator,
    total: counts.total,
    active: counts.active,
    survivalRatePct: Number(((counts.active / counts.total) * 100).toFixed(1)),
  })).sort((a, b) => b.total - a.total);

  // ── Point-biserial health for ACTIVE items ────────────────────────────────────
  const activeWithPval = allItems.filter((i) => i.status === "ACTIVE" && i.pVal != null);
  const meanPval        = Number(mean(activeWithPval.map((i) => i.pVal!)).toFixed(3));
  const meanDiscrim     = Number(mean(
    allItems.filter((i) => i.status === "ACTIVE").map((i) => i.discrimination)
  ).toFixed(3));

  // ── Mean b-deviation by CEFR level ───────────────────────────────────────────
  const bDeviationByLevel: Record<string, { n: number; meanDelta: number; rmse: number }> = {};
  for (const level of Object.keys(CEFR_EXPECTED_B)) {
    const items = calibratedItems.filter((i) => i.cefrLevel === level);
    if (items.length === 0) continue;
    const deltas = items.map((i) => i.difficulty - CEFR_EXPECTED_B[level]);
    const meanDelta = mean(deltas);
    const rmse = Math.sqrt(mean(deltas.map((d) => d * d)));
    bDeviationByLevel[level] = {
      n: items.length,
      meanDelta: Number(meanDelta.toFixed(3)),
      rmse: Number(rmse.toFixed(3)),
    };
  }

  // ── Build report ──────────────────────────────────────────────────────────────
  const report = {
    generatedAt: new Date().toISOString(),
    totalItems: total,
    statusBreakdown: byStatus,

    aig: {
      funnelBySkill,
      survivalRatePct,
      generatorStats,
    },

    bParameterCorrelation: {
      calibratedItemsN: calibratedItems.length,
      bCorrelation,
      bDeviationByLevel,
      miscalibratedItems: miscalibrated.length,
      miscalibratedByLevel: miscalByLevel,
      deltaThreshold: DELTA_THRESHOLD,
      interpretation:
        bCorrelation == null
          ? "insufficient data"
          : bCorrelation >= 0.7
          ? "GOOD — LLM difficulty targeting is reliable"
          : bCorrelation >= 0.4
          ? "MODERATE — LLM targeting needs improvement"
          : "POOR — systematic bias; review generation prompts",
    },

    itemQuality: {
      activeCount: byStatus.ACTIVE,
      meanPval,
      meanDiscrimination: meanDiscrim,
    },

    // Top-level summary fields (used by GitHub Actions summary)
    survivalRatePct,
    bCorrelation,
    miscalibratedGenerators: generatorStats.filter((g) => g.survivalRatePct < 30).length,
  };

  if (OUTPUT === "table") {
    console.log("\n=== AIG Quality Report ===");
    console.log(`Total items: ${total}`);
    console.log(`Status: ${JSON.stringify(byStatus)}`);
    console.log(`Survival rate: ${survivalRatePct}%`);
    console.log(`b-correlation: ${bCorrelation}`);
    console.log(`Miscalibrated items: ${miscalibrated.length} (delta > ${DELTA_THRESHOLD})`);
    console.log(`b-deviation by level:`);
    for (const [level, stats] of Object.entries(bDeviationByLevel)) {
      console.log(`  ${level}: n=${stats.n}, mean_delta=${stats.meanDelta}, RMSE=${stats.rmse}`);
    }
    console.log(`\nInterpretation: ${report.bParameterCorrelation.interpretation}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
