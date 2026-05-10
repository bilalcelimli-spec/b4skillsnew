import { describe, it, expect } from "vitest";
import {
  computeFeatures,
  policyScores,
  selectItemRL,
  selectItemRLStochastic,
  computeReward,
  computeReturns,
  updateWeights,
  rlStoppingRule,
  buildRlState,
  PRETRAINED_WEIGHTS,
  type RlItem,
  type RlState,
  type RlEpisodeStep,
} from "../rl-item-selection";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeItem(id: string, a: number, b: number, c: number, skill = "READING", exposure = 0): RlItem {
  return { id, params: { a, b, c }, skill, exposureRate: exposure };
}

const HIGH_INFO = makeItem("hi1", 1.8, 0.0, 0.20, "READING",  0.05);
const LOW_INFO  = makeItem("lo1", 0.3, 3.0, 0.25, "GRAMMAR",  0.01);
const OVEREXP   = makeItem("oe1", 1.5, 0.1, 0.20, "LISTENING", 0.45);

const STATE_AVG: RlState = {
  thetaHat: 0,
  sem: 0.5,
  nAdministered: 10,
  skillCounts: { READING: 4, GRAMMAR: 3, LISTENING: 3 },
};

const STATE_FRESH: RlState = {
  thetaHat: 0,
  sem: 1.0,
  nAdministered: 0,
  skillCounts: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// computeFeatures
// ─────────────────────────────────────────────────────────────────────────────

describe("computeFeatures()", () => {
  it("returns a Float64Array of length 10", () => {
    const f = computeFeatures(STATE_AVG, HIGH_INFO, 40);
    expect(f).toBeInstanceOf(Float64Array);
    expect(f.length).toBe(10);
  });

  it("feature[0] (info) is non-negative", () => {
    const f = computeFeatures(STATE_AVG, HIGH_INFO, 40);
    expect(f[0]).toBeGreaterThanOrEqual(0);
  });

  it("high-discrimination item has higher info feature than low-discrimination", () => {
    const fHigh = computeFeatures(STATE_AVG, HIGH_INFO, 40);
    const fLow  = computeFeatures(STATE_AVG, LOW_INFO,  40);
    expect(fHigh[0]).toBeGreaterThan(fLow[0]);
  });

  it("feature[1] (|b-θ|) is 0 when b == θ̂", () => {
    const item = makeItem("exact", 1.5, 0.0, 0.2); // b=0 = θ̂=0
    const f = computeFeatures(STATE_AVG, item, 40);
    expect(f[1]).toBeCloseTo(0, 6);
  });

  it("feature[3] (exposure) matches item.exposureRate", () => {
    const f = computeFeatures(STATE_AVG, OVEREXP, 40);
    expect(f[3]).toBeCloseTo(0.45, 5);
  });

  it("feature[8] (new-skill) is 1 for unseen skill", () => {
    const newSkillItem = makeItem("ns1", 1.0, 0.0, 0.2, "SPEAKING");
    const f = computeFeatures(STATE_AVG, newSkillItem, 40);
    expect(f[8]).toBe(1);
  });

  it("feature[8] (new-skill) is 0 for already-administered skill", () => {
    const f = computeFeatures(STATE_AVG, HIGH_INFO, 40); // READING already in skillCounts
    expect(f[8]).toBe(0);
  });

  it("feature[7] (progress) is in [0,1]", () => {
    const f = computeFeatures(STATE_AVG, HIGH_INFO, 40);
    expect(f[7]).toBeGreaterThanOrEqual(0);
    expect(f[7]).toBeLessThanOrEqual(1);
  });

  it("feature[9] (discrimination) matches item.params.a", () => {
    const f = computeFeatures(STATE_AVG, HIGH_INFO, 40);
    expect(f[9]).toBeCloseTo(HIGH_INFO.params.a, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// policyScores
// ─────────────────────────────────────────────────────────────────────────────

describe("policyScores()", () => {
  const pool = [HIGH_INFO, LOW_INFO, OVEREXP];

  it("returns one entry per candidate", () => {
    const scores = policyScores(STATE_AVG, pool);
    expect(scores).toHaveLength(3);
  });

  it("returns empty array for empty candidates", () => {
    expect(policyScores(STATE_AVG, [])).toHaveLength(0);
  });

  it("log-probabilities sum to ≈0 in log-space (sum exp ≈ 1)", () => {
    const scores = policyScores(STATE_AVG, pool);
    const sum = scores.reduce((s, x) => s + Math.exp(x.logProb), 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("all log-probabilities are ≤ 0 (probabilities ≤ 1)", () => {
    const scores = policyScores(STATE_AVG, pool);
    for (const s of scores) expect(s.logProb).toBeLessThanOrEqual(0);
  });

  it("results are sorted descending by score", () => {
    const scores = policyScores(STATE_AVG, pool);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]!.score).toBeGreaterThanOrEqual(scores[i]!.score);
    }
  });

  it("overexposed item ranks lower than high-info item at default weights", () => {
    const scores = policyScores(STATE_AVG, pool);
    const hiRank  = scores.findIndex((s) => s.item.id === "hi1");
    const oeRank  = scores.findIndex((s) => s.item.id === "oe1");
    expect(hiRank).toBeLessThan(oeRank);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// selectItemRL
// ─────────────────────────────────────────────────────────────────────────────

describe("selectItemRL()", () => {
  const pool = [HIGH_INFO, LOW_INFO, OVEREXP];

  it("returns null when pool exhausted", () => {
    expect(selectItemRL(STATE_AVG, pool, new Set(["hi1", "lo1", "oe1"]))).toBeNull();
  });

  it("returns an item from the pool", () => {
    const item = selectItemRL(STATE_AVG, pool, new Set());
    expect(item).not.toBeNull();
    expect(["hi1", "lo1", "oe1"]).toContain(item!.id);
  });

  it("does not select used items", () => {
    const item = selectItemRL(STATE_AVG, pool, new Set(["hi1", "oe1"]));
    expect(item!.id).toBe("lo1");
  });

  it("selects highest-score item (greedy argmax)", () => {
    const item = selectItemRL(STATE_AVG, pool, new Set());
    const scores = policyScores(STATE_AVG, pool);
    expect(item!.id).toBe(scores[0]!.item.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// selectItemRLStochastic
// ─────────────────────────────────────────────────────────────────────────────

describe("selectItemRLStochastic()", () => {
  const pool = [HIGH_INFO, LOW_INFO, OVEREXP];

  it("returns null when pool exhausted", () => {
    expect(selectItemRLStochastic(STATE_AVG, pool, new Set(["hi1", "lo1", "oe1"]))).toBeNull();
  });

  it("returns an item with logProb ≤ 0", () => {
    const result = selectItemRLStochastic(STATE_AVG, pool, new Set());
    expect(result).not.toBeNull();
    expect(result!.logProb).toBeLessThanOrEqual(0);
  });

  it("selected item is from the pool", () => {
    const result = selectItemRLStochastic(STATE_AVG, pool, new Set());
    expect(["hi1", "lo1", "oe1"]).toContain(result!.item.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeReward
// ─────────────────────────────────────────────────────────────────────────────

describe("computeReward()", () => {
  it("positive reward when SEM decreases", () => {
    const r = computeReward(0.5, 0.45, HIGH_INFO, STATE_AVG);
    expect(r).toBeGreaterThan(0);
  });

  it("penalises overexposed items", () => {
    const rNormal = computeReward(0.5, 0.45, HIGH_INFO, STATE_AVG);  // exposure=0.05
    const rOverexp = computeReward(0.5, 0.45, OVEREXP, STATE_AVG);   // exposure=0.45
    expect(rNormal).toBeGreaterThan(rOverexp);
  });

  it("reward is finite", () => {
    const r = computeReward(0.5, 0.40, HIGH_INFO, STATE_AVG);
    expect(Number.isFinite(r)).toBe(true);
  });

  it("zero SEM change → reward driven only by penalties", () => {
    const r = computeReward(0.5, 0.5, HIGH_INFO, STATE_AVG);
    // deltaInfo = 0; penalties may be small for low-exposure item
    expect(r).toBeLessThanOrEqual(0.05);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeReturns
// ─────────────────────────────────────────────────────────────────────────────

describe("computeReturns()", () => {
  it("returns empty array for empty rewards", () => {
    expect(computeReturns([])).toEqual([]);
  });

  it("single reward is returned as-is (γ=1)", () => {
    expect(computeReturns([5.0])).toEqual([5.0]);
  });

  it("γ=1: G_t = sum of remaining rewards", () => {
    const rewards = [1, 2, 3];
    const G = computeReturns(rewards, 1.0);
    expect(G[0]).toBeCloseTo(6, 5);
    expect(G[1]).toBeCloseTo(5, 5);
    expect(G[2]).toBeCloseTo(3, 5);
  });

  it("γ<1: discounts future rewards", () => {
    const rewards = [1, 1, 1];
    const G = computeReturns(rewards, 0.9);
    // G[2] = 1; G[1] = 1 + 0.9 = 1.9; G[0] = 1 + 0.9*1.9 = 2.71
    expect(G[2]).toBeCloseTo(1.0, 5);
    expect(G[1]).toBeCloseTo(1.9, 5);
    expect(G[0]).toBeCloseTo(2.71, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateWeights
// ─────────────────────────────────────────────────────────────────────────────

describe("updateWeights()", () => {
  it("returns the same Float64Array reference", () => {
    const w = new Float64Array(PRETRAINED_WEIGHTS);
    const result = updateWeights(w, []);
    expect(result).toBe(w);
  });

  it("does not mutate weights when episodes is empty", () => {
    const w = new Float64Array(PRETRAINED_WEIGHTS);
    const copy = new Float64Array(w);
    updateWeights(w, []);
    for (let i = 0; i < w.length; i++) expect(w[i]).toBeCloseTo(copy[i]!, 10);
  });

  it("modifies weights after training with a positive-advantage episode", () => {
    const w = new Float64Array(10).fill(0);
    const episode: RlEpisodeStep[] = [
      { state: STATE_AVG, actionItemId: "hi1", reward: 1.0, logProb: -1.0 },
      { state: STATE_AVG, actionItemId: "hi1", reward: 0.5, logProb: -1.5 },
    ];
    updateWeights(w, [episode], 0.1);
    // At least one weight should have changed
    const changed = Array.from(w).some((v) => v !== 0);
    expect(changed).toBe(true);
  });

  it("returns Float64Array of correct length", () => {
    const w = new Float64Array(10);
    const result = updateWeights(w, []);
    expect(result.length).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rlStoppingRule
// ─────────────────────────────────────────────────────────────────────────────

describe("rlStoppingRule()", () => {
  const pool = [HIGH_INFO, LOW_INFO, OVEREXP];

  it("stops when maxItems reached", () => {
    const state: RlState = { ...STATE_AVG, nAdministered: 40 };
    const result = rlStoppingRule(state, pool, new Set(), 40);
    expect(result.stop).toBe(true);
    expect(result.reason).toMatch(/Max items/);
  });

  it("stops when SEM < threshold and n ≥ minItems", () => {
    const state: RlState = { ...STATE_AVG, sem: 0.25, nAdministered: 15 };
    const result = rlStoppingRule(state, pool, new Set(), 40, 0.30, 10);
    expect(result.stop).toBe(true);
    expect(result.reason).toMatch(/SEM/);
  });

  it("does not stop when SEM < threshold but n < minItems", () => {
    const state: RlState = { ...STATE_AVG, sem: 0.20, nAdministered: 5 };
    const result = rlStoppingRule(state, pool, new Set(), 40, 0.30, 10);
    expect(result.stop).toBe(false);
  });

  it("stops when pool is exhausted", () => {
    const result = rlStoppingRule(STATE_AVG, pool, new Set(["hi1", "lo1", "oe1"]));
    expect(result.stop).toBe(true);
    expect(result.reason).toMatch(/exhausted/);
  });

  it("does not stop under normal conditions", () => {
    const state: RlState = { ...STATE_AVG, sem: 0.60, nAdministered: 10 };
    const result = rlStoppingRule(state, pool, new Set(), 40, 0.30, 5);
    expect(result.stop).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildRlState
// ─────────────────────────────────────────────────────────────────────────────

describe("buildRlState()", () => {
  it("counts skills correctly", () => {
    const responses = [
      { skill: "READING" }, { skill: "READING" }, { skill: "GRAMMAR" },
    ];
    const state = buildRlState(0.5, 0.4, responses);
    expect(state.skillCounts["READING"]).toBe(2);
    expect(state.skillCounts["GRAMMAR"]).toBe(1);
    expect(state.nAdministered).toBe(3);
  });

  it("sets thetaHat and sem correctly", () => {
    const state = buildRlState(1.2, 0.3, []);
    expect(state.thetaHat).toBe(1.2);
    expect(state.sem).toBe(0.3);
    expect(state.nAdministered).toBe(0);
  });

  it("returns empty skillCounts for empty responses", () => {
    const state = buildRlState(0, 1, []);
    expect(Object.keys(state.skillCounts)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRETRAINED_WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────

describe("PRETRAINED_WEIGHTS", () => {
  it("has length 10 (matching N_FEATURES)", () => {
    expect(PRETRAINED_WEIGHTS.length).toBe(10);
  });

  it("info weight (index 0) is positive (more info = better)", () => {
    expect(PRETRAINED_WEIGHTS[0]).toBeGreaterThan(0);
  });

  it("exposure weight (index 3) is negative (overexposure = worse)", () => {
    expect(PRETRAINED_WEIGHTS[3]).toBeLessThan(0);
  });
});
