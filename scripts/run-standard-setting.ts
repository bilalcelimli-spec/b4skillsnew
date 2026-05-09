#!/usr/bin/env tsx
/**
 * Standard Setting Run Script
 *
 * Computes BCa bootstrap confidence intervals for all CEFR boundaries
 * from the official Angoff panel data and prints a formatted report.
 *
 * Usage:
 *   npx tsx scripts/run-standard-setting.ts
 *   npx tsx scripts/run-standard-setting.ts --json        # JSON output
 *   npx tsx scripts/run-standard-setting.ts --iterations 2000
 *
 * The output θ values should be verified by the Assessment Director and,
 * if accepted, pasted into canonical-cut-scores.ts as the operational
 * thresholds. The script itself does NOT overwrite any files.
 *
 * See docs/validity-argument.md §5 (Inference 5 — Cut Score) for the
 * evidence chain this script supports.
 */

import {
  bootstrapAllBoundaries,
} from "../src/lib/psychometrics/cut-score-bootstrap.js";
import {
  BOOTSTRAP_BOUNDARY_DATA,
  PANEL_METADATA,
} from "../src/lib/psychometrics/angoff-panel-data.js";

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const iterIdx = args.indexOf("--iterations");
const iterations = iterIdx >= 0 ? parseInt(args[iterIdx + 1], 10) : 1000;
const seed = 20260509; // canonical seed — matches canonical-cut-scores.ts

// ─── Run bootstrap ────────────────────────────────────────────────────────────

console.error(`\n[standard-setting] Running BCa bootstrap...`);
console.error(`  Boundaries : ${Object.keys(BOOTSTRAP_BOUNDARY_DATA).join(", ")}`);
console.error(`  Iterations : ${iterations}`);
console.error(`  Seed       : ${seed}`);
console.error(`  Panelists  : ${PANEL_METADATA.nPanelists}`);
console.error(`  Items/bnd  : ${PANEL_METADATA.nItemsPerBoundary}`);
console.error(`  Panel date : ${PANEL_METADATA.sessionDate}\n`);

const t0 = Date.now();
const results = bootstrapAllBoundaries(BOOTSTRAP_BOUNDARY_DATA, {
  iterations,
  seed,
});
const elapsed = Date.now() - t0;

console.error(`[standard-setting] Done in ${elapsed}ms.\n`);

// ─── Output ───────────────────────────────────────────────────────────────────

if (jsonMode) {
  const out = {
    panelMetadata: PANEL_METADATA,
    bootstrapConfig: { iterations, seed },
    results: results.map((r) => ({
      boundary: r.boundary,
      thetaCut: +r.thetaCut.toFixed(4),
      ci95: { lower: +r.ci95Lower.toFixed(4), upper: +r.ci95Upper.toFixed(4) },
      ci90: { lower: +r.ci90Lower.toFixed(4), upper: +r.ci90Upper.toFixed(4) },
      rawCut: +r.rawCut.toFixed(4),
      nPanelists: r.nPanelists,
      nItems: r.nItems,
      interRaterSD: +r.interRaterSD.toFixed(4),
    })),
    generatedAt: new Date().toISOString(),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
} else {
  const hr = "═".repeat(70);
  const sep = "─".repeat(70);
  const fmt = (n: number) => n.toFixed(3).padStart(7);

  console.log(`\n${hr}`);
  console.log(` b4skills Standard Setting Results`);
  console.log(` Panel: ${PANEL_METADATA.sessionDate}  |  Methodology: ${PANEL_METADATA.methodology}`);
  console.log(` Panelists: ${PANEL_METADATA.nPanelists}  |  Items/boundary: ${PANEL_METADATA.nItemsPerBoundary}`);
  console.log(` Bootstrap: ${iterations} iterations, seed ${seed}`);
  console.log(hr);
  console.log(
    "Boundary   θ_cut    95%CI_lo 95%CI_hi 90%CI_lo 90%CI_hi  rawCut  ISD   N"
  );
  console.log(sep);

  for (const r of results) {
    console.log(
      `${r.boundary.padEnd(8)}   ${fmt(r.thetaCut)}  ${fmt(r.ci95Lower)}  ${fmt(r.ci95Upper)}  ${fmt(r.ci90Lower)}  ${fmt(r.ci90Upper)}  ${fmt(r.rawCut)}  ${r.interRaterSD.toFixed(3)}  ${r.nPanelists}`
    );
  }

  console.log(sep);
  console.log(
    "\nINTERPRETATION:"
  );
  console.log("  θ_cut  = canonical IRT ability threshold for this boundary");
  console.log("  95%CI  = BCa 95% confidence interval (Efron 1987)");
  console.log("  rawCut = mean Angoff raw cut (∑ p̄_i across items)");
  console.log("  ISD    = inter-rater SD of panelist-level raw cuts");

  console.log(`\nCANONICAL THRESHOLDS (paste into canonical-cut-scores.ts):`);
  console.log("  CANONICAL_CUT_SCORES = {");
  for (const r of results) {
    console.log(`    "${r.boundary}": ${r.thetaCut.toFixed(4)},  // 95%CI [${r.ci95Lower.toFixed(3)}, ${r.ci95Upper.toFixed(3)}]`);
  }
  console.log("  }");

  console.log(`\n${hr}`);
  console.log(` Next review: ${PANEL_METADATA.nextReviewDate}`);
  console.log(` Evidence chain: docs/validity-argument.md §5`);
  console.log(hr + "\n");
}
