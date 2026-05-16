import { information } from "./irt";
import { klInformation } from "../psychometrics/kl-information.js";
import { Item, BlueprintConstraint, SkillType } from "./types";
import { getExposureStore } from "./exposure-store.js";
import {
  sympsonHetterWeight,
  thetaToStratum,
  DEFAULT_MIN_STRATUM_N,
} from "./sympson-heter.js";

// Max share of a single item *within* a θ stratum (Sympson–Hetter style cap).
const MAX_EXPOSURE_RATE = 0.20;

/**
 * Davey–Parshall (2005) exposure weight.
 *
 * Compared to plain Sympson–Hetter (which hard-caps once r > k), DP applies a
 * *continuous* penalty proportional to how much the observed rate exceeds the
 * target, preventing high-information items from hitting the cap all at once.
 *
 * w_DP(r, target) = min(1, target / r)^alpha   for r > 0
 *
 * alpha = 2 gives smoother decay than SH (alpha = 1) while still ensuring
 * ψ → 0 as r → ∞.
 *
 * Reference: Davey, T. C. & Parshall, C. G. (2005). New algorithms for item
 * selection and exposure control with the computerized adaptive test. Journal
 * of Educational Measurement, 42(3), 271-292.
 */
function daveyParshallWeight(
  observedRate: number,
  targetRate: number,
  alpha = 2
): number {
  if (observedRate <= 0 || observedRate <= targetRate) return 1.0;
  return Math.pow(targetRate / observedRate, alpha);
}

/**
 * Compute the Davey-Parshall target exposure rate for the current test.
 * Based on the pool size: each item should be selected 1/sqrt(eligible pool) of the time.
 */
function dpTargetRate(eligiblePoolSize: number): number {
  return Math.min(MAX_EXPOSURE_RATE, 1 / Math.max(1, Math.sqrt(eligiblePoolSize)));
}

/**
 * Logistic sigmoid function.
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Smooth KL/MFI blend weight α ∈ [0, 1].
 *
 *   α → 1 : use KL information (high uncertainty / early items)
 *   α → 0 : use MFI          (reliable estimate / later items)
 *
 * Unlike the hard binary switch in selectMethod(), this is a *continuous*
 * transition: when SEM is near 0.40 or n is near 5, α takes intermediate
 * values so the transition is gradual and noise-free.
 *
 * Mathematically:
 *   α = σ((SEM − 0.40) / 0.15) × σ((5 − n) / 2)
 *
 * where σ is the logistic function. The two factors are independent:
 *   - the first factor rises as SEM climbs above 0.40
 *   - the second factor rises as n falls below 5
 * Either condition alone triggers partial KL weighting.
 */
function hybridAlpha(sem: number, itemsAdministered: number): number {
  return sigmoid((sem - 0.40) / 0.15) * sigmoid((5 - itemsAdministered) / 2);
}

/**
 * Track that an item was administered at a given ability estimate.
 * Prefer passing `atTheta` so conditional Sympson–Hetter stats are updated.
 */
export function recordItemExposure(itemId: string, atTheta?: number): void {
  getExposureStore()
    .then((store) => store.recordExposure(itemId, atTheta))
    .catch(() => {});
}

/**
 * Select the best item from the pool using a KL/MFI hybrid information criterion
 * with Davey–Parshall + Sympson-Hetter exposure control.
 *
 * Improvements over the previous MFI-only version:
 *
 *  1. **KL/MFI smooth hybrid** — Bayesian KL information (Chang & Ying 1996) is
 *     blended with Fisher MFI via α(SEM, n). Early items (high SEM, few responses)
 *     lean toward KL (broader search); later items lean toward MFI (local precision).
 *     The blend is a continuous sigmoid function — no hard binary switch.
 *
 *  2. **b-targeted final selection** — After ranking by composite score, the winner
 *     is the item with minimum |b − θ| among the top-3 candidates. This matches the
 *     item difficulty to the current ability estimate, maximising conditional Fisher
 *     information exactly at θ̂ rather than picking randomly from the top set.
 *
 *  3. **Pool-exhaustion emergency guard** — When the remaining eligible items for a
 *     skill ≤ the remaining minCount gap, exposure penalties are bypassed and the
 *     engine forces a selection from that skill. This prevents blueprint infeasibility
 *     when high-exposure items have crowded out a skill's pool.
 *
 * @param pool              Full item pool (operational + pretest)
 * @param currentTheta      Current ability estimate θ̂
 * @param usedItemIds       Set of already-administered item IDs
 * @param topN              Unused (kept for API compatibility; internally uses 3)
 * @param blueprint         Content blueprint constraints
 * @param currentSkillCounts Items administered per skill so far
 * @param sem               Current SEM (default 1.0 = high uncertainty → full KL)
 * @param operationalCount  Operational items administered so far (default 0)
 */
