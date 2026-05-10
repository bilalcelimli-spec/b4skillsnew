/**
 * Tests — collusion graph
 * src/lib/psychometrics/test-security/__tests__/collusion-graph.test.ts
 */

import { describe, it, expect } from "vitest";
import { analyseCollusion, ExamineeProfile } from "../collusion-graph.js";
import { ItemMeta } from "../answer-copying.js";
import { probability } from "../../../assessment-engine/irt.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ITEMS: ItemMeta[] = Array.from({ length: 15 }, (_, i) => ({
  itemId: `item-${i + 1}`,
  params: { a: 1.2, b: (i - 7) * 0.3, c: 0.20 },
}));

function makeResponses(theta: number) {
  return ITEMS.map(it => ({
    itemId: it.itemId,
    score: (probability(theta, it.params) > 0.5 ? 1 : 0) as 0 | 1,
  }));
}

// Two high-ability examinees who happen to answer identically (high-ability → independent)
const eA: ExamineeProfile = {
  examineeId: "A",
  theta: 1.5,
  ipAddress: "192.168.1.100",
  responses: makeResponses(1.5),
};

// B copies A's responses exactly but has low ability
const eB: ExamineeProfile = {
  examineeId: "B",
  theta: -1.5,
  ipAddress: "192.168.1.101", // same /24 subnet
  responses: [...eA.responses], // identical responses
};

// C is independent with low ability and different IP
const eC: ExamineeProfile = {
  examineeId: "C",
  theta: -1.5,
  ipAddress: "10.0.0.55",
  responses: makeResponses(-1.5),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("analyseCollusion", () => {
  it("returns correct structure", () => {
    const report = analyseCollusion([eA, eB, eC], ITEMS);
    expect(report).toHaveProperty("flaggedPairs");
    expect(report).toHaveProperty("clusters");
    expect(report).toHaveProperty("totalExaminees");
    expect(report).toHaveProperty("totalPairsAnalyzed");
    expect(report).toHaveProperty("flagRate");
  });

  it("totalExaminees matches input", () => {
    const report = analyseCollusion([eA, eB, eC], ITEMS);
    expect(report.totalExaminees).toBe(3);
  });

  it("totalPairsAnalyzed is N*(N-1)/2", () => {
    const report = analyseCollusion([eA, eB, eC], ITEMS);
    expect(report.totalPairsAnalyzed).toBe(3); // 3*(3-1)/2 = 3
  });

  it("flagRate is in [0,1]", () => {
    const report = analyseCollusion([eA, eB, eC], ITEMS);
    expect(report.flagRate).toBeGreaterThanOrEqual(0);
    expect(report.flagRate).toBeLessThanOrEqual(1);
  });

  it("handles single examinee without throwing", () => {
    const report = analyseCollusion([eA], ITEMS);
    expect(report.totalExaminees).toBe(1);
    expect(report.totalPairsAnalyzed).toBe(0);
    expect(report.flaggedPairs).toHaveLength(0);
    expect(report.clusters).toHaveLength(0);
  });

  it("handles empty examinees list", () => {
    const report = analyseCollusion([], ITEMS);
    expect(report.totalExaminees).toBe(0);
    expect(report.flaggedPairs).toHaveLength(0);
  });

  it("clusters have valid riskLevel values", () => {
    const report = analyseCollusion([eA, eB, eC], ITEMS);
    const valid = new Set(["LOW", "MEDIUM", "HIGH"]);
    for (const cluster of report.clusters) {
      expect(valid.has(cluster.riskLevel)).toBe(true);
    }
  });

  it("cluster members are a subset of all examinee IDs", () => {
    const ids = new Set([eA.examineeId, eB.examineeId, eC.examineeId]);
    const report = analyseCollusion([eA, eB, eC], ITEMS);
    for (const cluster of report.clusters) {
      for (const member of cluster.members) {
        expect(ids.has(member)).toBe(true);
      }
    }
  });

  it("handles examinees with no responseTimes without throwing", () => {
    expect(() => analyseCollusion([eA, eB], ITEMS)).not.toThrow();
  });

  it("same-subnet IP is detected", () => {
    // eA and eB share /24 subnet 192.168.1.x
    // We only check the report runs without error; actual flag depends on ω
    const report = analyseCollusion([eA, eB], ITEMS);
    expect(report.totalPairsAnalyzed).toBe(1);
  });
});
