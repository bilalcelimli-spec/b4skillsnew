#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

function assertOk(ok, message) { if (!ok) throw new Error(message); }
const cookies = response => response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
async function json(response, path) {
  assertOk(response.ok, `${path} failed with status ${response.status}`);
  assertOk(response.headers.get('content-type')?.includes('application/json'), `${path} did not return JSON`);
  return response.json();
}

/** Exercise canonical health routes and cookie rotation without accepting SPA HTML as health evidence. */
export async function runAuthSmoke({ baseUrl, email, password, fetchImpl = fetch, log = console.log }) {
  assertOk(baseUrl && email && password, 'Missing required env vars: BASE_URL, AUTH_EMAIL, AUTH_PASSWORD');
  const request = (path, options = {}) => fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...options, signal: AbortSignal.timeout(15000),
  });
  const live = await json(await request('/api/healthz/live'), '/api/healthz/live');
  assertOk(live.status === 'ok', 'Liveness status is not ok');
  log('OK: /api/healthz/live');
  const ready = await json(await request('/api/healthz/ready'), '/api/healthz/ready');
  assertOk(ready.status === 'healthy' && ready.dependencies?.some(dep => dep.name === 'database' && dep.status === 'ok'),
    'Readiness does not confirm a healthy database');
  log('OK: /api/healthz/ready');
  const login = await request('/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  await json(login,'/api/auth/login');
  const loginCookies = cookies(login);
  assertOk(loginCookies, 'Login did not return auth cookies');
  const me = await json(await request('/api/auth/me',{headers:{Cookie:loginCookies}}),'/api/auth/me');
  assertOk(me.user?.uid, 'Authenticated user missing uid');
  log('OK: login and authenticated user');
  const refresh = await request('/api/auth/refresh',{method:'POST',headers:{Cookie:loginCookies}});
  await json(refresh,'/api/auth/refresh');
  const refreshCookies = cookies(refresh);
  assertOk(refreshCookies, 'Refresh did not rotate auth cookies');
  const refreshed = await json(await request('/api/auth/me',{headers:{Cookie:refreshCookies}}),'/api/auth/me after refresh');
  assertOk(refreshed.user?.uid === me.user.uid, 'Refresh changed the authenticated user');
  const logout = await request('/api/auth/logout',{method:'POST',headers:{Cookie:refreshCookies}});
  await json(logout,'/api/auth/logout');
  log('Auth smoke test passed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAuthSmoke({baseUrl:process.env.BASE_URL,email:process.env.AUTH_EMAIL,password:process.env.AUTH_PASSWORD})
    .catch(error=>{console.error(`Auth smoke test failed: ${error.message}`);process.exitCode=1;});
}
