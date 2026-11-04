/** Synthetic guardian fixture: never allowed on a remote or production database. */
import { PrismaClient } from '@prisma/client';
import { CONSENT_VERSION } from '../src/lib/compliance/guardian-consent.js';
const url = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/b4skills_e2e') throw new Error('Disposable b4skills_e2e database required');
const db = new PrismaClient();
try {
  const user = await db.user.findUniqueOrThrow({ where: { email: 'e2e-student@b4skills.test' } });
  const data = { ageBand: 'ADULT', policyVersion: CONSENT_VERSION, approvedAt: new Date(), verifiedAt: new Date(), guardianName: 'Synthetic Guardian', verificationReference: 'DISPOSABLE-E2E-FIXTURE' };
  await db.assessmentConsent.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
} finally { await db.$disconnect(); }
