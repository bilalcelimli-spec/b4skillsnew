// Exam-code sign-in, end to end, with the app's own src/api.ts against the isolated local backend
// (npm run e2e:backend). Creates single-use fixture codes in the isolated database only.
import { execFileSync } from 'node:child_process';
import { ApiError, Backend } from '../../src/api';

(globalThis as any).__DEV__ = true;
const BASE = 'http://localhost:3001';
const PSQL = process.env.B4SKILLS_PG_BIN ? `${process.env.B4SKILLS_PG_BIN}/psql` : '/opt/homebrew/opt/postgresql@16/bin/psql';
const DB = ['-h', '127.0.0.1', '-p', '55432', '-d', 'b4skills_apple_e2e', '-Atc'];

const sql = (q: string) => execFileSync(PSQL, [...DB, q], { encoding: 'utf8' }).trim();

// One cookie jar per simulated device; Node's fetch keeps none.
function device() {
  const jar = new Map<string, string>();
  const realFetch = globalThis.fetch;
  const fetchWithJar = (async (input: any, init: any = {}) => {
    const headers = { ...(init.headers ?? {}) } as Record<string, string>;
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await realFetch(input, { ...init, headers });
    for (const line of (res.headers as any).getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const i = pair.indexOf('=');
      const value = pair.slice(i + 1).trim();
      if (!value || /max-age=0|expires=thu, 01 jan 1970/i.test(line)) jar.delete(pair.slice(0, i).trim());
      else jar.set(pair.slice(0, i).trim(), value);
    }
    return res;
  }) as typeof fetch;
  return async <T>(run: (api: Backend) => Promise<T>) => {
    const previous = globalThis.fetch;
    globalThis.fetch = fetchWithJar;
    try { return await run(new Backend(BASE)); } finally { globalThis.fetch = previous; }
  };
}

const expectError = async (p: Promise<unknown>, test: (e: ApiError) => boolean, label: string) => {
  try { await p; } catch (e) { if (e instanceof ApiError && test(e)) return; throw e; }
  throw new Error(`Expected failure: ${label}`);
};

async function main() {
  const org = sql(`SELECT id FROM "Organization" WHERE slug='apple-prototype-e2e'`);
  if (!org) throw new Error('Run npm run e2e:backend first (fixture organization missing).');
  const stamp = Date.now().toString(36).toUpperCase();
  const [codeNew, codeOwn, codeTaken] = ['N', 'O', 'T'].map(k => `E2E-${k}${stamp}`);
  for (const code of [codeNew, codeOwn, codeTaken]) {
    sql(`INSERT INTO "ExamCode"(id, code, "organizationId", "productLine") VALUES ('${code.toLowerCase()}', '${code}', '${org}', 'General English')`);
  }
  const results: Record<string, string> = {};

  // A. New candidate on a fresh device: validate → redeem with details → signed in → can launch.
  const email = `code.${stamp.toLowerCase()}@example.test`;
  await device()(async api => {
    const check = await api.validateCode(codeNew);
    const redemption = await api.redeemCode(codeNew, `cand_${stamp.toLowerCase()}`, {
      name: 'Kod', surname: 'Adayı', email, school: 'E2E Okulu', className: '9A',
    });
    const me = await api.me();
    if (me.uid !== redemption.candidateId || me.email !== email) throw new Error('Signed-in identity does not match redemption.');
    const { sessionId } = await api.launch(redemption.productLine, redemption.organizationId);
    const first = await api.next(sessionId);
    if (!first.item && !first.sectionTransition) throw new Error('Launched session delivered nothing.');
    results.newCandidate = `validated (${check.productLine}), redeemed, /me=${me.email}, launched ${sessionId}`;
  });

  // B. The same code cannot be reused, from any device.
  await device()(api => expectError(api.validateCode(codeNew), e => e.status === 400, 'used code validates'));
  results.reuseBlocked = 'used code rejected (HTTP 400)';

  // C. An existing account must sign in first.
  await device()(api => expectError(
    api.redeemCode(codeTaken, 'cand_existing', { name: 'A', surname: 'B', email: 'apple.mac@example.test', school: 'S', className: 'C' }),
    e => e.code === 'account_login_required', 'existing account redeemed without login'));
  results.existingAccount = 'account_login_required without sign-in';

  // D. Signed-in candidate redeems with their own account.
  await device()(async api => {
    const me = await api.login('apple.mac@example.test', 'ApplePrototype-2026!');
    const redemption = await api.redeemCode(codeOwn, 'cand_signedin', { name: 'Apple', surname: 'Mac', email: me.email, school: '', className: '' });
    if (redemption.candidateId !== me.uid) throw new Error('Signed-in redemption attached to another user.');
    results.signedIn = `redeemed into ${me.email}`;
  });

  console.log(JSON.stringify({ pass: true, ...results }, null, 2));
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
