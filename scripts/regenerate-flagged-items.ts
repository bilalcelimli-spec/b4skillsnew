/**
 * Regenerate flagged (REVIEW/REJECTED) items using Gemini + CEFR Knowledge Base.
 *
 * For each flagged item this script:
 *   1. Reads the cefrQualityReview.issues from metadata to understand WHY it failed
 *   2. Builds a CEFR expert context block for the correct level
 *   3. Sends to Gemini with a targeted "fix the following issues" prompt
 *   4. Inserts the new item as DRAFT with a back-reference to the original
 *   5. Optionally retires the original (RETIRE_ORIGINAL=1)
 *
 * Flags:
 *   DRY_RUN=1           — generate but do NOT write to DB
 *   SKILL=GRAMMAR       — limit to one skill
 *   LEVEL=B1            — limit to one CEFR level
 *   MIN_SCORE=0         — only regenerate items with score <= this (default: 69)
 *   RETIRE_ORIGINAL=1   — retire the original item after generating replacement
 *   BATCH_SIZE=5        — items per Gemini window (default 5, slower but more reliable)
 *   DELAY_MS=4000       — delay between batches (default 4000ms)
 *   LIMIT=50            — max items to process in this run
 *
 * Usage:
 *   npx tsx scripts/regenerate-flagged-items.ts
 *   SKILL=GRAMMAR LEVEL=C1 RETIRE_ORIGINAL=1 npx tsx scripts/regenerate-flagged-items.ts
 *   DRY_RUN=1 SKILL=GRAMMAR LEVEL=A1 LIMIT=10 npx tsx scripts/regenerate-flagged-items.ts
 */

import "dotenv/config";
import { PrismaClient, CefrLevel, SkillType } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { buildCefrKnowledgeBlock } from "../src/lib/cefr/cefr-knowledge-base.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN === "1";
const RETIRE_ORIGINAL = process.env.RETIRE_ORIGINAL === "1";
const SKILL_FILTER = process.env.SKILL?.toUpperCase() ?? null;
const LEVEL_FILTER = process.env.LEVEL?.toUpperCase() ?? null;
const MIN_SCORE = parseInt(process.env.MIN_SCORE ?? "69", 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "5", 10);
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "4000", 10);
const LIMIT = parseInt(process.env.LIMIT ?? "200", 10);
const MODEL = "gemini-2.5-flash";

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

// ─── Types ────────────────────────────────────────────────────────────────────

interface CefrQualityReview {
  overallScore: number;
  status: "APPROVED" | "REVIEW" | "REJECTED";
  issues: Array<{ code: string; severity: "CRITICAL" | "MAJOR" | "MINOR"; message: string }>;
  feedback: string;
}

interface GeneratedItem {
  prompt: string;
  passage?: string;
  options: Array<{ text: string; isCorrect: boolean; rationale: string }>;
  grammarPoint: string;
  topicTag: string;
  difficulty_b: number;
  discrimination_a: number;
  guessing_c: number;
  tags: string[];
}

// ─── IRT defaults by level ────────────────────────────────────────────────────

