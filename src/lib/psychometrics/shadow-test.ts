/**
 * Shadow Test Approach (van der Linden, 2005)
 * 
 * At each step of the CAT, constructs a complete "shadow test" that satisfies
 * ALL blueprint constraints, then selects the item from the shadow test that
 * maximizes Fisher Information at the current theta.
 * 
 * This is superior to the greedy approach because:
 * - Guarantees feasible content distribution at every step
 * - Avoids "painting into a corner" (e.g., running out of items for a skill)
 * - Jointly optimizes measurement precision AND content balance
 * 
 * Uses a simplified linear programming approach via greedy constraint satisfaction.
 */

import { information } from "../assessment-engine/irt";
import { Item, SkillType, BlueprintConstraint, IrtParameters } from "../assessment-engine/types";

interface ShadowTestConfig {
  totalLength: number;
  blueprint: BlueprintConstraint[];
  /** Maximum items from any single CEFR level */
  maxPerCefrLevel?: number;
  /** Exposure control: max proportion of tests an item appears in */
  maxExposureRate?: number;
}

interface ShadowItem extends Item {
  cefrLevel?: string;
  exposureCount?: number;
  totalSessions?: number;
}

/**
 * Construct a shadow test that satisfies all constraints.
 * 
 * Algorithm:
 * 1. Start with already-administered items locked in
 * 2. Fill remaining slots with highest-info items per blueprint requirement
 * 3. Return the un-administered item with highest info in the shadow
 */
export function constructShadowTest(
  pool: ShadowItem[],
  currentTheta: number,
  usedItemIds: Set<string>,
  config: ShadowTestConfig
): { shadowTest: ShadowItem[]; nextItem: ShadowItem | null } {
  const { totalLength, blueprint, maxPerCefrLevel, maxExposureRate } = config;

  // Already administered items are "locked" into the shadow
  const lockedItems = pool.filter(item => usedItemIds.has(item.id));
  const itemsNeeded = totalLength - lockedItems.length;
  
  if (itemsNeeded <= 0) {
    return { shadowTest: lockedItems, nextItem: null };
  }

  // Available items (not yet administered)
  let available = pool.filter(item => !usedItemIds.has(item.id));

  // Apply exposure control filter
  if (maxExposureRate && maxExposureRate < 1) {
    available = available.filter(item => {
      if (!item.exposureCount || !item.totalSessions) return true;
      return (item.exposureCount / item.totalSessions) < maxExposureRate;
    });
  }

  // Calculate information for each available item
  const scored = available.map(item => ({
    item,
    info: information(currentTheta, item.params),
  }));

  // Current skill counts (from locked items)
  const skillCounts: Partial<Record<SkillType, number>> = {};
  for (const item of lockedItems) {
    skillCounts[item.skill] = (skillCounts[item.skill] || 0) + 1;
  }

  // CEFR level counts
  const cefrCounts: Record<string, number> = {};
  for (const item of lockedItems) {
    const level = item.cefrLevel || "unknown";
    cefrCounts[level] = (cefrCounts[level] || 0) + 1;
  }

  // Phase 1: Fill MINIMUM blueprint requirements
  const shadowItems: ShadowItem[] = [...lockedItems];
  const selectedIds = new Set(lockedItems.map(i => i.id));

  // Find skills that still need minimum items
  for (const constraint of blueprint) {
    const currentCount = skillCounts[constraint.skill] || 0;
    const needed = constraint.minCount - currentCount;
    
    if (needed > 0) {
      // Get best items for this skill
      const skillItems = scored
        .filter(s => s.item.skill === constraint.skill && !selectedIds.has(s.item.id))
        .sort((a, b) => b.info - a.info);

      for (let i = 0; i < Math.min(needed, skillItems.length); i++) {
        const selected = skillItems[i].item;
        
        // Check CEFR constraint
        if (maxPerCefrLevel && selected.cefrLevel) {
          const cefrCount = cefrCounts[selected.cefrLevel] || 0;
          if (cefrCount >= maxPerCefrLevel) continue;
        }

        shadowItems.push(selected);
        selectedIds.add(selected.id);
        skillCounts[selected.skill] = (skillCounts[selected.skill] || 0) + 1;
        if (selected.cefrLevel) {
          cefrCounts[selected.cefrLevel] = (cefrCounts[selected.cefrLevel] || 0) + 1;
        }
      }
    }
  }

  // Phase 2: Fill remaining slots with highest-info items respecting MAX constraints
  const remaining = totalLength - shadowItems.length;
  if (remaining > 0) {
    const stillAvailable = scored
      .filter(s => !selectedIds.has(s.item.id))
      .sort((a, b) => b.info - a.info);

    for (const { item } of stillAvailable) {
      if (shadowItems.length >= totalLength) break;

      // Check max per skill
      const skillConstraint = blueprint.find(c => c.skill === item.skill);
      if (skillConstraint) {
        const currentCount = skillCounts[item.skill] || 0;
        if (currentCount >= skillConstraint.maxCount) continue;
      }

      // Check max per CEFR level
      if (maxPerCefrLevel && item.cefrLevel) {
        const cefrCount = cefrCounts[item.cefrLevel] || 0;
        if (cefrCount >= maxPerCefrLevel) continue;
      }

      shadowItems.push(item);
      selectedIds.add(item.id);
      skillCounts[item.skill] = (skillCounts[item.skill] || 0) + 1;
      if (item.cefrLevel) {
        cefrCounts[item.cefrLevel] = (cefrCounts[item.cefrLevel] || 0) + 1;
      }
    }
  }

  // Select the next item: highest-info un-administered item in the shadow
  const nextCandidates = shadowItems
    .filter(item => !usedItemIds.has(item.id))
    .map(item => ({
      item,
      info: information(currentTheta, item.params),
    }))
    .sort((a, b) => b.info - a.info);

  // Exposure control: randomly select from top-3 to prevent overexposure
  const topN = Math.min(3, nextCandidates.length);
  const nextItem = topN > 0
    ? nextCandidates[Math.floor(Math.random() * topN)].item
    : null;

  return { shadowTest: shadowItems, nextItem };
}

