/**
 * Distractor hardening loop for reading/listening MCQs.
 *
 * Prompting alone does not stop LLM-written keys from being the most
 * moderate / reasonable-sounding option. This loop measures that directly:
 * solve blind (options shuffled); while the key is still found, ask the model
 * to rewrite ONLY the distractors, then confirm a solver WITH the text still
 * picks the key. If a rewrite makes the key unconfirmable, revert and stop.
 *
 * Limitation: the solver is an LLM, so the loop optimises against that
 * solver's heuristics. Treat the result as a reduction in cue-based
 * solvability, not proof that human candidates need the text.
 */

import { Type } from "@google/genai";
import { runJudge, isJudgeAvailable } from "../ai/validation/prompt-judge.js";
import { seededOrder, solveMcq } from "../ai/validation/gates/text-dependency.js";
import { runKeyUniquenessGate } from "../ai/validation/gates/key-uniqueness.js";
import { keyIndex } from "../psychometrics/content-iqs.js";

type Option = { id?: string; text: string; isCorrect?: boolean; rationale?: string; distractorRationale?: string };

export interface HardenResult {
  content: Record<string, any>;
  rounds: number;
  blindBefore: boolean | null;
  blindAfter: boolean | null;
  guidedOk: boolean | null;
  status: "unchanged" | "hardened" | "still-solvable" | "reverted" | "skipped";
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    distractors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { id: { type: Type.STRING }, text: { type: Type.STRING }, rationale: { type: Type.STRING } },
        required: ["id", "text", "rationale"],
      },
    },
  },
  required: ["distractors"],
};

async function check(content: Record<string, any>, kind: string, seed: string) {
  const opts: Option[] = content.options;
  const ki = keyIndex(content);
  const source = String(content.passage ?? content.ttsScript ?? content.transcript ?? content.audioScript ?? "").slice(0, 6000);
  const order = seededOrder(opts.length, seed);
  const shuffled = order.map((i) => String(opts[i].text));
  const keyPos = order.indexOf(ki);
  const question = String(content.question ?? content.stem ?? "");
  const [blind, guided] = await Promise.all([
    solveMcq(question, shuffled, null, kind),
    solveMcq(question, shuffled, source, kind),
  ]);
  return { blindOk: blind == null ? null : blind === keyPos, guidedOk: guided == null ? null : guided === keyPos };
}

async function rewriteDistractors(content: Record<string, any>, skill: string, cefr: string): Promise<Option[] | null> {
  const opts: Option[] = content.options;
  const ki = keyIndex(content);
  const key = opts[ki];
  const others = opts.filter((_, i) => i !== ki);
  const source = String(content.passage ?? content.ttsScript ?? content.transcript ?? content.audioScript ?? "");

  const r = await runJudge<{ distractors: Array<{ id: string; text: string; rationale: string }> }>({
    prompt: `You are an item writer fixing a ${cefr} ${skill.toLowerCase()} multiple-choice question whose key can currently be identified WITHOUT the source text, because the distractors are weaker or more extreme than the key.

SOURCE TEXT:
${source}

QUESTION: ${content.question ?? content.stem}
KEY (do not change): ${key.text}
CURRENT DISTRACTORS:
${others.map((o) => `- [${o.id}] ${o.text}`).join("\n")}

Rewrite EVERY distractor so that:
- Each is as moderate, specific and well-formed as the key — same register, similar length (within 15% of the key), same degree of hedging.
- None uses absolutes or dismissive words (only, always, never, entirely, exclusively, merely, completely, impossible, nothing, no one).
- Each is a plausible distortion of something the text actually says (wrong scope, wrong speaker, reversed cause, a detail from another part, a true point that does not answer THIS question). Each must be definitely wrong to someone who read the text and tempting to someone who skimmed.
- None names a person or detail only to be a strawman.
- Exactly one option (the key) answers the question correctly; no distractor may be defensible.
Return one entry per distractor, keeping its "id".`,
    responseSchema: SCHEMA,
    options: { temperature: 0.6, timeoutMs: 60_000 },
  });
  if (!r || r.distractors.length !== others.length) return null;

  const byId = new Map(r.distractors.map((d) => [d.id, d]));
  const rebuilt: Option[] = [];
  for (const o of opts) {
    if (o === key) { rebuilt.push(o); continue; }
    const d = byId.get(String(o.id));
    if (!d || !d.text.trim()) return null;
    rebuilt.push({ ...o, text: d.text.trim(), rationale: d.rationale, distractorRationale: d.rationale });
  }
  return rebuilt;
}

export async function hardenDistractors(
  item: { skill: string; cefr: string; content: Record<string, any> },
  opts: { maxRounds?: number; seed?: string } = {}
): Promise<HardenResult> {
  const maxRounds = opts.maxRounds ?? 2;
  const seed = opts.seed ?? "harden";
  const kind = item.skill === "LISTENING" ? "recording transcript" : "passage";
  let content = item.content;

  const opts0: Option[] = Array.isArray(content.options) ? content.options : [];
  const hasSource = !!String(content.passage ?? content.ttsScript ?? content.transcript ?? content.audioScript ?? "").trim();
  if (!isJudgeAvailable() || opts0.length < 3 || keyIndex(content) < 0 || !hasSource) {
    return { content, rounds: 0, blindBefore: null, blindAfter: null, guidedOk: null, status: "skipped" };
  }

  let first = await check(content, kind, `${seed}:0`);
  const blindBefore = first.blindOk;
  if (first.blindOk !== true) {
    return { content, rounds: 0, blindBefore, blindAfter: first.blindOk, guidedOk: first.guidedOk, status: "unchanged" };
  }

  let current = first;
  for (let round = 1; round <= maxRounds; round++) {
    const rewritten = await rewriteDistractors(content, item.skill, item.cefr);
    if (!rewritten) break;
    const candidate = { ...content, options: rewritten };
    const res = await check(candidate, kind, `${seed}:${round}`);
    // A solver picking the key does not prove no OTHER option is defensible: require a unique key.
    const unique = res.guidedOk === true
      ? await runKeyUniquenessGate({ type: "MULTIPLE_CHOICE" as any, skill: item.skill as any, cefrLevel: item.cefr as any, content: candidate as any })
      : null;
    if (res.guidedOk !== true || unique?.verdict !== "PASS") {
      return { content, rounds: round, blindBefore, blindAfter: current.blindOk, guidedOk: current.guidedOk, status: "reverted" };
    }
    content = candidate;
    current = res;
    if (res.blindOk !== true) {
      return { content, rounds: round, blindBefore, blindAfter: res.blindOk, guidedOk: res.guidedOk, status: "hardened" };
    }
  }
  return { content, rounds: maxRounds, blindBefore, blindAfter: current.blindOk, guidedOk: current.guidedOk, status: "still-solvable" };
}
