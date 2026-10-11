import {createSessionPauseService} from '../src/lib/assessment-engine/session-pause-service';
/** Real production delivery and scoring against an isolated localhost database only. */
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
const fixture = await vi.hoisted(async () => {
  const { PrismaClient } = await import('@prisma/client');
  return { db: new PrismaClient({ datasources: { db: { url: 'postgresql://b4skills_test@127.0.0.1:59473/adaptive_selection_test?connection_limit=3' } } }),
    exposure: { recordExposure: vi.fn(async () => {}), getStratumTotalSync: () => 0,
      getExposureRateSync: () => 0, getConditionalExposureRateSync: () => 0 } };
});
vi.mock('../src/lib/prisma', () => ({ prisma: fixture.db }));
vi.mock('../src/lib/assessment-engine/exposure-bootstrap', () => ({ bootstrapExposureFromDb: async () => {} }));
vi.mock('../src/lib/assessment-engine/exposure-store', () => ({ initExposureStore: () => {}, getExposureStore: async () => fixture.exposure }));
vi.mock('../src/lib/assessment-engine/calibration-service', () => ({ CalibrationService: { recalibrateItem: async () => {} } }));
vi.mock('../src/lib/scoring/scoring-queue', () => ({ enqueueScoringJob: async () => {} }));
import { AssessmentService } from '../src/lib/assessment-engine/server-engine';
import { invalidateItemCache } from '../src/lib/assessment-engine/item-bank-cache';
import { getProfile } from '../src/lib/product-lines/profiles';
import { SkillType } from '../src/lib/assessment-engine/types';
import { adaptiveItemWhere } from '../src/lib/assessment-engine/adaptive-policy';
const db = fixture.db, orgId = randomUUID(), candidateId = randomUUID();
let bank: Awaited<ReturnType<typeof db.item.findMany>>;

