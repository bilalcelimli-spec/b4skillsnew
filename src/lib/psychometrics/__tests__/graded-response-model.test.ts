import { describe, it, expect } from "vitest";
import {
  cumulativeProbability,
  categoryProbability,
  allCategoryProbabilities,
  expectedScore,
  grmInformation,
} from "../graded-response-model.js";
import type { GrmParameters } from "../graded-response-model.js";

// Typical 5-category rubric item (0-4 scale)
const FIVE_CAT: GrmParameters = {
  a: 1.2,
  b: [-1.5, -0.5, 0.5, 1.5],
  categories: 5,
};

// Typical 11-category writing rubric (0-10 scale)
const ELEVEN_CAT: GrmParameters = {
  a: 0.8,
  b: [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
  categories: 11,
};

describe("cumulativeProbability", () => {
  it("returns 0.5 when theta = bk", () => {
    expect(cumulativeProbability(1.0, 1.0, 1.0)).toBeCloseTo(0.5, 5);
  });

  it("approaches 1 for high theta", () => {
    expect(cumulativeProbability(10, 1.0, 0)).toBeGreaterThan(0.99);
  });

  it("approaches 0 for very low theta", () => {
    expect(cumulativeProbability(-10, 1.0, 0)).toBeLessThan(0.01);
  });

  it("is monotonically increasing in theta", () => {
    const p1 = cumulativeProbability(-1, 1.2, 0);
    const p2 = cumulativeProbability(0, 1.2, 0);
    const p3 = cumulativeProbability(1, 1.2, 0);
    expect(p1).toBeLessThan(p2);
    expect(p2).toBeLessThan(p3);
  });
});

describe("categoryProbability", () => {
  it("returns 0 for out-of-range category", () => {
    expect(categoryProbability(0, FIVE_CAT, -1)).toBe(0);
    expect(categoryProbability(0, FIVE_CAT, 5)).toBe(0);
  });

  it("returns positive probability for all valid categories", () => {
    for (let k = 0; k < FIVE_CAT.categories; k++) {
      expect(categoryProbability(0, FIVE_CAT, k)).toBeGreaterThanOrEqual(0);
    }
  });

  it("category probabilities are higher near corresponding boundary at right theta", () => {
    // At theta very low, lowest category should dominate
    const lowTheta = categoryProbability(-5, FIVE_CAT, 0);
    const highCat = categoryProbability(-5, FIVE_CAT, 4);
    expect(lowTheta).toBeGreaterThan(highCat);
  });
});

describe("allCategoryProbabilities", () => {
  it("returns an array of length equal to categories", () => {
    const probs = allCategoryProbabilities(0, FIVE_CAT);
    expect(probs).toHaveLength(5);
  });

  it("probabilities sum to approximately 1", () => {
    const probs = allCategoryProbabilities(0, FIVE_CAT);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("each probability is non-negative", () => {
    const probs = allCategoryProbabilities(0, ELEVEN_CAT);
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0);
    }
  });

  it("works for 11-category items", () => {
    const probs = allCategoryProbabilities(0, ELEVEN_CAT);
    expect(probs).toHaveLength(11);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4);
  });
});

describe("expectedScore", () => {
  it("is within [0, categories-1]", () => {
    for (const theta of [-3, -1, 0, 1, 3]) {
      const es = expectedScore(theta, FIVE_CAT);
      expect(es).toBeGreaterThanOrEqual(0);
      expect(es).toBeLessThanOrEqual(FIVE_CAT.categories - 1);
    }
  });

  it("is monotonically increasing in theta", () => {
    const scores = [-3, -1, 0, 1, 3].map((t) => expectedScore(t, FIVE_CAT));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });

  it("near midpoint category at theta=0 for symmetric item", () => {
    const sym: GrmParameters = { a: 1, b: [-1, 0, 1], categories: 4 };
    const es = expectedScore(0, sym);
    expect(es).toBeCloseTo(1.5, 0); // midpoint
  });
});

describe("grmInformation", () => {
  it("returns a non-negative value", () => {
    expect(grmInformation(0, FIVE_CAT)).toBeGreaterThanOrEqual(0);
  });

  it("increases with higher discrimination a", () => {
    const lowA: GrmParameters = { ...FIVE_CAT, a: 0.5 };
    const highA: GrmParameters = { ...FIVE_CAT, a: 2.0 };
    expect(grmInformation(0, highA)).toBeGreaterThan(grmInformation(0, lowA));
  });

  it("is positive for a range of theta values", () => {
    for (const theta of [-3, -1, 0, 1, 3]) {
      expect(grmInformation(theta, FIVE_CAT)).toBeGreaterThan(0);
    }
  });
});
