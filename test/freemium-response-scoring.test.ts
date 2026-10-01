import { describe, expect, it } from 'vitest';
import { scoreFreemiumResponse, recordFreemiumScore, type FreemiumSkillBreakdown } from '../src/lib/product-lines/freemium-response-scoring';
import { updateThetaEAP, type PlacementItemMeta, type PlacementResponse } from '../src/lib/product-lines/placement-test';

const mcq = (skill = 'READING') => ({ skill, type: 'MULTIPLE_CHOICE', content: { options: ['wrong', 'right', 'wrong again'], correctIndex: 1 } });

describe('freemium evidence scoring', () => {
  it('does not award proficiency credit for one word or an unevaluated essay', () => {
    const item = { skill: 'WRITING', type: 'OPEN_RESPONSE' };
    expect(scoreFreemiumResponse(item, 'hello')).toBeNull();
    expect(scoreFreemiumResponse(item, 'An essay with many words')).toBeNull();
  });
  it('does not award credit for a recording marker, including on receptive items', () => {
    expect(scoreFreemiumResponse({ skill: 'SPEAKING', type: 'OPEN_RESPONSE' }, 'speaking_recorded')).toBeNull();
    expect(scoreFreemiumResponse(mcq(), 'speaking_recorded')).toBe(false);
  });
  it.each(['READING', 'LISTENING'])('checks %s answers against the key', skill => {
    expect(scoreFreemiumResponse(mcq(skill), 0)).toBe(false);
    expect(scoreFreemiumResponse(mcq(skill), 1)).toBe(true);
    for (const answer of [null, '', false, '1', -1, 3]) {
      expect(scoreFreemiumResponse(mcq(skill), answer)).toBe(false);
    }
  });
  it('scores objective writing exercises instead of accepting any text', () => {
    const item = { skill: 'WRITING', type: 'FILL_IN_BLANKS', content: { options: ['went', 'goes'], correctAnswer: 'went|has gone' } };
    expect(scoreFreemiumResponse(item, 'hello')).toBe(false);
    expect(scoreFreemiumResponse(item, ' HAS GONE ')).toBe(true);
  });
  it('handles a zero answer key and a missing index without coercing empty answers', () => {
    expect(scoreFreemiumResponse({ ...mcq(), content: { options: ['yes', 'no'], correctAnswer: 0 } }, 0)).toBe(true);
    expect(scoreFreemiumResponse({ ...mcq(), content: { options: ['yes', 'no'], correctIndex: -1, correctAnswer: 'no' } }, 1)).toBe(true);
    expect(scoreFreemiumResponse({ skill: 'READING', type: 'FILL_IN_BLANKS', content: {} }, 'anything')).toBeNull();
  });
  it('separates submitted responses from scored evidence in the result', () => {
    const breakdown: Record<string, FreemiumSkillBreakdown> = {};
    for (let n = 0; n < 4; n++) recordFreemiumScore(breakdown, 'WRITING', null);
    expect(breakdown.WRITING).toEqual({ total: 4, correct: 0, scored: 0, unassessed: 4, scoringKind: 'objective' });
    recordFreemiumScore(breakdown, 'READING', false);
    recordFreemiumScore(breakdown, 'READING', true);
    expect(breakdown.READING).toEqual({ total: 2, correct: 1, scored: 2, unassessed: 0, scoringKind: 'objective', scoreSum: 1 });
  });
  it('estimates ability from the whole scored history, independent of answer order', () => {
    const meta = new Map<string, PlacementItemMeta>();
    const responses: PlacementResponse[] = Array.from({ length: 16 }, (_, n) => {
      meta.set(String(n), { a: 1, b: 0, c: .25, skill: 'READING', type: 'MULTIPLE_CHOICE', correctAnswer: 0 });
      return { itemId: String(n), score: n % 4 === 0 ? 1 : 0, latencyMs: 10000 };
    });
    const estimate = updateThetaEAP(responses, meta);
    expect(estimate.theta).toBeLessThan(0);
    expect(updateThetaEAP([...responses].reverse(), meta)).toEqual(estimate);
  });
});
