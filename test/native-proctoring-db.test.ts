import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admitCurrentExam, examPolicy } from '../src/lib/proctoring/exam-policy';
import { storeNativeEvent } from '../src/lib/proctoring/native-events';
import { NativeProctoringEventBody } from '../src/lib/security/schemas/proctoring';
const url = process.env.B4_NATIVE_TEST_DB_URL;
if (url && !/^postgresql:\/\/[^@]+@127\.0\.0\.1:55432\/b4skills_apple_e2e(?:\?.*)?$/.test(url)) throw new Error('Isolated localhost database required.');
describe.runIf(!!url)('native event idempotency, PostgreSQL', () => {
  let db: PrismaClient;
  const org = randomUUID(), uid = randomUUID(), sessionId = randomUUID(), otherSessionId = randomUUID();
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    await db.organization.create({ data: { id: org, name: 'Native event regression', slug: org } });
    await db.user.create({ data: { id: uid, email: `${uid}@example.test`, organizationId: org, role: 'CANDIDATE' } });
    await db.license.create({ data: { organizationId: org, type: 'ENTERPRISE', credits: 2 } });
    for (const id of [sessionId, otherSessionId]) await db.session.create({ data: { id, candidateId: uid, organizationId: org } });
  });
  afterAll(async () => {
    await db.session.deleteMany({ where: { organizationId: org } });
    await db.license.deleteMany({ where: { organizationId: org } });
    await db.user.delete({ where: { id: uid } }); await db.organization.delete({ where: { id: org } }); await db.$disconnect();
  });
  const event = () => NativeProctoringEventBody.parse({ version: 2, eventId: randomUUID(), sequence: 0, sessionId, platform: 'macos', eventType: 'TAB_BLUR', timestamp: '2026-10-24T09:00:00.000Z', metadata: { reason: 'background', sample: true } });
  it('commits one row under concurrent duplicate delivery, then acknowledges a replay', async () => {
    const body = event(); const [a, b] = await Promise.all([storeNativeEvent(db, body), storeNativeEvent(db, body)]);
    expect(a).toEqual(b); expect(a.accepted).toBe(true);
    expect(await db.proctoringEvent.count({ where: { id: `native_${body.eventId}` } })).toBe(1);
    expect(await storeNativeEvent(db, { ...body, metadata: { sample: true, reason: 'background' } })).toEqual(a);
  });
  it('refuses changed contents and a different session without overwriting the original', async () => {
    const body = event(); await storeNativeEvent(db, body);
    await expect(storeNativeEvent(db, { ...body, sequence: 99 })).rejects.toMatchObject({ code: 'EVENT_ID_CONFLICT' });
    await expect(storeNativeEvent(db, { ...body, sessionId: otherSessionId })).rejects.toMatchObject({ code: 'EVENT_ID_CONFLICT' });
    expect((await db.proctoringEvent.findUniqueOrThrow({ where: { id: `native_${body.eventId}` } })).sessionId).toBe(sessionId);
  });
  it('rechecks current policy inside the debit transaction and persists the exact admission snapshot', async () => {
    const stale = examPolicy({});
    const settings = { nativeExamPolicy: { mode: 'standard', lifecycleEvents: true } };
    await db.organization.update({ where: { id: org }, data: { settings } });
    const capabilities = { version: 1 as const, platform: 'ipad' as const, microphone: true, lifecycleEvents: true, durableEvents: true, cameraEvidence: false, assessmentMode: false };
    const launch = (revision: string, fail = false) => db.$transaction(async tx => {
      const admission = await admitCurrentExam(tx, org, { accepted: true, policyRevision: revision, capabilities });
      await tx.license.updateMany({ where: { organizationId: org }, data: { credits: { decrement: 1 } } });
      if (fail) throw new Error('Session persistence failed');
      return tx.session.create({ data: { candidateId: uid, organizationId: org, metadata: { examAdmission: admission! } } });
    });
    await expect(launch(stale.revision)).rejects.toMatchObject({ code: 'EXAM_POLICY_CHANGED' });
    expect((await db.license.findFirstOrThrow({ where: { organizationId: org } })).credits).toBe(2);
    const current = examPolicy(settings);
    const created = await launch(current.revision);
    expect(created.metadata).toMatchObject({ examAdmission: { policy: current, capabilities } });
    await expect(launch(current.revision, true)).rejects.toThrow('Session persistence failed');
    expect((await db.license.findFirstOrThrow({ where: { organizationId: org } })).credits).toBe(1);
  });
});
