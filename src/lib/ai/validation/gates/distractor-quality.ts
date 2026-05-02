/**
 * Distractor quality gate — for MCQ-style items (MULTIPLE_CHOICE / GRAMMAR /
 * VOCABULARY / READING / LISTENING).
 *
 * Checks:
 *  1. Number of options (3-5 expected; 4 is the strong default)
 *  2. Correct answer is identifiable (string match against options or index)
 *  3. Length spread — longest option ≤ 2.5× mean (avoids "longest = key")
 *  4. Lexical overlap — no distractor is a substring/permutation of the key
 *  5. Forbidden distractors — no "all of the above", "none of the above",
 *     "both A and B", placeholder text, or empty strings
 *  6. Distractor uniqueness — no two options are duplicates
 *  7. Embedding plausibility — when embeddings are available, every distractor
 *     must sit in the cosine-similarity sweet-spot (0.30 ≤ d ≤ 0.85) relative
 *     to the key. Outside that band:
 *        too close (>0.85) → ambiguous/duplicate distractor
 *        too far  (<0.30) → trivially eliminable
 */

import type { DraftItem, GateIssue, GateResult } from "../types.js";
import { embedBatch, cosine, isEmbeddingAvailable } from "../embeddings.js";

const GATE_NAME = "distractor-quality";

const MCQ_TYPES = new Set(["MULTIPLE_CHOICE", "DRAG_DROP", "FILL_IN_BLANKS"]);

const SIM_TOO_CLOSE = 0.92;   // ≥ this → distractor is essentially the key
const SIM_AMBIGUOUS = 0.85;   // ≥ this → ambiguous (review)
const SIM_TOO_FAR = 0.20;     // ≤ this → trivially eliminable

const FORBIDDEN_PHRASES = [
  /^all of the above$/i,
  /^none of the above$/i,
  /^(both|either|neither)\s+[a-d]\s+(and|or|nor)\s+[a-d]/i,
  /^(a|b|c|d)\s+and\s+(a|b|c|d)$/i,
  /^(true|false)$/i,
  /^todo:?/i,
  /^placeholder/i,
  /^\[.*\]$/,
];

