/**
 * Tests — vertical linking (Stocking-Lord & Haebara)
 * src/lib/psychometrics/__tests__/vertical-linking.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  computeLinkingConstants,
  transformParams,
  transformTheta,
  linkItemBank,
  AnchorItem,
} from "../vertical-linking.js";
import { probability } from "../../assessment-engine/irt.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a set of anchor items where the "old" parameters are a known
 * linear transform of the "new" ones: a_old = a_new * A_true, b_old = (b_new - B_true) / A_true
 *
 * This lets us verify recovery of (A_true, B_true).
 */
function makeAnchorItems(
  n: number,
  A_true: number,
  B_true: number
): AnchorItem[] {
  return Array.from({ length: n }, (_, i) => {
    const bNew = (i - n / 2) * 0.5;
    const aNew = 1.0 + (i % 3) * 0.2;
    const cNew = 0.20;

    // Inverse transform: paramsOld are on old scale
    // θ_new = A·θ_old + B ⟹ b_old = (b_new - B) / A, a_old = a_new * A
    const bOld = (bNew - B_true) / A_true;
    const aOld = aNew * A_true;

    return {
      itemId: `anchor-${i + 1}`,
      paramsNew: { a: aNew, b: bNew, c: cNew },
      paramsOld: { a: aOld, b: bOld, c: cNew },
    };
  });
}

// ─── transformParams ──────────────────────────────────────────────────────────

describe("transformParams", () => {
  it("identity transform leaves params unchanged", () => {
    const p = { a: 1.2, b: 0.5, c: 0.20 };
    const t = transformParams(p, 1, 0);
    expect(t.a).toBeCloseTo(p.a, 8);
    expect(t.b).toBeCloseTo(p.b, 8);
    expect(t.c).toBeCloseTo(p.c, 8);
  });

  it("applies scale and shift correctly", () => {
    const p = { a: 1.0, b: 0.0, c: 0.20 };
    const t = transformParams(p, 1.2, 0.3);
    // a_new = a_old / A = 1.0/1.2
    expect(t.a).toBeCloseTo(1.0 / 1.2, 6);
    // b_new = A * b_old + B = 1.2 * 0.0 + 0.3
    expect(t.b).toBeCloseTo(0.3, 6);
    expect(t.c).toBeCloseTo(0.20, 8);
  });

  it("preserves c parameter always", () => {
    const p = { a: 1.5, b: -0.8, c: 0.25 };
    const t = transformParams(p, 0.9, 0.4);
    expect(t.c).toBeCloseTo(p.c, 8);
  });
});

// ─── transformTheta ───────────────────────────────────────────────────────────

describe("transformTheta", () => {
  it("identity leaves theta unchanged", () => {
    expect(transformTheta(1.5, 1, 0)).toBeCloseTo(1.5, 8);
  });

  it("applies A*theta + B", () => {
    expect(transformTheta(2.0, 1.5, 0.3)).toBeCloseTo(3.3, 8);
  });
});

// ─── computeLinkingConstants (Stocking-Lord) ──────────────────────────────────

