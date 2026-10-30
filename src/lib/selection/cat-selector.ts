/**
 * CATSelector — the single item-selection pipeline for live adaptive sessions.
 *
 * Composes, in order:
 *   1. Validity + sequencing filters (set integrity, pretest spacing,
 *      productive-last, skill rotation)
 *   2. Davey–Parshall α-gate (stratum-conditional exposure control) on the
 *      eligible pool — BEFORE the shadow test, so a rejected over-exposed item
 *      is replaced by the next-best one instead of being re-selected from a
 *      shadow test that already contained only the top-information items
 *   3. Shadow-test assembly for the remaining blueprint slots
 *      (`shadowStrategy`: "greedy" = psychometrics/shadow-test.ts,
 *       "lp" = Lagrangian relaxation in psychometrics/shadow-test-solver.ts)
 *   4. Composite scoring — smooth KL/MFI information blend × blueprint urgency,
 *      exposure residual and item-quality multiplier
 *   5. Constrained randomisation among near-optimal candidates (≥95% of best)
 *
 * Faz 1 (docs/ADAPTIVE_ENGINE_ROADMAP_2026_10.md): this is the only selector
 * the live flow and the simulation harness call. The former
 * `AssessmentEngine.getNextItem` / `selector.ts` path was removed; its smooth
 * KL/MFI blend (`hybridAlpha`) now lives here, and the always-zero recency
 * term (δ) was dropped.
 *
 * Usage:
 *   const selector = new CATSelector(profile);
 *   const next = await selector.selectNext(pool, state, ctx);
 */

import { information } from "../assessment-engine/irt.js";
import { Item, SkillType, BlueprintConstraint, SessionState } from "../assessment-engine/types.js";
import { constructShadowTest } from "../psychometrics/shadow-test.js";
import { constructShadowTestLP } from "../psychometrics/shadow-test-solver.js";
import { getExposureStore } from "../assessment-engine/exposure-store.js";
import { thetaToStratum, sympsonHetterWeight, DEFAULT_MIN_STRATUM_N } from "../assessment-engine/sympson-heter.js";
import { applySequencingRules, SequencingContext } from "./sequencing-rules.js";
import { ProductLineProfile } from "../product-lines/profiles.js";
import { hybridAlpha, klInformation } from "../psychometrics/kl-information.js";
import { selectItemRL, buildRlState, type RlItem } from "../psychometrics/rl-item-selection.js";
import {
  acceptItem,
  thetaToStratumDp,
  recordSelection,
  createExposureStore,
  maybeUpdateAlphas,
  bootstrapDpStoreFromCounts,
  DP_UPDATE_INTERVAL_SESSIONS,
  type ExposureStore as DPExposureStore,
} from "./exposure-control-davey-parshall.js";

// ─── Davey-Parshall singleton store (in-process; survives across requests) ────
// Persisted in-memory; for multi-process/multi-node deployments, replace with
// a shared Redis-backed store (interface-compatible). Roadmap Faz 5.
let _dpStore: DPExposureStore = createExposureStore();

// ─── Composite Scoring Weights ─────────────────────────────────────────────
// α — measurement information (smooth KL/MFI blend, see hybridAlpha)
// β — exposure residual (Davey-Parshall α-gate does the main control)
// γ — blueprint urgency (prioritise under-represented skills)
const ALPHA = 0.50;
const BETA  = 0.20;
const GAMMA = 0.20;

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

/** Candidates within this share of the best composite score enter the final lottery. */
const NEAR_OPTIMAL_SHARE = 0.95;
const MAX_LOTTERY_SIZE = 5;

/** Minimum accepted candidates for the α-gate to stay in force. */
const MIN_GATED_POOL = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShadowStrategy = "greedy" | "lp";

export interface CATSelectorOptions {
  /** Shadow-test assembler. Default "greedy" (see roadmap Faz 1 A/B note). */
  shadowStrategy?: ShadowStrategy;
}

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
  /** KL weight used for this selection (1 = pure KL, 0 = pure Fisher). */
  klWeight?: number;
}

// ─── CATSelector ──────────────────────────────────────────────────────────────

export class CATSelector {
  private profile: ProductLineProfile;
  private shadowStrategy: ShadowStrategy;

  constructor(profile: ProductLineProfile, options: CATSelectorOptions = {}) {
    this.profile = profile;
    this.shadowStrategy = options.shadowStrategy ?? "greedy";
  }

  private assembleShadowTest(
    pool: ShadowItem[],
    theta: number,
    usedItemIds: Set<string>,
    totalLength: number,
    blueprint: BlueprintConstraint[],
  ): { shadowTest: ShadowItem[]; nextItem: ShadowItem | null } {
    const config = { totalLength, blueprint, maxExposureRate: this.profile.maxExposureRate };
    if (this.shadowStrategy === "lp") {
      const { shadowTest, nextItem } = constructShadowTestLP(pool, theta, usedItemIds, config);
      return { shadowTest, nextItem };
    }
    return constructShadowTest(pool, theta, usedItemIds, config);
  }

