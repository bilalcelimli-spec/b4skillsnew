import { information } from "./irt";
import { Item } from "./types";

/**
 * Item Selector (Maximum Fisher Information - MFI)
 * MFI selects the item that provides the most information at the current
 * ability estimate (theta).
 */

/**
 * Select the best item from the pool based on Fisher Information
 * @param pool The pool of available items
 * @param currentTheta The current ability estimate
 * @param usedItemIds IDs of items already administered
 * @param topN Number of top candidates to consider for exposure control
 */
export function selectNextItem(
  pool: Item[],
  currentTheta: number,
  usedItemIds: Set<string>,
  topN: number = 5
): Item | null {
  // 1. Filter out used items
  const availableItems = pool.filter(item => !usedItemIds.has(item.id));
  
  if (availableItems.length === 0) return null;

  // 2. Calculate information for each item at the current theta
  const scoredItems = availableItems.map(item => ({
    item,
    info: information(currentTheta, item.params)
  }));

  // 3. Sort by information descending
  scoredItems.sort((a, b) => b.info - a.info);

  // 4. Exposure Control: Randomly select from the top N candidates
  // This prevents the same "best" item from being over-exposed to all candidates
  const candidates = scoredItems.slice(0, Math.min(topN, scoredItems.length));
  const randomIndex = Math.floor(Math.random() * candidates.length);
  
  return candidates[randomIndex].item;
}

/**
 * Content-Balanced Item Selection (Optional Extension)
 * This would ensure that we don't just pick the best item psychometrically,
 * but also respect the blueprint (e.g., "Business" vs "Academic").
 */
export function selectNextItemWithConstraints(
  pool: Item[],
  currentTheta: number,
  usedItemIds: Set<string>,
  constraints: { skill: string; tag?: string; count: number }[],
  currentCounts: Record<string, number>
): Item | null {
  // Filter by constraints first
  const validPool = pool.filter(item => {
    const constraint = constraints.find(c => c.skill === item.skill);
    if (!constraint) return false;
    return (currentCounts[item.skill] || 0) < constraint.count;
  });

  return selectNextItem(validPool, currentTheta, usedItemIds);
}
