import { estimateTheta } from './estimator.js';
import type { Item, SkillType } from './types.js';
import type { DiagnosticSessionState } from './diagnostic-service.js';
import { SKILLS, DIAGNOSTIC_ITEMS_PER_SKILL } from './diagnostic-config.js';
import { shouldExcludeResponseFromAbility } from '../scoring/score-evidence.js';

const weights = { READING: 2, LISTENING: 2, WRITING: 2, SPEAKING: 2, GRAMMAR: 1.5, VOCABULARY: 1.5 };
export function recalculateDiagnosticState(state: DiagnosticSessionState) {
  const counts: Record<string, number> = {};
  for (const skill of SKILLS) {
    const st = state.skills[skill];
    const evidence = st.items.filter(item => item.answered && typeof item.score === 'number' && Number.isFinite(item.score) && item.score >= 0 && item.score <= 1);
    const items: Record<string, Item> = Object.fromEntries(evidence.map(item => [item.itemId, {
      id: item.itemId, skill: skill as SkillType, type: item.type,
      params: { a: item.irtA, b: item.irtB, c: item.irtC }, isPretest: false, status: 'ACTIVE',
    }]));
    const estimate = estimateTheta(evidence.map(item => ({ itemId: item.itemId, score: item.score! })), items, 0, 1, { useGrmProductive: true });
    st.theta = estimate.theta; st.sem = estimate.sem;
    st.answered = st.items.filter(item => item.answered).length;
    counts[skill] = evidence.length;
  }
  state.totalAnswered = SKILLS.reduce((sum, skill) => sum + state.skills[skill].answered, 0);
  const theta = SKILLS.reduce((sum, skill) => sum + weights[skill] * state.skills[skill].theta, 0) / SKILLS.reduce((sum, skill) => sum + weights[skill], 0);
  return { theta, sem: Math.max(...SKILLS.map(skill => state.skills[skill].sem)), counts,
    scoringComplete: SKILLS.every(skill => counts[skill] >= DIAGNOSTIC_ITEMS_PER_SKILL),
    allAnswered: SKILLS.every(skill => state.skills[skill].answered >= DIAGNOSTIC_ITEMS_PER_SKILL) };
}

/** Human grades are read from Response rows, never stale serialized answer scores. */
export function diagnosticStateFromResponses(state: DiagnosticSessionState, responses: Array<{
  itemId: string; score: number | null; isPretest?: boolean | null; metadata?: unknown;
}>) {
  const fresh = structuredClone(state);
  const byItem = new Map(responses.map(response => [response.itemId, response]));
  for (const skill of SKILLS) for (const item of fresh.skills[skill].items) {
    const response = byItem.get(item.itemId);
    item.answered = !!response;
    item.score = response && !shouldExcludeResponseFromAbility(response) ? response.score : null;
    item.isCorrect = item.score === null ? undefined : item.score >= .5;
  }
  return fresh;
}
