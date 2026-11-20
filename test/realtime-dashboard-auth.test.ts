import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import WebSocket from 'ws';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: { session: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) } },
}));

import {
  RealtimeDashboardManager, resolveDashboardOrganization, upgradeOriginAllowed,
  type RealtimeIdentity,
} from '../src/lib/realtime/websocket-manager';

const APP = 'https://b4skills.example';
const users: Record<string, RealtimeIdentity> = {
  teacher: { userId: 't1', role: 'TEACHER', organizationId: 'org-a' },
  candidate: { userId: 'c1', role: 'CANDIDATE', organizationId: 'org-a' },
  director: { userId: 'd1', role: 'ASSESSMENT_DIRECTOR', organizationId: null },
};

let manager: RealtimeDashboardManager | null = null;
let server: http.Server | null = null;
afterEach(async () => {
  manager?.shutdown();
  await new Promise<void>((resolve) => server ? server.close(() => resolve()) : resolve());
  manager = null; server = null;
});

async function start() {
  server = http.createServer();
  manager = new RealtimeDashboardManager();
  await manager.attach(server, {
    isAllowedOrigin: (origin) => origin === APP,
    // Test token = user key; a real server verifies the JWT and loads the user.
    authenticate: async (req) => users[String(req.headers.authorization ?? '').replace('Bearer ', '')] ?? null,
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return `ws://127.0.0.1:${(server!.address() as AddressInfo).port}/ws/dashboard`;
}

/** Resolves with the HTTP status of a refused upgrade, or 101 when the socket opened. */
function connect(url: string, headers: Record<string, string>) {
  return new Promise<{ status: number; first?: any }>((resolve) => {
    const ws = new WebSocket(url, { headers });
    ws.on('unexpected-response', (_req, res) => { resolve({ status: res.statusCode ?? 0 }); ws.terminate(); });
    ws.on('message', (data) => { resolve({ status: 101, first: JSON.parse(String(data)) }); ws.close(); });
    ws.on('error', () => {});
  });
}

describe('realtime dashboard access', () => {
  it('refuses a socket without credentials or from a foreign site', async () => {
    const url = await start();
    expect((await connect(url, {})).status).toBe(403);
    expect((await connect(url, { Origin: 'https://evil.example', Authorization: 'Bearer teacher' })).status).toBe(403);
    expect((await connect(url, { Origin: APP })).status).toBe(401);
  });

  it('streams only the caller\'s own organisation', async () => {
    const url = await start();
    const own = await connect(`${url}?orgId=org-a`, { Origin: APP, Authorization: 'Bearer teacher' });
    expect(own.status).toBe(101);
    expect(own.first.organizationId).toBe('org-a');
    expect((await connect(`${url}?orgId=org-b`, { Origin: APP, Authorization: 'Bearer teacher' })).status).toBe(403);
    expect((await connect(url, { Origin: APP, Authorization: 'Bearer candidate' })).status).toBe(403);
  });

  it('lets platform roles choose an organisation', () => {
    expect(resolveDashboardOrganization(users.director, 'org-b')).toBe('org-b');
    expect(resolveDashboardOrganization(users.teacher, null)).toBe('org-a');
    expect(resolveDashboardOrganization({ ...users.teacher, organizationId: null }, null)).toBeNull();
  });

  it('requires a bearer token when no Origin is sent', () => {
    const req = (headers: Record<string, string>) => ({ headers }) as any;
    expect(upgradeOriginAllowed(req({}), () => true)).toBe(false);
    expect(upgradeOriginAllowed(req({ authorization: 'Bearer x' }), () => false)).toBe(true);
    expect(upgradeOriginAllowed(req({ origin: APP }), (o) => o === APP)).toBe(true);
  });
});
