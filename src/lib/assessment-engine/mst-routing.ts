import type { Item, MstRouteKey, Response } from "./types";

/** Default three-stage MST panel: 1 + 2 + 3 operational items (= 6). */
export const MST_PANEL_1_2_3: readonly [number, number, number] = [1, 2, 3];

/**
 * Count operational (non-pretest) responses.
 */
export function operationalResponseCount(responses: Response[]): number {
  return responses.filter((r) => !r.isPretest).length;
}

/**
 * Given cumulative operational count, return position inside the MST structure.
 * When all modules are satisfied, `mstComplete` is true and `moduleIndex` is `moduleSizes.length`.
 */
export function getMstModulePosition(
  operationalCount: number,
  moduleSizes: readonly number[]
): {
  moduleIndex: number;
  indexWithinModule: number;
  sizeThisModule: number;
  mstComplete: boolean;
} {
  if (moduleSizes.length === 0) {
    return { moduleIndex: 0, indexWithinModule: 0, sizeThisModule: 0, mstComplete: true };
  }
  let remaining = operationalCount;
  for (let m = 0; m < moduleSizes.length; m++) {
    const size = moduleSizes[m];
    if (remaining < size) {
      return {
        moduleIndex: m,
        indexWithinModule: remaining,
        sizeThisModule: size,
        mstComplete: false,
      };
    }
    remaining -= size;
  }
  return {
    moduleIndex: moduleSizes.length,
    indexWithinModule: 0,
    sizeThisModule: 0,
    mstComplete: true,
  };
}

export function mstTotalOperationalItems(moduleSizes: readonly number[]): number {
  return moduleSizes.reduce((a, b) => a + b, 0);
}

/**
 * Items may declare `metadata.mstModule` (0-based) to pin them to a module.
 * If no item matches, returns the unfiltered pool so tests/production do not hard-fail
 * when the bank is not yet tagged.
 */
export function filterPoolByMstModule(
  pool: Item[],
  moduleIndex: number
): { filtered: Item[]; usedStrictPool: boolean } {
  const tagged = pool.filter((item) => (item.metadata as { mstModule?: number } | undefined)?.mstModule === moduleIndex);
  if (tagged.length > 0) {
    return { filtered: tagged, usedStrictPool: true };
  }
  return { filtered: pool, usedStrictPool: false };
}

/** θ < lowMax → low; θ < midMax → mid; else high. */
export function routeKeyFromTheta(theta: number, lowMaxTheta: number, midMaxTheta: number): MstRouteKey {
  if (theta < lowMaxTheta) return "low";
  if (theta < midMaxTheta) return "mid";
  return "high";
}

/**
 * After module 0, optionally narrow by `metadata.mstRoute` (must match `mstRouteKey`).
 * If no items have `mstRoute`, keep module-only filter.
 */
export function filterPoolByMstRoute(
  pool: Item[],
  moduleIndex: number,
  routeKey: MstRouteKey | undefined
): Item[] {
  if (moduleIndex === 0 || !routeKey) {
    return pool;
  }
  const routed = pool.filter(
    (item) => (item.metadata as { mstRoute?: string } | undefined)?.mstRoute === routeKey
  );
  return routed.length > 0 ? routed : pool;
}
