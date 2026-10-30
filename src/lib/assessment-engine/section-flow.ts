/**
 * Section flow — the pure part of what `server-engine.getNextItem` does for a
 * live adaptive session, so the production selection path can run without a
 * database (simulation harness, audits, unit tests) and stay identical to
 * what candidates get.
 *
 *   prepareSelectionPool  warm-up filter → seeded shuffle → content-tag
 *                         diversity → item-type rotation → passage cap
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
import { capItemsPerPassage } from "./passage-cap.js";
import { evaluateSectionStopRules, type StopDecision, type StopRuleInput } from "./stop-rules.js";
import { SkillType, type Item, type Response, type SkillProfile } from "./types.js";

export type PoolFallbackReason = "warmup_filter";

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
}

export interface PreparedSelectionPool {
  pool: Item[];
  fallbacks: PoolFallbackReason[];
}

const CONTENT_TAG_PREFIXES = ["content:", "passage:", "topic:"];

/**
 * Build the candidate pool handed to CATSelector for one selection.
 * Mirrors the live order of operations exactly; see server-engine.getNextItem.
 */
export function prepareSelectionPool(input: PrepareSelectionPoolInput): PreparedSelectionPool {
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

  // Content-tag diversity (soft) and item-type rotation over the last 3 items of this skill.
  const recentInSkill = administeredItems.filter((item) => item.skill === skill).slice(-3);
  const recentContentTags = new Set<string>();
  const recentTypes: string[] = [];
  for (const item of recentInSkill) {
    const tags: string[] = (item as Item & { tags?: string[] }).tags ?? [];
    for (const tag of tags) {
      if (CONTENT_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix))) recentContentTags.add(tag);
    }
    if (item.type) recentTypes.push(item.type);
  }
  if (recentContentTags.size > 0) {
    const hasRecentTag = (item: Item) =>
      ((item as Item & { tags?: string[] }).tags ?? []).some((tag) => recentContentTags.has(tag));
    const fresh = selectionPool.filter((item) => !hasRecentTag(item));
    if (fresh.length > 0) {
      selectionPool = [...fresh, ...selectionPool.filter(hasRecentTag)];
    }
  }
  const lastTwoTypes = recentTypes.slice(-2);
  if (lastTwoTypes.length === 2 && lastTwoTypes.every((type) => type === "MULTIPLE_CHOICE")) {
    const altIndex = selectionPool.findIndex((item) => item.type !== "MULTIPLE_CHOICE");
    if (altIndex > 0) {
      const [alt] = selectionPool.splice(altIndex, 1);
      selectionPool.unshift(alt);
    }
  }

  // Local dependence: cap items per reading passage / listening recording.
  const pool = capItemsPerPassage(selectionPool, administeredItems);
  return { pool, fallbacks };
}

export interface EvaluateSectionStopInput {
  profile: ProductLineProfile;
  sectionIndex: number;
  /** Operational responses in this section. */
  sectionCount: number;
  /** Operational responses across the whole session. */
  totalOperationalResponses: number;
  ability: SkillProfile;
  hasOutstandingItem?: boolean;
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
  const sectionMaxItems = sectionItemBudget(profile, sectionIndex, totalOperationalResponses, sectionCount);
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

/** Productive sections carry no pretests: each task costs minutes and AI grading. */
export const PRETEST_EXCLUDED_SKILLS: ReadonlySet<SkillType> = new Set([SkillType.WRITING, SkillType.SPEAKING]);

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
}

/**
 * Decide whether the next item of this section should be a pretest.
 *
 * Deterministic, position based (roadmap Faz 2 / F1): a pretest follows the
 * 4th, 8th, 12th … operational item of the exam, never during warm-up, never in
 * productive sections, never once the section has used its budget, and never
 * beyond round(pretestRatio × globalMaxItems) pretests per session. Pretest
 * responses are unscored, so the exam grows by at most that many items.
 */
export function shouldAdministerPretest(input: PretestSlotInput): boolean {
  const { profile, skill, pretestRatio, totalOperationalResponses, pretestAdministered, sectionCount, sectionMaxItems } = input;
  if (input.hasOutstandingItem) return false;
  if (!(pretestRatio > 0)) return false;
  if (PRETEST_EXCLUDED_SKILLS.has(skill)) return false;
  if (totalOperationalResponses < profile.warmupItems) return false;
  if (sectionCount >= sectionMaxItems) return false;
  const maxPretests = Math.round(pretestRatio * profile.globalMaxItems);
  if (pretestAdministered >= maxPretests) return false;
  // Slot after every PRETEST_SLOT_INTERVAL operational items; one pretest per slot.
  if (totalOperationalResponses === 0 || totalOperationalResponses % PRETEST_SLOT_INTERVAL !== 0) return false;
  const slotsReached = Math.floor(totalOperationalResponses / PRETEST_SLOT_INTERVAL);
  return pretestAdministered < slotsReached;
}
