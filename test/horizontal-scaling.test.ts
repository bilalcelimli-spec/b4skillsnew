import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import {
  InMemoryPlacementSessionStore, RedisPlacementSessionStore, PLACEMENT_SESSION_TTL_MS,
  type PlacementSessionState,
} from '../src/lib/product-lines/placement-session-store';
import { createPlacementPoolCache } from '../src/lib/product-lines/placement-pool';
import { accessTokenUserId, ipAndEmailKey, userOrIpKey } from '../src/lib/security/rate-limit-keys';

const state = (over: Partial<PlacementSessionState> = {}): PlacementSessionState => ({
  theta: 0, sem: 1.5, usedIds: ['a'], itemsAdministered: 0, maxItems: 36, name: 'Guest', email: '',
  skillBreakdown: {}, skillProfiles: {}, responses: [], itemMeta: {}, currentItemId: 'a',
  createdAt: Date.now(), ...over,
});

/** Minimal in-process stand-in for the ioredis commands the store uses. */
class FakeRedis {
  kv = new Map<string, { value: string; expiresAt: number }>();
  zsets = new Map<string, Map<string, number>>();
  private live(key: string) {
    const entry = this.kv.get(key);
    if (entry && entry.expiresAt <= Date.now()) { this.kv.delete(key); return undefined; }
    return entry;
  }
  async set(key: string, value: string, _px: 'PX', ms: number, nx?: 'NX') {
    if (nx && this.live(key)) return null;
    this.kv.set(key, { value, expiresAt: Date.now() + ms });
    return 'OK';
  }
  async get(key: string) { return this.live(key)?.value ?? null; }
  async del(key: string) { return this.kv.delete(key) ? 1 : 0; }
  private zset(key: string) { if (!this.zsets.has(key)) this.zsets.set(key, new Map()); return this.zsets.get(key)!; }
  async zadd(key: string, score: number, member: string) { this.zset(key).set(member, score); return 1; }
  async zrem(key: string, member: string) { return this.zset(key).delete(member) ? 1 : 0; }
  async zcard(key: string) { return this.zset(key).size; }
  async zremrangebyscore(key: string, _min: string, max: number) {
    for (const [m, s] of this.zset(key)) if (s <= max) this.zset(key).delete(m);
    return 0;
  }
  async eval(_script: string, _n: number, key: string, token: string) {
    if (this.live(key)?.value === token) { this.kv.delete(key); return 1; }
    return 0;
  }
}

describe('placement session store', () => {
  const stores = () => [
    new InMemoryPlacementSessionStore(2),
    new RedisPlacementSessionStore(new FakeRedis() as any, 2),
  ];

  it.each(stores().map(s => [s.kind, s] as const))('%s: round-trips state and deletes it', async (_kind, store) => {
    expect(await store.create('p1', state({ usedIds: ['a', 'b'] }))).toBe(true);
    const loaded = await store.get('p1');
    expect(loaded?.usedIds).toEqual(['a', 'b']);
    loaded!.theta = 1.2;
    await store.save('p1', loaded!);
    expect((await store.get('p1'))?.theta).toBe(1.2);
    await store.delete('p1');
    expect(await store.get('p1')).toBeNull();
  });

  it.each(stores().map(s => [s.kind, s] as const))('%s: caps active sessions and frees a slot on delete', async (_kind, store) => {
    expect(await store.create('p1', state())).toBe(true);
    expect(await store.create('p2', state())).toBe(true);
    expect(await store.create('p3', state())).toBe(false);
    await store.delete('p1');
    expect(await store.create('p3', state())).toBe(true);
  });

  it.each(stores().map(s => [s.kind, s] as const))('%s: rejects a concurrent answer while one is being scored', async (_kind, store) => {
    let release!: () => void;
    const first = store.withLock('p1', () => new Promise<string>(resolve => { release = () => resolve('scored'); }));
    await Promise.resolve();
    expect(await store.withLock('p1', async () => 'second')).toEqual({ locked: false });
    release();
    expect(await first).toEqual({ locked: true, value: 'scored' });
    expect(await store.withLock('p1', async () => 'after')).toEqual({ locked: true, value: 'after' });
  });

  it.each(stores().map(s => [s.kind, s] as const))('%s: releases the lock when scoring throws', async (_kind, store) => {
    await expect(store.withLock('p1', async () => { throw new Error('AI scorer down'); })).rejects.toThrow('AI scorer down');
    expect(await store.withLock('p1', async () => 'retry')).toEqual({ locked: true, value: 'retry' });
  });

  it('a second instance sharing Redis continues a test the first one started', async () => {
    const redis = new FakeRedis() as any;
    const instanceA = new RedisPlacementSessionStore(redis);
    const instanceB = new RedisPlacementSessionStore(redis);
    await instanceA.create('p1', state({ currentItemId: 'item-7' }));
    expect((await instanceB.get('p1'))?.currentItemId).toBe('item-7');
  });

  it('expires abandoned sessions after the TTL', async () => {
    const store = new InMemoryPlacementSessionStore();
    await store.create('old', state({ createdAt: Date.now() - PLACEMENT_SESSION_TTL_MS - 1 }));
    expect(await store.get('old')).toBeNull();
  });
});

describe('placement pool cache', () => {
  it('shares one bank load across a burst of starts and refreshes after the TTL', async () => {
    let clock = 0;
    const load = vi.fn(async () => [{ id: `i${load.mock.calls.length}` }]);
    const pool = createPlacementPoolCache(load, 1000, () => clock);
    await Promise.all([pool.get(), pool.get(), pool.get()]);
    expect(load).toHaveBeenCalledTimes(1);
    clock = 1500;
    await pool.get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('still finds an item the last refresh dropped, so an in-flight answer is scorable', async () => {
    let clock = 0;
    let items = [{ id: 'served' }];
    const pool = createPlacementPoolCache(async () => items, 1000, () => clock);
    await pool.get();
    items = [{ id: 'other' }];
    clock = 2000;
    expect(await pool.find('served')).toEqual({ id: 'served' });
  });

  it('does not cache a failed load', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue([{ id: 'x' }]);
    const pool = createPlacementPoolCache(load);
    await expect(pool.get()).rejects.toThrow('db down');
    expect((await pool.get()).items).toEqual([{ id: 'x' }]);
  });
});

describe('rate-limit keys', () => {
  const req = (over: Record<string, unknown> = {}) => ({ ip: '203.0.113.9', headers: {}, cookies: {}, body: {}, ...over }) as unknown as Request;

  it('gives each account on a shared school IP its own login budget', () => {
    const a = ipAndEmailKey(req({ body: { email: 'Ali@School.org ' } }));
    const b = ipAndEmailKey(req({ body: { email: 'ayse@school.org' } }));
    expect(a).not.toBe(b);
    expect(a).toBe(ipAndEmailKey(req({ body: { email: 'ali@school.org' } })));
  });

  it('keys the API limit by user when the access token verifies, else by IP', () => {
    const secret = 'test-secret';
    const token = jwt.sign({ userId: 'user-1' }, secret);
    expect(accessTokenUserId(req({ cookies: { accessToken: token } }), secret)).toBe('user-1');
    expect(userOrIpKey(secret)(req({ headers: { authorization: `Bearer ${token}` } }))).toBe('u:user-1');
    const forged = jwt.sign({ userId: 'admin' }, 'wrong-secret');
    expect(userOrIpKey(secret)(req({ cookies: { accessToken: forged } }))).toMatch(/^ip:/);
  });
});
