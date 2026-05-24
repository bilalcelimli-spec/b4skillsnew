/**
 * Whisper Speech Pipeline
 * ─────────────────────────────────────────────────────────────────────────────
 * End-to-end pipeline for CEFR speaking assessment:
 *
 *   1. Receive audio blob / base64 from client
 *   2. Transcribe via OpenAI Whisper (whisper-1)
 *   3. Run CEFR grammar, vocabulary, fluency scoring via GPT-4o
 *   4. Return structured SpeakingResult
 *
 * Audio formats supported: webm, mp4, ogg, wav, m4a (Whisper accepts all)
 * Max file size: 25 MB (OpenAI limit)
 */

import OpenAI, { toFile } from "openai";

// ── Types ────────────────────────────────────────────────────────────────────

export interface WhisperTranscript {
  text: string;
  language: string;
  duration: number; // seconds
  segments?: Array<{ start: number; end: number; text: string }>;
}

export interface CEFRSpeakingDimension {
  dimension: "grammar" | "vocabulary" | "fluency" | "coherence" | "pronunciation";
  score: number;       // 0.0 – 1.0
  cefrBand: string;    // A1–C2
  feedback: string;
}

export interface SpeakingResult {
  transcript: string;
  language: string;
  durationSeconds: number;
  overallCefrLevel: string;
  overallScore: number;          // 0.0 – 1.0
  dimensions: CEFRSpeakingDimension[];
  strengths: string[];
  improvements: string[];
  wordCount: number;
  speakingRate: number;          // words per minute
  processingMs: number;
}

export interface PipelineOptions {
  /** Target language for scoring (default: "english") */
  targetLanguage?: string;
  /** Prompt shown to candidate (for relevance scoring) */
  prompt?: string;
  /** Return Whisper verbose_json with timestamps */
  includeTimestamps?: boolean;
}

// ── CEFR band helper ─────────────────────────────────────────────────────────

function scoreToCefr(score: number): string {
  if (score >= 0.90) return "C2";
  if (score >= 0.78) return "C1";
  if (score >= 0.64) return "B2";
  if (score >= 0.50) return "B1";
  if (score >= 0.35) return "A2";
  return "A1";
}

// ── Scoring prompt ────────────────────────────────────────────────────────────

function buildScoringPrompt(transcript: string, prompt: string, durationSec: number): string {
  return `You are an expert CEFR English language assessor. Evaluate this spoken English transcript.

ORIGINAL TASK PROMPT: "${prompt}"
TRANSCRIPT: "${transcript}"
APPROXIMATE DURATION: ${durationSec.toFixed(1)}s

Rate the following dimensions on a scale of 0.0–1.0 (where 1.0 = C2 native-like) and provide a CEFR band for each.

Respond ONLY with valid JSON matching this schema:
{
  "dimensions": [
    { "dimension": "grammar",       "score": 0.0, "cefrBand": "A1", "feedback": "..." },
    { "dimension": "vocabulary",    "score": 0.0, "cefrBand": "A1", "feedback": "..." },
    { "dimension": "fluency",       "score": 0.0, "cefrBand": "A1", "feedback": "..." },
    { "dimension": "coherence",     "score": 0.0, "cefrBand": "A1", "feedback": "..." },
    { "dimension": "pronunciation", "score": 0.0, "cefrBand": "A1", "feedback": "..." }
  ],
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}`;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export async function runWhisperPipeline(
  audioBuffer: Buffer,
  filename: string,
  options: PipelineOptions = {}
): Promise<SpeakingResult> {
  const { targetLanguage = "english", prompt = "Speak about the given topic", includeTimestamps = false } = options;
  const t0 = Date.now();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  if (audioBuffer.length > 25 * 1024 * 1024) {
    throw new Error("Audio file exceeds 25 MB Whisper limit");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ── Step 1: Transcription ──────────────────────────────────────────────────

  const audioFile = await toFile(audioBuffer, filename, { type: "audio/webm" });

  let transcription: any;
  if (includeTimestamps) {
    transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      language: targetLanguage === "english" ? "en" : undefined,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });
  } else {
    transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      language: targetLanguage === "english" ? "en" : undefined,
      response_format: "verbose_json",
    });
  }

  const rawText: string = transcription.text ?? "";
  const duration: number = transcription.duration ?? 0;
  const language: string = transcription.language ?? "en";
  const segments = transcription.segments ?? [];

  // ── Step 2: Speaking rate ──────────────────────────────────────────────────

  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const speakingRate = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

  // ── Step 3: CEFR scoring via GPT-4o ───────────────────────────────────────

  let dimensions: CEFRSpeakingDimension[] = [];
  let strengths: string[] = [];
  let improvements: string[] = [];

  if (rawText.trim().length > 10) {
    const scoringPrompt = buildScoringPrompt(rawText, prompt, duration);

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: scoringPrompt }],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(gptResponse.choices[0].message.content ?? "{}");
    dimensions = parsed.dimensions ?? [];
    strengths = parsed.strengths ?? [];
    improvements = parsed.improvements ?? [];
  } else {
    // Insufficient speech — all A1
    dimensions = (["grammar", "vocabulary", "fluency", "coherence", "pronunciation"] as const).map((d) => ({
      dimension: d,
      score: 0.1,
      cefrBand: "A1",
      feedback: "Insufficient speech detected",
    }));
  }

  // ── Step 4: Aggregate overall score ───────────────────────────────────────

  const dimensionWeights: Record<string, number> = {
    grammar: 0.25,
    vocabulary: 0.25,
    fluency: 0.20,
    coherence: 0.15,
    pronunciation: 0.15,
  };

  const overallScore =
    dimensions.reduce((sum, d) => sum + d.score * (dimensionWeights[d.dimension] ?? 0.2), 0);
  const overallCefrLevel = scoreToCefr(overallScore);

  return {
    transcript: rawText,
    language,
    durationSeconds: duration,
    overallCefrLevel,
    overallScore: Math.round(overallScore * 1000) / 1000,
    dimensions,
    strengths,
    improvements,
    wordCount,
    speakingRate,
    processingMs: Date.now() - t0,
  };
}

// ── Convenience: score from base64 ────────────────────────────────────────────

export async function runWhisperPipelineFromBase64(
  base64Audio: string,
  filename: string,
  options: PipelineOptions = {}
): Promise<SpeakingResult> {
  const buffer = Buffer.from(base64Audio, "base64");
  return runWhisperPipeline(buffer, filename, options);
}
