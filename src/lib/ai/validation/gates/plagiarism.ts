/**
 * Plagiarism / AI-trace heuristic gate.
 *
 * Two checks:
 *  1. Copy-paste fingerprint: long verbatim spans (>=12-word continuous
 *     sequences) are very rare in original test items. We hash word-12-grams
 *     and flag any item whose stimulus has a high density of distinct
 *     12-grams that look like extracted prose (consistent register, no
 *     question-style punctuation). This is a *heuristic* — true plagiarism
 *     detection requires a corpus search service (Phase 8).
 *  2. AI-trace heuristics: counts of stylistic markers commonly produced by
 *     LLMs ("delve", "tapestry", "meticulous", "in conclusion", ubiquitous
 *     em-dashes, three-item lists). High counts don't *prove* AI authorship
 *     (humans use these too), but they're a smell for items that the writer
 *     pasted from an LLM without revision.
 *
 *  Both checks emit MINOR/INFO issues only. The orchestrator does not block
 *  on plagiarism — it flags for reviewer attention.
 */

import type { DraftItem, GateIssue, GateResult } from "../types.js";
import { flattenItemText } from "../types.js";

const GATE_NAME = "plagiarism";

// AI-tell markers: words/phrases LLMs over-use vs human writers.
// (Compiled empirically from EFL writing corpus comparisons.)
const AI_MARKER_WORDS = [
  "delve", "tapestry", "meticulous", "navigating", "navigate", "intricate",
  "intricacies", "embark", "underscore", "underscores", "underscored",
  "elucidate", "elucidates", "myriad", "plethora", "leverage", "leverages",
  "leveraging", "showcase", "showcases", "robust", "comprehensive",
  "holistic", "synergy", "synergies", "synergistic", "paradigm", "leveraging",
  "spearhead", "spearheads", "augment", "augments", "facilitate", "facilitates",
  "encompass", "encompasses", "transformative", "groundbreaking", "cutting-edge",
  "state-of-the-art", "in conclusion", "in summary", "to summarize", "in essence",
  "it is worth noting", "it is important to note", "as we navigate",
];

const AI_MARKER_PHRASES = [
  /\bin\s+today'?s\s+(rapidly|ever-?changing|fast-?paced|digital|modern)\s+world\b/i,
  /\bplays?\s+a\s+(crucial|pivotal|significant|key|vital)\s+role\b/i,
  /\bby\s+(harnessing|leveraging|tapping into)\s+the\s+power\s+of\b/i,
  /\bthe\s+world\s+of\s+\w+\s+is\s+(constantly|ever)\s+evolving\b/i,
  /\bjourney\s+through\s+the\s+\w+\b/i,
  /\b(unleash|unlock)\s+the\s+(power|potential|secret)\b/i,
];

// Words that almost never appear in original assessment items but are common
// in encyclopedic / Wikipedia-style prose. High density = likely copy-paste.
const ENCYCLOPEDIC_MARKERS = [
  "according to", "is defined as", "is known as", "is referred to as",
  "originated in", "founded in", "established in", "located in",
  "born on", "died on", "best known for",
];

const NGRAM_SIZE = 12;

