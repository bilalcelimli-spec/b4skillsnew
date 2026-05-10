/**
 * Tests — answer-copying detection (Wollack ω, K-index, S2)
 * src/lib/psychometrics/test-security/__tests__/answer-copying.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  wollackOmega,
  kIndex,
  s2Statistic,
  detectAnswerCopying,
  ExamineeResponses,
  ItemMeta,
} from "../answer-copying.js";
import { probability } from "../../../assessment-engine/irt.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ITEMS: ItemMeta[] = [
  { itemId: "i01", params: { a: 1.2, b: -1.0, c: 0.20 } },
  { itemId: "i02", params: { a: 1.5, b:  0.0, c: 0.25 } },
  { itemId: "i03", params: { a: 1.0, b:  1.0, c: 0.20 } },
  { itemId: "i04", params: { a: 1.3, b: -0.5, c: 0.20 } },
  { itemId: "i05", params: { a: 0.8, b:  0.5, c: 0.20 } },
  { itemId: "i06", params: { a: 1.4, b: -0.2, c: 0.25 } },
  { itemId: "i07", params: { a: 1.1, b:  0.8, c: 0.20 } },
  { itemId: "i08", params: { a: 0.9, b: -1.5, c: 0.20 } },
  { itemId: "i09", params: { a: 1.6, b:  0.3, c: 0.25 } },
  { itemId: "i10", params: { a: 1.2, b: -0.8, c: 0.20 } },
];

/** Generate responses matching the true probability. */
function generateResponses(theta: number, items: ItemMeta[]): ExamineeResponses[] {
  return items.map((it, idx) => ({
    itemId: it.itemId,
    score: probability(theta, it.params) > 0.5 ? 1 : 0,
  }));
}

const SOURCE_THETA  = 0.5;
const COPIER_THETA  = -1.5; // low ability
const NEUTRAL_THETA = -1.5; // same ability but independent

const sourceResponses  = generateResponses(SOURCE_THETA,  ITEMS);
// Perfect copy: copier gives identical responses to source
const copierResponses  = [...sourceResponses] as ExamineeResponses[];
// Independent: neutral examinee with same low ability
const neutralResponses = generateResponses(NEUTRAL_THETA, ITEMS);

// ─── wollackOmega ─────────────────────────────────────────────────────────────

describe("wollackOmega", () => {
  it("returns a finite number", () => {
    const ω = wollackOmega(sourceResponses, copierResponses, COPIER_THETA, SOURCE_THETA, ITEMS);
    expect(Number.isFinite(ω)).toBe(true);
  });

  it("perfect copy produces positive ω (evidence of copying)", () => {
    const ω = wollackOmega(sourceResponses, copierResponses, COPIER_THETA, SOURCE_THETA, ITEMS);
    expect(ω).toBeGreaterThan(0);
  });

  it("independent examinee produces lower ω than copier", () => {
    const ωCopier  = wollackOmega(sourceResponses, copierResponses,  COPIER_THETA,  SOURCE_THETA, ITEMS);
    const ωNeutral = wollackOmega(sourceResponses, neutralResponses, NEUTRAL_THETA, SOURCE_THETA, ITEMS);
    expect(ωCopier).toBeGreaterThan(ωNeutral);
  });

  it("returns 0 when no shared items", () => {
    const ω = wollackOmega(sourceResponses, copierResponses, COPIER_THETA, SOURCE_THETA, []);
    expect(ω).toBe(0);
  });
});

// ─── kIndex ──────────────────────────────────────────────────────────────────

describe("kIndex", () => {
  it("returns non-negative count and valid p-value", () => {
    const { k, pValue, n } = kIndex(sourceResponses, copierResponses, COPIER_THETA, ITEMS);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(pValue).toBeGreaterThanOrEqual(0);
    expect(pValue).toBeLessThanOrEqual(1);
    expect(n).toBeGreaterThanOrEqual(0);
  });

  it("perfect copy has higher K than independent examinee", () => {
    const { k: kCopy } = kIndex(sourceResponses, copierResponses, COPIER_THETA, ITEMS);
    const { k: kInd  } = kIndex(sourceResponses, neutralResponses, NEUTRAL_THETA, ITEMS);
    expect(kCopy).toBeGreaterThanOrEqual(kInd);
  });

  it("handles empty item list", () => {
    const { k, n } = kIndex(sourceResponses, copierResponses, COPIER_THETA, []);
    expect(k).toBe(0);
    expect(n).toBe(0);
  });
});

// ─── s2Statistic ──────────────────────────────────────────────────────────────

describe("s2Statistic", () => {
  it("returns a finite number", () => {
    const s2 = s2Statistic(sourceResponses, copierResponses, SOURCE_THETA, COPIER_THETA, ITEMS);
    expect(Number.isFinite(s2)).toBe(true);
  });

  it("perfect copy produces higher S2 than independent examinee", () => {
    const s2Copy = s2Statistic(sourceResponses, copierResponses, SOURCE_THETA, COPIER_THETA, ITEMS);
    const s2Ind  = s2Statistic(sourceResponses, neutralResponses, SOURCE_THETA, NEUTRAL_THETA, ITEMS);
    expect(s2Copy).toBeGreaterThanOrEqual(s2Ind);
  });

  it("returns 0 for empty item list", () => {
    const s2 = s2Statistic(sourceResponses, copierResponses, SOURCE_THETA, COPIER_THETA, []);
    expect(s2).toBe(0);
  });
});

// ─── detectAnswerCopying ──────────────────────────────────────────────────────

describe("detectAnswerCopying", () => {
  it("returns correct structure", () => {
    const result = detectAnswerCopying(
      sourceResponses, copierResponses, SOURCE_THETA, COPIER_THETA, ITEMS
    );
    expect(result).toHaveProperty("omega");
    expect(result).toHaveProperty("kIndex");
    expect(result).toHaveProperty("kPValue");
    expect(result).toHaveProperty("s2");
    expect(result).toHaveProperty("sharedItems");
    expect(result).toHaveProperty("flagged");
    expect(result).toHaveProperty("triggers");
  });

  it("sharedItems matches ITEMS length when all items shared", () => {
    const result = detectAnswerCopying(
      sourceResponses, copierResponses, SOURCE_THETA, COPIER_THETA, ITEMS
    );
    expect(result.sharedItems).toBe(ITEMS.length);
  });

  it("independent examinee is NOT flagged (all statistics should be moderate)", () => {
    const result = detectAnswerCopying(
      sourceResponses, neutralResponses, SOURCE_THETA, NEUTRAL_THETA, ITEMS
    );
    // A truly independent examinee should not trigger ≥2 statistics
    // (may trigger 0 or 1 but not both ω and S2 simultaneously)
    expect(result.flagged).toBe(false);
  });

  it("triggers is an array", () => {
    const result = detectAnswerCopying(
      sourceResponses, copierResponses, SOURCE_THETA, COPIER_THETA, ITEMS
    );
    expect(Array.isArray(result.triggers)).toBe(true);
  });
});
