/** Opt-in, disposable localhost database only. */
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createPaymentService } from '../src/lib/payments/payment-service';
import { BillingService } from '../src/lib/enterprise/billing-service';
import { PURCHASE_POLICY_VERSION } from '../src/lib/payments/purchase-policy';

const enabled = process.env.B4SKILLS_PURCHASE_DB_TEST === '1';
const db = new PrismaClient({ datasources: { db: { url: 'postgresql://b4skills_test@127.0.0.1:59479/postgres?connection_limit=5' } } });
describe.runIf(enabled)('purchase receipts and credits in PostgreSQL', () => {
  afterAll(async () => { await db.$disconnect(); });
  it('keeps a single paid license under concurrent webhooks and one debit per explicit start consent', async () => {
    const orgId = randomUUID(), userId = randomUUID(), checkoutId = `cs_${randomUUID()}`;
    await db.organization.create({ data: { id: orgId, name: 'Disposable purchase test', slug: orgId } });
    await db.user.create({ data: { id: userId, email: `${userId}@example.test`, organizationId: orgId } });
    const stripe: any = { checkout: { sessions: { create: vi.fn(async () => ({ id: checkoutId, url: 'https://checkout.stripe.com/test' })) } } };
    const service = createPaymentService(db, stripe);
    vi.stubEnv('APP_URL', 'https://example.test');
    const request = randomUUID(); const order = await service.createOrder(userId, orgId, 'pro-bundle', request);
    await expect(service.createCheckoutSession(userId, orgId, 'pro-bundle', request)).rejects.toThrow('indirin');
    await db.auditLog.create({ data: { userId, organizationId: orgId, action: 'PURCHASE_DOCUMENT_DELIVERED', entityType: 'PaymentTransaction', entityId: order.orderId } });
    await service.createCheckoutSession(userId, orgId, 'pro-bundle', request);
    const event: any = { id: `evt_${randomUUID()}`, type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), data: { object: { id: checkoutId, payment_status: 'paid', amount_total: 4900, currency: 'eur' } } };
    await Promise.all([service.handleWebhook(event), service.handleWebhook(event)]);
    expect(await db.license.count({ where: { organizationId: orgId } })).toBe(1);
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
