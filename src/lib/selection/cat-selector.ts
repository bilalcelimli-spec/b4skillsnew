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
import { hybridSelectTopK } from "../psychometrics/kl-information.js";
import { selectItemRL, buildRlState, type RlItem } from "../psychometrics/rl-item-selection.js";
import {
  selectItemDaveyParshall,
  recordSelection,
  createExposureStore,
  updateAlphas,
  type ExposureStore as DPExposureStore,
} from "./exposure-control-davey-parshall.js";

// ─── Davey-Parshall singleton store (in-process; survives across requests) ────
// Persisted in-memory; for multi-process/multi-node deployments, replace with
// a shared Redis-backed store (interface-compatible).
const _dpStore: DPExposureStore = createExposureStore();

// ─── Composite Scoring Weights ─────────────────────────────────────────────
// α — measurement precision (Fisher Information)
// β — exposure control (Davey-Parshall α-gate handles this directly; kept as small residual)
// γ — blueprint urgency (prioritise under-represented skills)
// δ — recency penalty (items seen in the last K tests scored lower)
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
  selectionStrategy?: "rl" | "composite";
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
   * @param useRlSelector  Use RL policy instead of composite scorer (experimental)
   */
  async selectNext(
    pool: ShadowItem[],
    state: SessionState,
    seqCtx: SequencingContext,
    blueprint?: BlueprintConstraint[],
    useRlSelector = false,
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

    // ── RL selector (optional) ───────────────────────────────────────────────
    if (useRlSelector) {
      // Resolve the store once up-front so real per-stratum exposure rates can
      // be fed into the RL feature vector (previously hard-coded to 0).
      const rlStore = await getExposureStore();
      const rlStratum = thetaToStratum(theta);
      const rlStratumN = rlStore.getStratumTotalSync(rlStratum);
      const rlUseConditional = rlStratumN >= DEFAULT_MIN_STRATUM_N;

      const rlPool: RlItem[] = shadowTest.map((it) => ({
        id: it.id,
        params: it.params,
        skill: it.skill as string,
        exposureRate: rlUseConditional
          ? rlStore.getConditionalExposureRateSync(it.id, rlStratum)
          : rlStore.getExposureRateSync(it.id),
      }));
      const responseSummary = [...usedItemIds].map((id) => {
        const it = pool.find((i) => i.id === id);
        return { skill: (it?.skill as string) ?? "UNKNOWN" };
      });
      const rlState = buildRlState(state.theta, state.sem ?? 1.0, responseSummary);
      const rlItem = selectItemRL(rlState, rlPool, usedItemIds);
      if (rlItem) {
        const engineItem = shadowTest.find((it) => it.id === rlItem.id)!;
        await rlStore.recordExposure(engineItem.id, state.theta);
        return {
          item: engineItem,
          shadowTestSize: shadowTest.length,
          compositeScore: 0,
          selectionStrategy: "rl",
        };
      }
      // Fall through to composite if RL returns null
    }
    const available = shadowTest.filter((i) => !usedItemIds.has(i.id));
    if (available.length === 0) return null;

    const store = await getExposureStore();
    const stratum = thetaToStratum(theta);
    const stratumN = store.getStratumTotalSync(stratum);
    const useConditional = stratumN >= DEFAULT_MIN_STRATUM_N;

    // ── Step 2a: Davey-Parshall α-gate (primary exposure control) ───────────
    // Each candidate item is probabilistically accepted based on its per-stratum
    // α value. Items exceeding k_max exposure are gated out; the highest-Fisher-
    // information accepted item is returned directly. Fall through to composite
    // scoring only when D-P rejects every candidate (extremely rare).
    {
      const dpCandidate = selectItemDaveyParshall(
        available,
        theta,
        { store: _dpStore, kMax: this.profile.maxExposureRate },
        usedItemIds
      );
      if (dpCandidate) {
        recordSelection(_dpStore, dpCandidate.id, stratum, available.map(i => i.id));
        if (_dpStore.sessionsSinceLastUpdate >= 100) updateAlphas(_dpStore);
        await store.recordExposure(dpCandidate.id, theta);
        const seqResult = applySequencingRules([dpCandidate], seqCtx);
        const finalItem = seqResult.length > 0 ? seqResult[0]! : dpCandidate;
        return {
          item: finalItem,
          shadowTestSize: shadowTest.length,
          compositeScore: information(theta, finalItem.params),
          selectionStrategy: "composite",
        };
      }
    }

    // Current skill counts from administered items
    const skillCounts: Partial<Record<SkillType, number>> = {};
    for (const itemId of usedItemIds) {
      const item = pool.find((i) => i.id === itemId);
      if (item) {
        skillCounts[item.skill] = (skillCounts[item.skill] ?? 0) + 1;
      }
    }

    // ── Step 3: Composite score with hybrid KL/MFI pre-ranking (D-P fallback) ──
    // Reached only when Davey-Parshall rejects all candidates (extremely rare).
    // Uses KL-info pre-ranking + Fisher info composite with blueprint urgency.
    const operationalAdministered = [...usedItemIds].filter(id => {
      const it = pool.find(i => i.id === id);
      return it && !it.isPretest;
    }).length;
    const currentSem = state.sem ?? 1.0;

    const { method: selectionMethod, items: klPreRanked } = hybridSelectTopK(
      theta,
      currentSem,
      operationalAdministered,
      available,
      available.length // rank all; we do final top-5 below after composite scoring
    );

    const klOrder = new Map(klPreRanked.map((it, idx) => [it.id, idx]));

    const scored = available.map((item) => {
      // Fisher Information (always computed for composite; KL reorders via priority boost)
      const fisherInfo = information(theta, item.params);

      // KL priority boost: top-3 KL items get a 20% composite bonus
      const klRank = klOrder.get(item.id) ?? Infinity;
      const klBoost = selectionMethod === "KL" && klRank < 3 ? 0.20 * fisherInfo : 0;

      // Exposure penalty: now a minor residual (D-P handles the main control)
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

      // Recency penalty: approximated as 0 (session-level data not available here).
      const recencyPenalty = 0;

      const composite =
        ALPHA * fisherInfo
        + klBoost
        - BETA  * exposurePenalty * fisherInfo
        + GAMMA * urgency * fisherInfo
        - DELTA * recencyPenalty;

      return { item, composite, fisherInfo, selectionMethod };
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
      selectionStrategy: "composite",
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
