/**
 * Self-service account deletion (App Store Guideline 5.1.1(v), GDPR Art. 17, KVKK md. 7).
 *
 * A candidate deletes their own account from the app or the web. The account can no longer
 * sign in and everything that identifies the person is erased:
 *   - User identity, credentials, tokens, social login and 2FA fields
 *   - CandidateProfile (demographics, school/class) and class memberships
 *   - The e-mail recorded on redeemed exam codes
 *   - Device and network details in session metadata
 *   - Speaking audio inside responses, camera photos (web and native) and identity snapshots
 *   - IP addresses on the user's own audit-log entries
 *   - Signed certificates (they show the name and are publicly verifiable): withdrawn
 *
 * Scored responses, ability estimates and payment records stay, linked only to the
 * anonymised account: institutions keep their aggregate results, calibration keeps its data,
 * and payment records are kept for tax law. Unfinished sessions are closed (EXPIRED).
 *
 * Storage objects are deleted first (both providers delete idempotently). If storage fails,
 * nothing in the database changes and the request can simply be repeated.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import type { StorageProvider, StorageReference } from '../storage/private-storage.js';

export const ACCOUNT_DELETION_CONFIRMATION = 'DELETE_MY_ACCOUNT';

/** Deleted accounts keep an anonymised row whose e-mail ends with this domain. */
export const DELETED_ACCOUNT_DOMAIN = '@deleted.invalid';
export const isDeletedAccountEmail = (email: string | null | undefined) => !!email && email.endsWith(DELETED_ACCOUNT_DOMAIN);

export class AccountDeletionError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export interface AccountDeletionDeps {
  verifyPassword: (plain: string, hash: string) => Promise<boolean>;
  deleteObject: (reference: StorageReference) => Promise<void>;
  /** Builds a validated reference (bucket defaults come from the environment). */
  reference: (purpose: 'identity' | 'proctoring', key: string, provider: StorageProvider, bucket?: string) => StorageReference;
  now?: () => Date;
}

export interface AccountDeletionResult {
  deleted: true;
  sessions: number;
  closedSessions: number;
  erasedAudio: number;
  erasedMedia: number;
  withdrawnCertificates: number;
}

type Json = Record<string, unknown>;

/** Session metadata keys that identify the person or the device. */
export const SESSION_PII_KEYS = [
  'ipAddress', 'userAgent', 'browserInfo', 'deviceFingerprint', 'candidateName', 'candidateEmail', 'email', 'name',
  'identitySnapshotKey', 'identitySnapshotProvider', 'identitySnapshotBucket', 'identitySnapshotUrl', 'identitySnapshotAt',
];

const OPEN_STATUSES = new Set(['SCHEDULED', 'IN_PROGRESS', 'PAUSED']);

const asObject = (value: unknown): Json | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
const provider = (value: unknown): StorageProvider => value === 'supabase' ? 'supabase' : 's3';
const optional = (value: unknown) => typeof value === 'string' && value ? value : undefined;

/** Camera evidence: native `metadata.reference`, web `metadata.evidenceKey`. */
export function eventMediaReference(metadata: unknown, deps: Pick<AccountDeletionDeps, 'reference'>): StorageReference | null {
  const m = asObject(metadata);
  if (!m) return null;
  const ref = asObject(m.reference);
  if (ref && typeof ref.key === 'string') return deps.reference('proctoring', ref.key, provider(ref.provider), optional(ref.bucket));
  if (typeof m.evidenceKey === 'string') return deps.reference('proctoring', m.evidenceKey, provider(m.evidenceProvider), optional(m.evidenceBucket));
  return null;
}

export function identityReference(metadata: unknown, deps: Pick<AccountDeletionDeps, 'reference'>): StorageReference | null {
  const m = asObject(metadata);
  if (!m || typeof m.identitySnapshotKey !== 'string') return null;
  return deps.reference('identity', m.identitySnapshotKey, provider(m.identitySnapshotProvider),
    optional(m.identitySnapshotBucket) ?? process.env.LEGACY_IDENTITY_SNAPSHOT_BUCKET);
}

/** Speaking answers are stored as JSON `{ audio, mimeType }`; the audio is removed. */
export function scrubAudio(value: string | null): string | null {
  if (!value || !value.includes('"audio"')) return null;
  try {
    const parsed = asObject(JSON.parse(value));
    if (!parsed || !('audio' in parsed)) return null;
    const { audio: _audio, ...rest } = parsed;
    return JSON.stringify({ ...rest, audioErased: true });
  } catch {
    return null;
  }
}

