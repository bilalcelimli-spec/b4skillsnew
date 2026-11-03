/**
 * Retention sweep: applies RETENTION (retention-policy.ts) to stored data.
 *
 *   1. Camera evidence — native baseline photos past `metadata.expiresAt`; web camera
 *      frames and web identity snapshots older than the tenant's camera retention
 *      (`settings.nativeCameraPilot.retentionDays`, default 7, max 30). Objects are
 *      deleted from storage, then the row keeps only that it expired.
 *   2. Speaking audio older than 30 days is removed from the response; audio still
 *      waiting for a human rater or async AI scoring is kept until that ends, at most 60 days.
 *   3. Sessions older than 2 years are detached from the candidate: they move to one
 *      shared anonymous account, lose device/IP/identity metadata and any remaining
 *      audio, and their signed certificates (which show the name) are withdrawn.
 *      Exam codes redeemed more than 2 years ago lose the e-mail.
 *
 * Dry run by default: counts only, nothing is deleted. Each category is processed in
 * bounded batches; a run that hits a batch limit reports `more: true` and the next run continues.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import type { StorageProvider, StorageReference } from '../storage/private-storage.js';
import { cameraPilot } from '../proctoring/native-evidence.js';
import { SESSION_PII_KEYS, eventMediaReference, identityReference, scrubAudio } from './account-deletion.js';
import { RETENTION, daysAgo, yearsAgo } from './retention-policy.js';

export const ANONYMOUS_CANDIDATE_EMAIL = 'retention-anonymised@deleted.invalid';

export interface RetentionSweepDeps {
  deleteObject: (reference: StorageReference) => Promise<void>;
  reference: (purpose: 'identity' | 'proctoring', key: string, provider: StorageProvider, bucket?: string) => StorageReference;
  now?: () => Date;
  batchSize?: number;
  log?: (message: string, details?: Record<string, unknown>) => void;
}

export interface RetentionSweepResult {
  dryRun: boolean;
  generatedAt: string;
  policy: typeof RETENTION;
  camera: { nativeExpired: number; webFramesExpired: number; identitySnapshotsExpired: number; storageFailures: number };
  audio: { erased: number };
  results: { sessionsAnonymised: number; certificatesWithdrawn: number; examCodesAnonymised: number };
  more: boolean;
}

type Json = Record<string, unknown>;
const asObject = (v: unknown): Json | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Json : null;
const OPEN_RATING = ['PENDING', 'CLAIMED', 'FLAGGED'] as const;
const IDENTITY_KEYS = ['identitySnapshotKey', 'identitySnapshotProvider', 'identitySnapshotBucket', 'identitySnapshotUrl', 'identitySnapshotAt'];

/** Tenant camera retention in days; an invalid tenant setting falls back to the shorter default. */
export function cameraRetentionDays(settings: unknown): number {
  try {
    return Math.min(RETENTION.cameraMaxDays, Math.max(1, cameraPilot(settings).retentionDays));
  } catch {
    return RETENTION.cameraDefaultDays;
  }
}

