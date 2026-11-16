import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { CONSENT_VERSION, candidateConsent, declareAge, requestGuardian, guardianDecision, revokeGuardian, digestConsentToken } from '../src/lib/compliance/guardian-consent';

const enabled = process.env.RUN_GUARDIAN_DB_TESTS === '1';
describe.skipIf(!enabled)('guardian flow against PostgreSQL in an isolated disposable schema', () => {
  const schema = `guardian_test_${randomUUID().replaceAll('-', '')}`;
  const admin = enabled ? new PrismaClient() : null;
  let db: PrismaClient; let userId: string;
  beforeAll(async () => {
    vi.stubEnv('MINOR_PROCESSING_READY', 'true');
    const url = new URL(process.env.DATABASE_URL!); url.searchParams.set('schema', schema);
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await admin!.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    for (const table of ['User', 'ExamCode']) await admin!.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING INDEXES)`);
    const sql = (await readFile('prisma/migrations/014_guardian_consent/migration.sql', 'utf8')).replaceAll('"AssessmentConsent"', `"${schema}"."AssessmentConsent"`).replaceAll('"User"', `"${schema}"."User"`);
    await admin!.$executeRawUnsafe(sql);
  });
  beforeEach(async () => {
    userId = randomUUID();
    await admin!.$executeRawUnsafe(`INSERT INTO "${schema}"."User" ("id","email","name","role","updatedAt") VALUES ($1,$2,$3,'CANDIDATE',NOW())`, userId, `${randomUUID()}@example.invalid`, 'Synthetic consent test');
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await db?.$disconnect();
    if (admin) { await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.$disconnect(); }
  });
  async function requested() {
    await declareAge(db, userId, 'UNDER_13'); let token = '';
    await requestGuardian(db, userId, 'guardian@example.invalid', async (_email, raw) => { token = raw; }); return token;
  }
  const approve = { approve: true, guardianName: 'Synthetic Guardian', relationship: 'PARENT', acknowledged: true };
  it('blocks minors and email requests until release approval even with both consents', async () => {
    await requested();
    await db.assessmentConsent.update({ where: { userId }, data: { approvedAt: new Date(), verifiedAt: new Date() } });
    vi.stubEnv('MINOR_PROCESSING_READY', 'false');
    try {
      expect(await candidateConsent(db, userId)).toMatchObject({ allowed: false, status: 'PROVIDER_CONFIGURATION_REQUIRED' });
      const send = vi.fn();
      await expect(requestGuardian(db, userId, 'guardian@example.invalid', send)).rejects.toMatchObject({ code: 'PROVIDER_CONFIGURATION_REQUIRED' });
      expect(send).not.toHaveBeenCalled();
    } finally { vi.stubEnv('MINOR_PROCESSING_READY', 'true'); }
  });
  it('keeps minor age immutable and denies missing ages', async () => {
    expect((await candidateConsent(db, userId)).allowed).toBe(false);
    await declareAge(db, userId, '13_17');
    await expect(declareAge(db, userId, 'ADULT')).rejects.toMatchObject({ code: 'AGE_LOCKED' });
  });
  it('stores only a token hash, then requires school verification before admission', async () => {
    const token = await requested(); const row = await db.assessmentConsent.findUniqueOrThrow({ where: { userId } });
    expect(row.requestHash).toBe(digestConsentToken(token)); expect(row.requestHash).not.toBe(token);
    const decision = await guardianDecision(db, token, approve);
    expect((await candidateConsent(db, userId)).status).toBe('SCHOOL_VERIFICATION_REQUIRED');
    await db.assessmentConsent.update({ where: { userId }, data: { verifiedAt: new Date(), verifiedBy: 'synthetic-staff', verificationReference: 'synthetic-record-123' } });
    expect((await candidateConsent(db, userId)).allowed).toBe(true);
    await revokeGuardian(db, decision.manageToken!);
    expect((await candidateConsent(db, userId)).status).toBe('REVOKED');
    await expect(revokeGuardian(db, decision.manageToken!)).rejects.toMatchObject({ code: 'LINK_EXPIRED' });
  });
  it('consumes the decision token atomically under concurrent requests', async () => {
    const token = await requested();
    const results = await Promise.allSettled([guardianDecision(db, token, approve), guardianDecision(db, token, approve)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  });
  it('rejects expired and guessed tokens and missing explicit declarations', async () => {
    const token = await requested();
    await expect(guardianDecision(db, token, { approve: true })).rejects.toMatchObject({ code: 'DECLARATION_REQUIRED' });
    await expect(guardianDecision(db, 'x'.repeat(43), approve)).rejects.toMatchObject({ code: 'LINK_EXPIRED' });
    await db.assessmentConsent.update({ where: { userId }, data: { requestExpiresAt: new Date(0) } });
    await expect(guardianDecision(db, token, approve)).rejects.toMatchObject({ code: 'LINK_EXPIRED' });
  });
  it('keeps declined requests blocked', async () => {
    const token = await requested(); await guardianDecision(db, token, { approve: false });
    expect((await candidateConsent(db, userId)).allowed).toBe(false);
  });
  it('rejects self-approval email, rate limits resends and invalidates failed deliveries', async () => {
    await declareAge(db, userId, 'UNDER_13');
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await expect(requestGuardian(db, userId, user.email, vi.fn())).rejects.toMatchObject({ code: 'SEPARATE_GUARDIAN' });
    let raw = '';
    await expect(requestGuardian(db, userId, 'guardian@example.invalid', async (_email, token) => { raw = token; throw new Error('mail down'); })).rejects.toMatchObject({ code: 'EMAIL_UNAVAILABLE' });
    await expect(guardianDecision(db, raw, approve)).rejects.toMatchObject({ code: 'LINK_EXPIRED' });
    await requestGuardian(db, userId, 'guardian@example.invalid', async () => {});
    await expect(requestGuardian(db, userId, 'guardian@example.invalid', async () => {})).rejects.toMatchObject({ code: 'WAIT_BEFORE_RESEND' });
  });
  it('does not carry old guardian approval across a policy revision', async () => {
    await requested(); await db.assessmentConsent.update({ where: { userId }, data: { policyVersion: 'old', approvedAt: new Date(), verifiedAt: new Date() } });
    expect((await candidateConsent(db, userId)).allowed).toBe(false);
    await declareAge(db, userId, 'UNDER_13');
    expect(await db.assessmentConsent.findUnique({ where: { userId } })).toMatchObject({ policyVersion: CONSENT_VERSION, approvedAt: null, verifiedAt: null });
  });
  it('persists guardian requirement for a known child code even with an adult declaration', async () => {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await db.examCode.create({ data: { code: randomUUID(), organizationId: 'synthetic-org', productLine: 'Primary (7-10)', isUsed: true, usedByEmail: user.email } });
    expect((await declareAge(db, userId, 'ADULT')).allowed).toBe(false);
    expect((await db.assessmentConsent.findUniqueOrThrow({ where: { userId } })).guardianRequired).toBe(true);
  });
});
