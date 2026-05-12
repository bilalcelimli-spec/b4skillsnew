/**
 * Concurrent Validity Study Infrastructure
 *
 * Provides tooling to collect, store, and analyse concurrent validity evidence —
 * the correlation between LinguAdapt θ estimates and external criterion scores
 * (IELTS, TOEFL, Cambridge, TOEIC, etc.).
 *
 * Why this matters
 * ----------------
 * Concurrent validity is a core component of the Kane (2013) validity argument
 * under the "extrapolation" inference: we must demonstrate that LinguAdapt
 * scores predict/align with criterion-referenced measures taken around the same
 * time. A Pearson r ≥ 0.85 with IELTS/TOEFL is the industry benchmark for
 * high-stakes certification.
 *
 * What this module provides
 * -------------------------
 * 1. `submitExternalScore()` — record a candidate's external test result
 *    alongside the matching LinguAdapt session
 * 2. `runConcurrentValidityAnalysis()` — compute Pearson r, Spearman ρ,
 *    CEFR agreement rate, and Bland-Altman limits of agreement
 * 3. `getConcurrentValiditySummary()` — dashboard-ready summary per external test
 *
 * Statistical methods
 * -------------------
 * - Pearson r:     parametric linear correlation (θ vs. criterion)
 * - Spearman ρ:    rank-based; robust to non-normality and outliers
 * - CEFR agreement: % of pairs where LinguAdapt CEFR = criterion CEFR (or ±1)
 * - Bland-Altman:  mean difference ± 1.96×SD of differences (method agreement)
 *
 * References
 * ----------
 * Kane, M. T. (2013). Validating the interpretations and uses of test scores.
 *   Journal of Educational Measurement, 50(1), 1–73.
 *
 * Bland, J. M., & Altman, D. G. (1986). Statistical methods for assessing
 *   agreement between two methods of clinical measurement. The Lancet, 327, 307–310.
 */

import { prisma } from "../prisma.js";
import { logger } from "../observability/logger.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** θ cut-scores per CEFR level (must match canonical-cut-scores.ts) */
const THETA_TO_CEFR: Array<{ min: number; level: string }> = [
  { min: 2.5, level: "C2" },
  { min: 1.5, level: "C1" },
  { min: 0.5, level: "B2" },
  { min: -0.5, level: "B1" },
  { min: -1.75, level: "A2" },
  { min: -3.0, level: "A1" },
  { min: -Infinity, level: "PRE_A1" },
];

const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExternalTestName =
  | "IELTS"
  | "TOEFL_IBT"
  | "TOEFL_JUNIOR"
  | "CAMBRIDGE_KET"
  | "CAMBRIDGE_PET"
  | "CAMBRIDGE_FCE"
  | "CAMBRIDGE_CAE"
  | "CAMBRIDGE_CPE"
  | "TOEIC"
  | "DUOLINGO"
  | "OTHER";

export interface ExternalScoreSubmission {
  candidateId: string;
  organizationId: string;
  /** LinguAdapt session taken within ±30 days of the external test */
  sessionId: string;
  externalTest: ExternalTestName;
  /** Raw score on the external test (e.g. IELTS band 6.5, TOEFL 95) */
  rawScore: number;
  /** CEFR level reported by the external test provider */
  externalCefrLevel?: string;
  /** Date the external test was taken */
  externalTestDate: Date;
  /** Source of the data: SELF_REPORT or VERIFIED (official document) */
  dataSource: "SELF_REPORT" | "VERIFIED";
}

export interface ConcurrentValidityPair {
  candidateId: string;
  sessionId: string;
  sessionTheta: number;
  sessionCefr: string;
  externalTest: ExternalTestName;
  externalRawScore: number;
  externalCefrLevel: string;
  /** Normalised criterion score mapped to θ scale for comparison */
  criterionTheta: number;
  daysBetweenTests: number;
}

export interface ConcurrentValidityAnalysis {
  externalTest: ExternalTestName;
  n: number;
  /** Pearson correlation: LinguAdapt θ vs. criterion score */
  pearsonR: number;
  /** Spearman rank correlation */
  spearmanRho: number;
  /** % of pairs where CEFR levels agree exactly */
  exactCefrAgreement: number;
  /** % of pairs where CEFR levels agree within ±1 level */
  adjacentCefrAgreement: number;
  /** Bland-Altman mean difference (LinguAdapt − criterion, on θ scale) */
  blandAltmanMeanDiff: number;
  /** Bland-Altman 95% limits of agreement */
  blandAltmanLoA: { lower: number; upper: number };
  /** Individual data points (for scatter plot) */
  pairs: ConcurrentValidityPair[];
}

// ─── Normalisation: external score → θ scale ─────────────────────────────────

/**
 * Map a raw external score to an approximate θ value using published
 * test-score-to-CEFR tables, then convert CEFR mid-point to θ.
 *
 * This allows Bland-Altman analysis on a common scale.
 */
