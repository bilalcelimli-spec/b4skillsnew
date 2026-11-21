import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/prisma', () => ({ prisma: {} }));
import { CheckoutBody, EarlyStartBody } from '../src/lib/security/schemas/payments';
import { PURCHASE_POLICY_VERSION, purchaseSnapshot, purchaseReceiptText, DAY_MS } from '../src/lib/payments/purchase-policy';
import { availableLicenseWhere, earlyStartConditions, requireEarlyStartConsent } from '../src/lib/payments/purchase-access';
import { BillingService } from '../src/lib/enterprise/billing-service';

const requestId = '4bf1478c-8547-48cc-b7e7-d0191bfc4ef1';
/**
 * In-memory stand-in for the tables the credit flow touches. Web checkout is
 * disabled (no payment provider), so a completed historical order and its
 * license are seeded directly.
 */
function fixture() {
  const orders = new Map<string, any>(); const audits: any[] = []; const licenses: any[] = [];
  const db: any = { $queryRaw: vi.fn(async () => []),
    paymentTransaction: {
      findUnique: vi.fn(async ({ where }: any) => orders.get(where.id) ?? null),
      create: vi.fn(async ({ data }: any) => { const row = { ...data, id: data.id ?? `debit-${orders.size}` }; orders.set(row.id, row); return row; }),
      update: vi.fn(async ({ where, data }: any) => { Object.assign(orders.get(where.id), data); return orders.get(where.id); }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => { const row = { id: `audit-${audits.length}`, ...data }; audits.push(row); return row; }),
      findFirst: vi.fn(async ({ where }: any) => audits.find(a => Object.entries(where).every(([key, value]) => a[key] === value)) ?? null),
    },
    license: {
      findFirst: vi.fn(async () => { const license = licenses[0]; return license ? { ...license, purchase: [...orders.values()].find(o => o.licenseId === license.id) ?? null } : null; }),
      updateMany: vi.fn(async ({ where }: any) => { const row = licenses.find(l => l.id === where.id && l.credits > 0); if (!row) return { count: 0 }; row.credits--; return { count: 1 }; }),
    },
  };
  db.$transaction = (fn: any) => fn(db);
  function paidOrder(plan: 'full-assessment' | 'pro-bundle' = 'full-assessment') {
    const receipt = purchaseSnapshot(plan, new Date().toISOString());
    const orderId = `purchase-buyer-${requestId}`;
    const license = { id: `license-${licenses.length}`, organizationId: 'org', type: 'INDIVIDUAL', credits: receipt.plan.credits, expiresAt: new Date(Date.now() + 365 * DAY_MS) };
    licenses.push(license);
    orders.set(orderId, { id: orderId, userId: 'buyer', organizationId: 'org', amount: receipt.plan.amount, currency: receipt.plan.currency,
      status: 'COMPLETED', creditsAdded: receipt.plan.credits, completedAt: new Date(), licenseId: license.id, metadata: { receipt } });
    return { orderId, receipt };
  }
  return { db, orders, audits, licenses, paidOrder };
}
describe('purchase disclosures', () => {
  it('requires explicit current terms and rejects client-supplied prices, credits and identities', () => {
    const body = { planId: 'full-assessment', requestId, policyVersion: PURCHASE_POLICY_VERSION, acceptedPurchaseTerms: true };
    expect(CheckoutBody.safeParse(body).success).toBe(true);
    for (const patch of [{ acceptedPurchaseTerms: false }, { policyVersion: 'old' }, { credits: 1 }, { amount: 1 }, { userId: 'someone-else' }]) expect(CheckoutBody.safeParse({ ...body, ...patch }).success).toBe(false);
    expect(EarlyStartBody.safeParse({ transactionId: 'order', policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: false }).success).toBe(false);
  });
  it.each([['full-assessment', 1900], ['pro-bundle', 4900]] as const)('keeps the disclosed EUR price and terms in the %s receipt', (plan, amount) => {
    const receipt = purchaseSnapshot(plan, '2026-11-04T00:00:00Z');
    expect(receipt).toMatchObject({ version: PURCHASE_POLICY_VERSION, plan: { amount, currency: 'EUR' } });
    const text = purchaseReceiptText(receipt, 'order-1');
    expect(text).toContain('14 gün'); expect(text).toContain('+90 546 541 14 17'); expect(text).toContain(`${(amount / 100).toFixed(2)} EUR`);
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
    const f = fixture(); const order = f.paidOrder('pro-bundle');
    await expect(BillingService.consumeCredit('org', f.db, 'buyer')).rejects.toThrow('ayrı erken ifa');
    expect(f.licenses[0].credits).toBe(3);
    f.audits.push({ id: 'consent-one', userId: 'buyer', entityId: order.orderId, action: 'EARLY_START_CONSENT', details: { policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: true } });
    await expect(BillingService.consumeCredit('org', f.db, 'buyer', 'consent-one')).resolves.toBe(order.orderId);
    expect(f.licenses[0].credits).toBe(2);
    await expect(BillingService.consumeCredit('org', f.db, 'buyer', 'consent-one')).rejects.toThrow('daha önce kullanılmış');
    expect(f.licenses[0].credits).toBe(2);
  });
});
