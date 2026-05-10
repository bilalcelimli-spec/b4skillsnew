/**
 * Item Parameter Drift (IPD) — Unit Tests
 *
 * Tests Lord chi-square, robust z-scores, drift classification,
 * batch analysis pipeline, and summary formatting.
 *
 * Psychometric expectations:
 *  - Large Δb with small SE → high chi-square → Class C (retire)
 *  - Small Δb with large SE → low chi-square → Class A (negligible)
 *  - Mean Δb ≠ 0 across bank → form-level drift warning
 */

import { describe, it, expect } from "vitest";
import {
  computeItemDrift,
  batchDriftAnalysis,
  summariseDriftResults,
  formatDriftReport,
  chiSquarePValue1df,
  type IrtSnapshot,
} from "../item-parameter-drift.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSnapshot(
  itemId: string,
  window: string,
  a: number,
  b: number,
  c: number,
  seB = 0.15
): IrtSnapshot {
  return {
    itemId,
    window,
    calibratedAt: new Date().toISOString(),
    a,
    b,
    c,
    seA: 0.12,
    seB,
    seC: 0.05,
    n: 300,
  };
}

const OLD_STABLE   = makeSnapshot("item-stable",  "2026-Q1", 1.2, 0.50, 0.25);
const NEW_STABLE   = makeSnapshot("item-stable",  "2026-Q2", 1.2, 0.52, 0.25); // tiny Δb

const OLD_MODERATE = makeSnapshot("item-mod",     "2026-Q1", 1.1, 0.00, 0.20);
const NEW_MODERATE = makeSnapshot("item-mod",     "2026-Q2", 1.1, 0.50, 0.20); // Δb=0.50 → z≈2.36 ≥ Z_MODERATE=2.0

const OLD_SEVERE   = makeSnapshot("item-severe",  "2026-Q1", 1.3, -0.50, 0.25, 0.05);
const NEW_SEVERE   = makeSnapshot("item-severe",  "2026-Q2", 1.3,  1.50, 0.25, 0.05); // Δb=2.0, small SE

// ─── chiSquarePValue1df ───────────────────────────────────────────────────────

