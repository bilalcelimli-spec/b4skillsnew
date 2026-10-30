import { estimateTheta } from "./estimator";
import { SessionState, Response, Item, EngineConfig, CefrLevel, SkillType, SkillProfile, MirtAbilityVector } from "./types";
import { thetaToCefr, CEFR_THETA_THRESHOLDS } from "../cefr/cefr-framework.js";
import { estimateMirtTheta, uniToMirtParams } from "../psychometrics/mirt-engine.js";
import { estimate2BTheta, itemTo2BParams } from "../psychometrics/mirt-2b.js";

/**
 * Rapid-guess heuristic used when RT-IRT (`useRtIrt`) is off.
 * True when the answer arrived faster than 2 s, or faster than 20% of the
 * difficulty-scaled expected time (`speedThresholdMs × max(0.5, 1 + b/4)`).
 * Diagnostic only: callers must never alter the score based on it.
 */
export function isRapidGuess(
  latencyMs: number | undefined,
  itemB: number | undefined,
  speedThresholdMs = 3000
): boolean {
  if (latencyMs === undefined || !(latencyMs > 0)) return false;
  const b = Number.isFinite(itemB) ? (itemB as number) : 0;
  const expectedMs = speedThresholdMs * Math.max(0.5, 1 + b / 4);
  return latencyMs < 2000 || latencyMs < expectedMs * 0.2;
}

/**
 * b4skills Assessment Engine — ability estimation.
 *
 * The engine owns the *response → θ* step: EAP on the joint 3PL/GRM
 * likelihood, per-skill profiles and the optional MIRT vectors. It has no I/O.
 *
 * Item selection lives in `src/lib/selection/cat-selector.ts` and section
 * stopping in `stop-rules.ts` / `section-flow.ts` (Faz 1 consolidated the
 * former `getNextItem` / `shouldStop` here, which the live flow never called,
 * into those modules so one path serves exams, audits and simulations).
 */
export class AssessmentEngine {
  private config: EngineConfig;

  constructor(config: EngineConfig) {
    this.config = config;
  }

  public getConfig(): Readonly<EngineConfig> {
    return this.config;
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
    items: Record<string, Item>,
    options: { skillPriors?: Partial<Record<SkillType, { mean: number; sd: number }>> } = {}
  ): SessionState {
    const item = items[response.itemId];

    // Rapid-guess handling (Faz 0): a fast answer is a *flag*, never a partial
    // score. Feeding 0.3/0.5 into a dichotomous 3PL likelihood is undefined and
    // biased θ downward. The flag is computed by `isRapidGuess` (persisted by
    // server-engine as Response.rtFlag) and feeds person-fit / RGI instead.
    const updatedResponse: Response = {
      ...response,
      isPretest: response.isPretest || item?.isPretest
    };

    const updatedResponses = [...state.responses, updatedResponse];
    const updatedUsedItems = new Set(state.usedItemIds);
    updatedUsedItems.add(response.itemId);

    // 1. Re-estimate overall ability (theta) and SEM (with optional org-level prior)
    const { theta, sem } = estimateTheta(
      updatedResponses,
      items,
      this.config.priorMean ?? 0,
      this.config.priorSd ?? 1,
      { useGrmProductive: this.config.useGrmProductive === true }
    );

    // 2. Update per-skill theta profiles (unidimensional per-skill EAP)
    const updatedSkillProfiles: Partial<Record<SkillType, SkillProfile>> = {
      ...(state.skillProfiles || {})
    };

    if (item && !updatedResponse.isPretest) {
      const skill = item.skill;
      const skillResponses = updatedResponses.filter(
        r => !r.isPretest && items[r.itemId]?.skill === skill
      );
      if (skillResponses.length > 0) {
        // Per-skill prior: the profile prior, or a cross-skill informative prior
        // supplied by the caller (adaptive-policy.crossSkillPriors).
        const skillPrior = options.skillPriors?.[skill];
        const skillEstimate = estimateTheta(
          skillResponses,
          items,
          skillPrior?.mean ?? this.config.priorMean ?? 0,
          skillPrior?.sd ?? this.config.priorSd ?? 1,
          { useGrmProductive: this.config.useGrmProductive === true }
        );
        updatedSkillProfiles[skill] = skillEstimate;
      }
    }

    // 3a. 2D receptive/productive MIRT (optional; takes precedence over 6D for state.mirt2B)
    let updatedMirt2B = state.mirt2B;
    if (this.config.useMirt2B) {
      const binary = updatedResponses
        .filter(r => !r.isPretest && items[r.itemId])
        .map(r => ({
          u: r.score,
          params: itemTo2BParams(items[r.itemId]!),
        }));
      if (binary.length > 0) {
        updatedMirt2B = estimate2BTheta(
          binary,
          this.config.priorMean ?? 0,
          this.config.priorSd ?? 1
        );
      }
    }

    // 3b. MIRT: run 6D ability estimation when enabled (skipped when only 2B is on)
    let updatedMirtVector: MirtAbilityVector | undefined = state.mirtAbilityVector;
    if (this.config.useMirt && !this.config.useMirt2B) {
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
      mirt2B: updatedMirt2B,
    };
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
