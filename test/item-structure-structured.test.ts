import { describe, it, expect } from "vitest";
import { validateItemStructure } from "../src/lib/validation/item-schema";

const reading = (content: Record<string, unknown>) => validateItemStructure("READING", { prompt: "p", passage: "x".repeat(60), ...content });

describe("validateItemStructure with structured (DRAG_DROP) items", () => {
  it("accepts a valid READING matching item without options", () => {
    expect(reading({ dropZones: ["Paragraph 1", "Paragraph 2", "Paragraph 3"], draggableItems: ["a", "b", "c", "d"], correctMapping: { "0": 2, "1": 0, "2": 3 } })).toEqual([]);
  });
  it("accepts a valid selection item", () => {
    expect(reading({ draggableItems: ["a", "b", "c", "d", "e"], selectCount: 2, correctAnswers: [1, 3] })).toEqual([]);
  });
  it("rejects a mapping that points outside or reuses an item", () => {
    expect(reading({ dropZones: ["x", "y"], draggableItems: ["a", "b", "c"], correctMapping: { "0": 5, "1": 0 } })).toContain("correctMapping has invalid or repeated indexes");
    expect(reading({ dropZones: ["x", "y"], draggableItems: ["a", "b", "c"], correctMapping: { "0": 1, "1": 1 } })).toContain("correctMapping has invalid or repeated indexes");
  });
  it("rejects a selection whose key length differs from selectCount", () => {
    expect(reading({ draggableItems: ["a", "b", "c", "d"], selectCount: 2, correctAnswers: [1] })).toContain("correctAnswers invalid for selectCount");
  });
  it("rejects matching with no spare answers and duplicate items", () => {
    expect(reading({ dropZones: ["x", "y"], draggableItems: ["a", "b"], correctMapping: { "0": 0, "1": 1 } })).toContain("Matching item needs more answers than rows");
    expect(reading({ dropZones: ["x"], draggableItems: ["a", "A", "c"], correctMapping: { "0": 0 } })).toContain("Duplicate draggable items");
  });
  it("still requires 4 options for ordinary READING MCQs", () => {
    expect(reading({ options: [{ text: "a", isCorrect: true }] })).toEqual(expect.arrayContaining(["Only 1 options (need 4+)"]));
    expect(reading({})).toEqual(expect.arrayContaining(["Only 0 options (need 4+)"]));
  });
});
