import { describe, it, expect } from "vitest";
import { estimateTheta } from "../estimator";
import { probability } from "../irt";
import { SkillType, type Item, type Response, type IrtParameters } from "../types";

const makeItem = (id: string, a: number, b: number, c: number, isPretest = false): Item => ({
  id,
  skill: SkillType.READING,
  params: { a, b, c },
  isPretest,
});

const makeItems = (defs: Array<[string, number, number, number]>): Record<string, Item> => {
  const out: Record<string, Item> = {};
  for (const [id, a, b, c] of defs) out[id] = makeItem(id, a, b, c);
  return out;
};

/** Seedable PRNG so simulations are reproducible across CI runs */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulate a dichotomous response from a candidate with given true theta
 * for an item with given IRT params.
 */
function simulateResponse(theta: number, params: IrtParameters, rng: () => number): number {
  return rng() < probability(theta, params) ? 1 : 0;
}

describe("EAP estimator — boundary conditions", () => {
  it("returns prior mean & sd when no responses given", () => {
    const { theta, sem } = estimateTheta([], {}, 0, 1);
    expect(theta).toBe(0);
    expect(sem).toBe(1);
  });

  it("respects custom prior mean / sd when no responses", () => {
    const { theta, sem } = estimateTheta([], {}, -0.5, 1.2);
    expect(theta).toBe(-0.5);
    expect(sem).toBe(1.2);
  });

  it("returns prior when all responses are pretest items", () => {
    const items = makeItems([["i1", 1, 0, 0]]);
    items["i1"].isPretest = true;
    const responses: Response[] = [{ itemId: "i1", score: 1, isPretest: true }];
    const { theta, sem } = estimateTheta(responses, items, 0.3, 1);
    expect(theta).toBe(0.3);
    expect(sem).toBe(1);
  });
});

describe("EAP estimator — single-response sanity", () => {
  it("correct response on a hard item shifts theta upward from prior", () => {
    const items = makeItems([["i1", 1.5, 1.0, 0.1]]);
    const { theta } = estimateTheta(
      [{ itemId: "i1", score: 1 }],
      items,
      0,
      1
    );
    expect(theta).toBeGreaterThan(0);
  });

  it("incorrect response on an easy item shifts theta downward from prior", () => {
    const items = makeItems([["i1", 1.5, -1.0, 0.1]]);
    const { theta } = estimateTheta(
      [{ itemId: "i1", score: 0 }],
      items,
      0,
      1
    );
    expect(theta).toBeLessThan(0);
  });

  it("SEM decreases as more (consistent) responses accumulate", () => {
    const items = makeItems([
      ["i1", 1.5, 0, 0.1],
      ["i2", 1.5, 0.5, 0.1],
      ["i3", 1.5, 1.0, 0.1],
      ["i4", 1.5, -0.5, 0.1],
      ["i5", 1.5, -1.0, 0.1],
    ]);
    const all: Response[] = [
      { itemId: "i1", score: 1 },
      { itemId: "i2", score: 1 },
      { itemId: "i3", score: 1 },
      { itemId: "i4", score: 1 },
      { itemId: "i5", score: 1 },
    ];
    const sem1 = estimateTheta(all.slice(0, 1), items, 0, 1).sem;
    const sem3 = estimateTheta(all.slice(0, 3), items, 0, 1).sem;
    const sem5 = estimateTheta(all, items, 0, 1).sem;
    expect(sem3).toBeLessThan(sem1);
    expect(sem5).toBeLessThan(sem3);
  });
});

