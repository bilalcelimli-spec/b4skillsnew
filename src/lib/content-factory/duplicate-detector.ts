/**
 * Semantic Duplicate Detector
 * §195 (master prompt): before committing any AI draft to the DB, screen it
 * for near-clone similarity against existing items in the same blueprint cell
 * (CEFR × Skill × Subskill).
 *
 * Implementation:
 *  1. Extract a canonical fingerprint from the item (question stem + answer key).
 *  2. Call Gemini text-embedding-004 (768-dim) to embed it — server-side only.
 *  3. Load existing embeddings for items in the same CEFR × Skill cell from DB.
 *  4. Compute cosine similarity.  threshold: 0.92 → duplicate, 0.85-0.92 → near-match warning.
 *  5. Store the new embedding on the saved item so future runs can compare against it.
 *
 * At Phase 1 scale (< 2 000 items per cell) JS-side cosine is fine.
 * Upgrade path: pgvector + IVFFlat index when cell sizes exceed ~10 000.
 */

import { GoogleGenAI } from "@google/genai";
import { prisma } from "../prisma.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Config ────────────────────────────────────────────────────────────────────

export const DUP_THRESHOLD = 0.92;   // cosine ≥ this → hard duplicate (skip)
export const NEAR_THRESHOLD = 0.85;  // cosine ≥ this → near-match (warn)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  isNearMatch: boolean;
  topMatch: { itemId: string; similarity: number } | null;
  nearMatches: Array<{ itemId: string; similarity: number }>;
}

// ── Fingerprint extraction ────────────────────────────────────────────────────

/**
 * Build a single text string that captures the essential measurement content
 * of an item — what the candidate actually reads/hears/answers.
 * Metadata (CEFR label, construct, topic tags) is intentionally excluded
 * because two items can legitimately share the same metadata if they test
 * different construct facets.
 */
export function extractFingerprint(content: Record<string, unknown>): string {
  const parts: string[] = [];

  // Reading passage / Listening script (primary context)
  const context =
    (content.passage as string) ??
    (content.readingText as string) ??
    (content.ttsScript as string) ??
    (content.transcript as string) ??
    "";
  if (context) parts.push(context.slice(0, 500)); // truncate long passages

  // Question stem
  const stem =
    (content.question as string) ??
    (content.stem as string) ??
    (content.prompt as string) ??
    "";
  if (stem) parts.push(stem);

  // MCQ options (text only, position-independent)
  if (Array.isArray(content.options)) {
    const optTexts = (content.options as Array<{ text?: string }>)
      .map((o) => o.text ?? "")
      .sort()  // sort so order-shuffled re-generates don't evade detection
      .join(" | ");
    parts.push(optTexts);
  }

  return parts.join("\n\n").trim();
}

// ── Embedding ─────────────────────────────────────────────────────────────────

/** Embed a single text using Gemini text-embedding-004 (768 dims). */
export async function embedText(text: string): Promise<number[]> {
  const resp = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  } as any);

  const vec =
    (resp as any).embedding?.values ??
    (resp as any).embeddings?.[0]?.values ??
    null;

  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("Gemini embed API returned empty vector");
  }
  return vec as number[];
}

// ── Cosine similarity (pure JS — no native dep) ───────────────────────────────

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Core check ────────────────────────────────────────────────────────────────

/**
 * Check a candidate item against existing items in the same CEFR × Skill cell.
 *
 * @param candidateVec  - embedding of the new item (pre-computed)
 * @param skill         - SkillType enum value
 * @param cefrLevel     - CefrLevel enum value
 * @param excludeId     - item ID to exclude (for re-check after save)
 */
export async function checkDuplicate(
  candidateVec: number[],
  skill: string,
  cefrLevel: string,
  excludeId?: string,
): Promise<DuplicateCheckResult> {
  // Load existing items with stored embeddings in same cell
  const existing = await prisma.item.findMany({
    where: {
      skill: skill as any,
      cefrLevel: cefrLevel as any,
      embeddingVec: { not: null },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      // Only screen against items that are at least past AI_DRAFT or still in
      // pipeline — we don't want to compare against already-retired clones.
      pipelineStage: { notIn: ["RETIRED", "COMPROMISED"] as any[] },
    },
    select: { id: true, embeddingVec: true },
  });

  const scored: Array<{ itemId: string; similarity: number }> = [];

  for (const item of existing) {
    const vec = item.embeddingVec as number[] | null;
    if (!Array.isArray(vec) || vec.length === 0) continue;
    const sim = cosine(candidateVec, vec);
    scored.push({ itemId: item.id, similarity: sim });
  }

  scored.sort((a, b) => b.similarity - a.similarity);

  const topMatch = scored[0] ?? null;
  const isDuplicate = !!topMatch && topMatch.similarity >= DUP_THRESHOLD;
  const isNearMatch = !isDuplicate && !!topMatch && topMatch.similarity >= NEAR_THRESHOLD;
  const nearMatches = scored.filter(
    (s) => s.similarity >= NEAR_THRESHOLD && s.similarity < DUP_THRESHOLD,
  ).slice(0, 5);

  return { isDuplicate, isNearMatch, topMatch, nearMatches };
}

// ── Convenience wrapper used by batch-generator ───────────────────────────────

/**
 * Full pipeline:
 *  1. Extract fingerprint from raw item content
 *  2. Embed via Gemini
 *  3. Check against DB
 *
 * Returns the embedding vector so the caller can store it without a second API call.
 */
export async function screenItemForDuplicates(
  content: Record<string, unknown>,
  skill: string,
  cefrLevel: string,
): Promise<{
  result: DuplicateCheckResult;
  embedding: number[];
  fingerprint: string;
}> {
  const fingerprint = extractFingerprint(content);
  if (!fingerprint) {
    // Empty fingerprint — can't screen. Return safe defaults.
    return {
      result: { isDuplicate: false, isNearMatch: false, topMatch: null, nearMatches: [] },
      embedding: [],
      fingerprint: "",
    };
  }

  const embedding = await embedText(fingerprint);
  const result = await checkDuplicate(embedding, skill, cefrLevel);

  return { result, embedding, fingerprint };
}

// ── Batch re-embed (for items that predate the duplicate detector) ─────────────

/**
 * Retroactively compute and store embeddings for items that have null embeddingVec.
 * Run via npm script or admin endpoint — not called during normal generation.
 *
 * Processes in pages of 50 to avoid memory pressure.
 */
export async function backfillEmbeddings(
  skill?: string,
  cefrLevel?: string,
  maxItems = 500,
): Promise<{ processed: number; failed: number }> {
  const where = {
    embeddingVec: null,
    ...(skill ? { skill: skill as any } : {}),
    ...(cefrLevel ? { cefrLevel: cefrLevel as any } : {}),
  };

  let processed = 0;
  let failed = 0;
  let skip = 0;
  const pageSize = 50;

  while (processed + failed < maxItems) {
    const items = await prisma.item.findMany({
      where,
      select: { id: true, content: true, skill: true, cefrLevel: true },
      take: pageSize,
      skip,
      orderBy: { id: "asc" },
    });
    if (items.length === 0) break;

    for (const item of items) {
      try {
        const content = (item.content ?? {}) as Record<string, unknown>;
        const fp = extractFingerprint(content);
        if (!fp) { processed++; continue; }
        const vec = await embedText(fp);
        await prisma.item.update({
          where: { id: item.id },
          data: { embeddingVec: vec as any },
        });
        processed++;
      } catch {
        failed++;
      }
    }
    skip += pageSize;
  }

  return { processed, failed };
}
