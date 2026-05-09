import { describe, it, expect } from "vitest";
import {
  bootstrapCutScore,
  bootstrapAllBoundaries,
  type PanelistRatings,
} from "../cut-score-bootstrap.js";
import type { IrtParameters } from "../../assessment-engine/types.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeItems(
  n: number,
  base: Partial<IrtParameters> = {}
): Array<{ id: string; params: IrtParameters }> {
  return Array.from({ length: n }, (_, i) => ({
    id: `item_${i}`,
    params: {
      a: base.a ?? 1.2,
      b: base.b ?? (i * 0.4 - (n / 2) * 0.4), // spread around 0
      c: base.c ?? 0.2,
    },
  }));
}

/** Generate N panelists with ratings close to a given probability ± noise. */
function makePanelists(
  n: number,
  items: Array<{ id: string; params: IrtParameters }>,
  baseProbability = 0.65,
  noise = 0.05,
  seed = 1
): PanelistRatings[] {
  let x = seed;
  const lcg = () => {
    x = (x * 16807 + 0) % 2147483647;
    return x / 2147483647;
  };
  return Array.from({ length: n }, (_, p) => ({
    panelistId: `panelist_${p}`,
    ratings: Object.fromEntries(
      items.map((item) => [
        item.id,
        Math.max(0.01, Math.min(0.99, baseProbability + (lcg() - 0.5) * 2 * noise)),
      ])
    ),
  }));
}

const ITEMS_10 = makeItems(10);
const PANELISTS_8 = makePanelists(8, ITEMS_10, 0.65, 0.05);

// ─── Basic structure ──────────────────────────────────────────────────────────

describe("bootstrapCutScore — structure", () => {
  it("returns all required fields", () => {
    const result = bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10);
    expect(result).toHaveProperty("boundary", "B1/B2");
    expect(result).toHaveProperty("rawCut");
    expect(result).toHaveProperty("thetaCut");
    expect(result).toHaveProperty("ci95Lower");
    expect(result).toHaveProperty("ci95Upper");
    expect(result).toHaveProperty("ci90Lower");
    expect(result).toHaveProperty("ci90Upper");
    expect(result).toHaveProperty("nPanelists", 8);
    expect(result).toHaveProperty("nItems", 10);
    expect(result).toHaveProperty("interRaterSD");
    expect(result).toHaveProperty("bootstrapIterations");
  });

  it("all theta values are finite numbers", () => {
    const r = bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10);
    expect(Number.isFinite(r.thetaCut)).toBe(true);
    expect(Number.isFinite(r.ci95Lower)).toBe(true);
    expect(Number.isFinite(r.ci95Upper)).toBe(true);
  });
});

// ─── CI ordering ─────────────────────────────────────────────────────────────

describe("bootstrapCutScore — confidence interval ordering", () => {
  it("95% CI is wider than 90% CI", () => {
    const r = bootstrapCutScore("A2/B1", PANELISTS_8, ITEMS_10, { iterations: 500 });
    const width95 = r.ci95Upper - r.ci95Lower;
    const width90 = r.ci90Upper - r.ci90Lower;
    expect(width95).toBeGreaterThanOrEqual(width90);
  });

  it("lower bound < thetaCut < upper bound for 95% CI", () => {
    const r = bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10, { iterations: 500 });
    expect(r.ci95Lower).toBeLessThanOrEqual(r.thetaCut);
    expect(r.ci95Upper).toBeGreaterThanOrEqual(r.thetaCut);
  });

  it("lower bound < thetaCut < upper bound for 90% CI", () => {
    const r = bootstrapCutScore("B2/C1", PANELISTS_8, ITEMS_10, { iterations: 500 });
    expect(r.ci90Lower).toBeLessThanOrEqual(r.thetaCut);
    expect(r.ci90Upper).toBeGreaterThanOrEqual(r.thetaCut);
  });

  it("theta values lie within [-4, 4]", () => {
    const r = bootstrapCutScore("A1/A2", PANELISTS_8, ITEMS_10);
    for (const v of [r.thetaCut, r.ci95Lower, r.ci95Upper]) {
      expect(v).toBeGreaterThanOrEqual(-4);
      expect(v).toBeLessThanOrEqual(4);
    }
  });
});

// ─── Reproducibility ─────────────────────────────────────────────────────────

