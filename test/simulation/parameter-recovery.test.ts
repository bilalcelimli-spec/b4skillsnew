/**
 * End-to-end parameter recovery simulation.
 *
 * Generates a synthetic item bank with known IRT parameters, samples N "true"
 * candidates from a known ability distribution, runs each through the full
 * AssessmentEngine (item selection → response simulation → theta update →
 * stopping rule), and verifies that:
 *
 *   - mean(theta_hat - theta_true)        ≈ 0   (no systematic bias)
 *   - RMSE(theta_hat - theta_true)        small (estimator is consistent)
 *   - mean reported SEM                   ≈ empirical RMSE  (calibrated SEM)
 *   - average test length                 within configured min/max
 *
 * This is the single most important integration test for the engine: if the
 * simulation passes, the entire CAT pipeline is sound.
 */

import { describe, it, expect } from "vitest";
import { AssessmentEngine } from "../../src/lib/assessment-engine/engine";
import { probability } from "../../src/lib/assessment-engine/irt";
import {
  SkillType,
  type Item,
  type EngineConfig,
  type Response,
  type SessionState,
} from "../../src/lib/assessment-engine/types";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller standard-normal sample using a seeded uniform RNG. */
function randn(rng: () => number): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function buildBalancedBank(rng: () => number, sizePerSkill = 60): {
  pool: Item[];
  itemMap: Record<string, Item>;
} {
  const pool: Item[] = [];
  const skills = [SkillType.READING, SkillType.LISTENING, SkillType.GRAMMAR, SkillType.VOCABULARY];
  let id = 0;
  for (const skill of skills) {
    for (let k = 0; k < sizePerSkill; k++) {
      // b uniformly spread across [-3, 3]; a from N(1.2, 0.3) clipped to [0.5, 2.5];
      // c is small (0.05–0.20) — typical English assessment item profile.
      const b = -3 + (6 * k) / (sizePerSkill - 1);
      const a = Math.max(0.5, Math.min(2.5, 1.2 + 0.3 * randn(rng)));
      const c = 0.05 + 0.15 * rng();
      pool.push({
        id: `item_${id++}`,
        skill,
        params: { a, b, c },
      });
    }
  }
  const itemMap: Record<string, Item> = {};
  for (const it of pool) itemMap[it.id] = it;
  return { pool, itemMap };
}

interface SimulationResult {
  trueTheta: number;
  estimatedTheta: number;
  estimatedSem: number;
  itemsAdministered: number;
  stopReason: string | null;
}

/**
 * Run one simulee through the engine end-to-end.
 */
function simulateCandidate(
  engine: AssessmentEngine,
  pool: Item[],
  itemMap: Record<string, Item>,
  trueTheta: number,
  rng: () => number,
  maxItems: number
): SimulationResult {
  let state: SessionState = engine.initializeSession();
  let stopReason: string | null = null;

  for (let step = 0; step < maxItems; step++) {
    const next = engine.getNextItem(state, pool);
    if (!next) break;

    // Simulate dichotomous response from true-theta P
    const p = probability(trueTheta, next.params);
    const score = rng() < p ? 1 : 0;
    const response: Response = {
      itemId: next.id,
      score,
      // Realistic latency: 8 s baseline + scaled by difficulty
      latencyMs: 8000 + Math.floor(rng() * 8000),
    };

    state = engine.processResponse(state, response, itemMap);

    const decision = engine.shouldStop(state);
    if (decision.stop) {
      stopReason = decision.reason;
      break;
    }
  }

  return {
    trueTheta,
    estimatedTheta: state.theta,
    estimatedSem: state.sem,
    itemsAdministered: state.responses.length,
    stopReason,
  };
}

