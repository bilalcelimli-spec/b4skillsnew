import express from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { AGE_BANDS, CONSENT_VERSION, ConsentError, candidateConsent, declareAge, requestGuardian, guardianDecision, revokeGuardian } from '../lib/compliance/guardian-consent.js';
const Token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export function guardianConsentRouter(db: PrismaClient, auth: any, checkRole: any, send: (email: string, token: string) => Promise<void>) {
  const router = express.Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const run = (fn: any) => async (req: any, res: any) => {
    try { await fn(req, res); } catch (e) {
      if (e instanceof ConsentError) return res.status(e.status).json({ error: e.message, code: e.code });
      if (e instanceof z.ZodError) return res.status(400).json({ error: 'Geçersiz bilgi.' });
      console.error('[guardian-consent] Operation failed');
      return res.status(503).json({ error: 'Veli onayı hizmetine şu anda ulaşılamıyor.' });
    }
  };
  const candidateOnly = (req: any, res: any, next: any) => req.user.role === 'CANDIDATE' ? next() : res.status(403).json({ error: 'Candidate account required' });
  router.get('/status', auth, candidateOnly, run(async (req: any, res: any) => res.json(await candidateConsent(db, req.user.id))));
  router.post('/age', auth, candidateOnly, run(async (req: any, res: any) => {
    const { ageBand } = z.object({ ageBand: z.enum(AGE_BANDS) }).strict().parse(req.body);
    res.json(await declareAge(db, req.user.id, ageBand));
  }));
  router.post('/request', auth, candidateOnly, run(async (req: any, res: any) => {
    const { email } = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()) }).strict().parse(req.body);
    res.json(await requestGuardian(db, req.user.id, email, send));
  }));
  // No authenticated child session is needed. The capability is delivered only to the guardian's mailbox.
  router.post('/decision', run(async (req: any, res: any) => {
    const input = z.object({ token: Token, approve: z.boolean(), guardianName: z.string().trim().min(2).max(120).optional(),
      relationship: z.enum(['PARENT', 'LEGAL_GUARDIAN']).optional(), acknowledged: z.boolean().optional() }).strict().parse(req.body);
    res.json(await guardianDecision(db, input.token, input));
  }));
  router.post('/revoke', run(async (req: any, res: any) => {
    const { token } = z.object({ token: Token }).strict().parse(req.body);
    res.json(await revokeGuardian(db, token));
  }));
  router.get('/pending', checkRole(['INST_ADMIN', 'SUPER_ADMIN', 'ASSESSMENT_DIRECTOR']), run(async (req: any, res: any) => {
    if (req.user.role === 'INST_ADMIN' && !req.user.organizationId) return res.status(403).json({ error: 'Kurum gerekli.' });
    const rows = await db.assessmentConsent.findMany({ where: { approvedAt: { not: null }, revokedAt: null, verifiedAt: null,
      ...(req.user.role === 'INST_ADMIN' ? { user: { organizationId: req.user.organizationId } } : {}) }, take: 100, orderBy: { approvedAt: 'asc' },
      select: { userId: true, guardianName: true, guardianEmail: true, relationship: true, approvedAt: true, user: { select: { name: true } } } });
    res.json({ candidates: rows });
  }));
  router.post('/verify', checkRole(['INST_ADMIN', 'SUPER_ADMIN', 'ASSESSMENT_DIRECTOR']), run(async (req: any, res: any) => {
    const input = z.object({ userId: z.string().min(1).max(128), reference: z.string().trim().min(8).max(200),
      approvedAt: z.string().datetime(), guardianAuthorityChecked: z.literal(true) }).strict().parse(req.body);
    const target = await db.user.findUnique({ where: { id: input.userId }, select: { role: true, organizationId: true } });
    if (!target || target.role !== 'CANDIDATE' || (req.user.role === 'INST_ADMIN' && (!req.user.organizationId || req.user.organizationId !== target.organizationId))) {
      return res.status(404).json({ error: 'Aday bulunamadı.' });
    }
    const verified = await db.assessmentConsent.updateMany({ where: { userId: input.userId, policyVersion: CONSENT_VERSION, approvedAt: new Date(input.approvedAt), revokedAt: null },
      data: { verifiedAt: new Date(), verifiedBy: req.user.id, verificationReference: input.reference } });
    if (!verified.count) return res.status(409).json({ error: 'Önce velinin e-posta onayı gerekli.' });
    res.json({ verified: true });
  }));
  return router;
}
/** Central boundary covers native, web, fixed forms, direct speech and resumed sessions. */
export const requiresConsentGate = (path: string) => /^\/api\/(sessions(?:\/|$)|proctoring(?:\/|$)|speaking(?:\/|$)|fixed-forms(?:\/|$)|assessment\/policy$)/.test(path);
