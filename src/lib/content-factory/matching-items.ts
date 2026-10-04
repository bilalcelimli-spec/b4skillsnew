/**
 * Matching items (DRAG_DROP, `dropZones` + `draggableItems` + `correctMapping`).
 *
 * The model writes readable pairs; this module assembles the stored shape in
 * code (shuffling with a seed, computing key indexes) so the model never has to
 * produce index arithmetic. Extra items beyond the zones are unused
 * distractors, which also makes guessing far less likely than in a 4-option MCQ.
 */

import { seededOrder } from "../ai/validation/gates/text-dependency.js";

export interface MatchingPair {
  zone: string;
  answer: string;
}

export interface RawMatching {
  prompt: string;
  pairs: MatchingPair[];
  extraItems?: string[];
}

export interface MatchingContent {
  prompt: string;
  dropZones: string[];
  draggableItems: string[];
  correctMapping: Record<string, number>;
}

const MIN_ZONES = 3;
const MAX_ZONES = 5;
const MAX_LENGTH_SPREAD = 0.4;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function validateRawMatching(raw: RawMatching): string[] {
  const errs: string[] = [];
  const pairs = Array.isArray(raw?.pairs) ? raw.pairs : [];
  const extras = Array.isArray(raw?.extraItems) ? raw.extraItems : [];
  if (!String(raw?.prompt ?? "").trim()) errs.push("Missing prompt");
  if (pairs.length < MIN_ZONES || pairs.length > MAX_ZONES) errs.push(`Need ${MIN_ZONES}-${MAX_ZONES} pairs, got ${pairs.length}`);
  if (extras.length < 1) errs.push("Need at least 1 extra (unused) item");
  if (pairs.some((p) => !String(p?.zone ?? "").trim() || !String(p?.answer ?? "").trim())) errs.push("Empty zone or answer");

  const answers = pairs.map((p) => String(p?.answer ?? ""));
  const items = [...answers, ...extras.map(String)];
  if (new Set(items.map(norm)).size !== items.length) errs.push("Duplicate items");
  if (new Set(pairs.map((p) => norm(String(p?.zone ?? "")))).size !== pairs.length) errs.push("Duplicate zones");

  const lens = items.map((t) => t.length);
  const mean = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  if (mean > 0 && lens.some((l) => Math.abs(l - mean) / mean > MAX_LENGTH_SPREAD)) {
    errs.push("Item lengths differ too much (length can give the answer away)");
  }
  return errs;
}

export function assembleMatching(raw: RawMatching, seed: string): MatchingContent {
  const answers = raw.pairs.map((p) => p.answer.trim());
  const items = [...answers, ...(raw.extraItems ?? []).map((e) => e.trim())];
  const order = seededOrder(items.length, seed);
  const draggableItems = order.map((i) => items[i]);
  const correctMapping: Record<string, number> = {};
  answers.forEach((_, zone) => { correctMapping[String(zone)] = order.indexOf(zone); });
  return {
    prompt: raw.prompt.trim(),
    dropZones: raw.pairs.map((p) => p.zone.trim()),
    draggableItems,
    correctMapping,
  };
}

/** Structural check of an assembled item (what the scorer requires). */
export function validateAssembledMatching(c: Partial<MatchingContent>): string[] {
  const errs: string[] = [];
  const zones = c.dropZones ?? [];
  const items = c.draggableItems ?? [];
  const map = c.correctMapping ?? {};
  if (zones.length < 1) errs.push("No drop zones");
  if (items.length <= zones.length) errs.push("Need more items than zones");
  const vals = zones.map((_, i) => map[String(i)]);
  if (!vals.every((v) => Number.isInteger(v) && v >= 0 && v < items.length)) errs.push("correctMapping has invalid indexes");
  if (new Set(vals).size !== vals.length) errs.push("correctMapping reuses an item");
  return errs;
}

/** Probability of a fully correct response by guessing: (items − zones)! / items! */
export function chanceOfExactMatch(nZones: number, nItems: number): number {
  let p = 1;
  for (let i = 0; i < nZones; i++) p /= nItems - i;
  return p;
}

/** 3PL lower asymptote for the item: the exact-match chance, floored for estimability. */
export function guessingForMatching(nZones: number, nItems: number): number {
  return Math.max(0.02, Math.min(0.25, chanceOfExactMatch(nZones, nItems)));
}
