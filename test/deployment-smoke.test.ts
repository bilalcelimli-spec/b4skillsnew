import { describe, expect, it, vi } from 'vitest';
import { runAuthSmoke } from '../scripts/smoke-auth.mjs';

const json = (body: unknown, cookie?: string) => new Response(JSON.stringify(body), {
  headers: { 'Content-Type': 'application/json', ...(cookie ? { 'Set-Cookie': cookie } : {}) },
});
const healthy = () => [json({ status: 'ok' }), json({ status: 'healthy', dependencies: [{ name: 'database', status: 'ok' }] })];
const options = { baseUrl: 'https://example.test/', email: 'smoke@example.test', password: 'test-only', log: () => {} };

function mockResponses(responses: Response[]) {
  return vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error('Unexpected request');
    return response;
  });
}

describe('production auth smoke', () => {
  it('rejects SPA HTML even when the server returns 200', async () => {
    const fetchImpl = mockResponses([new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } })]);
    await expect(runAuthSmoke({ ...options, fetchImpl })).rejects.toThrow('did not return JSON');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: 'degraded', dependencies: [{ name: 'database', status: 'ok' }] },
    { status: 'healthy', dependencies: [{ name: 'database', status: 'error' }] },
    { status: 'healthy', dependencies: [] },
  ])('does not attempt login without verified database readiness: %j', async ready => {
    const fetchImpl = mockResponses([json({ status: 'ok' }), json(ready)]);
    await expect(runAuthSmoke({ ...options, fetchImpl })).rejects.toThrow('healthy database');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('uses the rotated cookies to verify the same user and log out', async () => {
    const fetchImpl = mockResponses([...healthy(), json({ success: true }, 'accessToken=old; HttpOnly'),
      json({ user: { uid: 'smoke-user' } }), json({ success: true }, 'accessToken=new; HttpOnly'),
      json({ user: { uid: 'smoke-user' } }), json({ success: true })]);
    await runAuthSmoke({ ...options, fetchImpl });
    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([url]) => new URL(url).pathname)).toEqual([
      '/api/healthz/live', '/api/healthz/ready', '/api/auth/login', '/api/auth/me',
      '/api/auth/refresh', '/api/auth/me', '/api/auth/logout',
    ]);
    expect(calls[3][1].headers).toEqual({ Cookie: 'accessToken=old' });
    expect(calls[5][1].headers).toEqual({ Cookie: 'accessToken=new' });
    expect(calls[6][1].headers).toEqual({ Cookie: 'accessToken=new' });
  });

  it('rejects missing refresh cookies and changed identity', async () => {
    for (const missingCookie of [true, false]) {
      const fetchImpl = mockResponses([...healthy(), json({}, 'accessToken=old'),
        json({ user: { uid: 'original' } }), json({}, missingCookie ? undefined : 'accessToken=new'),
        json({ user: { uid: 'different' } })]);
      await expect(runAuthSmoke({ ...options, fetchImpl })).rejects.toThrow(missingCookie ? 'rotate auth cookies' : 'changed the authenticated user');
    }
  });

  it('rejects incomplete configuration before making any request', async () => {
    const fetchImpl = vi.fn();
    await expect(runAuthSmoke({ ...options, password: '', fetchImpl })).rejects.toThrow('Missing required env vars');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
