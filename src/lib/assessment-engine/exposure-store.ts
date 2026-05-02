/**
 * Exposure Store
 *
 * Global frequency + Sympson–Hetter *conditional* (θ-stratum) shares.
 * For multi-instance deployments set REDIS_URL; otherwise in-memory.
 *
 * Global: exposure rate ≈ item exposures / total test starts (when recordTestStart is used).
 * Conditional: within θ stratum s, share = counts(item, s) / total administrations in s.
 */

import { STRATUM_COUNT, thetaToStratum } from "./sympson-heter.js";

export interface ExposureStore {
  /**
   * Register one administration. Pass `atTheta` for Sympson–Hetter conditional stats.
   */
  recordExposure(itemId: string, atTheta?: number): Promise<void>;
  recordTestStart(): Promise<void>;
  getExposureRate(itemId: string): Promise<number>;
  getExposureRateSync(itemId: string): number;
  /** P(this item | stratum) = admin count (item, s) / total admin in stratum s. */
  getConditionalExposureRateSync(itemId: string, stratum: number): number;
  getStratumTotalSync(stratum: number): number;

  // Phase 3: Cohort-based exposure tracking (per CEFR-skill-topic)
  /**
   * Record item exposure for a specific cohort.
   * Cohort key format: "cefrLevel:skill:topic"
   */
  recordCohortExposure(itemId: string, cohortKey: string): Promise<void>;
  /**
   * Get exposure rate for item within a cohort: P(item | cohort)
   */
  getConditionalCohortExposureRateSync(itemId: string, cohortKey: string): number;
  /**
   * Get total administrations in a cohort.
   */
  getCohortTotalSync(cohortKey: string): number;
}

// ──────────────────────────────────────────────────────────────
// In-Memory
// ──────────────────────────────────────────────────────────────

class InMemoryExposureStore implements ExposureStore {
  private exposures = new Map<string, number>();
  private totalTests = 0;
  private stratumTotal: number[] = new Array(STRATUM_COUNT).fill(0);
  private itemStratum = new Map<string, number[]>();

  // Phase 3: Cohort-based tracking
  private cohortTotal = new Map<string, number>();
  private itemCohort = new Map<string, Map<string, number>>();

  private ensureRow(itemId: string): number[] {
    let row = this.itemStratum.get(itemId);
    if (!row) {
      row = new Array(STRATUM_COUNT).fill(0);
      this.itemStratum.set(itemId, row);
    }
    return row;
  }

  private ensureCohortRow(itemId: string): Map<string, number> {
    let row = this.itemCohort.get(itemId);
    if (!row) {
      row = new Map<string, number>();
      this.itemCohort.set(itemId, row);
    }
    return row;
  }

  async recordExposure(itemId: string, atTheta?: number): Promise<void> {
    this.exposures.set(itemId, (this.exposures.get(itemId) ?? 0) + 1);
    if (atTheta === undefined || !Number.isFinite(atTheta)) {
      return;
    }
    const s = thetaToStratum(atTheta);
    this.stratumTotal[s]++;
    const row = this.ensureRow(itemId);
    row[s]++;
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

  getStratumTotalSync(s: number): number {
    if (s < 0 || s >= STRATUM_COUNT) return 0;
    return this.stratumTotal[s] ?? 0;
  }

  getConditionalExposureRateSync(itemId: string, s: number): number {
    if (s < 0 || s >= STRATUM_COUNT) return 0;
    const tot = this.stratumTotal[s] ?? 0;
    if (tot === 0) return 0;
    const row = this.itemStratum.get(itemId);
    return (row?.[s] ?? 0) / tot;
  }

  // Phase 3: Cohort-based exposure
  async recordCohortExposure(itemId: string, cohortKey: string): Promise<void> {
    this.cohortTotal.set(cohortKey, (this.cohortTotal.get(cohortKey) ?? 0) + 1);
    const row = this.ensureCohortRow(itemId);
    row.set(cohortKey, (row.get(cohortKey) ?? 0) + 1);
  }

  getConditionalCohortExposureRateSync(itemId: string, cohortKey: string): number {
    const tot = this.cohortTotal.get(cohortKey) ?? 0;
    if (tot === 0) return 0;
    const row = this.itemCohort.get(itemId);
    return (row?.get(cohortKey) ?? 0) / tot;
  }

  getCohortTotalSync(cohortKey: string): number {
    return this.cohortTotal.get(cohortKey) ?? 0;
  }
}

// ──────────────────────────────────────────────────────────────
// Redis
// ──────────────────────────────────────────────────────────────

const EXPOSURE_PREFIX = "item:exp:";
const TOTAL_TESTS_KEY  = "cat:total_tests";
const STRAT_TOT = "cat:st:tot:";  // {s}
const ITEM_STRAT = "item:st:";    // {itemId}:{s}
const RATE_CACHE_TTL_MS = 5_000;

// Phase 3: Cohort-based exposure tracking
const COHORT_TOT = "cohort:adm:";        // {cohortKey} → count
const ITEM_COHORT = "cohort:exp:";       // {itemId}:{cohortKey} → count

class RedisExposureStore implements ExposureStore {
  private client: any;
  private rateCache = new Map<string, { rate: number; ts: number }>();
  private cachedTotal = 0;
  private totalCacheTs = 0;
  /** In-process mirror so sync getters work after local writes. */
  private stratumMirror = new Map<number, number>();
  private itemStratMirror = new Map<string, number>();

