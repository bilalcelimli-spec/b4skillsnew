import { describe, it, expect } from "vitest";
import { runDuplicateGate } from "../gates/duplicate.js";
import type { DraftItem } from "../types.js";

const opts = { allowEmbeddings: false };

const draft: DraftItem = {
  id: "draft-1",
  type: "MULTIPLE_CHOICE",
  skill: "GRAMMAR",
  cefrLevel: "B1",
  content: {
    question: "Choose the correct form: She _____ to the store yesterday.",
    options: ["go", "went", "gone", "going"],
    correctAnswer: "went",
  },
};

describe("duplicate gate (no embeddings)", () => {
  it("SKIPPED when bank is empty", async () => {
    const r = await runDuplicateGate(draft, [], opts);
    expect(r.verdict).toBe("SKIPPED");
  });

  it("PASS when bank items are dissimilar", async () => {
    const bank: DraftItem[] = [
      {
        id: "b1",
        type: "MULTIPLE_CHOICE",
        skill: "GRAMMAR",
        cefrLevel: "B1",
        content: {
          question: "What time does the meeting start?",
          options: ["3 PM", "4 PM", "5 PM", "6 PM"],
          correctAnswer: "3 PM",
        },
      },
    ];
    const r = await runDuplicateGate(draft, bank, opts);
    expect(r.verdict).toBe("PASS");
  });

  it("CRITICAL FAIL when bank has a near-identical item", async () => {
    const bank: DraftItem[] = [
      {
        id: "b1",
        type: "MULTIPLE_CHOICE",
        skill: "GRAMMAR",
        cefrLevel: "B1",
        content: {
          question: "Choose the correct form: She _____ to the store yesterday.",
          options: ["go", "went", "gone", "going"],
          correctAnswer: "went",
        },
      },
    ];
    const r = await runDuplicateGate(draft, bank, opts);
    expect(r.verdict).toBe("FAIL");
    expect(r.issues.some((i) => i.code === "DUP-NGRAM-01")).toBe(true);
  });

  it("does not compare against self", async () => {
    const bank: DraftItem[] = [{ ...draft }];
    const r = await runDuplicateGate(draft, bank, opts);
    // Self is filtered out (id matches), no comparable bank items left
    expect(r.verdict).toBe("SKIPPED");
  });
});
