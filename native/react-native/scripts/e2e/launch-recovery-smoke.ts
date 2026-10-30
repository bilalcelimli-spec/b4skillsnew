// Real backend + native API client; disposable local PostgreSQL only.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Backend } from '../../src/api';

(globalThis as any).__DEV__ = true;
const PORT = process.env.B4SKILLS_E2E_PORT ?? '3001';
if (!['3001', '3003'].includes(PORT)) throw new Error('Only isolated local test ports are allowed');
const config = dotenv.parse(fs.readFileSync('/tmp/b4skills-apple-e2e/backend.env'));
const target = new URL(config.DATABASE_URL);
if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/b4skills_apple_e2e') throw new Error('Disposable local database required');
const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } } });
const jar = new Map<string, string>();
const realFetch = globalThis.fetch;
let dropLaunchResponse = true;
globalThis.fetch = (async (input: any, init: any = {}) => {
  const response = await realFetch(input, { ...init, headers: { ...init.headers, Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], i = pair.indexOf('=');
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  if (String(input).endsWith('/api/sessions/launch') && response.ok && dropLaunchResponse) {
    dropLaunchResponse = false;
    await response.text(); // The server committed; only its response is lost to the caller.
    throw new TypeError('Injected lost launch response');
  }
  return response;
}) as typeof fetch;

async function main() {
  const api = new Backend(`http://localhost:${PORT}`);
  const user = await api.login('apple.client@example.test', 'ApplePrototype-2026!');
  if (!user.organizationId) throw new Error('Missing fixture organization');
  const key = randomUUID().toUpperCase(), product = user.allowedProductLine ?? 'General English';
  const before = await db.paymentTransaction.count({ where: { organizationId: user.organizationId, creditsAdded: -1 } });
  let failed = false;
  try { await api.launch(product, user.organizationId, key); } catch { failed = true; }
  if (!failed) throw new Error('The first response should have been lost');
  const [a, b] = await Promise.all([api.launch(product, user.organizationId, key), api.launch(product, user.organizationId, key)]);
  const sessionCount = await db.session.count({ where: { candidateId: user.uid, metadata: { path: ['launchRequestId'], equals: key } } });
  const after = await db.paymentTransaction.count({ where: { organizationId: user.organizationId, creditsAdded: -1 } });
  if (a.sessionId !== b.sessionId || sessionCount !== 1 || after - before !== 1) throw new Error('Duplicate session or debit');
  console.log(JSON.stringify({ lostResponseRecovered: true, concurrentReplaySameSession: true, sessionCount, creditDebits: after - before, sessionId: a.sessionId }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { globalThis.fetch = realFetch; await db.$disconnect(); });
