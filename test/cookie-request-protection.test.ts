import express from 'express';
import cookieParser from 'cookie-parser';
import { describe, it, expect } from 'vitest';
import { cookieRequestProtection } from '../src/lib/security/cookie-request-protection';

function app() {
  const server = express();
  server.use(cookieParser());
  const csrf = cookieRequestProtection('test-only-secret', 'https://b4skills.com', true);
  server.get('/api/auth/csrf', csrf.issue);
  server.use('/api', csrf.protect);
  server.post('/api/respond', (_req, res) => res.json({ ok: true }));
  return server;
}
async function withServer(run: (base: string) => Promise<void>) {
  const server = app().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as import('node:net').AddressInfo;
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
describe('cookie authenticated request protection', () => {
  it('accepts exact web/native origins and blocks foreign, null and sibling origins', () => withServer(async base => {
    const post = (origin: string) => fetch(`${base}/api/respond`, { method: 'POST', headers: { Cookie: 'accessToken=session', Origin: origin } });
    expect((await post('https://b4skills.com')).status).toBe(200);
    for (const origin of ['https://evil.test', 'https://evil.b4skills.com', 'https://b4skills.com.evil.test', 'http://b4skills.com', 'null']) {
      expect((await post(origin)).status).toBe(403);
    }
  }));
  it('requires a signed token bound to both auth cookies for originless authenticated clients', () => withServer(async base => {
    const post = (cookie: string, token?: string) => fetch(`${base}/api/respond`, { method: 'POST', headers: { Cookie: cookie, ...(token ? {'X-CSRF-Token':token} : {}) } });
    expect((await post('accessToken=session')).status).toBe(403);
    const issued = await fetch(`${base}/api/auth/csrf`, { headers: { Cookie: 'accessToken=session' } });
    const {csrfToken: token} = await issued.json();
    expect(issued.headers.get('cache-control')).toBe('no-store');
    expect(issued.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Strict');
    const cookie = `accessToken=session; __Host-b4csrf=${token}`;
    expect((await post(cookie, token)).status).toBe(200);
    expect((await post(cookie.replace('accessToken=session', 'accessToken=other'), token)).status).toBe(403);
    expect((await post(`${cookie}; refreshToken=rotated`, token)).status).toBe(403);
    const forged = `${'a'.repeat(64)}.${'b'.repeat(64)}`;
    expect((await post(`accessToken=session; __Host-b4csrf=${forged}`, forged)).status).toBe(403);
  }));
  it('retains unauthenticated native login and rejects cross-origin login', () => withServer(async base => {
    expect((await fetch(`${base}/api/respond`, {method:'POST'})).status).toBe(200);
    expect((await fetch(`${base}/api/respond`, {method:'POST',headers:{Origin:'https://evil.test'}})).status).toBe(403);
  }));
});
