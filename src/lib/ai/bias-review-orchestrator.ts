/**
 * Multi-LLM Bias Review Orchestrator
 *
 * Runs test items through two independent LLM judges (Claude + GPT-4o)
 * to detect potential cultural, gender, age, or linguistic bias before
 * promoting items to the active bank.
 *
 * Architecture
 * ─────────────
 * 1. For each item: build a structured prompt with the item content,
 *    distractor set, and CEFR level context.
 * 2. Send to Model A (Claude 3.5 Sonnet) and Model B (GPT-4o) in parallel.
 * 3. Parse structured JSON verdicts from each model:
 *      { biasType, severity, evidence, suggestion }
 * 4. Apply consensus rules:
 *    - Both PASS            → PASS
 *    - One PASS, one REVIEW → REVIEW (human check)
 *    - Any FAIL             → FAIL
 * 5. Persist verdict in item.metadata.biasReview.
 *
 * Bias taxonomy (aligned with ETS Fairness Review Guidelines)
 * ─────────────────────────────────────────────────────────────
 * - GENDER_BIAS       : gendered stereotypes, pronouns, role assumptions
 * - CULTURAL_BIAS     : culture-specific knowledge, idioms, references
 * - SOCIOECONOMIC_BIAS: implies wealth, class, or privilege
 * - AGE_BIAS          : age stereotypes, generational references
 * - DISABILITY_BIAS   : ableist language or assumptions
 * - RELIGIOUS_BIAS    : religious assumptions or favouritism
 * - NONE              : no bias detected
 *
 * NOTE: This module calls external LLM APIs. It checks for
 * ANTHROPIC_API_KEY and OPENAI_API_KEY; if either is absent it
 * returns a SKIPPED verdict for that model and still produces a
 * consensus based on the available model(s).
 */

import { prisma } from "../prisma.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BiasType =
  | "GENDER_BIAS"
  | "CULTURAL_BIAS"
  | "SOCIOECONOMIC_BIAS"
  | "AGE_BIAS"
  | "DISABILITY_BIAS"
  | "RELIGIOUS_BIAS"
  | "NONE";

export type BiasSeverity = "NONE" | "MINOR" | "MODERATE" | "SEVERE";
export type BiasVerdict = "PASS" | "REVIEW" | "FAIL" | "SKIPPED";

export interface ModelBiasVerdict {
  model: string;
  verdict: BiasVerdict;
  biasTypes: BiasType[];
  severity: BiasSeverity;
  evidence: string;
  suggestion: string;
  rawResponse?: string;
}

export interface BiasReviewResult {
  itemId: string;
  consensusVerdict: BiasVerdict;
  modelVerdicts: ModelBiasVerdict[];
  reviewedAt: string;
  requiresHumanReview: boolean;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildBiasReviewPrompt(item: {
  stem: string;
  options?: string[];
  cefrLevel: string;
  skill: string;
}): string {
  const optionBlock = item.options && item.options.length > 0
    ? `\nAnswer options:\n${item.options.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join("\n")}`
    : "";

  return `You are an expert test fairness reviewer applying ETS Fairness Review Guidelines.

Analyze the following English language test item for potential bias. The item is designed for CEFR level ${item.cefrLevel} (${item.skill} skill).

ITEM STEM:
"${item.stem}"${optionBlock}

Your task: Identify any bias issues present. Respond ONLY with valid JSON matching this schema:
{
  "verdict": "PASS" | "REVIEW" | "FAIL",
  "biasTypes": [ "GENDER_BIAS" | "CULTURAL_BIAS" | "SOCIOECONOMIC_BIAS" | "AGE_BIAS" | "DISABILITY_BIAS" | "RELIGIOUS_BIAS" | "NONE" ],
  "severity": "NONE" | "MINOR" | "MODERATE" | "SEVERE",
  "evidence": "<specific quote or pattern that caused the issue, or empty string if none>",
  "suggestion": "<concrete rewrite suggestion, or empty string if no issue>"
}

Rules:
- verdict=PASS: no bias detected (biasTypes=["NONE"], severity="NONE")
- verdict=REVIEW: minor issues that a human should check (severity="MINOR")
- verdict=FAIL: clear bias that would disadvantage a group (severity="MODERATE" or "SEVERE")
- Be conservative: only flag genuine bias, not merely cultural content.
- Do NOT flag items simply for mentioning a country, food, or custom.
- DO flag items that assume specific cultural knowledge required to answer correctly.`;
}

// ─── LLM callers ─────────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<ModelBiasVerdict> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      model: "claude-3-5-sonnet",
      verdict: "SKIPPED",
      biasTypes: ["NONE"],
      severity: "NONE",
      evidence: "",
      suggestion: "ANTHROPIC_API_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error ${response.status}`);
    }

    const data = await response.json() as any;
    const text: string = data.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Claude response");
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      model: "claude-3-5-sonnet",
      verdict: parsed.verdict as BiasVerdict,
      biasTypes: parsed.biasTypes as BiasType[],
      severity: parsed.severity as BiasSeverity,
      evidence: parsed.evidence ?? "",
      suggestion: parsed.suggestion ?? "",
      rawResponse: text,
    };
  } catch (e: any) {
    return {
      model: "claude-3-5-sonnet",
      verdict: "SKIPPED",
      biasTypes: ["NONE"],
      severity: "NONE",
      evidence: "",
      suggestion: `Error: ${e.message}`,
    };
  }
}

