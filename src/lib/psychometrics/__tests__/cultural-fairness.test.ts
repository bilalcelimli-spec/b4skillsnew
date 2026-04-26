import { describe, expect, it } from "vitest";
import { batchFairnessCheck, checkItemFairness } from "../cultural-fairness";

describe("checkItemFairness()", () => {
  it("passes a culturally neutral item", () => {
    const result = checkItemFairness(
      "item-neutral",
      "What is the best way to organize your study schedule this week?",
      ["Create a timetable", "Ignore deadlines", "Study only at night", "Skip revision"],
      "A student plans weekly study tasks and checks progress daily."
    );

    expect(result.overallStatus).toBe("PASS");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.checks.every((c) => c.status !== "REJECT")).toBe(true);
  });

  it("rejects items with multiple sensitive topics", () => {
    const result = checkItemFairness(
      "item-sensitive",
      "During the election, a man brought a gun to church after drinking beer.",
      ["He felt calm", "He felt unsafe", "He felt bored"],
      "The funeral happened after a political conflict."
    );

    const contentCheck = result.checks.find(
      (c) => c.category === "Content Sensitivity"
    );
    expect(contentCheck?.status).toBe("REJECT");
    expect(result.overallStatus).toBe("REJECT");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("flags gender stereotypes and cultural specificity", () => {
    const result = checkItemFairness(
      "item-stereotype",
      "The engineer said he would visit Walmart after work.",
      ["He bought milk", "He called home", "He drove fast"],
      "John met Mary at the store."
    );

    expect(result.overallStatus).toBe("FLAG");
    expect(
      result.checks.some(
        (c) => c.category === "Gender Fairness" && c.status === "FLAG"
      )
    ).toBe(true);
    expect(
      result.checks.some(
        (c) => c.category === "Cultural Neutrality" && c.status === "FLAG"
      )
    ).toBe(true);
    expect(
      result.checks.some(
        (c) => c.category === "Name Diversity" && c.status === "FLAG"
      )
    ).toBe(true);
  });

  it("flags very imbalanced option lengths", () => {
    const result = checkItemFairness(
      "item-options",
      "Choose the most suitable response.",
      [
        "Yes.",
        "No.",
        "It depends on many contextual, social, institutional, and long-term economic factors.",
      ]
    );

    const optionBalance = result.checks.find((c) => c.category === "Option Balance");
    expect(optionBalance?.status).toBe("FLAG");
  });
});

describe("batchFairnessCheck()", () => {
  it("returns aggregated flagged and rejected counts", () => {
    const batch = batchFairnessCheck([
      {
        id: "pass-item",
        stem: "How can students improve concentration during study time?",
        options: ["Take short breaks", "Set goals", "Turn off distractions"],
      },
      {
        id: "flag-item",
        stem: "The doctor said he would call after the baseball game at Walmart.",
        options: ["Tomorrow", "Tonight", "Never"],
        passage: "John confirmed the plan by phone.",
      },
      {
        id: "reject-item",
        stem: "After drinking wine at church, the man discussed politics and war.",
        options: ["He laughed", "He cried", "He left"],
      },
    ]);

    expect(batch.results).toHaveLength(3);
    expect(batch.flaggedCount).toBe(1);
    expect(batch.rejectedCount).toBe(1);
  });
});
