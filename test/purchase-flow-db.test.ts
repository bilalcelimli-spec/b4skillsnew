/** Opt-in, disposable localhost database only. */
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { BillingService } from '../src/lib/enterprise/billing-service';
import { DAY_MS, PURCHASE_POLICY_VERSION, purchaseSnapshot } from '../src/lib/payments/purchase-policy';

const enabled = process.env.B4SKILLS_PURCHASE_DB_TEST === '1';
const db = new PrismaClient({ datasources: { db: { url: 'postgresql://b4skills_test@127.0.0.1:59479/postgres?connection_limit=5' } } });
describe.runIf(enabled)('purchase receipts and credits in PostgreSQL', () => {
  afterAll(async () => { await db.$disconnect(); });
  it('debits one credit per explicit start consent on a completed purchase', async () => {
    const orgId = randomUUID(), userId = randomUUID();
    await db.organization.create({ data: { id: orgId, name: 'Disposable purchase test', slug: orgId } });
    await db.user.create({ data: { id: userId, email: `${userId}@example.test`, organizationId: orgId } });
    // Web checkout is disabled; a completed historical order and its license are seeded directly.
    const receipt = purchaseSnapshot('pro-bundle', new Date().toISOString());
    const license = await db.license.create({ data: { organizationId: orgId, type: 'INDIVIDUAL', credits: receipt.plan.credits, expiresAt: new Date(Date.now() + 365 * DAY_MS) } });
    const order = { orderId: `purchase-${userId}-${randomUUID()}` };
    await db.paymentTransaction.create({ data: { id: order.orderId, userId, organizationId: orgId, amount: receipt.plan.amount, currency: receipt.plan.currency,
      status: 'COMPLETED', creditsAdded: receipt.plan.credits, completedAt: new Date(), licenseId: license.id, metadata: { receipt } as any } });
    const paid = await db.paymentTransaction.findUniqueOrThrow({ where: { id: order.orderId }, include: { license: true } });
    expect(paid).toMatchObject({ status: 'COMPLETED', amount: 4900, currency: 'EUR', license: { credits: 3, type: 'INDIVIDUAL' } });
    await expect(db.$transaction(tx => BillingService.consumeCredit(orgId, tx, userId))).rejects.toThrow('ayrı erken ifa');
    const consent = await db.auditLog.create({ data: { userId, organizationId: orgId, action: 'EARLY_START_CONSENT', entityType: 'PaymentTransaction', entityId: order.orderId,
      details: { policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: true } } });
    const results = await Promise.allSettled([1, 2].map(() => db.$transaction(tx => BillingService.consumeCredit(orgId, tx, userId, consent.id))));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await db.license.findUniqueOrThrow({ where: { id: paid.licenseId! } })).credits).toBe(2);
    expect(await db.paymentTransaction.count({ where: { organizationId: orgId, creditsAdded: -1 } })).toBe(1);
    const other = randomUUID(); await db.user.create({ data: { id: other, email: `${other}@example.test`, organizationId: orgId } });
    await expect(db.$transaction(tx => BillingService.consumeCredit(orgId, tx, other, consent.id))).rejects.toThrow('No active license');
    const rollbackConsent = await db.auditLog.create({ data: { userId, organizationId: orgId, action: 'EARLY_START_CONSENT', entityType: 'PaymentTransaction', entityId: order.orderId,
      details: { policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: true } } });
    await expect(db.$transaction(async tx => { await BillingService.consumeCredit(orgId, tx, userId, rollbackConsent.id); throw Error('Failed to create exam'); })).rejects.toThrow('Failed to create exam');
    expect((await db.license.findUniqueOrThrow({ where: { id: paid.licenseId! } })).credits).toBe(2);
    expect(await db.auditLog.count({ where: { action: 'EARLY_START_CONSENT_USED', entityId: rollbackConsent.id } })).toBe(0);
  });
});
