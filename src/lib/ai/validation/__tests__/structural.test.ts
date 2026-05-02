/**
 * Unit tests for the structural gate. The legacy ItemQualityValidator is the
 * source of truth — these tests verify that the gate adapter:
 *  — Filters out BIAS-* codes (those go to bias-fairness gate)
 *  — Maps severities correctly
 *  — Picks the right verdict (PASS / WARN / FAIL) based on issue counts
 */

import { describe, it, expect } from "vitest";
import { runStructuralGate } from "../gates/structural.js";
import type { DraftItem } from "../types.js";

const baseItem: DraftItem = {
  type: "MULTIPLE_CHOICE",
  skill: "GRAMMAR",
  cefrLevel: "B1",
  discrimination: 1.0,
  difficulty: 0.0,
  guessing: 0.2,
  content: {
    question: "Choose the correct form: She ____ to the store yesterday.",
    options: ["go", "went", "gone", "going"],
    correctAnswer: "went",
    answerKey: "Past simple required for completed action with explicit past time marker.",
    distractorRationale: {
      "0": "Present simple — wrong tense",
      "2": "Past participle without auxiliary",
      "3": "Present participle without auxiliary",
    },
  },
};

describe("structural gate", () => {
  it("returns PASS for a complete, well-formed item", async () => {
    const result = await runStructuralGate(baseItem);
    expect(result.verdict).toBe("PASS");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.gate).toBe("structural");
  });

  it("flags missing options as CRITICAL and FAILs", async () => {
    const broken: DraftItem = {
      ...baseItem,
      content: { question: "Pick one." },
    };
    const result = await runStructuralGate(broken);
    expect(result.verdict).toBe("FAIL");
    expect(result.issues.some((i) => i.severity === "CRITICAL")).toBe(true);
  });

  it("excludes bias issues (handled by bias gate)", async () => {
    const biasy: DraftItem = {
      ...baseItem,
      content: {
        ...baseItem.content,
        question: "Where did he go?",
        stimulus: "He went to the store on Christmas day.",
      },
    };
    const result = await runStructuralGate(biasy);
    expect(result.issues.every((i) => !i.code.startsWith("BIAS-"))).toBe(true);
  });

  it("returns ERROR shape on internal failures (not crash)", async () => {
    const malformed = {
      type: "MULTIPLE_CHOICE",
      skill: "GRAMMAR",
      cefrLevel: "B1",
      content: null as unknown as DraftItem["content"],
    } as DraftItem;
    const result = await runStructuralGate(malformed);
    // legacy validator handles null content via completeness CRITICAL
    expect(["FAIL", "ERROR"]).toContain(result.verdict);
  });
});
