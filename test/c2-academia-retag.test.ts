import { describe, expect, it } from "vitest";
import { academiaServes, RETAGS, retagged } from "../scripts/jobs/apply-c2-academia-retag";

const item = (over: Record<string, unknown> = {}): any => ({
  skill: "SPEAKING", cefrLevel: "C2", discrimination: 1, guessing: 0, ageSuitability: "UNIVERSAL",
  tags: ["speaking", "c2", "language-schools"], content: { prompt: "Discuss.", productLine: "Language Schools" }, ...over,
});

describe("C2 Academia retag (2026-11-22)", () => {
  it("covers the two C2 items, each with a note for the reviewer", () => {
    expect(RETAGS.map((r) => r.itemCode)).toEqual(["SPK-C2-0009", "WRT-C2-0010"]);
    for (const r of RETAGS) expect(r.reviewNote.length).toBeGreaterThan(20);
  });

  it("Academia does not serve the item as tagged today", () => {
    expect(academiaServes(item())).toBe(false);
  });

  it("swaps the Language Schools source for Academia, and then Academia serves it", () => {
    const next = retagged(item())!;
    expect(next.tags).toEqual(["speaking", "c2", "academia"]);
    expect(next.content.productLine).toBe("academia");
    expect(academiaServes(item(next))).toBe(true);
    expect(academiaServes(item({ ...next, skill: "WRITING" }))).toBe(true);
  });

  it("leaves items without a Language Schools source alone", () => {
    expect(retagged({ tags: ["corporate"], content: { productLine: "corporate" } })).toBeNull();
  });
});
