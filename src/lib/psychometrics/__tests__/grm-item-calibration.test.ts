import { describe, expect, it } from "vitest";
import { calibrateGrmItem, scoreToCategory } from "../grm-item-calibration";
import { allCategoryProbabilities, rubricToGrmParams, type GrmParameters } from "../graded-response-model";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
function randn(rng: () => number) { const u1 = Math.max(1e-12, rng()), u2 = rng(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }

function simulate(truth: GrmParameters, n: number, seed: number) {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const theta = randn(rng);
    const probs = allCategoryProbabilities(theta, truth);
    let u = rng(); let k = 0;
    for (; k < probs.length - 1; k++) { u -= probs[k]!; if (u <= 0) break; }
    return { theta, category: k };
  });
}

describe("calibrateGrmItem", () => {
  // 5-category task: thresholds are not the synthetic equal spacing the seed assumes.
  const truth: GrmParameters = { a: 1.4, b: [-1.6, -0.4, 0.5, 1.7], categories: 5 };
  const seed = rubricToGrmParams(1.2, 0.0, 5); // equally spaced around 0, a = 1.2

  it("recovers thresholds from a few hundred graded responses with the seed as a weak ridge", () => {
    const obs = simulate(truth, 400, 11);
    const fit = calibrateGrmItem(seed, obs);
    expect(fit.stable).toBe(true);
    expect(fit.n).toBe(400);
    for (let k = 0; k < truth.b.length; k++) {
      expect(Math.abs(fit.params.b[k]! - truth.b[k]!)).toBeLessThan(0.3);
      expect(fit.thresholdSe[k]).not.toBeNull();
      expect(fit.thresholdSe[k]!).toBeLessThan(0.4);
    }
    expect(fit.params.a).toBe(seed.a); // a held at the seed below 500 responses
    expect(fit.aSe).toBeNull();
    expect(fit.logLikelihood).toBeGreaterThan(fit.stable ? -Infinity : 0);
  });

  it("updates discrimination too once n ≥ 500", () => {
    const obs = simulate(truth, 900, 7);
    const fit = calibrateGrmItem(seed, obs);
    expect(fit.stable).toBe(true);
    expect(Math.abs(fit.params.a - truth.a)).toBeLessThan(0.3);
    expect(fit.aSe).not.toBeNull();
  });

  it("refuses below the minimum sample and reports empty categories", () => {
    const few = simulate(truth, 40, 3);
    const out = calibrateGrmItem(seed, few);
    expect(out.stable).toBe(false);
    expect(out.rejectionReason).toMatch(/minN/);
    expect(out.params.b).toEqual(seed.b); // untouched
    const skewed = simulate({ ...truth, b: [-3.5, -3.0, -2.5, -2.0] }, 120, 5); // almost everyone in the top category
    const fit = calibrateGrmItem(seed, skewed);
    expect(fit.emptyCategories.length).toBeGreaterThan(0);
    expect(fit.params.b.every((b, k) => k === 0 || b > fit.params.b[k - 1]!)).toBe(true); // order kept
  });

  it("maps 0–1 scores to categories at the ends and in the middle", () => {
    expect(scoreToCategory(0, 11)).toBe(0);
    expect(scoreToCategory(1, 11)).toBe(10);
    expect(scoreToCategory(0.55, 11)).toBe(6);
    expect(scoreToCategory(1.4, 5)).toBe(4);
  });
});