describe.runIf(process.env.B4SKILLS_ARBITRATION_DB_TEST === '1')('PostgreSQL adaptive delivery -> answer -> EAP -> next question', () => {
  beforeAll(async () => {
    await db.organization.create({ data: { id: orgId, name: 'Adaptive test', slug: orgId } });
    await db.user.create({ data: { id: candidateId, email: `${candidateId}@disposable.test`, name: 'Adaptive test', organizationId: orgId } });
    await db.license.create({ data: { organizationId: orgId, type: 'TRIAL', credits: 100 } });
    await db.systemConfig.upsert({ where: { id: 'global' }, create: { id: 'global', config: { useMirt: false, useGrmProductive: false } },
      update: { config: { useMirt: false, useGrmProductive: false } } });
    const data = Object.values(SkillType).flatMap(skill => Array.from({ length: 101 }, (_, n) => ({
      id: `${orgId}-${skill}-${n}`, skill, status: 'ACTIVE' as const, type: 'MULTIPLE_CHOICE' as const,
      cefrLevel: 'B1' as const, discrimination: 1.6, difficulty: -3 + .06 * n, guessing: .2,
      content: { prompt: 'Choose the answer.', options: ['right', 'wrong', 'third', 'fourth'], correctAnswer: 'A' },
      tags: ['general'], iqScore: 100,
    })));
    await db.item.createMany({ data }); bank = await db.item.findMany({ where: { id: { startsWith: orgId } } });
  });
  afterAll(async () => {
    await db.response.deleteMany({ where: { session: { organizationId: orgId } } });
    await db.scoreReport.deleteMany({ where: { session: { organizationId: orgId } } });
    await db.session.deleteMany({ where: { organizationId: orgId } });
    await db.license.deleteMany({ where: { organizationId: orgId } });
    await db.paymentTransaction.deleteMany({ where: { organizationId: orgId } });
    await db.user.deleteMany({ where: { organizationId: orgId } });
    await db.organization.delete({ where: { id: orgId } });
    await db.item.deleteMany({ where: { id: { startsWith: orgId } } });
    await db.$disconnect();
  });
  async function makeSession(metadata: object, theta = 0, sem = 1) {
    return db.session.create({ data: { organizationId: orgId, candidateId, status: 'IN_PROGRESS', startedAt: new Date(), theta, sem,
      metadata: { productLine: 'General English', sectionIndex: 0, currentItemId: '', ...metadata } } });
  }
  it('resolves legacy source aliases and explicit product lines without admitting unrelated sources', async () => {
    const prefix = `${orgId}-source-`;
    const variants = [
      { key: 'academic', tags: ['academic'], content: {} },
      { key: 'display-name', tags: ['Academia'], content: {} },
      { key: 'declared-corporate', tags: ['general', 'corporate-listening-job-interview'], content: { productLine: 'Corporate' } },
      { key: 'primary-only', tags: ['primary'], content: {} },
      { key: 'general-only', tags: ['general'], content: {} },
      { key: 'topic-only', tags: ['academic-research-topic'], content: {} },
    ];
    try {
      await db.item.createMany({ data: variants.map(v => ({ id: prefix + v.key, skill: 'LISTENING',
        status: 'ACTIVE', type: 'MULTIPLE_CHOICE', cefrLevel: 'B2', difficulty: 1, discrimination: 1.4,
        guessing: .25, tags: v.tags, content: v.content })) });
      const eligible = async (profile: string) => (await db.item.findMany({
        where: { ...adaptiveItemWhere(getProfile(profile), SkillType.LISTENING), id: { startsWith: prefix } },
        select: { id: true },
      })).map(row => row.id.slice(prefix.length)).sort();
      expect(await eligible('Academia')).toEqual(['academic', 'display-name']);
      expect(await eligible('Corporate')).toEqual(['declared-corporate']);
      expect(await eligible('Junior Suite (11-14)')).toEqual([]);
      expect(await eligible('Primary (7-10)')).toEqual([]); // B2 is outside its range.
      expect(await eligible('General English')).toHaveLength(variants.length);
    } finally { await db.item.deleteMany({ where: { id: { startsWith: prefix } } }); }
  });
  it('adapts real delivered questions differently for correct and incorrect submitted answers', async () => {
    const rng = vi.spyOn(Math, 'random').mockReturnValue(.5);
    try {
      const traces: { correct: boolean; theta: number; difficulty: number[] }[] = [];
      for (const correct of [true, false]) {
        const session = await makeSession({}); const difficulty: number[] = [], ids: string[] = [];
        for (let n = 0; n < 8; n++) {
          const delivered = await AssessmentService.getNextItem(session.id);
          expect(delivered.stop).toBe(false); expect(delivered.sectionTransition).toBe(false);
          const item = delivered.item!; ids.push(item.id); difficulty.push(item.params.b);
          expect(item.metadata).not.toHaveProperty('correctAnswer');
          const option = item.metadata!.options.indexOf(correct ? 'right' : 'wrong');
          await AssessmentService.submitResponse(session.id, item.id, String.fromCharCode(65 + option), 10000);
        }
        const stored = await db.session.findUniqueOrThrow({ where: { id: session.id }, include: { responses: true } });
        expect(stored.responses).toHaveLength(8); expect(new Set(ids).size).toBe(8);
        expect(stored.responses.every(response => response.score === (correct ? 1 : 0))).toBe(true);
        traces.push({ correct, theta: stored.theta, difficulty });
      }
      const meanLast = (values: number[]) => values.slice(-3).reduce((sum, b) => sum + b, 0) / 3;
      expect(traces[0].theta - traces[1].theta).toBeGreaterThan(1.5);
      expect(meanLast(traces[0].difficulty) - meanLast(traces[1].difficulty)).toBeGreaterThan(1);
      if (process.env.ADAPTIVE_TRACE_OUTPUT) writeFileSync(process.env.ADAPTIVE_TRACE_OUTPUT, JSON.stringify(traces, null, 2));
    } finally { rng.mockRestore(); }
  });
  it('selects using the current skill even when global ability strongly disagrees', async () => {
    const session = await makeSession({ sectionIndex: 1, skillProfiles: { GRAMMAR: { theta: -2, sem: .7 } } }, 2.8, .1);
    const delivered = await AssessmentService.getNextItem(session.id);
    expect(delivered.currentSection).toBe('GRAMMAR'); expect(delivered.item!.params.b).toBeLessThan(-1);
  });
  it('cannot finish an unscored skill using another skill’s small global error', async () => {
    const session = await makeSession({ sectionIndex: 1 }, 2.8, .1);
    const grammar = bank.filter(item => item.skill === 'GRAMMAR').slice(0, 8);
    await db.response.createMany({ data: grammar.map((item, n) => ({ sessionId: session.id, itemId: item.id,
      order: n + 1, score: null, value: '', metadata: { pendingAsyncScore: true } })) });
    const delivered = await AssessmentService.getNextItem(session.id);
    expect(delivered.sectionTransition).toBe(false); expect(delivered.currentSection).toBe('GRAMMAR');
    expect(delivered.item!.params.b).toBeLessThan(1);
  });
  it('returns the exact unanswered question on resume without another exposure', async () => {
    const session = await makeSession({});
    const first = await AssessmentService.getNextItem(session.id); const count = fixture.exposure.recordExposure.mock.calls.length;
    const resumed = await AssessmentService.getNextItem(session.id);
    expect(resumed.item!.id).toBe(first.item!.id); expect(resumed.item!.metadata).toEqual(first.item!.metadata);
    expect(fixture.exposure.recordExposure).toHaveBeenCalledTimes(count);
    await expect(AssessmentService.submitResponse(session.id, bank.find(item => item.id !== first.item!.id)!.id, 'A', 10000)).rejects.toThrow('current unanswered item');
  });
  it('keeps a delayed grade that finishes between an answer snapshot and its database lock', async () => {
    const session = await makeSession({ sectionIndex: 4 });
    const writing = bank.filter(item => item.skill === 'WRITING').slice(49, 51);
    await db.response.createMany({ data: writing.map((item, n) => ({ sessionId: session.id, itemId: item.id,
      order: n + 1, score: null, value: 'pending writing', metadata: { pendingAsyncScore: true } })) });
    const delivered = await AssessmentService.getNextItem(session.id);
    const option = delivered.item!.metadata!.options.indexOf('wrong');
    const originalTransaction = db.$transaction.bind(db);
    const transaction = vi.spyOn(db, '$transaction');
    transaction.mockImplementationOnce((async (work: any, options: any) => {
      // The incoming answer has already read the two pending responses.
      // Complete their grades and refresh ability before it takes its lock.
      await db.response.updateMany({ where: { sessionId: session.id }, data: {
        score: 1, isCorrect: true, metadata: { pendingAsyncScore: false, asyncScored: true } } });
      await AssessmentService.refreshSessionScoring(session.id);
      return originalTransaction(work, options);
    }) as any);
    try {
      const answer = await AssessmentService.submitResponse(session.id, delivered.item!.id,
        String.fromCharCode(65 + option), 10000);
      const stored = await db.session.findUniqueOrThrow({ where: { id: session.id }, include: { responses: true } });
      expect(stored.responses).toHaveLength(3);
      expect(stored.responses.filter(r => r.score === 1)).toHaveLength(2);
      expect(stored.theta).toBeGreaterThan(0);
      expect((stored.metadata as any).skillProfiles.WRITING.theta).toBeGreaterThan(0);
      expect(answer.theta).toBe(stored.theta);
      expect(stored.responses.map(r => r.order).sort()).toEqual([1, 2, 3]);
    } finally { transaction.mockRestore(); }
  });
  it('clears completed-report pending status after scoring failure without granting a grade', async () => {
    const session = await makeSession({ sectionIndex: 4 });
    const item = bank.find(item => item.skill === 'WRITING')!;
    const response = await db.response.create({ data: { sessionId: session.id, itemId: item.id,
      order: 1, value: 'writing awaiting evaluation', score: null, metadata: { pendingAsyncScore: true } } });
    await AssessmentService.finalizeSession(session.id, 0);
    const before = await db.session.findUniqueOrThrow({ where: { id: session.id } });
    expect((before.metadata as any).pendingAsyncScoring).toBe(true);
    await db.response.update({ where: { id: response.id }, data: { score: null, isCorrect: null,
      metadata: { pendingAsyncScore: false, asyncScored: true, requiresHumanReview: true, scoreFailed: true, aiUnavailable: true } } });
    await AssessmentService.refreshSessionScoring(session.id);
    const after = await db.session.findUniqueOrThrow({ where: { id: session.id }, include: { scoreReport: true } });
    expect(after.status).toBe('COMPLETED'); expect(after.completedAt).toEqual(before.completedAt);
    expect(after.metadata).toMatchObject({ pendingAsyncScoring: false, pendingCount: 0 });
    expect(after.scoreReport).toMatchObject({ isVerified: false, writingScore: null });
    expect(after.scoreReport!.diagnosticReport).toMatchObject({ scoringComplete: false });
  });
  it('waits for the session lock before reading the final report evidence', async () => {
    const session = await makeSession({ sectionIndex: 4 });
    const item = bank.find(item => item.skill === 'WRITING')!;
    const response = await db.response.create({ data: { sessionId: session.id, itemId: item.id,
      order: 1, value: 'pending', score: null, metadata: { pendingAsyncScore: true } } });
    let unlock!: () => void, locked!: () => void;
    const release = new Promise<void>(resolve => { unlock = resolve; });
    const acquired = new Promise<void>(resolve => { locked = resolve; });
    const holder = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${session.id} FOR UPDATE`;
      locked(); await release;
    });
    await acquired;
    const finishing = AssessmentService.finalizeSession(session.id, 0);
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 50 && !waiting; attempt++) {
        const rows = await db.$queryRaw<Array<{ waiting: boolean }>>`
          SELECT EXISTS (SELECT 1 FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'
            AND query LIKE '%Session%') AS waiting`;
        waiting = rows[0].waiting;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      // This grade arrives while finalization is queued behind the session lock.
      await db.response.update({ where: { id: response.id }, data: { score: 1, isCorrect: true,
        metadata: { pendingAsyncScore: false, asyncScored: true } } });
    } finally { unlock(); await holder; await finishing; }
    const saved = await db.session.findUniqueOrThrow({ where: { id: session.id }, include: { scoreReport: true } });
    expect(saved.theta).toBeGreaterThan(0);
    expect(saved.metadata).toMatchObject({ pendingAsyncScoring: false, pendingCount: 0 });
    expect(saved.scoreReport!.diagnosticReport).toMatchObject({ overallTheta: saved.theta });
  });
  it('caps repeated passage questions using full administered content, not the remaining pool', async () => {
    const session = await makeSession({ sectionIndex: 2 });
    const reading = bank.filter(item => item.skill === 'READING').slice(0, 2);
    for (const item of reading) await db.item.update({ where: { id: item.id }, data: {
      content: { ...(item.content as any), passage: 'Previously read passage.' } } });
    const repeat = await db.item.create({ data: { id: `${orgId}-repeat-passage`, skill: 'READING', type: 'MULTIPLE_CHOICE', status: 'ACTIVE',
      cefrLevel: 'B1', discrimination: 10, difficulty: 0, guessing: 0, tags: ['general'],
      content: { prompt: 'Repeated passage question', passage: 'Previously read passage.', options: ['a', 'b'], correctAnswer: 'A' } } });
    await db.response.createMany({ data: reading.map((item, n) => ({ sessionId: session.id, itemId: item.id, order: n + 1, score: 1, value: 'A' })) });
    invalidateItemCache();
    expect((await AssessmentService.getNextItem(session.id)).item!.id).not.toBe(repeat.id);
  });
  it('finishes all six sections within the global limit while preserving every skill minimum', async () => {
    const session = await makeSession({}); const profile = getProfile('General English');
    const counts: Record<string, number> = {}; let complete = false;
    for (let step = 0; step < 80; step++) {
      const result = await AssessmentService.getNextItem(session.id);
      if (result.stop) { complete = true; break; }
      if (result.sectionTransition) continue;
      const item = result.item!;
      counts[item.skill] = (counts[item.skill] ?? 0) + 1;
      const option = item.metadata!.options.indexOf('wrong');
      await AssessmentService.submitResponse(session.id, item.id, String.fromCharCode(65 + option), 10000);
    }
    expect(complete).toBe(true);
    for (const skill of profile.sectionOrder) {
      expect(counts[skill]).toBeGreaterThanOrEqual(profile.sectionConfig[skill].minItems);
      expect(counts[skill]).toBeLessThanOrEqual(profile.sectionConfig[skill].maxItems);
    }
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(profile.globalMaxItems);
  });
  it('does not inject anchors from a different product or CEFR range', async () => {
    const foreign = await db.item.create({ data: { id: `${orgId}-foreign-anchor`, skill: 'LISTENING', type: 'MULTIPLE_CHOICE', status: 'ACTIVE', cefrLevel: 'C2',
      discrimination: 3, difficulty: 0, guessing: 0, isAnchor: true, tags: ['toefl'], content: { prompt: 'Foreign anchor' } } });
    const allowed = await db.item.create({ data: { id: `${orgId}-allowed-anchor`, skill: 'LISTENING', type: 'MULTIPLE_CHOICE', status: 'ACTIVE', cefrLevel: 'A1',
      discrimination: 1, difficulty: 0, guessing: .2, isAnchor: true, tags: [], content: { prompt: 'Allowed anchor', options: ['a', 'b'], correctAnswer: 'A' } } });
    invalidateItemCache();
    const session = await makeSession({ productLine: 'Primary (7-10)' });
    const result = await AssessmentService.getNextItem(session.id); expect(result.item!.id).toBe(allowed.id);
    const stored = await db.session.findUniqueOrThrow({ where: { id: session.id } });
    expect((stored.metadata as any).anchorAdministered).toEqual([allowed.id]);
    expect((stored.metadata as any).anchorAdministered).not.toContain(foreign.id);
  });
  it('does not force-advance or finalize when an eligible pool is exhausted', async () => {
    const session = await makeSession({ productLine: 'Academia', sectionIndex: 1 });
    await expect(AssessmentService.getNextItem(session.id)).rejects.toMatchObject({ statusCode: 503, code: 'ASSESSMENT_ITEMS_UNAVAILABLE' });
    const stored = await db.session.findUniqueOrThrow({ where: { id: session.id }, include: { scoreReport: true } });
    expect(stored.status).toBe('IN_PROGRESS'); expect((stored.metadata as any).sectionIndex).toBe(1); expect(stored.scoreReport).toBeNull();
  });
  it('does not count PRETEST or out-of-range items as launch coverage', async () => {
    await db.item.createMany({ data: Array.from({ length: 20 }, (_, n) => ({ id: `${orgId}-pretest-${n}`, skill: 'LISTENING' as const, type: 'MULTIPLE_CHOICE' as const,
      status: 'PRETEST' as const, cefrLevel: 'A1' as const, isPretest: true, content: { prompt: 'Not operational' } })) });
    const before = await db.session.count({ where: { organizationId: orgId } });
    await expect(AssessmentService.launchSession(candidateId, orgId, 'Primary (7-10)')).rejects.toThrow('eligible ACTIVE operational');
    expect(await db.session.count({ where: { organizationId: orgId } })).toBe(before);
  });
  it('serializes pause and resume requests, rejects paused answers and resumes the same adaptive question after a day', async () => {
    const session = await makeSession({});
    const first = await AssessmentService.getNextItem(session.id);
    const pausedAt = new Date(Date.now()-24*3600000);
    await db.session.update({where:{id:session.id},data:{startedAt:new Date(pausedAt.getTime()-60000)}});
    const pause = createSessionPauseService(db);
    await Promise.all([pause.change(session.id,candidateId,'pause',pausedAt),pause.change(session.id,candidateId,'pause',pausedAt)]);
    await expect(AssessmentService.getNextItem(session.id)).rejects.toMatchObject({statusCode:409});
    await expect(AssessmentService.submitResponse(session.id,first.item!.id,'A',10000)).rejects.toMatchObject({statusCode:409});
    expect(await db.response.count({where:{sessionId:session.id}})).toBe(0);
    await Promise.all([pause.resume(session.id,candidateId),pause.resume(session.id,candidateId)]);
    const next = await AssessmentService.getNextItem(session.id);
    expect(next.item!.id).toBe(first.item!.id);
    expect(next.elapsedMs).toBeGreaterThanOrEqual(60000);
    expect(next.elapsedMs).toBeLessThan(65000);
    await AssessmentService.submitResponse(session.id,next.item!.id,'A',10000);
    expect(await db.response.count({where:{sessionId:session.id}})).toBe(1);
    await expect(pause.pause(session.id,candidateId)).rejects.toMatchObject({statusCode:409});
  });

});
