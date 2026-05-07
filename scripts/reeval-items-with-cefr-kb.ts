/**
 * Re-evaluate all existing items using the CEFR Knowledge Base.
 *
 * For every ACTIVE / DRAFT item in the database this script:
 *   1. Builds a rich CEFR expert context block (grammar scope, vocabulary bands,
 *      text complexity, error profiles, can-do descriptors) via buildCefrKnowledgeBlock.
 *   2. Sends the item + context to gemini-2.5-flash for a structured quality
 *      assessment covering:
 *        • cefrAlignment  (0–100) — is the content pitched at the right level?
 *        • distractorQuality (0–100) — do wrong options exploit documented learner errors?
 *        • clarity  (0–100) — unambiguous, well-formed stem/options?
 *        • grammarScope (0–100) — does the grammar tested match the level inventory?
 *        • vocabularyFit (0–100) — is lexis within the level's frequency band?
 *        • overallScore (0–100)  — weighted composite
 *        • status — "APPROVED" | "REVIEW" | "REJECTED"
 *        • issues — array of { code, severity, message }
 *        • feedback — 1–3 sentence plain-English comment for item writers
 *   3. Writes the result into item.metadata.cefrQualityReview and updates
 *      item.status for items that drop below the REJECT_THRESHOLD.
 *
 * Flags:
 *   DRY_RUN=1          — print assessments, do NOT write to DB
 *   SKILL=GRAMMAR      — limit to one skill (GRAMMAR|VOCABULARY|READING|LISTENING|WRITING|SPEAKING)
 *   LEVEL=B1           — limit to one CEFR level
 *   BATCH_SIZE=20      — items per Gemini batch window (default 15)
 *   DELAY_MS=2000      — delay between batches in ms (default 2000)
 *   STATUS=ACTIVE      — only evaluate items with this status (default: ACTIVE,DRAFT)
 *
 * Usage:
 *   npx tsx scripts/reeval-items-with-cefr-kb.ts
 *   DRY_RUN=1 SKILL=GRAMMAR LEVEL=B1 npx tsx scripts/reeval-items-with-cefr-kb.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { buildCefrKnowledgeBlock } from "../src/lib/cefr/cefr-knowledge-base.js";
import type { CefrLevel } from "../src/lib/cefr/cefr-framework.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN === "1";
const SKILL_FILTER = process.env.SKILL?.toUpperCase() ?? null;
const LEVEL_FILTER = process.env.LEVEL?.toUpperCase() ?? null;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "15", 10);
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "2000", 10);
const STATUS_FILTER = (process.env.STATUS ?? "ACTIVE,DRAFT").split(",").map(s => s.trim().toUpperCase());

/** Items with overallScore below this will be moved to REVIEW status */
const REVIEW_THRESHOLD = 60;
/** Items with overallScore below this will be RETIRED */
const REJECT_THRESHOLD = 40;
/** gemini model */
const MODEL = "gemini-2.5-flash";

// ─── Init ─────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

// ─── Types ────────────────────────────────────────────────────────────────────

