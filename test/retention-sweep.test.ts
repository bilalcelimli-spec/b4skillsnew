import { describe, expect, it, vi } from 'vitest';
import { ANONYMOUS_CANDIDATE_EMAIL, cameraRetentionDays, runRetentionSweep, type RetentionSweepDeps } from '../src/lib/compliance/retention-sweep';
import { RETENTION } from '../src/lib/compliance/retention-policy';

const NOW = new Date('2026-11-02T12:00:00Z');
const days = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
type Row = Record<string, any>;

/**
 * Minimal in-memory Prisma stand-in. It evaluates only the filters the sweep uses;
 * the real Prisma/PostgreSQL behaviour of the JSON path filters is not covered here.
 */
function fakeDb(seed: { orgs?: Row[]; events?: Row[]; sessions?: Row[]; responses?: Row[]; reports?: Row[]; codes?: Row[]; users?: Row[] }) {
  const t = { orgs: seed.orgs ?? [{ id: 'o1', settings: null }], events: seed.events ?? [], sessions: seed.sessions ?? [],
    responses: seed.responses ?? [], reports: seed.reports ?? [], codes: seed.codes ?? [], users: seed.users ?? [] };
  const sessionOf = (id: string) => t.sessions.find(s => s.id === id);
  const lt = (v: any, f: any) => f?.lt ? new Date(v) < f.lt : true;
  const update = (rows: Row[]) => async ({ where, data }: any) => Object.assign(rows.find(r => r.id === where.id)!, data);
  const take = (rows: Row[], args: any) => rows.slice(0, args.take ?? rows.length);
  const codeHit = (where: any) => t.codes.filter(c => new Date(c.usedAt) < where.usedAt.lt && c.usedByEmail && c.usedByEmail !== ANONYMOUS_CANDIDATE_EMAIL);
  const db: any = {
    organization: { findMany: async () => t.orgs },
    proctoringEvent: {
      findMany: async (args: any) => take(t.events.filter(e => {
        const w = args.where;
        if (w.sessionId) return e.sessionId === w.sessionId;
        if (w.id?.startsWith && !e.id.startsWith(w.id.startsWith)) return false;
        if (w.id?.not?.startsWith && e.id.startsWith(w.id.not.startsWith)) return false;
        if (w.type?.in && !w.type.in.includes(e.type)) return false;
        if (typeof w.type === 'string' && e.type !== w.type) return false;
        if (w.metadata?.path?.[0] === 'expiresAt' && !(e.metadata?.expiresAt <= w.metadata.lte)) return false;
        if (w.metadata?.path?.[0] === 'evidenceKey' && typeof e.metadata?.evidenceKey !== 'string') return false;
        if (w.session && sessionOf(e.sessionId)?.organizationId !== w.session.organizationId) return false;
        return lt(e.timestamp, w.timestamp);
      }), args),
      update: update(t.events),
    },
    session: {
      findMany: async (args: any) => take(t.sessions.filter(s => {
        const w = args.where;
        if (w.organizationId && s.organizationId !== w.organizationId) return false;
        if (w.metadata?.path?.[0] === 'identitySnapshotKey' && typeof s.metadata?.identitySnapshotKey !== 'string') return false;
        if (w.candidateId?.not && s.candidateId === w.candidateId.not) return false;
        return lt(s.createdAt, w.createdAt);
      }), args),
      update: update(t.sessions),
    },
    response: {
      findMany: async (args: any) => take(t.responses.filter(r => {
        const w = args.where;
        if (w.sessionId && r.sessionId !== w.sessionId) return false;
        if (!String(r.value ?? '').includes('"audio"')) return false;
        if (!w.OR) return true;
        const created = new Date(r.createdAt);
        if (created < w.OR[0].createdAt.lt) return true;
        const open = r.ratingTask && ['PENDING', 'CLAIMED', 'FLAGGED'].includes(r.ratingTask.status);
        return created < w.OR[1].createdAt.lt && !open && r.metadata?.pendingAsyncScore !== true;
      }), args),
      update: update(t.responses),
    },
    scoreReport: { findMany: async ({ where }: any) => t.reports.filter(r => r.sessionId === where.sessionId), update: update(t.reports) },
    user: {
      findUnique: async ({ where }: any) => t.users.find(u => u.email === where.email) ?? null,
      upsert: async ({ where, create }: any) => t.users.find(u => u.email === where.email) ?? (t.users.push({ id: 'anon', ...create }), t.users.at(-1)),
    },
    examCode: {
      count: async ({ where }: any) => codeHit(where).length,
      updateMany: async ({ where, data }: any) => { const hit = codeHit(where); hit.forEach(c => Object.assign(c, data)); return { count: hit.length }; },
    },
  };
  db.$transaction = async (fn: (tx: any) => unknown) => fn(db);
  return { db, t };
}

