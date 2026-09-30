import { describe, expect, it } from "vitest";
import {
  generateCandidateExcel,
  generateCohortExcel,
  type CandidateReportData,
  type CohortReportData,
} from "../src/lib/analytics/report-generator.js";

describe("Excel report generation", () => {
  it("generates real XLSX workbooks with the patched ExcelJS dependency", async () => {
    const candidate: CandidateReportData = {
      candidateId: "candidate-1",
      name: "Test Candidate",
      email: "candidate@example.test",
      assessmentDate: new Date("2026-09-30T00:00:00Z"),
      cefrLevel: "B2",
      overallScore: 72,
      skillScores: { READING: 74 },
      sessionCount: 1,
      improvementTrend: "stable",
    };
    const cohort: CohortReportData = {
      organizationId: "org-1",
      organizationName: "Test Organization",
      generatedAt: new Date("2026-09-30T00:00:00Z"),
      totalCandidates: 1,
      averageScore: 72,
      cefrDistribution: { B2: 1 },
      skillBreakdown: { READING: { mean: 74, median: 74, stdDev: 0 } },
      topPerformers: [{ name: "Test Candidate", cefrLevel: "B2", score: 72 }],
      atRiskCandidates: [],
    };

    const [candidateFile, cohortFile] = await Promise.all([
      generateCandidateExcel(candidate),
      generateCohortExcel(cohort),
    ]);

    expect(candidateFile.subarray(0, 2).toString()).toBe("PK");
    expect(cohortFile.subarray(0, 2).toString()).toBe("PK");
    expect(candidateFile.length).toBeGreaterThan(1_000);
    expect(cohortFile.length).toBeGreaterThan(1_000);
  });
});
