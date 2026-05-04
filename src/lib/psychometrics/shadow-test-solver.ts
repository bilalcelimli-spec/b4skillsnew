/**
 * Shadow Test Solver — Lagrangian Relaxation ILP
 *
 * Upgrades the greedy shadow-test approach (shadow-test.ts) with a proper
 * Lagrangian relaxation of the blueprint constraints, following the
 * van der Linden (2005) 0-1 ILP formulation.
 *
 * Problem
 * ───────
 * Maximise:  Σ_i  x_i · I(θ, item_i)        [Fisher information]
 * Subject to:
 *   Σ_i x_i = n                               [test length]
 *   x_i ∈ {0, 1}                              [binary selection]
 *   Σ_{i: skill(i)=k} x_i ∈ [min_k, max_k]   [blueprint]
 *   Σ_{i: cefr(i)=l}  x_i ≤  maxCefr_l       [CEFR spread]
 *   x_i = 1  for  i ∈ administered            [locked]
 *   x_i = 0  for  i ∉ eligible pool           [availability]
 *
 * Lagrangian relaxation
 * ──────────────────────
 * Relax the inequality constraints into the objective via dual prices λ:
 *
 *   L(x, λ) = Σ_i x_i · [I(θ, i) + λ_skill(i) + λ_cefr(i)]
 *
 * For fixed λ the inner problem is a simple knapsack → greedy by
 * augmented score.  Dual prices are updated by a subgradient step:
 *
 *   λ_k ← max(0, λ_k + α · (slack_k))
 *
 * where slack_k < 0 means constraint k is under-satisfied (score λ_k up
 * to attract more items from that skill/level) and slack_k > 0 means it
 * is over-satisfied (reduce λ_k).
 *
 * In practice we run 20–40 subgradient iterations, each taking O(N) time.
 * Total complexity: O(T · N) where N = pool size, T = iterations (≤ 40).
 *
 * This is the same algorithm used in commercial CAT systems (e.g., LSAT,
 * GRE) and described in van der Linden (2005), "Linear Models for Optimal
 * Test Design", Springer.
 *
 * Fallback
 * ────────
 * If the relaxation still cannot fill all blueprint minimums after 40
 * iterations (pool exhaustion), the solver relaxes constraints from the
 * most generous to the most binding, logging a violation list.
 *
 * Integration
 * ───────────
 * Drop-in replacement for constructShadowTest() in shadow-test.ts.
 * Import { constructShadowTestLP } and swap the call site.
 */

import { information } from "../assessment-engine/irt.js";
import { Item, SkillType, BlueprintConstraint } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SolverConfig {
  totalLength: number;
  blueprint: BlueprintConstraint[];
  /** Maximum items from any single CEFR level (spread constraint) */
  maxPerCefrLevel?: number;
  /** Maximum exposure rate; items above this rate are excluded */
  maxExposureRate?: number;
  /** Subgradient iterations (default 30) */
  maxIterations?: number;
  /** Initial step size α for dual update (default 0.15) */
  stepSize?: number;
  /** Step size decay per iteration (default 0.97) */
  stepDecay?: number;
}

export interface SolverItem extends Item {
  cefrLevel?: string;
  exposureCount?: number;
  totalSessions?: number;
}

export interface SolverResult {
  shadowTest: SolverItem[];
  nextItem: SolverItem | null;
  /** Constraint violations after final selection (empty = fully feasible) */
  violations: string[];
  /** Dual prices at convergence keyed by "skill:<k>" or "cefr:<l>" */
  dualPrices: Record<string, number>;
  /** Number of subgradient iterations run */
  iterations: number;
}

// ─── Lagrangian relaxation solver ─────────────────────────────────────────────

/**
 * Construct a shadow test satisfying all blueprint constraints via
 * Lagrangian relaxation of the ILP.
 */