export async function runDistractorQualityGate(
  item: DraftItem,
  options: { allowEmbeddings?: boolean } = {}
): Promise<GateResult> {
  const startedAt = Date.now();
  const issues: GateIssue[] = [];
  const metrics: Record<string, unknown> = {};

  try {
    if (!MCQ_TYPES.has(item.type)) {
      return skip("non-mcq-item", startedAt);
    }

    const optionsList = (item.content?.options ?? []).map((o) => String(o ?? "").trim());
    if (optionsList.length === 0) {
      issues.push({
        code: "DISTR-NONE-01",
        severity: "CRITICAL",
        category: "distractor.completeness",
        message: "MCQ item has no options.",
        field: "content.options",
        suggestion: "Add 4 options (one key + three plausible distractors).",
      });
      return finalize(issues, metrics, startedAt);
    }

    // 1. Option count
    if (optionsList.length < 3) {
      issues.push({
        code: "DISTR-COUNT-01",
        severity: "CRITICAL",
        category: "distractor.completeness",
        message: `MCQ items require at least 3 options (got ${optionsList.length}).`,
        field: "content.options",
      });
    } else if (optionsList.length > 6) {
      issues.push({
        code: "DISTR-COUNT-02",
        severity: "MINOR",
        category: "distractor.completeness",
        message: `${optionsList.length} options is unusual; 4 is the standard.`,
        field: "content.options",
      });
    }

    // 2. Resolve the key
    const keyResolution = resolveKey(item, optionsList);
    metrics.keyIndex = keyResolution.index;
    metrics.keyText = keyResolution.text;

    if (keyResolution.index < 0) {
      issues.push({
        code: "DISTR-KEY-01",
        severity: "CRITICAL",
        category: "distractor.completeness",
        message: "Correct answer does not match any option (lookup by index/text failed).",
        field: "content.correctAnswer",
        suggestion: "Set `correctAnswer` to the exact option text, the option index (0-based), or the letter A-D.",
      });
      return finalize(issues, metrics, startedAt);
    }

    const distractors = optionsList.filter((_, i) => i !== keyResolution.index);

    // 3. Length spread
    const lens = optionsList.map((o) => o.length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const max = Math.max(...lens);
    const min = Math.min(...lens);
    metrics.optionLengthMean = Math.round(mean);
    metrics.optionLengthMax = max;
    metrics.optionLengthMin = min;
    if (mean > 0 && max / mean > 2.5) {
      issues.push({
        code: "DISTR-LEN-01",
        severity: "MAJOR",
        category: "distractor.length",
        message: `Longest option (${max} chars) is more than 2.5× the mean (${mean.toFixed(0)}). The longest option may stand out as the key.`,
        suggestion: "Equalise option lengths within ±30% of the mean.",
      });
    }

    // 4. Lexical overlap with key
    const keyTokens = tokenSet(keyResolution.text);
    distractors.forEach((d) => {
      if (!d) return;
      if (d.toLowerCase() === keyResolution.text.toLowerCase()) {
        issues.push({
          code: "DISTR-DUPE-01",
          severity: "CRITICAL",
          category: "distractor.uniqueness",
          message: `Distractor "${d}" is identical to the key.`,
        });
        return;
      }
      const dTokens = tokenSet(d);
      const overlap = jaccard(keyTokens, dTokens);
      if (overlap > 0.85) {
        issues.push({
          code: "DISTR-OVERLAP-01",
          severity: "MAJOR",
          category: "distractor.lexical-overlap",
          message: `Distractor "${truncate(d, 60)}" shares ${(overlap * 100).toFixed(0)}% of its tokens with the key — likely too similar.`,
          suggestion: "Make distractors lexically distinct from the key.",
        });
      }
    });

    // 5. Forbidden phrases
    for (const opt of optionsList) {
      if (!opt) {
        issues.push({
          code: "DISTR-EMPTY-01",
          severity: "CRITICAL",
          category: "distractor.completeness",
          message: "Empty option string.",
          field: "content.options",
        });
        continue;
      }
      if (FORBIDDEN_PHRASES.some((p) => p.test(opt))) {
        issues.push({
          code: "DISTR-FORBIDDEN-01",
          severity: "MAJOR",
          category: "distractor.style",
          message: `"${truncate(opt, 60)}" is a forbidden distractor pattern (e.g. "all of the above", placeholders, true/false).`,
          suggestion: "Replace with a substantive, plausible distractor.",
        });
      }
    }

    // 6. Inter-distractor uniqueness
    const seen = new Map<string, number>();
    optionsList.forEach((o, i) => {
      const key = o.toLowerCase().trim();
      if (!key) return;
      if (seen.has(key)) {
        issues.push({
          code: "DISTR-DUPE-02",
          severity: "MAJOR",
          category: "distractor.uniqueness",
          message: `Options ${seen.get(key)} and ${i} are duplicates ("${truncate(o, 50)}").`,
        });
      } else {
        seen.set(key, i);
      }
    });

    // 7. Embedding-based plausibility
    if (options.allowEmbeddings !== false && isEmbeddingAvailable()) {
      const allTexts = optionsList.map((o) => o || "—");
      const vectors = await embedBatch(allTexts, { taskType: "SEMANTIC_SIMILARITY" });
      const keyVec = vectors[keyResolution.index];
      const similarities: Array<{ idx: number; sim: number; text: string }> = [];

      if (keyVec) {
        vectors.forEach((v, i) => {
          if (i === keyResolution.index || !v) return;
          const sim = cosine(keyVec, v);
          similarities.push({ idx: i, sim, text: optionsList[i] });

          if (sim >= SIM_TOO_CLOSE) {
            issues.push({
              code: "DISTR-SIM-01",
              severity: "CRITICAL",
              category: "distractor.semantic",
              message: `Distractor at index ${i} ("${truncate(optionsList[i], 50)}") is semantically near-identical to the key (cosine=${sim.toFixed(2)}). Two correct answers may be possible.`,
              suggestion: "Replace with a distractor that targets a different misconception.",
            });
          } else if (sim >= SIM_AMBIGUOUS) {
            issues.push({
              code: "DISTR-SIM-02",
              severity: "MAJOR",
              category: "distractor.semantic",
              message: `Distractor at index ${i} ("${truncate(optionsList[i], 50)}") is too close to the key (cosine=${sim.toFixed(2)}); ambiguity risk.`,
            });
          } else if (sim <= SIM_TOO_FAR) {
            issues.push({
              code: "DISTR-SIM-03",
              severity: "MINOR",
              category: "distractor.semantic",
              message: `Distractor at index ${i} ("${truncate(optionsList[i], 50)}") is unrelated to the key (cosine=${sim.toFixed(2)}); too easy to eliminate.`,
              suggestion: "Use a distractor that captures a plausible misunderstanding of the key concept.",
            });
          }
        });
      }
      metrics.distractorSimilarities = similarities.map((s) => ({
        idx: s.idx,
        cosine: Math.round(s.sim * 1000) / 1000,
      }));
      metrics.embeddingsUsed = !!keyVec;
    } else {
      metrics.embeddingsUsed = false;
    }

    return finalize(issues, metrics, startedAt);
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

function resolveKey(item: DraftItem, options: string[]): { index: number; text: string } {
  const c = item.content ?? {};
  const raw = c.correctAnswer;

  // Numeric index
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < options.length) {
    return { index: raw, text: options[raw] };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    // Letter form A-F
    const letterMatch = trimmed.match(/^[A-Fa-f]$/);
    if (letterMatch) {
      const idx = trimmed.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) return { index: idx, text: options[idx] };
    }
    // Numeric string ("0", "1", etc.)
    if (/^\d+$/.test(trimmed)) {
      const idx = Number(trimmed);
      if (idx >= 0 && idx < options.length) return { index: idx, text: options[idx] };
    }
    // Exact string match (case-insensitive)
    const ix = options.findIndex((o) => o.toLowerCase().trim() === trimmed.toLowerCase());
    if (ix >= 0) return { index: ix, text: options[ix] };
  }

  // Fallback: acceptableAnswers
  if (Array.isArray(c.acceptableAnswers) && c.acceptableAnswers.length > 0) {
    const candidate = String(c.acceptableAnswers[0]).trim().toLowerCase();
    const ix = options.findIndex((o) => o.toLowerCase().trim() === candidate);
    if (ix >= 0) return { index: ix, text: options[ix] };
  }

  return { index: -1, text: "" };
}

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function finalize(
  issues: GateIssue[],
  metrics: Record<string, unknown>,
  startedAt: number
): GateResult {
  const critical = issues.filter((i) => i.severity === "CRITICAL").length;
  const major = issues.filter((i) => i.severity === "MAJOR").length;
  const minor = issues.filter((i) => i.severity === "MINOR").length;
  let score = 100 - critical * 25 - major * 10 - minor * 3;
  score = Math.max(0, score);
  const verdict = critical > 0 ? "FAIL" : major > 0 ? "WARN" : "PASS";
  return {
    gate: GATE_NAME,
    verdict,
    score,
    durationMs: Date.now() - startedAt,
    issues,
    metrics,
  };
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
