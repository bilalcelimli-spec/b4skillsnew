#!/usr/bin/env tsx
/**
 * Read-only, offline. Measures what the current bank delivers per product line
 * and per CEFR band of the true ability — the baseline the bank expansion is
 * judged against (expansion plan, Faz 0).
 *
 *   npx tsx scripts/export-bank-snapshot.ts --output scripts/jobs/.out/bank-baseline/bank-snapshot.json
 *   npx tsx scripts/jobs/bank-baseline-simulation.ts \
 *     [--bank scripts/jobs/.out/bank-baseline/bank-snapshot.json] [--n 400] [--seed 20261114] \
 *     [--profile Corporate] [--output scripts/jobs/.out/bank-baseline/simulation.json]
 *
 * Candidates are drawn uniformly over the profile's θ range (not N(centre, 1))
 * so the edge bands get enough simulees to say something about them.
 *
 * Per band: n, RMSE of the overall θ, CEFR exact accuracy, and the share of
 * simulees whose every section reached its SEM threshold. Per skill: share
 * meeting the section SEM threshold, max exposure, share of items over the
 * profile ceiling. Plus pool fallbacks (a cap that had to be lifted because
 * the pool was too thin).
 *
 * Synthetic responses on prior parameters: this measures the bank's *shape*
 * (how many usable items sit where), not real-candidate accuracy.
 */

delete process.env.REDIS_URL;

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PRODUCT_LINE_PROFILES, getProfile, type ProductLineProfile } from "../../src/lib/product-lines/profiles.js";
import { profileThetaRange } from "../../src/lib/assessment-engine/adaptive-policy.js";
import { buildSyntheticBank, loadBankSnapshot, simulateProfile, type SimuleeResult } from "../../src/lib/assessment-engine/simulation-harness.js";

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};
const bankPath = arg("bank", "scripts/jobs/.out/bank-baseline/bank-snapshot.json");
const n = Number(arg("n", "400"));
const seed = Number(arg("seed", "20261114"));
const output = arg("output", "scripts/jobs/.out/bank-baseline/simulation.json");
const profileArg = arg("profile", "");
const synthetic = Number(arg("synthetic", "0"));
const productive = Number(arg("productive", "12"));

const r3 = (v: number) => Number(v.toFixed(3));

interface BandRow { band: string; n: number; rmse: number; cefrExact: number; allSectionsMetSem: number }

function sectionsMet(sim: SimuleeResult, profile: ProductLineProfile): boolean {
  return profile.sectionOrder.every((skill) => {
    const sem = sim.skillProfiles[skill]?.sem;
    const threshold = profile.sectionConfig[skill]?.semThreshold;
    return sem !== undefined && threshold !== undefined && sem <= threshold + 1e-9;
  });
}

function bandRows(sims: SimuleeResult[], profile: ProductLineProfile): BandRow[] {
  const groups = new Map<string, SimuleeResult[]>();
  for (const sim of sims) groups.set(sim.trueCefr, [...(groups.get(sim.trueCefr) ?? []), sim]);
  const order = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([band, group]) => ({
    band,
    n: group.length,
    rmse: r3(Math.sqrt(group.reduce((s, x) => s + (x.estimatedTheta - x.trueTheta) ** 2, 0) / group.length)),
    cefrExact: r3(group.filter((x) => x.estimatedCefr === x.trueCefr).length / group.length),
    allSectionsMetSem: r3(group.filter((x) => sectionsMet(x, profile)).length / group.length),
  }));
}

async function main(): Promise<void> {
  // --synthetic N: reference bank with N items per receptive cell (25% non-MC, 3-item passages)
  // and --productive M tasks per productive cell; separates "too few items" from "too little information per item".
  const bank = synthetic > 0
    ? buildSyntheticBank({ seed, receptivePerCell: synthetic, productivePerCell: productive })
    : loadBankSnapshot(bankPath);
  const profiles = profileArg ? [getProfile(profileArg)] : Object.values(PRODUCT_LINE_PROFILES);
  const bankLabel = synthetic > 0 ? `synthetic ${synthetic}/${productive} per cell` : bankPath;
  console.log(`bank ${bankLabel} (${bank.items.length} items)  n=${n}/profile  seed=${seed}  θ ~ uniform over profile range`);
  const results = [];
  for (const profile of profiles) {
    const { low, high } = profileThetaRange(profile);
    const report = await simulateProfile(bank, {
      profile, n, seed, sampleTheta: (rng) => low + rng() * (high - low),
    });
    const bands = bandRows(report.simulees, profile);
    const skills = Object.fromEntries(profile.sectionOrder.map((skill) => {
      const threshold = profile.sectionConfig[skill]!.semThreshold;
      const s = report.perSkill[skill];
      const met = report.simulees.filter((x) => (x.skillProfiles[skill]?.sem ?? Infinity) <= threshold + 1e-9).length;
      return [skill, {
        semThreshold: threshold, meanSem: r3(s?.meanSem ?? NaN), metSemShare: r3(met / report.simulees.length),
        meanItems: r3(s?.meanItems ?? 0), eligibleItems: s?.eligibleItems ?? 0, itemsUsed: s?.itemsUsed ?? 0,
        maxExposureRate: r3(s?.maxExposureRate ?? 0), shareOverCeiling: r3(s?.shareOverCeiling ?? 0),
        stopReasons: s?.stopReasons ?? {},
      }];
    }));
    const summary = {
      profile: profile.name, thetaRange: [r3(low), r3(high)], n: report.n, rmse: r3(report.rmse), meanSem: r3(report.meanSem),
      cefrExact: r3(report.cefrExactAccuracy), meanLength: r3(report.meanLength),
      allSectionsMetSem: r3(report.simulees.filter((x) => sectionsMet(x, profile)).length / report.simulees.length),
      maxExposureRate: r3(report.maxExposureRate), shareOverCeiling: r3(report.shareOverCeiling),
      poolFallbacks: report.poolFallbacks, bands, skills,
    };
    results.push(summary);

    console.log(`\n📋 ${profile.name}  rmse ${summary.rmse}  cefr ${summary.cefrExact}  len ${summary.meanLength}  ` +
      `all-sections-SEM ${summary.allSectionsMetSem}  expMax ${summary.maxExposureRate} (ceiling ${profile.maxExposureRate})`);
    console.log(`   bands  ${bands.map((b) => `${b.band}: n${b.n} rmse ${b.rmse} exact ${b.cefrExact} sem✓ ${b.allSectionsMetSem}`).join(" | ")}`);
    for (const [skill, s] of Object.entries(skills)) {
      console.log(`   ${skill.padEnd(11)} sem ${s.meanSem} (≤${s.semThreshold}: ${s.metSemShare})  items ${s.meanItems}  ` +
        `used ${s.itemsUsed}/${s.eligibleItems}  expMax ${s.maxExposureRate}  over ${s.shareOverCeiling}  stops ${JSON.stringify(s.stopReasons)}`);
    }
    if (Object.keys(summary.poolFallbacks).length) console.log(`   fallbacks ${JSON.stringify(summary.poolFallbacks)}`);
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), bank: bankLabel, items: bank.items.length, n, seed, results }, null, 2));
  console.log(`\nwritten: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
