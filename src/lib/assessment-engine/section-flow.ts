/**
 * Section flow — the pure part of what `server-engine.getNextItem` does for a
 * live adaptive session, so the production selection path can run without a
 * database (simulation harness, audits, unit tests) and stay identical to
 * what candidates get.
 *
 *   prepareSelectionPool  warm-up filter → seeded shuffle → content-tag /
 *                         task-family diversity → gated item-type rotation → family cap → passage cap;
 *                         inside a recording / reading text: its remaining questions only
 *   evaluateSectionStop   section budget + per-profile stop rules
 *
 * server-engine.ts owns everything that touches Postgres (loading the pool,
 * claiming the item, persisting state); it calls these two functions with the
 * data it loaded. The simulation harness calls the same functions with an
 * in-memory bank. Any behavioural change to live selection must land here.
 */

import type { ProductLineProfile } from "../product-lines/profiles.js";
import { sectionItemBudget } from "./adaptive-policy.js";
import { seededFisherYates } from "./mcq-options.js";
import { excludeUsedPassages, setProgress } from "./passage-cap.js";
import { capItemsPerFamily, distinctFamilies, taskFamilyKey } from "./task-family.js";
import { information } from "./irt.js";
import { evaluateSectionStopRules, type StopDecision, type StopRuleInput } from "./stop-rules.js";
import { SkillType, type Item, type Response, type SkillProfile } from "./types.js";

export type PoolFallbackReason = "warmup_filter" | "passage_reopened";

export interface PrepareSelectionPoolInput {
  profile: ProductLineProfile;
  skill: SkillType;
  /** Operational candidates for this section (already filtered to the profile's eligibility). */
  itemPool: Item[];
  /** Items administered so far in the session, in order. */
  administeredItems: Item[];
  /** Skill-level ability driving warm-up targeting. */
  ability: SkillProfile;
  /** Operational responses across the whole session (warm-up window). */
  totalOperationalResponses: number;
  /** Operational responses in this section (shuffle seed). */
  sectionCount: number;
  /** Session id (shuffle seed). */
  sessionId: string;
  /** The question already promised for the open set (planSetSibling); served if still available. */
  plannedItemId?: string | null;
}

export interface PreparedSelectionPool {
  pool: Item[];
  fallbacks: PoolFallbackReason[];
  /**
   * Set when `pool` holds only the remaining questions of the current recording /
   * text: the pool to select from if the selector can serve none of them.
   */
  retryPool?: Item[];
}

const CONTENT_TAG_PREFIXES = ["content:", "passage:", "topic:"];
/** Item-type rotation needs this many non-MCQ candidates from this many task families. */
export const MIN_ROTATION_ALTERNATIVES = 5;
export const MIN_ROTATION_FAMILIES = 3;

/**
 * Build the candidate pool handed to CATSelector for one selection.
 * Mirrors the live order of operations exactly; see server-engine.getNextItem.
 */
export function prepareSelectionPool(input: PrepareSelectionPoolInput): PreparedSelectionPool {
  // Set continuity: while the current recording / text has questions left, the
  // next item is one of them — ahead of warm-up, diversity and rotation, which
  // only decide how a new set is opened.
  const { siblings } = setProgress(input.itemPool, input.administeredItems, input.skill);
  if (siblings.length > 0) {
    const planned = input.plannedItemId ? siblings.filter((item) => item.id === input.plannedItemId) : [];
    if (planned.length > 0) return { pool: planned, fallbacks: [], retryPool: prepareNewSetPool(input).pool };
    const pool = seededFisherYates(siblings, `${input.sessionId}:${input.skill}:${input.sectionCount}`);
    return { pool, fallbacks: [], retryPool: prepareNewSetPool(input).pool };
  }
  return prepareNewSetPool(input);
}