/**
 * Validate that a shadow test satisfies all blueprint constraints
 */
export function validateShadowTest(
  shadowTest: ShadowItem[],
  blueprint: BlueprintConstraint[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const skillCounts: Partial<Record<SkillType, number>> = {};

  for (const item of shadowTest) {
    skillCounts[item.skill] = (skillCounts[item.skill] || 0) + 1;
  }

  for (const constraint of blueprint) {
    const count = skillCounts[constraint.skill] || 0;
    if (count < constraint.minCount) {
      violations.push(`${constraint.skill}: ${count} < min(${constraint.minCount})`);
    }
    if (count > constraint.maxCount) {
      violations.push(`${constraint.skill}: ${count} > max(${constraint.maxCount})`);
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Calculate total test information at a given theta for the shadow test
 */
export function shadowTestInformation(
  shadowTest: ShadowItem[],
  theta: number
): number {
  return shadowTest.reduce((sum, item) => sum + information(theta, item.params), 0);
}

/**
 * Generate test information function across theta range
 */
export function shadowTestInformationCurve(
  shadowTest: ShadowItem[],
  thetaRange: [number, number] = [-4, 4],
  step: number = 0.25
): { theta: number; info: number; sem: number }[] {
  const curve: { theta: number; info: number; sem: number }[] = [];
  for (let t = thetaRange[0]; t <= thetaRange[1]; t += step) {
    const info = shadowTestInformation(shadowTest, t);
    curve.push({
      theta: Number(t.toFixed(2)),
      info: Number(info.toFixed(3)),
      sem: info > 0 ? Number((1 / Math.sqrt(info)).toFixed(3)) : 10,
    });
  }
  return curve;
}
