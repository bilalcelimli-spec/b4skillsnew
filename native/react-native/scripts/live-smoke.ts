// Runs the app's own src/api.ts client through a complete session against the isolated local
// backend (scripts/e2e/start-local-backend.sh, or `npm run e2e:backend`). Local fixture accounts only; port 3001 only.
// Node's fetch has no cookie store, so a minimal jar stands in for the native one.
import fs from 'node:fs';
import { Backend, canRender, choiceText, responseMode, Answer } from '../src/api';

(globalThis as any).__DEV__ = true;
const BASE = 'http://localhost:3001';
const EMAIL = process.env.B4SKILLS_E2E_EMAIL ?? 'apple.mac@example.test';
const AUDIO = process.env.B4SKILLS_E2E_AUDIO ?? '/tmp/b4skills-apple-e2e/speech.m4a';

const jar = new Map<string, string>();
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init: any = {}) => {
  const headers = { ...(init.headers ?? {}) } as Record<string, string>;
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await realFetch(input, { ...init, headers });
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(';');
    const i = pair.indexOf('=');
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    if (!value || /max-age=0|expires=thu, 01 jan 1970/i.test(line)) jar.delete(name); else jar.set(name, value);
  }
  return res;
}) as typeof fetch;

async function main() {
  const api = new Backend(BASE);
  const user = await api.login(EMAIL, 'ApplePrototype-2026!');
  if (!user.organizationId) throw new Error('Candidate needs a local organization.');
  const { sessionId } = await api.launch(user.allowedProductLine || 'General English', user.organizationId);
  console.log('LIVE SESSION', sessionId);
  const audio = fs.readFileSync(AUDIO).toString('base64');
  const counts: Record<string, number> = {};
  const transitions: string[] = [];
  let media = false;

  for (let i = 0; i < 120; i += 1) {
    const d = await api.next(sessionId);
    if (d.stop) break;
    if (d.sectionTransition) { transitions.push(d.nextSection ?? ''); continue; }
    const item = d.item!;
    if (!canRender(item)) throw new Error(`Unsupported live item: ${item.type}/${item.skill}`);
    if (item.metadata.audioUrl && !media) {
      const url = api.mediaUrl(item.metadata.audioUrl)!;
      const r = await realFetch(url);
      media = r.ok;
      if (!r.ok) throw new Error(`Listening media HTTP ${r.status}: ${url}`);
    }
    const mode = responseMode(item);
    const options = item.metadata.options ?? [];
    const answer: Answer =
      mode === 'choice' ? { kind: 'choice', index: Math.max(0, options.findIndex(o => choiceText(o).startsWith('Correct response'))) }
      : mode === 'text' ? { kind: 'text', text: 'I believe learning English opens many doors. It helps me read books, travel and talk with people from other countries. Every day I practise a little, and I can see my progress clearly.' }
      : { kind: 'audio', base64: audio };
    await api.respond(sessionId, item.id, answer, 4000);
    const status = await api.status(sessionId);
    if (!status.answeredItemIds?.includes(item.id)) throw new Error(`Answer ${item.id} was not persisted.`);
    counts[item.skill] = (counts[item.skill] ?? 0) + 1;
  }

  const result = await api.status(sessionId);
  if (result.status !== 'COMPLETED') throw new Error(`Session ended as ${result.status}`);
  jar.clear();
  try { await new Backend(BASE).status(sessionId); throw new Error('Anonymous access must fail.'); }
  catch (e: any) { if (e.status !== 401) throw e; }
  console.log(JSON.stringify({ sessionId, candidate: EMAIL, status: result.status, answers: result.progress,
    skillCounts: counts, transitions, cefrLevel: result.cefrLevel ?? null, pendingCount: result.pendingCount ?? 0,
    provisional: result.provisional ?? true, listeningMediaHTTP200: media, anonymousBlocked: true }, null, 2));
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
