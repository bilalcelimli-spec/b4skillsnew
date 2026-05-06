import { describe, it, expect } from "vitest";
import {
  tuckerEquating,
  levineEquating,
  anchorDriftReport,
  runCinegEquating,
} from "../equating-cineg.js";
import type { IrtParameters } from "../../assessment-engine/types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate n scores from a linear scale (mean ± spread) */
function syntheticScores(n: number, mean: number, spread: number, seed = 1): number[] {
  const scores: number[] = [];
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 16807) % 2147483647;
    scores.push(mean + (x / 2147483647 - 0.5) * 2 * spread);
  }
  return scores;
}

const OLD_TOTAL = syntheticScores(100, 20, 5, 1);
const OLD_ANCHOR = syntheticScores(100, 8, 2, 2);
const NEW_TOTAL = syntheticScores(100, 18, 5, 3);
const NEW_ANCHOR = syntheticScores(100, 7, 2, 4);

// ─── tuckerEquating ────────────────────────────────────────────────────────────

describe("tuckerEquating", () => {
  it("returns A and B equating constants", () => {
    const result = tuckerEquating(OLD_TOTAL, OLD_ANCHOR, NEW_TOTAL, NEW_ANCHOR);
    expect(typeof result.A).toBe("number");
    expect(typeof result.B).toBe("number");
    expect(result.method).toBe("TUCKER");
  });

  it("A is close to 1 when groups are equivalent", () => {
    const equivalent = syntheticScores(50, 20, 5, 10);
    const anchor = syntheticScores(50, 8, 2, 11);
    const result = tuckerEquating(equivalent, anchor, equivalent, anchor);
    expect(result.A).toBeCloseTo(1, 1);
    expect(result.B).toBeCloseTo(0, 1);
  });

  it("throws when total and anchor arrays have different lengths", () => {
    expect(() =>
      tuckerEquating(OLD_TOTAL, OLD_ANCHOR.slice(0, 50), NEW_TOTAL, NEW_ANCHOR)
    ).toThrow("Tucker: total and anchor arrays must have the same length");
  });

  it("throws when fewer than 10 responses per group", () => {
    const small = Array(5).fill(15);
    expect(() => tuckerEquating(small, small, small, small)).toThrow(
      "Tucker: need at least 10 responses per group"
    );
  });

  it("w1 and w2 sum to 1", () => {
    const result = tuckerEquating(OLD_TOTAL, OLD_ANCHOR, NEW_TOTAL, NEW_ANCHOR, 0.3);
    expect(result.w1).toBeCloseTo(0.3, 5);
    expect(result.w2).toBeCloseTo(0.7, 5);
    expect(result.w1 + result.w2).toBeCloseTo(1, 10);
  });

  it("commonItemCount equals min of anchor array lengths", () => {
    const result = tuckerEquating(OLD_TOTAL, OLD_ANCHOR, NEW_TOTAL, NEW_ANCHOR);
    expect(result.commonItemCount).toBe(Math.min(OLD_ANCHOR.length, NEW_ANCHOR.length));
  });
});

// ─── levineEquating ────────────────────────────────────────────────────────────

describe("levineEquating", () => {
  it("returns LEVINE method and equating constants", () => {
    const result = levineEquating(OLD_TOTAL, OLD_ANCHOR, NEW_TOTAL, NEW_ANCHOR, 20, 20, 10);
    expect(result.method).toBe("LEVINE");
    expect(typeof result.A).toBe("number");
    expect(typeof result.B).toBe("number");
  });

  it("throws when array lengths mismatch", () => {
    expect(() =>
      levineEquating(OLD_TOTAL, OLD_ANCHOR.slice(0, 50), NEW_TOTAL, NEW_ANCHOR, 20, 20, 5)
    ).toThrow();
  });

  it("A close to 1 when groups are identical", () => {
    const t = syntheticScores(50, 20, 4, 20);
    const v = syntheticScores(50, 8, 1, 21);
    const result = levineEquating(t, v, t, v, 20, 20, 5);
    expect(result.A).toBeCloseTo(1, 0);
  });
});

// ─── anchorDriftReport ────────────────────────────────────────────────────────

describe("anchorDriftReport", () => {
  const anchors = [
    { itemId: "i1", paramsOld: { a: 1, b: 0, c: 0.2 } as IrtParameters, paramsNew: { a: 1, b: 0.1, c: 0.2 } as IrtParameters },
    { itemId: "i2", paramsOld: { a: 1, b: 1, c: 0.2 } as IrtParameters, paramsNew: { a: 1, b: 1.5, c: 0.2 } as IrtParameters },
  ];

  it("flags items with drift ≥ 0.3 logits", () => {
    const report = anchorDriftReport(anchors, { A: 1, B: 0, method: "TUCKER", commonItemCount: 2, rmsd: 0.01 });
    const item2 = report.find((r) => r.itemId === "i2")!;
    expect(item2.flagged).toBe(true); // drift = 0.5
    const item1 = report.find((r) => r.itemId === "i1")!;
    expect(item1.flagged).toBe(false); // drift = 0.1
  });

  it("returns correct itemIds", () => {
    const report = anchorDriftReport(anchors, { A: 1, B: 0, method: "TUCKER", commonItemCount: 2, rmsd: 0 });
    expect(report.map((r) => r.itemId)).toEqual(["i1", "i2"]);
  });

  it("drift is bNew_on_old_scale - bOld", () => {
    // With A=1, B=0 the transformation is identity
    const report = anchorDriftReport(
      [{ itemId: "x", paramsOld: { a: 1, b: 0.5, c: 0.2 } as IrtParameters, paramsNew: { a: 1, b: 0.9, c: 0.2 } as IrtParameters }],
      { A: 1, B: 0, method: "TUCKER", commonItemCount: 1, rmsd: 0 }
    );
    expect(report[0].drift).toBeCloseTo(0.4, 3);
  });

  it("returns empty array for no anchor items", () => {
    const report = anchorDriftReport([], { A: 1, B: 0, method: "TUCKER", commonItemCount: 0, rmsd: 0 });
    expect(report).toHaveLength(0);
  });
});

// ─── runCinegEquating ─────────────────────────────────────────────────────────

describe("runCinegEquating", () => {
  it("returns tucker and levine results", () => {
    const result = runCinegEquating({
      oldFormScores: OLD_TOTAL,
      oldAnchorScores: OLD_ANCHOR,
      newFormScores: NEW_TOTAL,
      newAnchorScores: NEW_ANCHOR,
      n1: 25,
      n2: 25,
    });
    expect(result.tucker.equating.method).toBe("TUCKER");
    expect(result.levine.equating.method).toBe("LEVINE");
  });

  it("includes a recommendation string", () => {
    const result = runCinegEquating({
      oldFormScores: OLD_TOTAL,
      oldAnchorScores: OLD_ANCHOR,
      newFormScores: NEW_TOTAL,
      newAnchorScores: NEW_ANCHOR,
      n1: 20,
      n2: 20,
    });
    expect(["TUCKER", "LEVINE"]).toContain(result.recommendation);
    expect(typeof result.recommendationReason).toBe("string");
  });
});
