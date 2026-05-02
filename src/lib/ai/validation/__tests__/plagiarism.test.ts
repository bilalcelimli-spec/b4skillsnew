import { describe, it, expect } from "vitest";
import { runPlagiarismGate } from "../gates/plagiarism.js";
import type { DraftItem } from "../types.js";

describe("plagiarism gate", () => {
  it("PASS on natural prose", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "READING",
      cefrLevel: "B1",
      content: {
        stimulus:
          "The library opens at nine in the morning. Students often arrive early to grab the best seats by the window. " +
          "On weekends, the library closes at five in the afternoon. Some students prefer to study at home. " +
          "Others find that the quiet of the library helps them concentrate.",
        question: "When does the library close on weekends?",
        options: ["3 PM", "5 PM", "7 PM", "9 PM"],
        correctAnswer: "5 PM",
      },
    };
    const r = await runPlagiarismGate(item);
    expect(r.verdict).toBe("PASS");
  });

  it("flags AI-stylistic markers", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "READING",
      cefrLevel: "C1",
      content: {
        stimulus:
          "In today's rapidly evolving world, we must delve into the intricate tapestry of human experience. " +
          "By leveraging the power of meticulous research, we can unlock the potential of synergistic collaboration. " +
          "It is worth noting that this groundbreaking, state-of-the-art approach showcases comprehensive insights.",
        question: "What is the main idea?",
        options: ["Research", "Collaboration", "Innovation", "Tradition"],
        correctAnswer: "Collaboration",
      },
    };
    const r = await runPlagiarismGate(item);
    expect(r.issues.some((i) => i.code === "PLAG-AI-01")).toBe(true);
  });

  it("SKIPPED on text shorter than 30 words", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "VOCABULARY",
      cefrLevel: "A1",
      content: {
        question: "What colour is the sky?",
        options: ["red", "blue", "green", "yellow"],
        correctAnswer: "blue",
      },
    };
    const r = await runPlagiarismGate(item);
    expect(r.verdict).toBe("SKIPPED");
  });
});
