/**
 * Response Integrity Guard
 *
 * A pre-scoring layer that screens candidate Writing/Speaking responses for
 * adversarial or non-substantive patterns BEFORE they reach the AI scoring
 * pipeline. The goal is to prevent inflated scores on responses that game
 * the rubric (prompt injection, memorised templates, parroted prompts) or
 * fall below minimum viability (empty/too-short/silent submissions).
 *
 * Each detector returns a flag and a numeric severity (0..1). The aggregate
 * `assessIntegrity()` function returns the union of all flags — the calling
 * orchestrator decides whether to (a) skip AI scoring, (b) cap the score,
 * or (c) route to human review.
 *
 * Detectors are PURE and DETERMINISTIC: no network calls, no model calls,
 * no randomness. Embedding-based off-topic detection is intentionally NOT
 * here — it requires an external API and lives in a separate module so the
 * core guard can run synchronously, on every response, with zero cost.
 */

export type IntegrityFlag =
  | "EMPTY_RESPONSE"
  | "BELOW_MIN_LENGTH"
  | "EXCESSIVE_REPETITION"
  | "PROMPT_PARROTING"
  | "PROMPT_INJECTION"
  | "TEMPLATE_PATTERN"
  | "LOW_LEXICAL_DIVERSITY"
  | "SUSPICIOUS_FORMATTING"
  | "AUDIO_TOO_SHORT"
  | "AUDIO_MOSTLY_SILENT";

export interface IntegrityIssue {
  flag: IntegrityFlag;
  /** 0..1 — how strongly the pattern was detected. Higher = more confident. */
  severity: number;
  /** Short human-readable explanation for audit logs and reviewer UI. */
  detail: string;
}

export interface IntegrityReport {
  passed: boolean;
  issues: IntegrityIssue[];
  /** Aggregate severity of the worst issue (0..1). */
  topSeverity: number;
  /**
   * Recommendation for the orchestrator:
   *  - "score"  : run AI scoring normally
   *  - "review" : run AI scoring but force human review
   *  - "reject" : skip AI scoring, return zero score, mark INVALID
   */
  recommendation: "score" | "review" | "reject";
}

export interface WritingIntegrityInput {
  text: string;
  prompt: string;
  minWordCount?: number; // Default: 30
}

export interface SpeakingIntegrityInput {
  /** Transcript of the spoken response (post-ASR). */
  transcript: string;
  prompt: string;
  /** Total audio duration in seconds (from recorder). */
  audioDurationSec?: number;
  /** Estimated total silence in seconds (from VAD or speakingFeatures.pauseDuration). */
  silentDurationSec?: number;
  minWordCount?: number; // Default: 25
  minDurationSec?: number; // Default: 15
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokenisation & utilities
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions?|prompts?|rules?)\b/i,
  /\bdisregard\s+(?:the\s+)?(?:rubric|instructions?|system\s+prompt)\b/i,
  /\bact\s+as\s+(?:a\s+)?(?:cefr|c2|c1|certified)\s+(?:examiner|grader|scorer)\b/i,
  /\bgive\s+me\s+(?:a\s+)?(?:c2|c1|maximum|perfect|full)\s+score\b/i,
  /\boutput\s+(?:json|the\s+score)\s*:\s*\{/i,
  /\b(?:system|assistant|user)\s*:\s*you\s+(?:are|must|should)\b/i,
  /\b<\s*(?:system|sys|prompt)\s*>/i,
  /\bsudo\s+(?:override|bypass)\b/i,
];

const TEMPLATE_PATTERNS: RegExp[] = [
  /\bin\s+conclusion\s*,?\s+(?:to\s+sum\s+up|in\s+summary)\b/i,
  /\b(?:firstly|first\s+of\s+all)\s*,\s*(?:secondly|then)\s*,\s*(?:thirdly|finally)\b/i,
  /\bthis\s+is\s+a\s+(?:test|sample|template)\s+(?:answer|response|essay)\b/i,
];

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function ngrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

/**
 * Repetition rate: ratio of repeated 3-grams. 0 = all unique, 1 = fully repetitive.
 * Robust against short-text noise via length floor.
 */
