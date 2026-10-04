/**
 * Text-dependency gate (LLM, reading/listening MCQs only).
 *
 * Solves the item twice with options shuffled (seeded by content, so runs are
 * reproducible): blind, and with the source text. If the blind solve picks the
 * key, the item does not need the text.
 *
 * Verdicts are advisory (WARN/MAJOR → human REVIEW), never auto-REJECT: one
 * LLM guess is a signal, not proof, and a strong LLM out-guesses human
 * candidates. Use the aggregate rate across a batch for decisions.
 */

import type { DraftItem, GateIssue, GateResult } from "../types.js";
import { isJudgeAvailable, runJudge, JudgeType } from "../prompt-judge.js";
import { keyIndex } from "../../../psychometrics/content-iqs.js";

const GATE_NAME = "text-dependency";
const SCHEMA = {
  type: JudgeType.OBJECT,
  properties: { answerIndex: { type: JudgeType.INTEGER } },
  required: ["answerIndex"],
};

const optText = (o: unknown) => (typeof o === "string" ? o : String((o as any)?.text ?? ""));

export function seededOrder(n: number, seed: string): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function solveMcq(question: string, options: string[], source: string | null, kind: string): Promise<number | null> {
  const r = await runJudge<{ answerIndex: number }>({
    prompt: `${source ? `SOURCE ${kind.toUpperCase()}:\n${source}\n\n` : `The ${kind} is NOT available to you. Use only general knowledge, logic and the wording of the options.\n\n`}QUESTION: ${question}
OPTIONS:
${options.map((o, i) => `${i}. ${o}`).join("\n")}

Return "answerIndex": the 0-based index of the single best answer.`,
    responseSchema: SCHEMA,
    options: { temperature: 0 },
  });
  return r ? r.answerIndex : null;
}

export async function runTextDependencyGate(
  item: DraftItem,
  options: { allowLlmJudge?: boolean } = {}
): Promise<GateResult> {
  const startedAt = Date.now();
  const skipped = (reason: string): GateResult => ({
    gate: GATE_NAME, verdict: "SKIPPED", score: 100, durationMs: Date.now() - startedAt, issues: [], metrics: { reason },
  });

  if (item.type !== "MULTIPLE_CHOICE") return skipped("non-mcq-item");
  if (item.skill !== "READING" && item.skill !== "LISTENING") return skipped("not-receptive-skill");
  if (options.allowLlmJudge === false || !isJudgeAvailable()) return skipped("judge-unavailable");

  const c = item.content as Record<string, any>;
  const opts: unknown[] = Array.isArray(c.options) ? c.options : [];
  const ki = keyIndex(c);
  const source = String(c.passage ?? c.ttsScript ?? c.transcript ?? c.audioScript ?? c.stimulus ?? "").trim();
  if (ki < 0 || opts.length < 3 || !source) return skipped("missing-key-options-or-text");

  const order = seededOrder(opts.length, `${item.id ?? ""}${source.slice(0, 40)}${optText(opts[0])}`);
  const shuffled = order.map((i) => optText(opts[i]));
  const keyPos = order.indexOf(ki);
  const question = String(c.question ?? c.stem ?? c.prompt ?? "");
  const kind = item.skill === "LISTENING" ? "recording transcript" : "passage";

  const [blind, guided] = await Promise.all([
    solveMcq(question, shuffled, null, kind),
    solveMcq(question, shuffled, source.slice(0, 6000), kind),
  ]);
  if (blind == null || guided == null) {
    return { gate: GATE_NAME, verdict: "ERROR", score: 0, durationMs: Date.now() - startedAt, issues: [], error: "solver returned no answer" };
  }

  const blindOk = blind === keyPos;
  const guidedOk = guided === keyPos;
  const issues: GateIssue[] = [];

  if (!guidedOk) {
    issues.push({
      code: "TEXTDEP-KEY-UNCONFIRMED",
      severity: "MAJOR",
      category: "text-dependency",
      message: "A solver with the text did not select the marked key — key may be wrong or ambiguous.",
      suggestion: "Re-verify the key against the source text.",
    });
  } else if (blindOk) {
    issues.push({
      code: "TEXTDEP-SOLVABLE-BLIND",
      severity: "MAJOR",
      category: "text-dependency",
      message: "The key was selected without access to the text.",
      suggestion: "Make distractors equally plausible out of context and require information found only in the text.",
    });
  }

  return {
    gate: GATE_NAME,
    verdict: issues.length === 0 ? "PASS" : "WARN",
    score: !guidedOk ? 40 : blindOk ? 55 : 100,
    durationMs: Date.now() - startedAt,
    issues,
    metrics: { blindOk, guidedOk },
  };
}
