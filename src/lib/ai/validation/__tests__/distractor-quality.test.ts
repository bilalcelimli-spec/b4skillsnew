/**
 * Tests for distractor-quality gate. Embeddings are disabled in these tests
 * (no API key in CI) — we exercise the deterministic checks: option count,
 * key resolution, length spread, forbidden phrases, lexical overlap, dupes.
 */

import { describe, it, expect } from "vitest";
import { runDistractorQualityGate } from "../gates/distractor-quality.js";
import type { DraftItem } from "../types.js";

const opts = { allowEmbeddings: false };

describe("distractor-quality gate (no embeddings)", () => {
  it("PASS on a well-formed MCQ", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "VOCABULARY",
      cefrLevel: "B1",
      content: {
        question: "Which word means 'happy'?",
        options: ["sad", "joyful", "angry", "tired"],
        correctAnswer: "joyful",
      },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.verdict).toBe("PASS");
    expect(r.metrics?.keyIndex).toBe(1);
  });

  it("CRITICAL when correctAnswer cannot be resolved", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "GRAMMAR",
      cefrLevel: "A2",
      content: {
        question: "Pick one",
        options: ["alpha", "beta", "gamma", "delta"],
        correctAnswer: "epsilon", // not in options
      },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.verdict).toBe("FAIL");
    expect(r.issues.some((i) => i.code === "DISTR-KEY-01")).toBe(true);
  });

  it("flags forbidden 'all of the above' distractor", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "READING",
      cefrLevel: "B2",
      content: {
        question: "Pick one",
        options: ["A reasonable answer", "Another option", "Third option", "All of the above"],
        correctAnswer: "All of the above",
      },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.issues.some((i) => i.code === "DISTR-FORBIDDEN-01")).toBe(true);
  });

  it("flags duplicate options", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "VOCABULARY",
      cefrLevel: "A2",
      content: {
        question: "Pick one",
        options: ["happy", "joyful", "happy", "sad"],
        correctAnswer: "joyful",
      },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.issues.some((i) => i.code === "DISTR-DUPE-02")).toBe(true);
  });

  it("flags length spread > 2.5×", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "READING",
      cefrLevel: "B1",
      content: {
        question: "Which is correct?",
        options: [
          "Yes",
          "No",
          "Maybe",
          "The correct answer is the one that demonstrates a thorough understanding of the subject matter and applies it to the context",
        ],
        correctAnswer: 3,
      },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.issues.some((i) => i.code === "DISTR-LEN-01")).toBe(true);
  });

  it("resolves key by letter A-D", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "GRAMMAR",
      cefrLevel: "B1",
      content: {
        question: "Pick the verb",
        options: ["table", "run", "blue", "happy"],
        correctAnswer: "B",
      },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.metrics?.keyIndex).toBe(1);
    expect(r.verdict).toBe("PASS");
  });

  it("resolves key by numeric index", async () => {
    const item: DraftItem = {
      type: "MULTIPLE_CHOICE",
      skill: "GRAMMAR",
      cefrLevel: "B1",
      content: {
        question: "Pick the verb",
        options: ["table", "run", "blue", "happy"],
        correctAnswer: 1,
      },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.metrics?.keyIndex).toBe(1);
  });

  it("SKIPS for non-MCQ types", async () => {
    const item: DraftItem = {
      type: "WRITING_PROMPT",
      skill: "WRITING",
      cefrLevel: "B2",
      content: { prompt: "Write 250 words about your hometown." },
    };
    const r = await runDistractorQualityGate(item, opts);
    expect(r.verdict).toBe("SKIPPED");
  });
});