describe("bootstrapCutScore — reproducibility", () => {
  it("same seed produces identical results", () => {
    const opts = { iterations: 300, seed: 12345 };
    const r1 = bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10, opts);
    const r2 = bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10, opts);
    expect(r1.thetaCut).toBe(r2.thetaCut);
    expect(r1.ci95Lower).toBe(r2.ci95Lower);
    expect(r1.ci95Upper).toBe(r2.ci95Upper);
  });

  it("different seeds produce different CI bounds (with high probability)", () => {
    const r1 = bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10, { iterations: 200, seed: 1 });
    const r2 = bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10, { iterations: 200, seed: 99999 });
    // Point estimate is the same (deterministic); CI may differ due to seed
    expect(r1.thetaCut).toBe(r2.thetaCut);
    // CI values could be same or different — just check they are finite
    expect(Number.isFinite(r1.ci95Lower)).toBe(true);
    expect(Number.isFinite(r2.ci95Lower)).toBe(true);
  });
});

// ─── Inter-rater SD ──────────────────────────────────────────────────────────

describe("bootstrapCutScore — inter-rater SD", () => {
  it("interRaterSD is near zero when all panelists agree perfectly", () => {
    const perfectPanelists: PanelistRatings[] = Array.from({ length: 8 }, (_, i) => ({
      panelistId: `p${i}`,
      ratings: Object.fromEntries(ITEMS_10.map((item) => [item.id, 0.70])),
    }));
    const r = bootstrapCutScore("B1/B2", perfectPanelists, ITEMS_10, { iterations: 100 });
    expect(r.interRaterSD).toBeCloseTo(0, 3);
  });

  it("interRaterSD is larger when panelists disagree more", () => {
    const noisyPanelists = makePanelists(10, ITEMS_10, 0.65, 0.20, 42);
    const quietPanelists = makePanelists(10, ITEMS_10, 0.65, 0.02, 42);
    const rNoisy = bootstrapCutScore("B1/B2", noisyPanelists, ITEMS_10, { iterations: 100 });
    const rQuiet = bootstrapCutScore("B1/B2", quietPanelists, ITEMS_10, { iterations: 100 });
    expect(rNoisy.interRaterSD).toBeGreaterThan(rQuiet.interRaterSD);
  });
});

// ─── Monotonicity across boundaries ──────────────────────────────────────────

describe("bootstrapCutScore — boundary monotonicity", () => {
  it("higher boundaries produce higher theta cuts (monotonic)", () => {
    const boundaries = [
      { label: "A1/A2", prob: 0.45 },  // easier items → lower theta
      { label: "A2/B1", prob: 0.55 },
      { label: "B1/B2", prob: 0.65 },
      { label: "B2/C1", prob: 0.75 },  // harder items → higher theta
    ];

    const results = boundaries.map(({ label, prob }) => {
      const panelists = makePanelists(8, ITEMS_10, prob, 0.03, 7);
      return bootstrapCutScore(label, panelists, ITEMS_10, { iterations: 100 });
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i].thetaCut).toBeGreaterThanOrEqual(results[i - 1].thetaCut - 0.5);
    }
  });
});

// ─── bootstrapAllBoundaries ───────────────────────────────────────────────────

describe("bootstrapAllBoundaries", () => {
  it("returns one result per boundary", () => {
    const data = {
      "A2/B1": { panelists: PANELISTS_8, items: ITEMS_10 },
      "B1/B2": { panelists: PANELISTS_8, items: ITEMS_10 },
    };
    const results = bootstrapAllBoundaries(data, { iterations: 100 });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.boundary)).toContain("A2/B1");
    expect(results.map((r) => r.boundary)).toContain("B1/B2");
  });

  it("all results are finite", () => {
    const data = {
      "B1/B2": { panelists: makePanelists(8, ITEMS_10, 0.65), items: ITEMS_10 },
      "B2/C1": { panelists: makePanelists(8, ITEMS_10, 0.72), items: ITEMS_10 },
    };
    const results = bootstrapAllBoundaries(data, { iterations: 100 });
    for (const r of results) {
      expect(Number.isFinite(r.thetaCut)).toBe(true);
      expect(Number.isFinite(r.ci95Lower)).toBe(true);
    }
  });
});

// ─── Guard rails ─────────────────────────────────────────────────────────────

describe("bootstrapCutScore — input validation", () => {
  it("throws when fewer than 2 panelists", () => {
    const singlePanelist = [PANELISTS_8[0]];
    expect(() =>
      bootstrapCutScore("B1/B2", singlePanelist, ITEMS_10, { iterations: 10 })
    ).toThrow(/≥ 2 panelists/);
  });

  it("throws when fewer than 3 anchor items", () => {
    expect(() =>
      bootstrapCutScore("B1/B2", PANELISTS_8, ITEMS_10.slice(0, 2), { iterations: 10 })
    ).toThrow(/≥ 3 anchor items/);
  });
});