export async function deleteOwnAccount(
  db: PrismaClient,
  userId: string,
  input: { password?: unknown; confirm?: unknown },
  deps: AccountDeletionDeps,
): Promise<AccountDeletionResult> {
  if (input.confirm !== ACCOUNT_DELETION_CONFIRMATION) {
    throw new AccountDeletionError(400, 'confirmation_required', 'Account deletion must be confirmed.');
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true, password: true } });
  if (!user) throw new AccountDeletionError(404, 'account_not_found', 'Account not found.');
  if (user.role !== 'CANDIDATE') {
    throw new AccountDeletionError(403, 'staff_account', 'Staff accounts are managed by your organisation. Ask your administrator to remove this account.');
  }
  // Wrong passwords answer 403, never 401: clients replay 401s after a token refresh.
  if (user.password) {
    if (typeof input.password !== 'string' || !input.password) throw new AccountDeletionError(403, 'password_required', 'Enter your password to delete your account.');
    if (!(await deps.verifyPassword(input.password, user.password))) throw new AccountDeletionError(403, 'invalid_password', 'The password is incorrect.');
  }

  const sessions = await db.session.findMany({ where: { candidateId: userId }, select: { id: true, status: true, metadata: true } });
  const sessionIds = sessions.map(s => s.id);
  const events = sessionIds.length
    ? await db.proctoringEvent.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true, metadata: true } })
    : [];
  const mediaEvents = events.filter(e => eventMediaReference(e.metadata, deps));

  const objects: StorageReference[] = [
    ...mediaEvents.map(e => eventMediaReference(e.metadata, deps)!),
    ...sessions.map(s => identityReference(s.metadata, deps)).filter((r): r is StorageReference => !!r),
  ];
  for (const object of objects) {
    try {
      await deps.deleteObject(object);
    } catch {
      throw new AccountDeletionError(503, 'storage_unavailable', 'Your files could not be deleted right now. Nothing was changed; please try again later.');
    }
  }

  const now = (deps.now ?? (() => new Date()))();
  const erasedAt = now.toISOString();
  const anonEmail = `deleted-${userId}${DELETED_ACCOUNT_DOMAIN}`;

  return db.$transaction(async tx => {
    await tx.assessmentConsent.deleteMany({ where: { userId } });
    for (const event of mediaEvents) {
      await tx.proctoringEvent.update({ where: { id: event.id }, data: {
        type: 'EVIDENCE_ERASED', metadata: { reason: 'account-deleted', erasedAt },
      } });
    }

    let closedSessions = 0;
    for (const session of sessions) {
      const metadata = { ...(asObject(session.metadata) ?? {}) };
      const hadIdentity = typeof metadata.identitySnapshotKey === 'string';
      for (const key of SESSION_PII_KEYS) delete metadata[key];
      if (hadIdentity) metadata.identitySnapshotErasedAt = erasedAt;
      const close = OPEN_STATUSES.has(session.status);
      if (close) closedSessions++;
      await tx.session.update({ where: { id: session.id }, data: {
        metadata: metadata as Prisma.InputJsonValue, ...(close ? { status: 'EXPIRED' as const } : {}),
      } });
    }

    let erasedAudio = 0;
    if (sessionIds.length) {
      // Only rows that can hold audio; the rest of the candidate's answers stay untouched and unread.
      const responses = await tx.response.findMany({
        where: { sessionId: { in: sessionIds }, OR: [{ value: { contains: '"audio"' } }, { artifactUrl: { not: null } }] },
        select: { id: true, value: true, artifactUrl: true },
      });
      for (const response of responses) {
        const scrubbed = scrubAudio(response.value);
        if (scrubbed === null && !response.artifactUrl) continue;
        erasedAudio++;
        await tx.response.update({ where: { id: response.id }, data: {
          ...(scrubbed !== null ? { value: scrubbed } : {}), artifactUrl: null,
        } });
      }
    }

    // Signed certificates carry the candidate's name and are publicly verifiable by id:
    // deleting the account withdraws them.
    let withdrawnCertificates = 0;
    if (sessionIds.length) {
      const reports = await tx.scoreReport.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true, diagnosticReport: true, certificateUrl: true } });
      for (const report of reports) {
        const diagnostic = asObject(report.diagnosticReport);
        if (!diagnostic?.signedCertificate && !report.certificateUrl) continue;
        const { signedCertificate: _signed, ...rest } = diagnostic ?? {};
        withdrawnCertificates++;
        await tx.scoreReport.update({ where: { id: report.id }, data: {
          diagnosticReport: { ...rest, certificateWithdrawn: { reason: 'account-deleted', at: erasedAt } } as Prisma.InputJsonValue,
          certificateUrl: null, isVerified: false,
        } });
      }
    }

    await tx.candidateProfile.deleteMany({ where: { userId } });
    await tx.classMember.deleteMany({ where: { userId } });
    await tx.examCode.updateMany({ where: { usedByEmail: user.email }, data: { usedByEmail: anonEmail } });
    await tx.auditLog.updateMany({ where: { userId }, data: { ipAddress: null } });
    await tx.user.update({ where: { id: userId }, data: {
      email: anonEmail, name: null, image: null, password: null, emailVerified: null,
      refreshToken: null, resetPasswordToken: null, resetPasswordExpires: null, verifyEmailToken: null,
      oauthProvider: null, oauthProviderId: null, twoFactorSecret: null, twoFactorEnabled: false,
    } });
    const result: AccountDeletionResult = {
      deleted: true, sessions: sessions.length, closedSessions, erasedAudio, erasedMedia: objects.length, withdrawnCertificates,
    };
    await tx.auditLog.create({ data: {
      userId, action: 'PRIVACY:ACCOUNT_DELETED_BY_USER', entityType: 'User', entityId: userId,
      details: { ...result, erasedAt } as unknown as Prisma.InputJsonValue,
    } });
    return result;
  }, { timeout: 60_000, maxWait: 10_000 }); // a candidate with many sessions needs more than the 5 s default
}
