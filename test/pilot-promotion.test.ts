import { beforeEach, expect, it, vi } from 'vitest';
import { itemReviewHash } from '../src/lib/content-factory/item-review-snapshot';
import { pilotAdmissionReasons, promotePilotItems } from '../src/lib/content-factory/pilot-promotion';
let item: any;
function approvals(snapshot: any) {
  return ['LANGUAGE_REVIEW', 'CEFR_REVIEW', 'FAIRNESS_REVIEW', 'MODERATION'].map((reviewType, i) => ({
    id: `review-${i}`, reviewType, reviewerId: `reviewer-${i}`, verdict: 'APPROVE', itemVersion: snapshot.version,
    contentHash: itemReviewHash(snapshot), createdAt: new Date(2026, 0, i + 1),
  }));
}
beforeEach(() => {
  item = { id: 'item', version: 2, itemCode: 'G-1', type: 'MULTIPLE_CHOICE', skill: 'GRAMMAR', cefrLevel: 'B1',
    status: 'DRAFT', pipelineStage: 'APPROVED_FOR_PILOT', content: { prompt: 'Choose.', options: ['First', 'Second'], correctIndex: 0 },
    metadata: { source: 'Author', paramSource: 'prior', nested: { keep: true } } };
  item.itemReviews = approvals(item);
});
it('admits reviewed draft content without claiming empirical calibration', () => {
  expect(pilotAdmissionReasons(item)).toEqual([]);
});
it.each(['LANGUAGE_REVIEW', 'CEFR_REVIEW', 'FAIRNESS_REVIEW', 'MODERATION'])('requires current %s approval', type => {
  item.itemReviews = item.itemReviews.filter((r: any) => r.reviewType !== type);
  expect(pilotAdmissionReasons(item)).toContain(`${type}_APPROVAL_MISSING`);
});
it.each(['legacy', 'version', 'hash'])('does not use %s approvals', change => {
  for (const review of item.itemReviews) {
    if (change === 'legacy') { review.itemVersion = null; review.contentHash = null; }
    if (change === 'version') review.itemVersion--;
    if (change === 'hash') review.contentHash = 'old';
  }
  expect(pilotAdmissionReasons(item)).toContain('MODERATION_APPROVAL_MISSING');
});
it('requires distinct reviewer identities even if all review types were approved', () => {
  item.itemReviews.forEach((r: any) => r.reviewerId = 'one-person');
  expect(pilotAdmissionReasons(item)).toContain('INDEPENDENT_REVIEWERS_MISSING');
});
it('latest rejection supersedes approval and an objection from another reviewer holds admission', () => {
  item.itemReviews.push({ ...item.itemReviews[0], id: 'later', verdict: 'REJECT', createdAt: new Date(2026, 1, 1) });
  expect(pilotAdmissionReasons(item)).toContain('UNRESOLVED_REVIEW_OBJECTION');
  expect(pilotAdmissionReasons(item)).toContain('LANGUAGE_REVIEW_APPROVAL_MISSING');
  item.itemReviews[4].reviewerId = 'other';
  expect(pilotAdmissionReasons(item)).toContain('UNRESOLVED_REVIEW_OBJECTION');
});
it.each([
  [{ isSuspended: true }, 'ITEM_SUSPENDED'], [{ isCompromised: true }, 'ITEM_COMPROMISED'],
  [{ status: 'RETIRED' }, 'STATUS_NOT_ELIGIBLE'], [{ status: 'ACTIVE' }, 'STATUS_NOT_ELIGIBLE'],
  [{ pipelineStage: 'EDITING' }, 'STAGE_CHANGED'],
] as const)('holds unsafe lifecycle %j', (change, reason) => {
  expect(pilotAdmissionReasons({ ...item, ...change })).toContain(reason);
});
it('blocks malformed keys and missing listening audio even with current approvals', () => {
  item.content.correctIndex = 8; item.itemReviews = approvals(item);
  expect(pilotAdmissionReasons(item)).toContain('KEY_INDEX_INVALID');
  item.skill = 'LISTENING'; item.itemReviews = approvals(item);
  expect(pilotAdmissionReasons(item)).toContain('AUDIO_MISSING');
});
function database(items: any[]) {
  const query = vi.fn(async () => items.map(item => ({ id: item.id })));
  const update = vi.fn(async ({ where, data }: any) => Object.assign(items.find(item => item.id === where.id), data));
  const find = vi.fn(async (_args: any) => structuredClone(items));
  const tx = { $queryRaw: query, item: { findMany: find, update } };
  const transaction = vi.fn(async (fn: any) => { const before = structuredClone(items); try { return await fn(tx); } catch (err) { items.splice(0, items.length, ...before); throw err; } });
  return { ...tx, $transaction: transaction, query, update, find };
}
it('dry run writes nothing and separates blocked items from eligible candidates', async () => {
  const db = database([item, { ...item, id: 'held', isSuspended: true }]);
  const result = await promotePilotItems(db, 'admin', true);
  expect(result).toMatchObject({ dryRun: true, count: 1, candidates: [{ id: 'item', version: 2 }], blocked: [{ id: 'held', reasons: ['ITEM_SUSPENDED'] }] });
  expect(db.update).not.toHaveBeenCalled(); expect(db.query).not.toHaveBeenCalled();
});
it('preserves provenance and records admission evidence in the same write as PRETEST', async () => {
  const db = database([item]);
  expect(await promotePilotItems(db, 'admin', false)).toMatchObject({ promoted: 1, ids: ['item'] });
  expect(item).toMatchObject({ status: 'PRETEST', isPretest: true, pipelineStage: 'PILOT', metadata: {
    source: 'Author', paramSource: 'prior', nested: { keep: true }, promotedBy: 'admin',
    pilotAdmission: { policyVersion: '1.0', itemVersion: 2, contentHash: itemReviewHash(item) },
  } });
  expect(db.find.mock.calls[0][0].where.id.in).toEqual(['item']);
});
it('a later write failure rolls back earlier promotions and metadata', async () => {
  const items = [item, { ...structuredClone(item), id: 'second' }], before = structuredClone(items), db = database(items);
  db.update.mockImplementationOnce(async ({ data }: any) => Object.assign(items[0], data)).mockRejectedValueOnce(Error('DB failed'));
  await expect(promotePilotItems(db, 'admin', false)).rejects.toThrow('DB failed');
  expect(items).toEqual(before);
});
it('rechecks the locked snapshot rather than using an earlier preview', async () => {
  const db = database([item]);
  expect(await promotePilotItems(db, 'admin', true)).toMatchObject({ count: 1 });
  item.content.prompt = 'Changed after preview';
  expect(await promotePilotItems(db, 'admin', false)).toMatchObject({ promoted: 0 });
  expect(db.update).not.toHaveBeenCalled();
});