function externalScoreToTheta(
  test: ExternalTestName,
  rawScore: number,
  cefrLevel?: string
): number {
  // If the external provider reported a CEFR level, use CEFR mid-point
  if (cefrLevel && CEFR_ORDER.includes(cefrLevel)) {
    const midpoints: Record<string, number> = {
      PRE_A1: -3.5,
      A1: -2.375,
      A2: -1.125,
      B1: 0.0,
      B2: 1.0,
      C1: 2.0,
      C2: 3.0,
    };
    return midpoints[cefrLevel] ?? 0;
  }

  // Fallback: map raw score via known equivalence tables
  switch (test) {
    case "IELTS": {
      // IELTS 0–9 → θ linear approximation (0=PRE_A1 → -3.5, 9=C2 → 3.0)
      const clamped = Math.max(0, Math.min(9, rawScore));
      return -3.5 + (clamped / 9) * 6.5;
    }
    case "TOEFL_IBT": {
      // TOEFL 0–120 → θ
      const clamped = Math.max(0, Math.min(120, rawScore));
      return -3.5 + (clamped / 120) * 6.5;
    }
    case "TOEIC": {
      // TOEIC 10–990 → θ
      const clamped = Math.max(10, Math.min(990, rawScore));
      return -3.5 + ((clamped - 10) / 980) * 6.5;
    }
    case "DUOLINGO": {
      // DET 10–160 → θ
      const clamped = Math.max(10, Math.min(160, rawScore));
      return -3.5 + ((clamped - 10) / 150) * 6.5;
    }
    default:
      return 0;
  }
}

function thetaToCefr(theta: number): string {
  for (const { min, level } of THETA_TO_CEFR) {
    if (theta >= min) return level;
  }
  return "PRE_A1";
}

// ─── Statistics helpers ───────────────────────────────────────────────────────

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, sdx = 0, sdy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    sdx += (xs[i] - mx) ** 2;
    sdy += (ys[i] - my) ** 2;
  }
  const denom = Math.sqrt(sdx * sdy);
  return denom > 0 ? num / denom : 0;
}

