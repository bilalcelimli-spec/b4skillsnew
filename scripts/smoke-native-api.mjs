// Public release gate: verify route presence and authentication without test data.
const origin = new URL(process.env.BASE_URL || 'https://b4skills.com');
if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) {
  throw new Error('Native API smoke requires HTTPS outside localhost.');
}
const routes = [
  ['GET', '/api/health', 200],
  ['GET', '/api/assessment/policy', 401],
  ['GET', '/api/sessions/native-release-probe/camera-policy', 401],
  ['POST', '/api/proctoring/event', 401],
  ['POST', '/api/proctoring/evidence/reserve', 401],
  ['POST', '/api/proctoring/evidence/commit', 401],
];
let failed = false;
for (const [method, path, expected] of routes) {
  try {
    const response = await fetch(new URL(path, origin), {
      method, redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'B4Skills-ReleasePreflight/1.0', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
    const body = await response.json();
    const ok = response.status === expected && (path !== '/api/health' || (body.status === 'ok' && body.database === 'up'));
    console.log(`${ok ? 'PASS' : 'FAIL'} ${method} ${path}: ${response.status} (expected ${expected})`);
    failed ||= !ok;
  } catch (error) {
    console.error(`FAIL ${method} ${path}: ${error.name}`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
