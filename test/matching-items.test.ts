import { describe, it, expect } from "vitest";
import { assembleMatching, validateRawMatching, validateAssembledMatching, chanceOfExactMatch, guessingForMatching, type RawMatching } from "../src/lib/content-factory/matching-items";
import { scoreStructuredResponse } from "../src/lib/assessment-engine/structured-response";
import { scoreMapping } from "../src/lib/ai/validation/gates/matching-dependency";
import { stripAnswerKeys } from "../src/lib/security/answer-sanitizer";

const raw: RawMatching = {
  prompt: "Match each speaker with the view they express.",
  pairs: [
    { zone: "Maria", answer: "Remote work has weakened team spirit" },
    { zone: "Tom", answer: "Flexible hours help people focus better" },
    { zone: "Aisha", answer: "Training matters more than the location" },
  ],
  extraItems: ["Offices should be closed down entirely"],
};

describe("matching items", () => {
  it("accepts a well-formed draft", () => {
    expect(validateRawMatching(raw)).toEqual([]);
  });

  it("rejects too few pairs, no extras, duplicates and wildly different lengths", () => {
    expect(validateRawMatching({ ...raw, pairs: raw.pairs.slice(0, 2) })).toEqual(expect.arrayContaining([expect.stringContaining("Need 3-5 pairs")]));
    expect(validateRawMatching({ ...raw, extraItems: [] })).toEqual(expect.arrayContaining(["Need at least 1 extra (unused) item"]));
    expect(validateRawMatching({ ...raw, extraItems: ["flexible hours help people focus better"] })).toContain("Duplicate items");
    expect(validateRawMatching({ ...raw, extraItems: ["No"] })).toEqual(expect.arrayContaining([expect.stringContaining("lengths differ")]));
  });

  it("assembles a mapping the scorer accepts and scores correctly", () => {
    const c = assembleMatching(raw, "seed-1");
    expect(validateAssembledMatching(c)).toEqual([]);
    const good = { kind: "matching", mapping: c.correctMapping };
    expect(scoreStructuredResponse(c, good)).toBe(1);
    const swapped = { kind: "matching", mapping: { ...c.correctMapping, "0": c.correctMapping["1"], "1": c.correctMapping["0"] } };
    expect(scoreStructuredResponse(c, swapped)).toBe(0);
  });

  it("maps each zone to the right answer text after shuffling", () => {
    const c = assembleMatching(raw, "seed-2");
    raw.pairs.forEach((p, i) => expect(c.draggableItems[c.correctMapping[String(i)]]).toBe(p.answer));
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(assembleMatching(raw, "a")).toEqual(assembleMatching(raw, "a"));
    const orders = new Set(["a", "b", "c", "d", "e", "f"].map((s) => assembleMatching(raw, s).draggableItems.join("|")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("does not leak the key to candidates", () => {
    const safe = JSON.stringify(stripAnswerKeys(assembleMatching(raw, "s")));
    expect(safe).not.toContain("correctMapping");
    expect(safe).toContain("draggableItems");
  });

  it("computes guessing chance as (items-zones)!/items!", () => {
    expect(chanceOfExactMatch(3, 4)).toBeCloseTo(1 / 24);
    expect(chanceOfExactMatch(4, 5)).toBeCloseTo(1 / 120);
    expect(guessingForMatching(4, 5)).toBe(0.02);
    expect(guessingForMatching(3, 4)).toBeCloseTo(1 / 24);
  });

  it("scores exact and partial blind mappings", () => {
    const key = { "0": 2, "1": 0, "2": 3 };
    expect(scoreMapping([2, 0, 3], key, 3)).toEqual({ exact: true, fraction: 1 });
    expect(scoreMapping([2, 1, 3], key, 3).fraction).toBeCloseTo(2 / 3);
  });
});
