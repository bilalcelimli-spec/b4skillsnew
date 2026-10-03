import { describe, it, expect } from "vitest";
import { calculateContentIqs, keyIndex, overlapRatio } from "../src/lib/psychometrics/content-iqs";

const mcq = (over: Record<string, any>) => ({
  skill: "READING",
  cefrLevel: "B2",
  type: "MULTIPLE_CHOICE",
  metadata: { cognitiveDemand: "INFERENCE" },
  ...over,
});

describe("content IQS", () => {
  it("ignores IRT parameters entirely", () => {
    const base = mcq({ content: { passage: "x", options: ["alpha", "bravo", "charlie", { text: "delta", isCorrect: true }] } });
    expect(calculateContentIqs({ ...base, difficulty: 99, discrimination: 0 } as any)).toEqual(calculateContentIqs(base));
  });

  it("resolves keys from isCorrect, letter id, index and text", () => {
    expect(keyIndex({ options: [{ text: "a" }, { text: "b", isCorrect: true }] })).toBe(1);
    expect(keyIndex({ options: [{ id: "A", text: "a" }, { id: "B", text: "b" }], correctAnswer: "B" })).toBe(1);
    expect(keyIndex({ options: ["a", "b", "c"], correctIndex: 2 })).toBe(2);
    expect(keyIndex({ options: ["a", "b"] })).toBe(-1);
  });

  it("flags lexical lift when only the key repeats the passage", () => {
    const r = calculateContentIqs(
      mcq({
        content: {
          passage: "Researchers discovered that migratory populations declined sharply after rainfall patterns shifted.",
          options: [
            { text: "Hunting restrictions were relaxed recently." },
            { text: "Urban expansion displaced nesting colonies." },
            { text: "Migratory populations declined after rainfall patterns shifted.", isCorrect: true },
            { text: "Scientists disagreed about measurement techniques." },
          ],
        },
      })
    );
    expect(r.flags.map((f) => f.code)).toContain("LEXICAL_LIFT");
  });

  it("flags test-wiseness when absolutes appear only in distractors", () => {
    const r = calculateContentIqs(
      mcq({
        content: {
          passage: "short text",
          options: [
            { text: "It is only relevant abroad." },
            { text: "It always causes disputes." },
            { text: "It can help in some situations.", isCorrect: true },
            { text: "It is useful for nothing." },
          ],
        },
      })
    );
    expect(r.flags.map((f) => f.code)).toContain("TEST_WISENESS");
  });

  it("flags demand below level at B2+ and above level at A2-", () => {
    const low = calculateContentIqs(mcq({ cefrLevel: "C1", metadata: { cognitiveDemand: "EXPLICIT_DETAIL" }, content: { options: ["a", "b", "c", "d"], correctIndex: 0 } }));
    expect(low.flags.map((f) => f.code)).toContain("DEMAND_BELOW_LEVEL");
    const high = calculateContentIqs(mcq({ cefrLevel: "A2", metadata: { cognitiveDemand: "INFERENCE" }, content: { options: ["a", "b", "c", "d"], correctIndex: 0 } }));
    expect(high.flags.map((f) => f.code)).toContain("DEMAND_ABOVE_LEVEL");
  });

  it("does not penalise a clean item", () => {
    const r = calculateContentIqs(
      mcq({
        content: {
          passage: "The committee postponed the decision because several members questioned the budget.",
          options: [
            { text: "Funding concerns delayed the outcome.", isCorrect: true },
            { text: "The proposal was unanimously rejected." },
            { text: "Members lacked the necessary qualifications." },
            { text: "A new chairperson was appointed." },
          ],
        },
      })
    );
    expect(r.score).toBe(100);
  });

  it("computes overlap on content words only", () => {
    expect(overlapRatio("the cat sat", "anything")).toBe(0);
    expect(overlapRatio("migratory populations", "migratory populations declined")).toBe(1);
  });
});
