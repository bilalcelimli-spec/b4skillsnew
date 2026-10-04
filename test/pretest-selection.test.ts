import { describe, it, expect } from "vitest";
import { selectPretestItem, PRETEST_B_BAND } from "../src/lib/assessment-engine/pretest-selection";

const item = (id: string, b: number, exposureCount = 0) =>
  ({ id, skill: "READING", params: { a: 1, b, c: 0.2 }, isPretest: true, exposureCount }) as any;

describe("selectPretestItem", () => {
  it("returns null for an empty pool", () => {
    expect(selectPretestItem([], 0)).toBeNull();
  });

  it("prefers the least-exposed item inside the b band", () => {
    const pool = [item("near-busy", 0.05, 40), item("near-fresh", 0.6, 2), item("far-fresh", 3, 0)];
    expect(selectPretestItem(pool, 0)!.id).toBe("near-fresh");
  });

  it("breaks exposure ties by closeness of b, then id", () => {
    expect(selectPretestItem([item("b", 0.8, 5), item("a", 0.2, 5)], 0)!.id).toBe("a");
    expect(selectPretestItem([item("z", 0.5, 5), item("m", -0.5, 5)], 0)!.id).toBe("m");
  });

  it("falls back to the nearest items when none are within the band", () => {
    const pool = [item("far1", 2.5, 9), item("far2", 3.5, 0), item("far3", -4, 0)];
    expect(selectPretestItem(pool, 0)!.id).toBe("far2");
    expect(Math.abs(2.5)).toBeGreaterThan(PRETEST_B_BAND);
  });

  it("treats a missing exposureCount as zero", () => {
    const noCount = { id: "n", skill: "READING", params: { a: 1, b: 0.3, c: 0 }, isPretest: true } as any;
    expect(selectPretestItem([item("seen", 0.1, 3), noCount], 0)!.id).toBe("n");
  });

  it("spreads traffic: repeated selection with increments visits every in-band item", () => {
    const pool = [item("a", 0.1), item("b", -0.4), item("c", 0.7), item("d", 0.3)];
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const pick = selectPretestItem(pool, 0)!;
      seen.add(pick.id);
      (pick as any).exposureCount += 1;
    }
    expect(seen.size).toBe(4);
  });
});