/** Candidate pool when no set is open (a standalone item or the first question of a new set). */
function prepareNewSetPool(input: PrepareSelectionPoolInput): PreparedSelectionPool {
  const { profile, skill, itemPool, administeredItems, ability, totalOperationalResponses, sectionCount, sessionId } = input;
  const fallbacks: PoolFallbackReason[] = [];

  // Warm-up: the first N operational items of the exam stay at or below θ + offset.
  const operationalPool = itemPool.filter((item) => {
    if (item.isPretest) return false;
    if (totalOperationalResponses < profile.warmupItems) {
      return item.params.b <= ability.theta + profile.warmupDifficultyOffset;
    }
    return true;
  });
  let selectionPool = operationalPool.length > 0 ? operationalPool : itemPool.filter((item) => !item.isPretest);
  if (operationalPool.length === 0 && selectionPool.length > 0) fallbacks.push("warmup_filter");

  // Session-seeded shuffle so equal composite scores break ties differently per session.
  selectionPool = seededFisherYates(selectionPool, `${sessionId}:${skill}:${sectionCount}`);

  // Content-tag / task-family diversity (soft) and item-type rotation over the last 3 items of this skill.
  const recentInSkill = administeredItems.filter((item) => item.skill === skill).slice(-3);
  const recentContentTags = new Set<string>();
  const recentFamilies = new Set<string>();
  const recentTypes: string[] = [];
  for (const item of recentInSkill) {
    const tags: string[] = (item as Item & { tags?: string[] }).tags ?? [];
    for (const tag of tags) {
      if (CONTENT_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix))) recentContentTags.add(tag);
    }
    const family = taskFamilyKey(item as Item & { tags?: string[] });
    if (family) recentFamilies.add(family);
    if (item.type) recentTypes.push(item.type);
  }
  if (recentContentTags.size > 0 || recentFamilies.size > 0) {
    const isRecent = (item: Item) => {
      const tagged = ((item as Item & { tags?: string[] }).tags ?? []).some((tag) => recentContentTags.has(tag));
      const family = taskFamilyKey(item as Item & { tags?: string[] });
      return tagged || (family !== null && recentFamilies.has(family));
    };
    const fresh = selectionPool.filter((item) => !isRecent(item));
    if (fresh.length > 0) {
      selectionPool = [...fresh, ...selectionPool.filter(isRecent)];
    }
  }
  // Rotate to a non-MCQ format only when the bank offers real variety there.
  // With one worksheet template as the only alternative, rotation served it
  // every third item (bank review 2026-11-01).
  const lastTwoTypes = recentTypes.slice(-2);
  if (lastTwoTypes.length === 2 && lastTwoTypes.every((type) => type === "MULTIPLE_CHOICE")) {
    const alternatives = selectionPool.filter((item) => item.type !== "MULTIPLE_CHOICE");
    const varied = alternatives.length >= MIN_ROTATION_ALTERNATIVES
      && distinctFamilies(alternatives as Array<Item & { tags?: string[] }>) >= MIN_ROTATION_FAMILIES;
    const altIndex = varied ? selectionPool.findIndex((item) => item.type !== "MULTIPLE_CHOICE") : -1;
    if (altIndex > 0) {
      const [alt] = selectionPool.splice(altIndex, 1);
      selectionPool.unshift(alt);
    }
  }

  // Local dependence: a recording / reading text already used is not reopened.
  // Same task template: at most MAX_ITEMS_PER_FAMILY per section (hard, lifted only in a thin pool).
  const familyCapped = capItemsPerFamily(selectionPool, administeredItems.filter((item) => item.skill === skill) as Array<Item & { tags?: string[] }>);
  const fresh = excludeUsedPassages(familyCapped, administeredItems);
  if (fresh.reopened) fallbacks.push("passage_reopened");
  return { pool: fresh.pool, fallbacks };
}

/**
 * The second question of the recording / text just opened, fixed at the moment
 * the first one is served so the candidate can read both while listening.
 * No adaptation happens inside a set: the most informative remaining question
 * at the current θ is taken. Null when the set has no further question or the
 * section has no room left for it.
 */
export function planSetSibling(input: {
  /** Operational candidates of the section, the chosen item excluded or not. */
  itemPool: Item[];
  /** Items administered so far, in order, without the chosen item. */
  administeredItems: Item[];
  /** The operational item being served now. */
  chosen: Item;
  theta: number;
  /** Operational responses in this section before the chosen item. */
  sectionCount: number;
  sectionMaxItems: number;
}): Item | null {
  if (input.chosen.isPretest) return null;
  if (input.sectionCount + 1 >= input.sectionMaxItems) return null;
  const pool = input.itemPool.filter((item) => item.id !== input.chosen.id);
  const { siblings } = setProgress(pool, [...input.administeredItems, input.chosen], input.chosen.skill);
  let best: Item | null = null;
  let bestInfo = -Infinity;
  for (const item of [...siblings].sort((a, b) => a.id.localeCompare(b.id))) {
    const info = information(input.theta, item.params);
    if (Number.isFinite(info) && info > bestInfo) { best = item; bestInfo = info; }
  }
  return best;
}

/** Receptive-section SEM above which one extra item may be spent (budget flex). */
export const BUDGET_FLEX_SEM = 0.40;

/** Productive sections: no pretests and no budget flex — each task costs minutes and AI grading. */
export const PRETEST_EXCLUDED_SKILLS: ReadonlySet<SkillType> = new Set([SkillType.WRITING, SkillType.SPEAKING]);

export interface EvaluateSectionStopInput {
  profile: ProductLineProfile;
  sectionIndex: number;
  /** Operational responses in this section. */
  sectionCount: number;
  /** Operational responses across the whole session. */
  totalOperationalResponses: number;
  ability: SkillProfile;
  hasOutstandingItem?: boolean;
  /** A question of the current recording / text is still promised (planSetSibling): finish the set first. */
  setOpen?: boolean;
  /** Org-level CEFR cut overrides. */
  cefrThresholds?: StopRuleInput["cefrThresholds"];
  /** Section responses + items (SPRT only). */
  responses?: Response[];
  items?: Record<string, Item>;
}

export interface SectionStopDecision extends StopDecision {
  /** Effective item ceiling for this section after reserving later sections' minima. */
  sectionMaxItems: number;
}

