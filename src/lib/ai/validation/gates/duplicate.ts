/**
 * Duplicate detection gate — hybrid n-gram + semantic embedding.
 *
 * Strategy:
 *  1. Fast pre-filter — character/word n-gram + keyword Jaccard against the
 *     supplied bank slice. Cheap (no API, O(n) per comparison).
 *  2. Top-K shortlist — keep the K most similar items by composite n-gram
 *     score.
 *  3. Semantic confirmation — for the shortlist only, fetch embeddings and
 *     compute cosine similarity. This catches paraphrased duplicates that
 *     n-gram analysis misses ("How long is the Nile?" vs "What is the length
 *     of the river Nile?").
 *
 * The bank slice is supplied by the orchestrator's caller — the gate itself
 * does NOT touch the database (keeps the gate pure & testable). For huge
 * banks the caller should hand-roll a SQL pre-filter (e.g. WHERE skill = ?
 * AND cefrLevel = ?) before passing in.
 */

import {
  buildFingerprint,
  checkAgainstBank,
  type ItemFingerprint,
  type SimilarityResult,
} from "../../../language-skills/item-similarity-detector.js";
import { embedText, cosine, isEmbeddingAvailable } from "../embeddings.js";
import type { DraftItem, GateIssue, GateResult } from "../types.js";
import { flattenItemText } from "../types.js";

const GATE_NAME = "duplicate";

/** Composite n-gram score above this is treated as a near-duplicate. */
const NGRAM_DUPLICATE_THRESHOLD = 0.55;
/** Composite n-gram score above this is reviewed via semantic check. */
const NGRAM_SUSPICIOUS_THRESHOLD = 0.30;
/** Cosine similarity above this on top of suspicious n-gram score → duplicate. */
const SEMANTIC_DUPLICATE_THRESHOLD = 0.92;
/** Cosine similarity above this is a paraphrase warning. */
const SEMANTIC_WARN_THRESHOLD = 0.85;
const SHORTLIST_SIZE = 8;

