import { describe, expect, it } from "vitest";
import { alphaForRate, applyAlphaTable, extractAlphaTable, mergeAlphaTables, summarizeAlphaTable, type AlphaTable } from "../alpha-table";
import { createExposureStore, NUM_STRATA, recordSelection, updateAlphas } from "../exposure-control-davey-parshall";
import { leaseKey } from "../../jobs/job-lease";

const table = (profile: string, alphas: Record<string, number[]>, sessions: number[], source: AlphaTable["source"] = "observed"): AlphaTable =>
  ({ profile, kMax: 0.3, source, computedAt: "2026-10-30T00:00:00.000Z", stratumSessions: sessions, alphas });

describe("alpha tables", () => {
  it("alphaForRate mirrors the Davey–Parshall update from α = 1", () => {
    expect(alphaForRate(0.1, 0.3)).toBe(1);
    expect(alphaForRate(0.3, 0.3)).toBe(1);
    expect(alphaForRate(0.6, 0.3)).toBeCloseTo(0.5, 6);
    expect(alphaForRate(100, 0.3)).toBe(0.01);
  });

  it("extracts only gated items and applies min(current, table) with session counts", () => {
    const store = createExposureStore();
    for (let s = 0; s < 60; s++) recordSelection(store, "hot", 3, ["hot", "cool"], `s${s}`);
    updateAlphas(store, 0.3);
    const extracted = extractAlphaTable(store, "General English", 0.3, "simulated");
    expect(Object.keys(extracted.alphas)).toEqual(["hot"]);
    expect(extracted.alphas.hot![3]).toBeLessThan(1);
    expect(extracted.stratumSessions[3]).toBe(60);

    const fresh = createExposureStore();
    const applied = applyAlphaTable(fresh, extracted);
    expect(applied).toBe(1);
    expect(fresh.records.get("hot")!.strata[3].alpha).toBeCloseTo(extracted.alphas.hot![3]!, 4);
    expect(fresh.stratumSessionCounts[3]).toBe(60);
    // never re-opens a gate the live process already closed
    fresh.records.get("hot")!.strata[3].alpha = 0.05;
    applyAlphaTable(fresh, extracted);
    expect(fresh.records.get("hot")!.strata[3].alpha).toBe(0.05);
  });

  it("merges observed over simulated where the stratum has enough real sessions", () => {
    const sessions = new Array(NUM_STRATA).fill(0);
    sessions[3] = 80; sessions[4] = 10;
    const observed = table("P", { a: [1, 1, 1, 0.4, 0.9, 1, 1] }, sessions);
    const simulated = table("P", { a: [1, 1, 1, 0.7, 0.5, 1, 1], b: [1, 1, 1, 0.6, 1, 1, 1] }, new Array(NUM_STRATA).fill(400), "simulated");
    const merged = mergeAlphaTables(observed, simulated)!;
    expect(merged.source).toBe("merged");
    expect(merged.alphas.a![3]).toBe(0.4); // observed wins (80 sessions)
    expect(merged.alphas.a![4]).toBe(0.5); // simulated fills (10 sessions)
    // b was never over-exposed in 80 real sessions of stratum 3: observed α = 1 beats the simulated gate
    expect(merged.alphas.b).toBeUndefined();
    expect(merged.stratumSessions[3]).toBe(400);
    expect(mergeAlphaTables(null, simulated)!.source).toBe("simulated");
    expect(mergeAlphaTables(observed, null)!.source).toBe("observed");
    expect(mergeAlphaTables(null, null)).toBeNull();
    expect(summarizeAlphaTable(merged)).toEqual({ items: 1, gatedCells: 2, minAlpha: 0.4 });
  });

  it("lease keys are stable 32-bit integers", () => {
    expect(leaseKey("pretest-calibration")).toBe(leaseKey("pretest-calibration"));
    expect(leaseKey("pretest-calibration")).not.toBe(leaseKey("exposure-auto-retire"));
    expect(Number.isInteger(leaseKey("x"))).toBe(true);
    expect(Math.abs(leaseKey("x"))).toBeLessThan(2 ** 31);
  });
});
