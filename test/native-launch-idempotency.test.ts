import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSessionOnce, findLaunchSession, type LaunchIdentity } from '../src/lib/assessment-engine/launch-idempotency';

// Explicit disposable database only. Never uses DATABASE_URL or the normal .env.
const url = process.env.B4_NATIVE_TEST_DB_URL;
if (url && !/^postgresql:\/\/[^@]+@127\.0\.0\.1:55432\/b4skills_apple_e2e(?:\?.*)?$/.test(url)) {
  throw new Error('Native regression tests require the isolated localhost database.');
}
describe.runIf(!!url)('native launch receipts, PostgreSQL', () => {
  let db: PrismaClient;
  const org = randomUUID(), uid = randomUUID(), secondUid = randomUUID();
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    await db.organization.create({ data: { id: org, name: 'Native recovery regression', slug: org } });
    for (const id of [uid, secondUid]) await db.user.create({ data: { id, email: `${id}@example.test`, organizationId: org, role: 'CANDIDATE' } });
    await db.license.create({ data: { organizationId: org, type: 'ENTERPRISE', credits: 10 } });
  });
  afterAll(async () => {
    await db.session.deleteMany({ where: { organizationId: org } });
    await db.user.deleteMany({ where: { id: { in: [uid, secondUid] } } });
    await db.license.deleteMany({ where: { organizationId: org } });
    await db.paymentTransaction.deleteMany({ where: { organizationId: org } });
    await db.organization.delete({ where: { id: org } }); await db.$disconnect();
  });
  const identity = (): LaunchIdentity => ({ candidateId: uid, organizationId: org, productLine: 'General English', launchRequestId: randomUUID() });
  const launch = (input: LaunchIdentity, fail = false) => createSessionOnce(db, input, async tx => {
    // Same atomic debit as production; intentionally avoid the engine's AI/bootstrap side effects.
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${org} FOR UPDATE`;
    const debit = await tx.license.updateMany({ where: { organizationId: org, credits: { gt: 0 } }, data: { credits: { decrement: 1 } } });
    if (debit.count !== 1) throw new Error('No credits');
    if (fail) throw new Error('Create failed');
    return tx.session.create({ data: { candidateId: input.candidateId, organizationId: org, status: 'IN_PROGRESS', metadata: { launchRequestId: input.launchRequestId!, launchProductLine: input.productLine!, productLine: input.productLine! } } });
  });
  it('uses one credit for two concurrent requests and a later replay with no remaining credits', async () => {
    await db.license.updateMany({ where: { organizationId: org }, data: { credits: 1 } });
    const input = identity(); const [a, b] = await Promise.all([launch(input), launch(input)]);
    expect(a.id).toBe(b.id);
    expect((await db.license.findFirstOrThrow({ where: { organizationId: org } })).credits).toBe(0);
    expect((await launch(input)).id).toBe(a.id);
    expect(await db.session.count({ where: { candidateId: uid } })).toBe(1);
  });
  it('rejects changed request parameters and scopes receipts to the authenticated candidate', async () => {
    await db.license.updateMany({ where: { organizationId: org }, data: { credits: 2 } });
    const input = identity(); const first = await launch(input);
    await expect(launch({ ...input, productLine: 'Business English' })).rejects.toMatchObject({ code: 'LAUNCH_REQUEST_MISMATCH' });
    expect(await findLaunchSession(db, { ...input, candidateId: secondUid })).toBeNull();
    const second = await launch({ ...input, candidateId: secondUid }); expect(second.id).not.toBe(first.id);
  });
  it('rolls back failed creation so the same receipt can be retried', async () => {
    await db.license.updateMany({ where: { organizationId: org }, data: { credits: 1 } });
    const input = identity(); await expect(launch(input, true)).rejects.toThrow('Create failed');
    expect((await db.license.findFirstOrThrow({ where: { organizationId: org } })).credits).toBe(1);
    expect(await findLaunchSession(db, input)).toBeNull();
    await launch(input); expect((await db.license.findFirstOrThrow({ where: { organizationId: org } })).credits).toBe(0);
  });
});
