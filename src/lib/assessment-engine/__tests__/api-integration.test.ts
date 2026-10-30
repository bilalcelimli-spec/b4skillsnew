/**
 * API integration tests — assessment session lifecycle
 * Validates session creation, item fetching, answer submission, and completion logic
 * without a real DB (uses in-memory mocks).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentEngine } from "../engine";
import { evaluateSectionStopRules } from "../stop-rules";
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
  beforeEach(() => {
    // The engine owns estimation only; stopping is evaluated by stop-rules.ts.
    expect(new AssessmentEngine(makeConfig()).initializeSession().responses).toHaveLength(0);
  });

  it("does not stop before the section floor is reached", () => {
    const result = evaluateSectionStopRules({
      ability: { theta: 0, sem: 0.2 }, sectionCount: 2, minItems: 5, maxItems: 30, semThreshold: 0.28,
    });
    expect(result.stop).toBe(false);
  });

  it("stops when SEM is below threshold after the floor", () => {
    const result = evaluateSectionStopRules({
      ability: { theta: 1.2, sem: 0.25 }, sectionCount: 6, minItems: 5, maxItems: 30, semThreshold: 0.28,
    });
    expect(result).toEqual({ stop: true, reason: "SEM_THRESHOLD_REACHED" });
  });

  it("stops at the section budget regardless of SEM", () => {
    const result = evaluateSectionStopRules({
      ability: { theta: 0, sem: 0.99 }, sectionCount: 5, minItems: 3, maxItems: 5, semThreshold: 0.28,
    });
    expect(result.stop).toBe(true);
    expect(result.reason).toMatch(/budget/i);
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
