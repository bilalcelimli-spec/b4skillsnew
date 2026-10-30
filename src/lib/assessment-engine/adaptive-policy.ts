import type { Prisma, CefrLevel } from '@prisma/client';
import { CEFR_META } from '../cefr/cefr-framework.js';
import type { ProductLineProfile } from '../product-lines/profiles.js';
import type { SessionState, SkillType, SkillProfile } from './types.js';

export interface AbilityPrior { mean: number; sd: number }

/** θ span covered by a profile's CEFR range (open-ended bands extend 1.2 logit past the cut). */
export function profileThetaRange(profile: ProductLineProfile): { low: number; high: number; centre: number } {
  const [lowLevel, highLevel] = profile.cefrRange as [CefrLevel, CefrLevel];
  const lowBand = CEFR_META[lowLevel].theta, highBand = CEFR_META[highLevel].theta;
  const low = lowBand.min === -Infinity ? lowBand.max - 1.2 : lowBand.min;
  const high = highBand.max === Infinity ? highBand.min + 1.2 : highBand.max;
  return { low, high, centre: (low + high) / 2 };
}

/**
 * EAP / section-start prior for a session of this profile (roadmap F21).
 *
 * Precedence: an explicit organisation prior from SystemConfig (`priorMean`,
 * `priorSd`) → the profile's own `abilityPrior` → N(centre of the profile's
 * CEFR range, 1). Simulation (2026-10-30, synthetic bank, n=200) showed the
 * population N(0,1) prior biases off-centre cohorts toward 0 by 0.11–0.15 logit
 * (Primary +0.15, Academia −0.11, Specialized −0.14) and inflates RMSE; the
 * range-centred prior removes the bias (|bias| ≤ 0.04) and lowers RMSE.
 */
export function profileAbilityPrior(
  profile: ProductLineProfile,
  orgPrior?: { priorMean?: number; priorSd?: number },
): AbilityPrior {
  if (typeof orgPrior?.priorMean === 'number' && Number.isFinite(orgPrior.priorMean)) {
    const sd = orgPrior.priorSd;
    return { mean: orgPrior.priorMean, sd: typeof sd === 'number' && sd > 0 ? sd : 1 };
  }
  if (profile.abilityPrior) return profile.abilityPrior;
  return { mean: Number(profileThetaRange(profile).centre.toFixed(3)), sd: 1 };
}

const LEVELS: CefrLevel[] = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Seed generations used both public profile names and internal source keys.
// Only exact, known aliases are interchangeable; topic tags are not sources.
const SOURCE_ALIASES: Record<string, string[]> = {
  primary: ['primary', 'PRIMARY', 'Primary (7-10)'],
  junior: ['junior', 'JUNIOR', 'JUNIOR_SUITE', 'Junior Suite (11-14)'],
  academia: ['academia', 'academic', 'ACADEMIA', 'Academia'],
  corporate: ['corporate', 'CORPORATE', 'Corporate'],
  'language-schools': ['language-schools', 'language_schools', 'LANGUAGE_SCHOOLS', 'Language Schools'],
  specialized: ['specialized', 'SPECIALIZED', 'Specialized / Integrated Skills'],
};

/** Minimal item view shared by the Prisma filter and its in-memory mirror. */
export interface AdaptiveEligibilityItem {
  skill: string;
  status: string;
  isPretest?: boolean | null;
  cefrLevel: string;
  discrimination: number;
  guessing: number;
  tags?: string[] | null;
  content?: unknown;
}

function profileSources(profile: ProductLineProfile): string[] {
  return [...new Set(profile.examSources.filter(source => source !== 'general')
    .flatMap(source => SOURCE_ALIASES[source] ?? [source]))];
}

/**
 * In-memory mirror of `adaptiveItemWhere` for simulations and audits.
 * Keep the two in lockstep: any new filter in one must appear in the other.
 */
export function isAdaptiveEligible(item: AdaptiveEligibilityItem, profile: ProductLineProfile, skill: SkillType): boolean {
  const [lo, hi] = profile.cefrRange.map(level => LEVELS.indexOf(level as CefrLevel));
  const level = LEVELS.indexOf(item.cefrLevel as CefrLevel);
  if (item.skill !== skill || item.status !== 'ACTIVE' || item.isPretest) return false;
  if (level < lo || level > hi) return false;
  if (!(item.discrimination > 0) || !(item.guessing >= 0 && item.guessing < 1)) return false;
  const sources = profileSources(profile);
  if (sources.length === 0) return true;
  const tags = item.tags ?? [];
  if (tags.length === 0 || tags.some(tag => sources.includes(tag))) return true;
  const productLine = (item.content as { productLine?: unknown } | null | undefined)?.productLine;
  return typeof productLine === 'string' && sources.includes(productLine);
}

/** Launch and delivery must count/select the same operational population. */
export function adaptiveItemWhere(profile: ProductLineProfile, skill: SkillType): Prisma.ItemWhereInput {
  const [lo, hi] = profile.cefrRange.map(level => LEVELS.indexOf(level as CefrLevel));
  if (lo < 0 || hi < lo) throw new Error('Invalid adaptive profile CEFR range');
  const sources = profileSources(profile);
  return {
    skill, status: 'ACTIVE', isPretest: false,
    cefrLevel: { in: LEVELS.slice(lo, hi + 1) },
    discrimination: { gt: 0 }, guessing: { gte: 0, lt: 1 },
    ...(sources.length ? { OR: [{ tags: { hasSome: sources } }, { tags: { isEmpty: true } },
      ...sources.map(source => ({ content: { path: ['productLine'], equals: source } }))] } : {}),
  };
}

/** Other skills cannot provide the precision needed to finish this section. */
export function sectionAbility(state: SessionState, skill: SkillType, priorMean = 0, priorSd = 1): SkillProfile {
  const estimate = state.skillProfiles?.[skill];
  return estimate && Number.isFinite(estimate.theta) && Number.isFinite(estimate.sem) && estimate.sem > 0
    ? estimate : { theta: priorMean, sem: priorSd };
}

/** Reserve the remaining sections' minima before spending optional CAT items. */
export function sectionItemBudget(profile: ProductLineProfile, sectionIndex: number, totalAnswered: number, sectionAnswered: number): number {
  const skill = profile.sectionOrder[sectionIndex];
  const config = profile.sectionConfig[skill];
  const reserved = profile.sectionOrder.slice(sectionIndex + 1)
    .reduce((sum, next) => sum + profile.sectionConfig[next].minItems, 0);
  return Math.max(config.minItems, Math.min(config.maxItems,
    profile.globalMaxItems - totalAnswered - reserved + sectionAnswered));
}
