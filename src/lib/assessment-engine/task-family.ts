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
