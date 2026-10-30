import path from 'node:path';
// Synthetic pixels only, existing QA tenant/session. No camera access or exam credit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { encode } from 'jpeg-js';
import { PrismaClient } from '@prisma/client';
import { Backend } from '../../src/api';
import { downloadPrivateObject } from '../../../../src/lib/storage/private-storage';
(globalThis as any).__DEV__ = true;
if (process.env.B4SKILLS_API_VALIDATION_MODE !== 'true') throw Error('Private QA runtime required');
const root = path.resolve(process.cwd(), 'build/realdb-validation'), base = 'http://127.0.0.1:3004';
const accounts = JSON.parse(fs.readFileSync(`${root}/candidates.json`, 'utf8'));
const own = accounts.find((a: any) => a.platform === 'client');
const db = new PrismaClient(), originalFetch = globalThis.fetch, jar = new Map<string, string>();
globalThis.fetch = (async (url: any, init: any = {}) => {
  const headers = new Headers(init.headers);
  if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
  const response = await originalFetch(url, { ...init, headers });
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(';')[0], at = pair.indexOf('=');
    if (!pair.slice(at + 1)) jar.delete(pair.slice(0, at)); else jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return response;
}) as typeof fetch;
async function main() {
  const org = await db.organization.findUniqueOrThrow({ where: { id: own.organizationId } });
  assert.equal(org.slug, 'apple-native-realdb-validation');
  const originalSettings = org.settings as Record<string, unknown>;
  const pilot = { enabled: true, retentionDays: 1 };
  await db.organization.update({ where: { id: org.id }, data: { settings: { ...originalSettings, nativeCameraPilot: pilot } } });
  try {
    const session = await db.session.findFirstOrThrow({ where: { organizationId: org.id, candidateId: own.userId, status: 'IN_PROGRESS' } });
    const before = await db.license.aggregate({ where: { organizationId: org.id }, _sum: { credits: true } });
    const countBefore = await db.session.count({ where: { organizationId: org.id } });
    const api = new Backend(base);
    const anon = await originalFetch(`${base}/api/sessions/${session.id}/camera-policy`); assert.equal(anon.status, 401);
    await api.login(own.email, own.password);
    assert.deepEqual(await api.cameraPolicy(session.id), pilot);
    const bytes = encode({ width: 2, height: 2, data: Buffer.from(Array(4).fill([40, 80, 120, 255]).flat()) }, 75).data;
    const evidenceId = randomUUID();
    const photo = { base64: bytes.toString('base64'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), faceCount: 1, capturedAt: new Date().toISOString() };
    await Promise.all([api.sendCameraPhoto(session.id, evidenceId, photo, 'ipad'), api.sendCameraPhoto(session.id, evidenceId, photo, 'ipad')]);
    await api.sendCameraPhoto(session.id, evidenceId, photo, 'ipad');
    await assert.rejects(api.sendCameraPhoto(session.id, evidenceId, { ...photo, sha256: '0'.repeat(64) }, 'ipad'), (e: any) => e.status === 409);
    const row = await db.proctoringEvent.findUniqueOrThrow({ where: { id: `evidence_${evidenceId}` } });
    assert.equal(row.type, 'SCREENSHOT');
    assert.equal(await db.proctoringEvent.count({ where: { id: row.id } }), 1);
    const metadata = row.metadata as any;
    const stored = await downloadPrivateObject(metadata.reference);
    assert.ok(stored.bytes.length > 0); assert.equal(stored.contentType, 'image/jpeg');
    const forbidden = await fetch(`${base}/api/proctoring/evidence/${row.id}`); assert.equal(forbidden.status, 403);
    const other = await db.session.findFirstOrThrow({ where: { organizationId: org.id, candidateId: { not: own.userId } } });
    await assert.rejects(api.cameraPolicy(other.id), (e: any) => e.status === 403);
    await assert.rejects(api.sendCameraPhoto(other.id, randomUUID(), photo, 'ipad'), (e: any) => e.status === 403);
    assert.deepEqual(await db.license.aggregate({ where: { organizationId: org.id }, _sum: { credits: true } }), before);
    assert.equal(await db.session.count({ where: { organizationId: org.id } }), countBefore);
    const result = { testedAt: new Date().toISOString(), data: 'synthetic 2x2 JPEG, no human image or native camera',
      sessionId: session.id, evidenceId, oneEvent: true, privateStorageReadVerified: true, changedDigestBlocked: true,
      anonymousBlocked: true, candidateEvidenceReadBlocked: true, otherSessionBlocked: true, noCreditDebit: true, noNewSession: true };
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    fs.writeFileSync(`${root}/sprint2-camera-result.json`, JSON.stringify(result, null, 2), { mode: 0o600 }); console.log(JSON.stringify(result));
  } finally {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${org.id} FOR UPDATE`;
      const current = await tx.organization.findUniqueOrThrow({ where: { id: org.id } });
      const settings = { ...(current.settings as Record<string, unknown>) };
      assert.deepEqual(settings.nativeCameraPilot, pilot, 'Pilot settings changed during test; preserve and inspect');
      if ('nativeCameraPilot' in originalSettings) settings.nativeCameraPilot = originalSettings.nativeCameraPilot;
      else delete settings.nativeCameraPilot;
      await tx.organization.update({ where: { id: org.id }, data: { settings: settings as any } });
    });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; return db.$disconnect(); });
