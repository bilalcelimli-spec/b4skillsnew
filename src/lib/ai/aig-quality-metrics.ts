/**
 * AIG Quality Metrics
 *
 * Tracks the quality of items produced by the Automatic Item Generation
 * pipeline through three lenses:
 *
 *   1. **Survival funnel**: GENERATED → PRETEST → ACTIVE conversion rates
 *   2. **CEFR alignment**: Pearson r between LLM-predicted b (from CEFR norm
 *      targets) and empirical b after calibration (Gierl & Haladyna 2013, §8)
 *   3. **Parameter deviation**: per-item Δb = empirical_b − predicted_b
 *
 * References:
 *   Gierl & Haladyna (2013), Automatic Item Generation, §8.4
 *   Drasgow et al. (2006), IRT-based item quality statistics for AIG
 */

import { prisma } from "../prisma.js";
import { getIrtNorm } from "../language-skills/item-writing-framework.js";
import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AigFunnelStats {
  /** Items currently sitting at DRAFT / AUTO_QA stage */
  draft: number;
  /** Items with status REVIEW (expert queue) */
  review: number;
  /** Items with status PRETEST (collecting field responses) */
  pretest: number;
  /** Items with status ACTIVE (calibrated, live) */
  active: number;
  /** Items with status RETIRED */
  retired: number;
  /** Conversion rate: pretest / (pretest + active + retired) */
  pretestSurvivalRate: number | null;
  /** Conversion rate: active / (active + retired) — items that passed calibration */
  calibrationSurvivalRate: number | null;
}

export interface CefrAlignmentStats {
  /** Number of ACTIVE items with a known CEFR target b */
  n: number;
  /** Pearson r between predicted_b and empirical_b */
  pearsonR: number | null;
  /** Mean absolute error |empirical_b − predicted_b| */
  mae: number | null;
  /** Root mean square error */
  rmse: number | null;
  /** Per-CEFR-level breakdown */
  byLevel: Record<string, {
    n: number;
    predictedBMean: number;
    empiricalBMean: number;
    mae: number;
  }>;
}

export interface ItemParameterDeviation {
  itemId: string;
  skill: string;
  cefrLevel: string;
  predictedB: number;
  empiricalB: number;
  deltaB: number;
  /** True if |deltaB| > 1.0 logit (large misalignment) */
  flagged: boolean;
}

export interface AigQualityReport {
  generatedAt: string;
  funnel: AigFunnelStats;
  cefrAlignment: CefrAlignmentStats;
  /** Items with |Δb| > 1.0 logit — candidates for prompt revision */
  largeDeviations: ItemParameterDeviation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pearsonR(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  const denom = Math.sqrt(sx * sy);
  return denom === 0 ? null : Number((cov / denom).toFixed(4));
}

/** CEFR level → target b-parameter from IRT norms table */
function predictedB(cefrLevel: string): number | null {
  const norm = getIrtNorm(cefrLevel as CefrLevel);
  return norm ? norm.b.target : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const AigQualityMetrics = {
  async getReport(organizationId?: string): Promise<AigQualityReport> {
    const orgFilter = organizationId ? { organizationId } : {};

    // 1 — Funnel counts
    const [draft, review, pretest, active, retired] = await Promise.all([
      prisma.item.count({ where: { ...orgFilter, status: "DRAFT" } }),
      prisma.item.count({ where: { ...orgFilter, status: "REVIEW" } }),
      prisma.item.count({ where: { ...orgFilter, status: "PRETEST" } }),
      prisma.item.count({ where: { ...orgFilter, status: "ACTIVE" } }),
      prisma.item.count({ where: { ...orgFilter, status: "RETIRED" } }),
    ]);

    const pretestTotal = pretest + active + retired;
    const pretestSurvivalRate = pretestTotal > 0
      ? Number(((active + retired) / pretestTotal).toFixed(4)) // reached calibration
      : null;
    const calibrationTotal = active + retired;
    const calibrationSurvivalRate = calibrationTotal > 0
      ? Number((active / calibrationTotal).toFixed(4))
      : null;

    const funnel: AigFunnelStats = {
      draft, review, pretest, active, retired,
      pretestSurvivalRate,
      calibrationSurvivalRate,
    };

    // 2 — CEFR alignment: compare IRT norm target_b to empirical b for ACTIVE items
    const activeItems = await prisma.item.findMany({
      where: { ...orgFilter, status: "ACTIVE" },
      select: { id: true, skill: true, cefrLevel: true, difficulty: true },
    });

    const deviations: ItemParameterDeviation[] = [];
    const predictedBs: number[] = [];
    const empiricalBs: number[] = [];
    const byLevel: Record<string, { n: number; deltaBSum: number; predictedBSum: number; empiricalBSum: number }> = {};

    for (const item of activeItems) {
      const pb = predictedB(item.cefrLevel);
      if (pb === null) continue; // PRE_A1 — no norm defined

      const eb = item.difficulty;
      const delta = eb - pb;

      predictedBs.push(pb);
      empiricalBs.push(eb);

      if (!byLevel[item.cefrLevel]) {
        byLevel[item.cefrLevel] = { n: 0, deltaBSum: 0, predictedBSum: 0, empiricalBSum: 0 };
      }
      byLevel[item.cefrLevel].n++;
      byLevel[item.cefrLevel].deltaBSum += Math.abs(delta);
      byLevel[item.cefrLevel].predictedBSum += pb;
      byLevel[item.cefrLevel].empiricalBSum += eb;

      deviations.push({
        itemId: item.id,
        skill: item.skill,
        cefrLevel: item.cefrLevel,
        predictedB: pb,
        empiricalB: Number(eb.toFixed(3)),
        deltaB: Number(delta.toFixed(3)),
        flagged: Math.abs(delta) > 1.0,
      });
    }

    const n = predictedBs.length;
    let mae: number | null = null;
    let rmse: number | null = null;

    if (n > 0) {
      const absDeltas = deviations.map((d) => Math.abs(d.deltaB));
      mae = Number((absDeltas.reduce((a, b) => a + b, 0) / n).toFixed(4));
      rmse = Number(Math.sqrt(
        deviations.reduce((s, d) => s + d.deltaB ** 2, 0) / n
      ).toFixed(4));
    }

    const byLevelSummary: CefrAlignmentStats["byLevel"] = {};
    for (const [level, stats] of Object.entries(byLevel)) {
      byLevelSummary[level] = {
        n: stats.n,
        predictedBMean: Number((stats.predictedBSum / stats.n).toFixed(3)),
        empiricalBMean: Number((stats.empiricalBSum / stats.n).toFixed(3)),
        mae: Number((stats.deltaBSum / stats.n).toFixed(3)),
      };
    }

    const cefrAlignment: CefrAlignmentStats = {
      n,
      pearsonR: pearsonR(predictedBs, empiricalBs),
      mae,
      rmse,
      byLevel: byLevelSummary,
    };

    return {
      generatedAt: new Date().toISOString(),
      funnel,
      cefrAlignment,
      largeDeviations: deviations.filter((d) => d.flagged),
    };
  },
};
