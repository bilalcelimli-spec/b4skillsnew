/**
 * Pretest item selection — "finish what you started".
 *
 * Pretest items are unscored, so which one a candidate sees has no effect on
 * their θ. What matters is how fast items reach the calibration thresholds
 * (calibration-policy.ts). Spreading traffic evenly over a large pretest pool
 * (the former least-exposed rule) makes every item arrive at n ≥ 80 at the same
 * late moment (roadmap F23: ≈2,560 sessions for 160 items at 5 pretests per
 * session). A focus set converts the same traffic into a steady stream of
 * calibrated items:
 *
 *  1. Keep items whose b is within PRETEST_B_BAND of θ (informative enough).
 *     If none qualify, fall back to the few nearest by b.
 *  2. "In progress" = 0 < exposure < publishMinN. While the in-band focus set
 *     (PRETEST_FOCUS_SET_SIZE items in progress) is not full and a fresh item
 *     exists, start the fresh item; otherwise finish the most-exposed item in
 *     progress. Items that already reached publishMinN are used last.
 *  3. Ties: closeness of b to θ, then id, for determinism.
 */

import { CALIBRATION_POLICY } from "../psychometrics/calibration-policy.js";
import type { Item } from "./types.js";

export const PRETEST_B_BAND = 1.0;
/** In-band items kept "in progress" at the same time (per θ band). */
export const PRETEST_FOCUS_SET_SIZE = 6;
const FALLBACK_NEAREST = 5;

export interface PretestSelectionOptions {
  focusSetSize?: number;
  /** Exposure at which an item is considered done (default: publish threshold). */
  targetN?: number;
}

type Scored = { item: Item; dist: number; exposure: number };

const byDistThenId = (a: Scored, b: Scored) => a.dist - b.dist || a.item.id.localeCompare(b.item.id);

export function selectPretestItem(pool: Item[], theta: number, options: PretestSelectionOptions = {}): Item | null {
  if (pool.length === 0) return null;
  const focusSetSize = options.focusSetSize ?? PRETEST_FOCUS_SET_SIZE;
  const targetN = options.targetN ?? CALIBRATION_POLICY.publishMinN;

  const withDist: Scored[] = pool.map((item) => ({
    item,
    dist: Math.abs(item.params.b - theta),
    exposure: (item as Item & { exposureCount?: number }).exposureCount ?? 0,
  }));

  let candidates = withDist.filter((c) => c.dist <= PRETEST_B_BAND);
  if (candidates.length === 0) {
    candidates = [...withDist].sort(byDistThenId).slice(0, FALLBACK_NEAREST);
  }

  const inProgress = candidates.filter((c) => c.exposure > 0 && c.exposure < targetN);
  const fresh = candidates.filter((c) => c.exposure === 0);
  const done = candidates.filter((c) => c.exposure >= targetN);

  if (fresh.length > 0 && inProgress.length < focusSetSize) {
    return fresh.sort(byDistThenId)[0]!.item;
  }
  if (inProgress.length > 0) {
    // Most exposed first: the item closest to its threshold gets finished.
    return inProgress.sort((a, b) => b.exposure - a.exposure || byDistThenId(a, b))[0]!.item;
  }
  if (fresh.length > 0) return fresh.sort(byDistThenId)[0]!.item;
  // Everything in band is already calibrated-size: least exposed keeps rotation fair.
  return done.sort((a, b) => a.exposure - b.exposure || byDistThenId(a, b))[0]!.item;
}
