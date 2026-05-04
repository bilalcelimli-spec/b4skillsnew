/**
 * Alpha-Stratified Item Bank Rotation
 *
 * Implements Chang & Ying (1999) α-stratification as a complement to
 * the existing Sympson-Hetter exposure control. Items are sorted into
 * α-strata (bands of discrimination) and administered in increasing-α
 * order across the test, so that:
 *
 *  - Early items (low a) contribute coarse ability estimates.
 *  - Late items (high a, near θ) maximise Fisher information for the
 *    refined estimate.
 *
 * This naturally spreads exposure across the item pool without a hard
 * cap: items in the lower strata serve early in many sessions while
 * high-α items compete only near the θ sweet spot.
 *
 * Integration
 * ────────────
 * This module is a *filter / scorer* applied on top of the existing
 * selectNextItem() and shadow-test pipeline. It does NOT replace those;
 * it adds an item-pool pre-filter and a stratum-bonus to the information
 * criterion so the engine naturally follows α-stratification.
 *
 * Usage
 * ──────
 * 1. Call buildAlphaStrata(items, nStrata) once per engine initialisation.
 * 2. Before each item selection call alphaStratifiedFilter(pool, state, strata)
 *    to obtain the candidate pool restricted to the current stratum.
 * 3. Proceed with MFI / shadow test on the filtered pool.
 *
 * References
 * ──────────
 * Chang & Ying (1999) — A-stratified multistage computerized adaptive testing
 * Chang, Qian & Ying (2001) — A-stratified multistage CAT with b blocking
 * van der Linden (2010) — Constrained adaptive testing with shadow tests
 */

import { Item } from "../assessment-engine/types.js";
import { information } from "../assessment-engine/irt.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlphaStratum {
  index: number;       // 0-based stratum index (0 = lowest α)
  minA: number;
  maxA: number;
  itemIds: Set<string>;
}

export interface AlphaStrata {
  nStrata: number;
  strata: AlphaStratum[];
  /** Map from itemId to stratum index */
  itemStratumMap: Map<string, number>;
}

export interface StratumSelectionContext {
  /** Number of operational items already administered */
  nAdministered: number;
  /** Total target test length (operational items only) */
  targetLength: number;
  /** Current θ estimate */
  theta: number;
  /** Already-used item IDs */
  usedItemIds: Set<string>;
}

// ─── Core algorithm ───────────────────────────────────────────────────────────

/**
 * Build α-strata from an item pool.
 * Items are sorted by discrimination (a), divided into nStrata equal-size bands.
 */
export function buildAlphaStrata(
  items: Item[],
  nStrata = 4
): AlphaStrata {
  if (items.length === 0) {
    return { nStrata, strata: [], itemStratumMap: new Map() };
  }

  // Sort by a-parameter ascending
  const sorted = [...items].sort((x, y) => x.params.a - y.params.a);
  const perStratum = Math.ceil(sorted.length / nStrata);

  const strata: AlphaStratum[] = [];
  const itemStratumMap = new Map<string, number>();

  for (let s = 0; s < nStrata; s++) {
    const slice = sorted.slice(s * perStratum, (s + 1) * perStratum);
    const aValues = slice.map((it) => it.params.a);
    const stratum: AlphaStratum = {
      index: s,
      minA: Math.min(...aValues),
      maxA: Math.max(...aValues),
      itemIds: new Set(slice.map((it) => it.id)),
    };
    strata.push(stratum);
    for (const it of slice) {
      itemStratumMap.set(it.id, s);
    }
  }

  return { nStrata, strata, itemStratumMap };
}

/**
 * Determine which stratum should be used at the current point in the test.
 *
 * With 4 strata and 30 items:
 *   items 0–7   → stratum 0 (low α)
 *   items 8–15  → stratum 1
 *   items 16–22 → stratum 2
 *   items 23–29 → stratum 3 (high α)
 */
export function currentStratum(
  nAdministered: number,
  targetLength: number,
  nStrata: number
): number {
  const progress = nAdministered / Math.max(1, targetLength);
  return Math.min(nStrata - 1, Math.floor(progress * nStrata));
}

/**
 * Filter an item pool to the current α-stratum.
 * Falls back to the full (non-used) pool if the current stratum has
 * fewer than minPoolSize eligible items — this prevents deadlock near
 * end of test.
 *
 * @param pool        Full candidate item pool (eligible, non-used)
 * @param ctx         Current session context
 * @param strata      Pre-built α-strata
 * @param minPoolSize Minimum eligible pool size before expanding to adjacent strata
 */
export function alphaStratifiedFilter(
  pool: Item[],
  ctx: StratumSelectionContext,
  strata: AlphaStrata,
  minPoolSize = 5
): Item[] {
  if (strata.nStrata === 0 || pool.length === 0) return pool;

  const eligiblePool = pool.filter((it) => !ctx.usedItemIds.has(it.id));
  const targetStratum = currentStratum(ctx.nAdministered, ctx.targetLength, strata.nStrata);

  // Start with target stratum, expand outward if needed
  const stratumFiltered = eligiblePool.filter((it) => {
    const s = strata.itemStratumMap.get(it.id);
    return s === targetStratum;
  });

  if (stratumFiltered.length >= minPoolSize) return stratumFiltered;

  // Expand: include adjacent strata
  for (let radius = 1; radius < strata.nStrata; radius++) {
    const expanded = eligiblePool.filter((it) => {
      const s = strata.itemStratumMap.get(it.id);
      return s !== undefined && Math.abs(s - targetStratum) <= radius;
    });
    if (expanded.length >= minPoolSize) return expanded;
  }

  return eligiblePool; // full fallback
}

/**
 * Score an item's suitability under the α-stratified scheme.
 * Returns a composite score = Fisher information at θ + stratum_bonus.
 *
 * The stratum_bonus rewards items in the current stratum, encouraging
 * the engine to prefer those items when breaking ties in MFI selection.
 */
export function alphaStratifiedScore(
  item: Item,
  theta: number,
  nAdministered: number,
  targetLength: number,
  strata: AlphaStrata,
  stratumBonusWeight = 0.1
): number {
  const baseInfo = information(theta, item.params);
  const targetSt = currentStratum(nAdministered, targetLength, strata.nStrata);
  const itemSt = strata.itemStratumMap.get(item.id) ?? -1;
  const bonus = itemSt === targetSt ? stratumBonusWeight * baseInfo : 0;
  return baseInfo + bonus;
}

// ─── Rotation stats ───────────────────────────────────────────────────────────

export interface StratumUsageStats {
  stratumIndex: number;
  totalItems: number;
  usedItems: number;
  usageRate: number;
}

/**
 * Compute per-stratum usage statistics from a set of administered item IDs.
 */
export function computeStratumUsage(
  administeredIds: string[],
  strata: AlphaStrata
): StratumUsageStats[] {
  return strata.strata.map((stratum) => {
    const total = stratum.itemIds.size;
    const used = administeredIds.filter((id) => stratum.itemIds.has(id)).length;
    return {
      stratumIndex: stratum.index,
      totalItems: total,
      usedItems: used,
      usageRate: total > 0 ? used / total : 0,
    };
  });
}
