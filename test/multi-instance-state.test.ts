import { beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { claimScoring } from '../src/lib/scoring/scoring-claim';
import { consumeOAuthState, createOAuthState, safeRedirectPath } from '../src/lib/auth/social-sso';

/** The two ioredis commands a claim uses, shared like one Redis between instances. */
class FakeRedis {
  kv = new Map<string, { value: string; expiresAt: number }>();
  async set(key: string, value: string, _px: 'PX', ms: number, _nx: 'NX') {
    const live = this.kv.get(key);
    if (live && live.expiresAt > Date.now()) return null;
    this.kv.set(key, { value, expiresAt: Date.now() + ms });
    return 'OK';
  }
  async eval(_script: string, _n: number, key: string, token: string) {
    if (this.kv.get(key)?.value === token) { this.kv.delete(key); return 1; }
    return 0;
  }
}

describe('scoring claim across instances', () => {
  it('lets exactly one instance score a response, then frees it', async () => {
    const redis = new FakeRedis() as any;
    const a = await claimScoring('resp-1', 60_000, async () => redis);
    const b = await claimScoring('resp-1', 60_000, async () => redis);
    expect([a.owned, b.owned]).toEqual([true, false]);
    await b.release();                       // a loser cannot free the winner's claim
    expect((await claimScoring('resp-1', 60_000, async () => redis)).owned).toBe(false);
    await a.release();
    expect((await claimScoring('resp-1', 60_000, async () => redis)).owned).toBe(true);
  });

  it('a dead worker\'s claim lapses so recovery can take over', async () => {
    const redis = new FakeRedis() as any;
    await claimScoring('resp-2', 1, async () => redis);
    await new Promise(r => setTimeout(r, 5));
    expect((await claimScoring('resp-2', 60_000, async () => redis)).owned).toBe(true);
  });

  it('keeps scoring when Redis is absent or failing', async () => {
    expect((await claimScoring('r', 1000, async () => null)).owned).toBe(true);
    const broken = { set: async () => { throw new Error('down'); } } as any;
    expect((await claimScoring('r', 1000, async () => broken)).owned).toBe(true);
  });
});

describe('social sign-in state', () => {
  beforeAll(() => { process.env.JWT_SECRET ??= 'test-jwt-secret'; });

  it('is verifiable without the instance that issued it and carries the cookie nonce', () => {
    const nonce = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const state = createOAuthState('google', '/dashboard', Date.now(), nonce);
    expect(consumeOAuthState(state)).toMatchObject({ provider: 'google', redirectUri: '/dashboard', nonce });
  });

  it('rejects tampered, foreign and expired states', () => {
    const state = createOAuthState('google', '/dashboard');
    const [header, , sig] = state.split('.');
    const forged = Buffer.from(JSON.stringify({ provider: 'google', redirectUri: '//evil.example', nonce: 'x', aud: 'b4skills:oauth-state' })).toString('base64url');
    expect(consumeOAuthState(`${header}.${forged}.${sig}`)).toBeNull();
    expect(consumeOAuthState(state.slice(0, -2) + 'xx')).toBeNull();
    // A normal access token signed with the same secret is not a valid state.
    expect(consumeOAuthState(jwt.sign({ userId: 'u1' }, process.env.JWT_SECRET!))).toBeNull();
    expect(consumeOAuthState('not-a-state')).toBeNull();
    const old = createOAuthState('google', '/', Date.now() - 11 * 60 * 1000);
    expect(consumeOAuthState(old)).toBeNull();
  });

  it('only returns to same-site paths after sign-in', () => {
    expect(safeRedirectPath('/exams?tab=1')).toBe('/exams?tab=1');
    for (const bad of ['//evil.example', '/\\evil.example', 'https://evil.example', '', undefined, 42]) {
      expect(safeRedirectPath(bad)).toBe('/');
    }
  });
});
