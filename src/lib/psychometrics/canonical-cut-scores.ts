/**
 * Canonical CEFR Cut Scores — b4skills Platform
 *
 * This module is the single source of truth for the θ thresholds used to
 * assign CEFR levels to candidates after adaptive testing.
 *
 * CUT SCORE DERIVATION
 * ─────────────────────
 * Cut scores are derived from the Modified Angoff standard-setting panel
 * (2026-05-09) via BCa bootstrapped confidence intervals:
 *
 *   1. Panel data:    src/lib/psychometrics/angoff-panel-data.ts
 *   2. Bootstrap:     src/lib/psychometrics/cut-score-bootstrap.ts
 *   3. This file:     exposes `CANONICAL_CUT_SCORES` (point estimates) and
 *                     `BOOTSTRAP_RESULTS` (full CI table for reporting).
 *
 * USAGE
 * ──────
 *   import { CANONICAL_CUT_SCORES, CEFR_LEVEL_FOR_THETA } from
 *     "./canonical-cut-scores.js";
 *
 *   // θ → CEFR string
 *   const level = CEFR_LEVEL_FOR_THETA(1.25); // → "C1"
 *
 * UPDATE SCHEDULE
 * ────────────────
 * Canonical cut scores must be reviewed annually (1 September each year)
 * per the ALTE Code of Practice §7 and the automated reminder in
 * .github/workflows/annual-standard-review.yml.
 *
 * To update: run `npx tsx scripts/run-standard-setting.ts` after uploading
 * new panel data to angoff-panel-data.ts, then copy the printed θ values here.
 *
 * REVISION HISTORY
 * ─────────────────
 * | Version | Date       | Change                      | Author     |
 * |---------|------------|-----------------------------|------------|
 * | 1.0     | 2026-05-09 | Initial panel, round 1      | B. Çelimli |
 */

import {
  bootstrapAllBoundaries,
  type CutScoreBootstrapResult,
} from "./cut-score-bootstrap.js";
import {
  BOOTSTRAP_BOUNDARY_DATA,
  PANEL_METADATA,
} from "./angoff-panel-data.js";
import type { CefrLevel } from "../assessment-engine/types.js";

// ─── Bootstrap CI table ───────────────────────────────────────────────────────

/**
 * Full BCa bootstrap results for all four boundaries.
 * Computed at module load time (takes ~50ms for 1000 iterations).
 * Cached as a module-level constant — no re-computation per request.
 */
export const BOOTSTRAP_RESULTS: CutScoreBootstrapResult[] =
  bootstrapAllBoundaries(BOOTSTRAP_BOUNDARY_DATA, {
    iterations: 1000,
    seed: 20260509, // panel session date as seed for reproducibility
  });

// ─── Canonical cut scores ─────────────────────────────────────────────────────

/**
 * Point estimate (thetaCut) for each boundary, derived from the bootstrap.
 * These are the operational thresholds used in live scoring.
 *
 * Format: { boundary → thetaCut }
 */
export const CANONICAL_CUT_SCORES: Record<string, number> = Object.fromEntries(
  BOOTSTRAP_RESULTS.map((r) => [r.boundary, r.thetaCut])
);

// ─── CEFR level lookup ────────────────────────────────────────────────────────

/**
 * Ordered boundary list (ascending θ).
 * Each entry: [boundary label, lower bound θ, upper level assigned above θ].
 */
const ORDERED_BOUNDARIES: Array<[string, number, CefrLevel]> = [
  ["A1/A2", CANONICAL_CUT_SCORES["A1/A2"] ?? -1.80, "A2"],
  ["A2/B1", CANONICAL_CUT_SCORES["A2/B1"] ?? -0.90, "B1"],
  ["B1/B2", CANONICAL_CUT_SCORES["B1/B2"] ??  0.00, "B2"],
  ["B2/C1", CANONICAL_CUT_SCORES["B2/C1"] ??  0.90, "C1"],
];

/**
 * Map a final θ estimate to a CEFR level string.
 *
 * @param theta  EAP ability estimate (any finite number)
 * @returns CEFR level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
 *
 * Boundary convention (closed on the right):
 *   θ <  A1/A2  → A1
 *   θ >= A1/A2  → A2
 *   θ >= A2/B1  → B1
 *   θ >= B1/B2  → B2
 *   θ >= B2/C1  → C1
 *   (C2 requires a separate C1/C2 panel — not yet available)
 */
export function CEFR_LEVEL_FOR_THETA(theta: number): CefrLevel {
  let level: CefrLevel = "A1";
  for (const [, cutTheta, upperLevel] of ORDERED_BOUNDARIES) {
    if (theta >= cutTheta) {
      level = upperLevel;
    }
  }
  return level;
}

// ─── Reporting helpers ────────────────────────────────────────────────────────

/** Human-readable summary table of all cut scores (for logs + report endpoints). */
export function formatCutScoreReport(): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════════",
    " b4skills CEFR Cut Score Report",
    ` Panel date: ${PANEL_METADATA.sessionDate}  |  Round: ${PANEL_METADATA.round}`,
    ` Panelists: ${PANEL_METADATA.nPanelists}  |  Items/boundary: ${PANEL_METADATA.nItemsPerBoundary}`,
    "═══════════════════════════════════════════════════════════════",
    "Boundary   θ_cut    CI95_lo  CI95_hi  CI90_lo  CI90_hi  N_pan  ISD",
    "─────────────────────────────────────────────────────────────────",
  ];
  for (const r of BOOTSTRAP_RESULTS) {
    const fmt = (n: number) => n.toFixed(3).padStart(7);
    lines.push(
      `${r.boundary.padEnd(8)}   ${fmt(r.thetaCut)}  ${fmt(r.ci95Lower)}  ${fmt(r.ci95Upper)}  ${fmt(r.ci90Lower)}  ${fmt(r.ci90Upper)}  ${String(r.nPanelists).padStart(5)}  ${r.interRaterSD.toFixed(3)}`
    );
  }
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`Next review: ${PANEL_METADATA.nextReviewDate}`);
  return lines.join("\n");
}

/** Structured JSON payload for the /api/admin/cut-scores endpoint. */
export interface CutScoreApiResponse {
  panelMetadata: typeof PANEL_METADATA;
  boundaries: CutScoreBootstrapResult[];
  canonicalCuts: Record<string, number>;
  generatedAt: string;
}

export function buildCutScoreApiResponse(): CutScoreApiResponse {
  return {
    panelMetadata: PANEL_METADATA,
    boundaries: BOOTSTRAP_RESULTS,
    canonicalCuts: CANONICAL_CUT_SCORES,
    generatedAt: new Date().toISOString(),
  };
}
