import { describe, expect, it } from "vitest";
import {
  constructShadowTestLP,
  constructShadowTestLPAdapter,
} from "../shadow-test-solver";
import { SkillType } from "../../assessment-engine/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SolverItem = Parameters<typeof constructShadowTestLP>[0][0];

function makeItem(
  id: string,
  skill: SkillType,
  a: number,
  b: number,
  cefrLevel = "B1"
): SolverItem {
  return {
    id,
    skill,
    cefrLevel,
    type: "MULTIPLE_CHOICE" as any,
    params: { a, b, c: 0.2 },
    isPretest: false,
    content: {},
  } as any;
}

function makePool(n: number, skill: SkillType, aBase = 1.2): SolverItem[] {
  return Array.from({ length: n }, (_, i) =>
    makeItem(`${skill.toLowerCase()}-${i}`, skill, aBase + i * 0.01, (i / n) * 4 - 2)
  );
}

const BLUEPRINT = [
  { skill: SkillType.READING,    minCount: 3, maxCount: 8 },
  { skill: SkillType.LISTENING,  minCount: 3, maxCount: 8 },
  { skill: SkillType.GRAMMAR,    minCount: 3, maxCount: 8 },
  { skill: SkillType.VOCABULARY, minCount: 2, maxCount: 6 },
];

const TOTAL_LENGTH = 20;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("constructShadowTestLP()", () => {
  const pool: SolverItem[] = [
    ...makePool(15, SkillType.READING),
    ...makePool(15, SkillType.LISTENING),
    ...makePool(15, SkillType.GRAMMAR),
    ...makePool(10, SkillType.VOCABULARY),
  ];

  it("returns a shadow test of exactly totalLength items", () => {
    const { shadowTest } = constructShadowTestLP(pool, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    expect(shadowTest.length).toBe(TOTAL_LENGTH);
  });

  it("all selected items come from the pool", () => {
    const poolIds = new Set(pool.map((it) => it.id));
    const { shadowTest } = constructShadowTestLP(pool, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    for (const item of shadowTest) expect(poolIds.has(item.id)).toBe(true);
  });

  it("satisfies minimum blueprint requirements (no violations)", () => {
    const { violations } = constructShadowTestLP(pool, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    expect(violations).toHaveLength(0);
  });

  it("does not duplicate items", () => {
    const { shadowTest } = constructShadowTestLP(pool, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    const ids = shadowTest.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("locks already-administered items into the shadow test", () => {
    const usedIds = new Set([pool[0].id, pool[1].id, pool[15].id]);
    const { shadowTest } = constructShadowTestLP(pool, 0.0, usedIds, {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    for (const id of usedIds) {
      expect(shadowTest.some((it) => it.id === id)).toBe(true);
    }
  });

  it("returns nextItem that is NOT in usedItemIds", () => {
    const usedIds = new Set([pool[0].id]);
    const { nextItem } = constructShadowTestLP(pool, 0.0, usedIds, {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    expect(nextItem).not.toBeNull();
    expect(usedIds.has(nextItem!.id)).toBe(false);
  });

  it("nextItem is null when all shadow items are administered", () => {
    const { shadowTest } = constructShadowTestLP(pool, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    const allUsed = new Set(shadowTest.map((it) => it.id));
    const { nextItem } = constructShadowTestLP(pool, 0.0, allUsed, {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    expect(nextItem).toBeNull();
  });

  it("reports iterations ≥ 1", () => {
    const { iterations } = constructShadowTestLP(pool, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    expect(iterations).toBeGreaterThanOrEqual(1);
  });

  it("returns dual prices for each skill constraint", () => {
    const { dualPrices } = constructShadowTestLP(pool, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    for (const c of BLUEPRINT) {
      expect(`skill:${c.skill}` in dualPrices).toBe(true);
    }
  });

  it("handles a small pool (< totalLength) gracefully", () => {
    const tinyPool = makePool(5, SkillType.READING);
    const { shadowTest, violations } = constructShadowTestLP(tinyPool, 0.0, new Set(), {
      totalLength: 20,
      blueprint: [{ skill: SkillType.READING, minCount: 3, maxCount: 20 }],
    });
    // Should not throw; may have violations but shadow ≤ pool size
    expect(shadowTest.length).toBeLessThanOrEqual(tinyPool.length);
    expect(Array.isArray(violations)).toBe(true);
  });

  it("respects maxPerCefrLevel constraint", () => {
    const mixedPool: SolverItem[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeItem(`r-b1-${i}`, SkillType.READING, 1.2, 0, "B1")
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makeItem(`r-b2-${i}`, SkillType.READING, 1.5, 1, "B2")
      ),
    ];
    const { shadowTest } = constructShadowTestLP(mixedPool, 0.0, new Set(), {
      totalLength: 10,
      blueprint: [{ skill: SkillType.READING, minCount: 1, maxCount: 10 }],
      maxPerCefrLevel: 4,
    });
    const b1Count = shadowTest.filter((it) => it.cefrLevel === "B1").length;
    const b2Count = shadowTest.filter((it) => it.cefrLevel === "B2").length;
    expect(b1Count).toBeLessThanOrEqual(4);
    expect(b2Count).toBeLessThanOrEqual(4);
  });

  it("excludes over-exposed items when maxExposureRate is set", () => {
    const poolWithExposure: SolverItem[] = pool.map((it, i) => ({
      ...it,
      exposureCount: i < 5 ? 100 : 1,
      totalSessions: 100,
    }));
    const overExposedIds = new Set(pool.slice(0, 5).map((it) => it.id));
    const { shadowTest } = constructShadowTestLP(poolWithExposure, 0.0, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
      maxExposureRate: 0.20,
    });
    for (const item of shadowTest) {
      expect(overExposedIds.has(item.id)).toBe(false);
    }
  });

  it("adapter returns same shape as original constructShadowTest()", () => {
    const result = constructShadowTestLPAdapter(pool, 0.5, new Set(), {
      totalLength: TOTAL_LENGTH,
      blueprint: BLUEPRINT,
    });
    expect(result).toHaveProperty("shadowTest");
    expect(result).toHaveProperty("nextItem");
    expect(Array.isArray(result.shadowTest)).toBe(true);
  });

  it("higher-information item is preferred as nextItem near θ=0", () => {
    // Two items: one high-a near θ=0, one low-a far from θ=0
    const highInfo = makeItem("high", SkillType.READING, 2.5, 0.0);  // peak at θ=0
    const lowInfo  = makeItem("low",  SkillType.READING, 0.5, 3.0);  // peak far away
    const { nextItem } = constructShadowTestLP(
      [highInfo, lowInfo],
      0.0,
      new Set(),
      {
        totalLength: 1,
        blueprint: [{ skill: SkillType.READING, minCount: 1, maxCount: 1 }],
      }
    );
    // The solver should pick the high-information item
    expect(nextItem?.id).toBe("high");
  });
});
