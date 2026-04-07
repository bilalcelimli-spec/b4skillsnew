import { estimateTheta } from "./estimator";
import { selectNextItem } from "./selector";
import { SessionState, Response, Item, EngineConfig, CefrLevel } from "./types";

/**
 * b4skills Assessment Engine
 * This is the main entry point for the psychometric logic.
 * It coordinates ability estimation, item selection, and stopping rules.
 */

export class AssessmentEngine {
  private config: EngineConfig;

  constructor(config: EngineConfig) {
    this.config = config;
  }

  /**
   * Initialize a new session state
   */
  public initializeSession(): SessionState {
    return {
      theta: this.config.startingTheta,
      sem: this.config.startingSem,
      responses: [],
      usedItemIds: new Set<string>()
    };
  }

  /**
   * Process a new response and update the session state
   * @param state The current session state
   * @param response The candidate's response
   * @param items Map of items in the pool
   */
  public processResponse(
    state: SessionState,
    response: Response,
    items: Record<string, Item>
  ): SessionState {
    const item = items[response.itemId];
    const updatedResponse = {
      ...response,
      isPretest: item?.isPretest
    };

    const updatedResponses = [...state.responses, updatedResponse];
    const updatedUsedItems = new Set(state.usedItemIds);
    updatedUsedItems.add(response.itemId);

    // 1. Re-estimate ability (theta) and SEM
    // estimateTheta will ignore pretest responses internally
    const { theta, sem } = estimateTheta(updatedResponses, items);

    return {
      theta,
      sem,
      responses: updatedResponses,
      usedItemIds: updatedUsedItems
    };
  }

  /**
   * Select the next item for the candidate
   * @param state The current session state
   * @param pool The pool of available items
   */
  public getNextItem(state: SessionState, pool: Item[]): Item | null {
    // 1. Exposure Control & Pretest Logic
    const pretestRatio = this.config.pretestRatio || 0;
    const shouldAdministerPretest = Math.random() < pretestRatio;

    if (shouldAdministerPretest) {
      const pretestPool = pool.filter(item => item.isPretest && !state.usedItemIds.has(item.id));
      if (pretestPool.length > 0) {
        // Target pretest items to candidates within a reasonable range of their estimated difficulty.
        // This ensures we collect data where the item is most informative for calibration.
        // We pick the pretest item whose difficulty (b-parameter) is closest to the current theta.
        
        let bestPretestItem = pretestPool[0];
        let minDiff = Math.abs(pretestPool[0].params.b - state.theta);

        for (let i = 1; i < pretestPool.length; i++) {
          const diff = Math.abs(pretestPool[i].params.b - state.theta);
          if (diff < minDiff) {
            minDiff = diff;
            bestPretestItem = pretestPool[i];
          }
        }

        return bestPretestItem;
      }
    }

    // 2. Select the best operational item based on Maximum Fisher Information (MFI)
    const operationalPool = pool.filter(item => !item.isPretest);
    return selectNextItem(operationalPool, state.theta, state.usedItemIds);
  }

  /**
   * Evaluate whether the assessment should stop
   * @param state The current session state
   */
  public shouldStop(state: SessionState): { stop: boolean; reason: string | null } {
    const count = state.responses.length;

    // 1. Minimum items reached?
    if (count < this.config.minItems) {
      return { stop: false, reason: null };
    }

    // 2. Maximum items reached?
    if (count >= this.config.maxItems) {
      return { stop: true, reason: "MAX_ITEMS_REACHED" };
    }

    // 3. SEM threshold reached? (Precision-based stopping)
    if (state.sem <= this.config.semThreshold) {
      return { stop: true, reason: "SEM_THRESHOLD_REACHED" };
    }

    return { stop: false, reason: null };
  }

  /**
   * Map the final ability estimate (theta) to a CEFR level
   * This mapping uses thresholds from the engine configuration,
   * which can be derived from a calibration study.
   */
  public mapToCefr(theta: number): CefrLevel {
    const thresholds = this.config.cefrThresholds || {};
    
    // Default thresholds if not provided in config
    const a1 = thresholds.A1 ?? -2.5;
    const a2 = thresholds.A2 ?? -1.5;
    const b1 = thresholds.B1 ?? -0.5;
    const b2 = thresholds.B2 ?? 0.5;
    const c1 = thresholds.C1 ?? 1.5;
    const c2 = thresholds.C2 ?? 2.5;

    if (theta < a1) return "PRE_A1";
    if (theta < a2) return "A1";
    if (theta < b1) return "A2";
    if (theta < b2) return "B1";
    if (theta < c1) return "B2";
    if (theta < c2) return "C1";
    return "C2";
  }
}