  // Phase 3: Cohort mirror for sync access
  private cohortMirror = new Map<string, number>();
  private itemCohortMirror = new Map<string, number>();

  constructor(client: any) {
    this.client = client;
  }

  async recordExposure(itemId: string, atTheta?: number): Promise<void> {
    const pipeline = this.client.pipeline();
    pipeline.incr(`${EXPOSURE_PREFIX}${itemId}`);
    pipeline.expire(`${EXPOSURE_PREFIX}${itemId}`, 60 * 60 * 24 * 90);

    if (atTheta !== undefined && Number.isFinite(atTheta)) {
      const s = thetaToStratum(atTheta);
      const sk = `${ITEM_STRAT}${itemId}:${s}`;
      pipeline.incr(`${STRAT_TOT}${s}`);
      pipeline.expire(`${STRAT_TOT}${s}`, 60 * 60 * 24 * 90);
      pipeline.incr(sk);
      pipeline.expire(sk, 60 * 60 * 24 * 90);
      this.stratumMirror.set(s, (this.stratumMirror.get(s) ?? 0) + 1);
      this.itemStratMirror.set(`${itemId}:${s}`, (this.itemStratMirror.get(`${itemId}:${s}`) ?? 0) + 1);
    }
    await pipeline.exec();
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

  getStratumTotalSync(s: number): number {
    if (s < 0 || s >= STRATUM_COUNT) return 0;
    return this.stratumMirror.get(s) ?? 0;
  }

  getConditionalExposureRateSync(itemId: string, s: number): number {
    if (s < 0 || s >= STRATUM_COUNT) return 0;
    const tot = this.getStratumTotalSync(s);
    if (tot === 0) return 0;
    return (this.itemStratMirror.get(`${itemId}:${s}`) ?? 0) / tot;
  }

  // Phase 3: Cohort-based exposure
  async recordCohortExposure(itemId: string, cohortKey: string): Promise<void> {
    const pipeline = this.client.pipeline();
    const cohortKey_ = `${COHORT_TOT}${cohortKey}`;
    const itemCohortKey = `${ITEM_COHORT}${itemId}:${cohortKey}`;

    pipeline.incr(cohortKey_);
    pipeline.expire(cohortKey_, 60 * 60 * 24 * 90);
    pipeline.incr(itemCohortKey);
    pipeline.expire(itemCohortKey, 60 * 60 * 24 * 90);

    this.cohortMirror.set(cohortKey, (this.cohortMirror.get(cohortKey) ?? 0) + 1);
    const key = `${itemId}:${cohortKey}`;
    this.itemCohortMirror.set(key, (this.itemCohortMirror.get(key) ?? 0) + 1);

    await pipeline.exec();
  }

  getConditionalCohortExposureRateSync(itemId: string, cohortKey: string): number {
    const tot = this.getCohortTotalSync(cohortKey);
    if (tot === 0) return 0;
    const count = this.itemCohortMirror.get(`${itemId}:${cohortKey}`) ?? 0;
    return count / tot;
  }

  getCohortTotalSync(cohortKey: string): number {
    return this.cohortMirror.get(cohortKey) ?? 0;
  }
}

// ──────────────────────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────────────────────

let _store: ExposureStore | null = null;

async function createRedisStore(url: string): Promise<ExposureStore | null> {
  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(url, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    await client.ping();
    return new RedisExposureStore(client);
  } catch {
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
  }
  _store = new InMemoryExposureStore();
  return _store;
}

/** Non-blocking check for the singleton (hot path in tests / after init). */
export function getExposureStoreIfReady(): ExposureStore | null {
  return _store;
}

/** @internal Test isolation only — in-memory re-seed. */
export function _resetExposureStoreForTests(): void {
  if (process.env.VITEST !== "true" && process.env.NODE_ENV !== "test") {
    return;
  }
  _store = new InMemoryExposureStore();
}

export function initExposureStore(): void {
  getExposureStore().catch(() => {});
}
