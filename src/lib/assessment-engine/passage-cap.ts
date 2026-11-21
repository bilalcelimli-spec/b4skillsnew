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

// ─── Set continuity ───────────────────────────────────────────────────────────
// The questions of one recording / reading text are served back to back and the
// recording is not returned to later. Before 2026-11-21 only the cap above
// existed: the selector chose question by question, so a second question of a
// recording could arrive after other recordings (4 of 15 recent listening
// sections), and the candidate had to hear the first one again.

type SetItem = Pick<Item, "id" | "metadata" | "skill" | "isPretest">;

export interface SetProgress<T> {
  /** Trailing scored items of this section that share the last item's text (0 = section not started). */
  run: number;
  /** Unserved questions of that same text that may still follow; empty once the set is complete. */
  siblings: T[];
}

/** Where the section stands inside its current set. Unscored pretest items never open or continue a set. */
export function setProgress<T extends SetItem>(
  pool: T[],
  administered: SetItem[],
  skill: Item["skill"],
  max = MAX_ITEMS_PER_PASSAGE,
): SetProgress<T> {
  const scored = administered.filter((item) => !item.isPretest);
  const last = scored[scored.length - 1];
  if (!last || last.skill !== skill) return { run: 0, siblings: [] };
  const key = passageKey(last);
  if (!key) return { run: 1, siblings: [] };
  let run = 0;
  for (let i = scored.length - 1; i >= 0 && passageKey(scored[i]!) === key; i--) run++;
  const served = scored.filter((item) => passageKey(item) === key).length;
  const siblings = served < max ? pool.filter((item) => !item.isPretest && passageKey(item) === key) : [];
  return { run, siblings };
}

/**
 * Pool for opening a new set: texts already used in the session are left out,
 * so a finished recording is never reopened. In a thin pool this falls back to
 * the plain cap (and then to the whole pool) rather than starving the section.
 */
export function excludeUsedPassages<T extends Pick<Item, "id" | "metadata">>(
  pool: T[],
  administered: Array<Pick<Item, "id" | "metadata">>,
  minRemaining = MIN_POOL_AFTER_CAP,
): { pool: T[]; reopened: boolean } {
  const used = new Set<string>();
  for (const item of administered) {
    const key = passageKey(item);
    if (key) used.add(key);
  }
  if (used.size === 0) return { pool, reopened: false };
  const fresh = pool.filter((item) => {
    const key = passageKey(item);
    return !key || !used.has(key);
  });
  if (fresh.length >= minRemaining) return { pool: fresh, reopened: false };
  return { pool: capItemsPerPassage(pool, administered), reopened: fresh.length < pool.length };
}

/**
 * Audit of an administered sequence (pretests included, in serving order):
 * how many texts were used for several questions, and how many of those had
 * another item between their questions.
 */
export function countSplitSets(administered: Array<Pick<Item, "id" | "metadata">>): { sets: number; split: number } {
  const positions = new Map<string, number[]>();
  administered.forEach((item, index) => {
    const key = passageKey(item);
    if (key) positions.set(key, [...(positions.get(key) ?? []), index]);
  });
  let sets = 0;
  let split = 0;
  for (const at of positions.values()) {
    if (at.length < 2) continue;
    sets++;
    if (at[at.length - 1]! - at[0]! !== at.length - 1) split++;
  }
  return { sets, split };
}

/**
 * Pretest candidates for a slot: never a question on a recording / text the
 * candidate has already met, which would bring that recording back later in
 * the exam. No thin-pool fallback — an empty result just skips the slot.
 */
export function pretestCandidates<T extends Pick<Item, "id" | "metadata">>(
  pool: T[],
  administered: Array<Pick<Item, "id" | "metadata">>,
): T[] {
  return excludeUsedPassages(pool, administered, 0).pool;
}
