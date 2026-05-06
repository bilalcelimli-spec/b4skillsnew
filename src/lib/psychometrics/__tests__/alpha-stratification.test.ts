import { describe, it, expect } from "vitest";
import {
  buildAlphaStrata,
  currentStratum,
  alphaStratifiedFilter,
  alphaStratifiedScore,
} from "../alpha-stratification.js";
import type { Item } from "../../assessment-engine/types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: string, a: number): Item {
  return {
    id,
    params: { a, b: 0, c: 0.2 },
    cefrLevel: "B1",
    skill: "GRAMMAR",
    content: {},
  } as unknown as Item;
}

const POOL_20 = Array.from({ length: 20 }, (_, i) =>
  makeItem(`item_${i}`, 0.5 + i * 0.1)
);

// ─── buildAlphaStrata ─────────────────────────────────────────────────────────

describe("buildAlphaStrata", () => {
  it("returns empty strata for an empty pool", () => {
    const result = buildAlphaStrata([], 4);
    expect(result.nStrata).toBe(4);
    expect(result.strata).toHaveLength(0);
    expect(result.itemStratumMap.size).toBe(0);
  });

  it("partitions all items into nStrata groups", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    expect(strata.nStrata).toBe(4);
    const totalInMap = strata.itemStratumMap.size;
    expect(totalInMap).toBe(20);
  });

  it("every item gets a stratum index in [0, nStrata-1]", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    for (const [, s] of strata.itemStratumMap) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(3);
    }
  });

  it("lower strata have smaller a-values than higher strata", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    const stratum0 = strata.strata[0];
    const stratum3 = strata.strata[3];
    expect(stratum0.maxA).toBeLessThanOrEqual(stratum3.minA);
  });

  it("works with nStrata = 1", () => {
    const strata = buildAlphaStrata(POOL_20, 1);
    expect(strata.nStrata).toBe(1);
    expect(strata.strata).toHaveLength(1);
    expect(strata.itemStratumMap.size).toBe(20);
  });

  it("works with fewer items than strata", () => {
    const pool = [makeItem("a", 1.0), makeItem("b", 1.5)];
    const strata = buildAlphaStrata(pool, 4);
    expect(strata.itemStratumMap.size).toBe(2);
  });
});

// ─── currentStratum ────────────────────────────────────────────────────────────

describe("currentStratum", () => {
  it("returns 0 at start of test", () => {
    expect(currentStratum(0, 30, 4)).toBe(0);
  });

  it("returns nStrata-1 at end of test", () => {
    expect(currentStratum(30, 30, 4)).toBe(3);
  });

  it("increments at correct item boundaries", () => {
    // 30 items, 4 strata → each stratum covers 7-8 items
    expect(currentStratum(7, 30, 4)).toBe(0);
    expect(currentStratum(8, 30, 4)).toBe(1);
    expect(currentStratum(15, 30, 4)).toBe(2);
    expect(currentStratum(23, 30, 4)).toBe(3);
  });

  it("clamps to nStrata-1 when nAdministered >= targetLength", () => {
    expect(currentStratum(50, 30, 4)).toBe(3);
  });

  it("handles targetLength = 0 without division by zero", () => {
    expect(() => currentStratum(0, 0, 4)).not.toThrow();
  });
});

// ─── alphaStratifiedFilter ────────────────────────────────────────────────────

describe("alphaStratifiedFilter", () => {
  it("returns full pool when strata is empty", () => {
    const strata = buildAlphaStrata([], 4);
    const result = alphaStratifiedFilter(POOL_20, { nAdministered: 0, targetLength: 30, theta: 0, usedItemIds: new Set() }, strata);
    expect(result).toHaveLength(POOL_20.length);
  });

  it("filters to current stratum items", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    const ctx = { nAdministered: 0, targetLength: 20, theta: 0, usedItemIds: new Set<string>() };
    const result = alphaStratifiedFilter(POOL_20, ctx, strata);
    // All returned items should be in stratum 0
    for (const it of result) {
      expect(strata.itemStratumMap.get(it.id)).toBe(0);
    }
  });

  it("excludes already-used items", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    const used = new Set(POOL_20.slice(0, 5).map((it) => it.id));
    const ctx = { nAdministered: 0, targetLength: 20, theta: 0, usedItemIds: used };
    const result = alphaStratifiedFilter(POOL_20, ctx, strata);
    for (const it of result) {
      expect(used.has(it.id)).toBe(false);
    }
  });

  it("expands to adjacent strata when current stratum pool is too small", () => {
    // Only 2 items in strata, force a stratum with 1 item
    const tinyPool = [makeItem("x", 1.0), makeItem("y", 2.0)];
    const strata = buildAlphaStrata(tinyPool, 4);
    const ctx = { nAdministered: 0, targetLength: 30, theta: 0, usedItemIds: new Set<string>() };
    // With minPoolSize=5, should fall back to full pool
    const result = alphaStratifiedFilter(tinyPool, ctx, strata, 5);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty pool when all items are used", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    const used = new Set(POOL_20.map((it) => it.id));
    const ctx = { nAdministered: 0, targetLength: 20, theta: 0, usedItemIds: used };
    const result = alphaStratifiedFilter(POOL_20, ctx, strata);
    expect(result).toHaveLength(0);
  });
});

// ─── alphaStratifiedScore ─────────────────────────────────────────────────────

describe("alphaStratifiedScore", () => {
  it("returns a positive number for a valid item", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    const item = POOL_20[10];
    const score = alphaStratifiedScore(item, 0, 10, 30, strata);
    expect(score).toBeGreaterThan(0);
  });

  it("applies stratum bonus: same item scores higher when it matches current stratum", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    const itemStratum0 = POOL_20[0]; // lowest a → in stratum 0
    // Score same item at test start (stratum 0 active) vs test end (stratum 3 active)
    const scoreAtStart = alphaStratifiedScore(itemStratum0, 0, 0, 20, strata, 1.0);
    const scoreAtEnd = alphaStratifiedScore(itemStratum0, 0, 19, 20, strata, 1.0);
    // At test start stratum 0 is active (bonus applies), at end stratum 3 is active (no bonus)
    expect(scoreAtStart).toBeGreaterThan(scoreAtEnd);
  });

  it("does not throw for unknown item id", () => {
    const strata = buildAlphaStrata(POOL_20, 4);
    const unknownItem = makeItem("unknown_id", 1.0);
    expect(() => alphaStratifiedScore(unknownItem, 0, 5, 20, strata)).not.toThrow();
  });
});
