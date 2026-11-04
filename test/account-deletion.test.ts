import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_DELETION_CONFIRMATION, AccountDeletionError, deleteOwnAccount, isDeletedAccountEmail, scrubAudio, type AccountDeletionDeps,
} from '../src/lib/compliance/account-deletion';

type Row = Record<string, any>;

/** In-memory stand-in for the Prisma calls the service makes. */
function fakeDb(seed: { users: Row[]; reports?: Row[]; sessions?: Row[]; events?: Row[]; responses?: Row[]; codes?: Row[]; profiles?: Row[]; members?: Row[]; audit?: Row[] }) {
  const t = {
    users: seed.users, reports: seed.reports ?? [], sessions: seed.sessions ?? [], events: seed.events ?? [], responses: seed.responses ?? [],
    codes: seed.codes ?? [], profiles: seed.profiles ?? [], members: seed.members ?? [], audit: seed.audit ?? [],
  };
  const inIds = (where: any, key: string) => (r: Row) => where[key]?.in ? where[key].in.includes(r[key]) : r[key] === where[key];
  const update = (rows: Row[]) => async ({ where, data }: any) => Object.assign(rows.find(r => r.id === where.id)!, data);
  const db: any = {
    user: { findUnique: async ({ where }: any) => t.users.find(u => u.id === where.id) ?? null, update: update(t.users) },
    session: { findMany: async ({ where }: any) => t.sessions.filter(s => s.candidateId === where.candidateId), update: update(t.sessions) },
    proctoringEvent: { findMany: async ({ where }: any) => t.events.filter(inIds(where, 'sessionId')), update: update(t.events) },
    scoreReport: { findMany: async ({ where }: any) => t.reports.filter(inIds(where, 'sessionId')), update: update(t.reports) },
    response: { findMany: async ({ where }: any) => t.responses.filter(inIds(where, 'sessionId')), update: update(t.responses) },
    assessmentConsent: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    candidateProfile: { deleteMany: async ({ where }: any) => { t.profiles = t.profiles.filter(p => p.userId !== where.userId); } },
    classMember: { deleteMany: async ({ where }: any) => { t.members = t.members.filter(p => p.userId !== where.userId); } },
    examCode: { updateMany: async ({ where, data }: any) => { t.codes.filter(c => c.usedByEmail === where.usedByEmail).forEach(c => Object.assign(c, data)); } },
    auditLog: {
      updateMany: async ({ where, data }: any) => { t.audit.filter(a => a.userId === where.userId).forEach(a => Object.assign(a, data)); },
      create: async ({ data }: any) => { t.audit.push(data); },
    },
  };
  db.$transaction = vi.fn(async (fn: (tx: any) => unknown, _options?: unknown) => fn(db));
  return { db, t };
}

const deps = (over: Partial<AccountDeletionDeps> = {}): AccountDeletionDeps => ({
  verifyPassword: async (plain, hash) => hash === `hash:${plain}`,
  deleteObject: vi.fn(async () => {}),
  reference: (_purpose, key, provider, bucket) => ({ key, provider, bucket: bucket ?? 'default-bucket' }),
  now: () => new Date('2026-11-01T10:00:00Z'),
  ...over,
});

const candidate = (over: Row = {}) => ({ id: 'u1', role: 'CANDIDATE', email: 'ada@example.com', name: 'Ada Yılmaz', password: null,
  refreshToken: 'r', oauthProvider: 'google', oauthProviderId: 'sub', twoFactorSecret: 's', twoFactorEnabled: true, image: 'x', ...over });

describe('scrubAudio', () => {
  it('removes base64 audio and keeps other fields', () => {
    expect(JSON.parse(scrubAudio(JSON.stringify({ audio: 'AAAA', mimeType: 'audio/mp4' }))!)).toEqual({ mimeType: 'audio/mp4', audioErased: true });
  });
  it('leaves non-audio answers alone', () => {
    expect(scrubAudio('B')).toBeNull();
    expect(scrubAudio('My essay mentions "audio" equipment.')).toBeNull();
    expect(scrubAudio(null)).toBeNull();
  });
});

