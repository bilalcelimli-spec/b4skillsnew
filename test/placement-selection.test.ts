import { expect, it } from 'vitest';
import { pickPlacementItem, placementPrecisionReached, PLACEMENT_SKILLS } from '../src/lib/product-lines/placement-selection';
import { estimateTheta } from '../src/lib/assessment-engine/estimator';
import { SkillType } from '../src/lib/assessment-engine/types';
const breakdown = (total = 2) => Object.fromEntries(PLACEMENT_SKILLS.map(skill => [skill,
  { total, correct: total, scored: total, unassessed: 0 }]));
const pool = Array.from({ length: 81 }, (_, n) => ({ id: `g${n}`, skill: 'GRAMMAR', irtA: 1.6, irtB: -3 + n * .075, irtC: .2 }));
it('adapts public placement to actual scored evidence for the current skill', () => {
  const history = pool.slice(38, 42);
  const items = Object.fromEntries(history.map(item => [item.id, { id: item.id, skill: SkillType.GRAMMAR,
    params: { a: item.irtA, b: item.irtB, c: item.irtC } }]));
  const used = new Set(history.map(item => item.id));
  const correct = estimateTheta(history.map(item => ({ itemId: item.id, score: 1 })), items);
  const wrong = estimateTheta(history.map(item => ({ itemId: item.id, score: 0 })), items);
  const high = pickPlacementItem(pool, used, {}, { GRAMMAR: correct, VOCABULARY: { theta: -3, sem: .1 } })!;
  const low = pickPlacementItem(pool, used, {}, { GRAMMAR: wrong, VOCABULARY: { theta: 3, sem: .1 } })!;
  expect(high.irtB - low.irtB).toBeGreaterThan(1);
  expect(used.has(high.id)).toBe(false); expect(used.has(low.id)).toBe(false);
});
it('uses item information instead of nearest difficulty alone', () => {
  const choices = [{ id: 'flat', skill: 'GRAMMAR', irtA: .1, irtB: 0, irtC: .2 },
    { id: 'informative', skill: 'GRAMMAR', irtA: 2, irtB: -.3, irtC: .2 }];
  expect(pickPlacementItem(choices, new Set())!.id).toBe('informative');
});
it('balances all six skills, rejects invalid parameters and respects caps', () => {
  const items = PLACEMENT_SKILLS.flatMap(skill => Array.from({ length: 8 }, (_, n) => ({ id: `${skill}${n}`, skill, irtA: 1, irtB: 0, irtC: .2 })));
  const counts = breakdown(0), used = new Set<string>();
  for (let n = 0; n < 24; n++) {
    const next = pickPlacementItem(items, used, counts)!;
    expect(next).not.toBeNull(); counts[next.skill].total++; used.add(next.id);
    if (n === 11) expect(PLACEMENT_SKILLS.every(skill => counts[skill].total === 2)).toBe(true);
  }
  expect(PLACEMENT_SKILLS.every(skill => counts[skill].total === 4)).toBe(true);
  expect(pickPlacementItem(items, used, counts)).toBeNull();
  expect(pickPlacementItem([{ id: 'invalid', skill: 'GRAMMAR', irtA: 0 }], new Set())).toBeNull();
});
it('requires every skill to have scored evidence and adequate precision before early stopping', () => {
  const counts = breakdown(), profiles = Object.fromEntries(PLACEMENT_SKILLS.map(skill => [skill, { theta: 0, sem: .3 }]));
  expect(placementPrecisionReached(counts, profiles)).toBe(true);
  profiles.SPEAKING.sem = .8; expect(placementPrecisionReached(counts, profiles)).toBe(false);
  profiles.SPEAKING.sem = .3; counts.WRITING.unassessed = 1;
  expect(placementPrecisionReached(counts, profiles)).toBe(false);
  delete profiles.WRITING; expect(placementPrecisionReached(counts, profiles)).toBe(false);
});
