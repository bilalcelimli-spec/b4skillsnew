import { describe, it, expect } from "vitest";
import { capItemsPerPassage, passageKey } from "../src/lib/assessment-engine/passage-cap";

const item = (id: string, passage?: string) => ({ id, metadata: passage === undefined ? {} : { passage } }) as any;
const listening = (id: string, script: string) => ({ id, metadata: { ttsScript: script } }) as any;

describe("passageKey", () => {
  it("is stable for identical text and differs for different text", () => {
    expect(passageKey(item("a", "Same text."))).toBe(passageKey(item("b", "  Same text. ")));
    expect(passageKey(item("a", "Text one."))).not.toBe(passageKey(item("b", "Text two.")));
  });
  it("returns null without a text, and reads recording scripts too", () => {
    expect(passageKey(item("a"))).toBeNull();
    expect(passageKey(item("a", "   "))).toBeNull();
    expect(passageKey(listening("l", "Maria: hi."))).not.toBeNull();
  });
});

describe("capItemsPerPassage", () => {
  const filler = Array.from({ length: 6 }, (_, i) => item(`f${i}`, `Other text ${i}`));

  it("removes items of a passage already used twice", () => {
    const administered = [item("s1", "P"), item("s2", "P")];
    const pool = [item("s3", "P"), ...filler];
    const out = capItemsPerPassage(pool, administered);
    expect(out.map((i) => i.id)).not.toContain("s3");
    expect(out).toHaveLength(6);
  });

  it("still allows a second item from a passage seen once", () => {
    const out = capItemsPerPassage([item("s2", "P"), ...filler], [item("s1", "P")]);
    expect(out.map((i) => i.id)).toContain("s2");
  });

  it("never touches items without a text", () => {
    const out = capItemsPerPassage([item("g1"), item("g2"), ...filler], [item("s1", "P"), item("s2", "P")]);
    expect(out.map((i) => i.id)).toEqual(expect.arrayContaining(["g1", "g2"]));
  });

  it("lifts the cap when it would leave too few candidates", () => {
    const pool = [item("s3", "P"), item("x1", "Q"), item("x2", "R")];
    const out = capItemsPerPassage(pool, [item("s1", "P"), item("s2", "P")]);
    expect(out).toHaveLength(3);
  });

  it("returns the original pool when nothing was administered with a text", () => {
    const pool = [item("a", "P"), item("b", "P")];
    expect(capItemsPerPassage(pool, [item("g")])).toBe(pool);
  });

  it("caps listening recordings the same way", () => {
    const pool = [listening("l3", "Script"), ...Array.from({ length: 6 }, (_, i) => listening(`o${i}`, `Other ${i}`))];
    const out = capItemsPerPassage(pool, [listening("l1", "Script"), listening("l2", "Script")]);
    expect(out.map((i) => i.id)).not.toContain("l3");
  });
});
