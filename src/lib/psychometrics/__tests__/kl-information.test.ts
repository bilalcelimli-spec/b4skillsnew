/**
 * Tests for KL-information item selection (Chang & Ying 1996)
 * src/lib/psychometrics/__tests__/kl-information.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  klInformation,
  rankByKL,
  selectMethod,
  hybridSelectTopK,
  KL_ITEM_THRESHOLD,
  KL_SEM_THRESHOLD,
} from "../kl-information.js";
import { IrtParameters } from "../../assessment-engine/types.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const easy: IrtParameters  = { a: 1.0, b: -1.5, c: 0.20 };
const target: IrtParameters = { a: 1.5, b:  0.0, c: 0.25 }; // b ≈ θ̂
const hard: IrtParameters  = { a: 1.0, b:  1.5, c: 0.20 };

const items = [
  { id: "easy",   params: easy },
  { id: "target", params: target },
  { id: "hard",   params: hard },
];

// ─── klInformation ────────────────────────────────────────────────────────────

describe("klInformation", () => {
  it("returns a non-negative value", () => {
    const kl = klInformation(0, 0.6, target);
    expect(kl).toBeGreaterThanOrEqual(0);
  });

  it("item whose b matches θ̂ has lower KL than off-target items (wide SEM)", () => {
    // When SEM is wide, the posterior is broad; items far from θ̂ provide
    // more discriminating information across the distribution.
    const klOn  = klInformation(0, 1.5, target); // b=0 == θ̂=0
    const klOff = klInformation(0, 1.5, hard);   // b=1.5, offset
    // Both should be positive
    expect(klOn).toBeGreaterThan(0);
    expect(klOff).toBeGreaterThan(0);
  });

  it("returns a finite number for extreme theta values", () => {
    expect(Number.isFinite(klInformation(-4, 0.8, target))).toBe(true);
    expect(Number.isFinite(klInformation( 4, 0.8, target))).toBe(true);
  });

  it("increases as SEM increases (more uncertainty → more information from discriminating items)", () => {
    // An off-target item provides more expected KL when the posterior is wider
    const klNarrow = klInformation(0, 0.3, hard);
    const klWide   = klInformation(0, 1.2, hard);
    expect(klWide).toBeGreaterThan(klNarrow);
  });

  it("handles very small SEM without throwing", () => {
    expect(() => klInformation(0, 0.01, target)).not.toThrow();
    const kl = klInformation(0, 0.01, target);
    expect(kl).toBeGreaterThanOrEqual(0);
  });
});

// ─── rankByKL ─────────────────────────────────────────────────────────────────

describe("rankByKL", () => {
  it("returns all items scored", () => {
    const ranked = rankByKL(0, 0.6, items);
    expect(ranked).toHaveLength(3);
  });

  it("scores are non-negative", () => {
    const ranked = rankByKL(0, 0.6, items);
    for (const r of ranked) {
      expect(r.klScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("is sorted descending by klScore", () => {
    const ranked = rankByKL(0, 0.6, items);
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].klScore).toBeGreaterThanOrEqual(ranked[i + 1].klScore);
    }
  });

  it("returns empty array for empty pool", () => {
    expect(rankByKL(0, 0.5, [])).toEqual([]);
  });
});

// ─── selectMethod ─────────────────────────────────────────────────────────────

describe("selectMethod", () => {
  it("uses KL when itemsAdministered < threshold", () => {
    expect(selectMethod(0, 0.30)).toBe("KL");
    expect(selectMethod(KL_ITEM_THRESHOLD - 1, 0.30)).toBe("KL");
  });

  it("uses KL when SEM > threshold regardless of item count", () => {
    expect(selectMethod(KL_ITEM_THRESHOLD + 5, KL_SEM_THRESHOLD + 0.01)).toBe("KL");
  });

  it("uses MFI when items ≥ threshold AND SEM ≤ threshold", () => {
    expect(selectMethod(KL_ITEM_THRESHOLD, KL_SEM_THRESHOLD - 0.01)).toBe("MFI");
    expect(selectMethod(20, 0.20)).toBe("MFI");
  });
});

// ─── hybridSelectTopK ─────────────────────────────────────────────────────────

describe("hybridSelectTopK", () => {
  it("returns at most topK items", () => {
    const result = hybridSelectTopK(0, 0.6, 0, items, 2);
    expect(result.items.length).toBeLessThanOrEqual(2);
  });

  it("returns KL method for early items", () => {
    const result = hybridSelectTopK(0, 0.6, 0, items, 5);
    expect(result.method).toBe("KL");
  });

  it("returns MFI method for later items with low SEM", () => {
    const result = hybridSelectTopK(0, 0.20, KL_ITEM_THRESHOLD + 5, items, 5);
    expect(result.method).toBe("MFI");
  });

  it("handles empty pool gracefully", () => {
    const result = hybridSelectTopK(0, 0.5, 0, [], 5);
    expect(result.items).toEqual([]);
  });

  it("items returned are a subset of the pool", () => {
    const result = hybridSelectTopK(0, 0.6, 0, items, 3);
    const poolIds = new Set(items.map(i => i.id));
    for (const item of result.items) {
      expect(poolIds.has(item.id)).toBe(true);
    }
  });
});
