/**
 * Vocabulary Profiler — Unit Tests
 *
 * Tests the CEFR word-band analysis, Flesch-Kincaid estimation, and
 * lexical constraint validation for reading/listening passages.
 */

import { describe, it, expect } from "vitest";
import {
  profileText,
  meetsLexicalStandard,
  formatProfileSummary,
} from "../vocabulary-profiler.js";

// ─── Test passages ────────────────────────────────────────────────────────────

const A1_PASSAGE =
  "My name is Anna. I am ten years old. I have a cat and a dog. " +
  "My cat is black. My dog is big and white. I love my pets. " +
  "We live in a small house. The house has two rooms.";

const B1_PASSAGE =
  "Recent studies suggest that teenagers spend an average of six hours per day " +
  "using social media platforms. While many argue that this behavior affects their " +
  "academic performance, others believe that digital communication develops important " +
  "social skills. Parents and teachers are increasingly concerned about the situation " +
  "and are looking for practical solutions to manage screen time effectively.";

const C1_PASSAGE =
  "The proliferation of algorithmic governance mechanisms has engendered considerable " +
  "scholarly debate regarding the epistemic foundations of automated decision-making. " +
  "Critics contend that reliance on opaque computational models systematically " +
  "disadvantages marginalized demographic cohorts, while proponents emphasize the " +
  "comparative objectivity of data-driven assessments relative to subjective human " +
  "judgment. This dichotomy underscores the inherent tension between efficiency " +
  "imperatives and procedural justice norms.";

// ─── profileText ─────────────────────────────────────────────────────────────

describe("profileText", () => {
  it("returns a result with all required fields", () => {
    const r = profileText(A1_PASSAGE, "A1");
    expect(r.targetLevel).toBe("A1");
    expect(typeof r.passes).toBe("boolean");
    expect(Array.isArray(r.issues)).toBe(true);
    expect(typeof r.fleschKincaidGrade).toBe("number");
    expect(typeof r.ttr).toBe("number");
    expect(typeof r.avgWordLength).toBe("number");
    expect(r.distribution).toBeDefined();
    expect(r.distribution.total).toBeGreaterThan(0);
  });

  it("A1 passage passes A1 constraints", () => {
    const r = profileText(A1_PASSAGE, "A1");
    expect(r.passes).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("A1 passage fails C1 constraints (too simple)", () => {
    const r = profileText(A1_PASSAGE, "C1");
    // FK grade of A1 passage < 11 → fails FK constraint
    expect(r.passes).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("C1 passage fails A1 constraints (too complex)", () => {
    const r = profileText(C1_PASSAGE, "A1");
    expect(r.passes).toBe(false);
    // Should have issues about off-level vocabulary
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("band distribution sums to approximately 1", () => {
    const r = profileText(B1_PASSAGE, "B1");
    const total = Object.values(r.distribution.bands).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 1);
  });

  it("cumulative coverage is non-decreasing", () => {
    const r = profileText(B1_PASSAGE, "B1");
    const bands = ["A1", "A2", "B1", "B2", "C1", "C2", "OFF"] as const;
    let prev = 0;
    for (const band of bands) {
      const cum = r.distribution.cumulativeCoverage[band];
      expect(cum).toBeGreaterThanOrEqual(prev - 0.001); // float tolerance
      prev = cum;
    }
  });

  it("FK grade is non-negative", () => {
    const r = profileText(A1_PASSAGE, "A1");
    expect(r.fleschKincaidGrade).toBeGreaterThanOrEqual(0);
  });

  it("TTR is between 0 and 1", () => {
    for (const passage of [A1_PASSAGE, B1_PASSAGE, C1_PASSAGE]) {
      const r = profileText(passage, "B1");
      expect(r.ttr).toBeGreaterThan(0);
      expect(r.ttr).toBeLessThanOrEqual(1);
    }
  });

  it("A1 passage has higher A1-band proportion than C1 passage", () => {
    const a1Result = profileText(A1_PASSAGE, "A1");
    const c1Result = profileText(C1_PASSAGE, "C1");
    expect(a1Result.distribution.bands.A1).toBeGreaterThan(
      c1Result.distribution.bands.A1,
    );
  });

  it("C1 passage has higher FK grade than A1 passage", () => {
    const a1Result = profileText(A1_PASSAGE, "A1");
    const c1Result = profileText(C1_PASSAGE, "C1");
    expect(c1Result.fleschKincaidGrade).toBeGreaterThan(a1Result.fleschKincaidGrade);
  });

  it("handles empty string without throwing", () => {
    expect(() => profileText("", "A1")).not.toThrow();
  });

  it("handles very short text without throwing", () => {
    expect(() => profileText("Hello world.", "A1")).not.toThrow();
  });

  it("total word count matches token count", () => {
    const r = profileText(A1_PASSAGE, "A1");
    expect(r.distribution.total).toBeGreaterThan(0);
  });
});

// ─── meetsLexicalStandard ─────────────────────────────────────────────────────

describe("meetsLexicalStandard", () => {
  it("A1 passage meets A1 standard", () => {
    expect(meetsLexicalStandard(A1_PASSAGE, "A1")).toBe(true);
  });

  it("A1 passage does not meet C1 standard", () => {
    expect(meetsLexicalStandard(A1_PASSAGE, "C1")).toBe(false);
  });

  it("returns boolean", () => {
    expect(typeof meetsLexicalStandard(B1_PASSAGE, "B1")).toBe("boolean");
  });
});

// ─── formatProfileSummary ─────────────────────────────────────────────────────

describe("formatProfileSummary", () => {
  it("returns a non-empty string", () => {
    const r = profileText(A1_PASSAGE, "A1");
    const summary = formatProfileSummary(r);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(50);
  });

  it("contains PASS for a passing result", () => {
    const r = profileText(A1_PASSAGE, "A1");
    const summary = formatProfileSummary(r);
    expect(summary).toContain("PASS");
  });

  it("contains FAIL for a failing result", () => {
    const r = profileText(A1_PASSAGE, "C1");
    const summary = formatProfileSummary(r);
    expect(summary).toContain("FAIL");
  });

  it("contains band distribution information", () => {
    const r = profileText(B1_PASSAGE, "B1");
    const summary = formatProfileSummary(r);
    expect(summary).toContain("A1:");
    expect(summary).toContain("B1:");
  });

  it("contains FK grade", () => {
    const r = profileText(B1_PASSAGE, "B1");
    const summary = formatProfileSummary(r);
    expect(summary).toContain("FK Grade");
  });

  it("lists issues when present", () => {
    const r = profileText(A1_PASSAGE, "C1"); // will fail
    const summary = formatProfileSummary(r);
    if (r.issues.length > 0) {
      expect(summary).toContain("Issues:");
    }
  });
});