describe("End-to-end CAT simulation — parameter recovery", () => {
  it("recovers theta with small bias and calibrated SEM over 200 simulees", () => {
    const rng = mulberry32(20260426);
    const N = 200;
    const { pool, itemMap } = buildBalancedBank(rng, 50);

    const config: EngineConfig = {
      minItems: 10,
      maxItems: 35,
      semThreshold: 0.30,
      startingTheta: 0,
      startingSem: 1,
      classificationConfidenceThreshold: 0.90,
    };
    const engine = new AssessmentEngine(config);

    const results: SimulationResult[] = [];
    for (let i = 0; i < N; i++) {
      const trueTheta = randn(rng); // N(0,1)
      results.push(
        simulateCandidate(engine, pool, itemMap, trueTheta, rng, config.maxItems)
      );
    }

    const errors = results.map(r => r.estimatedTheta - r.trueTheta);
    const bias = errors.reduce((a, e) => a + e, 0) / N;
    const rmse = Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / N);
    const meanSem = results.reduce((a, r) => a + r.estimatedSem, 0) / N;
    const meanLength = results.reduce((a, r) => a + r.itemsAdministered, 0) / N;

    // Diagnostic output for CI logs (not assertions)
    // eslint-disable-next-line no-console
    console.log("[CAT Simulation]", {
      N,
      bias: bias.toFixed(4),
      rmse: rmse.toFixed(4),
      meanSem: meanSem.toFixed(4),
      meanLength: meanLength.toFixed(2),
      stopReasons: results.reduce(
        (acc: Record<string, number>, r) => {
          const k = r.stopReason ?? "NO_STOP";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        },
        {}
      ),
    });

    // Bias should be near zero; allow ±0.10 for finite-sample noise
    expect(Math.abs(bias)).toBeLessThan(0.10);

    // Empirical RMSE should be close to mean reported SEM (calibrated estimator).
    // Allow generous tolerance: empirical RMSE should not exceed mean SEM by > 60%.
    expect(rmse).toBeLessThan(meanSem * 1.6);

    // Test should terminate well before maxItems on average — adaptive stopping works.
    expect(meanLength).toBeLessThan(config.maxItems);
    expect(meanLength).toBeGreaterThanOrEqual(config.minItems);

    // Reliability proxy: SEM ≤ 0.50 ⇒ marginal reliability ≥ 0.75
    expect(meanSem).toBeLessThan(0.50);
  }, 60_000);

  it("produces reasonable CEFR classification accuracy at band centres", () => {
    // Sample candidates AT the centre of each CEFR band; the engine should
    // classify them into the correct band with high accuracy.
    const rng = mulberry32(7777);
    const { pool, itemMap } = buildBalancedBank(rng, 50);
    const engine = new AssessmentEngine({
      minItems: 10,
      maxItems: 30,
      semThreshold: 0.25,
      startingTheta: 0,
      startingSem: 1,
    });

    // Theta values that sit in the middle of each band (with margin from boundaries)
    const cases: Array<{ theta: number; expected: string }> = [
      { theta: -2.3, expected: "A1" }, // band A1: [-3.0, -1.75]
      { theta: -1.0, expected: "A2" }, // band A2: [-1.75, -0.5]
      { theta: 0.0, expected: "B1" },  // band B1: [-0.5, 0.5]
      { theta: 1.0, expected: "B2" },  // band B2: [0.5, 1.5]
      { theta: 2.0, expected: "C1" },  // band C1: [1.5, 2.5]
    ];

    let correct = 0;
    const trials = 30;
    for (const tc of cases) {
      for (let i = 0; i < trials; i++) {
        const r = simulateCandidate(engine, pool, itemMap, tc.theta, rng, 30);
        if (engine.mapToCefr(r.estimatedTheta) === tc.expected) correct++;
      }
    }
    const accuracy = correct / (cases.length * trials);
    // eslint-disable-next-line no-console
    console.log("[CEFR Classification Accuracy]", accuracy.toFixed(3));
    // High-stakes assessments target ≥ 70% band-centre classification accuracy
    expect(accuracy).toBeGreaterThan(0.70);
  }, 60_000);
});
