import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/prisma', () => ({ prisma: {} }));
import { createPaymentService } from '../src/lib/payments/payment-service';
import { CheckoutBody, EarlyStartBody } from '../src/lib/security/schemas/payments';
import { PURCHASE_POLICY_VERSION, purchaseSnapshot, purchaseReceiptText, DAY_MS } from '../src/lib/payments/purchase-policy';
import { availableLicenseWhere, earlyStartConditions, requireEarlyStartConsent } from '../src/lib/payments/purchase-access';
import { BillingService } from '../src/lib/enterprise/billing-service';

const requestId = '4bf1478c-8547-48cc-b7e7-d0191bfc4ef1';
function fixture() {
  const orders = new Map<string, any>(); const audits: any[] = []; const licenses: any[] = [];
  const db: any = { $queryRaw: vi.fn(async () => []),
    paymentTransaction: {
      findUnique: vi.fn(async ({ where }: any) => where.id ? orders.get(where.id) ?? null : [...orders.values()].find(o => o.stripeSessionId === where.stripeSessionId) ?? null),
      create: vi.fn(async ({ data }: any) => { const row = { ...data, id: data.id ?? `debit-${orders.size}` }; orders.set(row.id, row); return row; }),
      update: vi.fn(async ({ where, data }: any) => { Object.assign(orders.get(where.id), data); return orders.get(where.id); }),
      updateMany: vi.fn(async ({ where, data }: any) => { const row = orders.get(where.id); if (row?.status !== where.status) return { count: 0 }; Object.assign(row, data); return { count: 1 }; }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => { const row = { id: `audit-${audits.length}`, ...data }; audits.push(row); return row; }),
      findFirst: vi.fn(async ({ where }: any) => audits.find(a => Object.entries(where).every(([key, value]) => a[key] === value)) ?? null),
    },
    license: {
      create: vi.fn(async ({ data }: any) => { const row = { id: `license-${licenses.length}`, ...data }; licenses.push(row); return row; }),
      findFirst: vi.fn(async () => { const license = licenses[0]; return license ? { ...license, purchase: [...orders.values()].find(o => o.licenseId === license.id) ?? null } : null; }),
      updateMany: vi.fn(async ({ where }: any) => { const row = licenses.find(l => l.id === where.id && l.credits > 0); if (!row) return { count: 0 }; row.credits--; return { count: 1 }; }),
    },
  };
  db.$transaction = (fn: any) => fn(db);
  const stripe: any = { checkout: { sessions: { create: vi.fn(async () => ({ id: 'cs_test_order', url: 'https://checkout.stripe.com/c/pay/test' })) } }, webhooks: { constructEvent: vi.fn() } };
  const service = createPaymentService(db, stripe);
  async function ready(plan: 'full-assessment' | 'pro-bundle' = 'full-assessment') {
    const order = await service.createOrder('buyer', 'org', plan, requestId);
    audits.push({ userId: 'buyer', entityId: order.orderId, action: 'PURCHASE_DOCUMENT_DELIVERED' });
    await service.createCheckoutSession('buyer', 'org', plan, requestId);
    return order;
  }
  const event = (amount = 1900, payment_status = 'paid'): any => ({ id: 'evt-paid', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), data: { object: { id: 'cs_test_order', amount_total: amount, currency: 'eur', payment_status } } });
  return { db, stripe, service, orders, audits, licenses, ready, event };
}
beforeEach(() => { vi.stubEnv('APP_URL', 'https://b4skills.example'); });
describe('purchase disclosures and payment authority', () => {
  it('requires explicit current terms and rejects client-supplied prices, credits and identities', () => {
    const body = { planId: 'full-assessment', requestId, policyVersion: PURCHASE_POLICY_VERSION, acceptedPurchaseTerms: true };
    expect(CheckoutBody.safeParse(body).success).toBe(true);
    for (const patch of [{ acceptedPurchaseTerms: false }, { policyVersion: 'old' }, { credits: 1 }, { amount: 1 }, { userId: 'someone-else' }]) expect(CheckoutBody.safeParse({ ...body, ...patch }).success).toBe(false);
    expect(EarlyStartBody.safeParse({ transactionId: 'order', policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: false }).success).toBe(false);
  });
  it('blocks payment until the authenticated buyer has received the versioned document', async () => {
    const f = fixture(); const order = await f.service.createOrder('buyer', 'org', 'full-assessment', requestId);
    await expect(f.service.createCheckoutSession('buyer', 'org', 'full-assessment', requestId)).rejects.toThrow('indirin');
    expect(f.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    f.audits.push({ userId: 'other-buyer', entityId: order.orderId, action: 'PURCHASE_DOCUMENT_DELIVERED' });
    await expect(f.service.createCheckoutSession('buyer', 'org', 'full-assessment', requestId)).rejects.toThrow('indirin');
  });
  it.each([['full-assessment', 1900, 1], ['pro-bundle', 4900, 3]] as const)('charges the disclosed EUR price for %s and keeps the policy snapshot', async (plan, amount, credits) => {
    const f = fixture(); const order = await f.ready(plan);
    expect(f.orders.get(order.orderId)).toMatchObject({ amount, currency: 'EUR', creditsAdded: credits, metadata: { receipt: { version: PURCHASE_POLICY_VERSION } } });
    expect(f.stripe.checkout.sessions.create.mock.calls[0][0].line_items[0]).toMatchObject({ price_data: { currency: 'eur', unit_amount: amount }, quantity: 1 });
    const text = purchaseReceiptText(order.receipt, order.orderId);
    expect(text).toContain('14 gün'); expect(text).toContain('+90 546 541 14 17'); expect(text).toContain(`${(amount / 100).toFixed(2)} EUR`);
    await f.service.createCheckoutSession('buyer', 'org', plan, requestId);
    expect(f.stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });
  it('does not grant credits for an unpaid, mismatched or duplicated webhook', async () => {
    const f = fixture(); await f.ready();
    await f.service.handleWebhook(f.event(1900, 'unpaid')); expect(f.licenses).toHaveLength(0);
    await expect(f.service.handleWebhook(f.event(100))).rejects.toThrow('eşleşmiyor'); expect(f.licenses).toHaveLength(0);
    await Promise.all([f.service.handleWebhook(f.event()), f.service.handleWebhook(f.event())]);
    expect(f.licenses).toHaveLength(1); expect(f.licenses[0]).toMatchObject({ credits: 1, type: 'INDIVIDUAL' });
  });
  it('uses the original bytes when verifying Stripe signatures', () => {
    const f = fixture(); const raw = Buffer.from('{ "preserved": true }');
    f.service.constructWebhookEvent(raw, 'sig', 'secret');
    expect(f.stripe.webhooks.constructEvent).toHaveBeenCalledWith(raw, 'sig', 'secret');
  });
});
describe('early performance is distinct from purchase', () => {
  const receipt = purchaseSnapshot('pro-bundle', '2026-11-04T00:00:00Z');
  const purchase = { id: 'order', completedAt: new Date('2026-11-04T00:00:00Z'), metadata: { receipt } };
  it('requires both acknowledgements during the window, allows waiting, and keeps unused package rights', () => {
    const now = new Date('2026-11-05T00:00:00Z');
    expect(earlyStartConditions(purchase, now)?.requiresConsent).toBe(true);
    expect(() => requireEarlyStartConsent(purchase, null, now)).toThrow('ayrı erken ifa');
    expect(() => requireEarlyStartConsent(purchase, { details: { policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: true } }, now)).not.toThrow();
    expect(earlyStartConditions(purchase, new Date(purchase.completedAt.getTime() + 14 * DAY_MS))?.requiresConsent).toBe(false);
    expect(receipt.earlyStartAcknowledgement).toContain('Kullanılmamış paket haklarım');
  });
  it('scopes individual licenses to their purchaser', () => {
    expect(JSON.stringify(availableLicenseWhere('org', 'buyer'))).toContain('"userId":"buyer"');
    expect(JSON.stringify(availableLicenseWhere('org'))).not.toContain('purchase');
  });
  it('blocks missing/reused consent before debiting and ties each started attempt to its purchase', async () => {
    const f = fixture(); const order = await f.ready('pro-bundle'); await f.service.handleWebhook(f.event(4900));
    await expect(BillingService.consumeCredit('org', f.db, 'buyer')).rejects.toThrow('ayrı erken ifa');
    expect(f.licenses[0].credits).toBe(3);
    f.audits.push({ id: 'consent-one', userId: 'buyer', entityId: order.orderId, action: 'EARLY_START_CONSENT', details: { policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: true } });
    await expect(BillingService.consumeCredit('org', f.db, 'buyer', 'consent-one')).resolves.toBe(order.orderId);
    expect(f.licenses[0].credits).toBe(2);
    await expect(BillingService.consumeCredit('org', f.db, 'buyer', 'consent-one')).rejects.toThrow('daha önce kullanılmış');
    expect(f.licenses[0].credits).toBe(2);
  });
});
