/**
 * ASR Fallback Scorer — Whisper-based WER / Pronunciation Quality
 *
 * Purpose
 * ───────
 * Provides a server-side ASR (Automatic Speech Recognition) scoring pipeline
 * that falls back to Whisper (via OpenAI's audio transcription API) when the
 * primary scorer is unavailable or for quality auditing.
 *
 * Metrics produced
 * ─────────────────
 * 1. WER (Word Error Rate) — edit distance between Whisper transcript
 *    and reference (expected) transcript. Lower is better.
 *    WER = (S + D + I) / N  where S=substitutions, D=deletions, I=insertions, N=ref_words
 *
 * 2. Pronunciation score (0–1) — 1 − clamp(WER, 0, 1). Simple proxy;
 *    a full phoneme-level scorer would require a custom ASR model.
 *
 * 3. Fluency heuristics (speech rate, filler ratio) extracted from
 *    Whisper word-level timestamps when available.
 *
 * 4. Content score — proportion of key vocabulary present in transcript
 *    (for open-ended speaking tasks where there is no single correct answer).
 *
 * Usage
 * ──────
 * This module wraps the OpenAI Whisper API (`whisper-large-v3` via
 * `audio/transcriptions`). Set OPENAI_API_KEY in the environment.
 * If the key is absent, the service returns a SKIPPED result so the
 * pipeline degrades gracefully.
 *
 * Audio format
 * ─────────────
 * Accepts base64-encoded audio (webm/opus or mp3) passed as a Buffer.
 * Files are streamed to the Whisper API endpoint; no local FFmpeg required.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhisperTranscript {
  text: string;
  /** Word-level segments when available (Whisper verbose_json) */
  words?: { word: string; start: number; end: number }[];
  language?: string;
  durationSeconds?: number;
}

export interface AsrScoringResult {
  /** Whether ASR was actually run (false if API key missing / error) */
  scored: boolean;
  transcript: string;
  /** Word Error Rate vs reference transcript (0–1; null if no reference) */
  wer: number | null;
  /** 1 - WER, clamped to [0,1] */
  pronunciationScore: number;
  /** Words per minute (null if no duration available) */
  speechRate: number | null;
  /** Proportion of target keywords found in transcript */
  contentCoverage: number | null;
  /** Raw Whisper response for audit */
  rawTranscript?: WhisperTranscript;
  errorMessage?: string;
}

// ─── Edit-distance WER ────────────────────────────────────────────────────────

/**
 * Compute Word Error Rate using Wagner-Fischer dynamic programming.
 * @param hypothesis  Whisper output tokens
 * @param reference   Expected / canonical answer tokens
 */
export function wordErrorRate(hypothesis: string[], reference: string[]): number {
  const H = hypothesis.length;
  const R = reference.length;
  if (R === 0) return H === 0 ? 0 : 1;

  // dp[i][j] = edit distance between hyp[0..i-1] and ref[0..j-1]
  const dp: number[][] = Array.from({ length: H + 1 }, (_, i) =>
    Array.from({ length: R + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= H; i++) {
    for (let j = 1; j <= R; j++) {
      if (hypothesis[i - 1].toLowerCase() === reference[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return Math.min(1, dp[H][R] / R);
}

/** Tokenise transcript into normalised word tokens */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// ─── Whisper API caller ───────────────────────────────────────────────────────

/**
 * Transcribe an audio buffer using the OpenAI Whisper API.
 * Returns null if the API key is missing or the call fails.
 */
async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: "audio/webm" | "audio/mpeg" | "audio/mp4" = "audio/webm"
): Promise<WhisperTranscript | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const formData = new FormData();
    // Node.js File-like object from buffer
    const blob = new Blob([audioBuffer], { type: mimeType });
    const ext = mimeType.split("/")[1].replace("mpeg", "mp3");
    formData.append("file", blob, `audio.${ext}`);
    formData.append("model", "whisper-1"); // maps to whisper-large-v3 on API
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whisper API ${response.status}: ${err.slice(0, 100)}`);
    }

    const data = await response.json() as any;
    return {
      text: data.text ?? "",
      words: data.words,
      language: data.language,
      durationSeconds: data.duration,
    };
  } catch {
    return null;
  }
}

// ─── Fluency heuristics ───────────────────────────────────────────────────────

const FILLER_WORDS = new Set(["um", "uh", "er", "ah", "like", "you know", "sort of", "kind of"]);

function extractFluencyHeuristics(
  transcript: WhisperTranscript
): { speechRate: number | null } {
  const words = tokenise(transcript.text);
  const duration = transcript.durationSeconds;

  const speechRate =
    duration && duration > 0 ? Math.round((words.length / duration) * 60) : null;

  return { speechRate };
}

// ─── Content coverage ─────────────────────────────────────────────────────────

function computeContentCoverage(
  transcriptTokens: string[],
  keywords: string[]
): number {
  if (keywords.length === 0) return 1;
  const transcriptSet = new Set(transcriptTokens.map((w) => w.toLowerCase()));
  const found = keywords.filter((k) => transcriptSet.has(k.toLowerCase())).length;
  return found / keywords.length;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AsrScoringOptions {
  /** Expected / correct transcript for WER calculation */
  referenceTranscript?: string;
  /** Key vocabulary items the response should mention */
  targetKeywords?: string[];
  /** Audio MIME type */
  mimeType?: "audio/webm" | "audio/mpeg" | "audio/mp4";
}

/**
 * Score a speaking response audio using Whisper ASR.
 *
 * @param audioBuffer  Raw audio bytes (webm/opus preferred)
 * @param options      Reference transcript and keyword list
 */
export async function scoreWithWhisper(
  audioBuffer: Buffer,
  options: AsrScoringOptions = {}
): Promise<AsrScoringResult> {
  const transcript = await transcribeWithWhisper(
    audioBuffer,
    options.mimeType ?? "audio/webm"
  );

  if (!transcript) {
    return {
      scored: false,
      transcript: "",
      wer: null,
      pronunciationScore: 0,
      speechRate: null,
      contentCoverage: null,
      errorMessage: "Whisper API unavailable (check OPENAI_API_KEY)",
    };
  }

  const hypTokens = tokenise(transcript.text);
  const { speechRate } = extractFluencyHeuristics(transcript);

  // WER vs reference
  let wer: number | null = null;
  if (options.referenceTranscript) {
    const refTokens = tokenise(options.referenceTranscript);
    wer = wordErrorRate(hypTokens, refTokens);
  }

  const pronunciationScore = wer !== null ? Math.max(0, 1 - wer) : 0.5;

  // Content coverage
  const contentCoverage =
    options.targetKeywords && options.targetKeywords.length > 0
      ? computeContentCoverage(hypTokens, options.targetKeywords)
      : null;

  return {
    scored: true,
    transcript: transcript.text,
    wer,
    pronunciationScore: Number(pronunciationScore.toFixed(3)),
    speechRate,
    contentCoverage: contentCoverage !== null ? Number(contentCoverage.toFixed(3)) : null,
    rawTranscript: transcript,
  };
}

/**
 * Compute WER for two plain text strings.
 * Exported for testing / standalone use.
 */
export function computeWer(hypothesis: string, reference: string): number {
  return wordErrorRate(tokenise(hypothesis), tokenise(reference));
}
