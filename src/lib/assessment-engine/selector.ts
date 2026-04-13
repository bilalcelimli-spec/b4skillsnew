import { information } from "./irt";
import { Item, BlueprintConstraint, SkillType } from "./types";

/**
 * Item Selector (Maximum Fisher Information - MFI) with Blueprint Constraints
 * Selects the item that provides the most information at the current ability
 * estimate (theta) while respecting the content blueprint (skill distribution).
 */

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

  // 3. Score each candidate item by Fisher Information at the current theta
  const scoredItems = candidatePool.map(item => ({
    item,
    info: information(currentTheta, item.params)
  }));

  // 4. Sort by information descending
  scoredItems.sort((a, b) => b.info - a.info);

  // 5. Exposure Control (Sympson-Hetter style): randomly select from top-N
  const candidates = scoredItems.slice(0, Math.min(topN, scoredItems.length));
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex].item;
}

