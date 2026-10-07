import { getProfile } from '../product-lines/profiles';
import { thetaToCefr } from '../cefr/cefr-framework';
import { shouldExcludeResponseFromAbility } from '../scoring/score-evidence';
import { SKILLS, DIAGNOSTIC_ITEMS_PER_SKILL, DIAGNOSTIC_WALL_CLOCK_MS } from './diagnostic-config';

/** Counts persisted answers separately from grades; pending grades are never zero scores. */
export function buildSessionProgress(session: any) {
  const diagnostic = session.metadata?.sessionType === 'DIAGNOSTIC';
  const profile = getProfile(session.metadata?.productLine);
  const sectionOrder = diagnostic ? [...SKILLS] : profile.sectionOrder;
  const responses: any[] = session.responses ?? [];
  const sectionCounts: Record<string, number> = {};
  const sectionLimits: Record<string, number> = {};
  const skills: Record<string, number | null> = {};
  const skillProgress: Record<string, { answered: number; scored: number; pending: number; maxItems: number }> = {};
  let scoredCount = 0;
  for (const skill of sectionOrder) {
    const answers = responses.filter(response => response.item?.skill === skill && !response.isPretest);
    const scored = answers.filter(response => !shouldExcludeResponseFromAbility(response));
    const limit = diagnostic ? DIAGNOSTIC_ITEMS_PER_SKILL : profile.sectionConfig[skill]?.maxItems ?? 0;
    sectionCounts[skill] = answers.length;
    sectionLimits[skill] = limit;
    skillProgress[skill] = { answered: answers.length, scored: scored.length, pending: answers.length - scored.length, maxItems: limit };
    skills[skill.toLowerCase()] = scored.length ? Math.round(scored.reduce((sum, response) => sum + response.score, 0) / scored.length * 100) : null;
    scoredCount += scored.length;
  }
  const answered = Object.values(sectionCounts).reduce((sum, count) => sum + count, 0);
  const theta = scoredCount && typeof session.theta === 'number' && Number.isFinite(session.theta) ? session.theta : null;
  return {
    startedAt: session.startedAt, organizationId: session.organizationId, status: session.status,
    maxDurationMs: diagnostic ? DIAGNOSTIC_WALL_CLOCK_MS : profile.maxDurationMs,
    sectionOrder, sectionCounts, sectionLimits, skillProgress, skills,
    progress: answered, scoredCount, pendingCount: answered - scoredCount,
    maxItems: Object.values(sectionLimits).reduce((sum, count) => sum + count, 0),
    theta, sem: theta !== null && typeof session.sem === 'number' && Number.isFinite(session.sem) ? session.sem : null,
    cefrLevel: theta !== null ? thetaToCefr(theta) : null,
    cefr: theta !== null ? thetaToCefr(theta) : null,
    provisional: true,
  };
}
