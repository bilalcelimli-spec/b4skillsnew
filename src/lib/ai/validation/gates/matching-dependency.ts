/**
 * Matching dependency gate (LLM, DRAG_DROP matching items).
 *
 * Solves the matching task blind (no recording/passage) and with the source,
 * and reports exact and partial match rates. Advisory like text-dependency:
 * a single LLM attempt is a signal, not proof.
 */

import type { DraftItem, GateIssue, GateResult } from "../types.js";
import { isJudgeAvailable, runJudge, JudgeType } from "../prompt-judge.js";

const GATE_NAME = "matching-dependency";

const SCHEMA = {
  type: JudgeType.OBJECT,
  properties: { mapping: { type: JudgeType.ARRAY, items: { type: JudgeType.INTEGER } } },
  required: ["mapping"],
};

export async function solveMatching(
  prompt: string,
  zones: string[],
  items: string[],
  source: string | null,
  kind: string
): Promise<number[] | null> {
  const r = await runJudge<{ mapping: number[] }>({
    prompt: `${source ? `SOURCE ${kind.toUpperCase()}:\n${source}\n\n` : `The ${kind} is NOT available to you. Use only general knowledge, logic and the wording of the items.\n\n`}TASK: ${prompt}
ROWS (in order):
${zones.map((z, i) => `${i}. ${z}`).join("\n")}

ANSWERS (each may be used once; some are not needed):
${items.map((t, i) => `${i}. ${t}`).join("\n")}

Return "mapping": an array with one answer index per row, in row order.`,
    responseSchema: SCHEMA,
    options: { temperature: 0, timeoutMs: 40_000 },
  });
  if (!r || !Array.isArray(r.mapping) || r.mapping.length !== zones.length) return null;
  return r.mapping;
}

const SELECTION_SCHEMA = {
  type: JudgeType.OBJECT,
  properties: { selected: { type: JudgeType.ARRAY, items: { type: JudgeType.INTEGER } } },
  required: ["selected"],
};

export async function solveSelection(
  prompt: string,
  items: string[],
  k: number,
  source: string | null,
  kind: string
): Promise<number[] | null> {
  const r = await runJudge<{ selected: number[] }>({
    prompt: `${source ? `SOURCE ${kind.toUpperCase()}:\n${source}\n\n` : `The ${kind} is NOT available to you. Use only general knowledge, logic and the wording of the statements.\n\n`}TASK: ${prompt}
STATEMENTS:
${items.map((t, i) => `${i}. ${t}`).join("\n")}

Return "selected": exactly ${k} statement indexes.`,
    responseSchema: SELECTION_SCHEMA,
    options: { temperature: 0, timeoutMs: 40_000 },
  });
  if (!r || !Array.isArray(r.selected) || r.selected.length !== k) return null;
  return r.selected;
}

export function scoreSelection(guess: number[], key: number[]): { exact: boolean; fraction: number } {
  const k = new Set(key);
  const hits = new Set(guess).size === guess.length ? guess.filter((g) => k.has(g)).length : 0;
  return { exact: hits === key.length && guess.length === key.length, fraction: key.length ? hits / key.length : 0 };
}

export function scoreMapping(guess: number[], key: Record<string, number>, nZones: number): { exact: boolean; fraction: number } {
  let right = 0;
  for (let i = 0; i < nZones; i++) if (guess[i] === key[String(i)]) right++;
  return { exact: right === nZones, fraction: nZones ? right / nZones : 0 };
}

export async function runMatchingDependencyGate(
  item: DraftItem,
  options: { allowLlmJudge?: boolean } = {}
): Promise<GateResult> {
  const startedAt = Date.now();
  const skipped = (reason: string): GateResult => ({
    gate: GATE_NAME, verdict: "SKIPPED", score: 100, durationMs: Date.now() - startedAt, issues: [], metrics: { reason },
  });
  const c = item.content as Record<string, any>;
  const isSelection = Array.isArray(c.correctAnswers) && Number.isInteger(c.selectCount);
  if (item.type !== "DRAG_DROP" || (!isSelection && (!c.correctMapping || !Array.isArray(c.dropZones)))) return skipped("not-a-structured-item");
  if (item.skill !== "READING" && item.skill !== "LISTENING") return skipped("not-receptive-skill");
  if (options.allowLlmJudge === false || !isJudgeAvailable()) return skipped("judge-unavailable");

  const source = String(c.passage ?? c.ttsScript ?? c.transcript ?? c.audioScript ?? "").trim();
  if (!source) return skipped("missing-source");
  const kind = item.skill === "LISTENING" ? "recording transcript" : "passage";
  const zones: string[] = c.dropZones ?? [];
  const items: string[] = c.draggableItems;

  const [blind, guided] = isSelection
    ? await Promise.all([
        solveSelection(String(c.prompt ?? ""), items, c.selectCount, null, kind),
        solveSelection(String(c.prompt ?? ""), items, c.selectCount, source.slice(0, 6000), kind),
      ])
    : await Promise.all([
        solveMatching(String(c.prompt ?? ""), zones, items, null, kind),
        solveMatching(String(c.prompt ?? ""), zones, items, source.slice(0, 6000), kind),
      ]);
  if (!blind || !guided) {
    return { gate: GATE_NAME, verdict: "ERROR", score: 0, durationMs: Date.now() - startedAt, issues: [], error: "solver returned no answer" };
  }
  const b = isSelection ? scoreSelection(blind, c.correctAnswers) : scoreMapping(blind, c.correctMapping, zones.length);
  const g = isSelection ? scoreSelection(guided, c.correctAnswers) : scoreMapping(guided, c.correctMapping, zones.length);

  const issues: GateIssue[] = [];
  if (!g.exact) {
    issues.push({ code: "MATCH-KEY-UNCONFIRMED", severity: "MAJOR", category: "matching", message: "A solver with the source did not reproduce the key mapping — key may be wrong or ambiguous." });
  } else if (b.exact) {
    issues.push({ code: "MATCH-SOLVABLE-BLIND", severity: "MAJOR", category: "matching", message: "The full mapping was found without the source.", suggestion: "Make answers less distinguishable by topic or wording alone." });
  }
  return {
    gate: GATE_NAME,
    verdict: issues.length ? "WARN" : "PASS",
    score: !g.exact ? 40 : b.exact ? 55 : 100,
    durationMs: Date.now() - startedAt,
    issues,
    metrics: { blindExact: b.exact, blindFraction: b.fraction, guidedExact: g.exact, guidedFraction: g.fraction },
  };
}