const IRT_DEFAULTS: Record<string, { b: number; a: number }> = {
  PRE_A1: { b: -2.2, a: 0.90 },
  A1:     { b: -1.5, a: 0.95 },
  A2:     { b: -0.7, a: 1.05 },
  B1:     { b:  0.1, a: 1.10 },
  B2:     { b:  0.8, a: 1.25 },
  C1:     { b:  1.5, a: 1.35 },
  C2:     { b:  2.1, a: 1.40 },
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildRegenerationPrompt(
  originalItem: {
    skill: string;
    cefrLevel: string;
    content: unknown;
    metadata: unknown;
  },
  cefrKnowledge: string
): string {
  const content = originalItem.content as Record<string, unknown>;
  const meta = originalItem.metadata as Record<string, unknown> | null;
  const review = (meta?.cefrQualityReview as CefrQualityReview) ?? null;

  const issueList = review?.issues
    .map((i) => `  - [${i.severity}] ${i.code}: ${i.message}`)
    .join("\n") ?? "Unknown issues";

  return `You are a world-class language test designer. You must write a HIGH-QUALITY replacement item.

## Context: Why the original item failed
${issueList}

## Original item (DO NOT reuse — write a completely new one):
Skill: ${originalItem.skill}
CEFR Level: ${originalItem.cefrLevel}
Original prompt: ${JSON.stringify(content?.prompt ?? "")}
Original options: ${JSON.stringify(content?.options ?? [])}

${cefrKnowledge}

## Task
Write ONE new ${originalItem.skill} multiple-choice item for CEFR ${originalItem.cefrLevel} that:
1. Fixes ALL the issues listed above
2. Tests a grammar point EXPLICITLY listed in the PRODUCTIVE grammar inventory for this level
3. Uses vocabulary within the specified Zipf frequency range
4. Has exactly 4 options (A–D) where ONLY ONE is unambiguously correct
5. Has 3 plausible distractors targeting DOCUMENTED learner errors at this level
6. Has appropriate topic/register for this CEFR level
7. Is NOT a collocation or lexical item test — it must test GRAMMAR

Respond with ONLY valid JSON in this exact schema:
{
  "prompt": "sentence with ___ for the blank",
  "passage": null,
  "options": [
    { "text": "...", "isCorrect": true, "rationale": "why this is the correct answer" },
    { "text": "...", "isCorrect": false, "rationale": "what error this distractor targets" },
    { "text": "...", "isCorrect": false, "rationale": "what error this distractor targets" },
    { "text": "...", "isCorrect": false, "rationale": "what error this distractor targets" }
  ],
  "grammarPoint": "name of the target grammar point",
  "topicTag": "one of: daily_life|work|education|travel|health|environment|technology|social|academic",
  "difficulty_b": <float aligned to CEFR level>,
  "discrimination_a": <float 0.8-1.5>,
  "guessing_c": 0.25,
  "tags": ["grammar:<point>", "<topic>", "<cefrLevel>"]
}`;
}

// ─── AI call with retry ───────────────────────────────────────────────────────

async function generateWithRetry(prompt: string, maxRetries = 4): Promise<GeneratedItem | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.7, responseMimeType: "application/json" },
      });
      const text = response.text?.trim() ?? "";
      const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(clean) as GeneratedItem;
    } catch (err: unknown) {
      const msg = String(err);
      const isRetryable = msg.includes("503") || msg.includes("502") || msg.includes("429") || msg.includes("UNAVAILABLE");
      if (!isRetryable || attempt === maxRetries) {
        console.error(`    ✗ Generation failed: ${msg.slice(0, 120)}`);
        return null;
      }
      const wait = Math.min(2 ** attempt * 2000, 30000);
      process.stdout.write(`    [retry ${attempt + 1}/${maxRetries} in ${wait}ms] `);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const whereClause: Record<string, unknown> = {
    status: { in: ["REVIEW"] },
    metadata: { not: null },
  };
  if (SKILL_FILTER) whereClause.skill = SKILL_FILTER as SkillType;
  if (LEVEL_FILTER) whereClause.cefrLevel = LEVEL_FILTER as CefrLevel;

  const items = await prisma.item.findMany({
    where: whereClause as Parameters<typeof prisma.item.findMany>[0]["where"],
    select: {
      id: true,
      itemCode: true,
      skill: true,
      cefrLevel: true,
      status: true,
      content: true,
      metadata: true,
      tags: true,
    },
    orderBy: [{ skill: "asc" }, { cefrLevel: "asc" }],
    take: LIMIT,
  });

  // Filter to items with a quality review and below threshold
  const candidates = items.filter((item) => {
    const meta = item.metadata as Record<string, unknown> | null;
    const review = meta?.cefrQualityReview as CefrQualityReview | undefined;
    if (!review) return false;
    return review.overallScore <= MIN_SCORE;
  });

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("  Flagged Item Regeneration Pipeline");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log(`  Candidates to regenerate : ${candidates.length}`);
  console.log(`  DRY_RUN                  : ${DRY_RUN}`);
  console.log(`  RETIRE_ORIGINAL          : ${RETIRE_ORIGINAL}`);
  console.log(`  Score threshold (≤)      : ${MIN_SCORE}\n`);

  if (candidates.length === 0) {
    console.log("  No items to regenerate. Run reeval-items-with-cefr-kb.ts first.\n");
    await prisma.$disconnect();
    return;
  }

  let generated = 0;
  let failed = 0;
  let retired = 0;

  // Process in batches
  for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_SIZE) {
    const batch = candidates.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);
    console.log(`  Processing batch ${batchNum}/${totalBatches} (items ${batchStart + 1}–${Math.min(batchStart + BATCH_SIZE, candidates.length)})...`);

    for (const item of batch) {
      const meta = item.metadata as Record<string, unknown>;
      const review = meta.cefrQualityReview as CefrQualityReview;
      const idx = batchStart + batch.indexOf(item) + 1;

      process.stdout.write(
        `    [${idx}/${candidates.length}] ${item.skill} ${item.cefrLevel} score=${review.overallScore} id=${item.id} → `
      );

      // Build CEFR context
      const cefrKnowledge = buildCefrKnowledgeBlock(item.cefrLevel as CefrLevel, {
        includeGrammar: true,
        includeVocabulary: true,
        includeTextComplexity: true,
        includeErrorProfile: true,
        includeDiscourse: false,
        skill: item.skill.toLowerCase() as "grammar",
        ageGroup: "adult",
      });

      const prompt = buildRegenerationPrompt(item, cefrKnowledge);
      const newItem = await generateWithRetry(prompt);

      if (!newItem) {
        failed++;
        console.log("✗ FAILED");
        continue;
      }

      // Validate basic structure
      const validOptions = newItem.options?.filter((o) => o.isCorrect).length === 1;
      if (!validOptions || !newItem.prompt) {
        failed++;
        console.log("✗ INVALID (bad options)");
        continue;
      }

      const irtDefaults = IRT_DEFAULTS[item.cefrLevel] ?? { b: 0, a: 1.0 };

      if (!DRY_RUN) {
        // Insert new item as DRAFT
        const created = await prisma.item.create({
          data: {
            skill: item.skill as SkillType,
            cefrLevel: item.cefrLevel as CefrLevel,
            type: "MULTIPLE_CHOICE",
            status: "DRAFT",
            difficulty: newItem.difficulty_b ?? irtDefaults.b,
            discrimination: newItem.discrimination_a ?? irtDefaults.a,
            guessing: newItem.guessing_c ?? 0.25,
            content: {
              prompt: newItem.prompt,
              passage: newItem.passage ?? null,
              options: newItem.options,
              correctAnswer: newItem.options.find((o) => o.isCorrect)?.text ?? "",
            },
            tags: [
              ...(newItem.tags ?? []),
              `regen-from:${item.id}`,
              `grammar:${newItem.grammarPoint ?? "unknown"}`,
            ],
            metadata: {
              generatedBy: "regenerate-flagged-items",
              replacedItemId: item.id,
              grammarPoint: newItem.grammarPoint,
              topicTag: newItem.topicTag,
              generatedAt: new Date().toISOString(),
            },
          },
        });

        // Retire original if requested
        if (RETIRE_ORIGINAL) {
          await prisma.item.update({
            where: { id: item.id },
            data: {
              status: "RETIRED",
              retiredAt: new Date(),
              retiredBy: "regenerate-flagged-items",
              retirementReason: `Replaced by ${created.id} after CEFR quality review (score: ${review.overallScore})`,
            },
          });
          retired++;
        }

        generated++;
        console.log(`✓ → DRAFT id=${created.id} [${newItem.grammarPoint}]`);
      } else {
        generated++;
        console.log(`✓ DRY [${newItem.grammarPoint}]: "${newItem.prompt.slice(0, 60)}..."`);
      }
    }

    if (batchStart + BATCH_SIZE < candidates.length) {
      console.log(`  Waiting ${DELAY_MS}ms before next batch...`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n  ── Summary ──`);
  console.log(`  Generated (DRAFT)  : ${generated}`);
  console.log(`  Failed             : ${failed}`);
  if (RETIRE_ORIGINAL) console.log(`  Originals retired  : ${retired}`);
  console.log(`\n  Next step: Review DRAFT items in admin panel → promote to PRETEST → calibrate → ACTIVE\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
