/**
 * Item Bank Cache
 *
 * In-memory LRU-style cache for item pool queries. Under 100 concurrent users
 * `prisma.item.findMany()` was called on EVERY getNextItem() invocation —
 * approximately 100 full-table scans per second during peak load.
 *
 * Strategy:
 *  - Key = deterministic JSON of the Prisma `where` clause
 *  - TTL = 5 minutes (items change rarely; admin CRUD invalidates explicitly)
 *  - Max entries = 50 (covers all realistic filter combos, ~50 MB worst case)
 *
 * Thread safety: Node.js is single-threaded — no mutex needed.
 */

import { prisma } from "../prisma.js";
import { logger } from "../observability/index.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape returned by prisma.item.findMany() — kept generic to avoid coupling */
export type CachedItem = {
  id: string;
  itemCode: string | null;
  type: string;
  skill: string;
  discrimination: number;
  difficulty: number;
  guessing: number;
  content: unknown;
  status: string;
  isPretest: boolean;
};

interface CacheEntry {
  items: CachedItem[];
  expiresAt: number;
  hitCount: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 50;

// ─── Cache store ─────────────────────────────────────────────────────────────

const store = new Map<string, CacheEntry>();

// ─── Internal helpers ─────────────────────────────────────────────────────────

function cacheKey(whereClause: object): string {
  // JSON.stringify is deterministic for identical object shapes in V8
  return JSON.stringify(whereClause);
}

/** Evict the entry with the lowest hitCount when the cache is full */
function evictIfFull(): void {
  if (store.size < MAX_ENTRIES) return;
  let lowestKey = "";
  let lowestHits = Infinity;
  for (const [key, entry] of store) {
    if (entry.hitCount < lowestHits) {
      lowestHits = entry.hitCount;
      lowestKey = key;
    }
  }
  if (lowestKey) store.delete(lowestKey);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return items matching `whereClause`, using the cache when possible.
 *
 * On cache miss, hits the DB and primes the cache.
 * Stale entries (past TTL) are treated as misses.
 */
export async function getCachedItems(
  whereClause: object
): Promise<CachedItem[]> {
  const key = cacheKey(whereClause);
  const now = Date.now();

  const entry = store.get(key);
  if (entry && entry.expiresAt > now) {
    entry.hitCount++;
    return entry.items;
  }

  // Cache miss — fetch from DB
  const t0 = Date.now();
  const items = (await prisma.item.findMany({
    where: whereClause as any,
    select: {
      id: true,
      itemCode: true,
      type: true,
      skill: true,
      discrimination: true,
      difficulty: true,
      guessing: true,
      content: true,
      status: true,
      isPretest: true,
    },
  })) as CachedItem[];

  logger.debug(
    { durationMs: Date.now() - t0, count: items.length, cacheKey: key.slice(0, 80) },
    "item-bank-cache: DB fetch"
  );

  evictIfFull();
  store.set(key, { items, expiresAt: now + TTL_MS, hitCount: 0 });
  return items;
}

/**
 * Fetch items by their IDs — used to resolve used-item dictionaries in
 * submitResponse. Checks the cache entries for each ID before hitting DB.
 *
 * Falls back to a single batched DB query for any IDs not found in cache.
 */
export async function getItemsByIds(itemIds: string[]): Promise<CachedItem[]> {
  if (itemIds.length === 0) return [];

  const uniq = [...new Set(itemIds)];

  // Collect items already stored across all cache entries
  const found = new Map<string, CachedItem>();
  for (const entry of store.values()) {
    if (entry.expiresAt <= Date.now()) continue;
    for (const item of entry.items) {
      if (uniq.includes(item.id)) {
        found.set(item.id, item);
      }
    }
    if (found.size === uniq.length) break;
  }

  const missing = uniq.filter((id) => !found.has(id));
  if (missing.length > 0) {
    const rows = (await prisma.item.findMany({
      where: { id: { in: missing } },
      select: {
        id: true,
        itemCode: true,
        type: true,
        skill: true,
        discrimination: true,
        difficulty: true,
        guessing: true,
        content: true,
        status: true,
        isPretest: true,
      },
    })) as CachedItem[];
    for (const row of rows) found.set(row.id, row);
  }

  return uniq.map((id) => found.get(id)!).filter(Boolean);
}

/**
 * Invalidate all cache entries.
 * Call this after any admin operation that modifies the item bank
 * (create, update, retire, bulk-import).
 */
export function invalidateItemCache(): void {
  const count = store.size;
  store.clear();
  logger.info({ evictedEntries: count }, "item-bank-cache: full invalidation");
}

/**
 * Invalidate a single entry by where clause — finer-grained than full flush.
 */
export function invalidateItemCacheByWhere(whereClause: object): void {
  const key = cacheKey(whereClause);
  const deleted = store.delete(key);
  if (deleted) {
    logger.debug({ cacheKey: key.slice(0, 80) }, "item-bank-cache: entry invalidated");
  }
}

/** Cache statistics — exposed via /api/admin/cache-stats for ops dashboards */
export function getItemCacheStats(): {
  entries: number;
  totalItems: number;
  hitRates: Array<{ key: string; hits: number; expiresInMs: number }>;
} {
  const now = Date.now();
  const hitRates: Array<{ key: string; hits: number; expiresInMs: number }> = [];
  let totalItems = 0;

  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key); // lazy cleanup
      continue;
    }
    totalItems += entry.items.length;
    hitRates.push({
      key: key.slice(0, 60) + (key.length > 60 ? "…" : ""),
      hits: entry.hitCount,
      expiresInMs: entry.expiresAt - now,
    });
  }

  return { entries: store.size, totalItems, hitRates };
}
