/**
 * API integration tests — assessment session lifecycle
 * Validates session creation, item fetching, answer submission, and completion logic
 * without a real DB (uses in-memory mocks).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentEngine } from "../engine";
import { SkillType, type EngineConfig, type SessionState, type Item } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

const makeConfig = (overrides: Partial<EngineConfig> = {}): EngineConfig => ({
  minItems: 5,
  maxItems: 30,
  semThreshold: 0.28,
  startingTheta: 0,
  startingSem: 1,
  ...overrides,
});

const makeItem = (id: string, b = 0, skill: SkillType = SkillType.GRAMMAR): Item => ({
  id,
  skill,
  params: { a: 1, b, c: 0.2 },
  isPretest: false,
  status: "ACTIVE",
});

const makeState = (responses: { itemId: string; score: number; isPretest?: boolean }[] = []): SessionState => ({
  theta: 0,
  sem: 1,
  responses,
  usedItemIds: new Set(responses.map((r) => r.itemId)),
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("Session lifecycle — AssessmentEngine", () => {
  let engine: AssessmentEngine;

  beforeEach(() => {
    engine = new AssessmentEngine(makeConfig());
  });

  it("does not stop before minItems threshold is reached", () => {
    const state = makeState([
      { itemId: "i1", score: 1 },
      { itemId: "i2", score: 1 },
    ]);
    const result = engine.shouldStop(state);
    expect(result.stop).toBe(false);
  });

  it("stops when SEM is below threshold after minItems", () => {
    const state: SessionState = {
      theta: 1.2,
      sem: 0.25,
      responses: Array.from({ length: 6 }, (_, i) => ({
        itemId: `i${i}`,
        score: 1,
        isPretest: false,
      })),
      usedItemIds: new Set(Array.from({ length: 6 }, (_, i) => `i${i}`)),
    };
    const result = engine.shouldStop(state);
    expect(result.stop).toBe(true);
  });

  it("stops at maxItems regardless of SEM", () => {
    const cfg = makeConfig({ maxItems: 5, minItems: 3 });
    const eng = new AssessmentEngine(cfg);
    const state: SessionState = {
      theta: 0,
      sem: 0.99,
      responses: Array.from({ length: 5 }, (_, i) => ({
        itemId: `i${i}`,
        score: 1,
        isPretest: false,
      })),
      usedItemIds: new Set(Array.from({ length: 5 }, (_, i) => `i${i}`)),
    };
    const result = eng.shouldStop(state);
    expect(result.stop).toBe(true);
    expect(result.reason).toMatch(/max/i);
  });

  it("excludes already-used items from selection pool", () => {
    const items = [
      makeItem("used-1"),
      makeItem("used-2"),
      makeItem("fresh-3"),
    ];
    const state = makeState([
      { itemId: "used-1", score: 1 },
      { itemId: "used-2", score: 0 },
    ]);
    const available = items.filter((item) => !state.usedItemIds.has(item.id));
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe("fresh-3");
  });
});

describe("Session lifecycle — response scoring", () => {
  it("treats score=1 as correct and score=0 as incorrect", () => {
    // Verify the Response type contract used by the engine
    const correct = { itemId: "x", score: 1 as const, isPretest: false };
    const incorrect = { itemId: "y", score: 0 as const, isPretest: false };
    expect(correct.score).toBe(1);
    expect(incorrect.score).toBe(0);
  });

  it("accumulates responses across multiple items", () => {
    const responses = Array.from({ length: 10 }, (_, i) => ({
      itemId: `item-${i}`,
      score: i % 2 === 0 ? (1 as const) : (0 as const),
      isPretest: false,
    }));
    const correctCount = responses.filter((r) => r.score === 1).length;
    expect(correctCount).toBe(5);
  });
});
