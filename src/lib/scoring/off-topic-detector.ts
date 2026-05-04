/**
 * Off-Topic Detector — Embedding-based relevance scoring
 *
 * Purpose
 * ───────
 * Detects whether a candidate's free-text or transcript response is
 * on-topic relative to the assessment prompt using OpenAI text embeddings
 * and cosine similarity. Optionally stores embeddings in a pgvector-backed
 * Prisma column for fast nearest-neighbour retrieval.
 *
 * Algorithm
 * ──────────
 * 1. Generate embedding for the prompt (or use cached version from item.metadata).
 * 2. Generate embedding for the candidate response.
 * 3. Compute cosine similarity ∈ [−1, 1] → normalised to [0, 1].
 * 4. Classify:
 *    - RELEVANT     sim ≥ 0.70
 *    - BORDERLINE   sim ∈ [0.50, 0.70)
 *    - OFF_TOPIC    sim < 0.50
 *
 * Fallback
 * ────────
 * If OPENAI_API_KEY is absent, falls back to lexical overlap (Jaccard on
 * unigrams) so the pipeline never hard-fails.
 *
 * References
 * ──────────
 * Nils Reimers & Iryna Gurevych — Sentence-BERT (2019)
 * OpenAI — text-embedding-3-small model card
 */

import { prisma } from "../prisma.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RelevanceLabel = "RELEVANT" | "BORDERLINE" | "OFF_TOPIC";

export interface OffTopicResult {
  similarity: number;
  label: RelevanceLabel;
  method: "embedding" | "lexical";
  promptItemId?: string;
  skipped: boolean;
  skippedReason?: string;
}

export interface DetectorOptions {
  /** Item ID whose content serves as the prompt. Prompt embedding is cached. */
  promptItemId?: string;
  /** Raw prompt text (used when promptItemId not available). */
  promptText?: string;
  /** Embedding model. Defaults to text-embedding-3-small. */
  model?: string;
  /** Force lexical fallback even if key present (for testing). */
  forceLexical?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMBED_MODEL = "text-embedding-3-small";
const RELEVANT_THRESHOLD = 0.70;
const BORDERLINE_THRESHOLD = 0.50;

// ─── Embedding helpers ────────────────────────────────────────────────────────

async function embed(text: string, model: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text.slice(0, 8192) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Normalise cosine similarity from [−1, 1] → [0, 1] */
function normCosine(sim: number): number {
  return (sim + 1) / 2;
}

// ─── Lexical fallback ─────────────────────────────────────────────────────────

function tokenise(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const w of a) { if (b.has(w)) intersection++; }
  return intersection / (a.size + b.size - intersection);
}

// ─── Prompt embedding cache ───────────────────────────────────────────────────

/**
 * Get (or lazily compute + cache) the embedding for an item's content.
 * Stored in item.metadata.promptEmbedding as a number array.
 */
async function getPromptEmbedding(
  itemId: string,
  model: string
): Promise<number[] | null> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { content: true, metadata: true },
  });
  if (!item) return null;

  // Check cache
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  if (Array.isArray(meta.promptEmbedding)) {
    return meta.promptEmbedding as number[];
  }

  // Compute and cache
  const contentText = typeof item.content === "string"
    ? item.content
    : JSON.stringify(item.content);
  const vec = await embed(contentText, model);
  const updatedMeta = { ...meta, promptEmbedding: vec };
  await prisma.item.update({
    where: { id: itemId },
    data: { metadata: updatedMeta as unknown as import("@prisma/client").Prisma.InputJsonValue },
  });

  return vec;
}

// ─── Main detector ────────────────────────────────────────────────────────────

/**
 * Score whether a candidate response is on-topic relative to a prompt.
 *
 * @param responseText  The candidate's typed or ASR-transcribed response.
 * @param opts          Detector options (see DetectorOptions).
 */
export async function detectOffTopic(
  responseText: string,
  opts: DetectorOptions = {}
): Promise<OffTopicResult> {
  const model = opts.model ?? EMBED_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;
  const useLexical = opts.forceLexical || !apiKey;

  // ─── Lexical fallback ──────────────────────────────────────────────────────
  if (useLexical) {
    const promptText = opts.promptText ?? "";
    const sim = jaccardSimilarity(tokenise(promptText), tokenise(responseText));
    return {
      similarity: sim,
      label: classifyLabel(sim),
      method: "lexical",
      promptItemId: opts.promptItemId,
      skipped: false,
    };
  }

  // ─── Embedding-based scoring ───────────────────────────────────────────────
  try {
    // Obtain prompt embedding
    let promptVec: number[];
    if (opts.promptItemId) {
      const cached = await getPromptEmbedding(opts.promptItemId, model);
      if (!cached) {
        return {
          similarity: 0,
          label: "OFF_TOPIC",
          method: "embedding",
          promptItemId: opts.promptItemId,
          skipped: true,
          skippedReason: `Item ${opts.promptItemId} not found`,
        };
      }
      promptVec = cached;
    } else if (opts.promptText) {
      promptVec = await embed(opts.promptText, model);
    } else {
      return {
        similarity: 0,
        label: "OFF_TOPIC",
        method: "embedding",
        skipped: true,
        skippedReason: "No prompt provided (set promptItemId or promptText)",
      };
    }

    const responseVec = await embed(responseText, model);
    const rawSim = cosineSimilarity(promptVec, responseVec);
    const sim = normCosine(rawSim);

    return {
      similarity: sim,
      label: classifyLabel(sim),
      method: "embedding",
      promptItemId: opts.promptItemId,
      skipped: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Graceful degrade to lexical
    const promptText = opts.promptText ?? "";
    const sim = jaccardSimilarity(tokenise(promptText), tokenise(responseText));
    return {
      similarity: sim,
      label: classifyLabel(sim),
      method: "lexical",
      promptItemId: opts.promptItemId,
      skipped: false,
      skippedReason: `Embedding error (fell back to lexical): ${msg}`,
    };
  }
}

function classifyLabel(sim: number): RelevanceLabel {
  if (sim >= RELEVANT_THRESHOLD)   return "RELEVANT";
  if (sim >= BORDERLINE_THRESHOLD) return "BORDERLINE";
  return "OFF_TOPIC";
}

// ─── Batch endpoint helper ────────────────────────────────────────────────────

export interface BatchOffTopicEntry {
  sessionId: string;
  itemId: string;
  responseText: string;
}

export interface BatchOffTopicResult {
  sessionId: string;
  itemId: string;
  result: OffTopicResult;
}

/**
 * Check off-topic relevance for a batch of responses in parallel (max 5 at a time).
 */
export async function batchDetectOffTopic(
  entries: BatchOffTopicEntry[],
  opts: Pick<DetectorOptions, "model" | "forceLexical"> = {}
): Promise<BatchOffTopicResult[]> {
  const CONCURRENCY = 5;
  const results: BatchOffTopicResult[] = [];

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (entry) => {
        const result = await detectOffTopic(entry.responseText, {
          promptItemId: entry.itemId,
          model: opts.model,
          forceLexical: opts.forceLexical,
        });
        return { sessionId: entry.sessionId, itemId: entry.itemId, result };
      })
    );
    results.push(...chunkResults);
  }

  return results;
}