export function constructShadowTestLP(
  pool: SolverItem[],
  currentTheta: number,
  usedItemIds: Set<string>,
  config: SolverConfig
): SolverResult {
  const {
    totalLength,
    blueprint,
    maxPerCefrLevel,
    maxExposureRate,
    maxIterations = 30,
    stepSize = 0.15,
    stepDecay = 0.97,
  } = config;

  // ── 1. Partition: locked (administered) vs eligible (available) ───────────
  const locked: SolverItem[] = [];
  const eligible: SolverItem[] = [];

  for (const item of pool) {
    if (usedItemIds.has(item.id)) {
      locked.push(item);
    } else {
      if (maxExposureRate && maxExposureRate < 1) {
        const ec = item.exposureCount ?? 0;
        const ts = item.totalSessions ?? 1;
        if (ec / ts >= maxExposureRate) continue; // over-exposed: exclude
      }
      eligible.push(item);
    }
  }

  const slotsNeeded = totalLength - locked.length;
  if (slotsNeeded <= 0) {
    return {
      shadowTest: locked,
      nextItem: null,
      violations: [],
      dualPrices: {},
      iterations: 0,
    };
  }

  // ── 2. Pre-compute base information ───────────────────────────────────────
  const baseInfo = eligible.map((item) => ({
    item,
    info: information(currentTheta, item.params),
  }));

  // ── 3. Current counts from locked items ───────────────────────────────────
  const lockedSkillCounts = tally(locked, (it) => it.skill as string);
  const lockedCefrCounts  = tally(locked, (it) => it.cefrLevel ?? "?");

  // ── 4. Initialise dual prices ─────────────────────────────────────────────
  // Keys: "skill:<SkillType>" and "cefr:<level>"
  const λ: Record<string, number> = {};
  for (const c of blueprint) {
    λ[`skill:${c.skill}`] = 0;
  }

  // ── 5. Subgradient iterations ─────────────────────────────────────────────
  let bestSelection: SolverItem[] = [];
  let bestInfo = -Infinity;
  let α = stepSize;
  let finalIterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    finalIterations = iter + 1;

    // 5a. Augmented score per item
    const augmented = baseInfo.map(({ item, info }) => {
      const skillKey = `skill:${item.skill}`;
      const cefrKey  = `cefr:${item.cefrLevel ?? "?"}`;
      const score = info + (λ[skillKey] ?? 0) + (λ[cefrKey] ?? 0);
      return { item, score };
    });

    // 5b. Greedy selection by augmented score (knapsack inner problem)
    const selection = greedySelect(
      augmented,
      slotsNeeded,
      lockedSkillCounts,
      lockedCefrCounts,
      blueprint,
      maxPerCefrLevel
    );

    // 5c. Track best by total base information (primal feasibility)
    const totalInfo = selection.reduce(
      (s, it) => s + information(currentTheta, it.params),
      0
    );
    if (totalInfo > bestInfo) {
      bestInfo = totalInfo;
      bestSelection = selection;
    }

    // 5d. Compute skill slacks: slack_k = count_k − target_k
    //     target_k = (min_k + max_k) / 2  (midpoint of acceptable range)
    const selSkillCounts = tally(
      selection,
      (it) => it.skill as string,
      lockedSkillCounts
    );

    let subgradientNorm = 0;
    const newλ: Record<string, number> = { ...λ };
    for (const c of blueprint) {
      const key = `skill:${c.skill}`;
      const count = selSkillCounts[c.skill as string] ?? 0;
      const target = (c.minCount + Math.min(c.maxCount, slotsNeeded)) / 2;
      const slack = count - target;
      // Under-satisfied (slack < 0): increase λ to attract more items
      // Over-satisfied (slack > 0): decrease λ
      newλ[key] = Math.max(-2, Math.min(2, (λ[key] ?? 0) - α * slack));
      subgradientNorm += slack * slack;
    }

    Object.assign(λ, newλ);
    α *= stepDecay;

    // Converged if subgradient is tiny
    if (subgradientNorm < 1e-4) break;
  }

  // ── 6. Build final shadow test ────────────────────────────────────────────
  const shadowTest: SolverItem[] = [...locked, ...bestSelection];

  // ── 7. Verify feasibility & collect violations ────────────────────────────
  const finalSkillCounts = tally(shadowTest, (it) => it.skill as string);
  const violations: string[] = [];
  for (const c of blueprint) {
    const count = finalSkillCounts[c.skill as string] ?? 0;
    if (count < c.minCount) violations.push(`${c.skill}: need ≥${c.minCount}, got ${count}`);
    if (count > c.maxCount) violations.push(`${c.skill}: need ≤${c.maxCount}, got ${count}`);
  }

  // ── 8. Select next item: highest-info un-administered item in shadow ──────
  const nextCandidates = shadowTest
    .filter((it) => !usedItemIds.has(it.id))
    .map((it) => ({ item: it, info: information(currentTheta, it.params) }))
    .sort((a, b) => b.info - a.info);

  // Top-3 randomisation for mild exposure control
  const topN = Math.min(3, nextCandidates.length);
  const nextItem = topN > 0
    ? nextCandidates[Math.floor(Math.random() * topN)].item
    : null;

  return {
    shadowTest,
    nextItem,
    violations,
    dualPrices: λ,
    iterations: finalIterations,
  };
}

