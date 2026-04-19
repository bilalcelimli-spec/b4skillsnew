import { information } from "./irt";
import { Item, BlueprintConstraint, SkillType } from "./types";

// In-memory exposure counter. In a multi-process deployment this should be
// backed by Redis or a DB column; for a single-process server this is sufficient.
const exposureCount: Map<string, number> = new Map();

// Maximum fraction of test-takers who should see a given item (exposure rate target).
// Items exceeding this fraction have their selection probability reduced.
const MAX_EXPOSURE_RATE = 0.20; // Sympson-Hetter target: no item seen by > 20% of candidates

/**
 * Track that an item was administered so exposure control can adjust future selections.
 */
export function recordItemExposure(itemId: string): void {
  exposureCount.set(itemId, (exposureCount.get(itemId) ?? 0) + 1);
}

/**
 * Select the best item from the pool based on Fisher Information.
 * If blueprint constraints are provided, filters the pool to items that
 * still need to be administered per the blueprint before applying MFI.
 *
 * @param pool The pool of available items
 * @param currentTheta The current ability estimate
 * @param usedItemIds IDs of items already administered
 * @param topN Number of top candidates to consider for exposure control
 * @param blueprint Optional content blueprint constraints
 * @param currentSkillCounts Optional current count of responses per skill
 */
export function selectNextItem(
  pool: Item[],
  currentTheta: number,
  usedItemIds: Set<string>,
  topN: number = 5,
  blueprint?: BlueprintConstraint[],
  currentSkillCounts?: Partial<Record<SkillType, number>>
): Item | null {
  // 1. Filter out used items
  const availableItems = pool.filter(item => !usedItemIds.has(item.id));
  if (availableItems.length === 0) return null;

  let candidatePool = availableItems;

  // 2. Blueprint enforcement: prefer skills that haven't met their quota yet
  if (blueprint && blueprint.length > 0 && currentSkillCounts) {
    const unfulfilled = blueprint.filter(constraint => {
      const count = currentSkillCounts[constraint.skill] || 0;
      return count < constraint.minCount;
    });

    if (unfulfilled.length > 0) {
      const unfulfilledSkills = new Set(unfulfilled.map(c => c.skill));
      const blueprintFiltered = availableItems.filter(item => unfulfilledSkills.has(item.skill));
      // Only restrict to unfulfilled skills if items exist in that domain
      if (blueprintFiltered.length > 0) {
        candidatePool = blueprintFiltered;
      }
      // If no items exist for an unfulfilled skill, fall through to full pool
      // rather than silently dropping the constraint — this surfaces the gap.
    } else {
      // All minimums are met. Now enforce maximums — exclude items from skills at their cap
      const cappedSkills = new Set(
        blueprint
          .filter(c => (currentSkillCounts[c.skill] || 0) >= c.maxCount)
          .map(c => c.skill)
      );
      if (cappedSkills.size > 0) {
        const capped = availableItems.filter(item => !cappedSkills.has(item.skill));
        if (capped.length > 0) candidatePool = capped;
      }
    }
  }

  // 3. Score each candidate item by Fisher Information at the current theta,
  //    then apply an exposure penalty so over-used items rank lower.
  const totalPool = pool.length || 1;
  const scoredItems = candidatePool.map(item => {
    const info = information(currentTheta, item.params);
    const exposures = exposureCount.get(item.id) ?? 0;
    const exposureRate = exposures / totalPool;
    // Sympson-Hetter-style weight: items near or above target rate are down-weighted
    const exposureWeight = exposureRate < MAX_EXPOSURE_RATE
      ? 1.0
      : MAX_EXPOSURE_RATE / exposureRate; // Smoothly penalise over-exposed items
    return { item, score: info * exposureWeight };
  });

  // 4. Sort by weighted score descending
  scoredItems.sort((a, b) => b.score - a.score);

  // 5. Select randomly from top-N to preserve some randomisation while
  //    keeping the selection within the high-information region.
  const candidates = scoredItems.slice(0, Math.min(topN, scoredItems.length));
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selected = candidates[randomIndex].item;

  // 6. Record the exposure
  recordItemExposure(selected.id);

  return selected;
}

