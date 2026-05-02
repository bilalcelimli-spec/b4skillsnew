/**
 * Embedding service wrapper around @google/genai.
 *
 *  — In-process LRU cache keyed by SHA-256 of the input text + model name
 *    (avoids re-embedding the same answer-keys / distractors during a session)
 *  — Graceful fallback: if no GEMINI_API_KEY, returns null and the caller is
 *    expected to skip embedding-dependent gates rather than crash
 *  — Cosine helpers (`cosine`, `cosineDistance`) included for downstream use
 *
 * The gate orchestrator calls {@link getEmbeddings} once per validation run
 * for every text it needs (stem + each option, etc.) so the LRU caches across
 * gates within the same item review.
 */

import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { logger } from "../../observability/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "gemini-embedding-001";
const CACHE_MAX_ENTRIES = 2048;
const REQUEST_TIMEOUT_MS = 20_000;

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT (lazy singleton)
// ─────────────────────────────────────────────────────────────────────────────

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

export function isEmbeddingAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// ─────────────────────────────────────────────────────────────────────────────
// LRU CACHE
// ─────────────────────────────────────────────────────────────────────────────

const cache = new Map<string, number[]>();

function cacheGet(key: string): number[] | undefined {
  const v = cache.get(key);
  if (!v) return undefined;
  // touch (LRU re-insert)
  cache.delete(key);
  cache.set(key, v);
  return v;
}

function cacheSet(key: string, value: number[]): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function cacheKey(text: string, model: string): string {
  return crypto.createHash("sha256").update(`${model}::${text}`).digest("hex");
}

export function clearEmbeddingCache(): void {
  cache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE API
// ─────────────────────────────────────────────────────────────────────────────

export interface EmbeddingOptions {
  model?: string;
  /** Task type hint sent to the API (improves quality). */
  taskType?:
    | "RETRIEVAL_QUERY"
    | "RETRIEVAL_DOCUMENT"
    | "SEMANTIC_SIMILARITY"
    | "CLASSIFICATION"
    | "CLUSTERING";
  /** If true, throw on API failure instead of returning null. */
  strict?: boolean;
}

/**
 * Embed a single text. Returns the cached vector when available; otherwise
 * calls Gemini. Returns `null` if no API key is set or the call fails (and
 * `strict` is false).
 */
export async function embedText(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[] | null> {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  const model = options.model ?? DEFAULT_MODEL;
  const key = cacheKey(trimmed, model);
  const cached = cacheGet(key);
  if (cached) return cached;

  const client = getClient();
  if (!client) {
    if (options.strict) throw new Error("GEMINI_API_KEY not set — embedding unavailable");
    return null;
  }

  try {
    const response = (await withTimeout(
      // @google/genai supports `models.embedContent`
      client.models.embedContent({
        model,
        contents: [{ parts: [{ text: trimmed }] }],
        ...(options.taskType ? { config: { taskType: options.taskType } } : {}),
      }),
      REQUEST_TIMEOUT_MS,
      `embedContent ${model}`
    )) as { embeddings?: Array<{ values?: number[] }> } | { embedding?: { values?: number[] } };

    // SDK shape varies; try both
    const vec = extractVector(response);
    if (!vec || vec.length === 0) {
      throw new Error("empty embedding vector returned");
    }
    cacheSet(key, vec);
    return vec;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err: message, model, len: trimmed.length }, "embedText failed");
    if (options.strict) throw err;
    return null;
  }
}

/**
 * Embed multiple texts in parallel. Texts that fail individually become `null`
 * entries in the returned array (positional alignment is preserved).
 */
export async function embedBatch(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<Array<number[] | null>> {
  return Promise.all(texts.map((t) => embedText(t, options)));
}

// ─────────────────────────────────────────────────────────────────────────────
// VECTOR MATH
// ─────────────────────────────────────────────────────────────────────────────

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 1 - cosine similarity, clamped to [0, 2]. */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosine(a, b);
}

/**
 * Mean of a list of vectors. Useful for collapsing a multi-sentence stimulus
 * into a single representation.
 */
export function meanVector(vectors: number[][]): number[] | null {
  const valid = vectors.filter(Array.isArray);
  if (valid.length === 0) return null;
  const dim = valid[0].length;
  const out = new Array(dim).fill(0);
  for (const v of valid) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) out[i] += v[i];
  }
  for (let i = 0; i < dim; i++) out[i] /= valid.length;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function extractVector(response: unknown): number[] | null {
  if (!response || typeof response !== "object") return null;
  const r = response as Record<string, unknown>;
  // shape A: { embeddings: [{ values: [...] }] }
  if (Array.isArray(r.embeddings) && r.embeddings.length > 0) {
    const first = r.embeddings[0] as { values?: number[] };
    if (Array.isArray(first?.values)) return first.values;
  }
  // shape B: { embedding: { values: [...] } }
  const emb = r.embedding as { values?: number[] } | undefined;
  if (emb && Array.isArray(emb.values)) return emb.values;
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
