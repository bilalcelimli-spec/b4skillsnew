import { describe, expect, it } from "vitest";
import {
  marginalReliability,
  classificationAccuracy,
  classificationConsistency,
  conditionalSemAtCuts,
  cronbachAlpha,
  generateReliabilityReport,
} from "../reliability-metrics";

describe("marginalReliability()", () => {
  it("returns high reliability when SE is small relative to theta variance", () => {
    const thetas = [-2, -1, 0, 1, 2];
    const sems = [0.25, 0.25, 0.25, 0.25, 0.25];
    const rho = marginalReliability(thetas, sems);
    expect(rho).toBeGreaterThan(0.95);
    expect(rho).toBeLessThanOrEqual(1);
  });

  it("returns 0 for insufficient theta variance", () => {
    const thetas = [0.5, 0.5, 0.5];
    const sems = [0.3, 0.2, 0.4];
    expect(marginalReliability(thetas, sems)).toBe(0);
  });
});

describe("classificationAccuracy()", () => {
  it("computes exact proportion of matched labels", () => {
    const observed = ["A2", "B1", "B1", "B2", "C1"];
    const truth = ["A2", "A2", "B1", "B2", "C1"];
    expect(classificationAccuracy(observed, truth)).toBeCloseTo(0.8, 6);
  });

  it("returns 0 for empty or mismatched input", () => {
    expect(classificationAccuracy([], [])).toBe(0);
    expect(classificationAccuracy(["A2"], ["A2", "B1"])).toBe(0);
  });
});

describe("classificationConsistency()", () => {
  it("returns high consistency with small SEM", () => {
    const thetas = [-1.2, -0.3, 0.2, 1.1];
    const sems = [0.05, 0.05, 0.05, 0.05];
    const cuts = [-0.5, 0.5];
    const consistency = classificationConsistency(thetas, sems, cuts);
    expect(consistency).toBeGreaterThan(0.95);
    expect(consistency).toBeLessThanOrEqual(1);
  });

  it("returns lower consistency with larger SEM", () => {
    const thetas = [-1.2, -0.3, 0.2, 1.1];
    const tight = classificationConsistency(thetas, [0.05, 0.05, 0.05, 0.05], [-0.5, 0.5]);
    const noisy = classificationConsistency(thetas, [0.7, 0.7, 0.7, 0.7], [-0.5, 0.5]);
    expect(noisy).toBeLessThan(tight);
  });
});

describe("conditionalSemAtCuts()", () => {
  it("averages SEM near each cut and returns 0 when no nearby theta", () => {
    const thetas = [-1.0, -0.6, 0.0, 0.4, 1.2];
    const sems = [0.3, 0.2, 0.25, 0.35, 0.4];
    const cuts = [
      { level: "A2", theta: -0.8 },
      { level: "B1", theta: 0.2 },
      { level: "C2", theta: 3.0 },
    ];

    const results = conditionalSemAtCuts(thetas, sems, cuts);
    expect(results).toHaveLength(3);
    expect(results[0].cefrLevel).toBe("A2");
    expect(results[0].sem).toBeGreaterThan(0);
    expect(results[1].cefrLevel).toBe("B1");
    expect(results[1].sem).toBeGreaterThan(0);
    expect(results[2]).toEqual({ cefrLevel: "C2", theta: 3.0, sem: 0 });
  });
});

describe("cronbachAlpha()", () => {
  it("returns high alpha for highly coherent item scores", () => {
    const itemScores = [
      [1, 1, 2, 1],
      [2, 2, 3, 2],
      [3, 3, 4, 3],
      [4, 4, 5, 4],
      [5, 5, 6, 5],
    ];
    const alpha = cronbachAlpha(itemScores);
    expect(alpha).toBeGreaterThan(0.9);
  });

  it("returns 0 for insufficient rows/items", () => {
    expect(cronbachAlpha([])).toBe(0);
    expect(cronbachAlpha([[1]])).toBe(0);
  });
});

describe("generateReliabilityReport()", () => {
  it("builds a rounded summary report", () => {
    const thetas = [-1.2, -0.2, 0.1, 0.9, 1.4];
    const sems = [0.2, 0.25, 0.3, 0.25, 0.2];
    const cuts = [
      { level: "A2", theta: -0.7 },
      { level: "B1", theta: 0.0 },
      { level: "B2", theta: 0.8 },
    ];
    const itemScores = [
      [1, 2, 1],
      [2, 2, 2],
      [2, 3, 2],
      [3, 3, 3],
      [4, 4, 4],
    ];

    const report = generateReliabilityReport(thetas, sems, cuts, itemScores);
    expect(report.sampleSize).toBe(5);
    expect(report.testLength).toBe(3);
    expect(report.classificationAccuracy).toBe(0);
    expect(report.conditionalSem).toHaveLength(3);
    expect(report.marginalReliability).toBeGreaterThan(0);
    expect(report.cronbachAlpha).toBeGreaterThan(0);
  });
});
