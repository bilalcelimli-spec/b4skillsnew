/**
 * Exposure-balanced pretest item selection.
 *
 * Pretest items are unscored, so which one a candidate sees has no effect on
 * their theta. Choosing the nearest-b item every time sends all pretest
 * traffic to the same few items; this spreads it so each item reaches the
 * sample size needed for calibration sooner.
 *
 *  1. Keep items whose b is within PRETEST_B_BAND of theta (informative enough).
 *     If none qualify, fall back to the few nearest by b.
 *  2. Among those, take the least-exposed item.
 *  3. Break ties by closeness of b to theta, then by id for determinism.
 */

import type { Item } from "./types.js";

export const PRETEST_B_BAND = 1.0;
const FALLBACK_NEAREST = 5;

export function selectPretestItem(pool: Item[], theta: number): Item | null {
  if (pool.length === 0) return null;

  const withDist = pool.map((item) => ({
    item,
    dist: Math.abs(item.params.b - theta),
    exposure: (item as Item & { exposureCount?: number }).exposureCount ?? 0,
  }));

  let candidates = withDist.filter((c) => c.dist <= PRETEST_B_BAND);
  if (candidates.length === 0) {
    candidates = [...withDist].sort((a, b) => a.dist - b.dist).slice(0, FALLBACK_NEAREST);
  }

  candidates.sort((a, b) => a.exposure - b.exposure || a.dist - b.dist || a.item.id.localeCompare(b.item.id));
  return candidates[0].item;
}
