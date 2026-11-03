import type { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { withdrawalEndsAt, type PurchaseSnapshot } from './purchase-policy';

export function availableLicenseWhere(organizationId: string, candidateId?: string): Prisma.LicenseWhereInput {
  return { organizationId, credits: { gt: 0 }, AND: [
    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    { OR: [{ type: { not: 'INDIVIDUAL' } }, ...(candidateId ? [{ purchase: { userId: candidateId, status: 'COMPLETED' } }] : [])] },
  ] };
}
export function earlyStartConditions(purchase: { id: string; completedAt: Date | null; metadata: unknown } | null, now = new Date()) {
  const receipt = (purchase?.metadata as any)?.receipt as PurchaseSnapshot | undefined;
  if (!purchase || !receipt || !purchase.completedAt) return null;
  const until = withdrawalEndsAt(purchase.completedAt);
  return { transactionId: purchase.id, policyVersion: receipt.version, withdrawalEndsAt: until.toISOString(),
    requiresConsent: now < until, planName: receipt.plan.name,
    requestText: receipt.earlyStartRequest, acknowledgementText: receipt.earlyStartAcknowledgement };
}
export function requireEarlyStartConsent(purchase: { id: string; completedAt: Date | null; metadata: unknown } | null, consent: { details: unknown } | null, now = new Date()) {
  const conditions = earlyStartConditions(purchase, now);
  if (!conditions?.requiresConsent) return;
  const details = (consent?.details ?? {}) as any;
  if (details.policyVersion !== conditions.policyVersion || details.requestEarlyStart !== true || details.acknowledgeWithdrawalEffect !== true) {
    throw new AppError(409, 'EARLY_START_CONSENT_REQUIRED', '14 gün dolmadan bu sınava başlamak için ayrı erken ifa onayı verin veya cayma süresinin bitmesini bekleyin.');
  }
}
