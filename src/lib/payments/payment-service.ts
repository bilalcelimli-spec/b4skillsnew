import Stripe from 'stripe';
import { prisma } from '../prisma';
import { AppError } from '../errors/app-error';
import { PURCHASE_POLICY_VERSION, DAY_MS, purchaseSnapshot, type PurchasePlanId, type PurchaseSnapshot } from './purchase-policy';

export function createPaymentService(db: typeof prisma, stripe: Stripe) {
  return {
    async createOrder(userId: string, organizationId: string, planId: PurchasePlanId, requestId: string) {
      const id = `purchase-${userId}-${requestId}`;
      const previous = await db.paymentTransaction.findUnique({ where: { id } });
      const previousMeta = (previous?.metadata ?? {}) as any;
      if (previous && (previous.userId !== userId || previousMeta.receipt?.plan?.id !== planId)) throw AppError.conflict('Sipariş isteği başka bir pakete ait.');
      const receipt = previousMeta.receipt as PurchaseSnapshot | undefined ?? purchaseSnapshot(planId, new Date().toISOString());
      if (!previous) await db.$transaction(async tx => {
        await tx.paymentTransaction.create({ data: { id, userId, organizationId, amount: receipt.plan.amount,
          currency: receipt.plan.currency, status: 'PENDING', creditsAdded: receipt.plan.credits, metadata: { receipt } as any } });
        await tx.auditLog.create({ data: { userId, organizationId, action: 'PURCHASE_TERMS_ACCEPTED', entityType: 'PaymentTransaction', entityId: id, details: { receipt } as any } });
      });
      return { orderId: id, receipt };
    },
    async createCheckoutSession(userId: string, organizationId: string, planId: PurchasePlanId, requestId: string) {
      const id = `purchase-${userId}-${requestId}`;
      const previous = await db.paymentTransaction.findUnique({ where: { id } });
      const previousMeta = (previous?.metadata ?? {}) as any;
      const receipt = previousMeta.receipt as PurchaseSnapshot | undefined;
      if (!previous || previous.userId !== userId || previous.organizationId !== organizationId || receipt?.plan.id !== planId || receipt.version !== PURCHASE_POLICY_VERSION) throw AppError.conflict('Güncel sipariş belgesini oluşturup indirin.');
      const delivered = await db.auditLog.findFirst({ where: { userId, entityId: id, action: 'PURCHASE_DOCUMENT_DELIVERED' } });
      if (!delivered) throw AppError.conflict('Ödeme öncesinde sipariş belgenizi indirin.');
      if (previousMeta.checkoutUrl) return { url: previousMeta.checkoutUrl as string, orderId: id };
      const base = process.env.APP_URL;
      if (!base) throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Ödeme dönüş adresi yapılandırılmamış.');
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'], mode: 'payment',
        line_items: [{ price_data: { currency: 'eur', unit_amount: receipt.plan.amount,
          product_data: { name: receipt.plan.name, description: `${receipt.plan.credits} sınav hakkı · Vergiler dahil · 12 ay kullanım` } }, quantity: 1 }],
        success_url: `${base}/payment/success?order=${encodeURIComponent(id)}`,
        cancel_url: `${base}/checkout?plan=${planId}&cancelled=1`,
        client_reference_id: id,
        metadata: { orderId: id, userId, organizationId, policyVersion: receipt.version },
        custom_text: { submit: { message: 'Bu ödeme sınavı başlatmaz. Cayma ve iade koşulları sipariş öncesi gösterilmiş ve saklanabilir belgenize eklenmiştir.' } },
      }, { idempotencyKey: id });
      if (!session.url) throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Ödeme sayfası oluşturulamadı.');
      await db.paymentTransaction.update({ where: { id }, data: { stripeSessionId: session.id, metadata: { receipt, checkoutUrl: session.url } as any } });
      return { url: session.url, orderId: id };
    },
    constructWebhookEvent(rawBody: Buffer, signature: string | string[], webhookSecret: string): Stripe.Event {
      return stripe.webhooks.constructEvent(rawBody, Array.isArray(signature) ? signature[0] : signature, webhookSecret);
    },
    async handleWebhook(event: Stripe.Event) {
      if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return;
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== 'paid') return;
      // Metadata permits recovery if payment completes before storing the session URL.
      const purchase = session.metadata?.orderId
        ? await db.paymentTransaction.findUnique({ where: { id: session.metadata.orderId } })
        : await db.paymentTransaction.findUnique({ where: { stripeSessionId: session.id } });
      if (!purchase || purchase.status !== 'PENDING') return;
      if ((purchase.stripeSessionId && purchase.stripeSessionId !== session.id) || session.amount_total !== purchase.amount ||
          session.currency?.toUpperCase() !== purchase.currency.toUpperCase()) throw AppError.conflict('Ödeme tutarı veya para birimi siparişle eşleşmiyor.');
      if (!purchase.organizationId) throw AppError.conflict('Ödeme hesabı bulunamadı.');
      await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${purchase.organizationId} FOR UPDATE`;
        const claimed = await tx.paymentTransaction.updateMany({ where: { id: purchase.id, status: 'PENDING' }, data: { status: 'COMPLETED', completedAt: new Date(event.created * 1000), stripeSessionId: session.id } });
        if (claimed.count !== 1) return;
        const receipt = (purchase.metadata as any)?.receipt;
        const license = await tx.license.create({ data: { organizationId: purchase.organizationId!, type: receipt ? 'INDIVIDUAL' : 'ENTERPRISE',
          credits: purchase.creditsAdded, expiresAt: new Date(event.created * 1000 + 365 * DAY_MS) } });
        await tx.paymentTransaction.update({ where: { id: purchase.id }, data: { licenseId: license.id } });
        if (purchase.userId) await tx.auditLog.create({ data: { userId: purchase.userId, organizationId: purchase.organizationId,
          action: 'PURCHASE_PAID', entityType: 'PaymentTransaction', entityId: purchase.id,
          details: { policyVersion: receipt?.version ?? null, stripeEventId: event.id, completedAt: new Date(event.created * 1000).toISOString() } } });
      });
    },
  };
}
function service() {
  if (!process.env.STRIPE_SECRET_KEY) throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Ödeme hizmeti henüz yapılandırılmamış.');
  return createPaymentService(prisma, new Stripe(process.env.STRIPE_SECRET_KEY));
}
export const PaymentService = {
  createOrder: (...args: Parameters<ReturnType<typeof createPaymentService>['createOrder']>) => service().createOrder(...args),
  createCheckoutSession: (...args: Parameters<ReturnType<typeof createPaymentService>['createCheckoutSession']>) => service().createCheckoutSession(...args),
  constructWebhookEvent: (...args: Parameters<ReturnType<typeof createPaymentService>['constructWebhookEvent']>) => service().constructWebhookEvent(...args),
  handleWebhook: (...args: Parameters<ReturnType<typeof createPaymentService>['handleWebhook']>) => service().handleWebhook(...args),
};