export async function runDuplicateGate(
  item: DraftItem,
  bank: DraftItem[] = [],
  options: { allowEmbeddings?: boolean } = {}
): Promise<GateResult> {
  const startedAt = Date.now();
  const issues: GateIssue[] = [];
  const metrics: Record<string, unknown> = {};

  try {
    if (bank.length === 0) {
      return {
        gate: GATE_NAME,
        verdict: "SKIPPED",
        score: 100,
        durationMs: Date.now() - startedAt,
        issues: [],
        metrics: { reason: "empty-bank" },
      };
    }

    // Build fingerprints
    const draftFp = buildFingerprintFor(item);
    const bankFps = bank
      .filter((b) => b.id && b.id !== item.id)
      .map(buildFingerprintFor);

    if (bankFps.length === 0) {
      return {
        gate: GATE_NAME,
        verdict: "SKIPPED",
        score: 100,
        durationMs: Date.now() - startedAt,
        issues: [],
        metrics: { reason: "no-comparable-bank-items" },
      };
    }

    // 1. n-gram pre-filter
    const ngramReport = checkAgainstBank(draftFp, bankFps);

    metrics.ngramTopMatchScore = ngramReport.topMatch?.compositeScore ?? null;
    metrics.ngramTopMatchId = ngramReport.topMatch?.referenceItemId ?? null;
    metrics.ngramDuplicateCount = ngramReport.duplicates.length;

    // Hard duplicates from n-gram alone — no need to embed
    for (const dup of ngramReport.duplicates) {
      issues.push({
        code: "DUP-NGRAM-01",
        severity: "CRITICAL",
        category: "duplicate.ngram",
        message: `Near-duplicate of item ${dup.referenceItemId} (composite=${dup.compositeScore.toFixed(2)}, matchedOn=${dup.matchedOn.join(",")}).`,
        suggestion: "Reword the stem/options or revise the stimulus text to differentiate.",
        data: { ...dup },
      });
    }

    // 2. Shortlist for semantic check
    const shortlist = [...ngramReport.duplicates, ...ngramReport.suspicious]
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, SHORTLIST_SIZE)
      .filter((s) => s.compositeScore >= NGRAM_SUSPICIOUS_THRESHOLD);

    if (
      options.allowEmbeddings !== false &&
      isEmbeddingAvailable() &&
      shortlist.length > 0
    ) {
      const draftText = flattenItemText(item.content);
      const draftVec = await embedText(draftText, { taskType: "SEMANTIC_SIMILARITY" });
      if (draftVec) {
        const semanticHits: Array<{ id: string; ngram: number; semantic: number }> = [];

        for (const s of shortlist) {
          const refItem = bank.find((b) => b.id === s.referenceItemId);
          if (!refItem) continue;
          const refText = flattenItemText(refItem.content);
          const refVec = await embedText(refText, { taskType: "SEMANTIC_SIMILARITY" });
          if (!refVec) continue;

          const sim = cosine(draftVec, refVec);
          semanticHits.push({ id: refItem.id ?? "?", ngram: s.compositeScore, semantic: sim });

          if (sim >= SEMANTIC_DUPLICATE_THRESHOLD && s.compositeScore < NGRAM_DUPLICATE_THRESHOLD) {
            issues.push({
              code: "DUP-SEM-01",
              severity: "CRITICAL",
              category: "duplicate.semantic",
              message: `Paraphrase duplicate of item ${refItem.id} (cosine=${sim.toFixed(2)}, n-gram=${s.compositeScore.toFixed(2)}).`,
              suggestion: "Replace with an item targeting a different prompt or sub-skill.",
              data: { referenceItemId: refItem.id, semanticSimilarity: sim, ngramComposite: s.compositeScore },
            });
          } else if (sim >= SEMANTIC_WARN_THRESHOLD) {
            issues.push({
              code: "DUP-SEM-02",
              severity: "MAJOR",
              category: "duplicate.semantic",
              message: `Possible paraphrase of item ${refItem.id} (cosine=${sim.toFixed(2)}). Review before publishing.`,
              data: { referenceItemId: refItem.id, semanticSimilarity: sim },
            });
          }
        }

        metrics.semanticHits = semanticHits.map((h) => ({
          id: h.id,
          ngram: Math.round(h.ngram * 1000) / 1000,
          semantic: Math.round(h.semantic * 1000) / 1000,
        }));
        metrics.embeddingsUsed = true;
      } else {
        metrics.embeddingsUsed = false;
      }
    } else {
      metrics.embeddingsUsed = false;
    }

    // Suspicious n-gram with no semantic confirmation → MINOR
    for (const s of ngramReport.suspicious) {
      if (issues.some((i) => i.data && (i.data as { referenceItemId?: string }).referenceItemId === s.referenceItemId)) {
        continue;
      }
      issues.push({
        code: "DUP-NGRAM-02",
        severity: "MINOR",
        category: "duplicate.ngram",
        message: `Possible overlap with item ${s.referenceItemId} (composite=${s.compositeScore.toFixed(2)}).`,
        data: { ...s },
      });
    }

    return finalize(issues, metrics, startedAt, ngramReport.totalCompared);
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

function buildFingerprintFor(item: DraftItem): ItemFingerprint {
  const c = item.content ?? {};
  return buildFingerprint({
    id: item.id ?? `__draft__${cryptoRand()}`,
    stem: String(c.question ?? c.stem ?? c.prompt ?? ""),
    stimulus: String(c.stimulus ?? ""),
    choices: Array.isArray(c.options) ? c.options.map(String) : [],
  });
}

function cryptoRand(): string {
  // Stable-enough random id; we don't need crypto-strong here.
  return Math.random().toString(36).slice(2, 10);
}

function finalize(
  issues: GateIssue[],
  metrics: Record<string, unknown>,
  startedAt: number,
  totalCompared: number
): GateResult {
  const critical = issues.filter((i) => i.severity === "CRITICAL").length;
  const major = issues.filter((i) => i.severity === "MAJOR").length;
  const minor = issues.filter((i) => i.severity === "MINOR").length;
  let score = 100 - critical * 30 - major * 12 - minor * 4;
  score = Math.max(0, score);
  const verdict = critical > 0 ? "FAIL" : major > 0 ? "WARN" : "PASS";
  return {
    gate: GATE_NAME,
    verdict,
    score,
    durationMs: Date.now() - startedAt,
    issues,
    metrics: { ...metrics, totalCompared },
  };
}
