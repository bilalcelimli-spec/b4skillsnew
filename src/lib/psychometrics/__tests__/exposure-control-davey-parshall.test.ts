/**
 * Davey-Parshall Exposure Control — Unit Tests
 *
 * Tests the conditional multinomial exposure algorithm:
 * - thetaToStratumDp: θ → stratum mapping
 * - fisherInfo3pl: Fisher information computation
 * - acceptItem: probabilistic α-gate
 * - selectItemDaveyParshall: full selection with exposure control
 * - recordSelection + updateAlphas: convergence toward k_max
 * - computeExposureDiagnostics: audit reporting
 * - serialize/deserialize: store persistence
 */

import { describe, it, expect } from "vitest";
import {
  thetaToStratumDp,
  fisherInfo3pl,
  selectItemDaveyParshall,
  recordSelection,
  updateAlphas,
  maybeUpdateAlphas,
  computeExposureDiagnostics,
  createExposureStore,
  serializeExposureStore,
  deserializeExposureStore,
  NUM_STRATA,
  DEFAULT_K_MAX,
  UPDATE_INTERVAL,
} from "../../selection/exposure-control-davey-parshall.js";
import { SkillType } from "../../assessment-engine/types.js";
import type { Item } from "../../assessment-engine/types.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeItem(id: string, a: number, b: number, c = 0.25): Item {
  return { id, skill: SkillType.READING, params: { a, b, c } };
}

const ITEMS: Item[] = [
  makeItem("item-easy",   1.2, -2.0),
  makeItem("item-medium", 1.2,  0.0),
  makeItem("item-hard",   1.2,  2.0),
  makeItem("item-low-disc", 0.5, 0.0), // low discrimination
  makeItem("item-high-disc", 2.0, 0.0), // high discrimination → highest info at θ=0
];

// ─── thetaToStratumDp ─────────────────────────────────────────────────────────

describe("thetaToStratumDp", () => {
  it("returns value in [0, NUM_STRATA-1]", () => {
    for (const theta of [-5, -3, -1, 0, 1, 3, 5]) {
      const s = thetaToStratumDp(theta);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(NUM_STRATA);
    }
  });

  it("very low theta → stratum 0", () => {
    expect(thetaToStratumDp(-10)).toBe(0);
  });

  it("very high theta → stratum NUM_STRATA-1", () => {
    expect(thetaToStratumDp(10)).toBe(NUM_STRATA - 1);
  });

  it("theta=0 maps to a middle stratum", () => {
    const s = thetaToStratumDp(0);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(NUM_STRATA - 1);
  });

  it("handles non-finite theta", () => {
    expect(() => thetaToStratumDp(NaN)).not.toThrow();
    expect(() => thetaToStratumDp(Infinity)).not.toThrow();
  });

  it("stratum is monotone in theta", () => {
    const thetas = [-4, -2, 0, 2, 4];
    const strata = thetas.map(thetaToStratumDp);
    for (let i = 1; i < strata.length; i++) {
      expect(strata[i]).toBeGreaterThanOrEqual(strata[i - 1]);
    }
  });
});

// ─── fisherInfo3pl ────────────────────────────────────────────────────────────

describe("fisherInfo3pl", () => {
  it("returns non-negative value", () => {
    for (const item of ITEMS) {
      expect(fisherInfo3pl(0, item.params)).toBeGreaterThanOrEqual(0);
    }
  });

  it("information is maximized near item difficulty", () => {
    const params = { a: 1.2, b: 0.5, c: 0.25 };
    const infoAtB = fisherInfo3pl(0.5, params);
    const infoFar = fisherInfo3pl(3.0, params);
    expect(infoAtB).toBeGreaterThan(infoFar);
  });

  it("higher discrimination → more information at b", () => {
    const lowDisc = fisherInfo3pl(0, { a: 0.5, b: 0.0, c: 0.25 });
    const highDisc = fisherInfo3pl(0, { a: 2.0, b: 0.0, c: 0.25 });
    expect(highDisc).toBeGreaterThan(lowDisc);
  });

  it("information is finite", () => {
    for (const theta of [-3, 0, 3]) {
      expect(Number.isFinite(fisherInfo3pl(theta, { a: 1.2, b: 0.0, c: 0.25 }))).toBe(true);
    }
  });
});

