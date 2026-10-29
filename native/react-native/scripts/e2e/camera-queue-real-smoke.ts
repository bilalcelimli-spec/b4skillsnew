// Synthetic pixels only, existing QA tenant/session. No camera access or exam credit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { PhotoQueue } from '../../src/proctoring/photoQueue';
import { FaceMonitor } from '../../src/proctoring/faceMonitor';
import { encode } from 'jpeg-js';
import { PrismaClient } from '@prisma/client';
import { Backend } from '../../src/api';
import { downloadPrivateObject } from '../../../../src/lib/storage/private-storage';
(globalThis as any).__DEV__ = true;
if (process.env.B4SKILLS_API_VALIDATION_MODE !== 'true') throw Error('Private QA runtime required');
const root = '/tmp/b4skills-realdb-validation', base = 'http://127.0.0.1:3004';
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
    // CLI adapter uses an ephemeral Node AES-GCM key. Apple vault is tested separately
    // with the shared Objective-C codec and native app relaunch checks.
    const key = randomBytes(32), file = `${root}/synthetic-photo-queue.enc`;
    const storage = {
      read: async () => {
        if (!fs.existsSync(file)) return null;
        const sealed = fs.readFileSync(file), decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12));
        decipher.setAuthTag(sealed.subarray(12, 28));
        return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]).toString('utf8');
      },
      write: async (value: string) => {
        const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        fs.writeFileSync(`${file}.tmp`, Buffer.concat([iv, cipher.getAuthTag(), encrypted]), { mode: 0o600 });
        fs.renameSync(`${file}.tmp`, file);
      },
    };
    let lostAck = true;
    const send = async (p: any, current: () => boolean) => {
      await api.sendCameraPhoto(p.sessionId, p.evidenceId, p, p.platform, current);
      if (lostAck) { lostAck = false; throw new Error('simulated transport loss after real server commit'); }
    };
    const first = new PhotoQueue(storage, send);
    await first.append({ ...photo, evidenceId, sessionId: session.id, platform: 'ipad' });
    assert.ok(!fs.readFileSync(file).includes(Buffer.from(photo.base64)));
    await assert.rejects(first.flush(), /simulated transport loss/);
    assert.equal((await first.status()).length, 1);
    const restored = new PhotoQueue(storage, send);
    await Promise.all([restored.flush(), restored.flush()]);
    assert.equal((await restored.status()).length, 0);
    assert.equal(JSON.parse((await storage.read())!).entries.length, 0);
    // Deterministic synthetic samples exercise the same temporal filter and event API.
    for (const count of [0, 2]) {
      const monitor = new FaceMonitor(); let eventType: 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | null = null;
      for (let t = 0; t <= 5000; t += 1000) eventType = monitor.sample(count, t) || eventType;
      assert.ok(eventType);
      const event = { version: 2 as const, eventId: randomUUID(), sequence: count, sessionId: session.id, platform: 'ipad' as const,
        eventType, severity: 'INFO' as const, timestamp: new Date().toISOString(), metadata: { reason: 'synthetic-face-count-filter-check' } };
      await Promise.all([api.sendEvent(event), api.sendEvent(event)]);
      const observed = await db.proctoringEvent.findUniqueOrThrow({ where: { id: `native_${event.eventId}` } });
      assert.equal(observed.severity, 1); assert.equal(observed.type, eventType);
    }
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
      sessionId: session.id, evidenceId, oneEvent: true, lostAckRecovery: true, encryptedCliDiskReopen: true, nativeStorageAdapter: false, syntheticFaceEvents: true, privateStorageReadVerified: true, changedDigestBlocked: true,
      anonymousBlocked: true, candidateEvidenceReadBlocked: true, otherSessionBlocked: true, noCreditDebit: true, noNewSession: true };
    fs.writeFileSync(`${root}/sprint2-camera-queue-result.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
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
