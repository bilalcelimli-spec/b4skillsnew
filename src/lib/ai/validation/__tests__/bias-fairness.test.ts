import { describe, it, expect } from "vitest";
import { runBiasFairnessGate } from "../gates/bias-fairness.js";
import type { DraftItem } from "../types.js";

const opts = { allowLlmJudge: false };

describe("bias-fairness gate (no LLM judge)", () => {
  it("PASS on a neutral item", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "VOCABULARY",
      cefrLevel: "A2",
      content: {
        question: "What is the past tense of 'go'?",
        options: ["goed", "went", "gone", "going"],
        correctAnswer: "went",
      },
    };
    const r = await runBiasFairnessGate(item, opts);
    expect(r.verdict).toBe("PASS");
    expect(r.issues.length).toBe(0);
  });

  it("flags political figure references", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "READING",
      cefrLevel: "B2",
      content: {
        stimulus: "President Trump made a statement on Tuesday about the economy. Obama responded later.",
        question: "Who responded?",
        options: ["Obama", "Biden", "Trump", "Putin"],
        correctAnswer: "Obama",
      } as never,
    };
    const r = await runBiasFairnessGate(item, opts);
    expect(r.issues.some((i) => i.code === "BIAS-POLITICAL-01")).toBe(true);
  });

  it("flags violence keywords", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "READING",
      cefrLevel: "B2",
      content: {
        stimulus: "The terrorist planted a bomb in the building.",
        question: "What happened?",
        options: ["A celebration", "An attack", "A meeting", "A speech"],
        correctAnswer: "An attack",
      } as never,
    };
    const r = await runBiasFairnessGate(item, opts);
    expect(r.issues.some((i) => i.code === "BIAS-VIOLENCE-01")).toBe(true);
  });

  it("flags Western-only assumptions (sports idioms)", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "VOCABULARY",
      cefrLevel: "B2",
      content: {
        question: "What does 'home run' mean here?",
        options: ["A complete failure", "A great success", "A long journey", "A mistake"],
        correctAnswer: "A great success",
      } as never,
    };
    const r = await runBiasFairnessGate(item, opts);
    expect(r.issues.some((i) => i.code === "BIAS-IDIOM-01")).toBe(true);
  });

  it("does not auto-FAIL on bias (returns WARN at most)", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "READING",
      cefrLevel: "B2",
      content: {
        stimulus: "On Christmas day, the family gathered for Thanksgiving dinner with their cheerleader daughter.",
        question: "When was the gathering?",
        options: ["Christmas", "Thanksgiving", "Easter", "Diwali"],
        correctAnswer: "Christmas",
      } as never,
    };
    const r = await runBiasFairnessGate(item, opts);
    expect(["WARN", "PASS"]).toContain(r.verdict);
  });
});