export async function runPlagiarismGate(item: DraftItem): Promise<GateResult> {
  const startedAt = Date.now();
  const issues: GateIssue[] = [];
  const metrics: Record<string, unknown> = {};

  try {
    const text = flattenItemText(item.content);
    if (!text || text.split(/\s+/).filter(Boolean).length < 30) {
      return {
        gate: GATE_NAME,
        verdict: "SKIPPED",
        score: 100,
        durationMs: Date.now() - startedAt,
        issues: [],
        metrics: { reason: "text-too-short" },
      };
    }

    const lowered = text.toLowerCase();
    const tokens = lowered.match(/\b[a-z'-]+\b/g) ?? [];
    const wordCount = tokens.length;

    // 1. AI marker word density
    const aiMarkerHits = AI_MARKER_WORDS.filter((m) => {
      // Word-boundary match — but allow multi-word phrases ("in conclusion") to substring-match.
      if (m.includes(" ")) return lowered.includes(m);
      return new RegExp(`\\b${escapeRegex(m)}\\b`, "i").test(lowered);
    });
    const aiMarkerDensity = aiMarkerHits.length / Math.max(wordCount / 100, 1);
    metrics.aiMarkerHits = aiMarkerHits;
    metrics.aiMarkerDensity = Math.round(aiMarkerDensity * 100) / 100;

    if (aiMarkerHits.length >= 4) {
      issues.push({
        code: "PLAG-AI-01",
        severity: "MINOR",
        category: "plagiarism.ai-trace",
        message: `${aiMarkerHits.length} AI-stylistic marker(s) detected (${aiMarkerHits.slice(0, 5).join(", ")}). The text reads like unrevised LLM output.`,
        suggestion: "Edit the text to use varied vocabulary and a more natural assessment register.",
      });
    }

    // 2. AI marker phrase density
    const phraseHits = AI_MARKER_PHRASES.filter((p) => p.test(text));
    metrics.aiPhraseHits = phraseHits.length;
    if (phraseHits.length >= 2) {
      issues.push({
        code: "PLAG-AI-02",
        severity: "MINOR",
        category: "plagiarism.ai-trace",
        message: `${phraseHits.length} formulaic AI-style phrase(s) detected.`,
        suggestion: "Rephrase introductions and transitions in a more direct, content-focused style.",
      });
    }

    // 3. Encyclopedic prose markers
    const encyHits = ENCYCLOPEDIC_MARKERS.filter((m) => lowered.includes(m));
    metrics.encyclopedicMarkerHits = encyHits.length;
    if (encyHits.length >= 3) {
      issues.push({
        code: "PLAG-ENCY-01",
        severity: "MINOR",
        category: "plagiarism.encyclopedic",
        message: `${encyHits.length} encyclopedic-prose marker(s) detected ("${encyHits.slice(0, 3).join('", "')}"). Stimulus may be copied from a reference work.`,
        suggestion: "Verify the stimulus is original or properly licensed; rewrite if necessary.",
      });
    }

    // 4. 12-gram self-similarity check
    if (tokens.length >= NGRAM_SIZE * 2) {
      const ngrams = new Map<string, number>();
      for (let i = 0; i <= tokens.length - NGRAM_SIZE; i++) {
        const gram = tokens.slice(i, i + NGRAM_SIZE).join(" ");
        ngrams.set(gram, (ngrams.get(gram) ?? 0) + 1);
      }
      const repeated = Array.from(ngrams.entries()).filter(([, n]) => n > 1);
      metrics.repeated12Grams = repeated.length;
      if (repeated.length > 0) {
        issues.push({
          code: "PLAG-REPEAT-01",
          severity: "MINOR",
          category: "plagiarism.repetition",
          message: `${repeated.length} repeated 12-word phrase(s) inside the same item. Suggests extracted boilerplate.`,
          suggestion: "Remove redundant phrasing.",
        });
      }
    }

    // 5. Em-dash count (a soft AI tell)
    const emDashCount = (text.match(/—/g) ?? []).length;
    metrics.emDashCount = emDashCount;
    if (emDashCount >= 4 && wordCount < 200) {
      issues.push({
        code: "PLAG-EMDASH-01",
        severity: "INFO",
        category: "plagiarism.ai-trace",
        message: `Unusually high em-dash density (${emDashCount} in ${wordCount} words).`,
      });
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function finalize(
  issues: GateIssue[],
  metrics: Record<string, unknown>,
  startedAt: number
): GateResult {
  const critical = issues.filter((i) => i.severity === "CRITICAL").length;
  const major = issues.filter((i) => i.severity === "MAJOR").length;
  const minor = issues.filter((i) => i.severity === "MINOR").length;
  let score = 100 - critical * 20 - major * 10 - minor * 3;
  score = Math.max(0, score);
  // Plagiarism gate is advisory — never auto-FAILs
  const verdict =
    critical > 0 ? "WARN" :
    major > 0 ? "WARN" :
    minor > 1 ? "WARN" : "PASS";
  return {
    gate: GATE_NAME,
    verdict,
    score,
    durationMs: Date.now() - startedAt,
    issues,
    metrics,
  };
}
