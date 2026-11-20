/**
 * Consents and webhooks against a real PostgreSQL migrated to the current
 * schema. Opt-in: RUN_PERSISTENCE_DB_TESTS=1 with DATABASE_URL pointing at a
 * disposable database (`npm run db:migrate` first).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

const enabled = process.env.RUN_PERSISTENCE_DB_TESTS === '1';

describe.skipIf(!enabled)('privacy consents and webhooks persist in PostgreSQL', async () => {
  const { prisma } = await import('../src/lib/prisma');
  const { PrivacyManager, clearPrivacyCache } = await import('../src/lib/compliance/privacy-manager');
  const { WebhookManager, MAX_ATTEMPTS, SENDING_STALE_MS } = await import('../src/lib/webhooks/webhook-manager');

  let orgId: string;
  let userId: string;
  beforeAll(async () => {
    orgId = (await prisma.organization.create({ data: { name: 'Persistence test org', slug: `persist-${randomUUID()}` } })).id;
    userId = (await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: 'Synthetic', role: 'CANDIDATE' } })).id;
  });
  afterAll(async () => {
    await prisma.webhook.deleteMany({ where: { organizationId: orgId } });
    await prisma.privacyConsentEvent.deleteMany({ where: { userId } });
    await prisma.privacyConsent.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('a consent given on one instance is what another instance reads', async () => {
    const instanceA = new PrivacyManager();
    const instanceB = new PrivacyManager();
    expect((await instanceB.getPrivacySettings(userId)).marketingConsent).toBe(false);
    await instanceA.updateConsent(userId, { marketingConsent: true, analyticsConsent: false, injected: true, thirdPartyConsent: 'yes' }, { ipAddress: '203.0.113.9', userAgent: 'test' });
    const read = await instanceB.getPrivacySettings(userId);
    expect(read).toMatchObject({ marketingConsent: true, analyticsConsent: false, thirdPartyConsent: false });
    const history = await instanceB.getAuditLog(userId);
    expect(history.map((h) => h.consentType).sort()).toEqual(['analyticsConsent', 'marketingConsent']);
    expect(await prisma.auditLog.count({ where: { userId, action: 'PRIVACY:CONSENT_UPDATED' } })).toBe(1);
  });

  it('account erasure removes consents and their history', async () => {
    await clearPrivacyCache(userId);
    expect(await prisma.privacyConsent.count({ where: { userId } })).toBe(0);
    expect(await prisma.privacyConsentEvent.count({ where: { userId } })).toBe(0);
  });

  it('a webhook registered on one instance is delivered by another, once', async () => {
    const sent: string[] = [];
    const fetchOk = (async (_url: string, init?: RequestInit) => {
      if (String(init?.headers && (init.headers as any)['X-b4skills-Event']) !== 'ping') sent.push(String(init?.body));
      return new Response('ok', { status: 200 });
    }) as typeof fetch;
    const instanceA = new WebhookManager(fetchOk);
    const instanceB = new WebhookManager(fetchOk);
    const hook = await instanceA.registerWebhook({ url: 'https://hooks.example.invalid/a', organizationId: orgId, events: ['assessment.completed'] });
    expect((await instanceB.getEndpointsForOrg(orgId)).map((e) => e.id)).toContain(hook.id);

    const delivery = await prisma.webhookDelivery.create({ data: { webhookId: hook.id, event: 'assessment.completed', payload: { n: 1 } } });
    const results = await Promise.all([instanceA.attemptDelivery(delivery.id), instanceB.attemptDelivery(delivery.id)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(await prisma.webhookDelivery.findUnique({ where: { id: delivery.id } })).toMatchObject({ status: 'delivered', attempts: 1 });
    expect(await instanceB.getDeliveryStats(orgId)).toMatchObject({ delivered: 1, pending: 0 });
  });

  it('retries survive a restart and stop after the last attempt', async () => {
    const failing = (async () => new Response('down', { status: 503 })) as typeof fetch;
    const hook = await new WebhookManager(failing).registerWebhook({ url: 'https://hooks.example.invalid/b', organizationId: orgId, events: ['score.updated'] });
    const delivery = await prisma.webhookDelivery.create({ data: { webhookId: hook.id, event: 'score.updated', payload: {} } });

    let now = new Date();
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // A fresh manager each time stands in for a restarted or different instance.
      expect(await new WebhookManager(failing).attemptDelivery(delivery.id, now)).toBe(true);
      const row = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
      expect(row.attempts).toBe(attempt);
      if (attempt < MAX_ATTEMPTS) {
        expect(row.status).toBe('retrying');
        expect(await new WebhookManager(failing).attemptDelivery(delivery.id, now)).toBe(false); // not due yet
        now = new Date(row.nextAttemptAt!.getTime() + 1);
      } else {
        expect(row).toMatchObject({ status: 'failed', nextAttemptAt: null, responseCode: 503 });
      }
    }
  });

  it('an attempt abandoned mid-send by a dead instance is taken over by the sweep', async () => {
    const fetchOk = (async () => new Response('ok', { status: 200 })) as typeof fetch;
    const hook = await new WebhookManager(fetchOk).registerWebhook({ url: 'https://hooks.example.invalid/c', organizationId: orgId, events: ['report.generated'] });
    const started = new Date(Date.now() - SENDING_STALE_MS - 1000);
    const delivery = await prisma.webhookDelivery.create({ data: { webhookId: hook.id, event: 'report.generated', payload: {}, status: 'sending', attempts: 1, lastAttemptAt: started } });
    await new WebhookManager(fetchOk).processDueDeliveries();
    expect(await prisma.webhookDelivery.findUnique({ where: { id: delivery.id } })).toMatchObject({ status: 'delivered', attempts: 2 });
  });
});
