import { describe, it, expect } from "vitest";
import {
  evaluateSectionStopRules,
  classificationConfidence,
  distanceToNearestCut,
  DEFAULT_SECTION_STOP_RULES,
  type StopRuleInput,
} from "../stop-rules";
import { evaluateSectionStop } from "../section-flow";
import { getProfile } from "../../product-lines/profiles";
import { SkillType, type Item } from "../types";

const base = (overrides: Partial<StopRuleInput> = {}): StopRuleInput => ({
  ability: { theta: 0, sem: 0.5 },
  sectionCount: 10,
  minItems: 5,
  maxItems: 30,
  semThreshold: 0.28,
  ...overrides,
});

describe("evaluateSectionStopRules — structural limits", () => {
  it("never stops below the floor, even at very low SEM", () => {
    expect(evaluateSectionStopRules(base({ sectionCount: 3, ability: { theta: 0, sem: 0.1 } })))
      .toEqual({ stop: false, reason: null });
  });

  it("always stops at the budget regardless of SEM", () => {
    expect(evaluateSectionStopRules(base({ sectionCount: 30, ability: { theta: 0, sem: 1.5 } })))
      .toEqual({ stop: true, reason: "ITEM_BUDGET_REACHED" });
  });

  it("keeps the section open while a served item is unanswered", () => {
    expect(evaluateSectionStopRules(base({ hasOutstandingItem: true, ability: { theta: 0, sem: 0.1 } })).stop)
      .toBe(false);
  });

  it("defaults to the SEM_THRESHOLD rule only (pre-Faz-1 live behaviour)", () => {
    expect(DEFAULT_SECTION_STOP_RULES).toEqual(["SEM_THRESHOLD"]);
    // Tight posterior inside the B2 band would satisfy CLASSIFICATION_CONFIDENCE,
    // but the default rule set ignores it.
    expect(evaluateSectionStopRules(base({ ability: { theta: 1.0, sem: 0.30 } })).stop).toBe(false);
    expect(evaluateSectionStopRules(base({ ability: { theta: 1.0, sem: 0.28 } })))
      .toEqual({ stop: true, reason: "SEM_THRESHOLD_REACHED" });
  });
});

