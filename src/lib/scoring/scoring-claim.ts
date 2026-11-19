/**
 * Cross-instance ownership of one response's AI scoring.
 *
 * `scoring-queue.ts` dedupes jobs with a per-process set, and every instance
 * periodically re-enqueues persisted `pendingAsyncScore` responses. With more
 * than one web instance, B's recovery scan would pick up an answer A is still
 * scoring and send it to the AI provider a second time. A short Redis claim per
 * response makes exactly one instance score it.
 *
 * Without Redis (single instance, tests) every claim succeeds, which is the
 * previous behaviour. A Redis error also succeeds: a rare duplicate score is
 * better than answers that are never scored. The TTL covers a stuck or killed
 * worker: its claim expires and a later recovery scan takes the response over.
 */
import crypto from "node:crypto";
import type { Redis as RedisClient } from "ioredis";
import { getSharedRedis } from "../redis/shared-redis.js";

export interface ScoringClaim {
  owned: boolean;
  release(): Promise<void>;
}

const RELEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const noop = async () => {};

export async function claimScoring(
  responseId: string,
  ttlMs: number,
  getRedis: () => Promise<RedisClient | null> = getSharedRedis,
): Promise<ScoringClaim> {
  let redis: RedisClient | null;
  try { redis = await getRedis(); } catch { redis = null; }
  if (!redis) return { owned: true, release: noop };
  const key = `scoring:claim:${responseId}`;
  const token = crypto.randomBytes(12).toString("hex");
  try {
    const acquired = await redis.set(key, token, "PX", ttlMs, "NX");
    if (acquired !== "OK") return { owned: false, release: noop };
  } catch {
    return { owned: true, release: noop };
  }
  return {
    owned: true,
    release: async () => { await redis!.eval(RELEASE_SCRIPT, 1, key, token).catch(() => {}); },
  };
}
