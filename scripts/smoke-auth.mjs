#!/usr/bin/env node
/**
 * Production auth smoke test.
 *
 * Usage:
 *   BASE_URL=https://b4skills.com AUTH_EMAIL=admin@b4skills.com AUTH_PASSWORD='...' node scripts/smoke-auth.mjs
 */

const baseUrl = process.env.BASE_URL;
const email = process.env.AUTH_EMAIL;
const password = process.env.AUTH_PASSWORD;

if (!baseUrl || !email || !password) {
  console.error("Missing required env vars: BASE_URL, AUTH_EMAIL, AUTH_PASSWORD");
  process.exit(1);
}

const jsonHeaders = { "Content-Type": "application/json" };

function assertOk(ok, msg) {
  if (!ok) {
    throw new Error(msg);
  }
}

function collectCookies(setCookieHeaders) {
  if (!setCookieHeaders || setCookieHeaders.length === 0) return "";
  return setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
}

async function readJsonSafe(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  console.log(`Smoke auth started for ${baseUrl}`);

  const live = await fetch(`${baseUrl}/healthz`);
  assertOk(live.ok, `/healthz failed with status ${live.status}`);
  console.log("OK: /healthz");

  const ready = await fetch(`${baseUrl}/readyz`);
  assertOk(ready.ok, `/readyz failed with status ${ready.status}`);
  console.log("OK: /readyz");

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await readJsonSafe(loginRes);
  assertOk(loginRes.ok, `/api/auth/login failed (${loginRes.status}): ${JSON.stringify(loginBody)}`);
  const loginCookies = collectCookies(loginRes.headers.getSetCookie());
  assertOk(Boolean(loginCookies), "login did not return auth cookies");
  console.log("OK: /api/auth/login");

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: loginCookies },
  });
  const meBody = await readJsonSafe(meRes);
  assertOk(meRes.ok, `/api/auth/me failed (${meRes.status}): ${JSON.stringify(meBody)}`);
  assertOk(Boolean(meBody?.user?.uid), "/api/auth/me missing user uid");
  console.log("OK: /api/auth/me");

  const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { Cookie: loginCookies },
  });
  const refreshBody = await readJsonSafe(refreshRes);
  assertOk(refreshRes.ok, `/api/auth/refresh failed (${refreshRes.status}): ${JSON.stringify(refreshBody)}`);
  const refreshCookies = collectCookies(refreshRes.headers.getSetCookie());
  const authCookies = refreshCookies || loginCookies;
  console.log("OK: /api/auth/refresh");

  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: authCookies },
  });
  const logoutBody = await readJsonSafe(logoutRes);
  assertOk(logoutRes.ok, `/api/auth/logout failed (${logoutRes.status}): ${JSON.stringify(logoutBody)}`);
  console.log("OK: /api/auth/logout");

  console.log("Auth smoke test passed.");
}

main().catch((err) => {
  console.error(`Auth smoke test failed: ${err.message}`);
  process.exit(1);
});
