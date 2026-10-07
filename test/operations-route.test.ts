import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createOperationsRouter } from '../src/routes/operations';
import { previewDataRetention } from '../src/lib/compliance/retention-preview';
const generateReport = vi.fn(), retentionPreview = vi.fn();
let secret: string | undefined, available = true, server: Server, origin: string;
const report = { summary: { nonCompliantSlos: 0, unknownSlos: 7, overallHealthy: false } };
beforeAll(async () => {
  const app = express(); app.use(express.json());
  app.use('/api/admin', createOperationsRouter({ internalSecret: () => secret, databaseAvailable: () => available,
    checkRole: roles => (req, res, next) => { if (roles.includes(String(req.headers['x-test-role']))) next(); else res.status(401).json({ error: 'Unauthorized' }); },
    generateReport, markdown: () => '## SLO Report\n\nUnknown metrics', retentionPreview,
  }));
  app.get('/api/admin/unrelated', (_req, res) => res.json({ unrelated: true }));
  server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/admin`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); });
beforeEach(() => { vi.clearAllMocks(); secret = 'internal-test-secret'; available = true; generateReport.mockResolvedValue(report); retentionPreview.mockResolvedValue({ dryRun: true, enforced: false }); });
const headers = { Authorization: 'Bearer internal-test-secret', 'Content-Type': 'application/json' };
it('requires internal auth or super admin before reading platform-wide data', async () => {
  expect((await fetch(origin + '/slo/report')).status).toBe(401);
  expect((await fetch(origin + '/slo/report', { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
  expect((await fetch(origin + '/slo/report', { headers: { 'x-test-role': 'INST_ADMIN' } })).status).toBe(401);
  expect(generateReport).not.toHaveBeenCalled();
  expect((await fetch(origin + '/slo/report', { headers: { 'x-test-role': 'SUPER_ADMIN' } })).status).toBe(200);
});
it('does not accept an empty internal secret or intercept unrelated admin routes', async () => {
  secret = undefined;
  expect((await fetch(origin + '/slo/report', { headers })).status).toBe(401);
  expect((await fetch(origin + '/unrelated')).status).toBe(200);
});
it('serves JSON by default and Markdown when requested, with no-store caching', async () => {
  const response = await fetch(origin + '/slo/report?window=7', { headers });
  expect(await response.json()).toEqual(report); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(generateReport).toHaveBeenCalledWith(7);
  const markdown = await fetch(origin + '/slo/report?format=markdown', { headers });
  expect(markdown.headers.get('content-type')).toContain('text/markdown'); expect(await markdown.text()).toContain('\n\n');
});
it.each(['window=0', 'window=366', 'window=1.2', 'window=-1', 'window=30oops', 'window=1&window=2', 'format=html'])('rejects invalid query %s', async query => {
  expect((await fetch(origin + '/slo/report?' + query, { headers })).status).toBe(400); expect(generateReport).not.toHaveBeenCalled();
});
it('reports database or service failure without fabricating empty successful results', async () => {
  available = false; expect((await fetch(origin + '/slo/report', { headers })).status).toBe(503); expect(generateReport).not.toHaveBeenCalled();
  available = true; generateReport.mockRejectedValue(new Error('sensitive details'));
  const res = await fetch(origin + '/slo/report', { headers }); expect(res.status).toBe(503); expect(await res.text()).not.toContain('sensitive');
});
it('defaults retention to read-only inventory and explicitly rejects apply requests', async () => {
  expect(await (await fetch(origin + '/data-retention/run', { method: 'POST', headers })).json()).toEqual({ dryRun: true, enforced: false });
  retentionPreview.mockClear();
  for (const url of ['/data-retention/run?dry=0', '/data-retention/run']) {
    const res = await fetch(origin + url, { method: 'POST', headers, body: JSON.stringify({ dryRun: false }) });
    expect(res.status).toBe(409); expect((await res.json()).enforced).toBe(false);
  }
  expect(retentionPreview).not.toHaveBeenCalled();
});
it.each([{ dryRun: 'false' }, { dryRun: 0 }])('rejects malformed retention flags: %j', async body => {
  expect((await fetch(origin + '/data-retention/run', { method: 'POST', headers, body: JSON.stringify(body) })).status).toBe(400);
  expect(retentionPreview).not.toHaveBeenCalled();
});
it('rejects contradictory retention flags', async () => {
  expect((await fetch(origin + '/data-retention/run?dry=1', { method: 'POST', headers, body: JSON.stringify({ dryRun: false }) })).status).toBe(400);
});
it('returns aggregate retention inventory without fetching answers or modifying data', async () => {
  const sessionCount = vi.fn().mockResolvedValue(2), responseCount = vi.fn().mockResolvedValue(3), reviewCount = vi.fn().mockResolvedValue(1);
  const result = await previewDataRetention({ session: { count: sessionCount }, response: { count: responseCount }, ratingTask: { count: reviewCount } } as any, new Date('2026-10-07T12:00:00Z'));
  expect(result).toMatchObject({ dryRun: true, enforced: false, inventory: { expiredSessions: 2, expiredAudioReferences: 3, openReviews: 1 },
    cutoffs: { sessions: '2021-10-07T12:00:00.000Z', audio: '2026-07-09T12:00:00.000Z' } });
  expect(sessionCount.mock.calls[0][0].where.status.in).toEqual(['COMPLETED', 'EXPIRED']);
});