describe("EAP estimator — parameter recovery (Monte Carlo)", () => {
  it("recovers true theta to within bias < 0.10 and RMSE < 0.50 on 30-item test", () => {
    const rng = mulberry32(424242);
    const N_SIMULEES = 200;
    const N_ITEMS = 30;

    // Build a balanced 30-item bank spanning b ∈ [-2.5, 2.5]
    const items: Record<string, Item> = {};
    for (let k = 0; k < N_ITEMS; k++) {
      const b = -2.5 + (5 * k) / (N_ITEMS - 1);
      items[`i${k}`] = makeItem(`i${k}`, 1.2, b, 0.15);
    }

    // True theta drawn from N(0,1); we'll use a deterministic spread to make the
    // CI variance-free.
    const trueThetas: number[] = [];
    for (let i = 0; i < N_SIMULEES; i++) {
      // Inverse-CDF on uniform: use Box–Muller
      const u1 = Math.max(1e-9, rng());
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      trueThetas.push(z);
    }

    const errors: number[] = [];
    for (const trueTheta of trueThetas) {
      const responses: Response[] = Object.values(items).map(item => ({
        itemId: item.id,
        score: simulateResponse(trueTheta, item.params, rng),
      }));
      const { theta } = estimateTheta(responses, items, 0, 1);
      errors.push(theta - trueTheta);
    }

    const bias = errors.reduce((a, b) => a + b, 0) / errors.length;
    const rmse = Math.sqrt(
      errors.reduce((a, e) => a + e * e, 0) / errors.length
    );

    expect(Math.abs(bias)).toBeLessThan(0.10);
    expect(rmse).toBeLessThan(0.50);
  });

  it("estimator with informative prior beats flat prior on short tests", () => {
    const rng = mulberry32(99999);
    const N_SIMULEES = 200;
    const N_ITEMS = 5;

    // Cohort centred at theta = 0.5 (e.g. corporate B1+ pool)
    const cohortMean = 0.5;
    const cohortSd = 0.5;

    // Item bank centred slightly below the cohort
    const items: Record<string, Item> = {};
    for (let k = 0; k < N_ITEMS; k++) {
      items[`i${k}`] = makeItem(`i${k}`, 1.2, -1 + 0.5 * k, 0.15);
    }

    const errsFlat: number[] = [];
    const errsInformative: number[] = [];
    for (let i = 0; i < N_SIMULEES; i++) {
      // Sample candidate's true theta from cohort
      const u1 = Math.max(1e-9, rng());
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const trueTheta = cohortMean + cohortSd * z;

      const responses: Response[] = Object.values(items).map(item => ({
        itemId: item.id,
        score: simulateResponse(trueTheta, item.params, rng),
      }));

      errsFlat.push(estimateTheta(responses, items, 0, 1).theta - trueTheta);
      errsInformative.push(
        estimateTheta(responses, items, cohortMean, cohortSd).theta - trueTheta
      );
    }

    const rmse = (es: number[]) =>
      Math.sqrt(es.reduce((a, e) => a + e * e, 0) / es.length);

    // Hierarchical prior should reduce RMSE because the cohort is off-centre
    expect(rmse(errsInformative)).toBeLessThan(rmse(errsFlat));
  });
});

describe("EAP estimator — pretest exclusion", () => {
  it("ignores pretest responses in theta estimation", () => {
    // Operational item: easy, scored 1 → pulls theta up
    // Pretest item: hard, scored 0 → would pull theta down if counted
    const items: Record<string, Item> = {
      op: makeItem("op", 1.5, -1, 0.1),
      pre: makeItem("pre", 1.5, 2, 0.1, true),
    };
    const responses: Response[] = [
      { itemId: "op", score: 1 },
      { itemId: "pre", score: 0, isPretest: true },
    ];
    const withPretest = estimateTheta(responses, items, 0, 1).theta;
    const onlyOperational = estimateTheta(
      [responses[0]],
      items,
      0,
      1
    ).theta;
    // Theta should match the operational-only estimate (pretest excluded)
    expect(withPretest).toBeCloseTo(onlyOperational, 6);
  });
});

describe("Faz5 GRM+3PL joint EAP", () => {
  it("runs when writing/speaking use GRM and MC items use 3PL", () => {
    const items: Record<string, Item> = {
      r1: { id: "r1", skill: SkillType.READING, params: { a: 1, b: 0, c: 0.2 } },
      w1: { id: "w1", skill: SkillType.WRITING, params: { a: 1, b: 0, c: 0 } },
    };
    const responses: Response[] = [
      { itemId: "r1", score: 1 },
      { itemId: "w1", score: 0.6 },
    ];
    const t = estimateTheta(responses, items, 0, 1, { useGrmProductive: true });
    expect(Number.isFinite(t.theta)).toBe(true);
    expect(t.sem).toBeLessThan(4);
  });
});