export async function selectNextItem(
  pool: Item[],
  currentTheta: number,
  usedItemIds: Set<string>,
  topN: number = 5,
  blueprint?: BlueprintConstraint[],
  currentSkillCounts?: Partial<Record<SkillType, number>>,
  sem: number = 1.0,
  operationalCount: number = 0
): Promise<Item | null> {
  const availableItems = pool.filter(
    (item) => !usedItemIds.has(item.id) && item.status !== "RETIRED"
  );
  if (availableItems.length === 0) {
    return null;
  }

  const store = await getExposureStore();
  const stratum = thetaToStratum(currentTheta);
  const stratumN = store.getStratumTotalSync(stratum);
  const useConditional = stratumN >= DEFAULT_MIN_STRATUM_N;

  // ── 1. Pool-exhaustion emergency guard ─────────────────────────────────────
  // When the remaining available items for a constrained skill can no longer
  // satisfy its minCount gap, we MUST select from that skill immediately —
  // bypassing exposure penalties to avoid blueprint infeasibility.
  if (blueprint && currentSkillCounts) {
    const emergencySkills = new Set<SkillType>();
    for (const constraint of blueprint) {
      const count = currentSkillCounts[constraint.skill] ?? 0;
      const remainingNeeded = constraint.minCount - count;
      if (remainingNeeded <= 0) continue;
      const skillAvailable = availableItems.filter(it => it.skill === constraint.skill).length;
      if (skillAvailable > 0 && skillAvailable <= remainingNeeded) {
        emergencySkills.add(constraint.skill);
      }
    }

    if (emergencySkills.size > 0) {
      const emergencyPool = availableItems.filter(it => emergencySkills.has(it.skill));
      if (emergencyPool.length > 0) {
        // Pure MFI — no exposure penalty during emergency forced selection.
        const scored = emergencyPool.map(item => ({
          item,
          score: information(currentTheta, item.params),
        }));
        scored.sort((a, b) => b.score - a.score);
        const top3 = scored.slice(0, Math.min(3, scored.length));
        const selected = top3.reduce((best, c) =>
          Math.abs(c.item.params.b - currentTheta) < Math.abs(best.item.params.b - currentTheta)
            ? c : best
        ).item;
        await store.recordExposure(selected.id, currentTheta);
        return selected;
      }
    }
  }

  // ── 2. Blueprint enforcement (normal path) ──────────────────────────────────
  let candidatePool = availableItems;

  if (blueprint && blueprint.length > 0 && currentSkillCounts) {
    const unfulfilled = blueprint.filter((constraint) => {
      const count = currentSkillCounts[constraint.skill] || 0;
      return count < constraint.minCount;
    });

    if (unfulfilled.length > 0) {
      const unfulfilledSkills = new Set(unfulfilled.map((c) => c.skill));
      const blueprintFiltered = availableItems.filter((item) => unfulfilledSkills.has(item.skill));
      if (blueprintFiltered.length > 0) {
        candidatePool = blueprintFiltered;
      }
    } else {
      const cappedSkills = new Set(
        blueprint
          .filter((c) => (currentSkillCounts[c.skill] || 0) >= c.maxCount)
          .map((c) => c.skill)
      );
      if (cappedSkills.size > 0) {
        const capped = availableItems.filter((item) => !cappedSkills.has(item.skill));
        if (capped.length > 0) {
          candidatePool = capped;
        }
      }
    }
  }

  // ── 3. KL/MFI hybrid scoring with exposure control ─────────────────────────
  // α → 1 means "weight KL heavily"; α → 0 means "weight MFI heavily".
  const alpha = hybridAlpha(sem, operationalCount);

  // Compute raw KL and MFI scores for each candidate in one pass.
  const klRaw  = candidatePool.map(item => klInformation(currentTheta, sem, item.params));
  const mfiRaw = candidatePool.map(item => information(currentTheta, item.params));

  // Normalise to [0, 1] so the two criteria are on a common scale before blending.
  const maxKl  = Math.max(...klRaw)  || 1;
  const maxMfi = Math.max(...mfiRaw) || 1;

  const targetRate = dpTargetRate(candidatePool.length);

  const scoredItems = candidatePool.map((item, i) => {
    const klNorm  = klRaw[i]!  / maxKl;
    const mfiNorm = mfiRaw[i]! / maxMfi;

    // Exposure weights (most conservative of DP and SH wins)
    const rate = useConditional
      ? store.getConditionalExposureRateSync(item.id, stratum)
      : store.getExposureRateSync(item.id);
    const dpWeight = daveyParshallWeight(rate, targetRate);
    const shWeight = sympsonHetterWeight(rate, MAX_EXPOSURE_RATE);
    const exposureWeight = Math.min(dpWeight, shWeight);

    const composite = (alpha * klNorm + (1 - alpha) * mfiNorm) * exposureWeight;
    return { item, score: composite };
  });

  scoredItems.sort((a, b) => b.score - a.score);

  // ── 4. b-targeted final selection from top-3 ───────────────────────────────
  // Among the three highest-scoring items, select the one whose difficulty b
  // is closest to the current theta. When the item is perfectly targeted
  // (b ≈ θ), its 3PL information is maximised at exactly the current estimate —
  // the same principle behind maximum-likelihood item selection in classical CAT.
  const top3 = scoredItems.slice(0, Math.min(3, scoredItems.length));
  const selected = top3.reduce((best, candidate) => {
    const diffBest = Math.abs(best.item.params.b - currentTheta);
    const diffCand = Math.abs(candidate.item.params.b - currentTheta);
    return diffCand < diffBest ? candidate : best;
  }).item;

  await store.recordExposure(selected.id, currentTheta);
  return selected;
}
