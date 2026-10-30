import { describe, it, expect } from "vitest";
import { AssessmentEngine, isRapidGuess } from "../engine";
import { SkillType, type SessionState, type EngineConfig, type Response, type Item } from "../types";

const baseConfig = (overrides: Partial<EngineConfig> = {}): EngineConfig => ({
  minItems: 5,
  maxItems: 30,
  semThreshold: 0.28,
  startingTheta: 0,
  startingSem: 1,
  ...overrides,
});

describe("AssessmentEngine.processResponse — rapid guesses", () => {
  it("useRtIrt: never alters the score for a fast answer", () => {
    const engine = new AssessmentEngine(
      baseConfig({ useRtIrt: true, minItems: 5, speedThresholdMs: 5000 })
    );
    const state: SessionState = {
      theta: 0,
      sem: 1,
      responses: [],
      usedItemIds: new Set(),
    };
    const itm: Item = {
      id: "i1",
      skill: SkillType.READING,
      params: { a: 1, b: 2, c: 0 },
    };
    const next = engine.processResponse(
      state,
      { itemId: "i1", score: 1, latencyMs: 100 },
      { i1: itm }
    );
    expect(next.responses[0]!.score).toBe(1);
  });

  it("never alters the score for a rapid-guess response; the flag is separate", () => {
    const engine = new AssessmentEngine(baseConfig());
    const items: Record<string, Item> = {
      hard: { id: "hard", skill: SkillType.READING, params: { a: 1.5, b: 1.5, c: 0.1 } },
    };
    const initial = engine.initializeSession();
    // "Got it right" on a hard item in 1.5 s → suspicious. The engine records
    // the response as given (u ∈ {0,1} keeps the 3PL likelihood well defined)
    // and leaves the rapid-guess signal to the flag.
    const fast: Response = { itemId: "hard", score: 1, latencyMs: 1500 };
    const next = engine.processResponse(initial, fast, items);
    expect(next.responses[0].score).toBe(1);
    expect(isRapidGuess(1500, 1.5)).toBe(true);
    expect(isRapidGuess(2500, 1.5, 3000)).toBe(false); // 20% of 3000 × 1.375 = 825 ms
    expect(isRapidGuess(2500, 1.5, 20_000)).toBe(true); // 20% of 20000 × 1.375 = 5500 ms
    expect(isRapidGuess(10_000, 1.5)).toBe(false);
    expect(isRapidGuess(undefined, 1.5)).toBe(false);
    expect(isRapidGuess(0, 1.5)).toBe(false);
  });
});

describe("AssessmentEngine.mapToCefr", () => {
  const engine = new AssessmentEngine(baseConfig());

  // Thresholds (from cefr-framework): PRE_A1=-4.0, A1=-2.5, A2=-1.0, B1=0.5, B2=2.0, C1=3.5
  // Boundary convention (exclusive upper): theta < threshold → current level.
  // At exactly the threshold value the candidate enters the NEXT level.
  // Use mid-band values to avoid off-by-epsilon edge cases.
  it.each([
    [-5.0, "PRE_A1"],
    [-3.0, "A1"],
    [-1.0, "A2"],
    [-0.2, "B1"],
    [ 1.2, "B2"],
    [ 2.0, "C1"],
    [ 4.0, "C2"],
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

  it("keeps a per-skill profile for every operational skill answered", () => {
    const engine = new AssessmentEngine(baseConfig());
    const items: Record<string, Item> = {
      r1: { id: "r1", skill: SkillType.READING, params: { a: 1.2, b: 0, c: 0.2 } },
      g1: { id: "g1", skill: SkillType.GRAMMAR, params: { a: 1.2, b: 0, c: 0.2 } },
      p1: { id: "p1", skill: SkillType.GRAMMAR, params: { a: 1.2, b: 0, c: 0.2 }, isPretest: true },
    };
    let state = engine.initializeSession();
    state = engine.processResponse(state, { itemId: "r1", score: 1 }, items);
    state = engine.processResponse(state, { itemId: "g1", score: 0 }, items);
    state = engine.processResponse(state, { itemId: "p1", score: 1 }, items);
    expect(state.skillProfiles?.READING?.theta).toBeGreaterThan(0);
    expect(state.skillProfiles?.GRAMMAR?.theta).toBeLessThan(0);
    // Pretest responses are tagged and excluded from both estimates
    expect(state.responses[2].isPretest).toBe(true);
    expect(state.responses).toHaveLength(3);
  });
});