export async function runRetentionSweep(db: PrismaClient, options: { apply: boolean }, deps: RetentionSweepDeps): Promise<RetentionSweepResult> {
  const now = (deps.now ?? (() => new Date()))();
  const at = now.toISOString();
  const take = deps.batchSize ?? 200;
  const apply = options.apply;
  const log = deps.log ?? (() => {});
  const result: RetentionSweepResult = {
    dryRun: !apply, generatedAt: at, policy: RETENTION,
    camera: { nativeExpired: 0, webFramesExpired: 0, identitySnapshotsExpired: 0, storageFailures: 0 },
    audio: { erased: 0 },
    results: { sessionsAnonymised: 0, certificatesWithdrawn: 0, examCodesAnonymised: 0 },
    more: false,
  };
  /** Deletes a storage object; on failure the row is left for the next run. */
  const removeObject = async (reference: StorageReference | null) => {
    if (!reference || !apply) return true;
    try { await deps.deleteObject(reference); return true; } catch {
      result.camera.storageFailures++;
      log('retention: storage deletion failed; will retry next run', { key: reference.key });
      return false;
    }
  };

  // ── 1a. Native baseline photos: each row carries its own expiry ────────────
  const native = await db.proctoringEvent.findMany({
    where: { id: { startsWith: 'evidence_' }, type: { in: ['SCREENSHOT', 'EVIDENCE_PENDING'] }, metadata: { path: ['expiresAt'], lte: at } },
    select: { id: true, metadata: true }, orderBy: { timestamp: 'asc' }, take,
  });
  if (native.length === take) result.more = true;
  for (const event of native) {
    if (!(await removeObject(eventMediaReference(event.metadata, deps)))) continue;
    result.camera.nativeExpired++;
    if (apply) await db.proctoringEvent.update({ where: { id: event.id }, data: {
      type: 'EVIDENCE_EXPIRED', metadata: { reason: 'retention', expiredAt: at, expiresAt: (asObject(event.metadata)?.expiresAt ?? null) as Prisma.InputJsonValue },
    } });
  }

  // ── 1b/1c. Web frames and identity snapshots: tenant retention ─────────────
  const orgs = await db.organization.findMany({ select: { id: true, settings: true } });
  for (const org of orgs) {
    const cutoff = daysAgo(now, cameraRetentionDays(org.settings));
    const frames = await db.proctoringEvent.findMany({
      where: { type: 'SCREENSHOT', id: { not: { startsWith: 'evidence_' } }, timestamp: { lt: cutoff },
        session: { organizationId: org.id }, metadata: { path: ['evidenceKey'], string_contains: '' } },
      select: { id: true, metadata: true }, orderBy: { timestamp: 'asc' }, take,
    });
    if (frames.length === take) result.more = true;
    for (const event of frames) {
      if (!(await removeObject(eventMediaReference(event.metadata, deps)))) continue;
      result.camera.webFramesExpired++;
      if (apply) await db.proctoringEvent.update({ where: { id: event.id }, data: {
        type: 'EVIDENCE_EXPIRED', metadata: { reason: 'retention', expiredAt: at, capturedAt: (asObject(event.metadata)?.capturedAt ?? null) as Prisma.InputJsonValue },
      } });
    }

    const snapshots = await db.session.findMany({
      where: { organizationId: org.id, createdAt: { lt: cutoff }, metadata: { path: ['identitySnapshotKey'], string_contains: '' } },
      select: { id: true, metadata: true }, orderBy: { createdAt: 'asc' }, take,
    });
    if (snapshots.length === take) result.more = true;
    for (const session of snapshots) {
      if (!(await removeObject(identityReference(session.metadata, deps)))) continue;
      result.camera.identitySnapshotsExpired++;
      if (!apply) continue;
      const metadata = { ...(asObject(session.metadata) ?? {}) };
      for (const key of IDENTITY_KEYS) delete metadata[key];
      metadata.identitySnapshotExpiredAt = at;
      await db.session.update({ where: { id: session.id }, data: { metadata: metadata as Prisma.InputJsonValue } });
    }
  }

  // ── 2. Speaking audio ───────────────────────────────────────────────────────
  const audioCutoff = daysAgo(now, RETENTION.audioDays);
  const hardCutoff = daysAgo(now, RETENTION.audioMaxDaysWithOpenReview);
  const audio = await db.response.findMany({
    where: {
      value: { contains: '"audio"' },
      OR: [
        { createdAt: { lt: hardCutoff } },
        { createdAt: { lt: audioCutoff },
          OR: [{ ratingTask: { is: null } }, { ratingTask: { status: { notIn: [...OPEN_RATING] } } }],
          NOT: { metadata: { path: ['pendingAsyncScore'], equals: true } } },
      ],
    },
    select: { id: true, value: true }, orderBy: { createdAt: 'asc' }, take,
  });
  if (audio.length === take) result.more = true;
  for (const response of audio) {
    const scrubbed = scrubAudio(response.value);
    if (scrubbed === null) continue; // "audio" appeared in plain text, not a recording
    result.audio.erased++;
    if (apply) await db.response.update({ where: { id: response.id }, data: { value: scrubbed, artifactUrl: null } });
  }

  // ── 3. Results older than two years ────────────────────────────────────────
  const resultsCutoff = yearsAgo(now, RETENTION.resultsYears);
  const anonymous = apply
    ? await db.user.upsert({ where: { email: ANONYMOUS_CANDIDATE_EMAIL }, update: {}, create: { email: ANONYMOUS_CANDIDATE_EMAIL, role: 'CANDIDATE' }, select: { id: true } })
    : await db.user.findUnique({ where: { email: ANONYMOUS_CANDIDATE_EMAIL }, select: { id: true } });
  const sessions = await db.session.findMany({
    where: { createdAt: { lt: resultsCutoff }, ...(anonymous ? { candidateId: { not: anonymous.id } } : {}) },
    select: { id: true, metadata: true }, orderBy: { createdAt: 'asc' }, take,
  });
  if (sessions.length === take) result.more = true;
  for (const session of sessions) {
    const reports = await db.scoreReport.findMany({ where: { sessionId: session.id }, select: { id: true, diagnosticReport: true, certificateUrl: true } });
    const withCertificate = reports.filter(r => asObject(r.diagnosticReport)?.signedCertificate || r.certificateUrl);
    if (!apply) {
      result.results.sessionsAnonymised++;
      result.results.certificatesWithdrawn += withCertificate.length;
      continue;
    }
    // Any media left behind (e.g. a failed earlier deletion) must go before the link is cut.
    const media = (await db.proctoringEvent.findMany({ where: { sessionId: session.id }, select: { id: true, metadata: true } }))
      .filter(e => eventMediaReference(e.metadata, deps));
    const refs = [...media.map(e => eventMediaReference(e.metadata, deps)!), identityReference(session.metadata, deps)].filter((r): r is StorageReference => !!r);
    let ok = true;
    for (const ref of refs) ok = (await removeObject(ref)) && ok;
    if (!ok) continue;
    await db.$transaction(async tx => {
      for (const event of media) {
        await tx.proctoringEvent.update({ where: { id: event.id }, data: { type: 'EVIDENCE_EXPIRED', metadata: { reason: 'retention', expiredAt: at } } });
      }
      const responses = await tx.response.findMany({ where: { sessionId: session.id, value: { contains: '"audio"' } }, select: { id: true, value: true } });
      for (const r of responses) {
        const scrubbed = scrubAudio(r.value);
        if (scrubbed !== null) await tx.response.update({ where: { id: r.id }, data: { value: scrubbed, artifactUrl: null } });
      }
      for (const report of withCertificate) {
        const { signedCertificate: _signed, ...rest } = asObject(report.diagnosticReport) ?? {};
        await tx.scoreReport.update({ where: { id: report.id }, data: {
          diagnosticReport: { ...rest, certificateWithdrawn: { reason: 'retention', at } } as Prisma.InputJsonValue,
          certificateUrl: null, isVerified: false,
        } });
      }
      const metadata = { ...(asObject(session.metadata) ?? {}) };
      for (const key of SESSION_PII_KEYS) delete metadata[key];
      metadata.retentionAnonymisedAt = at;
      await tx.session.update({ where: { id: session.id }, data: { candidateId: anonymous!.id, metadata: metadata as Prisma.InputJsonValue } });
    });
    result.results.sessionsAnonymised++;
    result.results.certificatesWithdrawn += withCertificate.length;
  }
  const codeWhere = { usedAt: { lt: resultsCutoff }, usedByEmail: { not: null, notIn: [ANONYMOUS_CANDIDATE_EMAIL] } };
  result.results.examCodesAnonymised = apply
    ? (await db.examCode.updateMany({ where: codeWhere, data: { usedByEmail: ANONYMOUS_CANDIDATE_EMAIL } })).count
    : await db.examCode.count({ where: codeWhere });

  log('retention: sweep finished', result as unknown as Record<string, unknown>);
  return result;
}
