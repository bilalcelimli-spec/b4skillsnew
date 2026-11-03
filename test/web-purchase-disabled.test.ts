import express from 'express';
import { expect, it, vi } from 'vitest';
vi.mock('../src/lib/prisma', () => ({ prisma: {} }));
import { createBillingRouter } from '../src/routes/billing';

it('rejects web orders and checkout even for authenticated requests without touching payments or tenants', async () => {
  const app = express(); app.use(express.json());
  app.use('/api/payments', createBillingRouter((_req, _res, next) => next()));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    for (const route of ['orders', 'checkout']) {
      const response = await fetch(`http://127.0.0.1:${port}/api/payments/${route}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedPurchaseTerms: true, credits: 1 }),
      });
      expect(response.status).toBe(410);
      expect(await response.json()).toMatchObject({ code: 'WEB_PURCHASE_UNAVAILABLE' });
    }
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
