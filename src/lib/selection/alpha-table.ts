/**
 * Davey–Parshall α tables — the shareable, pre-warmed part of exposure control
 * (roadmap Faz 5).
 *
 * The in-process DP store learns acceptance probabilities α(item, θ-stratum)
 * from the sessions it sees. That knowledge used to die with the process and
 * was never shared between instances, so every restart (and every instance)
 * began with α = 1 for all items — the first dozens of candidates saw the same
 * top-information items. An α table is a snapshot of those probabilities:
 *
 *   - `observed`  computed by scripts/jobs/exposure-alpha-table.ts from real
 *                 responses (sessions in each θ stratum that saw each item)
 *   - `simulated` extracted from a simulation-harness run on the bank
 *                 (Davey & Parshall's original pre-simulation design)
 *   - `merged`    observed where a stratum has enough sessions, simulated otherwise
 *
 * Tables live in the SystemConfig row `dp-alpha-tables` (one per profile,
 * because k_max differs by profile), are loaded when a profile's selector is
 * first created and refreshed every ALPHA_TABLE_TTL_MS. Live traffic keeps
 * refining α on top of the loaded table.
 */

import {
  NUM_STRATA,
  type ExposureStore as DPExposureStore,
} from "./exposure-control-davey-parshall.js";

export const ALPHA_TABLE_CONFIG_ID = "dp-alpha-tables";
export const ALPHA_TABLE_TTL_MS = 10 * 60 * 1000;
/** Sessions a stratum needs before its observed rates override simulated ones. */
export const ALPHA_OBSERVED_MIN_SESSIONS = 50;
const ALPHA_MIN = 0.01;

export interface AlphaTable {
  profile: string;
  kMax: number;
  source: "observed" | "simulated" | "merged";
  computedAt: string;
  /** Sessions per stratum behind the table (observed/merged). */
  stratumSessions: number[];
  /** itemId → α per stratum (length NUM_STRATA). Items absent default to α = 1. */
  alphas: Record<string, number[]>;
}

export type AlphaTables = Record<string, AlphaTable>;

/** α for an observed exposure rate under k_max (same rule as updateAlphas, from α = 1). */
export function alphaForRate(rate: number, kMax: number): number {
  if (!(rate > kMax)) return 1;
  return Math.max(ALPHA_MIN, kMax / rate);
}

/** Snapshot the α values (and stratum session counts) of a DP store. */
export function extractAlphaTable(
  store: DPExposureStore,
  profile: string,
  kMax: number,
  source: AlphaTable["source"],
): AlphaTable {
  const alphas: Record<string, number[]> = {};
  for (const [itemId, record] of store.records) {
    const row = record.strata.map((s) => Number(s.alpha.toFixed(4)));
    if (row.some((a) => a < 1)) alphas[itemId] = row;
  }
  return {
    profile,
    kMax,
    source,
    computedAt: new Date().toISOString(),
    stratumSessions: [...store.stratumSessionCounts],
    alphas,
  };
}

/**
 * Apply a table to a store: each listed item's α becomes min(current, table)
 * so a loaded table never re-opens a gate the live process has already closed.
 * Stratum session counts are raised to the table's so the first α update does
 * not treat the pre-warmed strata as unobserved.
 */
export function applyAlphaTable(store: DPExposureStore, table: AlphaTable): number {
  let applied = 0;
  for (const [itemId, row] of Object.entries(table.alphas)) {
    let record = store.records.get(itemId);
    if (!record) {
      record = { itemId, strata: Array.from({ length: NUM_STRATA }, () => ({ selected: 0, totalSessions: 0, alpha: 1 })) };
      store.records.set(itemId, record);
    }
    for (let s = 0; s < NUM_STRATA; s++) {
      const alpha = row[s];
      if (typeof alpha === "number" && Number.isFinite(alpha) && alpha > 0 && alpha < record.strata[s]!.alpha) {
        record.strata[s]!.alpha = Math.max(ALPHA_MIN, alpha);
        applied++;
      }
    }
  }
  for (let s = 0; s < NUM_STRATA; s++) {
    const sessions = table.stratumSessions[s] ?? 0;
    if (sessions > (store.stratumSessionCounts[s] ?? 0)) store.stratumSessionCounts[s] = sessions;
  }
  return applied;
}

/**
 * Merge an observed table with a simulated one: observed α wins in strata with
 * at least `minSessions` real sessions; simulated α fills the rest.
 */
export function mergeAlphaTables(
  observed: AlphaTable | null,
  simulated: AlphaTable | null,
  minSessions = ALPHA_OBSERVED_MIN_SESSIONS,
): AlphaTable | null {
  if (!observed && !simulated) return null;
  if (!observed) return { ...simulated!, source: "simulated" };
  if (!simulated) return { ...observed, source: "observed" };
  const alphas: Record<string, number[]> = {};
  const items = new Set([...Object.keys(observed.alphas), ...Object.keys(simulated.alphas)]);
  for (const itemId of items) {
    const row: number[] = [];
    for (let s = 0; s < NUM_STRATA; s++) {
      const trustObserved = (observed.stratumSessions[s] ?? 0) >= minSessions;
      const o = observed.alphas[itemId]?.[s] ?? 1;
      const sim = simulated.alphas[itemId]?.[s] ?? 1;
      row.push(trustObserved ? o : sim);
    }
    if (row.some((a) => a < 1)) alphas[itemId] = row;
  }
  return {
    profile: observed.profile,
    kMax: observed.kMax,
    source: "merged",
    computedAt: new Date().toISOString(),
    stratumSessions: observed.stratumSessions.map((n, s) => Math.max(n, simulated.stratumSessions[s] ?? 0)),
    alphas,
  };
}

/** Compact summary for logs and reports. */
export function summarizeAlphaTable(table: AlphaTable): { items: number; gatedCells: number; minAlpha: number } {
  let gated = 0;
  let min = 1;
  for (const row of Object.values(table.alphas)) {
    for (const a of row) {
      if (a < 1) { gated++; min = Math.min(min, a); }
    }
  }
  return { items: Object.keys(table.alphas).length, gatedCells: gated, minAlpha: Number(min.toFixed(4)) };
}
