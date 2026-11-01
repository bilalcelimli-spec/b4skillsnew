import { describe, expect, it } from "vitest";
import { hasNothingToAnswer, validateItemStructure } from "../src/lib/validation/item-schema";

const opts = (texts: string[], key = 0) => texts.map((text, i) => ({ text, isCorrect: i === key }));

describe("hasNothingToAnswer (bank review 2026-11-01)", () => {
  it("rejects an instruction with no sentence, gap or question stored", () => {
    for (const prompt of [
      "Drag the correct words to complete the sentence.",
      "Choose the best word for [[GAP_1]].",
      "Choose the best option for gap (4).",
      "Complete the sentence.",
    ]) {
      const content = { prompt, options: opts(["There is", "There are", "Is there", "Are"], 1) };
      expect(hasNothingToAnswer(content)).toBe(true);
      expect(validateItemStructure("GRAMMAR", content).join(" ")).toMatch(/only an instruction/);
    }
  });

  it("accepts the same instruction once the sentence is stored or written into the prompt", () => {
    const options = opts(["is", "are", "am", "be"]);
    expect(hasNothingToAnswer({ prompt: "Complete the sentence.", scaffold: "Leo ___ my friend.", options })).toBe(false);
    expect(hasNothingToAnswer({ prompt: "Choose the correct word: Leo ___ my friend.", options })).toBe(false);
    expect(hasNothingToAnswer({ prompt: "Leo ___ my friend.", options })).toBe(false);
    expect(hasNothingToAnswer({ prompt: "What is the opposite of 'cheap'?", options })).toBe(false);
  });

  it("accepts sentence-choice items whose options are the sentences", () => {
    const content = { prompt: "Select the grammatically correct sentence.", options: opts([
      "Had I known, I would have come.", "If I knew, I would have came.", "Had I know, I would come here.", "If I had knew, I will have come.",
    ]) };
    expect(hasNothingToAnswer(content)).toBe(false);
    expect(validateItemStructure("GRAMMAR", content)).toEqual([]);
  });

  it("does not apply to reading (the passage rule covers it)", () => {
    const content = { prompt: "Choose the best answer.", passage: "A".repeat(40), options: opts(["a", "b", "c", "d"]) };
    expect(validateItemStructure("READING", content)).toEqual([]);
  });
});
