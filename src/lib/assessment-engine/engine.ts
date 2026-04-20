import { estimateTheta } from "./estimator";
import { selectNextItem } from "./selector";
import { SessionState, Response, Item, EngineConfig, CefrLevel, SkillType, SkillProfile, MirtAbilityVector, BlueprintConstraint } from "./types";
import { thetaToCefr, CEFR_THETA_THRESHOLDS } from "../cefr/cefr-framework.js";
import { information } from "./irt";
import {
  estimateMirtTheta,
  mirtSelectItem,
  uniToMirtParams,
  SKILL_ORDER as MIRT_SKILL_ORDER,
} from "../psychometrics/mirt-engine.js";
import { constructShadowTest } from "../psychometrics/shadow-test.js";

/** Standard normal CDF approximation (Abramowitz & Stegun 26.2.17) */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327;
  const p = d * Math.exp(-x * x / 2) *
    t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

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

    // Speed-guessing detection via log-normal response time heuristic
    // Flags rapid-guess if the candidate answered faster than the absolute
    // lower bound (2 s) OR faster than 20% of the expected time for this difficulty.
    // Affects ALL items (not just hard ones) and scales penalty by item difficulty.
    let adjustedScore = response.score;
    const speedThreshold = this.config.speedThresholdMs ?? 3000;
    if (
      response.score === 1 &&
      response.latencyMs !== undefined &&
      response.latencyMs > 0
    ) {
      const difficultyBasedThreshold = speedThreshold * Math.max(0.5, 1 + item?.params.b / 4);
      const isRapidGuess =
        response.latencyMs < 2000 || // Absolute lower bound: 2 s
        response.latencyMs < difficultyBasedThreshold * 0.2; // < 20% of expected time
      if (isRapidGuess) {
        // Penalty scales with difficulty: hard items penalised more (0.3–0.5)
        const penalty = item?.params.b > 1.0 ? 0.3 : 0.5;
        adjustedScore = penalty;
      }
    }

    const updatedResponse: Response = {
      ...response,
      score: adjustedScore,
      isPretest: item?.isPretest
    };

    const updatedResponses = [...state.responses, updatedResponse];
    const updatedUsedItems = new Set(state.usedItemIds);
    updatedUsedItems.add(response.itemId);

    // 1. Re-estimate overall ability (theta) and SEM (with optional org-level prior)
    const { theta, sem } = estimateTheta(
      updatedResponses,
      items,
      this.config.priorMean ?? 0,
      this.config.priorSd ?? 1
    );

    // 2. Update per-skill theta profiles (unidimensional per-skill EAP)
    const updatedSkillProfiles: Partial<Record<SkillType, SkillProfile>> = {
      ...(state.skillProfiles || {})
    };

    if (item && !item.isPretest) {
      const skill = item.skill;
      const skillResponses = updatedResponses.filter(
        r => !r.isPretest && items[r.itemId]?.skill === skill
      );
      if (skillResponses.length > 0) {
        const skillEstimate = estimateTheta(skillResponses, items,
          this.config.priorMean ?? 0, this.config.priorSd ?? 1);
        updatedSkillProfiles[skill] = skillEstimate;
      }
    }

    // 3. MIRT: run 6D ability estimation when enabled
    let updatedMirtVector: MirtAbilityVector | undefined = state.mirtAbilityVector;
    if (this.config.useMirt) {
      const mirtResponses = updatedResponses
        .filter(r => !r.isPretest && items[r.itemId])
        .map(r => {
          const it = items[r.itemId];
          const mirtParams = uniToMirtParams(it.skill, it.params.a, it.params.b, it.params.c);
          return { score: r.score, params: mirtParams };
        });
      if (mirtResponses.length > 0) {
        updatedMirtVector = estimateMirtTheta(mirtResponses);
      }
    }

    return {
      theta,
      sem,
      responses: updatedResponses,
      usedItemIds: updatedUsedItems,
      skillProfiles: updatedSkillProfiles,
      mirtAbilityVector: updatedMirtVector,
    };
  }

  /**
   * Select the next item for the candidate.
   * Uses shadow-test (van der Linden 2005) when config.useShadowTest=true,
   * MIRT-weighted selection when config.useMirt=true, else MFI + Sympson-Hetter.
   * Blueprint is enforced adaptively: skills with SEM > 0.40 get their maxCount
   * temporarily relaxed by +1 to spend extra measurement budget where needed.
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
        const poolItem = pool.find(p => p.id === r.itemId);
        if (poolItem) {
          currentSkillCounts[poolItem.skill] = (currentSkillCounts[poolItem.skill] || 0) + 1;
        }
      }
    }

    // 3. Adaptive blueprint: temporarily expand maxCount for skills still imprecise
    //    (SEM > 0.40) so measurement budget flows to where it is most needed.
    let effectiveBlueprint = this.config.blueprint;
    if (effectiveBlueprint && state.skillProfiles) {
      effectiveBlueprint = effectiveBlueprint.map(constraint => {
        const skillSem = state.skillProfiles![constraint.skill]?.sem ?? 1.0;
        const relaxed = skillSem > 0.40 ? constraint.maxCount + 1 : constraint.maxCount;
        return { ...constraint, maxCount: relaxed };
      });
    }

    const operationalPool = pool.filter(item => !item.isPretest);

    // 4a. Shadow-test item selection (van der Linden 2005)
    if (this.config.useShadowTest && effectiveBlueprint && effectiveBlueprint.length > 0) {
      const { nextItem } = constructShadowTest(
        operationalPool as any,
        state.theta,
        state.usedItemIds,
        {
          totalLength: this.config.maxItems,
          blueprint: effectiveBlueprint,
          maxExposureRate: 0.20,
        }
      );
      return nextItem as Item | null;
    }

    // 4b. MIRT-weighted item selection
    if (this.config.useMirt && state.mirtAbilityVector) {
      const mirtPool = operationalPool
        .filter(item => !state.usedItemIds.has(item.id))
        .map(item => ({
          id: item.id,
          params: uniToMirtParams(item.skill, item.params.a, item.params.b, item.params.c),
          _original: item,
        }));
      const selected = mirtSelectItem(
        mirtPool,
        state.mirtAbilityVector.theta,
        state.mirtAbilityVector.sem,
        state.usedItemIds
      );
      if (selected) {
        return mirtPool.find(p => p.id === selected.id)?._original ?? null;
      }
    }

    // 4c. Standard MFI + Sympson-Hetter + blueprint enforcement
    return selectNextItem(
      operationalPool,
      state.theta,
      state.usedItemIds,
      5,
      effectiveBlueprint,
      currentSkillCounts
    );
  }

  /**
   * Evaluate whether the assessment should stop.
   *
   * Stopping criteria (in priority order):
   *  1. minItems floor
   *  2. maxItems ceiling (hard stop)
   *  3. Test information I(θ) ≥ 12 (reliability ≥ 0.93)
   *  4. Global SEM ≤ semThreshold  (default 0.28)
   *  5. Conditional SEM ≤ 0.16 near CEFR boundaries (±0.5)
   *  6. Conditional SEM ≤ 0.12 very close to boundaries (±0.25)
   *  7. Posterior CEFR classification confidence ≥ threshold (default 0.90)
   */
  public shouldStop(state: SessionState): { stop: boolean; reason: string | null } {
    const count = state.responses.length;

    // 1. Minimum items floor
    if (count < this.config.minItems) {
      return { stop: false, reason: null };
    }

    // 2. Maximum items ceiling
    if (count >= this.config.maxItems) {
      return { stop: true, reason: "MAX_ITEMS_REACHED" };
    }

    const operationalResponses = state.responses.filter(r => !r.isPretest);
    if (operationalResponses.length >= this.config.minItems) {
      // 3. Test information criterion: I(θ) = 1/SEM² ≥ 12 → reliability ≥ 0.93
      const testInfo = state.sem > 0 ? 1 / (state.sem * state.sem) : 0;
      if (testInfo >= 12.0) {
        return { stop: true, reason: "SUFFICIENT_INFORMATION" };
      }
    }

    // 4a. Global SEM threshold (default 0.28)
    const globalSemThreshold = this.config.semThreshold ?? 0.28;
    if (state.sem <= globalSemThreshold) {
      return { stop: true, reason: "SEM_THRESHOLD_REACHED" };
    }

    // 4b & 4c. Conditional SEM tiers near CEFR classification boundaries
    const boundaries = Object.values(CEFR_THETA_THRESHOLDS).filter(v => isFinite(v));
    const distToNearest = Math.min(...boundaries.map(b => Math.abs(state.theta - b)));
    if (distToNearest < 0.25 && state.sem <= 0.12) {
      return { stop: true, reason: "SEM_BOUNDARY_TIGHT" };
    }
    if (distToNearest < 0.50 && state.sem <= 0.16) {
      return { stop: true, reason: "SEM_BOUNDARY_REACHED" };
    }

    // 5. Posterior CEFR classification confidence
    //    Compute P(θ in current CEFR band | data) using normal CDF approximation.
    //    Stop when classification is stable with >= configurable confidence (default 0.90).
    const confidenceThreshold = this.config.classificationConfidenceThreshold ?? 0.90;
    if (state.sem > 0 && operationalResponses.length >= this.config.minItems) {
      const currentLevel = this.mapToCefr(state.theta);
      const levelMeta = this.cefrBounds(currentLevel);
      const pLower = levelMeta.lower === -Infinity ? 0
        : normalCDF((levelMeta.lower - state.theta) / state.sem);
      const pUpper = levelMeta.upper === Infinity ? 1
        : normalCDF((levelMeta.upper - state.theta) / state.sem);
      const classificationConfidence = pUpper - pLower;
      if (classificationConfidence >= confidenceThreshold) {
        return { stop: true, reason: "CLASSIFICATION_CONFIDENCE_REACHED" };
      }
    }

    return { stop: false, reason: null };
  }

  /**
   * Return the theta bounds for a CEFR level band (using configured thresholds).
   * @internal Used by shouldStop for posterior classification confidence.
   */
  private cefrBounds(level: CefrLevel): { lower: number; upper: number } {
    const t = this.config.cefrThresholds || {};
    const a1  = t.A1  ?? -3.0;
    const a2  = t.A2  ?? -1.75;
    const b1  = t.B1  ?? -0.5;
    const b2  = t.B2  ??  0.5;
    const c1  = t.C1  ??  1.5;
    const c2  = t.C2  ??  2.5;
    switch (level) {
      case "PRE_A1": return { lower: -Infinity, upper: a1 };
      case "A1":     return { lower: a1, upper: a2 };
      case "A2":     return { lower: a2, upper: b1 };
      case "B1":     return { lower: b1, upper: b2 };
      case "B2":     return { lower: b2, upper: c1 };
      case "C1":     return { lower: c1, upper: c2 };
      case "C2":     return { lower: c2, upper: Infinity };
    }
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
