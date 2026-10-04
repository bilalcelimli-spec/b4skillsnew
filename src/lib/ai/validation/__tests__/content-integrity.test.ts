import { describe, it, expect } from "vitest";
import { runContentIntegrityGate } from "../gates/content-integrity.js";
import { runTextDependencyGate, seededOrder } from "../gates/text-dependency.js";
import type { DraftItem } from "../types.js";

const base = (content: Record<string, unknown>, cefr: any = "C1"): DraftItem => ({
  type: "MULTIPLE_CHOICE" as any,
  skill: "READING" as any,
  cefrLevel: cefr,
  content: content as any,
});

describe("content-integrity gate", () => {
  it("WARNs (not FAILs) on style-identifiable keys", async () => {
    const r = await runContentIntegrityGate(
      base({
        passage: "A short passage.",
        question: "What is the main point?",
        options: [
          { text: "It is only relevant abroad." },
          { text: "It always causes disputes." },
          { text: "It can help in some situations.", isCorrect: true },
          { text: "It is useful for nothing." },
        ],
      })
    );
    expect(r.verdict).toBe("WARN");
    expect(r.issues.some((i) => i.code === "INTEG-TEST_WISENESS")).toBe(true);
  });

  it("FAILs when the key cannot be resolved", async () => {
    const r = await runContentIntegrityGate(base({ options: ["a", "b", "c", "d"], question: "q" }));
    expect(r.verdict).toBe("FAIL");
  });
});

describe("text-dependency gate", () => {
  it("is SKIPPED for non-receptive items without calling the judge", async () => {
    const r = await runTextDependencyGate({ ...base({}), skill: "GRAMMAR" as any }, { allowLlmJudge: false });
    expect(r.verdict).toBe("SKIPPED");
  });

  it("shuffles deterministically per seed", () => {
    expect(seededOrder(4, "x")).toEqual(seededOrder(4, "x"));
    expect([...seededOrder(4, "x")].sort()).toEqual([0, 1, 2, 3]);
  });
});

import { buildPrompt, optionToText, sourceText } from "../gates/key-uniqueness.js";

describe("key-uniqueness input handling (bank item shape)", () => {
  const item = base({
    passage: "The committee postponed the decision.",
    question: "Why was it postponed?",
    options: [
      { id: "A", text: "Budget concerns", isCorrect: true },
      { id: "B", text: "A strike", isCorrect: false },
    ],
  });

  it("reads text from object options and the passage field", () => {
    expect(optionToText({ text: " alpha " })).toBe("alpha");
    expect(sourceText(item.content as any)).toContain("committee");
    const prompt = buildPrompt(item, ["Budget concerns", "A strike"]);
    expect(prompt).toContain("A. Budget concerns");
    expect(prompt).toContain("The committee postponed the decision.");
    expect(prompt).not.toContain("[object Object]");
    expect(prompt).toContain("option A");
  });
});

import { normalizeDraftForGates } from "../types.js";
import { validateDraftItem } from "../orchestrator.js";

describe("normalizeDraftForGates", () => {
  const obj = base({
    passage: "Source text here.",
    question: "Q?",
    options: [
      { id: "A", text: "alpha", isCorrect: false },
      { id: "B", text: "bravo", isCorrect: true },
      { id: "C", text: "charlie" },
      { id: "D", text: "delta" },
    ],
  });

  it("converts object options to strings, sets key index and stimulus", () => {
    const n = normalizeDraftForGates(obj).content as any;
    expect(n.options).toEqual(["alpha", "bravo", "charlie", "delta"]);
    expect(n.correctAnswer).toBe(1);
    expect(n.stimulus).toBe("Source text here.");
  });

  it("leaves string-option items unchanged", () => {
    const plain = base({ question: "Q?", options: ["a", "b", "c", "d"], correctAnswer: 2 });
    expect(normalizeDraftForGates(plain).content).toMatchObject({ options: ["a", "b", "c", "d"], correctAnswer: 2 });
  });

  it("orchestrator no longer sees '[object Object]' options", async () => {
    const r = await validateDraftItem(obj, { allowEmbeddings: false, allowLlmJudge: false, bankItems: [] });
    const dq = r.gates.find((g) => g.gate === "distractor-quality");
    expect(JSON.stringify(dq)).not.toContain("[object Object]");
  });
});
