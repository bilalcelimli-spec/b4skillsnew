/**
 * Process-wide cache of the freemium placement item pool.
 *
 * Every `/placement/start` used to read the whole ACTIVE bank (content and
 * assets) from Postgres and keep a private copy in the session. Under load that
 * is one full-bank query per visitor and megabytes of duplicated items per
 * session. The pool is now loaded once per TTL per instance (single-flight, so
 * a burst of starts shares one query) and sessions keep only item ids.
 *
 * A failed load is not cached, so the next request retries.
 */
export interface PlacementPool<T extends { id: string }> {
  items: T[];
  byId: Map<string, T>;
  loadedAt: number;
}

export function createPlacementPoolCache<T extends { id: string }>(
  load: () => Promise<T[]>,
  ttlMs = 5 * 60 * 1000,
  now: () => number = Date.now,
) {
  let current: PlacementPool<T> | null = null;
  // The pool before the last refresh: a test in progress may have been served an
  // item that the refresh dropped, and its answer must still be scorable.
  let previous: PlacementPool<T> | null = null;
  let inflight: Promise<PlacementPool<T>> | null = null;

  async function get(): Promise<PlacementPool<T>> {
    if (current && now() - current.loadedAt < ttlMs) return current;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const items = await load();
        if (current) previous = current;
        current = { items, byId: new Map(items.map(item => [item.id, item])), loadedAt: now() };
        return current;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  /** Looks an item up in the current pool, then in the one before the last refresh. */
  async function find(id: string): Promise<T | undefined> {
    const pool = await get();
    return pool.byId.get(id) ?? previous?.byId.get(id);
  }

  return {
    get,
    find,
    invalidate() { current = null; previous = null; },
  };
}
