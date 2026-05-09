/**
 * Angoff Panel Data Integrity Tests
 *
 * Validates the structural integrity and psychometric plausibility of the
 * panel data in angoff-panel-data.ts and the canonical cut scores derived
 * from it.
 *
 * These tests run in < 2s (node env, no DOM) and act as a regression guard:
 * if anyone edits panel data or bootstrap parameters, the tests catch
 * implausible changes before they reach production.
 */

import { describe, it, expect } from "vitest";
import {
  BOUNDARY_PANEL_DATA,
  BOOTSTRAP_BOUNDARY_DATA,
  PANEL_METADATA,
} from "../angoff-panel-data.js";
import {
  BOOTSTRAP_RESULTS,
  CANONICAL_CUT_SCORES,
  CEFR_LEVEL_FOR_THETA,
  formatCutScoreReport,
  buildCutScoreApiResponse,
} from "../canonical-cut-scores.js";

// ─── Panel data structure ─────────────────────────────────────────────────────

describe("BOUNDARY_PANEL_DATA — structure", () => {
  it("contains exactly 4 boundaries", () => {
    expect(BOUNDARY_PANEL_DATA).toHaveLength(4);
  });

  it("boundaries are in correct CEFR order", () => {
    const labels = BOUNDARY_PANEL_DATA.map((b) => b.boundary);
    expect(labels).toEqual(["A1/A2", "A2/B1", "B1/B2", "B2/C1"]);
  });

  it("each boundary has 8 panelists", () => {
    for (const b of BOUNDARY_PANEL_DATA) {
      expect(b.panelistRatings).toHaveLength(PANEL_METADATA.nPanelists);
    }
  });

  it("each boundary has 15 anchor items", () => {
    for (const b of BOUNDARY_PANEL_DATA) {
      expect(b.anchorItems).toHaveLength(PANEL_METADATA.nItemsPerBoundary);
    }
  });

  it("all anchor item IDs are unique within a boundary", () => {
    for (const b of BOUNDARY_PANEL_DATA) {
      const ids = b.anchorItems.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("IRT parameters are in plausible ranges", () => {
    for (const b of BOUNDARY_PANEL_DATA) {
      for (const item of b.anchorItems) {
        expect(item.params.a).toBeGreaterThan(0.5);
        expect(item.params.a).toBeLessThan(3.0);
        expect(item.params.b).toBeGreaterThan(-4.0);
        expect(item.params.b).toBeLessThan(4.0);
        expect(item.params.c).toBeGreaterThanOrEqual(0);
        expect(item.params.c).toBeLessThan(0.5);
      }
    }
  });

  it("all ratings are in [0,1] range", () => {
    for (const b of BOUNDARY_PANEL_DATA) {
      for (const panelist of b.panelistRatings) {
        for (const prob of Object.values(panelist.ratings)) {
          expect(prob).toBeGreaterThanOrEqual(0);
          expect(prob).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("every panelist has rated all anchor items in their boundary", () => {
    for (const b of BOUNDARY_PANEL_DATA) {
      const itemIds = new Set(b.anchorItems.map((i) => i.id));
      for (const panelist of b.panelistRatings) {
        const ratedIds = new Set(Object.keys(panelist.ratings));
        for (const id of itemIds) {
          expect(ratedIds.has(id)).toBe(true);
        }
      }
    }
  });

  it("MCC descriptors are non-empty strings", () => {
    for (const b of BOUNDARY_PANEL_DATA) {
      expect(typeof b.mccDescriptor).toBe("string");
      expect(b.mccDescriptor.length).toBeGreaterThan(30);
    }
  });
});

// ─── BOOTSTRAP_BOUNDARY_DATA format ──────────────────────────────────────────

describe("BOOTSTRAP_BOUNDARY_DATA — format", () => {
  it("has keys for all 4 boundaries", () => {
    const keys = Object.keys(BOOTSTRAP_BOUNDARY_DATA);
    expect(keys).toContain("A1/A2");
    expect(keys).toContain("A2/B1");
    expect(keys).toContain("B1/B2");
    expect(keys).toContain("B2/C1");
  });

  it("each entry has panelists and items arrays", () => {
    for (const [, data] of Object.entries(BOOTSTRAP_BOUNDARY_DATA)) {
      expect(Array.isArray(data.panelists)).toBe(true);
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.panelists.length).toBeGreaterThan(1);
      expect(data.items.length).toBeGreaterThan(2);
    }
  });
});

// ─── Bootstrap results (canonical-cut-scores) ────────────────────────────────

describe("BOOTSTRAP_RESULTS — psychometric plausibility", () => {
  it("produces 4 boundary results", () => {
    expect(BOOTSTRAP_RESULTS).toHaveLength(4);
  });

  it("all θ_cut values are finite", () => {
    for (const r of BOOTSTRAP_RESULTS) {
      expect(Number.isFinite(r.thetaCut)).toBe(true);
    }
  });

  it("cut scores are in ascending CEFR order", () => {
    for (let i = 0; i < BOOTSTRAP_RESULTS.length - 1; i++) {
      expect(BOOTSTRAP_RESULTS[i].thetaCut).toBeLessThan(
        BOOTSTRAP_RESULTS[i + 1].thetaCut
      );
    }
  });

  it("cut scores are in psychometrically plausible range [-3, +3]", () => {
    for (const r of BOOTSTRAP_RESULTS) {
      expect(r.thetaCut).toBeGreaterThan(-3.0);
      expect(r.thetaCut).toBeLessThan(3.0);
    }
  });

  it("A1/A2 threshold is in plausible range [-2.5, -0.5]", () => {
    const a1a2 = BOOTSTRAP_RESULTS.find((r) => r.boundary === "A1/A2");
    expect(a1a2).toBeDefined();
    expect(a1a2!.thetaCut).toBeGreaterThan(-2.5);
    expect(a1a2!.thetaCut).toBeLessThan(-0.5);
  });

  it("B2/C1 threshold is in plausible range [+0.4, +2.0]", () => {
    const b2c1 = BOOTSTRAP_RESULTS.find((r) => r.boundary === "B2/C1");
    expect(b2c1).toBeDefined();
    expect(b2c1!.thetaCut).toBeGreaterThan(0.4);
    expect(b2c1!.thetaCut).toBeLessThan(2.0);
  });

  it("95% CIs are narrower than 1.5 θ units (adequate panel reliability)", () => {
    for (const r of BOOTSTRAP_RESULTS) {
      const width = r.ci95Upper - r.ci95Lower;
      expect(width).toBeLessThan(1.5);
    }
  });

  it("90% CIs are strictly narrower than 95% CIs", () => {
    for (const r of BOOTSTRAP_RESULTS) {
      const w95 = r.ci95Upper - r.ci95Lower;
      const w90 = r.ci90Upper - r.ci90Lower;
      expect(w90).toBeLessThan(w95);
    }
  });

  it("inter-rater SD is below 1.0 (acceptable rater consistency)", () => {
    for (const r of BOOTSTRAP_RESULTS) {
      expect(r.interRaterSD).toBeLessThan(1.0);
    }
  });
});

// ─── CANONICAL_CUT_SCORES ─────────────────────────────────────────────────────

describe("CANONICAL_CUT_SCORES", () => {
  it("has all 4 boundary keys", () => {
    expect(CANONICAL_CUT_SCORES["A1/A2"]).toBeDefined();
    expect(CANONICAL_CUT_SCORES["A2/B1"]).toBeDefined();
    expect(CANONICAL_CUT_SCORES["B1/B2"]).toBeDefined();
    expect(CANONICAL_CUT_SCORES["B2/C1"]).toBeDefined();
  });

  it("values match the bootstrap thetaCut values", () => {
    for (const r of BOOTSTRAP_RESULTS) {
      expect(CANONICAL_CUT_SCORES[r.boundary]).toBe(r.thetaCut);
    }
  });
});

// ─── CEFR_LEVEL_FOR_THETA ─────────────────────────────────────────────────────

describe("CEFR_LEVEL_FOR_THETA", () => {
  it("returns A1 for very low theta", () => {
    expect(CEFR_LEVEL_FOR_THETA(-4.0)).toBe("A1");
  });

  it("returns C1 for very high theta", () => {
    expect(CEFR_LEVEL_FOR_THETA(3.5)).toBe("C1");
  });

  it("levels are monotonically non-decreasing with theta", () => {
    const ORDER: Record<string, number> = {
      PRE_A1: 0, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6,
    };
    const thetas = [-4, -2.5, -1.5, -0.8, 0.0, 0.5, 1.0, 2.0, 3.5];
    let prev = 0;
    for (const theta of thetas) {
      const level = CEFR_LEVEL_FOR_THETA(theta);
      const ord = ORDER[level];
      expect(ord).toBeGreaterThanOrEqual(prev);
      prev = ord;
    }
  });

  it("transitions around the canonical cuts", () => {
    const a1a2 = CANONICAL_CUT_SCORES["A1/A2"];
    expect(CEFR_LEVEL_FOR_THETA(a1a2 - 0.01)).toBe("A1");
    expect(CEFR_LEVEL_FOR_THETA(a1a2)).toBe("A2");

    const b1b2 = CANONICAL_CUT_SCORES["B1/B2"];
    expect(CEFR_LEVEL_FOR_THETA(b1b2 - 0.01)).toBe("B1");
    expect(CEFR_LEVEL_FOR_THETA(b1b2)).toBe("B2");
  });
});

// ─── Reporting helpers ────────────────────────────────────────────────────────

describe("formatCutScoreReport", () => {
  it("returns a non-empty string", () => {
    const report = formatCutScoreReport();
    expect(typeof report).toBe("string");
    expect(report.length).toBeGreaterThan(100);
  });

  it("contains all boundary labels", () => {
    const report = formatCutScoreReport();
    expect(report).toContain("A1/A2");
    expect(report).toContain("A2/B1");
    expect(report).toContain("B1/B2");
    expect(report).toContain("B2/C1");
  });
});

describe("buildCutScoreApiResponse", () => {
  it("has panelMetadata, boundaries, canonicalCuts, generatedAt", () => {
    const res = buildCutScoreApiResponse();
    expect(res).toHaveProperty("panelMetadata");
    expect(res).toHaveProperty("boundaries");
    expect(res).toHaveProperty("canonicalCuts");
    expect(res).toHaveProperty("generatedAt");
  });

  it("generatedAt is ISO 8601 date string", () => {
    const res = buildCutScoreApiResponse();
    expect(() => new Date(res.generatedAt)).not.toThrow();
    expect(new Date(res.generatedAt).toISOString()).toBe(res.generatedAt);
  });
});
