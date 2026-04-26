import { TestItem, mockItems } from "../data/mockItems";

export interface AbilityEstimate {
  theta: number; // Current estimate
  standardError: number;
}

export class AdaptiveEngine {
  static selectNextItem(
    currentTheta: number,
    usedItemIds: Set<string>,
    externalBank?: TestItem[],
    targetType?: string
  ): TestItem {
    const bank = externalBank ?? mockItems;
    
    // Filter out used items and optionally by type
    const availableItems = bank.filter(item => 
      !usedItemIds.has(item.id) && (!targetType || item.type === targetType)
    );

    if (availableItems.length === 0) {
      if (bank.length > 0) return bank[0];
      throw new Error("Item bank is empty");
    }

    // Select item closest to current ability (theta)
    return availableItems.reduce((prev, curr) => {
      return Math.abs(curr.difficulty - currentTheta) < Math.abs(prev.difficulty - currentTheta)
        ? curr
        : prev;
    });
  }

  static updateEstimate(
    currentEstimate: AbilityEstimate,
    item: TestItem,
    isCorrectOrScore: boolean | number
  ): AbilityEstimate {
    const step = 0.5; // Simplified step adjustment
    let newTheta = currentEstimate.theta;

    if (typeof isCorrectOrScore === 'boolean') {
      newTheta = isCorrectOrScore 
        ? currentEstimate.theta + (step / (item.difficulty || 1))
        : currentEstimate.theta - (step / (item.difficulty || 1));
    } else {
      // For Speaking/Writing, we get a score (e.g., 1-4)
      // Normalize score to theta impact
      const normalizedScore = (isCorrectOrScore - 2.5) * 0.5;
      newTheta = currentEstimate.theta + normalizedScore;
    }

    return {
      theta: Math.max(1, Math.min(5, newTheta)),
      standardError: currentEstimate.standardError * 0.9 // Error decreases as we test more
    };
  }
}
