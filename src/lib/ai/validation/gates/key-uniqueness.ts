/**
 * Key uniqueness gate — for MCQ items only.
 *
 * Asks an LLM judge: "Given this question, can a candidate plausibly defend
 * any option OTHER than the marked key as correct?". The judge returns a
 * structured verdict with per-option correctness flags.
 *
 * Why an LLM rather than a rule? Because key-ambiguity is almost always a
 * subtle reasoning issue ("technically all four answers could be construed
 * as correct under interpretation X"). Rule-based detection mostly lands on
 * lexical near-duplicates — those are caught by distractor-quality already.
 *
 * Fail-soft: if the judge is unavailable (no API key) we return SKIPPED.
 * The orchestrator will down-rank the overall confidence accordingly.
 */

import type { DraftItem, GateIssue, GateResult } from "../types.js";
import { isJudgeAvailable, runJudge, JudgeType } from "../prompt-judge.js";

const GATE_NAME = "key-uniqueness";

const MCQ_TYPES = new Set(["MULTIPLE_CHOICE", "DRAG_DROP"]);

interface JudgeVerdict {
  uniqueKey: boolean;
  defensibleKeyIndex: number;
  alternativeAnswers: Array<{
    index: number;
    rationale: string;
    confidence: number; // 0-1
  }>;
  reasoning: string;
}

const RESPONSE_SCHEMA = {
  type: JudgeType.OBJECT,
  properties: {
    uniqueKey: { type: JudgeType.BOOLEAN },
    defensibleKeyIndex: { type: JudgeType.INTEGER },
    alternativeAnswers: {
      type: JudgeType.ARRAY,
      items: {
        type: JudgeType.OBJECT,
        properties: {
          index: { type: JudgeType.INTEGER },
          rationale: { type: JudgeType.STRING },
          confidence: { type: JudgeType.NUMBER },
        },
        required: ["index", "rationale", "confidence"],
      },
    },
    reasoning: { type: JudgeType.STRING },
  },
  required: ["uniqueKey", "defensibleKeyIndex", "alternativeAnswers", "reasoning"],
};

