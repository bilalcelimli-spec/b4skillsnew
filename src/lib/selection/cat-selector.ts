/**
 * CATSelector
 *
 * Unified item selection pipeline for Computerised Adaptive Testing sessions.
 * Composes:
 *   1. Shadow-test assembly (van der Linden, 2005) — guarantees blueprint
 *      feasibility at every step
 *   2. Composite scoring  — Fisher Information + exposure penalty + blueprint
 *      urgency + recency penalty (α/β/γ/δ weights)
 *   3. Sympson-Hetter exposure control — probabilistic gating per stratum
 *   4. Sequencing rules   — skill rotation, set integrity, productive-last, etc.
 *
 * Usage:
 *   const selector = new CATSelector(profile);
 *   const next = await selector.selectNext(pool, state, ctx);
 */

import { information } from "../assessment-engine/irt.js";
import { Item, SkillType, BlueprintConstraint, SessionState } from "../assessment-engine/types.js";
import { constructShadowTest } from "../psychometrics/shadow-test.js";
import { getExposureStore } from "../assessment-engine/exposure-store.js";
import { thetaToStratum, sympsonHetterWeight, DEFAULT_MIN_STRATUM_N } from "../assessment-engine/sympson-heter.js";
import { applySequencingRules, SequencingContext } from "./sequencing-rules.js";
import { ProductLineProfile } from "../product-lines/profiles.js";

// ─── Composite Scoring Weights ─────────────────────────────────────────────
// These weights balance four objectives:
//   α — measurement precision (Fisher Information)
//   β — exposure control      (Sympson-Hetter penalty)
//   γ — blueprint urgency     (prioritise under-represented skills)
//   δ — recency penalty       (items seen in the last K tests scored lower)
const ALPHA = 0.50; // Fisher Information weight
const BETA  = 0.20; // Exposure penalty weight
const GAMMA = 0.20; // Blueprint urgency weight
const DELTA = 0.10; // Recency penalty weight

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShadowItem extends Item {
  cefrLevel?: string;
  exposureCount?: number;
  totalSessions?: number;
}

export interface CATSelectorResult {
  item: Item;
  shadowTestSize: number;
  compositeScore: number;
}

// ─── CATSelector ──────────────────────────────────────────────────────────────

export class CATSelector {
  private profile: ProductLineProfile;

  constructor(profile: ProductLineProfile) {
    this.profile = profile;
  }

  /**
   * Select the next item for a CAT session.
   *
   * @param pool        Full item pool for the current skill section (operational + pretest)
   * @param state       Current session state (theta, SEM, usedItemIds, responses)
   * @param seqCtx      Sequencing context (administered items, planned total)
   * @param blueprint   Content blueprint constraints (optional; falls back to profile)
   */
  async selectNext(
    pool: ShadowItem[],
    state: SessionState,
    seqCtx: SequencingContext,
    blueprint?: BlueprintConstraint[]
  ): Promise<CATSelectorResult | null> {
    const activeBlueprint = blueprint ?? this.profile.blueprint;
    const { theta, usedItemIds } = state;

    // ── Step 1: Shadow-test assembly ────────────────────────────────────────
    // Assembles a complete shadow test satisfying blueprint and exposure limits.
    const { nextItem: shadowCandidate, shadowTest } = constructShadowTest(
      pool,
      theta,
      usedItemIds,
      {
        totalLength: this.profile.globalMaxItems,
        blueprint: activeBlueprint,
        maxPerCefrLevel: 5, // cap CEFR-level saturation
        maxExposureRate: this.profile.maxExposureRate,
      }
    );

    if (!shadowCandidate) return null;

    // ── Step 2: Build candidate set from shadow (top-10 by info) ────────────
    const available = shadowTest.filter((i) => !usedItemIds.has(i.id));
    if (available.length === 0) return null;

    const store = await getExposureStore();
    const stratum = thetaToStratum(theta);
    const stratumN = store.getStratumTotalSync(stratum);
    const useConditional = stratumN >= DEFAULT_MIN_STRATUM_N;

    // Current skill counts from administered items
    const skillCounts: Partial<Record<SkillType, number>> = {};
    for (const itemId of usedItemIds) {
      const item = pool.find((i) => i.id === itemId);
      if (item) {
        skillCounts[item.skill] = (skillCounts[item.skill] ?? 0) + 1;
      }
    }

    // ── Step 3: Composite score ──────────────────────────────────────────────
    const scored = available.map((item) => {
      // Fisher Information
      const fisherInfo = information(theta, item.params);

      // Exposure penalty (0 = not exposed yet → no penalty; 1 = maxRate → fully penalised)
      const rate = useConditional
        ? store.getConditionalExposureRateSync(item.id, stratum)
        : store.getExposureRateSync(item.id);
      const exposurePenalty = 1 - sympsonHetterWeight(rate, this.profile.maxExposureRate);

      // Blueprint urgency: higher score for skills that are under-represented
      const constraint = activeBlueprint.find((c) => c.skill === item.skill);
      let urgency = 0;
      if (constraint) {
        const currentCount = skillCounts[item.skill] ?? 0;
        const gap = Math.max(0, constraint.minCount - currentCount);
        urgency = gap / Math.max(1, constraint.maxCount - constraint.minCount + 1);
      }

      // Recency penalty: check if item appeared in recent session metadata
      // We approximate this using the item's own exposureCount relative to
      // a decayed window (not available per-session, so we use 0 for now).
      const recencyPenalty = 0;

      const composite =
        ALPHA * fisherInfo
        - BETA  * exposurePenalty * fisherInfo
        + GAMMA * urgency * fisherInfo
        - DELTA * recencyPenalty;

      return { item, composite, fisherInfo };
    });

    scored.sort((a, b) => b.composite - a.composite);

    // Keep top-5 candidates
    const topCandidates = scored.slice(0, Math.min(5, scored.length)).map((s) => s.item);

    // ── Step 4: Sequencing rules ─────────────────────────────────────────────
    const sequenced = applySequencingRules(topCandidates, seqCtx);
    const finalCandidates = sequenced.length > 0 ? sequenced : topCandidates;

    // ── Step 5: Random selection from final candidates ───────────────────────
    const chosen = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
    const chosenScore = scored.find((s) => s.item.id === chosen.id)?.composite ?? 0;

    // Record exposure
    await store.recordExposure(chosen.id, theta);

    return {
      item: chosen,
      shadowTestSize: shadowTest.length,
      compositeScore: chosenScore,
    };
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

const _selectors = new Map<string, CATSelector>();

export function getCATSelector(profile: ProductLineProfile): CATSelector {
  const existing = _selectors.get(profile.name);
  if (existing) return existing;
  const selector = new CATSelector(profile);
  _selectors.set(profile.name, selector);
  return selector;
}