const deps = (over: Partial<RetentionSweepDeps> = {}): RetentionSweepDeps => ({
  deleteObject: vi.fn(async () => {}),
  reference: (_p, key, provider, bucket) => ({ key, provider, bucket: bucket ?? 'default' }),
  now: () => NOW,
  ...over,
});

const speaking = (id: string, createdAt: Date, extra: Row = {}) =>
  ({ id, sessionId: 's-new', value: JSON.stringify({ audio: 'AAAA', mimeType: 'audio/mp4' }), artifactUrl: null, createdAt, score: 0.6, ...extra });

const seed = () => ({
  orgs: [{ id: 'o1', settings: null }, { id: 'o2', settings: { nativeCameraPilot: { enabled: true, retentionDays: 30 } } }],
  sessions: [
    { id: 's-new', organizationId: 'o1', candidateId: 'u1', createdAt: days(10), metadata: {} },
    { id: 's-id', organizationId: 'o1', candidateId: 'u1', createdAt: days(8), metadata: { identitySnapshotKey: 'identity/s.jpg', identitySnapshotProvider: 'supabase', sectionIndex: 2 } },
    { id: 's-o2', organizationId: 'o2', candidateId: 'u2', createdAt: days(10), metadata: {} },
    { id: 's-old', organizationId: 'o1', candidateId: 'u3', createdAt: days(800), metadata: { ipAddress: '1.2.3.4', sectionIndex: 5 } },
  ],
  events: [
    { id: 'evidence_a', sessionId: 's-new', type: 'SCREENSHOT', timestamp: days(8), metadata: { expiresAt: days(1).toISOString(), reference: { provider: 's3', bucket: 'p', key: 'native/a.jpg' } } },
    { id: 'evidence_b', sessionId: 's-new', type: 'SCREENSHOT', timestamp: days(1), metadata: { expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(), reference: { provider: 's3', bucket: 'p', key: 'native/b.jpg' } } },
    { id: 'w1', sessionId: 's-new', type: 'SCREENSHOT', timestamp: days(8), metadata: { evidenceKey: 'web/1.jpg', evidenceProvider: 'supabase', evidenceBucket: 'pb' } },
    { id: 'w2', sessionId: 's-o2', type: 'SCREENSHOT', timestamp: days(8), metadata: { evidenceKey: 'web/2.jpg' } },
    { id: 'tab', sessionId: 's-new', type: 'TAB_SWITCH', timestamp: days(9), metadata: { count: 1 } },
  ],
  responses: [
    speaking('r-old', days(31)),
    speaking('r-young', days(29)),
    speaking('r-review', days(45), { ratingTask: { status: 'PENDING' } }),
    speaking('r-review-old', days(61), { ratingTask: { status: 'CLAIMED' } }),
    speaking('r-done', days(45), { ratingTask: { status: 'COMPLETED' } }),
    speaking('r-async', days(40), { metadata: { pendingAsyncScore: true } }),
    { id: 'r-text', sessionId: 's-new', value: 'I bought "audio" cables', createdAt: days(90) },
    { ...speaking('r-in-old', days(800)), sessionId: 's-old' },
  ],
  reports: [{ id: 'rep', sessionId: 's-old', certificateUrl: 'https://c', isVerified: true, diagnosticReport: { cefr: 'B2', signedCertificate: { payload: { candidateName: 'Ada' } } } }],
  codes: [{ id: 'c-old', usedAt: days(800), usedByEmail: 'ada@example.com' }, { id: 'c-new', usedAt: days(10), usedByEmail: 'bo@example.com' }],
});

describe('retention policy', () => {
  it('matches the published policy', () => {
    expect(RETENTION).toEqual({ resultsYears: 2, audioDays: 30, audioMaxDaysWithOpenReview: 60, cameraDefaultDays: 7, cameraMaxDays: 30 });
  });
  it('reads tenant camera retention and falls back to the default on bad settings', () => {
    expect(cameraRetentionDays(null)).toBe(7);
    expect(cameraRetentionDays({ nativeCameraPilot: { enabled: true, retentionDays: 30 } })).toBe(30);
    expect(cameraRetentionDays({ nativeCameraPilot: { enabled: true, retentionDays: 365 } })).toBe(7);
  });
});

