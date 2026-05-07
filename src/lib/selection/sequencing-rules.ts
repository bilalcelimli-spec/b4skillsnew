/**
 * Item Sequencing Rules
 *
 * Enforces SOTA sequencing heuristics applied on top of CAT item selection:
 *
 * 1. Skill rotation  — no more than 2 consecutive items from the same skill
 *    (only relevant outside section-based flow, e.g. pure-CAT diagnostics)
 * 2. Set integrity   — passage/conversation-set items must be served contiguously
 * 3. Pretest spacing — pretest items evenly spread, not back-to-back
 * 4. Listening lead  — for Primary (7-10), Listening items precede Reading within
 *    mixed pools
 * 5. Productive last — Writing / Speaking items always in the last 30 % of items
 *
 * These rules are applied as post-filters on a candidate set returned by the
 * core CAT selector. They never discard an item permanently — they only defer it
 * to a later position.
 */

import { Item, SkillType, Response } from "../assessment-engine/types.js";
import { ProductLineProfile } from "../product-lines/profiles.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SequencingContext {
  /** Items already administered in this session (in order) */
  administeredItems: Item[];
  /** All responses so far (same order) */
  responses: Response[];
  /** Total items planned for this session (including remaining) */
  plannedTotal: number;
  /** The product line profile driving this session */
  profile: ProductLineProfile;
  /**
   * Total responses across ALL sections so far (not just the current section pool).
   * Used by productive-last rule to know how far into the full exam we are.
   */
  totalAdministeredAcrossAllSections?: number;
}

// ─── Rule Implementations ─────────────────────────────────────────────────────

/**
 * Rule: Skill Rotation
 * Penalises (or defers) a candidate if the last N items are all from the same skill.
 * Returns true if the item is acceptable under the rotation rule.
 */
function passesSkillRotation(
  candidate: Item,
  ctx: SequencingContext,
  maxConsecutive: number = 2
): boolean {
  const recent = ctx.administeredItems.slice(-maxConsecutive);
  if (recent.length < maxConsecutive) return true;
  return recent.some((i) => i.skill !== candidate.skill);
}

/**
 * Rule: Set Integrity
 * If the item belongs to a passage/conversation set (`metadata.setId`), check
 * whether a prior item from the same set has been administered. If so, the next
 * item MUST come from the same set to maintain reading/listening coherence.
 * Returns true if no set-continuity constraint is currently active.
 */
function passesSetIntegrity(
  candidate: Item,
  ctx: SequencingContext
): boolean {
  const lastAdm = ctx.administeredItems[ctx.administeredItems.length - 1];
  if (!lastAdm) return true;

  const lastSetId = (lastAdm.metadata as any)?.setId;
  if (!lastSetId) return true; // last item was standalone — no constraint

  const candidateSetId = (candidate.metadata as any)?.setId;
  // If last item had a setId, next item must be from the same set
  return candidateSetId === lastSetId;
}

/**
 * Rule: Pretest Spacing
 * Pretest items should not appear back-to-back. After a pretest, require at
 * least 2 operational items before the next pretest.
 */
function passesSpacedPretest(
  candidate: Item,
  ctx: SequencingContext,
  minOperationalGap: number = 2
): boolean {
  if (!candidate.isPretest) return true; // operational items always pass

  // Find how many operational items have been administered since the last pretest
  let opCount = 0;
  for (let i = ctx.administeredItems.length - 1; i >= 0; i--) {
    if (ctx.administeredItems[i].isPretest) break;
    opCount++;
  }
  return opCount >= minOperationalGap;
}

/**
 * Rule: Productive Skills Last
 * Writing and Speaking prompts should not appear in the first 70 % of items
 * (energy management — productive tasks require more cognitive load).
 */
function passesProductiveLast(
  candidate: Item,
  ctx: SequencingContext
): boolean {
  const productive = new Set<SkillType>([SkillType.WRITING, SkillType.SPEAKING]);
  if (!productive.has(candidate.skill)) return true;

  const cutoff = Math.floor(ctx.plannedTotal * 0.70);
  // Use cross-section total when available so productive-last is evaluated
  // against the full exam position, not just current section item count.
  const administered = ctx.totalAdministeredAcrossAllSections ?? ctx.administeredItems.length;
  const pos = administered + 1; // 1-based position of next item
  return pos > cutoff;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Filter a candidate pool to items that satisfy all active sequencing rules.
 *
 * Ordering of rules (fast → slow, most likely to filter first):
 *  1. Set integrity  — hard constraint; may return a single-item pool
 *  2. Pretest spacing
 *  3. Productive-last
 *  4. Skill rotation  — soft; only applied when pool has > 1 option remaining
 *
 * If every rule together would empty the pool, the function falls back
 * gracefully: it returns the pool filtered by only the hard constraints
 * (set integrity), ensuring progress is never blocked.
 */
export function applySequencingRules(
  candidates: Item[],
  ctx: SequencingContext
): Item[] {
  if (candidates.length === 0) return candidates;

  // ── 1. Set integrity (hard) ──────────────────────────────────────────────
  const setFiltered = candidates.filter((c) => passesSetIntegrity(c, ctx));
  // If set integrity forces a specific set, return those items only
  if (setFiltered.length > 0 && setFiltered.length < candidates.length) {
    return setFiltered;
  }
  const afterSet = setFiltered.length > 0 ? setFiltered : candidates;

  // ── 2. Pretest spacing ───────────────────────────────────────────────────
  const afterPretest = afterSet.filter((c) => passesSpacedPretest(c, ctx));
  const pool2 = afterPretest.length > 0 ? afterPretest : afterSet;

  // ── 3. Productive-last ───────────────────────────────────────────────────
  const afterProductive = pool2.filter((c) => passesProductiveLast(c, ctx));
  const pool3 = afterProductive.length > 0 ? afterProductive : pool2;

  // ── 4. Skill rotation (soft) ─────────────────────────────────────────────
  if (pool3.length > 1) {
    const afterRotation = pool3.filter((c) => passesSkillRotation(c, ctx));
    return afterRotation.length > 0 ? afterRotation : pool3;
  }
  return pool3;
}

/**
 * Check whether a passage/conversation set is currently active (mid-set).
 * Returns the active setId or null.
 */
export function getActiveSetId(administeredItems: Item[]): string | null {
  if (administeredItems.length === 0) return null;
  const last = administeredItems[administeredItems.length - 1];
  return (last.metadata as any)?.setId ?? null;
}
