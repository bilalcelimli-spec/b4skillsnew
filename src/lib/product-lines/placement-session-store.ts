/**
 * Storage for anonymous freemium placement sessions.
 *
 * Render's load balancer has no sticky sessions, so with more than one web
 * instance a `/placement/:id/respond` call can land on a process that did not
 * start the test. With REDIS_URL set the state lives in Redis and any instance
 * can continue it; without Redis it stays in process memory (single instance
 * only).
 *
 * The state holds no item bank copy — items come from the shared pool cache in
 * `placement-pool.ts` — so a session is a few kilobytes, not the whole bank.
 * A per-session lock replaces the old in-memory `scoringInProgress` flag, so a
 * double-submitted answer is rejected even when the two requests reach
 * different instances.
 */
import crypto from "crypto";
import type { Redis as RedisClient } from "ioredis";
import type { FreemiumSkillBreakdown } from "./freemium-response-scoring.js";
import type { Response as PlacementResponse, Item as PlacementItem } from "../assessment-engine/types.js";

export interface PlacementSessionState {
  theta: number;
  sem: number;
  usedIds: string[];
  itemsAdministered: number;
  maxItems: number;
  name: string;
  email: string;
  skillBreakdown: Record<string, FreemiumSkillBreakdown>;
  skillProfiles: Record<string, { theta: number; sem: number }>;
  responses: PlacementResponse[];
  itemMeta: Record<string, PlacementItem>;
  currentItemId: string;
  createdAt: number;
}

export interface PlacementSessionStore {
  readonly kind: "redis" | "memory";
  /** Stores a new session; false when the active-session cap is reached. */
  create(id: string, state: PlacementSessionState): Promise<boolean>;
  get(id: string): Promise<PlacementSessionState | null>;
  save(id: string, state: PlacementSessionState): Promise<void>;
  delete(id: string): Promise<void>;
  /** Runs `fn` holding the session's lock; returns `{ locked: false }` when another request holds it. */
  withLock<T>(id: string, fn: () => Promise<T>): Promise<{ locked: true; value: T } | { locked: false }>;
}

/** Abandoned tests expire after this long. */
export const PLACEMENT_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
/** Upper bound for one answer's scoring (AI-scored writing/speaking included). */
const LOCK_TTL_MS = 2 * 60 * 1000;

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function remainingTtl(state: PlacementSessionState, now = Date.now()): number {
  return state.createdAt + PLACEMENT_SESSION_TTL_MS - now;
}

export class InMemoryPlacementSessionStore implements PlacementSessionStore {
  readonly kind = "memory" as const;
  private sessions = new Map<string, PlacementSessionState>();
  private locks = new Set<string>();

  constructor(private readonly maxActive = 500) {}

  private purge(now = Date.now()) {
    for (const [id, state] of this.sessions) {
      if (remainingTtl(state, now) <= 0) this.sessions.delete(id);
    }
  }

  async create(id: string, state: PlacementSessionState) {
    this.purge();
    if (this.sessions.size >= this.maxActive) return false;
    this.sessions.set(id, structuredClone(state));
    return true;
  }

  async get(id: string) {
    const state = this.sessions.get(id);
    if (!state) return null;
    if (remainingTtl(state) <= 0) { this.sessions.delete(id); return null; }
    return structuredClone(state);
  }

  async save(id: string, state: PlacementSessionState) {
    if (remainingTtl(state) <= 0) { this.sessions.delete(id); return; }
    this.sessions.set(id, structuredClone(state));
  }

  async delete(id: string) { this.sessions.delete(id); }

  async withLock<T>(id: string, fn: () => Promise<T>) {
    if (this.locks.has(id)) return { locked: false as const };
    this.locks.add(id);
    try { return { locked: true as const, value: await fn() }; }
    finally { this.locks.delete(id); }
  }
}

/** Deletes the lock only if this request still owns it (it may have expired and been retaken). */
const RELEASE_LOCK_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export class RedisPlacementSessionStore implements PlacementSessionStore {
  readonly kind = "redis" as const;
  private readonly prefix = "placement:";
  private readonly activeKey = "placement:active";

  constructor(private readonly redis: RedisClient, private readonly maxActive = 10_000) {}

  private key(id: string) { return `${this.prefix}sess:${id}`; }
  private lockKey(id: string) { return `${this.prefix}lock:${id}`; }

  async create(id: string, state: PlacementSessionState) {
    const now = Date.now();
    await this.redis.zremrangebyscore(this.activeKey, "-inf", now - PLACEMENT_SESSION_TTL_MS);
    if (await this.redis.zcard(this.activeKey) >= this.maxActive) return false;
    await this.redis.set(this.key(id), JSON.stringify(state), "PX", Math.max(1, remainingTtl(state, now)));
    await this.redis.zadd(this.activeKey, state.createdAt, id);
    return true;
  }

  async get(id: string) {
    const raw = await this.redis.get(this.key(id));
    return raw ? JSON.parse(raw) as PlacementSessionState : null;
  }

  async save(id: string, state: PlacementSessionState) {
    const ttl = remainingTtl(state);
    if (ttl <= 0) { await this.delete(id); return; }
    await this.redis.set(this.key(id), JSON.stringify(state), "PX", ttl);
  }

  async delete(id: string) {
    await this.redis.del(this.key(id));
    await this.redis.zrem(this.activeKey, id);
  }

  async withLock<T>(id: string, fn: () => Promise<T>) {
    const token = crypto.randomBytes(12).toString("hex");
    const acquired = await this.redis.set(this.lockKey(id), token, "PX", LOCK_TTL_MS, "NX");
    if (acquired !== "OK") return { locked: false as const };
    try { return { locked: true as const, value: await fn() }; }
    finally {
      await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, this.lockKey(id), token).catch(() => {});
    }
  }
}

export function createPlacementSessionStore(redis: RedisClient | null): PlacementSessionStore {
  const cap = process.env.PLACEMENT_MAX_ACTIVE_SESSIONS;
  return redis
    ? new RedisPlacementSessionStore(redis, positiveInt(cap, 10_000))
    : new InMemoryPlacementSessionStore(positiveInt(cap, 500));
}
