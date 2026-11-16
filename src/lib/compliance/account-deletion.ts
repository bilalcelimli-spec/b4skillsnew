/**
 * Self-service account deletion (App Store Guideline 5.1.1(v), GDPR Art. 17, KVKK md. 7).
 *
 * A candidate deletes their own account from the app or the web. The account can no longer
 * sign in. The deletion scope includes:
 *   - User identity, credentials, tokens, social login and 2FA fields
 *   - CandidateProfile (demographics, school/class) and class memberships
 *   - The e-mail recorded on redeemed exam codes
 *   - Device and network details in session metadata
 *   - Speaking audio inside responses, camera photos (web and native) and identity snapshots
 *   - IP addresses on the user's own audit-log entries
 *   - Signed certificates (they show the name and are publicly verifiable): withdrawn
 *
 * Assessment sessions, responses, reports, ratings and feedback are deleted.
 * A disabled pseudonymous account row and restricted statutory payment/erasure records remain.
 *
 * Storage deletion intent commits with database erasure. A durable worker retries failures.
 * Provider backups and legally retained payment records follow the documented separate schedule.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import type { StorageProvider, StorageReference } from '../storage/private-storage.js';

import { eraseSessionData } from './erase-session.js';
import { drainErasureObjects, erasureReceipt, retentionHold } from './erasure-storage.js';

export const ACCOUNT_DELETION_CONFIRMATION = 'DELETE_MY_ACCOUNT';

/** Deleted accounts keep a disabled pseudonymous row whose e-mail ends with this domain. */
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
  storageDeletionPending?: number | boolean;
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

  return eraseCandidateData(db, userId, deps);
}

/** Internal erasure primitive. Call only after self-service or administrator authorization. */
export async function eraseCandidateData(db: PrismaClient, userId: string, deps: AccountDeletionDeps): Promise<AccountDeletionResult> {
  const user = await db.user.findUniqueOrThrow({where:{id:userId},select:{email:true,role:true}});
  if (user.role !== 'CANDIDATE') throw new AccountDeletionError(403,'staff_account','Only candidate accounts can be erased by this flow');
  const initialSessions = await db.session.findMany({ where: { candidateId: userId }, select: { id: true, status: true, metadata: true } });
  const now = (deps.now ?? (() => new Date()))();
  if (initialSessions.some(s => retentionHold(s.metadata, now))) throw new AccountDeletionError(409, 'legal_hold', 'A restricted preservation obligation requires review. Contact support for the scope and expiry.');
  const erasedAt = now.toISOString();
  const anonEmail = `deleted-${userId}${DELETED_ACCOUNT_DOMAIN}`;
  const objectIds: string[] = [];
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const sessions = await tx.session.findMany({where:{candidateId:userId},select:{id:true,status:true,metadata:true}});
    await tx.assessmentConsent.deleteMany({ where: { userId } });
    let closedSessions = 0, erasedAudio = 0, erasedMedia = 0, withdrawnCertificates = 0;
    for (const session of sessions) {
      const erased = await eraseSessionData(tx, session.id, deps, now, 'account-deleted');
      objectIds.push(...erased.objectIds);
      closedSessions += Number(erased.closed); erasedAudio += erased.erasedAudio;
      erasedMedia += erased.queuedMedia; withdrawnCertificates += erased.withdrawnCertificates;
    }
    await tx.ltiSession.deleteMany({ where: { userId } });
    await tx.concurrentValidityRecord.updateMany({ where: { candidateId: userId }, data: { candidateId: null } });
    await tx.auditLog.updateMany({ where: { OR: [{ userId }, { entityType: 'User', entityId: userId }] },
      data: { ipAddress: null, previousData: Prisma.DbNull, newData: Prisma.DbNull, details: { erased: true } } });
    await erasureReceipt(tx, 'USER', userId, 'account-deleted');
    await tx.candidateProfile.deleteMany({ where: { userId } });
    await tx.classMember.deleteMany({ where: { userId } });
    await tx.examCode.updateMany({ where: { usedByEmail: user.email }, data: { usedByEmail: anonEmail } });
    await tx.user.update({ where: { id: userId }, data: {
      email: anonEmail, name: null, image: null, password: null, emailVerified: null,
      refreshToken: null, resetPasswordToken: null, resetPasswordExpires: null, verifyEmailToken: null,
      oauthProvider: null, oauthProviderId: null, twoFactorSecret: null, twoFactorEnabled: false,
    } });
    const result: AccountDeletionResult = {
      deleted: true, sessions: sessions.length, closedSessions, erasedAudio, erasedMedia, withdrawnCertificates,
    };
    await tx.auditLog.create({ data: {
      userId, action: 'PRIVACY:ACCOUNT_DELETED_BY_USER', entityType: 'User', entityId: userId,
      details: { ...result, erasedAt } as unknown as Prisma.InputJsonValue,
    } });
    return result;
  }, { timeout: 60_000, maxWait: 10_000 });
  // Identity is already erased. Storage outages leave durable retry records, never lost references.
  await drainErasureObjects(db, deps.deleteObject).catch(() => null);
  const pending = await db.erasureObject.count({where:{id:{in:objectIds},deletedAt:null}}).catch(()=>true);
  const { clearPrivacyCache } = await import('./privacy-manager.js');
  clearPrivacyCache(userId);
  return { ...result, storageDeletionPending: pending };
}