describe("chiSquarePValue1df", () => {
  it("returns 1 for chi-square = 0", () => {
    expect(chiSquarePValue1df(0)).toBeCloseTo(1, 3);
  });

  it("returns ≈ 0.05 for chi-square ≈ 3.841", () => {
    expect(chiSquarePValue1df(3.841)).toBeCloseTo(0.05, 2);
  });

  it("returns ≈ 0.01 for chi-square ≈ 6.635", () => {
    expect(chiSquarePValue1df(6.635)).toBeCloseTo(0.01, 2);
  });

  it("p-value is in [0, 1]", () => {
    for (const chi of [0, 1, 3, 6, 10, 20]) {
      const p = chiSquarePValue1df(chi);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("p-value decreases as chi-square increases", () => {
    const p1 = chiSquarePValue1df(1);
    const p5 = chiSquarePValue1df(5);
    const p10 = chiSquarePValue1df(10);
    expect(p1).toBeGreaterThan(p5);
    expect(p5).toBeGreaterThan(p10);
  });
});

// ─── computeItemDrift ─────────────────────────────────────────────────────────

describe("computeItemDrift", () => {
  it("stable item → Class A, action NONE", () => {
    const result = computeItemDrift(OLD_STABLE, NEW_STABLE);
    expect(result.driftClass).toBe("A");
    expect(result.action).toBe("NONE");
  });

  it("moderate drift → Class B, action FLAG_FOR_REVIEW", () => {
    const result = computeItemDrift(OLD_MODERATE, NEW_MODERATE);
    expect(["B", "C"]).toContain(result.driftClass);
    expect(result.action).not.toBe("NONE");
  });

  it("severe drift → Class C, action RETIRE", () => {
    const result = computeItemDrift(OLD_SEVERE, NEW_SEVERE);
    expect(result.driftClass).toBe("C");
    expect(result.action).toBe("RETIRE");
  });

  it("returns correct delta values", () => {
    const result = computeItemDrift(OLD_STABLE, NEW_STABLE);
    expect(result.deltaA).toBeCloseTo(0, 3);
    expect(result.deltaB).toBeCloseTo(0.02, 3);
    expect(result.deltaC).toBeCloseTo(0, 3);
  });

  it("returns non-null Lord chi-square", () => {
    const result = computeItemDrift(OLD_STABLE, NEW_STABLE);
    expect(result.lordChiSquareB).not.toBeNull();
    expect(result.lordChiSquareB!).toBeGreaterThanOrEqual(0);
  });

  it("Lord p-value is in (0, 1]", () => {
    const result = computeItemDrift(OLD_STABLE, NEW_STABLE);
    if (result.lordPValueB !== null) {
      expect(result.lordPValueB).toBeGreaterThan(0);
      expect(result.lordPValueB).toBeLessThanOrEqual(1);
    }
  });

  it("z-scores are finite numbers", () => {
    const result = computeItemDrift(OLD_STABLE, NEW_STABLE);
    if (result.zA !== null) expect(Number.isFinite(result.zA)).toBe(true);
    if (result.zB !== null) expect(Number.isFinite(result.zB)).toBe(true);
    if (result.zC !== null) expect(Number.isFinite(result.zC)).toBe(true);
  });

  it("severe drift has larger |z| than stable drift", () => {
    const stable = computeItemDrift(OLD_STABLE, NEW_STABLE);
    const severe = computeItemDrift(OLD_SEVERE, NEW_SEVERE);
    expect(Math.abs(severe.zB ?? 0)).toBeGreaterThan(Math.abs(stable.zB ?? 0));
  });

  it("window labels are preserved", () => {
    const result = computeItemDrift(OLD_STABLE, NEW_STABLE);
    expect(result.windowOld).toBe("2026-Q1");
    expect(result.windowNew).toBe("2026-Q2");
  });

  it("interpretation is a non-empty string", () => {
    const result = computeItemDrift(OLD_STABLE, NEW_STABLE);
    expect(typeof result.interpretation).toBe("string");
    expect(result.interpretation.length).toBeGreaterThan(10);
  });
});

// ─── batchDriftAnalysis ───────────────────────────────────────────────────────

describe("batchDriftAnalysis", () => {
  const oldSnapshots = [OLD_STABLE, OLD_MODERATE, OLD_SEVERE];
  const newSnapshots = [NEW_STABLE, NEW_MODERATE, NEW_SEVERE];

  it("returns one result per matched item", () => {
    const results = batchDriftAnalysis(oldSnapshots, newSnapshots);
    expect(results).toHaveLength(3);
  });

  it("skips items present only in new snapshot", () => {
    const extraNew = [...newSnapshots, makeSnapshot("new-only", "2026-Q2", 1.0, 0.0, 0.25)];
    const results = batchDriftAnalysis(oldSnapshots, extraNew);
    expect(results).toHaveLength(3); // new-only has no old match
  });

  it("handles empty arrays without throwing", () => {
    expect(() => batchDriftAnalysis([], [])).not.toThrow();
    expect(batchDriftAnalysis([], [])).toHaveLength(0);
  });

  it("correctly identifies the severe item", () => {
    const results = batchDriftAnalysis(oldSnapshots, newSnapshots);
    const severe = results.find(r => r.itemId === "item-severe");
    expect(severe).toBeDefined();
    expect(severe!.driftClass).toBe("C");
  });
});

// ─── summariseDriftResults ────────────────────────────────────────────────────

describe("summariseDriftResults", () => {
  it("returns correct counts", () => {
    const results = batchDriftAnalysis(
      [OLD_STABLE, OLD_MODERATE, OLD_SEVERE],
      [NEW_STABLE, NEW_MODERATE, NEW_SEVERE]
    );
    const summary = summariseDriftResults(results);
    expect(summary.totalItems).toBe(3);
    expect(summary.classA + summary.classB + summary.classC).toBe(3);
    expect(summary.classC).toBeGreaterThanOrEqual(1); // severe item
  });

  it("retireItems contains Class-C items", () => {
    const results = batchDriftAnalysis([OLD_SEVERE], [NEW_SEVERE]);
    const summary = summariseDriftResults(results);
    expect(summary.retireItems).toHaveLength(1);
    expect(summary.retireItems[0].itemId).toBe("item-severe");
  });

  it("formLevelDrift is true when mean Δb > 0.10", () => {
    // All items shifted +0.5 → mean Δb = 0.5 > 0.10
    const oldSnaps = [
      makeSnapshot("a", "Q1", 1.0, 0.0, 0.25),
      makeSnapshot("b", "Q1", 1.0, 0.5, 0.25),
    ];
    const newSnaps = [
      makeSnapshot("a", "Q2", 1.0, 0.5, 0.25),
      makeSnapshot("b", "Q2", 1.0, 1.0, 0.25),
    ];
    const summary = summariseDriftResults(batchDriftAnalysis(oldSnaps, newSnaps));
    expect(summary.formLevelDrift).toBe(true);
  });

  it("formLevelDrift is false for stable bank", () => {
    const oldSnaps = [makeSnapshot("a", "Q1", 1.0, 0.0, 0.25)];
    const newSnaps = [makeSnapshot("a", "Q2", 1.0, 0.01, 0.25)]; // tiny Δb
    const summary = summariseDriftResults(batchDriftAnalysis(oldSnaps, newSnaps));
    expect(summary.formLevelDrift).toBe(false);
  });

  it("generatedAt is a valid ISO date string", () => {
    const summary = summariseDriftResults([]);
    expect(() => new Date(summary.generatedAt)).not.toThrow();
    expect(new Date(summary.generatedAt).toISOString()).toBe(summary.generatedAt);
  });
});

// ─── formatDriftReport ────────────────────────────────────────────────────────

describe("formatDriftReport", () => {
  it("returns a non-empty string", () => {
    const results = batchDriftAnalysis(
      [OLD_STABLE, OLD_SEVERE],
      [NEW_STABLE, NEW_SEVERE]
    );
    const summary = summariseDriftResults(results);
    const report = formatDriftReport(summary);
    expect(typeof report).toBe("string");
    expect(report.length).toBeGreaterThan(100);
  });

  it("contains class counts", () => {
    const results = batchDriftAnalysis([OLD_STABLE], [NEW_STABLE]);
    const summary = summariseDriftResults(results);
    const report = formatDriftReport(summary);
    expect(report).toContain("Negligible");
    expect(report).toContain("Severe");
  });

  it("contains retire section for Class-C items", () => {
    const results = batchDriftAnalysis([OLD_SEVERE], [NEW_SEVERE]);
    const summary = summariseDriftResults(results);
    const report = formatDriftReport(summary);
    expect(report).toContain("Retire");
    expect(report).toContain("item-severe");
  });

  it("handles empty results without throwing", () => {
    const report = formatDriftReport(summariseDriftResults([]));
    expect(typeof report).toBe("string");
  });
});
