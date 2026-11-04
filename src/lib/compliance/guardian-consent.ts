import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

// Release only after provider eligibility, ZDR and transfer documentation are verified.
export const minorProcessingReady = () => process.env.MINOR_PROCESSING_READY === 'true';
export const CONSENT_VERSION = '2026-11-04-v1';
export const AGE_BANDS = ['UNDER_13', '13_17', 'ADULT'] as const;
export type AgeBand = typeof AGE_BANDS[number];
export class ConsentError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const digestConsentToken = (token: string) => createHash('sha256').update(token).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const childProduct = (value?: string | null) => /primary|junior|kids|7\s*[-–]\s*10|11\s*[-–]\s*14/i.test(value ?? '');
export function consentStatus(record: any, productLine?: string | null) {
  const current = record?.policyVersion === CONSENT_VERSION;
  const guardianRequired = !!record && (record.ageBand !== 'ADULT' || record.guardianRequired === true || childProduct(productLine));
  const allowed = !!current && (!guardianRequired || (!!record.approvedAt && !!record.verifiedAt && !record.revokedAt));
  return { allowed, ageBand: record?.ageBand ?? null, guardianRequired,
    status: !record ? 'AGE_REQUIRED' : !current ? 'RENEWAL_REQUIRED' : !guardianRequired ? 'READY' :
      record.revokedAt ? 'REVOKED' : !record.approvedAt ? 'GUARDIAN_REQUIRED' : !record.verifiedAt ? 'SCHOOL_VERIFICATION_REQUIRED' : 'READY',
    policyVersion: CONSENT_VERSION };
}
export async function candidateConsent(db: PrismaClient, userId: string, productLine?: string | null) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const [record, codes] = await Promise.all([
    db.assessmentConsent.findUnique({ where: { userId } }),
    db.examCode.findMany({ where: { usedByEmail: user.email, isUsed: true }, select: { productLine: true } }),
  ]);
  const knownChildProduct = childProduct(productLine) || codes.some(code => childProduct(code.productLine));
  if (record && knownChildProduct && !record.guardianRequired) {
    await db.assessmentConsent.update({ where: { userId }, data: { guardianRequired: true } });
    record.guardianRequired = true;
  }
  const state = consentStatus(record, knownChildProduct ? 'Primary' : undefined);
  if (state.guardianRequired && !minorProcessingReady()) return { ...state, allowed: false, status: 'PROVIDER_CONFIGURATION_REQUIRED' };
  return state;
}
export async function requireCandidateConsent(db: PrismaClient, userId: string, productLine?: string | null) {
  const state = await candidateConsent(db, userId, productLine);
  if (!state.allowed) throw new ConsentError(428, state.status, 'Yaş ve veli onayı adımını tamamlayın. Sınav ve kayıt işlemleri henüz açılamaz.');
}
export async function declareAge(db: PrismaClient, userId: string, ageBand: AgeBand) {
  const existing = await db.assessmentConsent.findUnique({ where: { userId } });
  if (existing && existing.ageBand !== ageBand) throw new ConsentError(409, 'AGE_LOCKED', 'Yaş grubunu düzeltmek için kurumunuzla iletişime geçin.');
  if (existing && existing.policyVersion !== CONSENT_VERSION) {
    // A policy update never silently carries a guardian's old approval forward.
    await db.assessmentConsent.update({ where: { userId }, data: { policyVersion: CONSENT_VERSION, approvedAt: null, verifiedAt: null, revokedAt: null, requestHash: null, manageHash: null } });
  } else if (!existing) {
    await db.assessmentConsent.create({ data: { userId, ageBand, policyVersion: CONSENT_VERSION } });
  }
  return candidateConsent(db, userId);
}
export async function requestGuardian(db: PrismaClient, userId: string, email: string, send: (email: string, token: string) => Promise<void>, now = new Date()) {
  const state = await candidateConsent(db, userId);
  if (!minorProcessingReady()) throw new ConsentError(503, 'PROVIDER_CONFIGURATION_REQUIRED', 'Çocuk sürümünün veri işleme hazırlıkları sürüyor. Henüz veli onayı alınmıyor.');
  if (!state.ageBand || !state.guardianRequired) throw new ConsentError(409, 'AGE_REQUIRED', 'Önce yaş grubunu seçin.');
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  if (user.email.toLowerCase() === email.toLowerCase()) throw new ConsentError(400, 'SEPARATE_GUARDIAN', 'Velinizin ayrı e-posta adresini girin.');
  const raw = token(); const hash = digestConsentToken(raw);
  // One conditional update prevents parallel retries from flooding the guardian's mailbox.
  const result = await db.assessmentConsent.updateMany({ where: { userId, OR: [{ requestedAt: null }, { requestedAt: { lt: new Date(now.getTime() - 60_000) } }] },
    data: { guardianEmail: email, requestHash: hash, requestExpiresAt: new Date(now.getTime() + 48 * 3600_000), requestedAt: now,
      approvedAt: null, verifiedAt: null, verifiedBy: null, verificationReference: null, revokedAt: null, guardianName: null, relationship: null, manageHash: null, manageExpiresAt: null } });
  if (!result.count) throw new ConsentError(429, 'WAIT_BEFORE_RESEND', 'Yeni bağlantı göndermeden önce bir dakika bekleyin.');
  try { await send(email, raw); }
  catch {
    await db.assessmentConsent.updateMany({ where: { userId, requestHash: hash }, data: { requestHash: null, requestExpiresAt: null, requestedAt: null } });
    throw new ConsentError(503, 'EMAIL_UNAVAILABLE', 'Veli e-postası gönderilemedi. Daha sonra yeniden deneyin.');
  }
  return { sent: true };
}
export async function guardianDecision(db: PrismaClient, raw: string, input: { approve: boolean; guardianName?: string; relationship?: string; acknowledged?: boolean }, now = new Date()) {
  const hash = digestConsentToken(raw);
  if (input.approve && !minorProcessingReady()) throw new ConsentError(503, 'PROVIDER_CONFIGURATION_REQUIRED', 'Çocuk sürümü henüz kullanıma açılmadı.');
  if (input.approve && (!input.acknowledged || !input.guardianName?.trim() || !input.relationship?.trim())) {
    throw new ConsentError(400, 'DECLARATION_REQUIRED', 'Veli bilgileri ve açık onay gerekli.');
  }
  const manageToken = token();
  const result = await db.assessmentConsent.updateMany({ where: { requestHash: hash, requestExpiresAt: { gt: now }, policyVersion: CONSENT_VERSION },
    data: { requestHash: null, requestExpiresAt: null, approvedAt: input.approve ? now : null, revokedAt: input.approve ? null : now,
      guardianName: input.approve ? input.guardianName!.trim() : null, relationship: input.approve ? input.relationship!.trim() : null,
      verifiedAt: null, manageHash: input.approve ? digestConsentToken(manageToken) : null, manageExpiresAt: input.approve ? new Date(now.getTime() + 365 * 86400_000) : null } });
  if (!result.count) throw new ConsentError(410, 'LINK_EXPIRED', 'Bağlantı kullanılmış veya süresi dolmuş.');
  return { approved: input.approve, ...(input.approve ? { manageToken, status: 'SCHOOL_VERIFICATION_REQUIRED' } : {}) };
}
export async function revokeGuardian(db: PrismaClient, raw: string, now = new Date()) {
  const result = await db.assessmentConsent.updateMany({ where: { manageHash: digestConsentToken(raw), manageExpiresAt: { gt: now }, revokedAt: null },
    data: { revokedAt: now, verifiedAt: null, requestHash: null, manageHash: null } });
  if (!result.count) throw new ConsentError(410, 'LINK_EXPIRED', 'Bağlantı kullanılmış veya süresi dolmuş. Destek ile iletişime geçebilirsiniz.');
  return { revoked: true };
}
