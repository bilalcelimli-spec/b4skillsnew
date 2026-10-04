import { describe, it, expect } from "vitest";
import { assembleSelection, validateRawSelection, validateAssembledSelection, chanceOfExactSelection, guessingForSelection, type RawSelection } from "../src/lib/content-factory/selection-items";
import { scoreStructuredResponse } from "../src/lib/assessment-engine/structured-response";
import { stripAnswerKeys } from "../src/lib/security/answer-sanitizer";

const raw: RawSelection = {
  prompt: "Choose the TWO statements the speaker would agree with.",
  correct: ["Training matters as much as location", "Flexible hours can improve focus"],
  distractors: ["Offices ought to be phased out soon", "Team spirit depends on weekly meetings", "Managers rarely notice remote effort"],
};

describe("selection items", () => {
  it("accepts a well-formed draft", () => expect(validateRawSelection(raw)).toEqual([]));

  it("rejects bad counts, duplicates, length spread and absolutes only in distractors", () => {
    expect(validateRawSelection({ ...raw, correct: raw.correct.slice(0, 1) })).toEqual(expect.arrayContaining([expect.stringContaining("Need 2-3 correct")]));
    expect(validateRawSelection({ ...raw, distractors: [raw.correct[0], "Other thing entirely different here"] })).toContain("Duplicate statements");
    expect(validateRawSelection({ ...raw, distractors: ["No", ...raw.distractors.slice(1)] })).toEqual(expect.arrayContaining([expect.stringContaining("lengths differ")]));
    expect(validateRawSelection({ ...raw, distractors: ["Offices must never be used again", "It always fails for teams here", "Managers rarely notice remote effort"] })).toContain("Absolutes appear only in distractors (test-wiseness cue)");
  });

  it("assembles indexes that point at the right statements", () => {
    const c = assembleSelection(raw, "s1");
    expect(validateAssembledSelection(c)).toEqual([]);
    expect(c.selectCount).toBe(2);
    expect(c.correctAnswers.map((i) => c.draggableItems[i]).sort()).toEqual([...raw.correct].sort());
  });

  it("scores all-or-nothing and validates the response", () => {
    const c = assembleSelection(raw, "s2");
    const [a, b] = c.correctAnswers;
    const wrong = c.draggableItems.findIndex((_, i) => !c.correctAnswers.includes(i));
    expect(scoreStructuredResponse(c, { kind: "selection", selected: [a, b] })).toBe(1);
    expect(scoreStructuredResponse(c, { kind: "selection", selected: [b, a] })).toBe(1);
    expect(scoreStructuredResponse(c, { kind: "selection", selected: [a, wrong] })).toBe(0);
    expect(() => scoreStructuredResponse(c, { kind: "selection", selected: [a] })).toThrow();
    expect(() => scoreStructuredResponse(c, { kind: "selection", selected: [a, a] })).toThrow();
    expect(() => scoreStructuredResponse(c, { kind: "selection", selected: [a, 99] })).toThrow();
    expect(() => scoreStructuredResponse(c, { kind: "matching", selected: [a, b] })).toThrow();
  });

  it("is deterministic per seed and does not leak the key", () => {
    expect(assembleSelection(raw, "x")).toEqual(assembleSelection(raw, "x"));
    const safe = JSON.stringify(stripAnswerKeys(assembleSelection(raw, "k")));
    expect(safe).not.toContain("correctAnswers");
    expect(safe).toContain("selectCount");
  });

  it("computes guessing as 1/C(n,k)", () => {
    expect(chanceOfExactSelection(5, 2)).toBeCloseTo(1 / 10);
    expect(chanceOfExactSelection(6, 3)).toBeCloseTo(1 / 20);
    expect(guessingForSelection(5, 2)).toBeCloseTo(0.1);
    expect(guessingForSelection(6, 3)).toBe(0.05);
  });
});

import { scoreSelection } from "../src/lib/ai/validation/gates/matching-dependency";

describe("scoreSelection", () => {
  it("scores exact, partial and malformed guesses", () => {
    expect(scoreSelection([1, 3], [3, 1])).toEqual({ exact: true, fraction: 1 });
    expect(scoreSelection([1, 2], [1, 3])).toEqual({ exact: false, fraction: 0.5 });
    expect(scoreSelection([1, 1], [1, 3]).exact).toBe(false);
  });
});
