/**
 * "Choose the TWO (or THREE) statements …" items. Stored as DRAG_DROP with
 * `draggableItems`, `selectCount` and `correctAnswers` (indexes). Scoring is
 * all-or-nothing, so the guessing chance is 1 / C(n, k) instead of 1 / n.
 */

import { seededOrder } from "../ai/validation/gates/text-dependency.js";

export interface RawSelection {
  prompt: string;
  correct: string[];
  distractors: string[];
}

export interface SelectionContent {
  prompt: string;
  draggableItems: string[];
  selectCount: number;
  correctAnswers: number[];
}

const ABSOLUTES = /\b(only|always|never|all|none|completely|entirely|every|must|impossible|exclusively|merely|solely|purely|utterly|totally)\b/i;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function validateRawSelection(raw: RawSelection): string[] {
  const errs: string[] = [];
  const correct = Array.isArray(raw?.correct) ? raw.correct.map(String) : [];
  const distractors = Array.isArray(raw?.distractors) ? raw.distractors.map(String) : [];
  if (!String(raw?.prompt ?? "").trim()) errs.push("Missing prompt");
  if (correct.length < 2 || correct.length > 3) errs.push(`Need 2-3 correct statements, got ${correct.length}`);
  if (distractors.length < 2 || distractors.length > 4) errs.push(`Need 2-4 distractors, got ${distractors.length}`);
  const all = [...correct, ...distractors];
  if (all.some((t) => !t.trim())) errs.push("Empty statement");
  if (new Set(all.map(norm)).size !== all.length) errs.push("Duplicate statements");

  const lens = all.map((t) => t.length);
  const mean = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  if (mean > 0 && lens.some((l) => Math.abs(l - mean) / mean > 0.4)) errs.push("Statement lengths differ too much (length can give the answer away)");

  if (distractors.some((d) => ABSOLUTES.test(d)) && !correct.some((c) => ABSOLUTES.test(c))) {
    errs.push("Absolutes appear only in distractors (test-wiseness cue)");
  }
  return errs;
}

export function assembleSelection(raw: RawSelection, seed: string): SelectionContent {
  const items = [...raw.correct.map((t) => t.trim()), ...raw.distractors.map((t) => t.trim())];
  const order = seededOrder(items.length, seed);
  const draggableItems = order.map((i) => items[i]);
  const correctAnswers = raw.correct.map((_, i) => order.indexOf(i)).sort((a, b) => a - b);
  return { prompt: raw.prompt.trim(), draggableItems, selectCount: raw.correct.length, correctAnswers };
}

export function validateAssembledSelection(c: Partial<SelectionContent>): string[] {
  const errs: string[] = [];
  const items = c.draggableItems ?? [];
  const k = c.selectCount ?? 0;
  const key = c.correctAnswers ?? [];
  if (items.length <= k) errs.push("Need more statements than selections");
  if (key.length !== k) errs.push("correctAnswers length differs from selectCount");
  if (!key.every((i) => Number.isInteger(i) && i >= 0 && i < items.length) || new Set(key).size !== key.length) errs.push("correctAnswers invalid");
  return errs;
}

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** Chance of selecting exactly the right set by guessing: 1 / C(n, k). */
export function chanceOfExactSelection(nItems: number, k: number): number {
  return 1 / choose(nItems, k);
}

export function guessingForSelection(nItems: number, k: number): number {
  return Math.max(0.02, Math.min(0.25, chanceOfExactSelection(nItems, k)));
}
