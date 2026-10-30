import { afterEach, describe, expect, it, vi } from 'vitest';
const exposure = vi.hoisted(() => ({ recordExposure: vi.fn(async () => {}),
  getStratumTotalSync: () => 0, getExposureRateSync: () => 0, getConditionalExposureRateSync: () => 0 }));
vi.mock('../src/lib/assessment-engine/exposure-store', () => ({ getExposureStore: async () => exposure }));
import { CATSelector } from '../src/lib/selection/cat-selector';
import { AssessmentEngine } from '../src/lib/assessment-engine/engine';
import { PRODUCT_LINE_PROFILES, getProfile } from '../src/lib/product-lines/profiles';
import { SkillType, type Item, type SessionState } from '../src/lib/assessment-engine/types';
import { adaptiveItemWhere, sectionAbility, sectionItemBudget } from '../src/lib/assessment-engine/adaptive-policy';
import * as dp from '../src/lib/selection/exposure-control-davey-parshall';
import * as hybrid from '../src/lib/psychometrics/kl-information';

afterEach(() => vi.restoreAllMocks());
const makeItem = (id: string, b: number, skill = SkillType.GRAMMAR): Item => ({ id, skill, status: 'ACTIVE',
  params: { a: 1.6, b, c: .2 }, metadata: {}, iqScore: 100 });
const initial = (): SessionState => ({ theta: 0, sem: 1, responses: [], usedItemIds: new Set() });

it('uses independent skill ability and prior uncertainty, including pending productive skills', () => {
  const state = { ...initial(), theta: 2.8, sem: .1, skillProfiles: { GRAMMAR: { theta: -2, sem: .7 } } };
  expect(sectionAbility(state, SkillType.GRAMMAR)).toEqual({ theta: -2, sem: .7 });
  expect(sectionAbility(state, SkillType.LISTENING)).toEqual({ theta: 0, sem: 1 });
  expect(sectionAbility(state, SkillType.WRITING)).toEqual({ theta: 0, sem: 1 });
});

it.each(Object.values(PRODUCT_LINE_PROFILES))('$name counts only operational items in its allowed range and reserves all skills', profile => {
  for (const skill of profile.sectionOrder) {
    expect(adaptiveItemWhere(profile, skill)).toMatchObject({ skill, status: 'ACTIVE', isPretest: false,
      discrimination: { gt: 0 }, guessing: { gte: 0, lt: 1 } });
    const levels = (adaptiveItemWhere(profile, skill).cefrLevel as any).in;
    expect(levels[0]).toBe(profile.cefrRange[0]); expect(levels.at(-1)).toBe(profile.cefrRange[1]);
  }
  let total = 0;
  for (let index = 0; index < profile.sectionOrder.length; index++) {
    const budget = sectionItemBudget(profile, index, total, 0);
    expect(budget).toBeGreaterThanOrEqual(profile.sectionConfig[profile.sectionOrder[index]].minItems);
    total += budget;
  }
  expect(total).toBeLessThanOrEqual(profile.globalMaxItems);
});

async function simulate(profile: (typeof PRODUCT_LINE_PROFILES)[keyof typeof PRODUCT_LINE_PROFILES], correct: boolean) {
  const skill = profile.sectionOrder[0];
  const pool = Array.from({ length: 151 }, (_, n) => makeItem(`${profile.name}-${correct}-${n}`, -3 + n * .04, skill));
  const items = Object.fromEntries(pool.map(item => [item.id, item]));
  const engine = new AssessmentEngine({ minItems: 3, maxItems: 20, semThreshold: .3, startingTheta: 0, startingSem: 1, pretestRatio: 0 });
  const selector = new CATSelector(profile);
  let state = initial(); const delivered: Item[] = [], trace: { theta: number; sem: number; b: number }[] = [];
  for (let step = 0; step < Math.min(8, profile.sectionConfig[skill].maxItems); step++) {
    const selected = await selector.selectNext(pool.filter(item => !state.usedItemIds.has(item.id)), state,
      { administeredItems: delivered, responses: state.responses, plannedTotal: profile.globalMaxItems, profile });
    expect(selected).not.toBeNull();
    delivered.push(selected!.item);
    state = engine.processResponse(state, { itemId: selected!.item.id, score: correct ? 1 : 0, latencyMs: 10000 }, items);
    trace.push({ theta: state.theta, sem: state.sem, b: selected!.item.params.b });
  }
  expect(new Set(delivered.map(item => item.id)).size).toBe(delivered.length);
  return { state, trace };
}

describe('actual CAT selector + EAP response update, contrasting response traces', () => {
  it.each(Object.values(PRODUCT_LINE_PROFILES))('$name raises difficulty for success and lowers it for failure', async profile => {
    vi.spyOn(Math, 'random').mockReturnValue(.5);
    const right = await simulate(profile, true), wrong = await simulate(profile, false);
    expect(right.trace[0].b).toBe(wrong.trace[0].b);
    expect(right.state.theta - wrong.state.theta).toBeGreaterThan(1.5);
    const meanLast = (trace: typeof right.trace) => trace.slice(-3).reduce((sum, step) => sum + step.b, 0) / 3;
    expect(meanLast(right.trace) - meanLast(wrong.trace)).toBeGreaterThan(1);
    expect(right.state.sem).toBeLessThan(1); expect(wrong.state.sem).toBeLessThan(1);
  });
});

