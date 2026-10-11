import type { Prisma, CefrLevel } from '@prisma/client';
import type { ProductLineProfile } from '../product-lines/profiles.js';
import type { SessionState, SkillType, SkillProfile } from './types.js';

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

/** Launch and delivery must count/select the same operational population. */
export function adaptiveItemWhere(profile: ProductLineProfile, skill: SkillType): Prisma.ItemWhereInput {
  const [lo, hi] = profile.cefrRange.map(level => LEVELS.indexOf(level as CefrLevel));
  if (lo < 0 || hi < lo) throw new Error('Invalid adaptive profile CEFR range');
  const sources = [...new Set(profile.examSources.filter(source => source !== 'general')
    .flatMap(source => SOURCE_ALIASES[source] ?? [source]))];
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
