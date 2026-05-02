/**
 * LLM judge — small, focused Gemini calls used by certain validation gates
 * (key-uniqueness, bias-fairness) to ask the model a structured yes/no/score
 * question about a candidate item.
 *
 * Design:
 *  — Always use JSON mode (Type.OBJECT) with a strict response schema
 *  — Low temperature (0.1) for deterministic verdicts
 *  — Single-shot only — gates that need multi-step reasoning should use a
 *    dedicated agent pipeline, not this thin wrapper
 *  — Fail soft: on any error, return null + log; the gate decides whether
 *    "no judge available" is a hard stop or a downgrade-to-WARN
 */

import { GoogleGenAI, Type } from "@google/genai";
import { logger } from "../../observability/logger.js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 25_000;

let cachedClient: GoogleGenAI | null = null;
let clientApiKey: string | null = null;

function getClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (cachedClient && clientApiKey === key) return cachedClient;
  cachedClient = new GoogleGenAI({ apiKey: key });
  clientApiKey = key;
  return cachedClient;
}

export function isJudgeAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export interface JudgeOptions {
  model?: string;
  temperature?: number;
  /** Override default 25s timeout. */
  timeoutMs?: number;
  /** Override system instruction for niche judge tasks. */
  systemInstruction?: string;
}

/**
 * Run a JSON-mode judge call. Returns parsed JSON of type `T` or `null` on
 * any failure (network, API error, parse error, schema mismatch).
 *
 * The provided `responseSchema` MUST be a `Type.OBJECT` schema; primitives
 * are not currently supported by the @google/genai response-schema engine.
 */
export async function runJudge<T>(args: {
  prompt: string;
  responseSchema: Record<string, unknown>;
  options?: JudgeOptions;
}): Promise<T | null> {
  const { prompt, responseSchema, options = {} } = args;
  const client = getClient();
  if (!client) return null;

  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.1;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  try {
    const response = await withTimeout(
      client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature,
          responseMimeType: "application/json",
          responseSchema: responseSchema as never,
          ...(options.systemInstruction
            ? { systemInstruction: options.systemInstruction }
            : {}),
        },
      }),
      timeoutMs,
      `judge ${model}`
    );

    const text = extractText(response);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err: message, model }, "judge call failed");
    return null;
  }
}

// Re-export Type so gates can build schemas without depending on @google/genai directly.
export { Type as JudgeType };

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function extractText(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const r = response as { text?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  if (typeof r.text === "string" && r.text.length > 0) return r.text;
  const parts = r.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const joined = parts.map((p) => p.text ?? "").join("");
    if (joined.length > 0) return joined;
  }
  return null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