it('applies passage set continuity before the information shortlist and releases completed sets', async () => {
  const profile = getProfile('General English');
  const previous = { ...makeItem('previous', 0), metadata: { setId: 'passage' } };
  const continuation = { ...makeItem('continue', -3), metadata: { setId: 'passage' } };
  const pool = [continuation, ...Array.from({ length: 12 }, (_, n) => makeItem(`other-${n}`, n / 100))];
  const state = { ...initial(), usedItemIds: new Set(['previous']), responses: [{ itemId: 'previous', score: 1 }] };
  const ctx = { administeredItems: [previous], responses: state.responses, plannedTotal: 50, profile };
  expect((await new CATSelector(profile).selectNext(pool, state, ctx))!.item.id).toBe('continue');
  expect((await new CATSelector(profile).selectNext(pool.slice(1), state, ctx))!.item.id).toMatch(/^other/);
});

it('uses administered history for KL/MFI switching even when used questions are absent from the pool', async () => {
  const spy = vi.spyOn(hybrid, 'hybridAlpha');
  const profile = getProfile('General English');
  const history = Array.from({ length: 7 }, (_, n) => makeItem(`used-${n}`, 0));
  const state = { ...initial(), sem: .25, usedItemIds: new Set(history.map(item => item.id)),
    responses: history.map(item => ({ itemId: item.id, score: 1 })) };
  await new CATSelector(profile).selectNext([makeItem('new', 0)], state,
    { administeredItems: history, responses: state.responses, plannedTotal: 50, profile });
  expect(spy).toHaveBeenCalledWith(.25, 7);
});

it('never selects retired items, invalid IRT parameters or repeats', async () => {
  const profile = getProfile('General English'), state = initial();
  state.usedItemIds.add('used');
  const pool = [makeItem('used', 0), { ...makeItem('retired', 0), status: 'RETIRED' as const },
    { ...makeItem('zero', 0), params: { a: 0, b: 0, c: .2 } },
    { ...makeItem('nan', 0), params: { a: 1, b: NaN, c: .2 } }, makeItem('valid', 1)];
  const ctx = { administeredItems: [], responses: [], plannedTotal: 50, profile };
  expect((await new CATSelector(profile).selectNext(pool, state, ctx))!.item.id).toBe('valid');
  expect(await new CATSelector(profile).selectNext(pool.slice(0, -1), state, ctx)).toBeNull();
});

it('replaces an item rejected by the exposure gate with the next-best item instead of re-serving it', async () => {
  const profile = getProfile('General English');
  // 'hot' carries the most information at θ=0; the gate rejects it.
  vi.spyOn(dp, 'acceptItem').mockImplementation((_store, id) => id !== 'hot');
  const hot = { ...makeItem('hot', 0), params: { a: 2.5, b: 0, c: .1 } };
  const pool = [hot, ...Array.from({ length: 12 }, (_, n) => makeItem(`cool-${n}`, (n - 6) / 4))];
  const ctx = { administeredItems: [], responses: [], plannedTotal: 50, profile };
  for (let i = 0; i < 5; i++) {
    expect((await new CATSelector(profile).selectNext(pool, initial(), ctx))!.item.id).not.toBe('hot');
  }
});

it('lifts the exposure gate when it would leave too few candidates', async () => {
  const profile = getProfile('General English');
  vi.spyOn(dp, 'acceptItem').mockReturnValue(false);
  const pool = Array.from({ length: 6 }, (_, n) => makeItem(`only-${n}`, n / 10));
  const ctx = { administeredItems: [], responses: [], plannedTotal: 50, profile };
  expect(await new CATSelector(profile).selectNext(pool, initial(), ctx)).not.toBeNull();
});

it('records exposure in the same seven-stratum scale used by the acceptance gate', async () => {
  const record = vi.spyOn(dp, 'recordSelection');
  const profile = getProfile('General English'), state = { ...initial(), theta: -1 };
  await new CATSelector(profile).selectNext([makeItem('stratum-check', -1)], state,
    { administeredItems: [], responses: [], plannedTotal: 50, profile });
  expect(record).toHaveBeenCalledWith(expect.any(Object), 'stratum-check', dp.thetaToStratumDp(-1), ['stratum-check'], undefined);
});
it('does not count pending grades as scored evidence for KL/MFI switching', async () => {
  const spy = vi.spyOn(hybrid, 'hybridAlpha'), profile = getProfile('General English');
  const previous = makeItem('pending-grade', 0);
  const state = { ...initial(), usedItemIds: new Set([previous.id]), responses: [{ itemId: previous.id, score: 0, isPretest: true }] };
  await new CATSelector(profile).selectNext([makeItem('after-pending', 0)], state,
    { administeredItems: [previous], responses: state.responses, plannedTotal: 50, profile });
  expect(spy).toHaveBeenCalledWith(1, 0);
});
it('does not let a top-five lottery erase adaptation in a small bank', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(.9);
  const profile = getProfile('General English');
  const pool = [makeItem('precise', -.2), ...[-4, -3, 3, 4].map((b, n) => makeItem(`distant-${n}`, b))];
  expect((await new CATSelector(profile).selectNext(pool, initial(),
    { administeredItems: [], responses: [], plannedTotal: 50, profile }))!.item.id).toBe('precise');
});
