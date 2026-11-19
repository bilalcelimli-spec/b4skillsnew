/**
 * One shared ioredis connection for the web process (rate limits, freemium
 * placement sessions). Returns null when REDIS_URL is unset or Redis cannot be
 * reached at startup; callers then fall back to per-process memory, which is
 * only correct for a single instance.
 *
 * `enableOfflineQueue: false` makes commands fail fast while Redis is down
 * instead of queueing behind a reconnect, so a Redis outage degrades requests
 * rather than hanging them.
 */
import type { Redis as RedisClient } from "ioredis";

let pending: Promise<RedisClient | null> | null = null;

export function getSharedRedis(): Promise<RedisClient | null> {
  if (pending) return pending;
  const url = process.env.REDIS_URL;
  if (!url) {
    pending = Promise.resolve(null);
    return pending;
  }
  pending = (async () => {
    try {
      const { default: Redis } = await import("ioredis");
      const client = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 2,
        connectTimeout: 5_000,
      });
      client.on("error", (err) => console.warn("[redis] connection error:", err.message));
      await client.connect();
      await client.ping();
      console.log("✅ Shared Redis connected");
      return client;
    } catch (err) {
      console.warn("⚠️  Shared Redis unavailable — falling back to per-instance memory:",
        err instanceof Error ? err.message : String(err));
      return null;
    }
  })();
  return pending;
}

export async function closeSharedRedis(): Promise<void> {
  const client = pending ? await pending : null;
  pending = null;
  if (!client) return;
  try { await client.quit(); } catch { client.disconnect(); }
}
