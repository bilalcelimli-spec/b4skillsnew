import express from 'express';
import { prisma } from '../lib/prisma';
import { EarlyStartBody } from '../lib/security/schemas/payments';
import { availableLicenseWhere, earlyStartConditions } from '../lib/payments/purchase-access';
import { purchaseReceiptText, type PurchaseSnapshot } from '../lib/payments/purchase-policy';
import { AppError } from '../lib/errors/app-error';

/** All mutation routes use the authenticated identity; no user or price is accepted from the body. */
export function createBillingRouter(authenticate: express.RequestHandler) {
  const router = express.Router();
  router.use(authenticate, (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const handle = (fn: (req: any, res: express.Response) => Promise<unknown>): express.RequestHandler => async (req, res) => {
    try { await fn(req, res); } catch (error) {
      if (error instanceof AppError) { res.status(error.statusCode).json({ error: error.message, code: error.code }); return; }
      console.error('[purchase]', error instanceof Error ? error.name : 'Unknown error');
      res.status(503).json({ error: 'Satın alma işlemi tamamlanamadı. Tekrar deneyin.' });
    }
  };
  // No web payment provider is enabled. Never create an order, tenant or charge here.
  router.post(['/orders', '/checkout'], (_req, res) => res.status(410).json({
    code: 'WEB_PURCHASE_UNAVAILABLE', error: 'Web üzerinden ücretli bireysel satın alma sunulmuyor.',
  }));
  router.get('/orders/:id/receipt', handle(async (req, res) => {
    const order = await prisma.paymentTransaction.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    const receipt = (order?.metadata as any)?.receipt as PurchaseSnapshot | undefined;
    if (!order || !receipt) return res.status(404).json({ error: 'Sipariş belgesi bulunamadı.' });
    await prisma.auditLog.create({ data: { userId: req.user.id, organizationId: order.organizationId, action: 'PURCHASE_DOCUMENT_DELIVERED', entityType: 'PaymentTransaction', entityId: order.id, details: { policyVersion: receipt.version } } });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="b4skills-order.txt"');
    return res.send(purchaseReceiptText(receipt, order.id, order.completedAt?.toISOString()));
  }));
  router.get('/orders/:id', handle(async (req, res) => {
    const order = await prisma.paymentTransaction.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { license: true } });
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    return res.json({ id: order.id, status: order.status, amount: order.amount, currency: order.currency,
      completedAt: order.completedAt, creditsRemaining: order.license?.credits ?? 0, receipt: (order.metadata as any)?.receipt ?? null });
  }));
  router.get('/start-conditions', handle(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { organizationId: true } });
    if (!user.organizationId) return res.json({ conditions: null });
    const license = await prisma.license.findFirst({ where: availableLicenseWhere(user.organizationId, req.user.id), orderBy: { createdAt: 'desc' }, include: { purchase: true } });
    // Every new attempt within the window needs its own explicit request. No preselected/reused UI consent.
    return res.json({ conditions: earlyStartConditions(license?.purchase ?? null) });
  }));
  router.post('/early-start', handle(async (req, res) => {
    const parsed = EarlyStartBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Erken başlatma talebi ve cayma bilgilendirmesi ayrı ayrı onaylanmalıdır.' });
    const data = parsed.data;
    const purchase = await prisma.paymentTransaction.findFirst({ where: { id: data.transactionId, userId: req.user.id, status: 'COMPLETED' } });
    const conditions = earlyStartConditions(purchase);
    if (!conditions || conditions.policyVersion !== data.policyVersion) return res.status(409).json({ error: 'Güncel satın alma koşulları alınmalıdır.' });
    const consent = await prisma.auditLog.create({ data: { userId: req.user.id, organizationId: purchase!.organizationId,
      action: 'EARLY_START_CONSENT', entityType: 'PaymentTransaction', entityId: purchase!.id,
      details: { ...data, requestText: conditions.requestText, acknowledgementText: conditions.acknowledgementText, acceptedAt: new Date().toISOString() } } });
    return res.json({ ok: true, consentId: consent.id });
  }));
  return router;
}