export async function runKeyUniquenessGate(
  item: DraftItem,
  options: { allowLlmJudge?: boolean } = {}
): Promise<GateResult> {
  const startedAt = Date.now();
  const issues: GateIssue[] = [];

  try {
    if (!MCQ_TYPES.has(item.type)) {
      return skip("non-mcq-item", startedAt);
    }
    if (options.allowLlmJudge === false || !isJudgeAvailable()) {
      return skip("judge-unavailable", startedAt);
    }

    const optionsList = (item.content?.options ?? []).map((o) => String(o ?? "").trim());
    if (optionsList.length < 2) {
      return skip("insufficient-options", startedAt);
    }

    const prompt = buildPrompt(item, optionsList);
    const verdict = await runJudge<JudgeVerdict>({
      prompt,
      responseSchema: RESPONSE_SCHEMA,
      options: { temperature: 0.1, timeoutMs: 25_000 },
    });

    if (!verdict) {
      return {
        gate: GATE_NAME,
        verdict: "ERROR",
        score: 0,
        durationMs: Date.now() - startedAt,
        issues,
        error: "judge returned null",
      };
    }

    if (!verdict.uniqueKey) {
      const altCount = verdict.alternativeAnswers.length;
      issues.push({
        code: "KEY-AMBIG-01",
        severity: altCount >= 2 ? "CRITICAL" : "MAJOR",
        category: "key.ambiguity",
        message: `LLM judge identified ${altCount} alternative defensible answer(s). ${verdict.reasoning}`,
        field: "content.correctAnswer",
        suggestion: "Tighten the question stem or revise distractors so only one option is unambiguously correct.",
        data: { alternatives: verdict.alternativeAnswers, judgeKeyIndex: verdict.defensibleKeyIndex },
      });
    }

    // Cross-check the judge's pick against the marked key
    const markedKeyIndex = resolveMarkedKey(item, optionsList);
    if (markedKeyIndex >= 0 && verdict.defensibleKeyIndex !== markedKeyIndex && verdict.defensibleKeyIndex >= 0) {
      issues.push({
        code: "KEY-MISMATCH-01",
        severity: "CRITICAL",
        category: "key.mismatch",
        message: `Judge believes the correct option is index ${verdict.defensibleKeyIndex}, but the item marks index ${markedKeyIndex} as the key.`,
        suggestion: "Re-verify the correct answer against the item content.",
        data: { judgeKeyIndex: verdict.defensibleKeyIndex, markedKeyIndex },
      });
    }

    const critical = issues.filter((i) => i.severity === "CRITICAL").length;
    const major = issues.filter((i) => i.severity === "MAJOR").length;
    const score = critical > 0 ? 0 : major > 0 ? 60 : 100;
    const result = critical > 0 ? "FAIL" : major > 0 ? "WARN" : "PASS";

    return {
      gate: GATE_NAME,
      verdict: result,
      score,
      durationMs: Date.now() - startedAt,
      issues,
      metrics: {
        uniqueKey: verdict.uniqueKey,
        judgeKeyIndex: verdict.defensibleKeyIndex,
        markedKeyIndex,
        alternativeCount: verdict.alternativeAnswers.length,
        reasoning: verdict.reasoning,
      },
    };
  } catch (err) {
    return {
      gate: GATE_NAME,
      verdict: "ERROR",
      score: 0,
      durationMs: Date.now() - startedAt,
      issues,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(item: DraftItem, opts: string[]): string {
  const c = item.content ?? {};
  const stem = String(c.question ?? c.stem ?? c.prompt ?? "");
  const stimulus = c.stimulus ? `\n\nPassage / context:\n${String(c.stimulus)}` : "";
  const optionsBlock = opts.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join("\n");

  return `You are an expert assessment editor reviewing a multiple-choice item for the LinguAdapt CEFR-aligned English test bank.

TASK: Decide whether the item has exactly ONE defensible correct answer.

Skill: ${item.skill}
Target CEFR level: ${item.cefrLevel}${stimulus}

Question:
${stem}

Options:
${optionsBlock}

Marked correct answer: ${formatMarkedKey(c)}

Evaluate:
  1. Which option (by 0-indexed position) is the most defensible answer?
  2. Are there any OTHER options that a careful candidate could plausibly defend? For each, give the rationale and a confidence score (0=weakly defensible, 1=fully defensible).
  3. Provide a one-paragraph "reasoning" summarising your verdict.

Return JSON only.`;
}

function formatMarkedKey(c: DraftItem["content"]): string {
  if (typeof c.correctAnswer === "number") return `index ${c.correctAnswer}`;
  if (typeof c.correctAnswer === "string") return c.correctAnswer;
  if (Array.isArray(c.acceptableAnswers) && c.acceptableAnswers.length > 0) {
    return c.acceptableAnswers.join(" / ");
  }
  return "(unspecified)";
}

function resolveMarkedKey(item: DraftItem, options: string[]): number {
  const raw = item.content.correctAnswer;
  if (typeof raw === "number" && raw >= 0 && raw < options.length) return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    const letter = t.match(/^[A-Fa-f]$/);
    if (letter) {
      const idx = t.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) return idx;
    }
    if (/^\d+$/.test(t)) {
      const idx = Number(t);
      if (idx >= 0 && idx < options.length) return idx;
    }
    const ix = options.findIndex((o) => o.toLowerCase().trim() === t.toLowerCase());
    if (ix >= 0) return ix;
  }
  return -1;
}

function skip(reason: string, startedAt: number): GateResult {
  return {
    gate: GATE_NAME,
    verdict: "SKIPPED",
    score: 100,
    durationMs: Date.now() - startedAt,
    issues: [],
    metrics: { reason },
  };
}
