import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { SloReport } from '../lib/observability/slo-monitor.js';

type Dependencies = {
  checkRole: (roles: string[]) => express.RequestHandler;
  internalSecret: () => string | undefined;
  databaseAvailable: () => boolean;
  generateReport: (days: number) => Promise<SloReport>;
  markdown: (report: SloReport) => string;
  retentionPreview: () => Promise<unknown>;
  retentionSweep?: (apply: boolean, cursors?: any) => Promise<any>;
  retentionEnabled?: () => boolean;
};

export function createOperationsRouter(deps: Dependencies) {
  const router = express.Router();
  const admin = deps.checkRole(['SUPER_ADMIN']);
  router.use(['/slo/report', '/data-retention/run'], (req, res, next) => {
    const expected = deps.internalSecret();
    const provided = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    if (expected && provided) {
      const a = Buffer.from(expected), b = Buffer.from(provided);
      if (a.length === b.length && timingSafeEqual(a, b)) { next(); return; }
    }
    return admin(req, res, next);
  });
  router.use(['/slo/report', '/data-retention/run'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!deps.databaseAvailable()) { res.status(503).json({ error: 'Database unavailable' }); return; }
    next();
  });
  router.get('/slo/report', async (req, res) => {
    const window = req.query.window ?? '30', format = req.query.format ?? 'json';
    if (typeof window !== 'string' || !/^\d+$/.test(window) || Number(window) < 1 || Number(window) > 365 || !['json', 'markdown'].includes(String(format)) || typeof format !== 'string') {
      res.status(400).json({ error: 'window must be 1–365 days and format must be json or markdown' }); return;
    }
    try {
      const report = await deps.generateReport(Number(window));
      if (format === 'markdown') res.type('text/markdown').send(deps.markdown(report));
      else res.json(report);
    } catch { res.status(503).json({ error: 'SLO report unavailable' }); }
  });
  router.post('/data-retention/run', async (req, res) => {
    const dry = req.query.dry;
    const dryRun = req.body?.dryRun;
    if ((dry !== undefined && (typeof dry !== 'string' || !['0', '1'].includes(dry))) || (dryRun !== undefined && typeof dryRun !== 'boolean') ||
        (dry !== undefined && dryRun !== undefined && (dry === '1') !== dryRun)) {
      res.status(400).json({ error: 'dryRun must be boolean and match dry=0 or dry=1' }); return;
    }
    const apply = dry === '0' || dryRun === false;
    if (apply && (!deps.retentionSweep || !deps.retentionEnabled?.() || req.body?.policyVersion !== '2026-11-04-retention-v1')) {
      res.status(409).json({ error: 'Retention application requires the enabled release setting and current policy version', enforced: false }); return;
    }
    const cursors = req.body?.cursors;
    if (cursors !== undefined && (!cursors || typeof cursors !== 'object' || Array.isArray(cursors) ||
      Object.entries(cursors).some(([key, value]) => !['camera','identity','audio','sessions'].includes(key) || typeof value !== 'string' || value.length > 200))) {
      res.status(400).json({ error: 'Invalid retention cursor' }); return;
    }
    try {
      const report = deps.retentionSweep ? await deps.retentionSweep(apply, cursors) : await deps.retentionPreview();
      res.status(report.errors || report.storage?.failed ? 503 : 200).json(report);
    } catch { res.status(503).json({ error: 'Retention run unavailable', enforced: false }); }
  });
  return router;
}
