#!/usr/bin/env tsx
/**
 * Offline simulation of the live adaptive path (no database, no Redis).
 *
 *   npx tsx scripts/simulate-adaptive.ts [--profile "General English"] [--n 500]
 *       [--seed 20261030] [--strategy greedy|lp|both]
 *       [--bank test/simulation/fixtures/bank-snapshot.json]
 *       [--output scripts/jobs/.out/simulation.json]
 *
 * Without --bank a deterministic synthetic bank is used. Without --profile all
 * nine product-line profiles run. `--strategy both` prints a greedy-vs-LP
 * shadow-test comparison for the roadmap Faz 1 A/B decision.
 *
 * Exposure counters live in process memory only; REDIS_URL is cleared so a
 * simulation can never touch deployment exposure state.
 */

delete process.env.REDIS_URL;

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PRODUCT_LINE_PROFILES, getProfile } from "../src/lib/product-lines/profiles.js";
import {
  buildSyntheticBank,
  loadBankSnapshot,
  simulateProfile,
  summarizeReport,
  type SimulationReport,
} from "../src/lib/assessment-engine/simulation-harness.js";
import type { ShadowStrategy } from "../src/lib/selection/cat-selector.js";

const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
};

const n = Number(arg("n", "500"));
const seed = Number(arg("seed", "20261030"));
const strategyArg = arg("strategy", "greedy");
const bankPath = arg("bank", "");
const output = arg("output", "");
const profileArg = arg("profile", "");
const rho = Number(arg("rho", "0.85"));
const verbose = process.argv.includes("--verbose");
/** --prior profile (production: range-centred) | population (legacy N(0,1)). */
const priorMode = arg("prior", "profile");
/** --cohort-sd: SD of simulated candidate ability around the profile centre (default 1). */
const cohortSd = Number(arg("cohort-sd", "1"));

const strategies: ShadowStrategy[] = strategyArg === "both" ? ["greedy", "lp"] : [strategyArg as ShadowStrategy];
const profiles = profileArg ? [getProfile(profileArg)] : Object.values(PRODUCT_LINE_PROFILES);
const bank = bankPath ? loadBankSnapshot(bankPath) : buildSyntheticBank({ seed });

const fmt = (value: number, digits = 3) => value.toFixed(digits);

function printRow(report: SimulationReport): void {
  console.log(
    `${report.profile.padEnd(32)} ${report.shadowStrategy.padEnd(6)} ` +
    `bias ${fmt(report.bias).padStart(7)}  rmse ${fmt(report.rmse)}  sem ${fmt(report.meanSem)}  ` +
    `cal ${fmt(report.semCalibration, 2)}/${fmt(report.compositeSemCalibration, 2)}  cefr ${fmt(report.cefrExactAccuracy, 2)}/${fmt(report.cefrAdjacentAccuracy, 2)}  ` +
    `len ${fmt(report.meanLength, 1).padStart(5)}  expMax ${fmt(report.maxExposureRate, 2)}  ` +
    `p95 ${fmt(report.selectionLatencyMs.p95, 1)}ms`
  );
}

async function main(): Promise<void> {
  console.log(`bank: ${bank.source} (${bank.items.length} items)  n=${n}  seed=${seed}  rho=${rho}  prior=${priorMode}  cohortSd=${cohortSd}`);
  console.log(`${"profile".padEnd(32)} ${"shadow".padEnd(6)} bias     rmse   sem    cal gen/comp  cefr exact/adj  len    expMax  p95`);
  const reports: Array<Omit<SimulationReport, "simulees">> = [];
  for (const profile of profiles) {
    for (const strategy of strategies) {
      const engineConfig = priorMode === "population" ? { priorMean: 0, priorSd: 1 } : {};
      const report = await simulateProfile(bank, { profile, n, seed, shadowStrategy: strategy, skillCorrelation: rho, engineConfig, cohortSd });
      printRow(report);
      if (verbose) {
        for (const [skill, s] of Object.entries(report.perSkill)) {
          console.log(
            `    ${skill.padEnd(11)} bias ${fmt(s.bias).padStart(7)}  rmse ${fmt(s.rmse)}  sem ${fmt(s.meanSem)}  ` +
            `cal ${fmt(s.meanSem > 0 ? s.rmse / s.meanSem : 0, 2)}  items ${fmt(s.meanItems, 1).padStart(4)}  ` +
            `used ${String(s.itemsUsed).padStart(3)}/${String(s.eligibleItems).padEnd(3)}  expMax ${fmt(s.maxExposureRate, 2)}  ` +
            `over ${fmt(s.shareOverCeiling, 2)}  stops ${JSON.stringify(s.stopReasons)}`
          );
        }
      }
      reports.push(summarizeReport(report));
    }
  }
  if (strategies.length === 2) {
    console.log("\nA/B (lp − greedy):");
    for (const profile of profiles) {
      const g = reports.find((r) => r.profile === profile.name && r.shadowStrategy === "greedy")!;
      const l = reports.find((r) => r.profile === profile.name && r.shadowStrategy === "lp")!;
      console.log(
        `${profile.name.padEnd(32)} Δrmse ${fmt(l.rmse - g.rmse)}  Δsem ${fmt(l.meanSem - g.meanSem)}  ` +
        `Δlen ${fmt(l.meanLength - g.meanLength, 1)}  ΔexpMax ${fmt(l.maxExposureRate - g.maxExposureRate, 2)}  ` +
        `Δp95 ${fmt(l.selectionLatencyMs.p95 - g.selectionLatencyMs.p95, 1)}ms`
      );
    }
  }
  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), bank: { source: bank.source, items: bank.items.length }, n, seed, reports }, null, 2));
    console.log(`\nwritten: ${output}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
