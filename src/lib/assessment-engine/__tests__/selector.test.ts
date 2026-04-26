import { describe, it, expect, vi, beforeEach } from "vitest";
import { selectNextItem } from "../selector";
import { information } from "../irt";
import { SkillType, type Item, type BlueprintConstraint } from "../types";
import { _resetExposureStoreForTests } from "../exposure-store";

const makeItem = (
  id: string,
  skill: SkillType,
  a: number,
  b: number,
  c = 0.1
): Item => ({ id, skill, params: { a, b, c } });

beforeEach(() => {
  _resetExposureStoreForTests();
  // Force deterministic top-N random selection: always pick the highest-info item
  vi.spyOn(Math, "random").mockReturnValue(0);
});

describe("selectNextItem — basic behaviour", () => {
  it("returns null on empty pool", async () => {
    expect(await selectNextItem([], 0, new Set())).toBeNull();
  });

  it("returns null when all items are used", async () => {
    const pool = [makeItem("a", SkillType.READING, 1, 0)];
    expect(await selectNextItem(pool, 0, new Set(["a"]))).toBeNull();
  });

  it("excludes items already used", async () => {
    const pool = [
      makeItem("a", SkillType.READING, 1.5, 0),
      makeItem("b", SkillType.READING, 1.5, 2),
    ];
    const selected = await selectNextItem(pool, 0, new Set(["a"]), 1);
    expect(selected?.id).toBe("b");
  });
});

describe("selectNextItem — Maximum Fisher Information", () => {
  it("prefers item whose b matches current theta (top-N=1)", async () => {
    const pool = [
      makeItem("far", SkillType.READING, 1.5, 2.5),
      makeItem("near", SkillType.READING, 1.5, 0.0),
      makeItem("medium", SkillType.READING, 1.5, 1.0),
    ];
    const selected = await selectNextItem(pool, 0, new Set(), 1);
    expect(selected?.id).toBe("near");
  });

  it("MFI selection ranks items by Fisher information at theta", async () => {
    const theta = 0.5;
    const pool = [
      makeItem("hi", SkillType.READING, 2.0, 0.5),  // peak at theta
      makeItem("lo", SkillType.READING, 0.5, 0.5),  // same b but flat
    ];
    const infoHi = information(theta, pool[0].params);
    const infoLo = information(theta, pool[1].params);
    expect(infoHi).toBeGreaterThan(infoLo);

    const selected = await selectNextItem(pool, theta, new Set(), 1);
    expect(selected?.id).toBe("hi");
  });
});

describe("selectNextItem — blueprint enforcement", () => {
  it("prefers skills whose minCount has not yet been met", async () => {
    const pool = [
      // Reading items at theta=0 have HIGHER info, but skill is already at min
      makeItem("r1", SkillType.READING, 2.0, 0.0),
      makeItem("r2", SkillType.READING, 2.0, 0.1),
      // Listening items have lower info but skill is below minimum → should win
      makeItem("l1", SkillType.LISTENING, 1.5, 1.5),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 1, maxCount: 5 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 5 },
    ];
    const currentCounts = { [SkillType.READING]: 1, [SkillType.LISTENING]: 0 };

    const selected = await selectNextItem(pool, 0, new Set(), 1, blueprint, currentCounts);
    expect(selected?.skill).toBe(SkillType.LISTENING);
  });

  it("excludes skills that have hit their maxCount", async () => {
    const pool = [
      makeItem("r1", SkillType.READING, 2.0, 0.0),  // capped skill
      makeItem("g1", SkillType.GRAMMAR, 1.0, 0.5),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 0, maxCount: 2 },
      { skill: SkillType.GRAMMAR, minCount: 0, maxCount: 5 },
    ];
    const currentCounts = { [SkillType.READING]: 2, [SkillType.GRAMMAR]: 0 };
    // Reading at cap → must pick grammar even though reading has higher info
    const selected = await selectNextItem(pool, 0, new Set(), 1, blueprint, currentCounts);
    expect(selected?.skill).toBe(SkillType.GRAMMAR);
  });

  it("falls back to full pool when no items exist for unfulfilled skill", async () => {
    // Listening has unmet minimum, but no listening items in pool —
    // selector should NOT silently drop the constraint into oblivion;
    // it should still return *some* item (to avoid blocking the test).
    const pool = [
      makeItem("r1", SkillType.READING, 2.0, 0.0),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 0, maxCount: 5 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 5 },
    ];
    const currentCounts = { [SkillType.READING]: 0, [SkillType.LISTENING]: 0 };
    const selected = await selectNextItem(pool, 0, new Set(), 1, blueprint, currentCounts);
    expect(selected?.id).toBe("r1");
  });
});
