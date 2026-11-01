/**
 * Task family: items built from one task template (e.g. the Cambridge Movers
 * "Notes about the boy: Hair type ___" worksheet). Different recordings, same
 * task — so the passage cap does not see them, yet a candidate who gets five
 * in a row is measured on one task type.
 *
 * Key sources, first match wins: a `family:<name>` tag, then
 * `content.cambridge_task_id` (the exam-derived seeds carry it). Items without
 * either have no family and are never grouped.
 */

import type { Item } from "./types.js";

export type FamilyItem = Pick<Item, "metadata"> & { tags?: string[] | null };

export function taskFamilyKey(item: FamilyItem): string | null {
  const tag = (item.tags ?? []).find((t) => t.startsWith("family:"));
  if (tag) return tag;
  const taskId = (item.metadata as Record<string, unknown> | undefined)?.cambridge_task_id;
  return typeof taskId === "string" && taskId.trim() ? `cambridge:${taskId.trim()}` : null;
}

export const MAX_ITEMS_PER_FAMILY = 2;
export const MIN_POOL_AFTER_FAMILY_CAP = 5;

/**
 * Hard cap: at most `max` items of one task family per section. Ordering the
 * pool is not enough — the CAT selector ranks by information, so a family
 * that dominates a thin pool kept winning (simulation 2026-11-01: Primary
 * listening served 3–6 worksheet items in 159/200 sessions). Lifted when it
 * would leave fewer than `minRemaining` candidates, like the passage cap.
 */
export function capItemsPerFamily<T extends FamilyItem>(
  pool: T[],
  administeredInSection: FamilyItem[],
  max = MAX_ITEMS_PER_FAMILY,
  minRemaining = MIN_POOL_AFTER_FAMILY_CAP,
): T[] {
  const seen = new Map<string, number>();
  for (const item of administeredInSection) {
    const key = taskFamilyKey(item);
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  if (seen.size === 0) return pool;
  const allowed = pool.filter((item) => {
    const key = taskFamilyKey(item);
    return !key || (seen.get(key) ?? 0) < max;
  });
  return allowed.length >= minRemaining ? allowed : pool;
}

/** Number of distinct task families in a pool; an item without a family counts as its own. */
export function distinctFamilies(items: FamilyItem[]): number {
  const keys = new Set<string>();
  let singles = 0;
  for (const item of items) {
    const key = taskFamilyKey(item);
    if (key) keys.add(key); else singles++;
  }
  return keys.size + singles;
}
