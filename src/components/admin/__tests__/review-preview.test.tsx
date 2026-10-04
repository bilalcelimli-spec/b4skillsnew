// @vitest-environment jsdom

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { describeStructuredKey, generationSignals } from "../review-preview-model";
import { ItemPreview } from "../ContentFactoryReviewQueue";

const base = { id: "i1", itemCode: "LIS-C1-0001", type: "DRAG_DROP", skill: "LISTENING", cefrLevel: "C1", status: "DRAFT", pipelineStage: "AI_DRAFT", iqScore: null, subskill: null, genre: null, topic: null, construct: null, evidenceStatement: null, tags: [], difficulty: 0, discrimination: 1, ageSuitability: null, culturalLoad: null, englishVariant: null, provenance: null, createdAt: "", itemReviews: [] } as any;

const matching = {
  prompt: "Match each speaker with the view they express.",
  ttsScript: "Maria: Remote work weakens teams.",
  dropZones: ["Maria", "Tom", "Aisha"],
  draggableItems: ["Focus is better with flexible hours", "Remote work weakens the team", "Training matters most", "Offices should close"],
  correctMapping: { "0": 1, "1": 0, "2": 2 },
};

describe("describeStructuredKey", () => {
  it("describes matching with the unused answers", () => {
    const k = describeStructuredKey(matching) as any;
    expect(k.kind).toBe("matching");
    expect(k.rows).toEqual([
      { zone: "Maria", answer: "Remote work weakens the team" },
      { zone: "Tom", answer: "Focus is better with flexible hours" },
      { zone: "Aisha", answer: "Training matters most" },
    ]);
    expect(k.unused).toEqual(["Offices should close"]);
  });
  it("describes selection and ordering, and returns null for plain MCQs", () => {
    const s = describeStructuredKey({ draggableItems: ["a", "b", "c"], selectCount: 2, correctAnswers: [0, 2] }) as any;
    expect(s.items.map((i: any) => i.correct)).toEqual([true, false, true]);
    expect((describeStructuredKey({ draggableItems: ["x", "y"], correctOrder: [1, 0] }) as any).order).toEqual(["y", "x"]);
    expect(describeStructuredKey({ options: [{ text: "a" }] })).toBeNull();
  });
});

describe("generationSignals", () => {
  it("reports blind solvability, unconfirmed keys, flags and demand without duplicates", () => {
    const sig = generationSignals({
      cognitiveDemand: "INFERENCE",
      generationGates: { flags: ["MATCH-SOLVABLE-BLIND", "INTEG-TEST_WISENESS"], textDependency: { blindExact: true, guidedExact: false }, hardening: { status: "reverted" } },
    });
    const labels = sig.map((s) => s.label);
    expect(labels).toContain("Solved without the source by an LLM");
    expect(labels).toContain("Key not confirmed with the source");
    expect(labels).toContain("Key identifiable by style (absolutes / length)");
    expect(labels).toContain("Demand: inference");
    expect(labels).toContain("Distractors: reverted");
    expect(new Set(labels).size).toBe(labels.length);
  });
  it("is quiet for items without generation data", () => {
    expect(generationSignals(null)).toEqual([]);
  });
});

describe("ItemPreview", () => {
  it("shows the matching key rows and unused answers instead of an empty option list", () => {
    render(<ItemPreview item={{ ...base, content: matching, metadata: { generationGates: { textDependency: { blindExact: false, guidedExact: true } } } }} device="desktop" />);
    const key = screen.getByLabelText("Matching key");
    expect(within(key).getByText("Maria")).toBeTruthy();
    expect(within(key).getByText("Remote work weakens the team")).toBeTruthy();
    expect(within(key).getByText(/Unused answers/).textContent).toContain("Offices should close");
    expect(screen.getByText("Needs the source (LLM solver)")).toBeTruthy();
  });

  it("shows a selection key with the number to choose", () => {
    render(<ItemPreview item={{ ...base, content: { prompt: "Choose the TWO statements.", draggableItems: ["A one", "B two", "C three"], selectCount: 2, correctAnswers: [0, 2] } }} device="desktop" />);
    const sel = screen.getByLabelText("Selection key");
    expect(within(sel).getByText("Choose 2")).toBeTruthy();
    expect(within(sel).getAllByLabelText("correct")).toHaveLength(2);
  });

  it("still renders ordinary MCQ options with the key highlighted", () => {
    render(<ItemPreview item={{ ...base, type: "MULTIPLE_CHOICE", skill: "READING", content: { question: "Why?", passage: "Text.", options: [{ id: "A", text: "Alpha", isCorrect: false }, { id: "B", text: "Bravo", isCorrect: true, rationale: "Because." }] } }} device="desktop" />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Because.")).toBeTruthy();
    expect(screen.queryByLabelText("Matching key")).toBeNull();
  });
});
