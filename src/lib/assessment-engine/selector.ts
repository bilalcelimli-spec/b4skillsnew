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
  const availableItems = pool.filter((item) => !usedItemIds.has(item.id));
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
    const exposureWeight = sympsonHetterWeight(rate, MAX_EXPOSURE_RATE);
    return { item, score: info * exposureWeight };
  });

  scoredItems.sort((a, b) => b.score - a.score);

  const candidates = scoredItems.slice(0, Math.min(topN, scoredItems.length));
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selected = candidates[randomIndex].item;

  await store.recordExposure(selected.id, currentTheta);
  return selected;
}
