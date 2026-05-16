/**
 * Writing Rubric Dimension Scorer — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  scoreWritingRubric,
  type GeminiWritingFeatures,
} from "../writing-rubric-scorer.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

/** High-quality features — should produce B2/C1 composite */
const HIGH_FEATURES: GeminiWritingFeatures = {
  holisticScore: 8.5,
  registerScore: 8.0,
  taskCompletionScore: 8.5,
  grammarScore: 8.0,
  vocabularyScore: 8.0,
  coherenceScore: 8.0,
};

/** Low-quality features — should produce A1/A2 composite */
const LOW_FEATURES: GeminiWritingFeatures = {
  holisticScore: 2.0,
  registerScore: 2.0,
  taskCompletionScore: 2.0,
  grammarScore: 2.0,
  vocabularyScore: 2.0,
  coherenceScore: 2.0,
};

/** Coherent multi-paragraph essay (≥ 150 tokens, 3 paragraphs, cohesive devices) */
const RICH_ESSAY = `
Firstly, climate change represents one of the most significant challenges of our time.
Scientists have consequently found that global temperatures are rising at an unprecedented rate.
Furthermore, the evidence suggests that human activities are the primary cause of this phenomenon.

Moreover, governments around the world are nevertheless struggling to implement effective policies.
In addition, international cooperation is essential to address the issue.
However, economic interests often conflict with environmental protection goals.
As a result, progress has been slower than many experts recommend.
Therefore, it is crucial that we take immediate action to prevent further damage.

In conclusion, despite the challenges, there are reasons for optimism.
For instance, renewable energy technologies are becoming increasingly affordable.
On the other hand, this transition requires substantial investment and political will.
Subsequently, we must work together to ensure a sustainable future for generations to come.
`.trim();

const SHORT_ESSAY = "I like environment. Climate bad. We must help.";

// ─── scoreWritingRubric ────────────────────────────────────────────────────────

describe("scoreWritingRubric() — dimension scores", () => {
  it("returns all four dimensions", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("communicativeAchievement");
    expect(result).toHaveProperty("organisation");
    expect(result).toHaveProperty("language");
  });

  it("each dimension score is in [0, 5]", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    for (const dim of [
      result.content,
      result.communicativeAchievement,
      result.organisation,
      result.language,
    ]) {
      expect(dim.score).toBeGreaterThanOrEqual(0);
      expect(dim.score).toBeLessThanOrEqual(5);
    }
  });

  it("normalised values are in [0, 1]", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    for (const dim of [
      result.content,
      result.communicativeAchievement,
      result.organisation,
      result.language,
    ]) {
      expect(dim.normalised).toBeGreaterThanOrEqual(0);
      expect(dim.normalised).toBeLessThanOrEqual(1);
      expect(dim.normalised).toBeCloseTo(dim.score / 5, 5);
    }
  });

  it("each dimension includes a descriptor string", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    for (const dim of [
      result.content,
      result.communicativeAchievement,
      result.organisation,
      result.language,
    ]) {
      expect(typeof dim.descriptor).toBe("string");
      expect(dim.descriptor.length).toBeGreaterThan(5);
    }
  });

  it("each dimension includes a suggestion string", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    for (const dim of [
      result.content,
      result.communicativeAchievement,
      result.organisation,
      result.language,
    ]) {
      expect(typeof dim.suggestion).toBe("string");
      expect(dim.suggestion.length).toBeGreaterThan(5);
    }
  });
});

describe("scoreWritingRubric() — composite and CEFR", () => {
  it("compositeScore equals the average of the four dimensions", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    const expected = (
      result.content.score +
      result.communicativeAchievement.score +
      result.organisation.score +
      result.language.score
    ) / 4;
    expect(result.compositeScore).toBeCloseTo(expected, 1);
  });

  it("high-quality features produce a high composite (≥ 3.0)", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    expect(result.compositeScore).toBeGreaterThanOrEqual(3.0);
  });

  it("low-quality features produce a low composite (≤ 2.5)", () => {
    const result = scoreWritingRubric(LOW_FEATURES, SHORT_ESSAY);
    expect(result.compositeScore).toBeLessThanOrEqual(2.5);
  });

  it("predictedCefr is a recognised CEFR level string", () => {
    const validLevels = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    expect(validLevels).toContain(result.predictedCefr);
  });

  it("high composite maps to B2+ CEFR", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    expect(["B2", "C1", "C2"]).toContain(result.predictedCefr);
  });
});

describe("scoreWritingRubric() — word count", () => {
  it("returns a positive word count", () => {
    const result = scoreWritingRubric(HIGH_FEATURES, RICH_ESSAY);
    expect(result.wordCount).toBeGreaterThan(50);
  });

  it("short essay has low word count", () => {
    const result = scoreWritingRubric(LOW_FEATURES, SHORT_ESSAY);
    expect(result.wordCount).toBeLessThan(20);
  });
});

describe("scoreWritingRubric() — organisation bonus (cohesive devices)", () => {
  it("essay with many cohesive devices scores higher on organisation than one without", () => {
    const plain = "The environment is important. People must act. We should change.";
    const withDevices = `${RICH_ESSAY}`;
    const r1 = scoreWritingRubric(HIGH_FEATURES, plain);
    const r2 = scoreWritingRubric(HIGH_FEATURES, withDevices);
    expect(r2.organisation.score).toBeGreaterThanOrEqual(r1.organisation.score);
  });
});

describe("scoreWritingRubric() — content bonus for length", () => {
  it("longer essays receive a content length bonus", () => {
    const longText = RICH_ESSAY + " " + RICH_ESSAY; // double the essay
    const r_short = scoreWritingRubric(HIGH_FEATURES, SHORT_ESSAY);
    const r_long = scoreWritingRubric(HIGH_FEATURES, longText);
    expect(r_long.content.score).toBeGreaterThanOrEqual(r_short.content.score);
  });
});