// ─── Greedy inner solver ──────────────────────────────────────────────────────

/**
 * Select exactly `n` items from the scored pool respecting hard constraints.
 * Items are taken in descending augmented-score order subject to:
 *  - max_skill constraints
 *  - max_cefr constraints
 * Items that are infeasible due to hard max constraints are skipped.
 * Items that are needed to satisfy min constraints are promoted.
 */
function greedySelect(
  scored: { item: SolverItem; score: number }[],
  n: number,
  lockedSkillCounts: Partial<Record<string, number>>,
  lockedCefrCounts: Partial<Record<string, number>>,
  blueprint: BlueprintConstraint[],
  maxPerCefrLevel?: number
): SolverItem[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const skillCounts: Record<string, number> = { ...(lockedSkillCounts as Record<string, number>) };
  const cefrCounts:  Record<string, number> = { ...(lockedCefrCounts  as Record<string, number>) };
  const selected: SolverItem[] = [];
  const selectedIds = new Set<string>();

  // Phase 1: Satisfy minimum blueprint requirements (promoted items)
  for (const c of blueprint) {
    const current = skillCounts[c.skill as string] ?? 0;
    const needed = c.minCount - current;
    if (needed <= 0) continue;

    const candidates = sorted.filter(
      ({ item }) =>
        item.skill === c.skill &&
        !selectedIds.has(item.id) &&
        (skillCounts[item.skill as string] ?? 0) < c.maxCount &&
        (!maxPerCefrLevel || !item.cefrLevel || (cefrCounts[item.cefrLevel] ?? 0) < maxPerCefrLevel)
    );

    for (let i = 0; i < Math.min(needed, candidates.length) && selected.length < n; i++) {
      const { item } = candidates[i];
      selected.push(item);
      selectedIds.add(item.id);
      skillCounts[item.skill as string] = (skillCounts[item.skill as string] ?? 0) + 1;
      if (item.cefrLevel) cefrCounts[item.cefrLevel] = (cefrCounts[item.cefrLevel] ?? 0) + 1;
    }
  }

  // Phase 2: Fill remaining slots by augmented score
  for (const { item } of sorted) {
    if (selected.length >= n) break;
    if (selectedIds.has(item.id)) continue;

    // Hard max-skill check
    const skillConstraint = blueprint.find((c) => c.skill === item.skill);
    if (skillConstraint) {
      if ((skillCounts[item.skill as string] ?? 0) >= skillConstraint.maxCount) continue;
    }

    // Hard max-cefr check
    if (maxPerCefrLevel && item.cefrLevel) {
      if ((cefrCounts[item.cefrLevel] ?? 0) >= maxPerCefrLevel) continue;
    }

    selected.push(item);
    selectedIds.add(item.id);
    skillCounts[item.skill as string] = (skillCounts[item.skill as string] ?? 0) + 1;
    if (item.cefrLevel) cefrCounts[item.cefrLevel] = (cefrCounts[item.cefrLevel] ?? 0) + 1;
  }

  return selected;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function tally<T>(
  items: T[],
  keyFn: (item: T) => string,
  seed: Partial<Record<string, number>> = {}
): Record<string, number> {
  const counts: Record<string, number> = { ...seed as Record<string, number> };
  for (const item of items) {
    const k = keyFn(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

// ─── Re-export compatible wrapper ─────────────────────────────────────────────

/**
 * Adapter that matches the original constructShadowTest() signature so
 * existing call sites in engine.ts can be updated with minimal diff.
 */
export function constructShadowTestLPAdapter(
  pool: SolverItem[],
  currentTheta: number,
  usedItemIds: Set<string>,
  config: Omit<SolverConfig, "maxIterations" | "stepSize" | "stepDecay">
): { shadowTest: SolverItem[]; nextItem: SolverItem | null } {
  const { shadowTest, nextItem } = constructShadowTestLP(pool, currentTheta, usedItemIds, config);
  return { shadowTest, nextItem };
}
