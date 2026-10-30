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

/**
 * Pretest (calibration) pool for a section: items in PRETEST status, or ACTIVE
 * items flagged isPretest, inside the profile's CEFR range and sources, with
 * usable seed parameters. Responses to these items never enter θ.
 */
export function pretestItemWhere(profile: ProductLineProfile, skill: SkillType): Prisma.ItemWhereInput {
  const [lo, hi] = profile.cefrRange.map(level => LEVELS.indexOf(level as CefrLevel));
  if (lo < 0 || hi < lo) throw new Error('Invalid adaptive profile CEFR range');
  const sources = profileSources(profile);
  return {
    skill,
    OR: [{ status: 'PRETEST' }, { status: 'ACTIVE', isPretest: true }],
    cefrLevel: { in: LEVELS.slice(lo, hi + 1) },
    discrimination: { gt: 0 }, guessing: { gte: 0, lt: 1 },
    ...(sources.length ? { AND: [{ OR: [{ tags: { hasSome: sources } }, { tags: { isEmpty: true } },
      ...sources.map(source => ({ content: { path: ['productLine'], equals: source } }))] }] } : {}),
  };
}

/** In-memory mirror of `pretestItemWhere`. */
export function isPretestEligible(item: AdaptiveEligibilityItem, profile: ProductLineProfile, skill: SkillType): boolean {
  const [lo, hi] = profile.cefrRange.map(level => LEVELS.indexOf(level as CefrLevel));
  const level = LEVELS.indexOf(item.cefrLevel as CefrLevel);
  const pretest = item.status === 'PRETEST' || (item.status === 'ACTIVE' && item.isPretest === true);
  if (item.skill !== skill || !pretest) return false;
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

/** Lower bound on a cross-skill prior SD so collateral information never claims more than it should. */
export const CROSS_SKILL_PRIOR_MIN_SD = 0.6;

export interface CrossSkillPriorConfig {
  /** Assumed correlation between any two skill θs in the cohort (provisional; roadmap Faz 4). */
  correlation: number;
}

/**
 * Informative prior for one skill from the skills already measured in this
 * session (collateral information, Wainer et al. 2000; de la Torre & Patz 2005).
 *
 *   mean = μ + ρ · (m̄ − μ)              m̄ = mean of measured skill θ̂
 *   sd   = √( σ²(1 − ρ²) + ρ² · v_m )    v_m = mean(SEM_j²) / J
 *
 * with (μ, σ) the profile prior. The SD is floored at CROSS_SKILL_PRIOR_MIN_SD
 * because the single-ρ model ignores structure between skills. Falls back to
 * the profile prior when nothing has been measured yet.
 */
export function crossSkillPrior(
  state: SessionState,
  skill: SkillType,
  base: AbilityPrior,
  config: CrossSkillPriorConfig,
): AbilityPrior {
  const rho = Math.max(0, Math.min(0.99, config.correlation));
  const measured = Object.entries(state.skillProfiles ?? {})
    .filter(([other, p]) => other !== skill && p && Number.isFinite(p.theta) && Number.isFinite(p.sem) && p.sem > 0)
    .map(([, p]) => p as SkillProfile);
  if (measured.length === 0 || rho === 0) return base;
  const mean = measured.reduce((sum, p) => sum + p.theta, 0) / measured.length;
  const errorVar = measured.reduce((sum, p) => sum + p.sem * p.sem, 0) / measured.length / measured.length;
  const sigma2 = base.sd * base.sd;
  const sd = Math.sqrt(sigma2 * (1 - rho * rho) + rho * rho * errorVar);
  return { mean: base.mean + rho * (mean - base.mean), sd: Math.max(CROSS_SKILL_PRIOR_MIN_SD, sd) };
}

/** Priors for every skill of the profile at the current state (for the per-skill EAP). */
export function crossSkillPriors(
  state: SessionState,
  profile: ProductLineProfile,
  base: AbilityPrior,
): Partial<Record<SkillType, AbilityPrior>> | undefined {
  if (!profile.crossSkillPrior) return undefined;
  const out: Partial<Record<SkillType, AbilityPrior>> = {};
  for (const skill of profile.sectionOrder) out[skill] = crossSkillPrior(state, skill, base, profile.crossSkillPrior);
  return out;
}

/**
 * Ability used to run a section: the skill's own estimate once it exists,
 * otherwise the prior (profile prior, or the cross-skill prior when the profile
 * enables it). Other skills cannot provide the precision needed to finish a section.
 */
export function sectionAbility(
  state: SessionState,
  skill: SkillType,
  priorMean = 0,
  priorSd = 1,
  crossSkill?: { profile: ProductLineProfile },
): SkillProfile {
  const estimate = state.skillProfiles?.[skill];
  if (estimate && Number.isFinite(estimate.theta) && Number.isFinite(estimate.sem) && estimate.sem > 0) return estimate;
  const base = { mean: priorMean, sd: priorSd };
  const prior = crossSkill?.profile.crossSkillPrior ? crossSkillPrior(state, skill, base, crossSkill.profile.crossSkillPrior) : base;
  return { theta: prior.mean, sem: prior.sd };
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