describe("evaluateSectionStopRules — opt-in rules", () => {
  it("BOUNDARY_SEM requires tighter SEM near a CEFR cut and ignores the global threshold", () => {
    const rules = ["BOUNDARY_SEM"] as const;
    // θ=0.55 is within ±0.50 of the B1/B2 cut (0.5) under org cuts
    const cefrThresholds = { A1: -3, A2: -1.75, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };
    expect(distanceToNearestCut(0.55, cefrThresholds)).toBeCloseTo(0.05, 5);
    expect(evaluateSectionStopRules(base({ rules, cefrThresholds, ability: { theta: 0.55, sem: 0.30 } })).stop).toBe(false);
    expect(evaluateSectionStopRules(base({ rules, cefrThresholds, ability: { theta: 0.55, sem: 0.15 } })))
      .toEqual({ stop: true, reason: "SEM_BOUNDARY_REACHED" });
    expect(evaluateSectionStopRules(base({ rules, cefrThresholds, ability: { theta: 0.55, sem: 0.11 } })))
      .toEqual({ stop: true, reason: "SEM_BOUNDARY_TIGHT" });
  });

  it("CLASSIFICATION_CONFIDENCE fires only when the posterior sits inside one band", () => {
    const rules = ["CLASSIFICATION_CONFIDENCE"] as const;
    const cefrThresholds = { A1: -3, A2: -1.75, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };
    // mid-B2 with SEM 0.20 → P(B2) ≈ 0.99
    expect(classificationConfidence(1.0, 0.20, cefrThresholds)).toBeGreaterThan(0.95);
    expect(evaluateSectionStopRules(base({ rules, cefrThresholds, ability: { theta: 1.0, sem: 0.20 } })))
      .toEqual({ stop: true, reason: "CLASSIFICATION_CONFIDENCE_REACHED" });
    // on the B1/B2 cut the posterior straddles two bands
    expect(classificationConfidence(0.5, 0.30, cefrThresholds)).toBeLessThan(0.6);
    expect(evaluateSectionStopRules(base({ rules, cefrThresholds, ability: { theta: 0.5, sem: 0.30 } })).stop).toBe(false);
  });

  it("SPRT needs items and an enabled config; otherwise it is skipped", () => {
    const rules = ["SPRT"] as const;
    const sprt = { enabled: true, alpha: 0.05, beta: 0.05, halfWidth: 0.18, minItems: 5 };
    expect(evaluateSectionStopRules(base({ rules, sprt })).stop).toBe(false);
    // 12 correct answers on items well below a candidate's level: likelihood ratio favours θ1
    const items: Record<string, Item> = {};
    const responses = Array.from({ length: 12 }, (_, i) => {
      items[`i${i}`] = { id: `i${i}`, skill: SkillType.GRAMMAR, params: { a: 1.5, b: 0.5, c: 0.0 } };
      return { itemId: `i${i}`, score: 1 };
    });
    const out = evaluateSectionStopRules(base({
      rules, sprt, items, responses, sectionCount: 12,
      ability: { theta: 0.6, sem: 0.4 },
      cefrThresholds: { A1: -3, A2: -1.75, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 },
    }));
    expect(out).toEqual({ stop: true, reason: "SPRT_FAVOR_HIGH_THETA" });
  });

  it("evaluates rules in the listed order and reports the first hit", () => {
    const cefrThresholds = { A1: -3, A2: -1.75, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };
    const input = base({ cefrThresholds, ability: { theta: 1.0, sem: 0.20 }, semThreshold: 0.28 });
    expect(evaluateSectionStopRules({ ...input, rules: ["CLASSIFICATION_CONFIDENCE", "SEM_THRESHOLD"] }).reason)
      .toBe("CLASSIFICATION_CONFIDENCE_REACHED");
    expect(evaluateSectionStopRules({ ...input, rules: ["SEM_THRESHOLD", "CLASSIFICATION_CONFIDENCE"] }).reason)
      .toBe("SEM_THRESHOLD_REACHED");
  });
});

describe("evaluateSectionStop — profile wiring", () => {
  it("uses the profile's section floor, budget and SEM target", () => {
    const profile = getProfile("General English");
    const skill = profile.sectionOrder[0];
    const cfg = profile.sectionConfig[skill];
    const below = evaluateSectionStop({
      profile, sectionIndex: 0, sectionCount: cfg.minItems - 1, totalOperationalResponses: cfg.minItems - 1,
      ability: { theta: 0, sem: 0.05 },
    });
    expect(below.stop).toBe(false);
    const met = evaluateSectionStop({
      profile, sectionIndex: 0, sectionCount: cfg.minItems, totalOperationalResponses: cfg.minItems,
      ability: { theta: 0, sem: cfg.semThreshold },
    });
    expect(met).toMatchObject({ stop: true, reason: "SEM_THRESHOLD_REACHED" });
    expect(met.sectionMaxItems).toBeGreaterThanOrEqual(cfg.minItems);
    expect(met.sectionMaxItems).toBeLessThanOrEqual(cfg.maxItems);
  });

  it("reserves later sections' minima in the budget", () => {
    const profile = getProfile("General English");
    const skill = profile.sectionOrder[0];
    const cfg = profile.sectionConfig[skill];
    // Pretend the session already spent almost the whole global budget.
    const spent = profile.globalMaxItems - 1;
    const out = evaluateSectionStop({
      profile, sectionIndex: 0, sectionCount: cfg.minItems, totalOperationalResponses: spent,
      ability: { theta: 0, sem: 0.9 },
    });
    expect(out.sectionMaxItems).toBe(cfg.minItems);
    expect(out).toMatchObject({ stop: true, reason: "ITEM_BUDGET_REACHED" });
  });
});