export function repetitionRate(text: string): number {
  const tokens = tokenise(text);
  if (tokens.length < 6) return 0;
  const tris = ngrams(tokens, 3);
  if (tris.length === 0) return 0;
  const unique = new Set(tris);
  return 1 - unique.size / tris.length;
}

/**
 * Lexical diversity: type/token ratio (TTR). Penalised slightly for short texts
 * (TTR is artificially high on small samples, so we use a Herdan-style log
 * normalisation to make it comparable across lengths).
 */
export function lexicalDiversity(text: string): number {
  const tokens = tokenise(text);
  if (tokens.length === 0) return 0;
  const types = new Set(tokens).size;
  if (tokens.length < 10) return types / tokens.length;
  // Herdan's C: log(types) / log(tokens) — approximates TTR but length-stable
  return Math.log(types) / Math.log(tokens.length);
}

/**
 * Prompt-parrot rate: how much of the candidate's text is verbatim copied
 * from the prompt. Computed as the fraction of candidate 4-grams that
 * appear in the prompt 4-grams.
 */
export function promptParrotRate(text: string, prompt: string): number {
  const candTokens = tokenise(text);
  const promptTokens = tokenise(prompt);
  if (candTokens.length < 8 || promptTokens.length < 4) return 0;

  const candGrams = ngrams(candTokens, 4);
  if (candGrams.length === 0) return 0;
  const promptGramSet = new Set(ngrams(promptTokens, 4));

  let copied = 0;
  for (const g of candGrams) if (promptGramSet.has(g)) copied++;
  return copied / candGrams.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detectors
// ─────────────────────────────────────────────────────────────────────────────

function checkLength(
  text: string,
  minWords: number
): IntegrityIssue | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {
      flag: "EMPTY_RESPONSE",
      severity: 1,
      detail: "Response is empty.",
    };
  }
  const wordCount = tokenise(trimmed).length;
  if (wordCount < minWords) {
    return {
      flag: "BELOW_MIN_LENGTH",
      severity: Math.min(1, (minWords - wordCount) / minWords),
      detail: `Word count ${wordCount} below minimum ${minWords}.`,
    };
  }
  return null;
}

function checkRepetition(text: string): IntegrityIssue | null {
  const rate = repetitionRate(text);
  // Authentic essays sit around 0.05–0.20. Above 0.40 is essentially copy-paste loops.
  if (rate > 0.40) {
    return {
      flag: "EXCESSIVE_REPETITION",
      severity: Math.min(1, (rate - 0.40) / 0.5),
      detail: `Trigram repetition rate ${rate.toFixed(2)} exceeds 0.40 threshold.`,
    };
  }
  return null;
}

function checkLexicalDiversity(text: string): IntegrityIssue | null {
  const tokens = tokenise(text);
  if (tokens.length < 30) return null; // Diversity unstable on very short texts
  const c = lexicalDiversity(text);
  // Herdan C below 0.55 on 30+ tokens indicates a small recycled vocabulary
  if (c < 0.55) {
    return {
      flag: "LOW_LEXICAL_DIVERSITY",
      severity: Math.min(1, (0.55 - c) / 0.3),
      detail: `Herdan C ${c.toFixed(2)} indicates very narrow vocabulary use.`,
    };
  }
  return null;
}

function checkPromptParrot(text: string, prompt: string): IntegrityIssue | null {
  const rate = promptParrotRate(text, prompt);
  if (rate > 0.40) {
    return {
      flag: "PROMPT_PARROTING",
      severity: Math.min(1, (rate - 0.40) / 0.5),
      detail: `${(rate * 100).toFixed(0)}% of candidate 4-grams copied verbatim from the prompt.`,
    };
  }
  return null;
}

function checkPromptInjection(text: string): IntegrityIssue | null {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        flag: "PROMPT_INJECTION",
        severity: 1,
        detail: `Detected prompt-injection pattern: ${pattern.source}`,
      };
    }
  }
  return null;
}

function checkTemplate(text: string): IntegrityIssue | null {
  let hits = 0;
  for (const pattern of TEMPLATE_PATTERNS) {
    if (pattern.test(text)) hits++;
  }
  if (hits >= 2) {
    return {
      flag: "TEMPLATE_PATTERN",
      severity: Math.min(1, hits / TEMPLATE_PATTERNS.length),
      detail: `${hits} canned template phrases detected.`,
    };
  }
  return null;
}

