import { describe, it, expect } from "vitest";
import { AssessmentEngine } from "../engine";
import { SkillType, type SessionState, type EngineConfig, type Response, type Item } from "../types";

const baseConfig = (overrides: Partial<EngineConfig> = {}): EngineConfig => ({
  minItems: 5,
  maxItems: 30,
  semThreshold: 0.28,
  startingTheta: 0,
  startingSem: 1,
  ...overrides,
});

const stateWith = (count: number, theta: number, sem: number): SessionState => ({
  theta,
  sem,
  responses: Array.from({ length: count }, (_, i) => ({
    itemId: `i${i}`,
    score: 1,
    isPretest: false,
  })),
  usedItemIds: new Set<string>(),
});

describe("AssessmentEngine.shouldStop — priority ordering", () => {
  it("never stops below minItems, even at very low SEM", () => {
    const engine = new AssessmentEngine(baseConfig({ minItems: 5 }));
    const state = stateWith(3, 0, 0.1);
    expect(engine.shouldStop(state)).toEqual({ stop: false, reason: null });
  });

  it("hard stops at maxItems regardless of SEM", () => {
    const engine = new AssessmentEngine(baseConfig({ maxItems: 10 }));
    const state = stateWith(10, 0, 1.5);
    const result = engine.shouldStop(state);
    expect(result.stop).toBe(true);
    expect(result.reason).toBe("MAX_ITEMS_REACHED");
  });

  it("stops when test information I(θ) ≥ 12 (SEM ≤ ~0.289)", () => {
    // SEM = 0.28 → I = 1/0.0784 ≈ 12.76 ≥ 12
    const engine = new AssessmentEngine(baseConfig({ semThreshold: 0.20 }));
    const state = stateWith(10, 0, 0.28);
    const result = engine.shouldStop(state);
    expect(result.stop).toBe(true);
    // Either SUFFICIENT_INFORMATION or SEM_BOUNDARY_REACHED — both correct;
    // assert it is *not* MAX_ITEMS or null
    expect(result.reason).not.toBe("MAX_ITEMS_REACHED");
    expect(result.reason).not.toBeNull();
  });

  it("stops via SEM threshold when configured loose info bar", () => {
    // semThreshold = 0.45 (loose). With theta=0 (mid B1/B2 zone, near 0.5 boundary)
    // SEM=0.45 is below threshold → SEM_THRESHOLD_REACHED.
    // Place theta away from any CEFR boundary to ensure SEM threshold fires
    // before conditional-SEM tiers.
    const engine = new AssessmentEngine(baseConfig({ semThreshold: 0.45 }));
    const state = stateWith(10, -0.05, 0.42);  // far enough from -0.5 / +0.5 boundaries
    const result = engine.shouldStop(state);
    expect(result.stop).toBe(true);
    expect([
      "SEM_THRESHOLD_REACHED",
      "SUFFICIENT_INFORMATION",
      "SEM_BOUNDARY_REACHED",
    ]).toContain(result.reason);
  });

  it("near a CEFR boundary, requires tighter SEM (boundary tier 0.16)", () => {
    // theta = 0.55 is within ±0.5 of B1/B2 boundary (0.5). SEM=0.30 above 0.16 tier.
    const engine = new AssessmentEngine(baseConfig({ semThreshold: 0.20 }));
    const state = stateWith(10, 0.55, 0.30);
    const result = engine.shouldStop(state);
    // Should NOT stop on SEM threshold (0.30 > 0.20) and not on info (1/0.09≈11<12)
    expect(result.stop).toBe(false);
  });

  it("classification confidence stop fires when posterior is concentrated in one band", () => {
    // theta=1.0 is mid-B2 band (0.5..1.5). With SEM=0.20, posterior is tightly
    // inside the band → classification confidence ≥ 0.90.
    const engine = new AssessmentEngine(baseConfig({
      semThreshold: 0.10, // make sure SEM threshold doesn't preempt
      classificationConfidenceThreshold: 0.90,
    }));
    const state = stateWith(10, 1.0, 0.20);
    const result = engine.shouldStop(state);
    expect(result.stop).toBe(true);
  });

  it("does not stop on classification when posterior straddles two bands", () => {
    // theta exactly on boundary (0.5 = B1/B2), SEM=0.30 → posterior split ≈50/50
    const engine = new AssessmentEngine(baseConfig({
      semThreshold: 0.20,
      classificationConfidenceThreshold: 0.90,
    }));
    const state = stateWith(10, 0.5, 0.30);
    const result = engine.shouldStop(state);
    expect(result.stop).toBe(false);
  });
});

describe("AssessmentEngine.mapToCefr", () => {
  const engine = new AssessmentEngine(baseConfig());

  it.each([
    [-4, "PRE_A1"],
    [-2.5, "A1"],
    [-1.0, "A2"],
    [0.0, "B1"],
    [1.0, "B2"],
    [2.0, "C1"],
    [3.0, "C2"],
  ] as const)("theta=%s → %s", (theta, expected) => {
    expect(engine.mapToCefr(theta)).toBe(expected);
  });

  it("honours custom org-level thresholds", () => {
    const e = new AssessmentEngine(
      baseConfig({ cefrThresholds: { B1: 0.0, B2: 0.6 } })
    );
    // With B1 boundary at 0.0, theta=0.3 is now in B1 band (0.0..0.6)
    expect(e.mapToCefr(0.3)).toBe("B1");
  });
});

describe("AssessmentEngine.processResponse — full step", () => {
  it("appends response, marks item used, re-estimates theta", () => {
    const engine = new AssessmentEngine(baseConfig());
    const items: Record<string, Item> = {
      i1: { id: "i1", skill: SkillType.READING, params: { a: 1.5, b: -1, c: 0.1 } },
    };
    const initial = engine.initializeSession();
    const response: Response = { itemId: "i1", score: 1 };
    const next = engine.processResponse(initial, response, items);

    expect(next.responses).toHaveLength(1);
    expect(next.usedItemIds.has("i1")).toBe(true);
    // Correct response on easy item should pull theta up from 0
    expect(next.theta).toBeGreaterThan(0);
    // SEM should drop below the prior SD of 1
    expect(next.sem).toBeLessThan(1);
  });

  it("flags rapid-guess responses (latency < 2 s) and dampens score", () => {
    const engine = new AssessmentEngine(baseConfig());
    const items: Record<string, Item> = {
      hard: { id: "hard", skill: SkillType.READING, params: { a: 1.5, b: 1.5, c: 0.1 } },
    };
    const initial = engine.initializeSession();
    // "Got it right" on a hard item in 1.5 s → suspicious; engine should
    // reduce the recorded score so theta is not artificially inflated.
    const fast: Response = { itemId: "hard", score: 1, latencyMs: 1500 };
    const next = engine.processResponse(initial, fast, items);
    const recorded = next.responses[0].score;
    expect(recorded).toBeLessThan(1);
  });
});