function spearmanRho(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const rankOf = (arr: number[]) =>
    arr
      .map((v, i) => ({ v, i }))
      .sort((a, b) => a.v - b.v)
      .map((item, rank) => ({ rank: rank + 1, i: item.i }))
      .sort((a, b) => a.i - b.i)
      .map((item) => item.rank);
  const rx = rankOf(xs);
  const ry = rankOf(ys);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

function blandAltman(
  a: number[],
  b: number[]
): { meanDiff: number; loa: { lower: number; upper: number } } {
  const diffs = a.map((v, i) => v - b[i]);
  const meanDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const sd = Math.sqrt(
    diffs.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (diffs.length - 1 || 1)
  );
  return {
    meanDiff,
    loa: { lower: meanDiff - 1.96 * sd, upper: meanDiff + 1.96 * sd },
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const ConcurrentValidityService = {
  /**
   * Submit an external test score linked to a LinguAdapt session.
   * Stored in session metadata under the `concurrentValidity` key.
   */
  async submitExternalScore(
    submission: ExternalScoreSubmission
  ): Promise<{ id: string }> {
    const session = await prisma.session.findFirst({
      where: { id: submission.sessionId, candidateId: submission.candidateId },
      select: { id: true, metadata: true },
    });
    if (!session) throw new Error("Session not found or does not belong to candidate");

    const existing = (session.metadata as any) ?? {};
    const entries: unknown[] = Array.isArray(existing.concurrentValidity)
      ? existing.concurrentValidity
      : [];

    entries.push({
      ...submission,
      submittedAt: new Date().toISOString(),
    });

    await prisma.session.update({
      where: { id: session.id },
      data: { metadata: { ...existing, concurrentValidity: entries } },
    });

    logger.info(
      {
        candidateId: submission.candidateId,
        sessionId: submission.sessionId,
        externalTest: submission.externalTest,
        rawScore: submission.rawScore,
      },
      "concurrent_validity.score_submitted"
    );

    return { id: session.id };
  },

  /**
   * Run concurrent validity analysis for a specific external test.
   *
   * Pulls all sessions in the org that have matching external scores,
   * computes Pearson r, Spearman ρ, CEFR agreement, and Bland-Altman.
   */
  async runAnalysis(
    organizationId: string,
    externalTest: ExternalTestName,
    options: {
      /** Only include pairs where external test was taken within N days of LinguAdapt */
      maxDaysBetweenTests?: number;
      /** Only include VERIFIED source data */
      verifiedOnly?: boolean;
    } = {}
  ): Promise<ConcurrentValidityAnalysis> {
    const { maxDaysBetweenTests = 30, verifiedOnly = false } = options;

    const sessions = await prisma.session.findMany({
      where: { organizationId, status: "COMPLETED" },
      select: {
        id: true,
        candidateId: true,
        theta: true,
        cefrLevel: true,
        completedAt: true,
        metadata: true,
      },
    });

    const pairs: ConcurrentValidityPair[] = [];

    for (const s of sessions) {
      const meta = (s.metadata as any) ?? {};
      const cvEntries: unknown[] = Array.isArray(meta.concurrentValidity)
        ? meta.concurrentValidity
        : [];

      for (const entry of cvEntries as ExternalScoreSubmission[]) {
        if (entry.externalTest !== externalTest) continue;
        if (verifiedOnly && entry.dataSource !== "VERIFIED") continue;

        const testDate = new Date(entry.externalTestDate);
        const daysDiff = s.completedAt
          ? Math.abs(
              (s.completedAt.getTime() - testDate.getTime()) /
                (24 * 60 * 60 * 1000)
            )
          : 9999;
        if (daysDiff > maxDaysBetweenTests) continue;

        const sessionCefr = s.cefrLevel ?? thetaToCefr(s.theta);
        const externalCefr =
          entry.externalCefrLevel ?? thetaToCefr(externalScoreToTheta(externalTest, entry.rawScore));
        const criterionTheta = externalScoreToTheta(
          externalTest,
          entry.rawScore,
          entry.externalCefrLevel
        );

        pairs.push({
          candidateId: s.candidateId,
          sessionId: s.id,
          sessionTheta: s.theta,
          sessionCefr,
          externalTest,
          externalRawScore: entry.rawScore,
          externalCefrLevel: externalCefr,
          criterionTheta,
          daysBetweenTests: Math.round(daysDiff),
        });
      }
    }

    if (pairs.length < 3) {
      return {
        externalTest,
        n: pairs.length,
        pearsonR: 0,
        spearmanRho: 0,
        exactCefrAgreement: 0,
        adjacentCefrAgreement: 0,
        blandAltmanMeanDiff: 0,
        blandAltmanLoA: { lower: 0, upper: 0 },
        pairs,
      };
    }

    const linguaThetas = pairs.map((p) => p.sessionTheta);
    const criterionThetas = pairs.map((p) => p.criterionTheta);

    const r = pearsonR(linguaThetas, criterionThetas);
    const rho = spearmanRho(linguaThetas, criterionThetas);
    const ba = blandAltman(linguaThetas, criterionThetas);

    const exactAgreement =
      pairs.filter((p) => p.sessionCefr === p.externalCefrLevel).length /
      pairs.length;

    const adjacentAgreement =
      pairs.filter((p) => {
        const liIdx = CEFR_ORDER.indexOf(p.sessionCefr);
        const exIdx = CEFR_ORDER.indexOf(p.externalCefrLevel);
        return liIdx >= 0 && exIdx >= 0 && Math.abs(liIdx - exIdx) <= 1;
      }).length / pairs.length;

    logger.info(
      {
        organizationId,
        externalTest,
        n: pairs.length,
        pearsonR: r.toFixed(3),
        spearmanRho: rho.toFixed(3),
        exactCefrAgreement: exactAgreement.toFixed(3),
      },
      "concurrent_validity.analysis_complete"
    );

    return {
      externalTest,
      n: pairs.length,
      pearsonR: Number(r.toFixed(3)),
      spearmanRho: Number(rho.toFixed(3)),
      exactCefrAgreement: Number(exactAgreement.toFixed(3)),
      adjacentCefrAgreement: Number(adjacentAgreement.toFixed(3)),
      blandAltmanMeanDiff: Number(ba.meanDiff.toFixed(3)),
      blandAltmanLoA: {
        lower: Number(ba.loa.lower.toFixed(3)),
        upper: Number(ba.loa.upper.toFixed(3)),
      },
      pairs,
    };
  },

  /**
   * Cross-test summary: run analysis for all external tests with ≥3 pairs.
   */
  async getSummary(organizationId: string): Promise<{
    byTest: ConcurrentValidityAnalysis[];
    overallR: number;
    totalPairs: number;
  }> {
    const tests: ExternalTestName[] = [
      "IELTS",
      "TOEFL_IBT",
      "TOEFL_JUNIOR",
      "CAMBRIDGE_FCE",
      "CAMBRIDGE_CAE",
      "TOEIC",
      "DUOLINGO",
    ];

    const byTest = await Promise.all(
      tests.map((t) => this.runAnalysis(organizationId, t))
    );

    const withData = byTest.filter((r) => r.n >= 3);
    const totalPairs = withData.reduce((a, r) => a + r.n, 0);
    const overallR =
      withData.length > 0
        ? withData.reduce((a, r) => a + r.pearsonR * r.n, 0) / totalPairs
        : 0;

    return { byTest: withData, overallR: Number(overallR.toFixed(3)), totalPairs };
  },
};
