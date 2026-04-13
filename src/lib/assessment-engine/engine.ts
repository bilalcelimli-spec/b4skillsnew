import { estimateTheta } from "./estimator";
import { selectNextItem } from "./selector";
import { SessionState, Response, Item, EngineConfig, CefrLevel, SkillType, SkillProfile } from "./types";
import { thetaToCefr, CEFR_THETA_THRESHOLDS } from "../cefr/cefr-framework.js";

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

    // Speed-guessing detection: penalise suspiciously fast responses on hard items
    let adjustedScore = response.score;
    const speedThreshold = this.config.speedThresholdMs ?? 3000;
    if (
      response.latencyMs !== undefined &&
      response.latencyMs < speedThreshold &&
      item?.params.b > 1.0 &&   // Hard item
      response.score === 1       // Got it "correct"
    ) {
      // Reduce partial credit to 0.5 to dampen theta inflation from speed-guessing
      adjustedScore = 0.5;
    }

    const updatedResponse: Response = {
      ...response,
      score: adjustedScore,
      isPretest: item?.isPretest
    };

    const updatedResponses = [...state.responses, updatedResponse];
    const updatedUsedItems = new Set(state.usedItemIds);
    updatedUsedItems.add(response.itemId);

    // 1. Re-estimate overall ability (theta) and SEM
    const { theta, sem } = estimateTheta(updatedResponses, items);

    // 2. Update per-skill theta profiles (multidimensional profiling)
    const updatedSkillProfiles: Partial<Record<SkillType, SkillProfile>> = {
      ...(state.skillProfiles || {})
    };

    if (item && !item.isPretest) {
      const skill = item.skill;
      const skillResponses = updatedResponses.filter(
        r => !r.isPretest && items[r.itemId]?.skill === skill
      );
      if (skillResponses.length > 0) {
        const skillEstimate = estimateTheta(skillResponses, items);
        updatedSkillProfiles[skill] = skillEstimate;
      }
    }

    return {
      theta,
      sem,
      responses: updatedResponses,
      usedItemIds: updatedUsedItems,
      skillProfiles: updatedSkillProfiles
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
        let bestPretestItem = pretestPool[0];
        let minDiff = Math.abs(pretestPool[0].params.b - state.theta);
        for (let i = 1; i < pretestPool.length; i++) {
          const diff = Math.abs(pretestPool[i].params.b - state.theta);
          if (diff < minDiff) { minDiff = diff; bestPretestItem = pretestPool[i]; }
        }
        return bestPretestItem;
      }
    }

    // 2. Build current skill-count map for blueprint enforcement
    const currentSkillCounts: Partial<Record<SkillType, number>> = {};
    for (const r of state.responses) {
      if (!r.isPretest) {
        // We no longer have the item map here, so skilCounts is tracked separately
        // The caller (server-engine.ts) passes the full pool, pull skill from it
        const poolItem = pool.find(p => p.id === r.itemId);
        if (poolItem) {
          currentSkillCounts[poolItem.skill] = (currentSkillCounts[poolItem.skill] || 0) + 1;
        }
      }
    }

    // 3. Select best operational item (MFI + blueprint + exposure control)
    const operationalPool = pool.filter(item => !item.isPretest);
    return selectNextItem(
      operationalPool,
      state.theta,
      state.usedItemIds,
      5,
      this.config.blueprint,
      currentSkillCounts
    );
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
   * Map the final ability estimate (theta) to a CEFR level.
   * Delegates to the canonical CEFR framework (src/lib/cefr/cefr-framework.ts).
   * Config thresholds take precedence when provided (allows org-level calibration).
   */
  public mapToCefr(theta: number): CefrLevel {
    const thresholds = this.config.cefrThresholds;
    // If calibrated thresholds supplied by org, honour them; else use framework defaults
    if (thresholds && Object.keys(thresholds).length > 0) {
      const a1 = thresholds.A1 ?? CEFR_THETA_THRESHOLDS.PRE_A1;
      const a2 = thresholds.A2 ?? CEFR_THETA_THRESHOLDS.A1;
      const b1 = thresholds.B1 ?? CEFR_THETA_THRESHOLDS.A2;
      const b2 = thresholds.B2 ?? CEFR_THETA_THRESHOLDS.B1;
      const c1 = thresholds.C1 ?? CEFR_THETA_THRESHOLDS.B2;
      const c2 = thresholds.C2 ?? CEFR_THETA_THRESHOLDS.C1;
      if (theta < a1) return "PRE_A1";
      if (theta < a2) return "A1";
      if (theta < b1) return "A2";
      if (theta < b2) return "B1";
      if (theta < c1) return "B2";
      if (theta < c2) return "C1";
      return "C2";
    }
    return thetaToCefr(theta);
  }
}