interface CefrQualityReview {
  cefrAlignment: number;
  distractorQuality: number;
  clarity: number;
  grammarScope: number;
  vocabularyFit: number;
  overallScore: number;
  status: "APPROVED" | "REVIEW" | "REJECTED";
  issues: Array<{ code: string; severity: "CRITICAL" | "MAJOR" | "MINOR"; message: string }>;
  feedback: string;
  reviewedAt: string;
  reviewModel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function skillToKbType(skill: string): "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary" {
  const map: Record<string, "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary"> = {
    READING: "reading", LISTENING: "listening", WRITING: "writing",
    SPEAKING: "speaking", GRAMMAR: "grammar", VOCABULARY: "vocabulary",
  };
  return map[skill] ?? "grammar";
}

function itemSummary(item: any): string {
  const c = item.content as Record<string, unknown> ?? {};
  const parts: string[] = [];

  if (c.passage && typeof c.passage === "string") parts.push(`PASSAGE:\n${c.passage.slice(0, 600)}`);
  if (c.prompt && typeof c.prompt === "string") parts.push(`PROMPT: ${c.prompt.slice(0, 400)}`);
  if (c.question && typeof c.question === "string") parts.push(`QUESTION: ${c.question.slice(0, 400)}`);
  if (c.stem && typeof c.stem === "string") parts.push(`STEM: ${c.stem.slice(0, 400)}`);
  if (c.ttsScript && typeof c.ttsScript === "string") parts.push(`TTS SCRIPT:\n${c.ttsScript.slice(0, 600)}`);

  if (Array.isArray(c.options)) {
    const opts = (c.options as any[])
      .map((o, i) => {
        const text = typeof o === "string" ? o : o?.text ?? "";
        const correct = typeof o === "object" && o?.isCorrect ? " [CORRECT]" : "";
        const rationale = typeof o === "object" && o?.rationale ? ` — ${o.rationale}` : "";
        return `  ${["A","B","C","D"][i] ?? i}: ${text}${correct}${rationale}`;
      })
      .join("\n");
    parts.push(`OPTIONS:\n${opts}`);
  }

  if (c.correctAnswer !== undefined) parts.push(`CORRECT ANSWER: ${c.correctAnswer}`);
  if (c.rubric && typeof c.rubric === "string") parts.push(`RUBRIC: ${c.rubric.slice(0, 300)}`);

  return parts.join("\n\n");
}

function buildEvalPrompt(item: any, knowledgeBlock: string): string {
  const irtInfo = [
    item.difficulty != null ? `difficulty (b): ${item.difficulty}` : null,
    item.discrimination != null ? `discrimination (a): ${item.discrimination}` : null,
    item.guessing != null ? `guessing (c): ${item.guessing}` : null,
  ].filter(Boolean).join(", ");

  return `You are an expert language assessment specialist and CEFR examiner.
Your task is to critically evaluate an assessment item against the CEFR Knowledge Base below.

${knowledgeBlock}

═══════════════════════════════════════════
ITEM TO EVALUATE
═══════════════════════════════════════════
ID: ${item.id}
Skill: ${item.skill}
CEFR Level: ${item.cefrLevel}
Type: ${item.type ?? "MCQ"}
IRT params: ${irtInfo || "not calibrated yet"}
Tags: ${Array.isArray(item.tags) ? item.tags.join(", ") : "none"}

${itemSummary(item)}

═══════════════════════════════════════════
EVALUATION TASK
═══════════════════════════════════════════
Score each dimension 0–100 (integers):

1. cefrAlignment — Does the difficulty, grammar, vocabulary and cognitive demand match ${item.cefrLevel}? Use the knowledge block as ground truth.
2. distractorQuality — (MCQ only) Do distractors exploit real learner errors documented at ${item.cefrLevel}? Are they plausible but clearly wrong to proficient users? Score 80 for non-MCQ.
3. clarity — Is the stem/prompt unambiguous and well-formed? No double-barrel questions, unclear referents, or instruction leakage?
4. grammarScope — Is the grammar being tested appropriate to the ${item.cefrLevel} inventory? Not too easy, not above level?
5. vocabularyFit — Is the lexis within the expected frequency band for ${item.cefrLevel}?
6. overallScore — Weighted composite: cefrAlignment×0.30 + distractorQuality×0.25 + clarity×0.20 + grammarScope×0.15 + vocabularyFit×0.10

Determine status:
  "APPROVED" if overallScore ≥ 75
  "REVIEW"   if overallScore 50–74
  "REJECTED" if overallScore < 50

List issues (only genuine issues, not stylistic preferences):
Each issue: { "code": "ISSUE_CODE", "severity": "CRITICAL|MAJOR|MINOR", "message": "one sentence" }

Write 1–3 sentences of actionable feedback for the item writer.

Respond ONLY with valid JSON — no markdown, no prose outside JSON:
{
  "cefrAlignment": <int>,
  "distractorQuality": <int>,
  "clarity": <int>,
  "grammarScope": <int>,
  "vocabularyFit": <int>,
  "overallScore": <int>,
  "status": "<APPROVED|REVIEW|REJECTED>",
  "issues": [{ "code": "...", "severity": "...", "message": "..." }],
  "feedback": "<string>"
}`;
}

async function evaluateItem(item: any, attempt = 1): Promise<CefrQualityReview | null> {
  const MAX_RETRIES = 4;
  try {
    const skill = skillToKbType(item.skill);
    const knowledgeBlock = buildCefrKnowledgeBlock(item.cefrLevel as CefrLevel, {
      skill,
      includeGrammar: true,
      includeVocabulary: true,
      includeTextComplexity: true,
      includeErrorProfile: true,
      includeDiscourse: skill === "reading" || skill === "writing" || skill === "listening",
      includeCanDo: true,
    });

    const prompt = buildEvalPrompt(item, knowledgeBlock);

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const raw = response.text ?? "";
    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      cefrAlignment: Number(parsed.cefrAlignment),
      distractorQuality: Number(parsed.distractorQuality),
      clarity: Number(parsed.clarity),
      grammarScope: Number(parsed.grammarScope),
      vocabularyFit: Number(parsed.vocabularyFit),
      overallScore: Number(parsed.overallScore),
      status: parsed.status === "REJECTED" ? "REJECTED" : parsed.status === "REVIEW" ? "REVIEW" : "APPROVED",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      feedback: String(parsed.feedback ?? ""),
      reviewedAt: new Date().toISOString(),
      reviewModel: MODEL,
    };
  } catch (err: any) {
    const isRetryable = err?.message && (
      err.message.includes("503") ||
      err.message.includes("UNAVAILABLE") ||
      err.message.includes("429") ||
      err.message.includes("RESOURCE_EXHAUSTED")
    );
    if (isRetryable && attempt <= MAX_RETRIES) {
      const backoff = Math.min(2 ** attempt * 1500, 30000);
      process.stdout.write(`[retry ${attempt}/${MAX_RETRIES} in ${backoff}ms] `);
      await sleep(backoff);
      return evaluateItem(item, attempt + 1);
    }
    console.error(`  ✗ Eval error for ${item.id}: ${String(err)}`);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`  CEFR Knowledge Base — Item Re-Evaluation`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
  if (DRY_RUN) console.log("  ⚠️  DRY RUN — no database writes\n");

  // Build where clause
  const where: any = {
    status: { in: STATUS_FILTER },
  };
  if (SKILL_FILTER) where.skill = SKILL_FILTER;
  if (LEVEL_FILTER) where.cefrLevel = LEVEL_FILTER;

  const totalCount = await prisma.item.count({ where });
  console.log(`  Items to evaluate: ${totalCount} (skills: ${SKILL_FILTER ?? "ALL"}, level: ${LEVEL_FILTER ?? "ALL"}, statuses: ${STATUS_FILTER.join(",")})`);
  console.log(`  Batch size: ${BATCH_SIZE}, delay: ${DELAY_MS}ms, model: ${MODEL}\n`);

  if (totalCount === 0) {
    console.log("  No items match the filter. Exiting.");
    await prisma.$disconnect();
    return;
  }

  // Fetch all matching items (paginated by batch)
  let processed = 0;
  let approved = 0;
  let review = 0;
  let rejected = 0;
  let errors = 0;
  let statusChanged = 0;
  let skip = 0;

  while (skip < totalCount) {
    const batch = await prisma.item.findMany({
      where,
      select: {
        id: true, skill: true, cefrLevel: true, type: true,
        difficulty: true, discrimination: true, guessing: true,
        content: true, tags: true, metadata: true, status: true,
      },
      skip,
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    if (batch.length === 0) break;

    console.log(`  Processing batch ${Math.floor(skip / BATCH_SIZE) + 1} (items ${skip + 1}–${skip + batch.length} of ${totalCount})...`);

    for (const item of batch) {
      process.stdout.write(`    [${processed + 1}/${totalCount}] ${item.id} (${item.skill} ${item.cefrLevel}) → `);

      const result = await evaluateItem(item);
      if (!result) {
        process.stdout.write("ERROR\n");
        errors++;
        processed++;
        continue;
      }

      // Print verdict
      const icon = result.status === "APPROVED" ? "✓" : result.status === "REVIEW" ? "~" : "✗";
      process.stdout.write(`${icon} ${result.status} (${result.overallScore}/100) CEFR:${result.cefrAlignment} DQ:${result.distractorQuality} CL:${result.clarity}\n`);

      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(`      [${issue.severity}] ${issue.code}: ${issue.message}`);
        });
      }
      if (DRY_RUN) {
        console.log(`      Feedback: ${result.feedback}`);
      }

      // Track stats
      if (result.status === "APPROVED") approved++;
      else if (result.status === "REVIEW") review++;
      else rejected++;

      if (!DRY_RUN) {
        // Merge into existing metadata
        const existingMeta = (item.metadata as Record<string, unknown> | null) ?? {};
        const newMeta = { ...existingMeta, cefrQualityReview: result };

        // Determine new item status
        let newStatus = item.status;
        if (result.overallScore < REJECT_THRESHOLD && item.status === "ACTIVE") {
          newStatus = "REVIEW"; // don't auto-retire ACTIVE items; flag for human review
          statusChanged++;
          console.log(`      ↳ Status flagged: ${item.status} → REVIEW (score too low)`);
        } else if (result.overallScore < REVIEW_THRESHOLD && item.status === "DRAFT") {
          newStatus = "REVIEW";
          statusChanged++;
          console.log(`      ↳ Status changed: DRAFT → REVIEW`);
        }

        await prisma.item.update({
          where: { id: item.id },
          data: {
            metadata: newMeta as any,
            ...(newStatus !== item.status ? { status: newStatus as any } : {}),
          },
        });
      }

      processed++;
    }

    skip += BATCH_SIZE;

    if (skip < totalCount) {
      console.log(`  Waiting ${DELAY_MS}ms before next batch...\n`);
      await sleep(DELAY_MS);
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`  Re-Evaluation Complete`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
  console.log(`  Total processed : ${processed}`);
  console.log(`  APPROVED        : ${approved} (${pct(approved, processed)}%)`);
  console.log(`  REVIEW          : ${review} (${pct(review, processed)}%)`);
  console.log(`  REJECTED        : ${rejected} (${pct(rejected, processed)}%)`);
  console.log(`  Errors          : ${errors}`);
  if (!DRY_RUN) console.log(`  Status changed  : ${statusChanged}`);
  if (DRY_RUN) console.log(`\n  ⚠️  DRY RUN — no changes were saved to the database`);
  console.log();

  await prisma.$disconnect();
}

function pct(n: number, total: number): string {
  return total === 0 ? "0" : ((n / total) * 100).toFixed(1);
}

main().catch(err => {
  console.error("Fatal:", err);
  prisma.$disconnect();
  process.exit(1);
});
