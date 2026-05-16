/**
 * Scoring SLA Monitor — Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  recordScoringLatency,
  getRecentRecords,
  computePercentiles,
  checkSlaViolation,
  getSlaReport,
  _resetSlaMonitorForTests,
  type ScoringLatencyRecord,
} from "../sla-monitor.js";

function makeRecord(
  tier: ScoringLatencyRecord["tier"],
  skill: ScoringLatencyRecord["skill"],
  latencyMs: number,
  success = true,
  offsetMs = 0
): ScoringLatencyRecord {
  return {
    taskId: `task-${Math.random().toString(36).slice(2)}`,
    tier,
    skill,
    latencyMs,
    success,
    recordedAt: Date.now() - offsetMs,
  };
}

beforeEach(() => {
  _resetSlaMonitorForTests();
});

// ─── computePercentiles ────────────────────────────────────────────────────────

describe("computePercentiles()", () => {
  it("returns all-zero for empty input", () => {
    const p = computePercentiles([]);
    expect(p.p50).toBe(0);
    expect(p.p95).toBe(0);
    expect(p.max).toBe(0);
  });

  it("returns correct percentiles for sorted data", () => {
    // 100 values: 1–100ms
    const latencies = Array.from({ length: 100 }, (_, i) => i + 1);
    const p = computePercentiles(latencies);
    expect(p.p50).toBeLessThanOrEqual(51);
    expect(p.p50).toBeGreaterThanOrEqual(49);
    expect(p.p95).toBeLessThanOrEqual(96);
    expect(p.p95).toBeGreaterThanOrEqual(94);
    expect(p.max).toBe(100);
  });

  it("handles a single-element array", () => {
    const p = computePercentiles([500]);
    expect(p.p50).toBe(500);
    expect(p.p95).toBe(500);
    expect(p.max).toBe(500);
  });

  it("sorts input before computing percentiles", () => {
    // Reversed input should give same result as sorted
    const latencies = [100, 50, 10, 90, 30];
    const p = computePercentiles(latencies);
    expect(p.p50).toBeGreaterThanOrEqual(10);
    expect(p.max).toBe(100);
  });
});

// ─── recordScoringLatency / getRecentRecords ───────────────────────────────────

describe("recordScoringLatency() + getRecentRecords()", () => {
  it("records arrive in getRecentRecords() within the window", () => {
    recordScoringLatency(makeRecord("TIER_1", "READING", 800));
    recordScoringLatency(makeRecord("TIER_1", "LISTENING", 950));
    const records = getRecentRecords(60);
    expect(records).toHaveLength(2);
  });

  it("old records (outside window) are excluded", () => {
    // Record with timestamp 2 hours ago
    const old = makeRecord("TIER_1", "READING", 500, true, 2 * 60 * 60 * 1000);
    recordScoringLatency(old);
    const records = getRecentRecords(60); // 60-minute window
    expect(records).toHaveLength(0);
  });

  it("returns empty array when buffer is fresh and empty", () => {
    expect(getRecentRecords(60)).toHaveLength(0);
  });

  it("handles many records (ring buffer wrap-around)", () => {
    for (let i = 0; i < 150; i++) {
      recordScoringLatency(makeRecord("TIER_2", "WRITING", 30_000));
    }
    const records = getRecentRecords(60);
    expect(records.length).toBeGreaterThan(0);
    expect(records.length).toBeLessThanOrEqual(150);
  });
});

// ─── checkSlaViolation ─────────────────────────────────────────────────────────

describe("checkSlaViolation()", () => {
  it("returns not-violated for empty tier records", () => {
    const result = checkSlaViolation("TIER_1");
    expect(result.violated).toBe(false);
  });

  it("TIER_1: not violated when p95 ≤ 2s", () => {
    for (let i = 0; i < 20; i++) {
      recordScoringLatency(makeRecord("TIER_1", "GRAMMAR", 1000)); // all 1s
    }
    const result = checkSlaViolation("TIER_1");
    expect(result.violated).toBe(false);
    expect(result.thresholdMs).toBe(2_000);
  });

  it("TIER_1: violated when p95 > 2s", () => {
    // 18 fast + 2 very slow (dominates p95 at 20 records: 95th percentile = index 18)
    for (let i = 0; i < 18; i++) {
      recordScoringLatency(makeRecord("TIER_1", "GRAMMAR", 500));
    }
    recordScoringLatency(makeRecord("TIER_1", "GRAMMAR", 10_000));
    recordScoringLatency(makeRecord("TIER_1", "GRAMMAR", 10_000));
    const result = checkSlaViolation("TIER_1");
    expect(result.violated).toBe(true);
  });

  it("TIER_2: not violated when p95 ≤ 5 min", () => {
    for (let i = 0; i < 20; i++) {
      recordScoringLatency(makeRecord("TIER_2", "WRITING", 60_000)); // 60s each
    }
    const result = checkSlaViolation("TIER_2");
    expect(result.violated).toBe(false);
    expect(result.thresholdMs).toBe(5 * 60_000);
  });

  it("TIER_2: violated when p95 > 5 min", () => {
    for (let i = 0; i < 20; i++) {
      recordScoringLatency(makeRecord("TIER_2", "WRITING", 10 * 60_000)); // 10 min
    }
    const result = checkSlaViolation("TIER_2");
    expect(result.violated).toBe(true);
  });

  it("violation is tier-specific — TIER_1 violation does not affect TIER_2", () => {
    for (let i = 0; i < 20; i++) {
      recordScoringLatency(makeRecord("TIER_1", "READING", 10_000)); // TIER_1 over SLA
      recordScoringLatency(makeRecord("TIER_2", "WRITING", 30_000)); // TIER_2 fine
    }
    expect(checkSlaViolation("TIER_1").violated).toBe(true);
    expect(checkSlaViolation("TIER_2").violated).toBe(false);
  });
});

// ─── getSlaReport ──────────────────────────────────────────────────────────────

describe("getSlaReport()", () => {
  it("report structure has all required fields", () => {
    const report = getSlaReport();
    expect(report).toHaveProperty("generatedAt");
    expect(report).toHaveProperty("windowMinutes");
    expect(report).toHaveProperty("totalRecords");
    expect(report).toHaveProperty("byTier");
    expect(report).toHaveProperty("bySkill");
    expect(report).toHaveProperty("overallHealthy");
  });

  it("byTier contains all three tiers", () => {
    const report = getSlaReport();
    expect(report.byTier).toHaveProperty("TIER_1");
    expect(report.byTier).toHaveProperty("TIER_2");
    expect(report.byTier).toHaveProperty("TIER_3");
  });

  it("overallHealthy is true when no tiers are violated", () => {
    for (let i = 0; i < 10; i++) {
      recordScoringLatency(makeRecord("TIER_1", "READING", 500));
      recordScoringLatency(makeRecord("TIER_2", "WRITING", 60_000));
    }
    const report = getSlaReport();
    expect(report.overallHealthy).toBe(true);
  });

  it("overallHealthy is false when any tier is violated", () => {
    for (let i = 0; i < 20; i++) {
      recordScoringLatency(makeRecord("TIER_1", "READING", 5_000)); // > 2s SLA
    }
    const report = getSlaReport();
    expect(report.overallHealthy).toBe(false);
  });

  it("bySkill is populated for observed skills", () => {
    recordScoringLatency(makeRecord("TIER_1", "READING", 800));
    recordScoringLatency(makeRecord("TIER_2", "WRITING", 45_000));
    const report = getSlaReport();
    expect(report.bySkill).toHaveProperty("READING");
    expect(report.bySkill).toHaveProperty("WRITING");
    expect(report.bySkill["READING"]!.n).toBeGreaterThanOrEqual(1);
  });

  it("successRate is computed correctly", () => {
    recordScoringLatency(makeRecord("TIER_1", "READING", 800, true));
    recordScoringLatency(makeRecord("TIER_1", "READING", 900, true));
    recordScoringLatency(makeRecord("TIER_1", "READING", 1200, false));
    const report = getSlaReport();
    // 2 of 3 succeeded = 0.666...
    expect(report.byTier["TIER_1"].successRate).toBeCloseTo(2 / 3, 4);
  });

  it("totalRecords matches the count of records within the window", () => {
    recordScoringLatency(makeRecord("TIER_1", "READING", 500));
    recordScoringLatency(makeRecord("TIER_2", "SPEAKING", 90_000));
    recordScoringLatency(makeRecord("TIER_3", "WRITING", 3_600_000));
    const report = getSlaReport();
    expect(report.totalRecords).toBe(3);
  });
});
