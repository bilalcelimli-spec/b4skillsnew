import { information } from '../assessment-engine/irt.js';
import type { SkillProfile } from '../assessment-engine/types.js';
import type { FreemiumSkillBreakdown } from './freemium-response-scoring.js';

export const PLACEMENT_SKILLS = ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING', 'WRITING', 'SPEAKING'];
export const PLACEMENT_MIN_PER_SKILL = 2;
export const PLACEMENT_MAX_PER_SKILL = 4;
interface PlacementCandidate {
  id: string; skill: string; active?: boolean;
  irtA?: number; irtB?: number; irtC?: number; difficulty?: number;
}

/** Balance skill coverage, then maximise information at each skill's own ability. */
export function pickPlacementItem<T extends PlacementCandidate>(pool: T[], used: Set<string>,
  breakdown: Record<string, FreemiumSkillBreakdown> = {}, profiles: Record<string, SkillProfile> = {}): T | null {
  const count = (skill: string) => breakdown[skill]?.total ?? 0;
  const available = pool.filter(item => !used.has(item.id) && item.active !== false &&
    PLACEMENT_SKILLS.includes(item.skill) && count(item.skill) < PLACEMENT_MAX_PER_SKILL &&
    Number.isFinite(item.irtA ?? 1) && (item.irtA ?? 1) > 0 &&
    Number.isFinite(item.irtB ?? item.difficulty ?? 0) && Number.isFinite(item.irtC ?? 0) &&
    (item.irtC ?? 0) >= 0 && (item.irtC ?? 0) < 1);
  if (!available.length) return null;
  const underserved = PLACEMENT_SKILLS.filter(skill => count(skill) < PLACEMENT_MIN_PER_SKILL && available.some(item => item.skill === skill))
    .sort((a, b) => count(a) - count(b));
  const minCount = Math.min(...PLACEMENT_SKILLS.map(count));
  const candidates = underserved.length ? available.filter(item => item.skill === underserved[0])
    : available.filter(item => count(item.skill) <= minCount + 1);
  const score = (item: T) => information(profiles[item.skill]?.theta ?? 0,
    { a: item.irtA ?? 1, b: item.irtB ?? item.difficulty ?? 0, c: item.irtC ?? 0 });
  return (candidates.length ? candidates : available).reduce((best, item) => score(item) > score(best) ? item : best);
}

export function placementPrecisionReached(breakdown: Record<string, FreemiumSkillBreakdown>, profiles: Record<string, SkillProfile>): boolean {
  return PLACEMENT_SKILLS.every(skill => (breakdown[skill]?.total ?? 0) >= PLACEMENT_MIN_PER_SKILL &&
    breakdown[skill].unassessed === 0 && Number.isFinite(profiles[skill]?.sem) && profiles[skill].sem <= .35);
}
