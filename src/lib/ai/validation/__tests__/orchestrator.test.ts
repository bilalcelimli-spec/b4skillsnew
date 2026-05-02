/**
 * End-to-end orchestrator tests. LLM-backed gates (key-uniqueness, bias
 * judge half) are disabled via options so the run is fully deterministic.
 */

import { describe, it, expect } from "vitest";
import { validateDraftItem } from "../orchestrator.js";
import type { DraftItem } from "../types.js";

const opts = { allowEmbeddings: false, allowLlmJudge: false };

const goodMcq: DraftItem = {
  type: "MULTIPLE_CHOICE",
  skill: "VOCABULARY",
  cefrLevel: "B1",
  discrimination: 1.0,
  difficulty: 0.0,
  guessing: 0.2,
  content: {
    question: "Which word means 'happy'?",
    options: ["sad", "joyful", "angry", "tired"],
    correctAnswer: "joyful",
    answerKey: "Joyful is a synonym of happy. The other three are antonyms or unrelated emotions.",
    distractorRationale: {
      "0": "Antonym",
      "2": "Antonym",
      "3": "Different emotion",
    },
  },
};

describe("orchestrator", () => {
  it("returns a complete report shape", async () => {
    const r = await validateDraftItem(goodMcq, opts);
    expect(r.verdict).toBeDefined();
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.gates.length).toBeGreaterThan(0);
    expect(r.counts.critical).toBeGreaterThanOrEqual(0);
    expect(r.pipelineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(r.summary).toContain(goodMcq.skill);
  });

  it("returns PUBLISH or REVIEW for a clean MCQ", async () => {
    const r = await validateDraftItem(goodMcq, opts);
    expect(["PUBLISH", "REVIEW"]).toContain(r.verdict);
  });

  it("returns REJECT when the key is unresolvable", async () => {
    const broken: DraftItem = {
      ...goodMcq,
      content: {
        ...goodMcq.content,
        correctAnswer: "not-in-options",
      },
    };
    const r = await validateDraftItem(broken, opts);
    expect(r.verdict).toBe("REJECT");
    expect(r.counts.critical).toBeGreaterThan(0);
  });

  it("respects disabledGates", async () => {
    const r = await validateDraftItem(goodMcq, {
      ...opts,
      disabledGates: ["plagiarism", "bias-fairness"],
    });
    const plag = r.gates.find((g) => g.gate === "plagiarism");
    expect(plag?.verdict).toBe("SKIPPED");
    expect(plag?.metrics?.reason).toBe("disabled");
  });

  it("aggregates gate scores into a weighted composite", async () => {
    const r = await validateDraftItem(goodMcq, opts);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("runs all 7 gates", async () => {
    const r = await validateDraftItem(goodMcq, opts);
    const gateNames = r.gates.map((g) => g.gate).sort();
    expect(gateNames).toEqual([
      "bias-fairness",
      "distractor-quality",
      "duplicate",
      "key-uniqueness",
      "plagiarism",
      "readability",
      "structural",
    ]);
  });

  it("falls back gracefully when LLM is disabled", async () => {
    const r = await validateDraftItem(goodMcq, opts);
    const keyGate = r.gates.find((g) => g.gate === "key-uniqueness");
    expect(keyGate?.verdict).toBe("SKIPPED");
  });

  it("validates a writing prompt", async () => {
    const writing: DraftItem = {
      type: "WRITING_PROMPT",
      skill: "WRITING",
      cefrLevel: "B2",
      discrimination: 1.2,
      difficulty: 0.5,
      content: {
        prompt:
          "Write 200-250 words on the following topic: 'Some people think technology has made our lives easier; others disagree. Discuss both views and give your own opinion.'",
        sampleResponse:
          "Technology has fundamentally transformed daily life in ways my grandparents could not have imagined. " +
          "On one hand, smartphones and the internet have made communication, navigation, and learning instantly accessible. " +
          "On the other hand, constant connectivity can be exhausting and reduces face-to-face interaction. " +
          "In my view, the benefits outweigh the drawbacks if we use technology mindfully.",
        rubric: { task: 5, coherence: 5, lexical: 5, grammar: 5 },
      },
    };
    const r = await validateDraftItem(writing, opts);
    // Distractor gate should SKIP for non-MCQ
    const distr = r.gates.find((g) => g.gate === "distractor-quality");
    expect(distr?.verdict).toBe("SKIPPED");
  });
});
