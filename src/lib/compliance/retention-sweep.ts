import { Prisma, type PrismaClient } from '@prisma/client';
import { storageReference } from '../storage/private-storage.js';
import { eventMediaReference, identityReference, scrubAudio } from './account-deletion.js';
import { eraseSessionData } from './erase-session.js';
import { drainErasureObjects, erasureReceipt, legacyArtifactReference, queueObjectErasure, retentionHold } from './erasure-storage.js';
import { RETENTION, daysAgo, yearsAgo } from './retention-policy.js';

export type RetentionCursors = Partial<Record<'camera' | 'identity' | 'audio' | 'sessions', string>>;
export function cameraRetentionDays(settings: any): number {
  const value = settings?.nativeCameraPilot?.retentionDays;
  return Number.isInteger(value) && value >= 1 && value <= RETENTION.cameraMaxDays ? value : RETENTION.cameraDefaultDays;
}
const deps = { reference: storageReference };
export async function runRetentionSweep(db: PrismaClient, options: { apply?: boolean; cursors?: RetentionCursors; take?: number; now?: Date } = {}) {
  const now = options.now ?? new Date(), apply = options.apply === true;
  const take = Math.min(200, Math.max(1, options.take ?? 100));
  const result = { dryRun: !apply, enforced: apply, generatedAt: now.toISOString(), policy: RETENTION,
    eligible: { camera: 0, identity: 0, audio: 0, sessions: 0 }, held: 0, errors: 0,
    next: {} as RetentionCursors, storage: { deleted: 0, failed: 0, pending: 0 } };
  const page = (_kind: keyof RetentionCursors) => ({ take, orderBy: { id: 'asc' as const } });
  const after = (kind: keyof RetentionCursors) => options.cursors?.[kind] ? {id:{gt:options.cursors[kind]}} : {};
  const next = (kind: keyof RetentionCursors, rows: { id: string }[]) => { result.next[kind] = rows.length === take ? rows[rows.length - 1].id : '__done__'; };
  const guarded = async (fn: () => Promise<void>) => { try { await fn(); } catch { result.errors++; } };

  const camera = options.cursors?.camera === '__done__' ? [] : await db.proctoringEvent.findMany({ where: { ...after('camera'), type: { in: ['SCREENSHOT', 'EVIDENCE_PENDING'] },
    timestamp: { lte: daysAgo(now, 1) } }, include: { session: { include: { organization: { select: { settings: true } } } } }, ...page('camera') });
  next('camera', camera);
  for (const event of camera) await guarded(async () => {
    if (retentionHold(event.session.metadata, now)) { result.held++; return; }
    const m = event.metadata as any;
    const policyExpiry = event.timestamp.getTime() + cameraRetentionDays(event.session.organization.settings) * 86400000;
    const statedExpiry = Date.parse(m?.expiresAt);
    if (Math.min(policyExpiry, Number.isFinite(statedExpiry) ? statedExpiry : policyExpiry) > now.getTime()) return;
    const ref = eventMediaReference(event.metadata, deps);
    if (!ref) { if (event.type === 'EVIDENCE_PENDING') return; throw new Error('Missing evidence reference'); }
    result.eligible.camera++;
    if (apply) await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${event.sessionId} FOR UPDATE`;
      const current = await tx.proctoringEvent.findUnique({ where: { id: event.id }, include: { session: true } });
      if (!current || !['SCREENSHOT', 'EVIDENCE_PENDING'].includes(current.type) || retentionHold(current.session.metadata, now)) return;
      await queueObjectErasure(tx, ref);
      await tx.proctoringEvent.update({ where: { id: event.id }, data: { type: 'EVIDENCE_EXPIRED', metadata: { expiredAt: now.toISOString() } } });
      await erasureReceipt(tx, 'MEDIA_EVENT', event.id, 'retention');
    });
  });
  const identities = options.cursors?.identity === '__done__' ? [] : await db.session.findMany({ where: { ...after('identity'), privacyErasedAt: null,
    metadata: { path: ['identitySnapshotKey'], string_contains: '' } }, include: { organization: { select: { settings: true } } }, ...page('identity') });
  next('identity', identities);
  for (const session of identities) await guarded(async () => {
    if (retentionHold(session.metadata, now)) { result.held++; return; }
    const m = session.metadata as any;
    const captured = Date.parse(m?.identitySnapshotAt) || session.createdAt.getTime();
    if (captured > daysAgo(now, cameraRetentionDays(session.organization.settings)).getTime()) return;
    const ref = identityReference(m, deps); if (!ref) throw new Error('Missing identity reference');
    result.eligible.identity++;
    if (apply) await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${session.id} FOR UPDATE`;
      const current = await tx.session.findUniqueOrThrow({ where: { id: session.id } });
      if (retentionHold(current.metadata, now) || (current.metadata as any)?.identitySnapshotKey !== ref.key) return;
      await queueObjectErasure(tx, ref);
      const metadata = { ...(current.metadata as any) };
      for (const key of ['identitySnapshotKey', 'identitySnapshotProvider', 'identitySnapshotBucket', 'identitySnapshotUrl', 'identitySnapshotAt']) delete metadata[key];
      metadata.identitySnapshotExpiredAt = now.toISOString();
      await tx.session.update({ where: { id: session.id }, data: { metadata } });
      await erasureReceipt(tx, 'IDENTITY', session.id, 'retention');
    });
  });

  const audio = options.cursors?.audio === '__done__' ? [] : await db.response.findMany({ where: { ...after('audio'), contentErasedAt: null, createdAt: { lte: daysAgo(now, RETENTION.audioDays) },
    OR: [{ value: { contains: '"audio"' } }, { artifactUrl: { not: null } }] }, include: { ratingTask: true, session: true }, ...page('audio') });
  next('audio', audio);
  for (const response of audio) await guarded(async () => {
    if (retentionHold(response.session.metadata, now)) { result.held++; return; }
    if (scrubAudio(response.value) === null && !response.artifactUrl) return;
    const open = (response.metadata as any)?.pendingAsyncScore === true ||
      (response.ratingTask && ['PENDING', 'CLAIMED', 'FLAGGED'].includes(response.ratingTask.status));
    if (open && response.createdAt > daysAgo(now, RETENTION.audioMaxDaysWithOpenReview)) return;
    const ref = legacyArtifactReference(response.artifactUrl);
    result.eligible.audio++;
    if (apply) await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${response.sessionId} FOR UPDATE`;
      const current = await tx.response.findUniqueOrThrow({ where: { id: response.id }, include: { session: true, ratingTask: true } });
      if (current.contentErasedAt || retentionHold(current.session.metadata, now)) return;
      const stillOpen = (current.metadata as any)?.pendingAsyncScore === true ||
        (current.ratingTask && ['PENDING', 'CLAIMED', 'FLAGGED'].includes(current.ratingTask.status));
      if (stillOpen && current.createdAt > daysAgo(now, RETENTION.audioMaxDaysWithOpenReview)) return;
      const currentRef = legacyArtifactReference(current.artifactUrl);
      if (currentRef) await queueObjectErasure(tx, currentRef);
      await tx.response.update({ where: { id: response.id }, data: { value: null, artifactUrl: null, contentErasedAt: now,
        metadata: { contentErased: true, reason: 'audio-retention', erasedAt: now.toISOString() } } });
      await tx.ratingTask.deleteMany({ where: { responseId: response.id } });
      // Reports may contain quoted speech or model feedback. Numeric columns stay.
      await tx.scoreReport.updateMany({ where: { sessionId: response.sessionId }, data: { diagnosticReport: Prisma.DbNull, certificateUrl: null, isVerified: false } });
      await erasureReceipt(tx, 'RESPONSE', response.id, 'audio-retention');
    });
  });

  const cutoff = yearsAgo(now, RETENTION.resultsYears);
  const sessions = options.cursors?.sessions === '__done__' ? [] : await db.session.findMany({ where: { ...after('sessions'), privacyErasedAt: null, OR: [
    { completedAt: { lte: cutoff } }, { completedAt: null, createdAt: { lte: cutoff } }] }, ...page('sessions') });
  next('sessions', sessions);
  for (const session of sessions) await guarded(async () => {
    if (retentionHold(session.metadata, now)) { result.held++; return; }
    result.eligible.sessions++;
    if (apply) await db.$transaction(async tx => {
      await eraseSessionData(tx, session.id, deps, now, 'results-retention');
    }, { timeout: 60000 });
  });
  if (apply) {
    await db.examCode.updateMany({ where: { usedAt: { lte: cutoff }, usedByEmail: { not: null } }, data: { usedByEmail: null } });
    result.storage = await drainErasureObjects(db, undefined, now);
    await db.retentionRun.create({ data: { summary: JSON.parse(JSON.stringify(result)) } });
  }
  return result;
}
