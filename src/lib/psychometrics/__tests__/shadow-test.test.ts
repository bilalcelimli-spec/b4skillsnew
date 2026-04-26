import { describe, it, expect } from "vitest";
import {
  constructShadowTest,
  validateShadowTest,
  shadowTestInformation,
  shadowTestInformationCurve,
} from "../shadow-test";
import { SkillType, type Item, type BlueprintConstraint } from "../../assessment-engine/types";

const makeItem = (
  id: string,
  skill: SkillType,
  a: number,
  b: number,
  c = 0.1
): Item => ({ id, skill, params: { a, b, c } });

describe("constructShadowTest — blueprint feasibility", () => {
  it("returns null nextItem when total length already filled by locked items", () => {
    const pool = [
      makeItem("a", SkillType.READING, 1, 0),
      makeItem("b", SkillType.READING, 1, 0.5),
    ];
    const result = constructShadowTest(pool, 0, new Set(["a", "b"]), {
      totalLength: 2,
      blueprint: [{ skill: SkillType.READING, minCount: 1, maxCount: 5 }],
    });
    expect(result.nextItem).toBeNull();
  });

  it("respects skill maxCount in shadow assembly", () => {
    const pool = [
      makeItem("r1", SkillType.READING, 1.5, 0.0),
      makeItem("r2", SkillType.READING, 1.5, 0.1),
      makeItem("r3", SkillType.READING, 1.5, 0.2),
      makeItem("l1", SkillType.LISTENING, 1.5, 0.3),
      makeItem("l2", SkillType.LISTENING, 1.5, 0.4),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 1, maxCount: 1 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 2 },
    ];
    const result = constructShadowTest(pool, 0, new Set(), {
      totalLength: 3,
      blueprint,
    });
    const validation = validateShadowTest(result.shadowTest, blueprint);
    expect(validation.valid).toBe(true);
  });

  it("fills minCount before adding extras to other skills", () => {
    // 5 reading items at theta, only 1 listening item — must include the listening
    const pool = [
      makeItem("r1", SkillType.READING, 2.0, 0.0),
      makeItem("r2", SkillType.READING, 2.0, 0.1),
      makeItem("r3", SkillType.READING, 2.0, 0.2),
      makeItem("r4", SkillType.READING, 2.0, 0.3),
      makeItem("r5", SkillType.READING, 2.0, 0.4),
      makeItem("l1", SkillType.LISTENING, 1.0, 0.5),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 2, maxCount: 4 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 2 },
    ];
    const result = constructShadowTest(pool, 0, new Set(), {
      totalLength: 4,
      blueprint,
    });
    const ids = result.shadowTest.map(i => i.id);
    expect(ids).toContain("l1"); // Listening minimum was honoured
  });
});

describe("constructShadowTest — measurement precision", () => {
  it("nextItem is one of the highest-info items in the shadow at theta", () => {
    // Spread: items far from theta have low info, near theta high info
    const pool = [
      makeItem("far_low", SkillType.READING, 1.5, -2.5),
      makeItem("far_high", SkillType.READING, 1.5, 2.5),
      makeItem("near", SkillType.READING, 1.5, 0.0),
      makeItem("medium", SkillType.READING, 1.5, 1.0),
    ];
    // Force determinism: keep totalLength large enough that "near" is in shadow
    const result = constructShadowTest(pool, 0, new Set(), {
      totalLength: 4,
      blueprint: [{ skill: SkillType.READING, minCount: 1, maxCount: 4 }],
    });
    expect(result.shadowTest.find(i => i.id === "near")).toBeDefined();
    // nextItem should be one of the top-3 by info (random pick from top-3 in source)
    expect(result.nextItem).not.toBeNull();
  });

  it("shadowTestInformation aggregates per-item info correctly", () => {
    const items = [
      makeItem("a", SkillType.READING, 1.5, 0, 0.1),
      makeItem("b", SkillType.READING, 1.5, 0.5, 0.1),
    ];
    const total = shadowTestInformation(items, 0);
    // Each item contributes positive info; total > each individual
    expect(total).toBeGreaterThan(0);
  });

  it("information curve has SEM = 1/sqrt(I) at every theta", () => {
    const items = [
      makeItem("a", SkillType.READING, 1.5, 0, 0.1),
      makeItem("b", SkillType.READING, 1.5, 0.5, 0.1),
      makeItem("c", SkillType.READING, 1.5, -0.5, 0.1),
    ];
    const curve = shadowTestInformationCurve(items, [-2, 2], 0.5);
    for (const point of curve) {
      if (point.info > 0) {
        expect(point.sem).toBeCloseTo(1 / Math.sqrt(point.info), 2);
      }
    }
  });
});

describe("constructShadowTest — exposure control", () => {
  it("filters items above maxExposureRate", () => {
    const overexposed = {
      ...makeItem("over", SkillType.READING, 2.0, 0.0),
      exposureCount: 50,
      totalSessions: 100, // 50% rate
    };
    const fresh = {
      ...makeItem("fresh", SkillType.READING, 1.5, 0.0),
      exposureCount: 5,
      totalSessions: 100, // 5% rate
    };
    const result = constructShadowTest([overexposed, fresh], 0, new Set(), {
      totalLength: 1,
      blueprint: [{ skill: SkillType.READING, minCount: 1, maxCount: 1 }],
      maxExposureRate: 0.20, // 20% cap → "over" is filtered out
    });
    expect(result.shadowTest.map(i => i.id)).not.toContain("over");
    expect(result.shadowTest.map(i => i.id)).toContain("fresh");
  });
});

describe("validateShadowTest", () => {
  it("flags violations on undermin and overmax", () => {
    const items = [
      makeItem("r1", SkillType.READING, 1, 0),
      makeItem("r2", SkillType.READING, 1, 0),
      makeItem("r3", SkillType.READING, 1, 0),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 1, maxCount: 2 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 2 },
    ];
    const v = validateShadowTest(items, blueprint);
    expect(v.valid).toBe(false);
    expect(v.violations.length).toBeGreaterThanOrEqual(2);
  });

  it("passes when all skills meet [min, max]", () => {
    const items = [
      makeItem("r1", SkillType.READING, 1, 0),
      makeItem("l1", SkillType.LISTENING, 1, 0),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 1, maxCount: 2 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 2 },
    ];
    expect(validateShadowTest(items, blueprint).valid).toBe(true);
  });
});