async function callGpt4o(prompt: string): Promise<ModelBiasVerdict> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      model: "gpt-4o",
      verdict: "SKIPPED",
      biasTypes: ["NONE"],
      severity: "NONE",
      evidence: "",
      suggestion: "OPENAI_API_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 512,
        messages: [
          { role: "system", content: "You are an expert test fairness reviewer. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error ${response.status}`);
    }

    const data = await response.json() as any;
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);

    return {
      model: "gpt-4o",
      verdict: parsed.verdict as BiasVerdict,
      biasTypes: parsed.biasTypes as BiasType[],
      severity: parsed.severity as BiasSeverity,
      evidence: parsed.evidence ?? "",
      suggestion: parsed.suggestion ?? "",
      rawResponse: text,
    };
  } catch (e: any) {
    return {
      model: "gpt-4o",
      verdict: "SKIPPED",
      biasTypes: ["NONE"],
      severity: "NONE",
      evidence: "",
      suggestion: `Error: ${e.message}`,
    };
  }
}

// ─── Consensus logic ──────────────────────────────────────────────────────────

function deriveConsensus(verdicts: ModelBiasVerdict[]): {
  consensus: BiasVerdict;
  requiresHuman: boolean;
} {
  const active = verdicts.filter((v) => v.verdict !== "SKIPPED");
  if (active.length === 0) return { consensus: "SKIPPED", requiresHuman: false };

  const hasFail = active.some((v) => v.verdict === "FAIL");
  const hasReview = active.some((v) => v.verdict === "REVIEW");
  const allPass = active.every((v) => v.verdict === "PASS");

  if (hasFail) return { consensus: "FAIL", requiresHuman: true };
  if (hasReview) return { consensus: "REVIEW", requiresHuman: true };
  if (allPass) return { consensus: "PASS", requiresHuman: false };

  return { consensus: "REVIEW", requiresHuman: true };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run bias review for a single item.
 * Fetches item content from Prisma, calls both LLMs in parallel,
 * derives consensus, and persists the result.
 */
export async function reviewItemBias(itemId: string): Promise<BiasReviewResult> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { content: true, cefrLevel: true, skill: true, metadata: true },
  }) as any;

  if (!item) throw new Error(`Item ${itemId} not found`);

  const content = item.content as any ?? {};
  const stem: string = content.stem ?? content.question ?? content.text ?? JSON.stringify(content).slice(0, 200);
  const options: string[] = content.options ?? content.choices ?? [];

  const prompt = buildBiasReviewPrompt({
    stem,
    options,
    cefrLevel: item.cefrLevel,
    skill: item.skill,
  });

  // Run both models in parallel
  const [claudeVerdict, gptVerdict] = await Promise.all([
    callClaude(prompt),
    callGpt4o(prompt),
  ]);

  const { consensus, requiresHuman } = deriveConsensus([claudeVerdict, gptVerdict]);

  const result: BiasReviewResult = {
    itemId,
    consensusVerdict: consensus,
    modelVerdicts: [claudeVerdict, gptVerdict],
    reviewedAt: new Date().toISOString(),
    requiresHumanReview: requiresHuman,
  };

  // Persist into item.metadata
  const updatedMeta = {
    ...((item.metadata as object) ?? {}),
    biasReview: result,
  };
  await prisma.item.update({
    where: { id: itemId },
    data: { metadata: updatedMeta as unknown as import("@prisma/client").Prisma.InputJsonValue },
  });

  return result;
}

/**
 * Batch bias review: process all REVIEW or ACTIVE items that have not yet
 * been bias-checked. Useful as a one-time backfill or scheduled job.
 */
export async function runBatchBiasReview(opts?: {
  orgId?: string;
  limit?: number;
  cefrLevel?: string;
  skill?: string;
}): Promise<{
  processed: number;
  passed: number;
  review: number;
  failed: number;
  skipped: number;
}> {
  const items = await prisma.item.findMany({
    where: {
      status: { in: ["REVIEW", "ACTIVE", "PRETEST"] },
    },
    select: { id: true, metadata: true },
    take: opts?.limit ?? 100,
    orderBy: { createdAt: "desc" },
  }) as any[];

  // Filter items that haven't been bias-reviewed yet
  const pending = items.filter((item: any) => !(item.metadata as any)?.biasReview);

  const counts = { processed: 0, passed: 0, review: 0, failed: 0, skipped: 0 };

  for (const item of pending) {
    try {
      const result = await reviewItemBias(item.id);
      counts.processed++;
      const v = result.consensusVerdict.toLowerCase() as keyof typeof counts;
      if (v in counts) counts[v]++;
    } catch {
      counts.skipped++;
    }
  }

  return counts;
}

/**
 * Get existing bias review result for an item (no re-call to LLMs).
 */
export async function getBiasReview(itemId: string): Promise<BiasReviewResult | null> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { metadata: true },
  }) as any;
  if (!item) return null;
  return (item.metadata as any)?.biasReview ?? null;
}
