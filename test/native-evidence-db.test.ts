import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { reserveEvidence, commitEvidence } from '../src/lib/proctoring/native-evidence';
import { photoReservation, sampleJPEG } from './helpers/native-evidence';
const url = process.env.B4_NATIVE_TEST_DB_URL;
if (url && !/^postgresql:\/\/[^@]+@127\.0\.0\.1:55432\/b4skills_apple_e2e(?:\?.*)?$/.test(url)) throw Error('Isolated localhost database required.');
describe.runIf(!!url)('native private evidence, isolated PostgreSQL', () => {
  let db: PrismaClient;
  const org = randomUUID(), uid = randomUUID(), sessionId = randomUUID();
  beforeAll(async () => {
    vi.stubEnv('STORAGE_PROVIDER', 'supabase');
    db = new PrismaClient({ datasources: { db: { url } } });
    await db.organization.create({ data: { id: org, name: 'Evidence regression', slug: org, settings: { nativeCameraPilot: { enabled: true, retentionDays: 7 } } } });
    await db.user.create({ data: { id: uid, email: `${uid}@example.test`, organizationId: org, role: 'CANDIDATE' } });
    await db.session.create({ data: { id: sessionId, candidateId: uid, organizationId: org, status: 'IN_PROGRESS' } });
  });
  afterAll(async () => {
    await db.session.deleteMany({ where: { organizationId: org } });
    await db.user.delete({ where: { id: uid } }); await db.organization.delete({ where: { id: org } });
    await db.$disconnect(); vi.unstubAllEnvs();
  });
  it('reserves once concurrently and refuses ID reuse with changed content', async () => {
    const body = photoReservation(sessionId);
    const results = await Promise.all([reserveEvidence(db, body), reserveEvidence(db, body)]);
    expect(results[0]).toEqual(results[1]);
    expect(await db.proctoringEvent.count({ where: { sessionId } })).toBe(1);
    await expect(reserveEvidence(db, { ...body, bytes: body.bytes + 1 })).rejects.toMatchObject({ code: 'EVIDENCE_ID_CONFLICT' });
  });
  it('recovers upload-success/database-failure and lost ACK with one immutable object and event', async () => {
    const body = photoReservation(sessionId); await reserveEvidence(db, body);
    const commit = { version: 1 as const, evidenceId: body.evidenceId, sessionId, base64: sampleJPEG().toString('base64') };
    const objects = new Map<string, Buffer>();
    const upload = vi.fn(async (reference, bytes) => { if (objects.has(reference.key)) expect(objects.get(reference.key)).toEqual(bytes); else objects.set(reference.key, bytes); });
    const fail = vi.spyOn(db.proctoringEvent, 'updateMany').mockRejectedValueOnce(new Error('database unavailable'));
    await expect(commitEvidence(db, commit, upload)).rejects.toThrow('database unavailable'); fail.mockRestore();
    expect((await db.proctoringEvent.findUniqueOrThrow({ where: { id: `evidence_${body.evidenceId}` } })).type).toBe('EVIDENCE_PENDING');
    const ack = await commitEvidence(db, commit, upload);
    expect(await commitEvidence(db, commit, upload)).toEqual(ack);
    expect(objects.size).toBe(1); expect(upload).toHaveBeenCalledTimes(2);
    expect(await db.proctoringEvent.count({ where: { id: ack.eventId } })).toBe(1);
    await expect(commitEvidence(db, { ...commit, base64: Buffer.from('changed').toString('base64') }, upload)).rejects.toMatchObject({ code: 'EVIDENCE_DIGEST_MISMATCH' });
  });
  it('enforces per-session quota and expires unfinished uploads', async () => {
    const body = photoReservation(sessionId); await reserveEvidence(db, body);
    await expect(reserveEvidence(db, photoReservation(sessionId))).rejects.toMatchObject({ code: 'EVIDENCE_QUOTA' });
    const id = `evidence_${body.evidenceId}`;
    const row = await db.proctoringEvent.findUniqueOrThrow({ where: { id } });
    await db.proctoringEvent.update({ where: { id }, data: { metadata: { ...(row.metadata as object), uploadDeadline: '2000-01-01T00:00:00Z' } } });
    const upload = vi.fn();
    await expect(commitEvidence(db, { version: 1, evidenceId: body.evidenceId, sessionId, base64: sampleJPEG().toString('base64') }, upload)).rejects.toMatchObject({ code: 'EVIDENCE_UPLOAD_EXPIRED' });
    expect(upload).not.toHaveBeenCalled();
  });
});
