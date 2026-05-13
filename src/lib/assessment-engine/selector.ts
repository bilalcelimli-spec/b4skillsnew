import { information } from "./irt";
import { Item, BlueprintConstraint, SkillType } from "./types";
import { getExposureStore } from "./exposure-store.js";
import {
  sympsonHetterWeight,
  thetaToStratum,
  DEFAULT_MIN_STRATUM_N,
} from "./sympson-heter.js";

// Max share of a single item *within* a θ stratum (Sympson–Hetter style cap).
const MAX_EXPOSURE_RATE = 0.20;

/**
 * Davey–Parshall (2005) exposure weight.
 *
 * Compared to plain Sympson–Hetter (which hard-caps once r > k), DP applies a
 * *continuous* penalty proportional to how much the observed rate exceeds the
 * target, preventing high-information items from hitting the cap all at once.
 *
 * w_DP(r, target) = min(1, target / r)^alpha   for r > 0
 *
 * alpha = 2 gives smoother decay than SH (alpha = 1) while still ensuring
 * ψ → 0 as r → ∞.
 *
 * Reference: Davey, T. C. & Parshall, C. G. (2005). New algorithms for item
 * selection and exposure control with the computerized adaptive test. Journal
 * of Educational Measurement, 42(3), 271-292.
 */
function daveyParshallWeight(
  observedRate: number,
  targetRate: number,
  alpha = 2
): number {
  if (observedRate <= 0 || observedRate <= targetRate) return 1.0;
  return Math.pow(targetRate / observedRate, alpha);
}

/**
 * Compute the Davey-Parshall target exposure rate for the current test.
 * Based on the pool size: each item should be selected 1/sqrt(eligible pool) of the time.
 */
function dpTargetRate(eligiblePoolSize: number): number {
  return Math.min(MAX_EXPOSURE_RATE, 1 / Math.max(1, Math.sqrt(eligiblePoolSize)));
}

/**
 * Track that an item was administered at a given ability estimate.
 * Prefer passing `atTheta` so conditional Sympson–Hetter stats are updated.
 */
export function recordItemExposure(itemId: string, atTheta?: number): void {
  getExposureStore()
    .then((store) => store.recordExposure(itemId, atTheta))
    .catch(() => {});
}

/**
 * Select the best item from the pool based on Fisher Information.
 * If blueprint constraints are provided, filters the pool to items that
 * still need to be administered per the blueprint before applying MFI.
 */
export async function selectNextItem(
  pool: Item[],
  currentTheta: number,
  usedItemIds: Set<string>,
  topN: number = 5,
  blueprint?: BlueprintConstraint[],
  currentSkillCounts?: Partial<Record<SkillType, number>>
): Promise<Item | null> {
  const availableItems = pool.filter(
    (item) => !usedItemIds.has(item.id) && item.status !== "RETIRED"
  );
  if (availableItems.length === 0) {
    return null;
  }

  const store = await getExposureStore();
  const stratum = thetaToStratum(currentTheta);
  const stratumN = store.getStratumTotalSync(stratum);
  const useConditional = stratumN >= DEFAULT_MIN_STRATUM_N;

  let candidatePool = availableItems;

  if (blueprint && blueprint.length > 0 && currentSkillCounts) {
    const unfulfilled = blueprint.filter((constraint) => {
      const count = currentSkillCounts[constraint.skill] || 0;
      return count < constraint.minCount;
    });

    if (unfulfilled.length > 0) {
      const unfulfilledSkills = new Set(unfulfilled.map((c) => c.skill));
      const blueprintFiltered = availableItems.filter((item) => unfulfilledSkills.has(item.skill));
      if (blueprintFiltered.length > 0) {
        candidatePool = blueprintFiltered;
      }
    } else {
      const cappedSkills = new Set(
        blueprint
          .filter((c) => (currentSkillCounts[c.skill] || 0) >= c.maxCount)
          .map((c) => c.skill)
      );
      if (cappedSkills.size > 0) {
        const capped = availableItems.filter((item) => !cappedSkills.has(item.skill));
        if (capped.length > 0) {
          candidatePool = capped;
        }
      }
    }
  }

  const scoredItems = candidatePool.map((item) => {
    const info = information(currentTheta, item.params);
    const rate = useConditional
      ? store.getConditionalExposureRateSync(item.id, stratum)
      : store.getExposureRateSync(item.id);

    // Davey-Parshall weight (continuous penalty) combined with Sympson-Hetter hard cap.
    // DP provides smooth, differentiable decay; SH acts as a safety ceiling.
    const targetRate = dpTargetRate(candidatePool.length);
    const dpWeight = daveyParshallWeight(rate, targetRate);
    const shWeight = sympsonHetterWeight(rate, MAX_EXPOSURE_RATE);
    const exposureWeight = Math.min(dpWeight, shWeight); // most conservative wins

    return { item, score: info * exposureWeight };
  });

  scoredItems.sort((a, b) => b.score - a.score);

  const candidates = scoredItems.slice(0, Math.min(topN, scoredItems.length));
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selected = candidates[randomIndex].item;

  await store.recordExposure(selected.id, currentTheta);
  return selected;
}
