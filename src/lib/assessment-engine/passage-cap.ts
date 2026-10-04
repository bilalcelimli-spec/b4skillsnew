/**
 * Limits how many items of the same reading passage / listening recording a
 * candidate sees in one session.
 *
 * Items sharing a text are locally dependent: answering several of them
 * double-counts the same comprehension, which makes the ability estimate look
 * more certain than it is. The key is derived from the item's own content (no
 * DB tags needed), so new items are covered automatically.
 *
 * The cap is lifted when it would leave too few candidates, so it never
 * starves a section in a thin part of the bank.
 */

import { createHash } from "node:crypto";
import type { Item } from "./types.js";

export const MAX_ITEMS_PER_PASSAGE = 2;
export const MIN_POOL_AFTER_CAP = 5;

const cache = new WeakMap<object, string | null>();

/** Stable short hash of the item's reading passage or recording script, or null if it has none. */
export function passageKey(item: Pick<Item, "metadata">): string | null {
  const meta = item.metadata as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") return null;
  const cached = cache.get(meta);
  if (cached !== undefined) return cached;
  const raw = meta.passage ?? meta.ttsScript ?? meta.transcript ?? meta.audioScript ?? "";
  const text = typeof raw === "string" ? raw.trim() : "";
  const key = text ? createHash("sha1").update(text).digest("hex").slice(0, 12) : null;
  cache.set(meta, key);
  return key;
}

export function capItemsPerPassage<T extends Pick<Item, "id" | "metadata">>(
  pool: T[],
  administered: Array<Pick<Item, "id" | "metadata">>,
  max = MAX_ITEMS_PER_PASSAGE,
  minRemaining = MIN_POOL_AFTER_CAP
): T[] {
  const seen = new Map<string, number>();
  for (const item of administered) {
    const key = passageKey(item);
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  if (seen.size === 0) return pool;

  const allowed = pool.filter((item) => {
    const key = passageKey(item);
    return !key || (seen.get(key) ?? 0) < max;
  });
  return allowed.length >= minRemaining ? allowed : pool;
}
