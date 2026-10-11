/**
 * CATSelector
 *
 * Unified item selection pipeline for Computerised Adaptive Testing sessions.
 * Composes:
 *   1. Greedy shadow-test assembly for remaining blueprint slots
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
  acceptItem,
  thetaToStratumDp,
  recordSelection,
  createExposureStore,
  updateAlphas,
  bootstrapDpStoreFromCounts,
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

// ─── Quality (IQS) soft-gate ───────────────────────────────────────────────
// IQS is applied as a *multiplier* on the composite score, not a hard gate
// (this is a low-stakes formative context — we never want to make a measurement
// hole by excluding an item outright). A perfect item (IQS 100) keeps its full
// score; a borderline item (IQS 60) is damped to 0.92×, so higher-quality items
// surface more often without distorting measurement efficiency. Items without an
// IQS yet (null) are treated as neutral (1.0).
//   q(iqs) = IQS_FLOOR + (1 − IQS_FLOOR) · (iqs / 100)
const IQS_FLOOR = 0.80;
function qualityMultiplier(iqScore: number | null | undefined): number {
  if (iqScore == null) return 1.0;
  const clamped = Math.max(0, Math.min(100, iqScore));
  return IQS_FLOOR + (1 - IQS_FLOOR) * (clamped / 100);
}

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
    const { theta, usedItemIds } = state;
    // Used items are absent from delivery pools. Recover history from the session,
    // otherwise blueprint counts, set continuity and KL/MFI switching stay at zero.
    const validPool = pool.filter(item => !usedItemIds.has(item.id) &&
      (item.status === undefined || item.status === "ACTIVE" || item.status === "PRETEST") &&
      Number.isFinite(item.params.a) && item.params.a > 0 && Number.isFinite(item.params.b) &&
      Number.isFinite(item.params.c) && item.params.c >= 0 && item.params.c < 1);
    const sequencedPool = applySequencingRules(validPool, seqCtx) as ShadowItem[];
    const skills = new Set(pool.map(item => item.skill));
    const history = seqCtx.administeredItems.filter(item => skills.has(item.skill) && !item.isPretest);
    const activeBlueprint = (blueprint ?? this.profile.blueprint).filter(constraint => skills.has(constraint.skill));
    const totalLength = Math.min(this.profile.globalMaxItems,
      activeBlueprint.reduce((sum, constraint) => sum + constraint.maxCount, 0) || this.profile.globalMaxItems);
    const { nextItem: shadowCandidate, shadowTest } = constructShadowTest(
      [...history, ...sequencedPool], theta, usedItemIds,
      { totalLength, blueprint: activeBlueprint, maxExposureRate: this.profile.maxExposureRate }
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
      const responseSummary = history.map(item => ({ skill: item.skill as string }));
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
    let available = shadowTest.filter((i) => !usedItemIds.has(i.id));
    if (available.length === 0) return null;

    const store = await getExposureStore();
    const stratum = thetaToStratum(theta);
    const stratumN = store.getStratumTotalSync(stratum);
    const useConditional = stratumN >= DEFAULT_MIN_STRATUM_N;

    // Gate candidates before scoring, using the D-P store's seven-stratum scale.
    // Its scale differs from the five-stratum conditional ExposureStore scale.
    const dpStratum = thetaToStratumDp(theta);
    const accepted = available.filter(item => acceptItem(_dpStore, item.id, dpStratum));
    const eligibleIds = available.map(item => item.id);
    if (accepted.length) available = accepted;

    const skillCounts: Partial<Record<SkillType, number>> = {};
    for (const item of history) skillCounts[item.skill] = (skillCounts[item.skill] ?? 0) + 1;

    // ── Step 3: Composite score with hybrid KL/MFI pre-ranking ──
    // Rank accepted items using current precision and operational response history.
    const scoredIds = new Set(state.responses.filter(response => !response.isPretest).map(response => response.itemId));
    const operationalAdministered = history.filter(item => scoredIds.has(item.id)).length;
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

      // Quality soft-gate: damp lower-IQS items so better-written questions
      // surface more often (low-stakes signal, never a hard exclusion).
      const q = qualityMultiplier(item.iqScore);

      const composite =
        (ALPHA * fisherInfo
          + klBoost
          - BETA  * exposurePenalty * fisherInfo
          + GAMMA * urgency * fisherInfo
          - DELTA * recencyPenalty) * q;

      return { item, composite, fisherInfo, selectionMethod };
    });

    scored.sort((a, b) => b.composite - a.composite);

    // Randomise only among near-optimal items. An unrestricted top-five lottery
    // can span the entire bank in small productive sections and erase adaptation.
    const topCandidates = scored.filter(candidate => candidate.composite >= scored[0].composite * .95)
      .slice(0, 5).map(candidate => candidate.item);

    // Sequencing has already been applied to the full pool, before shortlisting.
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    const chosenScore = scored.find((s) => s.item.id === chosen.id)?.composite ?? 0;

    // Record the item actually delivered using the same stratum used for gating.
    recordSelection(_dpStore, chosen.id, dpStratum, eligibleIds);
    if (_dpStore.sessionsSinceLastUpdate >= 100) updateAlphas(_dpStore, this.profile.maxExposureRate);
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

/**
 * Bootstrap the module-level Davey-Parshall store from DB item exposure counts.
 * Call once at server startup after the ExposureStore bootstrap so over-exposed
 * items receive appropriate α penalties instead of always defaulting to α=1.0.
 */
export function bootstrapDpStore(
  itemExposures: ReadonlyMap<string, number>,
  totalSessions: number,
): void {
  bootstrapDpStoreFromCounts(_dpStore, itemExposures, totalSessions);
}
