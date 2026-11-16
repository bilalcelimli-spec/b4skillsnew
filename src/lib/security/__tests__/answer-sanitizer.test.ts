import { describe, expect, it } from "vitest";
import { stripAnswerKeys } from "../answer-sanitizer";

describe("stripAnswerKeys", () => {
  it("removes top-level and nested scoring secrets", () => {
    const result = stripAnswerKeys({
      prompt: "Choose one",
      correctAnswer: "B",
      rubric: "secret rubric",
      options: [
        { id: "A", text: "First", isCorrect: false },
        { id: "B", text: "Second", isCorrect: true },
      ],
      gaps: [{ id: "g1", expectedAnswer: "hidden", hint: "visible" }],
    });

    expect(result).toEqual({
      prompt: "Choose one",
      options: [
        { id: "A", text: "First" },
        { id: "B", text: "Second" },
      ],
      gaps: [{ id: "g1", hint: "visible" }],
    });
  });

  it("removes key-revealing authoring evidence and listening scripts", () => {
    const result = stripAnswerKeys({
      prompt: "Choose one",
      passage: "Reading text stays.",
      ttsScript: "Anna: I like cats.",
      transcript: "Anna: I like cats.",
      distractorRationale: { A: "Not in the text", C: "Wrong speaker" },
      sampleAnswer: "Model text",
      targetWord: "cats",
      options: [
        { id: "A", text: "Cats", rationale: "This is what Anna says", distractorType: "correct", imageUrl: "https://x/cat.png" },
        { id: "B", text: "Dogs", rationale: "Anna does not mention dogs", distractorType: "plausible" },
      ],
    });
    expect(result).toEqual({
      prompt: "Choose one",
      passage: "Reading text stays.",
      options: [{ id: "A", text: "Cats", imageUrl: "https://x/cat.png" }, { id: "B", text: "Dogs" }],
    });
  });

  it("does not mutate the source object", () => {
    const source = { prompt: "Question", correctIndex: 1 };
    stripAnswerKeys(source);
    expect(source).toEqual({ prompt: "Question", correctIndex: 1 });
  });
});
