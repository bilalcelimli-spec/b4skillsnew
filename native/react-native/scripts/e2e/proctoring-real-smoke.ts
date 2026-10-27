// Existing synthetic QA tenant only. No launch success, credit debit, migration or item writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { Backend } from '../../src/api';
import type { NativeEvent } from '../../src/proctoring/protocol';
(globalThis as any).__DEV__ = true;
if (process.env.B4SKILLS_API_VALIDATION_MODE !== 'true') throw new Error('Private validation runtime required.');
const root = '/tmp/b4skills-realdb-validation', base = 'http://127.0.0.1:3004';
const accounts = JSON.parse(fs.readFileSync(`${root}/candidates.json`, 'utf8'));
const own = accounts.find((a: any) => a.platform === 'client'), other = accounts.find((a: any) => a.platform === 'mac');
const db = new PrismaClient();
const originalFetch = globalThis.fetch, jar = new Map<string, string>();
globalThis.fetch = (async (url: any, init: any = {}) => {
  const headers = new Headers(init.headers);
  if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
  const response = await originalFetch(url, { ...init, headers });
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(';')[0], i = pair.indexOf('=');
    if (!pair.slice(i + 1)) jar.delete(pair.slice(0, i)); else jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return response;
}) as typeof fetch;
async function main() {
  const org = await db.organization.findUniqueOrThrow({ where: { id: own.organizationId } });
  assert.equal(org.slug, 'apple-native-realdb-validation');
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: own.userId } })).organizationId, org.id);
  const session = await db.session.findFirstOrThrow({ where: { candidateId: own.userId, organizationId: org.id }, orderBy: { startedAt: 'desc' } });
  const creditsBefore = await db.license.aggregate({ where: { organizationId: org.id }, _sum: { credits: true } });
  const sessionsBefore = await db.session.count({ where: { organizationId: org.id } });
  const api = new Backend(base);
  await assert.rejects(api.examPolicy(), (e: any) => e.status === 401 || e.status === 403);
  await api.login(own.email, own.password);
  const policy = await api.examPolicy(); assert.equal(policy.version, 1);
  const capabilities = { version: 1 as const, platform: 'ipad' as const, microphone: true, lifecycleEvents: true, durableEvents: true, cameraEvidence: false, assessmentMode: false };
  await assert.rejects(api.launch('General English', org.id, randomUUID(), { accepted: true, policyRevision: '0'.repeat(64), capabilities }), (e: any) => e.code === 'EXAM_POLICY_CHANGED');
  await assert.rejects(api.launch('General English', org.id, randomUUID(), { accepted: true, policyRevision: policy.revision, capabilities: { ...capabilities, microphone: false } }), (e: any) => e.code === 'EXAM_CAPABILITY_REQUIRED');
  assert.deepEqual(await db.license.aggregate({ where: { organizationId: org.id }, _sum: { credits: true } }), creditsBefore);
  assert.equal(await db.session.count({ where: { organizationId: org.id } }), sessionsBefore);
  const event: NativeEvent = { version: 2, eventId: randomUUID(), sequence: 0, sessionId: session.id, platform: 'ipad', eventType: 'OTHER', severity: 'INFO', timestamp: new Date().toISOString(), metadata: { reason: 'sprint1-synthetic-integration-check' } };
  await Promise.all([api.sendEvent(event), api.sendEvent(event)]);
  await api.sendEvent(event);
  const rowId = `native_${event.eventId}`;
  assert.equal(await db.proctoringEvent.count({ where: { id: rowId, sessionId: session.id } }), 1);
  await assert.rejects(api.sendEvent({ ...event, sequence: 1 }), (e: any) => e.status === 409);
  await api.login(other.email, other.password);
  await assert.rejects(api.sendEvent(event), (e: any) => e.status === 403);
  const result = { testedAt: new Date().toISOString(), database: 'real Supabase PostgreSQL', organizationId: org.id, sessionId: session.id, eventId: event.eventId, anonymousPolicyBlocked: true, stalePolicyBlocked: true, missingMicrophoneBlocked: true, noCreditDebit: true, noNewSession: true, concurrentDuplicateSingleRow: true, changedPayloadBlocked: true, otherCandidateBlocked: true };
  fs.writeFileSync(`${root}/sprint1-proctoring-result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(JSON.stringify({ failure: error.message, code: error.code ?? error.status })); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; return db.$disconnect(); });