// ─── selectItemDaveyParshall ──────────────────────────────────────────────────

describe("selectItemDaveyParshall", () => {
  it("returns an item from the candidate pool", () => {
    const store = createExposureStore();
    const selected = selectItemDaveyParshall(ITEMS, 0.0, { store });
    expect(selected).not.toBeNull();
    expect(ITEMS.map(i => i.id)).toContain(selected!.id);
  });

  it("returns null for empty candidates", () => {
    const store = createExposureStore();
    expect(selectItemDaveyParshall([], 0.0, { store })).toBeNull();
  });

  it("never selects an already-used item", () => {
    const store = createExposureStore();
    const usedIds = new Set(["item-easy", "item-medium", "item-hard", "item-low-disc"]);
    const selected = selectItemDaveyParshall(ITEMS, 0.0, { store }, usedIds);
    expect(selected).not.toBeNull();
    expect(selected!.id).toBe("item-high-disc");
  });

  it("selects highest-info item when all α=1.0 (no rejection)", () => {
    const store = createExposureStore();
    // Force rng to always return 0 (always accept — no α rejection)
    const alwaysAccept = () => 0;
    const selected = selectItemDaveyParshall(ITEMS, 0.0, { store }, undefined, alwaysAccept);
    // At θ=0, item-high-disc (a=2.0, b=0) should have highest info
    expect(selected!.id).toBe("item-high-disc");
  });

  it("falls back to best-info item when all rejected by α-gate", () => {
    const store = createExposureStore();
    // Set all alphas to 0 — all items will be rejected
    for (const item of ITEMS) {
      const rec = (store.records.set(item.id, {
        itemId: item.id,
        strata: Array.from({ length: NUM_STRATA }, () => ({
          selected: 100,
          totalSessions: 200,
          alpha: 0.0001, // effectively 0
        })),
      }), store.records.get(item.id)!);
    }
    const alwaysReject = () => 1; // rng=1 always > any α
    const selected = selectItemDaveyParshall(ITEMS, 0.0, { store }, undefined, alwaysReject);
    // Fallback to global best — should still return something
    expect(selected).not.toBeNull();
  });
});

// ─── recordSelection + updateAlphas ──────────────────────────────────────────

describe("recordSelection + updateAlphas", () => {
  it("increments selection count for selected item", () => {
    const store = createExposureStore();
    recordSelection(store, "item-medium", 3, ["item-easy", "item-medium", "item-hard"]);
    const rec = store.records.get("item-medium");
    expect(rec?.strata[3].selected).toBe(1);
  });

  it("increments totalSessions for all candidates", () => {
    const store = createExposureStore();
    recordSelection(store, "item-medium", 3, ["item-easy", "item-medium"]);
    expect(store.records.get("item-easy")?.strata[3].totalSessions).toBe(1);
    expect(store.records.get("item-medium")?.strata[3].totalSessions).toBe(1);
  });

  it("updateAlphas reduces α for over-exposed items", () => {
    const store = createExposureStore();
    const stratum = 3;
    // Simulate item-medium selected 50/100 sessions → rate=0.50 > k_max=0.20
    recordSelection(store, "item-medium", stratum, ["item-medium"]);
    const rec = store.records.get("item-medium")!;
    rec.strata[stratum].selected = 50;
    rec.strata[stratum].totalSessions = 100;
    rec.strata[stratum].alpha = 1.0;

    updateAlphas(store, 0.20);
    expect(rec.strata[stratum].alpha).toBeLessThan(1.0);
    expect(rec.strata[stratum].alpha).toBeCloseTo(0.40, 1); // 1.0 × 0.20/0.50 = 0.40
  });

  it("updateAlphas boosts α for under-utilized items", () => {
    const store = createExposureStore();
    const stratum = 3;
    // Simulate item selected rarely: 1/100 → rate=0.01 < K_LOWER=0.05
    recordSelection(store, "item-easy", stratum, ["item-easy"]);
    const rec = store.records.get("item-easy")!;
    rec.strata[stratum].selected = 1;
    rec.strata[stratum].totalSessions = 100;
    rec.strata[stratum].alpha = 0.10;

    updateAlphas(store, 0.20);
    expect(rec.strata[stratum].alpha).toBeGreaterThan(0.10); // boosted
  });

  it("alpha never exceeds 1.0 after boost", () => {
    const store = createExposureStore();
    const stratum = 2;
    recordSelection(store, "item-easy", stratum, ["item-easy"]);
    const rec = store.records.get("item-easy")!;
    rec.strata[stratum].selected = 1;
    rec.strata[stratum].totalSessions = 200;
    rec.strata[stratum].alpha = 0.99; // near max

    updateAlphas(store, 0.20);
    expect(rec.strata[stratum].alpha).toBeLessThanOrEqual(1.0);
  });
});