describe("computeLinkingConstants — Stocking-Lord", () => {
  it("throws when fewer than 3 anchors", () => {
    const anchors = makeAnchorItems(2, 1, 0);
    expect(() => computeLinkingConstants(anchors)).toThrow(/3 anchor/);
  });

  it("recovers identity transform (A=1, B=0) with small RMSD", () => {
    // If old params === new params, the linking should converge near A=1, B=0
    const anchors: AnchorItem[] = makeAnchorItems(5, 1, 0).map(a => ({
      ...a,
      paramsOld: { ...a.paramsNew }, // identical
    }));
    const result = computeLinkingConstants(anchors, "STOCKING_LORD");
    expect(result.A).toBeCloseTo(1, 1);
    expect(result.B).toBeCloseTo(0, 1);
    expect(result.diagnostics.rmsd).toBeLessThan(0.05);
  });

  it("recovers known (A=1.2, B=0.3) with acceptable accuracy", () => {
    const A_true = 1.2;
    const B_true = 0.3;
    const anchors = makeAnchorItems(8, A_true, B_true);
    const result = computeLinkingConstants(anchors, "STOCKING_LORD");
    // Recovery within ±0.15 of true values
    expect(result.A).toBeCloseTo(A_true, 0.8);
    expect(result.B).toBeCloseTo(B_true, 0.8);
    expect(result.anchorCount).toBe(8);
    expect(result.method).toBe("STOCKING_LORD");
  });

  it("returns finite criterion", () => {
    const anchors = makeAnchorItems(5, 1, 0);
    const result = computeLinkingConstants(anchors);
    expect(Number.isFinite(result.criterion)).toBe(true);
  });

  it("diagnostics have rmsd and maxDiscrepancy", () => {
    const anchors = makeAnchorItems(5, 1, 0);
    const result = computeLinkingConstants(anchors);
    expect(result.diagnostics).toHaveProperty("rmsd");
    expect(result.diagnostics).toHaveProperty("maxDiscrepancy");
    expect(result.diagnostics.rmsd).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.maxDiscrepancy).toBeGreaterThanOrEqual(0);
  });
});

// ─── computeLinkingConstants (Haebara) ────────────────────────────────────────

describe("computeLinkingConstants — Haebara", () => {
  it("recovers identity transform", () => {
    const anchors: AnchorItem[] = makeAnchorItems(5, 1, 0).map(a => ({
      ...a,
      paramsOld: { ...a.paramsNew },
    }));
    const result = computeLinkingConstants(anchors, "HAEBARA");
    expect(result.A).toBeCloseTo(1, 1);
    expect(result.B).toBeCloseTo(0, 1);
    expect(result.method).toBe("HAEBARA");
  });

  it("recovers known transform to acceptable accuracy", () => {
    const anchors = makeAnchorItems(8, 1.1, -0.2);
    const result = computeLinkingConstants(anchors, "HAEBARA");
    expect(result.A).toBeCloseTo(1.1, 0.8);
    expect(result.B).toBeCloseTo(-0.2, 0.8);
  });
});

// ─── linkItemBank ─────────────────────────────────────────────────────────────

describe("linkItemBank", () => {
  const items = [
    { itemId: "x1", params: { a: 1.0, b: 0.0, c: 0.20 } },
    { itemId: "x2", params: { a: 1.5, b: 1.0, c: 0.25 } },
  ];

  it("returns array of same length", () => {
    const linked = linkItemBank(items, 1.2, 0.3);
    expect(linked).toHaveLength(2);
  });

  it("adds linkedParams to each item", () => {
    const linked = linkItemBank(items, 1.2, 0.3);
    for (const item of linked) {
      expect(item).toHaveProperty("linkedParams");
      expect(item.linkedParams).toHaveProperty("a");
      expect(item.linkedParams).toHaveProperty("b");
      expect(item.linkedParams).toHaveProperty("c");
    }
  });

  it("identity transform leaves params unchanged", () => {
    const linked = linkItemBank(items, 1, 0);
    for (let i = 0; i < items.length; i++) {
      expect(linked[i].linkedParams.a).toBeCloseTo(items[i].params.a, 8);
      expect(linked[i].linkedParams.b).toBeCloseTo(items[i].params.b, 8);
    }
  });

  it("probability curves are preserved post-linking", () => {
    // After applying linking constants and transforming theta accordingly,
    // P(θ_new; params_linked) ≈ P(θ_old; params_old)
    const A = 1.2, B = 0.3;
    const linked = linkItemBank(items, A, B);
    const thetaOld = 0.5;
    const thetaNew = transformTheta(thetaOld, A, B);

    for (let i = 0; i < items.length; i++) {
      const pOld = probability(thetaOld, items[i].params);
      const pNew = probability(thetaNew, linked[i].linkedParams);
      expect(Math.abs(pOld - pNew)).toBeLessThan(0.01);
    }
  });
});