describe('deleteOwnAccount', () => {
  it('requires the explicit confirmation constant', async () => {
    const { db } = fakeDb({ users: [candidate()] });
    await expect(deleteOwnAccount(db, 'u1', {}, deps())).rejects.toMatchObject({ status: 400, code: 'confirmation_required' });
  });

  it('refuses staff accounts', async () => {
    const { db } = fakeDb({ users: [candidate({ role: 'TEACHER' })] });
    await expect(deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION }, deps())).rejects.toMatchObject({ status: 403, code: 'staff_account' });
  });

  it('asks password accounts for the password and answers 403 (never 401) when it is wrong', async () => {
    const { db, t } = fakeDb({ users: [candidate({ password: 'hash:secret' })] });
    await expect(deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION }, deps())).rejects.toMatchObject({ status: 403, code: 'password_required' });
    await expect(deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION, password: 'nope' }, deps())).rejects.toMatchObject({ status: 403, code: 'invalid_password' });
    expect(t.users[0].email).toBe('ada@example.com');
    const result = await deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION, password: 'secret' }, deps());
    expect(result.deleted).toBe(true);
  });

  it('erases identity, media and links while keeping de-identified scores', async () => {
    const { db, t } = fakeDb({
      users: [candidate()],
      sessions: [
        { id: 's1', candidateId: 'u1', status: 'COMPLETED', metadata: { ipAddress: '1.2.3.4', userAgent: 'UA', sectionIndex: 3,
          identitySnapshotKey: 'identity/s1.jpg', identitySnapshotProvider: 'supabase', identitySnapshotBucket: 'id-bucket' } },
        { id: 's2', candidateId: 'u1', status: 'IN_PROGRESS', metadata: null },
        { id: 'other', candidateId: 'u2', status: 'IN_PROGRESS', metadata: { ipAddress: '9.9.9.9' } },
      ],
      events: [
        { id: 'evidence_a', sessionId: 's1', type: 'SCREENSHOT', metadata: { reference: { provider: 's3', bucket: 'p', key: 'native/s1/a.jpg' } } },
        { id: 'e2', sessionId: 's2', type: 'SCREENSHOT', metadata: { evidenceKey: 'web/s2.jpg', evidenceProvider: 'supabase', evidenceBucket: 'pb' } },
        { id: 'e3', sessionId: 's2', type: 'TAB_SWITCH', metadata: { count: 1 } },
      ],
      responses: [
        { id: 'r1', sessionId: 's1', value: JSON.stringify({ audio: 'AAAA', mimeType: 'audio/mp4' }), artifactUrl: null, score: 0.7 },
        { id: 'r2', sessionId: 's1', value: 'My name is Ada, phone 5551234', metadata: { transcript: 'My name is Ada', aiFeedback: 'Ada said...' }, artifactUrl: null, score: 1 },
        { id: 'r3', sessionId: 's2', value: null, artifactUrl: 's3://old/audio.m4a', score: null },
      ],
      reports: [
        { id: 'rep1', sessionId: 's1', certificateUrl: 'https://cert', isVerified: true, diagnosticReport: { cefr: 'B2', signedCertificate: { payload: { candidateName: 'Ada Yılmaz' } } } },
        { id: 'rep2', sessionId: 's2', certificateUrl: null, isVerified: false, diagnosticReport: { cefr: 'B1' } },
      ],
      codes: [{ id: 'c1', usedByEmail: 'ada@example.com' }, { id: 'c2', usedByEmail: 'someone@example.com' }],
      profiles: [{ userId: 'u1' }, { userId: 'u2' }],
      members: [{ userId: 'u1' }],
      audit: [{ userId: 'u1', ipAddress: '1.2.3.4' }],
    });
    const d = deps();
    const result = await deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION }, d);

    expect(result).toEqual({ deleted: true, sessions: 2, closedSessions: 1, erasedAudio: 2, erasedMedia: 3, withdrawnCertificates: 1 });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 's3', bucket: 'p', key: 'native/s1/a.jpg' });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 'supabase', bucket: 'pb', key: 'web/s2.jpg' });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 'supabase', bucket: 'id-bucket', key: 'identity/s1.jpg' });

    expect(t.users[0]).toMatchObject({ email: 'deleted-u1@deleted.invalid', name: null, password: null, refreshToken: null,
      oauthProvider: null, oauthProviderId: null, twoFactorSecret: null, twoFactorEnabled: false, image: null });
    expect(t.sessions[0].metadata).toEqual({ sectionIndex: 3, identitySnapshotErasedAt: '2026-11-01T10:00:00.000Z' });
    expect(t.sessions[1].status).toBe('EXPIRED');
    expect(t.sessions[2]).toMatchObject({ status: 'IN_PROGRESS', metadata: { ipAddress: '9.9.9.9' } });
    expect(t.events.map(e => e.type)).toEqual(['EVIDENCE_ERASED', 'EVIDENCE_ERASED', 'TAB_SWITCH']);
    expect(JSON.stringify(t.events[0].metadata)).not.toContain('native/s1');
    expect(t.responses[0].value).toBeNull();
    expect(t.responses[0].score).toBe(0.7);
    expect(t.responses[1].value).toBeNull();
    expect(t.responses[1].metadata).toMatchObject({ contentErased: true });
    expect(JSON.stringify(t.responses)).not.toContain('Ada');
    expect(JSON.stringify(t.responses)).not.toContain('5551234');
    expect(t.responses[2].artifactUrl).toBeNull();
    expect(t.codes).toEqual([{ id: 'c1', usedByEmail: 'deleted-u1@deleted.invalid' }, { id: 'c2', usedByEmail: 'someone@example.com' }]);
    expect(t.reports[0]).toMatchObject({ certificateUrl: null, isVerified: false,
      diagnosticReport: { cefr: 'B2', certificateWithdrawn: { reason: 'account-deleted' } } });
    expect(JSON.stringify(t.reports)).not.toContain('Ada');
    expect(t.reports[1].diagnosticReport).toEqual({ cefr: 'B1' });
    expect(t.profiles).toEqual([{ userId: 'u2' }]);
    expect(t.members).toEqual([]);
    expect(t.audit[0].ipAddress).toBeNull();
    expect(t.audit[1]).toMatchObject({ action: 'PRIVACY:ACCOUNT_DELETED_BY_USER', entityId: 'u1' });
    expect(JSON.stringify(t.audit[1])).not.toContain('ada@example.com');
  });

  it('changes nothing when storage deletion fails', async () => {
    const { db, t } = fakeDb({
      users: [candidate()],
      sessions: [{ id: 's1', candidateId: 'u1', status: 'COMPLETED', metadata: {} }],
      events: [{ id: 'evidence_a', sessionId: 's1', type: 'SCREENSHOT', metadata: { reference: { provider: 's3', bucket: 'p', key: 'k.jpg' } } }],
    });
    const failing = deps({ deleteObject: async () => { throw new Error('down'); } });
    const error = await deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION }, failing).catch(e => e);
    expect(error).toBeInstanceOf(AccountDeletionError);
    expect(error).toMatchObject({ status: 503, code: 'storage_unavailable' });
    expect(t.users[0].email).toBe('ada@example.com');
    expect(t.events[0].type).toBe('SCREENSHOT');
  });

  it('runs in one transaction with a timeout long enough for many sessions, erasing answer content including free text and copied AI metadata', async () => {
    const { db } = fakeDb({ users: [candidate()], sessions: [{ id: 's1', candidateId: 'u1', status: 'COMPLETED', metadata: {} }] });
    const findMany = vi.spyOn(db.response, 'findMany');
    await deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION }, deps());
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$transaction.mock.calls[0][1]).toMatchObject({ timeout: 60_000 });
    expect((findMany.mock.calls[0][0] as any).where).toEqual({ sessionId: { in: ['s1'] } });
  });
});

describe('isDeletedAccountEmail', () => {
  it('recognises only anonymised deleted accounts', () => {
    expect(isDeletedAccountEmail('deleted-u1@deleted.invalid')).toBe(true);
    expect(isDeletedAccountEmail('ada@example.com')).toBe(false);
    expect(isDeletedAccountEmail(null)).toBe(false);
  });
});
