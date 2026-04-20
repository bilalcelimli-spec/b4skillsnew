/**
 * Exposure Store
 *
 * Abstraction layer for Sympson-Hetter exposure tracking.
 * In single-process deployments an in-memory map suffices.
 * In multi-process / multi-instance deployments (e.g. Render auto-scaling)
 * set REDIS_URL to activate the Redis-backed store — this guarantees that
 * exposure counts survive server restarts and are consistent across replicas.
 *
 * The store tracks two counters per item:
 *  - exposures:  how many times the item was administered
 *  - totalTests: total number of tests started (shared counter)
 *
 * Exposure rate = exposures / totalTests
 */

export interface ExposureStore {
  /** Increment the exposure counter for an item. */
  recordExposure(itemId: string): Promise<void>;
  /** Increment the total-tests counter (call once per new session started). */
  recordTestStart(): Promise<void>;
  /** Return the current exposure rate for an item (0 if never administered). */
  getExposureRate(itemId: string): Promise<number>;
  /** Synchronous rate lookup — returns cached value or 0. Used in hot path. */
  getExposureRateSync(itemId: string): number;
}

// ──────────────────────────────────────────────────────────────
// In-Memory Implementation
// ──────────────────────────────────────────────────────────────

class InMemoryExposureStore implements ExposureStore {
  private exposures = new Map<string, number>();
  private totalTests = 0;

  async recordExposure(itemId: string): Promise<void> {
    this.exposures.set(itemId, (this.exposures.get(itemId) ?? 0) + 1);
  }

  async recordTestStart(): Promise<void> {
    this.totalTests++;
  }

  async getExposureRate(itemId: string): Promise<number> {
    return this.getExposureRateSync(itemId);
  }

  getExposureRateSync(itemId: string): number {
    if (this.totalTests === 0) return 0;
    return (this.exposures.get(itemId) ?? 0) / this.totalTests;
  }
}

// ──────────────────────────────────────────────────────────────
// Redis Implementation (optional; activated when REDIS_URL is set)
// ──────────────────────────────────────────────────────────────

const EXPOSURE_PREFIX = "item:exp:";
const TOTAL_TESTS_KEY  = "cat:total_tests";
const RATE_CACHE_TTL_MS = 5_000; // Re-read from Redis at most every 5 s

class RedisExposureStore implements ExposureStore {
  private client: any;          // ioredis Redis instance
  private rateCache = new Map<string, { rate: number; ts: number }>();
  private cachedTotal = 0;
  private totalCacheTs = 0;

  constructor(client: any) {
    this.client = client;
  }

  async recordExposure(itemId: string): Promise<void> {
    await this.client.incr(`${EXPOSURE_PREFIX}${itemId}`);
    // Expire after 90 days to prevent unbounded growth
    await this.client.expire(`${EXPOSURE_PREFIX}${itemId}`, 60 * 60 * 24 * 90);
  }

  async recordTestStart(): Promise<void> {
    await this.client.incr(TOTAL_TESTS_KEY);
    await this.client.expire(TOTAL_TESTS_KEY, 60 * 60 * 24 * 90);
  }

  async getExposureRate(itemId: string): Promise<number> {
    const now = Date.now();
    const cached = this.rateCache.get(itemId);
    if (cached && (now - cached.ts) < RATE_CACHE_TTL_MS) {
      return cached.rate;
    }

    // Refresh total tests cache
    if (now - this.totalCacheTs > RATE_CACHE_TTL_MS) {
      const total = await this.client.get(TOTAL_TESTS_KEY);
      this.cachedTotal = parseInt(total ?? "0", 10);
      this.totalCacheTs = now;
    }

    if (this.cachedTotal === 0) return 0;

    const exposures = await this.client.get(`${EXPOSURE_PREFIX}${itemId}`);
    const rate = parseInt(exposures ?? "0", 10) / this.cachedTotal;
    this.rateCache.set(itemId, { rate, ts: now });
    return rate;
  }

  getExposureRateSync(itemId: string): number {
    const cached = this.rateCache.get(itemId);
    return cached?.rate ?? 0;
  }
}

// ──────────────────────────────────────────────────────────────
// Factory — singleton resolved at startup
// ──────────────────────────────────────────────────────────────

let _store: ExposureStore | null = null;

async function createRedisStore(url: string): Promise<ExposureStore | null> {
  try {
    // Dynamic import so ioredis is truly optional (won't break if not installed)
    const { default: Redis } = await import("ioredis");
    const client = new Redis(url, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    await client.ping();
    return new RedisExposureStore(client);
  } catch {
    // ioredis not installed or Redis unreachable — fall back to in-memory
    return null;
  }
}

export async function getExposureStore(): Promise<ExposureStore> {
  if (_store) return _store;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisStore = await createRedisStore(redisUrl);
    if (redisStore) {
      _store = redisStore;
      return _store;
    }
    // Fall through to in-memory on Redis failure
  }

  _store = new InMemoryExposureStore();
  return _store;
}

/** Pre-initialise the store at application start (non-blocking). */
export function initExposureStore(): void {
  getExposureStore().catch(() => {
    // Silently fall back; store will initialise on first use
  });
}