function checkSuspiciousFormatting(text: string): IntegrityIssue | null {
  // Markdown / code fence / JSON blob in the candidate's body — a strong
  // signal that the candidate is feeding output back to a parser.
  if (/```(?:json|javascript|python)?[\s\S]+```/.test(text)) {
    return {
      flag: "SUSPICIOUS_FORMATTING",
      severity: 0.8,
      detail: "Code fence detected in response body.",
    };
  }
  if (/^\s*\{[\s\S]*"score"\s*:/.test(text)) {
    return {
      flag: "SUSPICIOUS_FORMATTING",
      severity: 1,
      detail: "Response opens with a JSON literal containing a score field.",
    };
  }
  return null;
}

function checkAudio(
  audioDurationSec: number | undefined,
  silentDurationSec: number | undefined,
  minDurationSec: number
): IntegrityIssue | null {
  if (audioDurationSec === undefined) return null;
  if (audioDurationSec < minDurationSec) {
    return {
      flag: "AUDIO_TOO_SHORT",
      severity: Math.min(1, (minDurationSec - audioDurationSec) / minDurationSec),
      detail: `Audio duration ${audioDurationSec.toFixed(1)}s below minimum ${minDurationSec}s.`,
    };
  }
  if (silentDurationSec !== undefined && audioDurationSec > 0) {
    const silentRatio = silentDurationSec / audioDurationSec;
    if (silentRatio > 0.6) {
      return {
        flag: "AUDIO_MOSTLY_SILENT",
        severity: Math.min(1, (silentRatio - 0.6) / 0.4),
        detail: `${(silentRatio * 100).toFixed(0)}% of audio is silence.`,
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Severity-weighted recommendation:
 *  - any "reject"-class flag (empty / injection / formatting score-leak) → reject
 *  - any non-zero issue otherwise                                       → review
 *  - clean                                                              → score
 */
function buildRecommendation(issues: IntegrityIssue[]): "score" | "review" | "reject" {
  if (issues.length === 0) return "score";
  for (const issue of issues) {
    if (
      issue.flag === "EMPTY_RESPONSE" ||
      issue.flag === "PROMPT_INJECTION" ||
      (issue.flag === "SUSPICIOUS_FORMATTING" && issue.severity >= 1)
    ) {
      return "reject";
    }
  }
  return "review";
}

export function assessWritingIntegrity(input: WritingIntegrityInput): IntegrityReport {
  const minWords = input.minWordCount ?? 30;
  const issues: IntegrityIssue[] = [];

  for (const issue of [
    checkLength(input.text, minWords),
    checkPromptInjection(input.text),
    checkSuspiciousFormatting(input.text),
    checkRepetition(input.text),
    checkLexicalDiversity(input.text),
    checkPromptParrot(input.text, input.prompt),
    checkTemplate(input.text),
  ]) {
    if (issue) issues.push(issue);
  }

  const topSeverity = issues.reduce((m, i) => Math.max(m, i.severity), 0);
  return {
    passed: issues.length === 0,
    issues,
    topSeverity,
    recommendation: buildRecommendation(issues),
  };
}

export function assessSpeakingIntegrity(input: SpeakingIntegrityInput): IntegrityReport {
  const minWords = input.minWordCount ?? 25;
  const minDuration = input.minDurationSec ?? 15;
  const issues: IntegrityIssue[] = [];

  for (const issue of [
    checkLength(input.transcript, minWords),
    checkPromptInjection(input.transcript),
    checkSuspiciousFormatting(input.transcript),
    checkRepetition(input.transcript),
    checkLexicalDiversity(input.transcript),
    checkPromptParrot(input.transcript, input.prompt),
    checkAudio(input.audioDurationSec, input.silentDurationSec, minDuration),
  ]) {
    if (issue) issues.push(issue);
  }

  const topSeverity = issues.reduce((m, i) => Math.max(m, i.severity), 0);
  return {
    passed: issues.length === 0,
    issues,
    topSeverity,
    recommendation: buildRecommendation(issues),
  };
}
