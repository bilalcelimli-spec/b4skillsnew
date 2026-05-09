/**
 * SLO Monitor — Unit Tests
 *
 * Tests the pure computation functions in slo-monitor.ts without hitting
 * the database. The generateSloReport() function (which requires Prisma)
 * is tested via mock integration in a separate E2E test suite.
 */

import { describe, it, expect } from "vitest";
import {
  errorBudgetMinutes,
  errorBudgetConsumedPct,
  SLO_TARGETS,
  sloReportToMarkdown,
  type SloReport,
} from "../slo-monitor.js";

// ─── errorBudgetMinutes ───────────────────────────────────────────────────────

describe("errorBudgetMinutes", () => {
  it("99.5% SLO over 30 days = 216 minutes", () => {
    const result = errorBudgetMinutes(0.995, 30);
    expect(result).toBeCloseTo(216, 0);
  });

  it("99.0% SLO over 30 days = 432 minutes", () => {
    expect(errorBudgetMinutes(0.990, 30)).toBeCloseTo(432, 0);
  });

  it("99.9% SLO over 30 days ≈ 43.2 minutes", () => {
    expect(errorBudgetMinutes(0.999, 30)).toBeCloseTo(43.2, 1);
  });

  it("95.0% SLO over 30 days = 2160 minutes", () => {
    expect(errorBudgetMinutes(0.950, 30)).toBeCloseTo(2160, 0);
  });

  it("budget scales linearly with window", () => {
    const b30 = errorBudgetMinutes(0.995, 30);
    const b60 = errorBudgetMinutes(0.995, 60);
    expect(b60).toBeCloseTo(b30 * 2, 5);
  });
});

// ─── errorBudgetConsumedPct ───────────────────────────────────────────────────

describe("errorBudgetConsumedPct", () => {
  it("returns 0 when SLO is met exactly", () => {
    expect(errorBudgetConsumedPct(0.995, 0.995, 30)).toBe(0);
  });

  it("returns 0 when SLO is exceeded", () => {
    expect(errorBudgetConsumedPct(0.995, 0.999, 30)).toBe(0);
  });

  it("returns 100 when entirely failed", () => {
    expect(errorBudgetConsumedPct(0.995, 0.990, 30)).toBeCloseTo(100, 0);
  });

  it("returns ~50 when half the budget is consumed", () => {
    // SLO = 99.5%; achieved = 99.25% → half the 0.5% budget consumed
    const result = errorBudgetConsumedPct(0.995, 0.9925, 30);
    expect(result).toBeCloseTo(50, 1);
  });

  it("caps at 100 even for severe failures", () => {
    const result = errorBudgetConsumedPct(0.995, 0.900, 30);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("returns 0 for perfect uptime against any SLO", () => {
    expect(errorBudgetConsumedPct(0.999, 1.0, 30)).toBe(0);
    expect(errorBudgetConsumedPct(0.995, 1.0, 30)).toBe(0);
    expect(errorBudgetConsumedPct(0.950, 1.0, 30)).toBe(0);
  });
});

// ─── SLO_TARGETS ─────────────────────────────────────────────────────────────

describe("SLO_TARGETS — definition integrity", () => {
  it("contains at least 6 SLO definitions", () => {
    expect(SLO_TARGETS.length).toBeGreaterThanOrEqual(6);
  });

  it("all SLO names are unique", () => {
    const names = SLO_TARGETS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all targets are in (0, 1] range", () => {
    for (const slo of SLO_TARGETS) {
      expect(slo.target).toBeGreaterThan(0);
      expect(slo.target).toBeLessThanOrEqual(1);
    }
  });

  it("all windows are positive integers", () => {
    for (const slo of SLO_TARGETS) {
      expect(slo.windowDays).toBeGreaterThan(0);
      expect(Number.isInteger(slo.windowDays)).toBe(true);
    }
  });

  it("has api_availability SLO at 99.5%", () => {
    const slo = SLO_TARGETS.find((s) => s.name === "api_availability");
    expect(slo).toBeDefined();
    expect(slo!.target).toBe(0.995);
  });

  it("has ai_scoring_availability SLO at 95%", () => {
    const slo = SLO_TARGETS.find((s) => s.name === "ai_scoring_availability");
    expect(slo).toBeDefined();
    expect(slo!.target).toBe(0.950);
  });

  it("all SLOs have non-empty name and description", () => {
    for (const slo of SLO_TARGETS) {
      expect(slo.name.length).toBeGreaterThan(0);
      expect(slo.description.length).toBeGreaterThan(5);
    }
  });
});

// ─── sloReportToMarkdown ──────────────────────────────────────────────────────

const MOCK_REPORT: SloReport = {
  generatedAt: "2026-05-10T08:00:00.000Z",
  windowDays: 30,
  windowStart: "2026-04-10T08:00:00.000Z",
  windowEnd: "2026-05-10T08:00:00.000Z",
  metrics: [
    {
      sloName: "api_availability",
      target: 0.995,
      achieved: null,
      compliant: null,
      errorBudgetConsumedPct: null,
      windowDays: 30,
      apmRequired: true,
      note: "Requires Betterstack",
    },
    {
      sloName: "session_success_rate",
      target: 0.990,
      achieved: 0.997,
      compliant: true,
      errorBudgetConsumedPct: 0,
      windowDays: 30,
      note: "1450/1455 sessions completed",
    },
    {
      sloName: "ai_scoring_availability",
      target: 0.950,
      achieved: 0.923,
      compliant: false,
      errorBudgetConsumedPct: 54,
      windowDays: 30,
      note: "35 ai_unavailable out of 455 scored",
    },
  ],
  summary: {
    totalSlos: 3,
    compliantSlos: 1,
    nonCompliantSlos: 1,
    unknownSlos: 1,
    overallHealthy: false,
  },
  recommendations: [
    "1 SLOs require APM tooling.",
    'SLO "ai_scoring_availability" is non-compliant.',
  ],
};

describe("sloReportToMarkdown", () => {
  it("returns a non-empty string", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(100);
  });

  it("contains a header with window info", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    expect(md).toContain("SLO Report");
    expect(md).toContain("30");
  });

  it("includes all SLO names", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    expect(md).toContain("api_availability");
    expect(md).toContain("session_success_rate");
    expect(md).toContain("ai_scoring_availability");
  });

  it("uses ✅ for compliant SLOs", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    expect(md).toContain("✅");
  });

  it("uses ❌ for non-compliant SLOs", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    expect(md).toContain("❌");
  });

  it("uses ⚠️ for unknown SLOs", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    expect(md).toContain("⚠️");
  });

  it("includes recommendations section when present", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    expect(md).toContain("Recommendations");
  });

  it("formats achieved percentages correctly", () => {
    const md = sloReportToMarkdown(MOCK_REPORT);
    // session_success_rate achieved = 0.997 → 99.70%
    expect(md).toContain("99.70%");
    // ai_scoring_availability achieved = 0.923 → 92.30%
    expect(md).toContain("92.30%");
  });
});
