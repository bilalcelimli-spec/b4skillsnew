/**
 * Production-path CAT simulation — the single most important integration test
 * for the adaptive engine.
 *
 * Runs simulated candidates through exactly the code a live session uses
 * (section-flow → CATSelector → AssessmentEngine → stop-rules) on every
 * product-line profile and checks that:
 *
 *   - θ is recovered without systematic bias
 *   - the reported SEM is honest (RMSE ≈ mean SEM)
 *   - CEFR classification is right or adjacent nearly always
 *   - test length stays inside the profile's budget
 *   - the selector never runs out of items on a full bank
 *   - selection stays fast (p95 well under the 300 ms SLO)
 *
 * The bank is the deterministic synthetic one unless
 * test/simulation/fixtures/bank-snapshot.json exists (see
 * scripts/export-bank-snapshot.ts). Tolerances are deliberately wide for the
 * CI sample size; scripts/simulate-adaptive.ts reports the precise numbers.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_LINE_PROFILES } from "../../src/lib/product-lines/profiles";
import {
  buildSyntheticBank,
  loadBankSnapshot,
  simulateProfile,
  summarizeReport,
} from "../../src/lib/assessment-engine/simulation-harness";

const SNAPSHOT = resolve(__dirname, "fixtures/bank-snapshot.json");
const bank = existsSync(SNAPSHOT) ? loadBankSnapshot(SNAPSHOT) : buildSyntheticBank();
const N = Number(process.env.SIM_N ?? 100);

describe(`production-path CAT simulation (${bank.source} bank, n=${N} per profile)`, () => {
  it.each(Object.values(PRODUCT_LINE_PROFILES))("$name recovers θ through the live selection path", async (profile) => {
    const report = await simulateProfile(bank, { profile, n: N, seed: 20261030 });
    // eslint-disable-next-line no-console
    console.log(`[sim] ${profile.name}`, JSON.stringify({
      bias: report.bias.toFixed(3), rmse: report.rmse.toFixed(3), meanSem: report.meanSem.toFixed(3),
      semCalibration: report.semCalibration.toFixed(2), compositeCalibration: report.compositeSemCalibration.toFixed(2),
      cefr: report.cefrExactAccuracy.toFixed(2),
      adjacent: report.cefrAdjacentAccuracy.toFixed(2), meanLength: report.meanLength.toFixed(1),
      maxExposure: report.maxExposureRate.toFixed(2), p95ms: report.selectionLatencyMs.p95.toFixed(1),
      fallbacks: report.poolFallbacks,
    }));

    // Recovery of the construct the pooled EAP estimates (item-weighted skill θ).
    expect(Math.abs(report.compositeBias)).toBeLessThan(0.15);
    expect(report.compositeSemCalibration).toBeGreaterThan(0.75);
    expect(report.compositeSemCalibration).toBeLessThan(1.35);
    // Against the general θ the single overall SEM is over-confident whenever
    // skills differ (roadmap F18); keep it bounded, fix lands with the composite SEM.
    expect(Math.abs(report.bias)).toBeLessThan(0.2);
    expect(report.semCalibration).toBeLessThan(2.3);
    for (const skill of profile.sectionOrder) {
      const summary = report.perSkill[skill]!;
      expect(summary.meanItems).toBeGreaterThanOrEqual(profile.sectionConfig[skill].minItems);
      expect(summary.meanItems).toBeLessThanOrEqual(profile.sectionConfig[skill].maxItems);
      expect(Math.abs(summary.bias)).toBeLessThan(0.25);
      const calibration = summary.rmse / summary.meanSem;
      expect(calibration).toBeGreaterThan(0.7);
      expect(calibration).toBeLessThan(1.4);
    }
    expect(report.cefrAdjacentAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(report.cefrExactAccuracy).toBeGreaterThan(0.55);
    expect(report.maxLength).toBeLessThanOrEqual(profile.globalMaxItems);
    const floor = profile.sectionOrder.reduce((sum, skill) => sum + profile.sectionConfig[skill].minItems, 0);
    expect(report.minLength).toBeGreaterThanOrEqual(floor);
    expect(report.poolFallbacks.pool_exhausted ?? 0).toBe(0);
    expect(report.selectionLatencyMs.p95).toBeLessThan(300);
    // Exposure control must bite: before the Faz 1 gate reorder the top item
    // reached ~1.0 of candidates on this bank. α keeps converging past N and the
    // gate/lottery use Math.random, so this is a regression guard, not the target.
    expect(report.maxExposureRate).toBeLessThan(0.9);
    expect(summarizeReport(report)).not.toHaveProperty("simulees");
  }, 120_000);
});
