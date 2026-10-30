/** Isolated local integration account. Never run against the normal .env database. */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const target = new URL(process.env.DATABASE_URL ?? 'file:///missing');
if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/b4skills_apple_e2e') {
  throw new Error('Refusing writes outside the isolated Apple E2E database on 127.0.0.1:55432.');
}
const db = new PrismaClient();
try {
  const organization = await db.organization.upsert({
    where: { slug: 'apple-prototype-e2e' }, update: {},
    create: { name: 'Apple Prototype E2E (local test only)', slug: 'apple-prototype-e2e' },
  });
  const password = await bcrypt.hash('ApplePrototype-2026!', 10);
  for (const kind of ['client', 'ipad', 'mac']) {
    const user = await db.user.upsert({
      where: { email: `apple.${kind}@example.test` },
      update: { password, organizationId: organization.id },
      create: { email: `apple.${kind}@example.test`, name: `Apple ${kind} Test Candidate`, role: 'CANDIDATE', password, emailVerified: new Date(), organizationId: organization.id },
    });
    console.log(`Local candidate ready: ${user.email}`);
  }
  const license = await db.license.findFirst({ where: { organizationId: organization.id, type: 'APPLE_E2E' } });
  if (!license) await db.license.create({ data: { organizationId: organization.id, type: 'APPLE_E2E', credits: 100 } });
  await db.$executeRaw`UPDATE "Item" SET content = jsonb_set(content, '{audioUrl}', '"/audio/apple-e2e-fixture.m4a"'::jsonb) WHERE "itemCode" LIKE 'CI-%' AND skill = 'LISTENING'`;
  console.log('Isolated test license ready. No production account or credit modified.');
} finally { await db.$disconnect(); }
