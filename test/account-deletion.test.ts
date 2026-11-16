import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_DELETION_CONFIRMATION, AccountDeletionError, deleteOwnAccount, isDeletedAccountEmail, scrubAudio, type AccountDeletionDeps,
} from '../src/lib/compliance/account-deletion';

type Row = Record<string, any>;
beforeEach(() => vi.stubEnv('LEGACY_RESPONSE_BUCKETS','old'));
afterEach(() => vi.unstubAllEnvs());

/** In-memory stand-in for the Prisma calls the service makes. */
function fakeDb(seed: { users: Row[]; reports?: Row[]; sessions?: Row[]; events?: Row[]; responses?: Row[]; codes?: Row[]; profiles?: Row[]; members?: Row[]; audit?: Row[] }) {
  const t = {
    users: seed.users, reports: seed.reports ?? [], sessions: seed.sessions ?? [], events: seed.events ?? [], responses: seed.responses ?? [],
    codes: seed.codes ?? [], profiles: seed.profiles ?? [], members: seed.members ?? [], audit: seed.audit ?? [],
  };
  const matches = (r: Row, w: any): boolean => Object.entries(w).every(([key,v]: any) => {
    if(key==='OR') return v.some((clause: any)=>matches(r,clause));
    if(key==='response') return t.responses.some(x=>x.id===r.responseId && matches(x,v));
    if(v && typeof v==='object') { if(v.in)return v.in.includes(r[key]); if(v.lte)return r[key]<=v.lte; }
    return v===null ? r[key]==null : r[key]===v;
  });
  const apply = (r: Row, data: any) => { for(const [key,value] of Object.entries(data)) r[key]=(value as any)?.increment ? (r[key]??0)+(value as any).increment : value; return r; };
  const model = (key: string) => ({
    findMany: async ({where}: any={}) => (t as any)[key].filter((r: Row)=>!where||matches(r,where)),
    findUnique: async ({where}: any) => (t as any)[key].find((r: Row)=>matches(r,where)) ?? null,
    findUniqueOrThrow: async ({where}: any) => {const row=(t as any)[key].find((r: Row)=>matches(r,where));if(!row)throw Error('missing');return row;},
    count: async ({where}: any) => (t as any)[key].filter((r: Row)=>matches(r,where)).length,
    update: async ({where,data}: any) => apply((t as any)[key].find((r: Row)=>matches(r,where)),data),
    updateMany: async ({where,data}: any) => {const rows=(t as any)[key].filter((r: Row)=>matches(r,where));rows.forEach((r: Row)=>apply(r,data));return {count:rows.length};},
    delete: async ({where}: any) => {(t as any)[key]=(t as any)[key].filter((r: Row)=>!matches(r,where));},
    deleteMany: async ({where}: any) => {(t as any)[key]=(t as any)[key].filter((r: Row)=>!matches(r,where));},
    create: async ({data}: any) => {(t as any)[key].push(data);return data;},
    upsert: async ({where,create,update}: any) => {const row=(t as any)[key].find((r: Row)=>matches(r,where));if(row)return apply(row,update);const added={createdAt:new Date(),nextAttemptAt:new Date(0),attempts:0,deletedAt:null,...create};(t as any)[key].push(added);return added;},
  });
  Object.assign(t,{outbox:[],ledger:[],ratings:[],feedback:[],lti:[],validity:[]});
  const db: any = { $queryRaw:vi.fn(async()=>[]),user:model('users'),session:model('sessions'),proctoringEvent:model('events'),
    scoreReport:model('reports'),response:model('responses'),assessmentConsent:{deleteMany:vi.fn()},
    candidateProfile:model('profiles'),classMember:model('members'),examCode:model('codes'),auditLog:model('audit'),
    erasureObject:model('outbox'),erasureLedger:model('ledger'),ratingTask:model('ratings'),feedback:model('feedback'),
    ltiSession:model('lti'),concurrentValidityRecord:model('validity') };
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

  it('erases identity and all assessment content while keeping unrelated sessions', async () => {
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

    expect(result).toEqual({ deleted: true, sessions: 2, closedSessions: 1, erasedAudio: 2, erasedMedia: 4, withdrawnCertificates: 1, storageDeletionPending: 0 });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 's3', bucket: 'p', key: 'native/s1/a.jpg' });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 'supabase', bucket: 'pb', key: 'web/s2.jpg' });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 'supabase', bucket: 'id-bucket', key: 'identity/s1.jpg' });

    expect(t.users[0]).toMatchObject({ email: 'deleted-u1@deleted.invalid', name: null, password: null, refreshToken: null,
      oauthProvider: null, oauthProviderId: null, twoFactorSecret: null, twoFactorEnabled: false, image: null });
    expect(t.sessions).toHaveLength(1);
    expect(t.sessions[0]).toMatchObject({status:'IN_PROGRESS',metadata:{ipAddress:'9.9.9.9'}});
    expect(t.events).toEqual([]);
    expect(t.responses).toEqual([]);
    expect(t.codes).toEqual([{ id: 'c1', usedByEmail: 'deleted-u1@deleted.invalid' }, { id: 'c2', usedByEmail: 'someone@example.com' }]);
    expect(t.reports).toEqual([]);
    expect(t.profiles).toEqual([{ userId: 'u2' }]);
    expect(t.members).toEqual([]);
    expect(t.audit[0].ipAddress).toBeNull();
    expect(t.audit[1]).toMatchObject({ action: 'PRIVACY:ACCOUNT_DELETED_BY_USER', entityId: 'u1' });
    expect(JSON.stringify(t.audit[1])).not.toContain('ada@example.com');
  });

  it('keeps a durable retry when storage fails after database erasure', async () => {
    const { db, t } = fakeDb({
      users: [candidate()],
      sessions: [{ id: 's1', candidateId: 'u1', status: 'COMPLETED', metadata: {} }],
      events: [{ id: 'evidence_a', sessionId: 's1', type: 'SCREENSHOT', metadata: { reference: { provider: 's3', bucket: 'p', key: 'k.jpg' } } }],
    });
    const failing = deps({ deleteObject: async () => { throw new Error('down'); } });
    const error = await deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION }, failing).catch(e => e);
    expect(error).toMatchObject({deleted:true,storageDeletionPending:1});
    expect(t.users[0].email).toBe('deleted-u1@deleted.invalid');
    expect(t.events).toEqual([]);
    expect((t as any).outbox[0]).toMatchObject({deletedAt:null,attempts:1,reference:{key:'k.jpg'}});
  });

  it('runs in one transaction with a timeout long enough for many sessions, erasing answer content including free text and copied AI metadata', async () => {
    const { db } = fakeDb({ users: [candidate()], sessions: [{ id: 's1', candidateId: 'u1', status: 'COMPLETED', metadata: {} }] });
    const findMany = vi.spyOn(db.response, 'findMany');
    await deleteOwnAccount(db, 'u1', { confirm: ACCOUNT_DELETION_CONFIRMATION }, deps());
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$transaction.mock.calls[0][1]).toMatchObject({ timeout: 60_000 });
    expect((findMany.mock.calls[0][0] as any).where).toEqual({ sessionId: 's1' });
  });
});

describe('isDeletedAccountEmail', () => {
  it('recognises only anonymised deleted accounts', () => {
    expect(isDeletedAccountEmail('deleted-u1@deleted.invalid')).toBe(true);
    expect(isDeletedAccountEmail('ada@example.com')).toBe(false);
    expect(isDeletedAccountEmail(null)).toBe(false);
  });
});