// ─── maybeUpdateAlphas ────────────────────────────────────────────────────────

describe("maybeUpdateAlphas", () => {
  it("returns false before UPDATE_INTERVAL sessions", () => {
    const store = createExposureStore();
    store.sessionsSinceLastUpdate = UPDATE_INTERVAL - 1;
    expect(maybeUpdateAlphas(store)).toBe(false);
  });

  it("returns true and resets counter at UPDATE_INTERVAL", () => {
    const store = createExposureStore();
    store.sessionsSinceLastUpdate = UPDATE_INTERVAL;
    const updated = maybeUpdateAlphas(store);
    expect(updated).toBe(true);
    expect(store.sessionsSinceLastUpdate).toBe(0);
  });
});

// ─── computeExposureDiagnostics ───────────────────────────────────────────────

describe("computeExposureDiagnostics", () => {
  it("returns totalItems = number of tracked items", () => {
    const store = createExposureStore();
    recordSelection(store, "item-a", 3, ["item-a", "item-b"]);
    recordSelection(store, "item-a", 3, ["item-a", "item-b"]);
    const diag = computeExposureDiagnostics(store);
    expect(diag.totalItems).toBe(2);
  });

  it("convergenceScore is in [0, 1]", () => {
    const store = createExposureStore();
    const diag = computeExposureDiagnostics(store);
    expect(diag.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(diag.convergenceScore).toBeLessThanOrEqual(1);
  });

  it("overExposedItems contains items above k_max", () => {
    const store = createExposureStore();
    // Manually insert over-exposed item
    store.records.set("item-x", {
      itemId: "item-x",
      strata: Array.from({ length: NUM_STRATA }, (_, s) => ({
        selected: s === 3 ? 30 : 0,
        totalSessions: s === 3 ? 100 : 0,
        alpha: 1.0,
      })),
    });
    const diag = computeExposureDiagnostics(store, 0.20);
    expect(diag.overExposedItems.some(o => o.itemId === "item-x")).toBe(true);
    expect(diag.maxExposureRate).toBeGreaterThan(0.20);
  });
});

// ─── Serialize / Deserialize ──────────────────────────────────────────────────

describe("serializeExposureStore / deserializeExposureStore", () => {
  it("round-trips without data loss", () => {
    const store = createExposureStore();
    recordSelection(store, "item-round-trip", 2, ["item-round-trip"]);

    const serialized = serializeExposureStore(store);
    const restored = deserializeExposureStore(serialized);

    expect(restored.records.has("item-round-trip")).toBe(true);
    expect(restored.records.get("item-round-trip")?.strata[2].selected).toBe(1);
    expect(restored.stratumSessionCounts).toEqual(store.stratumSessionCounts);
  });

  it("serialized form is JSON-serializable", () => {
    const store = createExposureStore();
    recordSelection(store, "item-json", 0, ["item-json"]);
    const serialized = serializeExposureStore(store);
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });

  it("deserializing empty store works", () => {
    const store = createExposureStore();
    const serialized = serializeExposureStore(store);
    const restored = deserializeExposureStore(serialized);
    expect(restored.records.size).toBe(0);
  });
});