/**
 * Decide whether the current section is complete.
 * The budget reserves the remaining sections' minima (adaptive-policy.sectionItemBudget);
 * the early-stop rules come from the profile (`stopRules`, default SEM_THRESHOLD).
 */
export function evaluateSectionStop(input: EvaluateSectionStopInput): SectionStopDecision {
  const { profile, sectionIndex, sectionCount, totalOperationalResponses, ability } = input;
  const skill = profile.sectionOrder[sectionIndex];
  const config = profile.sectionConfig[skill];
  // Budget flex (profile.sectionBudgetFlex): a receptive section still above
  // BUDGET_FLEX_SEM may spend one item beyond its maxItems, inside the global
  // budget and the later sections' reserved minima. Productive skills never flex.
  const flex = profile.sectionBudgetFlex === true && !PRETEST_EXCLUDED_SKILLS.has(skill) &&
    Number.isFinite(ability.sem) && ability.sem > BUDGET_FLEX_SEM;
  const budgetProfile = flex
    ? { ...profile, sectionConfig: { ...profile.sectionConfig, [skill]: { ...config, maxItems: config.maxItems + 1 } } }
    : profile;
  const sectionMaxItems = sectionItemBudget(budgetProfile, sectionIndex, totalOperationalResponses, sectionCount);
  // A set that was opened is finished: early-stop rules wait for its last question, the budget does not.
  if (input.setOpen && sectionCount < sectionMaxItems) return { stop: false, reason: null, sectionMaxItems };
  const decision = evaluateSectionStopRules({
    rules: profile.stopRules,
    ability,
    sectionCount,
    minItems: config.minItems,
    maxItems: sectionMaxItems,
    semThreshold: config.semThreshold,
    cefrThresholds: input.cefrThresholds,
    classificationConfidenceThreshold: profile.classificationConfidenceThreshold,
    sprt: profile.sprt,
    responses: input.responses,
    items: input.items,
    hasOutstandingItem: input.hasOutstandingItem,
  });
  return { ...decision, sectionMaxItems };
}

// ─── Pretest slots ────────────────────────────────────────────────────────────

/** Default operational positions after which a pretest item is embedded (1-based). */
export const PRETEST_SLOT_INTERVAL = 4;


export interface PretestSlotInput {
  profile: ProductLineProfile;
  skill: SkillType;
  /** Share of the exam that may be pretest (SystemConfig.pretestRatio, 0–1). */
  pretestRatio: number;
  /** Operational responses across the session so far. */
  totalOperationalResponses: number;
  /** Pretest responses across the session so far. */
  pretestAdministered: number;
  /** Operational responses in this section so far. */
  sectionCount: number;
  /** Section item ceiling after reserving later sections (evaluateSectionStop). */
  sectionMaxItems: number;
  /** A served-but-unanswered item means no new slot. */
  hasOutstandingItem?: boolean;
  /** The current recording / text still has questions to serve (setProgress.siblings): never interrupt it. */
  setOpen?: boolean;
  /** Length of the set that just ended (setProgress.run); a slot that fell inside it is served now. */
  closedSetLength?: number;
}

/**
 * Decide whether the next item of this section should be a pretest.
 *
 * Deterministic, position based (roadmap Faz 2 / F1): a pretest follows the
 * 4th, 8th, 12th … operational item of the exam (moved to the end of the set
 * when that position falls inside a recording / text), never during warm-up, never in
 * productive sections, never once the section has used its budget, and never
 * beyond round(pretestRatio × globalMaxItems) pretests per session. Pretest
 * responses are unscored, so the exam grows by at most that many items.
 */
export function shouldAdministerPretest(input: PretestSlotInput): boolean {
  const { profile, skill, pretestRatio, totalOperationalResponses, pretestAdministered, sectionCount, sectionMaxItems } = input;
  if (input.hasOutstandingItem) return false;
  if (input.setOpen) return false;
  if (!(pretestRatio > 0)) return false;
  if (PRETEST_EXCLUDED_SKILLS.has(skill)) return false;
  if (totalOperationalResponses < profile.warmupItems) return false;
  if (sectionCount >= sectionMaxItems) return false;
  const maxPretests = Math.round(pretestRatio * profile.globalMaxItems);
  if (pretestAdministered >= maxPretests) return false;
  // Slot after every PRETEST_SLOT_INTERVAL operational items; one pretest per slot.
  // A slot is due when a multiple of the interval lies among the items served since the last set boundary.
  const sinceBoundary = Math.min(totalOperationalResponses, Math.max(1, Math.floor(input.closedSetLength ?? 1)));
  if (Math.floor(totalOperationalResponses / PRETEST_SLOT_INTERVAL) <=
      Math.floor((totalOperationalResponses - sinceBoundary) / PRETEST_SLOT_INTERVAL)) return false;
  const slotsReached = Math.floor(totalOperationalResponses / PRETEST_SLOT_INTERVAL);
  return pretestAdministered < slotsReached;
}
