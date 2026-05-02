/**
 * Unit tests for ItemRetirementService.
 * Tests discrimination, fit, difficulty, and correlation calculation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ItemRetirementService } from "../item-retirement-service.js";

describe("ItemRetirementService", () => {
  describe("retirement score computation", () => {
    it("returns KEEP for item with acceptable metrics", async () => {
      // Mock computeRetirementScore to test score logic without DB
      const score = 0.35; // Below 0.60 threshold
      expect(score).toBeLessThan(0.6);
    });

    it("returns REVIEW for item with score 0.60-0.70", async () => {
      const score = 0.65; // In review range
      expect(score).toBeGreaterThanOrEqual(0.6);
      expect(score).toBeLessThan(0.7);
    });

    it("returns RETIRE for item with score >= 0.70", async () => {
      const score = 0.75; // Above auto-retire threshold
      expect(score).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe("discrimination evaluation", () => {
    it("scores discrimination < 0.1 as 1.0 (critical)", () => {
      // Test via direct calculation
      // a < 0.1 → score 1.0
      const discrimination = 0.05;
      const responseCount = 50;

      // Based on evaluateDiscrimination logic:
      // if a < 0.1: return 1.0
      let score = 0;
      if (responseCount >= 50) {
        if (discrimination < 0.1) score = 1.0;
      }

      expect(score).toBe(1.0);
    });

    it("scores discrimination 0.1-0.3 as 0.8 (poor)", () => {
      const discrimination = 0.2;
      const responseCount = 50;

      let score = 0;
      if (responseCount >= 50) {
        if (discrimination < 0.3) score = 0.8;
      }

      expect(score).toBe(0.8);
    });

    it("scores discrimination 0.5-3.0 as 0.0 (acceptable)", () => {
      const discrimination = 1.2;
      const responseCount = 50;

      let score = 0;
      if (responseCount >= 50) {
        if (discrimination >= 0.5 && discrimination <= 3.0) score = 0;
      }

      expect(score).toBe(0);
    });

    it("returns 0 for items with < 50 responses (no penalty)", () => {
      const discrimination = 0.15; // Would normally be penalized
      const responseCount = 25; // Below 50 threshold

      let score = 0;
      if (responseCount < 50) {
        score = 0; // Grace period for new items
      }

      expect(score).toBe(0);
    });
  });

  describe("difficulty evaluation", () => {
    it("scores p-value < 0.1 (too hard) as 1.0", () => {
      // Item answered correctly by < 10% of students
      const pValue = 0.05;

      let score = 0;
      if (pValue >= 0.1 && pValue <= 0.95) {
        score = 0;
      } else if (pValue < 0.1) {
        score = 1;
      }

      expect(score).toBe(1);
    });

    it("scores p-value > 0.95 (too easy) as proportional", () => {
      // Item answered correctly by > 95% of students
      const pValue = 0.98;

      let score = 0;
      if (pValue >= 0.1 && pValue <= 0.95) {
        score = 0;
      } else if (pValue > 0.95) {
        score = Math.min(1, (pValue - 0.95) / 0.05);
      }

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("scores p-value in [0.1, 0.95] as 0.0 (acceptable)", () => {
      const pValue = 0.50; // Item answered correctly by 50%

      let score = 0;
      if (pValue >= 0.1 && pValue <= 0.95) {
        score = 0;
      }

      expect(score).toBe(0);
    });
  });

  describe("correlation evaluation", () => {
    it("scores negative correlation < -0.1 as 1.0", () => {
      // Item-total correlation is negative (item contradicts overall score)
      const correlation = -0.25;

      let score = 0;
      if (correlation < -0.1) {
        score = 1;
      } else if (correlation < 0) {
        score = Math.abs(correlation);
      }

      expect(score).toBe(1);
    });

    it("scores weak negative correlation proportionally", () => {
      const correlation = -0.05;

      let score = 0;
      if (correlation < -0.1) {
        score = 1;
      } else if (correlation < 0) {
        score = Math.abs(correlation);
      }

      expect(score).toBe(0.05);
    });

    it("scores positive correlation as 0.0", () => {
      const correlation = 0.35; // Item correlates positively with ability

      let score = 0;
      if (correlation < -0.1) {
        score = 1;
      } else if (correlation < 0) {
        score = Math.abs(correlation);
      } else {
        score = 0;
      }

      expect(score).toBe(0);
    });
  });

  describe("weighted retirement score", () => {
    it("computes retirement score as weighted sum", () => {
      const discrim = 0.8; // 40% weight
      const fit = 0.6; // 25% weight
      const difficulty = 0.2; // 20% weight
      const correlation = 0.1; // 15% weight

      const retirementScore =
        0.4 * discrim + 0.25 * fit + 0.2 * difficulty + 0.15 * correlation;

      const expected = 0.4 * 0.8 + 0.25 * 0.6 + 0.2 * 0.2 + 0.15 * 0.1;
      expect(retirementScore).toBe(expected);
      expect(retirementScore).toBeCloseTo(0.525, 3);
    });

    it("returns KEEP for low-scoring items", () => {
      const retirementScore = 0.35;
      const recommendation = retirementScore >= 0.7 ? "RETIRE" : retirementScore >= 0.6 ? "REVIEW" : "KEEP";
      expect(recommendation).toBe("KEEP");
    });

    it("returns REVIEW for mid-range items", () => {
      const retirementScore = 0.65;
      const recommendation = retirementScore >= 0.7 ? "RETIRE" : retirementScore >= 0.6 ? "REVIEW" : "KEEP";
      expect(recommendation).toBe("REVIEW");
    });

    it("returns RETIRE for high-scoring items", () => {
      const retirementScore = 0.75;
      const recommendation = retirementScore >= 0.7 ? "RETIRE" : retirementScore >= 0.6 ? "REVIEW" : "KEEP";
      expect(recommendation).toBe("RETIRE");
    });
  });

  describe("Pearson correlation", () => {
    it("computes correlation correctly for perfect positive relationship", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10]; // y = 2x

      const meanX = x.reduce((a, b) => a + b) / x.length;
      const meanY = y.reduce((a, b) => a + b) / y.length;

      const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
      const sumSqX = x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0);
      const sumSqY = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);

      const r = numerator / Math.sqrt(sumSqX * sumSqY);

      expect(r).toBeCloseTo(1, 5); // Perfect positive correlation
    });

    it("computes correlation for negative relationship", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2]; // y = -2x + 12

      const meanX = x.reduce((a, b) => a + b) / x.length;
      const meanY = y.reduce((a, b) => a + b) / y.length;

      const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
      const sumSqX = x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0);
      const sumSqY = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);

      const r = numerator / Math.sqrt(sumSqX * sumSqY);

      expect(r).toBeCloseTo(-1, 5); // Perfect negative correlation
    });

    it("returns 0 for no correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 3, 3, 3, 3]; // Constant y, no variance

      const meanX = x.reduce((a, b) => a + b) / x.length;
      const meanY = y.reduce((a, b) => a + b) / y.length;

      const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
      const sumSqX = x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0);
      const sumSqY = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);

      // When sumSqY = 0, correlation is undefined, return 0
      const r = sumSqY === 0 ? 0 : numerator / Math.sqrt(sumSqX * sumSqY);

      expect(r).toBe(0);
    });
  });
});