describe('runRetentionSweep', () => {
  it('counts without changing anything on a dry run', async () => {
    const { db, t } = fakeDb(seed());
    const before = JSON.stringify(t);
    const d = deps();
    const result = await runRetentionSweep(db, { apply: false }, d);
    expect(result.dryRun).toBe(true);
    expect(result.camera).toEqual({ nativeExpired: 1, webFramesExpired: 1, identitySnapshotsExpired: 1, storageFailures: 0 });
    expect(result.audio.erased).toBe(4);
    expect(result.results).toEqual({ sessionsAnonymised: 1, certificatesWithdrawn: 1, examCodesAnonymised: 1 });
    expect(d.deleteObject).not.toHaveBeenCalled();
    expect(JSON.stringify(t)).toBe(before);
  });

  it('applies every period', async () => {
    const { db, t } = fakeDb(seed());
    const d = deps();
    await runRetentionSweep(db, { apply: true }, d);
    const ev = Object.fromEntries(t.events.map(e => [e.id, e]));
    expect(ev.evidence_a.type).toBe('EVIDENCE_EXPIRED');
    expect(JSON.stringify(ev.evidence_a.metadata)).not.toContain('native/a.jpg');
    expect(ev.evidence_b.type).toBe('SCREENSHOT');
    // 8-day-old web frame: past the 7-day default for o1, kept by o2's 30 days.
    expect(ev.w1.type).toBe('EVIDENCE_EXPIRED');
    expect(ev.w2.type).toBe('SCREENSHOT');
    expect(ev.tab.type).toBe('TAB_SWITCH');
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 's3', bucket: 'p', key: 'native/a.jpg' });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 'supabase', bucket: 'pb', key: 'web/1.jpg' });
    expect(d.deleteObject).toHaveBeenCalledWith({ provider: 'supabase', bucket: 'default', key: 'identity/s.jpg' });
    expect(t.sessions.find(s => s.id === 's-id')!.metadata).toEqual({ sectionIndex: 2, identitySnapshotExpiredAt: NOW.toISOString() });

    const audioLeft = (id: string) => t.responses.find(r => r.id === id)!.value.includes('"audio":');
    expect(audioLeft('r-old')).toBe(false);
    expect(audioLeft('r-young')).toBe(true);
    expect(audioLeft('r-review')).toBe(true);
    expect(audioLeft('r-review-old')).toBe(false);
    expect(audioLeft('r-done')).toBe(false);
    expect(audioLeft('r-async')).toBe(true);
    expect(t.responses.find(r => r.id === 'r-text')!.value).toBe('I bought "audio" cables');
    expect(t.responses.find(r => r.id === 'r-old')!.score).toBe(0.6);

    const old = t.sessions.find(s => s.id === 's-old')!;
    expect(old.candidateId).toBe('anon');
    expect(old.metadata).toEqual({ sectionIndex: 5, retentionAnonymisedAt: NOW.toISOString() });
    expect(t.users).toEqual([expect.objectContaining({ id: 'anon', email: ANONYMOUS_CANDIDATE_EMAIL, role: 'CANDIDATE' })]);
    expect(audioLeft('r-in-old')).toBe(false);
    expect(t.reports[0]).toMatchObject({ certificateUrl: null, isVerified: false, diagnosticReport: { cefr: 'B2', certificateWithdrawn: { reason: 'retention' } } });
    expect(JSON.stringify(t.reports)).not.toContain('Ada');
    expect(t.codes.map(c => c.usedByEmail)).toEqual([ANONYMOUS_CANDIDATE_EMAIL, 'bo@example.com']);
    expect(t.sessions.find(s => s.id === 's-new')!.candidateId).toBe('u1');
  });

  it('is idempotent: a second run finds nothing', async () => {
    const { db } = fakeDb(seed());
    await runRetentionSweep(db, { apply: true }, deps());
    const again = await runRetentionSweep(db, { apply: true }, deps());
    expect(again.camera).toEqual({ nativeExpired: 0, webFramesExpired: 0, identitySnapshotsExpired: 0, storageFailures: 0 });
    expect(again.audio.erased).toBe(0);
    expect(again.results).toEqual({ sessionsAnonymised: 0, certificatesWithdrawn: 0, examCodesAnonymised: 0 });
  });

  it('keeps a row whose storage object could not be deleted, for the next run', async () => {
    const { db, t } = fakeDb(seed());
    const result = await runRetentionSweep(db, { apply: true }, deps({ deleteObject: async ref => { if (ref.key === 'web/1.jpg') throw new Error('down'); } }));
    expect(result.camera.storageFailures).toBe(1);
    expect(result.camera.webFramesExpired).toBe(0);
    expect(t.events.find(e => e.id === 'w1')!.type).toBe('SCREENSHOT');
    expect(t.events.find(e => e.id === 'evidence_a')!.type).toBe('EVIDENCE_EXPIRED');
  });

  it('reports more work when a batch is full', async () => {
    const { db } = fakeDb(seed());
    expect((await runRetentionSweep(db, { apply: false }, deps({ batchSize: 1 }))).more).toBe(true);
  });
});