  /**
   * Select the next item for a CAT session.
   *
   * @param pool        Item pool for the current skill section (operational + pretest)
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
    // otherwise blueprint counts, set continuity and KL/MFI blending stay at zero.
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

    // ── Davey–Parshall α-gate on the eligible pool (seven-stratum scale) ──────
    // Gating before shadow assembly is what makes exposure control bite: an
    // over-exposed item that fails the gate is replaced by the next-best item.
    // The gate is lifted when it would leave fewer candidates than the shadow
    // test still needs, so a thin section never starves.
    const dpStratum = thetaToStratumDp(theta);
    const eligibleIds = sequencedPool.map(item => item.id);
    const slotsRemaining = Math.max(1, totalLength - history.length);
    const gatedPool = sequencedPool.filter(item => acceptItem(_dpStore, item.id, dpStratum));
    const candidatePool = gatedPool.length >= Math.min(slotsRemaining, MIN_GATED_POOL) ? gatedPool : sequencedPool;

    const { nextItem: shadowCandidate, shadowTest } = this.assembleShadowTest(
      [...history, ...candidatePool], theta, usedItemIds, totalLength, activeBlueprint,
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
    const available = shadowTest.filter((i) => !usedItemIds.has(i.id));
    if (available.length === 0) return null;

    const store = await getExposureStore();
    const stratum = thetaToStratum(theta);
    const stratumN = store.getStratumTotalSync(stratum);
    const useConditional = stratumN >= DEFAULT_MIN_STRATUM_N;

    const skillCounts: Partial<Record<SkillType, number>> = {};
    for (const item of history) skillCounts[item.skill] = (skillCounts[item.skill] ?? 0) + 1;

    // ── Composite score with a smooth KL/MFI information blend ──
    // α(SEM, n) → 1 early (broad KL search), → 0 later (local Fisher precision).
    const scoredIds = new Set(state.responses.filter(response => !response.isPretest).map(response => response.itemId));
    const operationalAdministered = history.filter(item => scoredIds.has(item.id)).length;
    const currentSem = state.sem ?? 1.0;
    const klWeight = hybridAlpha(currentSem, operationalAdministered);

    const fisherRaw = available.map(item => information(theta, item.params));
    const klRaw = klWeight > 0.01 ? available.map(item => klInformation(theta, currentSem, item.params)) : null;
    const maxFisher = Math.max(...fisherRaw) || 1;
    const maxKl = klRaw ? (Math.max(...klRaw) || 1) : 1;

    const scored = available.map((item, index) => {
      const fisherNorm = fisherRaw[index]! / maxFisher;
      const klNorm = klRaw ? klRaw[index]! / maxKl : fisherNorm;
      const info = klWeight * klNorm + (1 - klWeight) * fisherNorm;

      // Exposure residual (D-P handles the main control)
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

      // Quality soft-gate: damp lower-IQS items so better-written questions
      // surface more often (low-stakes signal, never a hard exclusion).
      const q = qualityMultiplier(item.iqScore);

      const composite = (ALPHA * info - BETA * exposurePenalty * info + GAMMA * urgency * info) * q;
      return { item, composite };
    });

    scored.sort((a, b) => b.composite - a.composite);

    // Randomise only among near-optimal items. An unrestricted top-five lottery
    // can span the entire bank in small productive sections and erase adaptation.
    const topCandidates = scored.filter(candidate => candidate.composite >= scored[0].composite * NEAR_OPTIMAL_SHARE)
      .slice(0, MAX_LOTTERY_SIZE).map(candidate => candidate.item);

    // Sequencing has already been applied to the full pool, before shortlisting.
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    const chosenScore = scored.find((s) => s.item.id === chosen.id)?.composite ?? 0;

    // Record the item actually delivered using the same stratum used for gating.
    recordSelection(_dpStore, chosen.id, dpStratum, eligibleIds, seqCtx.sessionId);
    maybeUpdateAlphas(_dpStore, this.profile.maxExposureRate, DP_UPDATE_INTERVAL_SESSIONS);
    await store.recordExposure(chosen.id, theta);

    return {
      item: chosen,
      shadowTestSize: shadowTest.length,
      compositeScore: chosenScore,
      selectionStrategy: "composite",
      klWeight,
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

/** @internal Test / simulation isolation only — fresh Davey-Parshall store. */
export function _resetDpStoreForTests(): void {
  _dpStore = createExposureStore();
}

/** @internal Read-only access for diagnostics in tests and simulations. */
export function _inspectDpStore(): Readonly<DPExposureStore> {
  return _dpStore;
}
