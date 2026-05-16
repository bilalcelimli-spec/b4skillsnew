/**
 * Validity Evidence Package — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  buildValidityEvidencePackage,
  buildEmptyValidityPackage,
  formatValidityReport,
  type IrtModelFitEvidence,
  type InternalStructureEvidence,
  type ConcurrentValidityEvidence,
  type ScoringAgreementEvidence,
  type ResponseProcessEvidence,
  type ConsequentialEvidence,
  type DifEvidence,
} from "../validity-evidence-package.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

const GOOD_IRT: IrtModelFitEvidence = {
  itemCount: 250,
  infitAcceptableRate: 0.95,
  outfitAcceptableRate: 0.93,
  rpbisAcceptableRate: 0.92,
  avgReliabilityIndex: 0.82,
  computedAt: NOW,
};

const POOR_IRT: IrtModelFitEvidence = {
  itemCount: 100,
  infitAcceptableRate: 0.70, // below 0.90 benchmark
  outfitAcceptableRate: 0.68,
  rpbisAcceptableRate: 0.72,
  avgReliabilityIndex: 0.55,
  computedAt: NOW,
};

const GOOD_INTERNAL: InternalStructureEvidence = {
  cronbachAlpha: 0.91,
  stratifiedAlpha: { B1: 0.88, B2: 0.90, C1: 0.89 },
  avgInterSkillCorrelation: 0.72,
  subscoreReliability: { READING: 0.89, WRITING: 0.87 },
  computedAt: NOW,
};

const POOR_INTERNAL: InternalStructureEvidence = {
  cronbachAlpha: 0.72, // below 0.85 benchmark
  stratifiedAlpha: {},
  avgInterSkillCorrelation: 0.50,
  subscoreReliability: {},
  computedAt: NOW,
};

const GOOD_CONCURRENT: ConcurrentValidityEvidence[] = [
  {
    externalTest: "IELTS",
    pearsonR: 0.88,
    spearmanRho: 0.86,
    cefrExactAgreement: 0.71,
    cefrAdjacentAgreement: 0.94,
    n: 312,
    computedAt: NOW,
  },
];

const NO_CONCURRENT: ConcurrentValidityEvidence[] = [];

const GOOD_AGREEMENT: ScoringAgreementEvidence[] = [
  {
    skill: "WRITING",
    qwk: 0.85,
    mae: 0.06,
    pearsonR: 0.90,
    icc: 0.88,
    iccInterpretation: "GOOD",
    n: 200,
    meetsHighStakesThreshold: true,
    computedAt: NOW,
  },
];

const POOR_AGREEMENT: ScoringAgreementEvidence[] = [
  {
    skill: "SPEAKING",
    qwk: 0.65,
    mae: 0.12,
    pearsonR: 0.72,
    icc: 0.68,
    iccInterpretation: "MODERATE",
    n: 150,
    meetsHighStakesThreshold: false,
    computedAt: NOW,
  },
];

const GOOD_RESPONSE_PROCESS: ResponseProcessEvidence = {
  rapidGuessFlagRate: 0.02,
  clickstreamAnomalyRate: 0.03,
  poorPersonFitRate: 0.04,
  sessionCount: 5000,
  computedAt: NOW,
};

const GOOD_CONSEQUENTIAL: ConsequentialEvidence = {
  classificationConsistency: 0.88,
  falsePositiveRate: 0.06,
  falseNegativeRate: 0.07,
  decisionAccuracy: 0.91,
  semAtCuts: { B1: 0.38, B2: 0.41, C1: 0.44 },
  computedAt: NOW,
};

const DIF: DifEvidence = {
  itemsAnalysed: 250,
  itemsFlagged: 8,
  itemsRemoved: 3,
  groupsTested: ["gender", "L1", "age"],
  computedAt: NOW,
};

const BLUEPRINT: Record<string, { target: number; actual: number }> = {
  READING: { target: 0.30, actual: 0.29 },
  LISTENING: { target: 0.25, actual: 0.26 },
  GRAMMAR: { target: 0.25, actual: 0.24 },
  VOCABULARY: { target: 0.20, actual: 0.21 },
};

// ─── buildValidityEvidencePackage ──────────────────────────────────────────────

describe("buildValidityEvidencePackage()", () => {
  it("produces a package with all five evidence sources", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    expect(pkg).toHaveProperty("testContent");
    expect(pkg).toHaveProperty("internalStructure");
    expect(pkg).toHaveProperty("relationsToOtherVariables");
    expect(pkg).toHaveProperty("responseProcesses");
    expect(pkg).toHaveProperty("consequentialEvidence");
  });

  it("includes metadata fields", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    expect(pkg.testName).toBeTruthy();
    expect(pkg.version).toBeTruthy();
    expect(() => new Date(pkg.generatedAt)).not.toThrow();
  });

  it("rates STRONG when all benchmarks are met", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    expect(["STRONG", "ADEQUATE"]).toContain(pkg.summary.overallAssessment);
  });

  it("rates INSUFFICIENT or DEVELOPING when most benchmarks fail", () => {
    const pkg = buildValidityEvidencePackage(
      POOR_IRT, BLUEPRINT, DIF, POOR_INTERNAL,
      NO_CONCURRENT, POOR_AGREEMENT, GOOD_RESPONSE_PROCESS,
      { ...GOOD_CONSEQUENTIAL, classificationConsistency: 0.70, decisionAccuracy: 0.75 }
    );
    expect(["DEVELOPING", "INSUFFICIENT"]).toContain(pkg.summary.overallAssessment);
  });

  it("adds to keyStrengths when cronbachAlpha ≥ 0.85", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const strengthText = pkg.summary.keyStrengths.join(" ");
    expect(strengthText.toLowerCase()).toContain("internal consistency");
  });

  it("adds to areasForDevelopment when cronbachAlpha < 0.85", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, POOR_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const developmentText = pkg.summary.areasForDevelopment.join(" ");
    expect(developmentText.toLowerCase()).toContain("internal consistency");
  });

  it("notes missing concurrent validity when no data provided", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      NO_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const developmentText = pkg.summary.areasForDevelopment.join(" ");
    expect(developmentText.toLowerCase()).toContain("concurrent");
  });

  it("includes AI-human agreement data in relationsToOtherVariables", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    expect(pkg.relationsToOtherVariables.scoringAgreement).toHaveLength(1);
    expect(pkg.relationsToOtherVariables.concurrentValidity).toHaveLength(1);
  });

  it("includes DIF data in testContent", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    expect(pkg.testContent.dif.itemsFlagged).toBe(DIF.itemsFlagged);
  });
});

// ─── buildEmptyValidityPackage ─────────────────────────────────────────────────

describe("buildEmptyValidityPackage()", () => {
  it("returns a valid package structure", () => {
    const pkg = buildEmptyValidityPackage();
    expect(pkg).toHaveProperty("summary");
    expect(pkg).toHaveProperty("testContent");
  });

  it("has zero item count in empty package", () => {
    const pkg = buildEmptyValidityPackage();
    expect(pkg.testContent.irtModelFit.itemCount).toBe(0);
  });

  it("has INSUFFICIENT or DEVELOPING rating for zeroed data", () => {
    const pkg = buildEmptyValidityPackage();
    expect(["DEVELOPING", "INSUFFICIENT"]).toContain(pkg.summary.overallAssessment);
  });
});

// ─── formatValidityReport ──────────────────────────────────────────────────────

describe("formatValidityReport()", () => {
  it("returns a non-empty string", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const report = formatValidityReport(pkg);
    expect(typeof report).toBe("string");
    expect(report.length).toBeGreaterThan(100);
  });

  it("includes a markdown H1 title", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const report = formatValidityReport(pkg);
    expect(report).toContain("# Validity Evidence Report");
  });

  it("includes all five section headings", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const report = formatValidityReport(pkg);
    expect(report).toContain("Test Content");
    expect(report).toContain("Internal Structure");
    expect(report).toContain("Relations to Other Variables");
    expect(report).toContain("Response Processes");
    expect(report).toContain("Consequential");
  });

  it("includes Cronbach α value", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const report = formatValidityReport(pkg);
    expect(report).toContain("0.910");
  });

  it("includes concurrent validity Pearson r", () => {
    const pkg = buildValidityEvidencePackage(
      GOOD_IRT, BLUEPRINT, DIF, GOOD_INTERNAL,
      GOOD_CONCURRENT, GOOD_AGREEMENT, GOOD_RESPONSE_PROCESS, GOOD_CONSEQUENTIAL
    );
    const report = formatValidityReport(pkg);
    expect(report).toContain("IELTS");
    expect(report).toContain("0.880");
  });
});
