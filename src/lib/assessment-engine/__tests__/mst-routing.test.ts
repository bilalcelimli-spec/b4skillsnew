import { describe, it, expect } from "vitest";
import {
  getMstModulePosition,
  mstTotalOperationalItems,
  operationalResponseCount,
  filterPoolByMstModule,
  routeKeyFromTheta,
  filterPoolByMstRoute,
} from "../mst-routing";
import { SkillType, type Item, type Response } from "../types";

describe("mst-routing", () => {
  it("getMstModulePosition walks 1-2-3", () => {
    const sizes: [number, number, number] = [1, 2, 3];
    expect(getMstModulePosition(0, sizes).moduleIndex).toBe(0);
    expect(getMstModulePosition(0, sizes).mstComplete).toBe(false);

    expect(getMstModulePosition(1, sizes).moduleIndex).toBe(1);
    expect(getMstModulePosition(1, sizes).indexWithinModule).toBe(0);

    expect(getMstModulePosition(2, sizes).moduleIndex).toBe(1);
    expect(getMstModulePosition(3, sizes).moduleIndex).toBe(2);
    expect(getMstModulePosition(5, sizes).mstComplete).toBe(false);
    expect(getMstModulePosition(5, sizes).moduleIndex).toBe(2);

    expect(getMstModulePosition(6, sizes).mstComplete).toBe(true);
    expect(mstTotalOperationalItems(sizes)).toBe(6);
  });

  it("operationalResponseCount ignores pretest", () => {
    const responses: Response[] = [
      { itemId: "a", score: 1, isPretest: true },
      { itemId: "b", score: 1, isPretest: false },
    ];
    expect(operationalResponseCount(responses)).toBe(1);
  });

  it("filterPoolByMstModule prefers metadata.mstModule", () => {
    const pool: Item[] = [
      { id: "x", skill: SkillType.GRAMMAR, params: { a: 1, b: 0, c: 0.2 }, metadata: { mstModule: 0 } },
      { id: "y", skill: SkillType.GRAMMAR, params: { a: 1, b: 0, c: 0.2 }, metadata: { mstModule: 1 } },
    ];
    const m0 = filterPoolByMstModule(pool, 0);
    expect(m0.usedStrictPool).toBe(true);
    expect(m0.filtered.map((i) => i.id)).toEqual(["x"]);
    const fallback = filterPoolByMstModule(
      [{ id: "a", skill: SkillType.GRAMMAR, params: { a: 1, b: 0, c: 0.2 } }],
      0
    );
    expect(fallback.usedStrictPool).toBe(false);
    expect(fallback.filtered).toHaveLength(1);
  });

  it("routeKeyFromTheta triages by cutoffs", () => {
    expect(routeKeyFromTheta(-1, -0.5, 0.5)).toBe("low");
    expect(routeKeyFromTheta(0, -0.5, 0.5)).toBe("mid");
    expect(routeKeyFromTheta(1, -0.5, 0.5)).toBe("high");
  });

  it("filterPoolByMstRoute narrows when tags exist", () => {
    const pool: Item[] = [
      { id: "a", skill: SkillType.READING, params: { a: 1, b: 0, c: 0.2 }, metadata: { mstModule: 1, mstRoute: "low" } },
      { id: "b", skill: SkillType.READING, params: { a: 1, b: 0, c: 0.2 }, metadata: { mstModule: 1, mstRoute: "high" } },
    ];
    const r = filterPoolByMstRoute(pool, 1, "low");
    expect(r.map((i) => i.id)).toEqual(["a"]);
  });
});
