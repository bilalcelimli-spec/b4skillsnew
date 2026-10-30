// Reversible QA-only camera switch. Preserve all unrelated organization settings.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
if (process.env.B4SKILLS_API_VALIDATION_MODE !== 'true') throw Error('Private QA runtime required');
const db = new PrismaClient(), file = path.join(path.resolve(process.cwd(), 'build/realdb-validation'), 'sprint2-continuous-ui-policy.json');
const id = 'cmvlj3ynd0000uvuo9q6p5urh', pilot = { enabled: true, retentionDays: 1 };
try {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${id} FOR UPDATE`;
    const org = await tx.organization.findUniqueOrThrow({ where: { id } });
    assert.equal(org.slug, 'apple-native-realdb-validation');
    const settings = { ...org.settings };
    if (process.argv[2] === 'enable') {
      let lease = null;
      try { lease = JSON.parse(fs.readFileSync(file)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      assert.ok(!lease || lease.restoredAt, 'Existing policy lease must be restored first');
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      fs.writeFileSync(file, JSON.stringify({ id, original: settings.nativeCameraPilot ?? null, startedAt: new Date().toISOString() }), { mode: 0o600 });
      settings.nativeCameraPilot = pilot;
    } else if (process.argv[2] === 'restore') {
      const saved = JSON.parse(fs.readFileSync(file)); assert.equal(saved.id, id); assert.ok(!saved.restoredAt);
      assert.deepEqual(settings.nativeCameraPilot, pilot);
      if (saved.original === null) delete settings.nativeCameraPilot; else settings.nativeCameraPilot = saved.original;
      fs.writeFileSync(file, JSON.stringify({ ...saved, restoredAt: new Date().toISOString() }), { mode: 0o600 });
    } else throw Error('enable or restore required');
    await tx.organization.update({ where: { id }, data: { settings } });
  });
  console.log(`QA camera policy ${process.argv[2]} complete`);
} finally { await db.$disconnect(); }
