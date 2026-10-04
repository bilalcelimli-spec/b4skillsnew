/**
 * Blueprint-Aware Batch Generator
 * §131-133 Content Factory AI Copilot
 *
 * Generates items against a precise blueprint cell spec, not a vague request.
 * Pipeline: spec → generate → auto-QA → review queue (never auto-publish).
 *
 * Key improvements over auto-item-generator.ts:
 *   1. Construct-first prompting (§3 Core Principle chain)
 *   2. Subskill precision — "Inference: infer unstated conclusion" not just "Reading"
 *   3. Genre + register + word-count explicit in prompt
 *   4. Distractor engineering with per-distractor rationale (§30)
 *   5. Evidence statement embedded: what a correct response proves (§11)
 *   6. Diversity controls: rotate names/topics/syntax across batch (§133)
 *   7. All items stored as AI_DRAFT with full metadata — never auto-promoted (§131)
 *   8. Feedback loop: rejection reasons logged per category (§194)
 */

import { GoogleGenAI } from "@google/genai";
import { prisma } from "../prisma.js";
import {
  type BlueprintCell,
  CEFR_THETA_SEED,
  DEFAULT_ITEM_TYPE,
  WORD_COUNT_GUIDANCE,
} from "./blueprint.js";
import { screenItemForDuplicates, DUP_THRESHOLD, NEAR_THRESHOLD } from "./duplicate-detector.js";
import { nextItemCode } from "./item-codes.js";
import { buildQualityBlock, isDemandAllowed, matchingRules } from "./generation-guidelines.js";
import { normalizeSourceFields, unusableSourceFields } from "./script-text.js";
import { assembleMatching, validateRawMatching, guessingForMatching, type RawMatching } from "./matching-items.js";
import { runMatchingDependencyGate } from "../ai/validation/gates/matching-dependency.js";
import { runContentIntegrityGate } from "../ai/validation/gates/content-integrity.js";
import { runTextDependencyGate } from "../ai/validation/gates/text-dependency.js";
import { hardenDistractors, type HardenResult } from "./distractor-hardening.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BatchSpec {
  cell: BlueprintCell;
  count: number;             // items to generate (max 20 per call, §190)
  triggeredBy: string;       // User.id of person who triggered generation
  notes?: string;            // Optional context for the generator
}

export interface BatchResult {
  batchId: string;
  cell: BlueprintCell;
  requested: number;
  generated: number;
  storedIds: string[];
  skipped: number;           // items that failed structural parse or duplicate check
  skippedReasons: string[];
  duplicatesBlocked: number; // items rejected by semantic duplicate detector
  nearMatchWarnings: number; // items saved but flagged as near-matches
  durationMs: number;
  reviewQueueSize: number;   // items now awaiting LANGUAGE_REVIEW
}

// ── Diversity controls (§133) ─────────────────────────────────────────────────

const DIVERSE_NAMES = [
  // Global, pronounceable, not stereotypically role-assigned
  "Amara", "Kenji", "Sofia", "Ravi", "Malia", "Dario", "Yuna", "Chidi",
  "Fatima", "Lena", "Omar", "Priya", "Elias", "Yuki", "Tobias", "Nadia",
  "Kwame", "Ingrid", "Tariq", "Hana", "Marcus", "Leila", "Soren", "Zara",
  "Arnav", "Mia", "Emeka", "Elif", "Jonas", "Aiko", "Daniel", "Rosa",
];

const DIVERSE_SETTINGS = [
  "a community centre", "an international university", "a research institute",
  "a local library", "a public park", "a small business", "a community garden",
  "a tech start-up", "a hospital", "a train station", "a neighbourhood café",
  "an online platform", "a cultural exchange programme", "a sports facility",
];

function pickDistinct<T>(arr: T[], n: number, used: Set<number>): T[] {
  const result: T[] = [];
  const indices = arr.map((_, i) => i).filter((i) => !used.has(i));
  for (let i = 0; i < n && i < indices.length; i++) {
    const idx = indices[i % indices.length];
    result.push(arr[idx]);
    used.add(idx);
  }
  return result;
}

// ── System prompt builder (§132 Blueprint-aware generation) ───────────────────

export function buildSystemPrompt(
  cell: BlueprintCell,
  batchSize: number,
  batchIndex: number,
  opts: { legacy?: boolean } = {}
): string {
  const legacy = !!opts.legacy;
  const wc = WORD_COUNT_GUIDANCE[cell.cefr];
  const usedNames = new Set<number>();
  const usedSettings = new Set<number>();
  const names = pickDistinct(DIVERSE_NAMES, 4, usedNames);
  const settings = pickDistinct(DIVERSE_SETTINGS, 2, usedSettings);

  const itemType = cell.itemType ?? DEFAULT_ITEM_TYPE[cell.skill] ?? "MULTIPLE_CHOICE";
  const isMCQ = itemType === "MULTIPLE_CHOICE" || itemType === "FILL_IN_BLANKS" || itemType === "DRAG_DROP";
  const isReceptive = ["READING", "LISTENING", "GRAMMAR", "VOCABULARY"].includes(cell.skill);
  const isProductive = ["WRITING", "SPEAKING"].includes(cell.skill);

  const constructLine = cell.construct
    ? `CONSTRUCT:           ${cell.construct}`
    : `CONSTRUCT:           ${cell.skill} — ${cell.subskill.replace(/_/g, " ").toLowerCase()}`;

  const evidenceLine = cell.evidenceStatement
    ? `EVIDENCE STATEMENT:  ${cell.evidenceStatement}`
    : `EVIDENCE STATEMENT:  A correct response demonstrates the candidate can process ${cell.skill.toLowerCase()} input at ${cell.cefr} level, specifically targeting the subskill: ${cell.subskill.replace(/_/g, " ").toLowerCase()}.`;

  const genreLine = cell.genre ? `GENRE:               ${cell.genre}` : "";
  const topicLine = cell.topic ? `TOPIC:               ${cell.topic.replace(/_/g, " ")}` : "TOPIC:               everyday or professional contexts";
  const registerLine = cell.register ? `REGISTER:            ${cell.register}` : "";
  const wcLine = wc ? `TEXT LENGTH:         ${wc.label}` : "";
  const ageNote = cell.ageSuitability === "YOUNG_LEARNER"
    ? "Age: young learner (8-12). Use age-appropriate, school-safe topics. No adult work/complex politics."
    : cell.ageSuitability === "TEEN"
    ? "Age: teen (13-17). School and social contexts appropriate."
    : "Age: adult / universal (avoid child-inappropriate material but assume adult candidates).";

  const diversityNote = `
DIVERSITY CONTROLS (§133):
- Use these names from this batch only: ${names.join(", ")}
- Settings may include: ${settings.join(", ")}
- Vary syntactic patterns across items — no two items should open with the same clause type
- Vary topic facets across items — batch ${batchIndex + 1}
- Correct-answer positions must not cluster (do not put all keys in option A or B)`;

  const distractorSpec = isMCQ && !(itemType === "DRAG_DROP" && isReceptive && !legacy) ? `
DISTRACTOR ENGINEERING (§30):
${cell.distractorStrategy ?? `
- Distractor A: misreads or partially misunderstands explicit detail — plausible to a non-proficient candidate
- Distractor B: confuses an example or sub-point in the text with the main answer
- Distractor C: ${legacy ? "overgeneralises or extends a statement beyond what the text supports" : "attributes a true detail to the wrong person, time or cause (a distortion of what the text says, NOT an extreme claim)"}
- All distractors must be grammatically parallel with the correct option
- No distractor should be absurdly wrong — all must attract genuine non-proficient candidates
- Include "distractorRationale" for each option explaining the error it represents`}` : "";

  const isMatching = itemType === "DRAG_DROP" && isReceptive && !legacy;
  const matchingSpec = `
JSON ARRAY OUTPUT — exactly ${batchSize} items, each object:
{
  "skill":         "${cell.skill}",
  "cefrLevel":     "${cell.cefr}",
  "subskill":      "${cell.subskill}",
  "genre":         "${cell.genre ?? ""}",
  "topic":         "${cell.topic ?? ""}",
  "construct":     "...",
  "evidenceStatement": "...",
  "itemType":      "DRAG_DROP",
  "cognitiveDemand": "...", // one of the demands allowed in COGNITIVE DEMAND
  "content": {
    ${cell.skill === "READING" ? `"passage":       "...", // ${wc?.label ?? "appropriate length"}` : `"ttsScript":     "...", // natural multi-speaker discourse, speakers named`}
    "prompt":        "...", // e.g. "Match each speaker with the view they express."
    "pairs":         [{"zone": "...", "answer": "..."}],
    "extraItems":    ["..."]
  },
  "estimatedDifficulty": ${CEFR_THETA_SEED[cell.cefr] ?? 0},
  "cefrJustification":  "...",
  "fairnessConcerns":   "none"
}`;

  const outputSpec = isMatching ? matchingSpec : isMCQ ? `
JSON ARRAY OUTPUT — exactly ${batchSize} items, each object:
{
  "skill":         "${cell.skill}",
  "cefrLevel":     "${cell.cefr}",
  "subskill":      "${cell.subskill}",
  "genre":         "${cell.genre ?? ""}",
  "topic":         "${cell.topic ?? ""}",
  "construct":     "...",
  "evidenceStatement": "...",
  "itemType":      "${itemType}",${legacy ? "" : `
  "cognitiveDemand": "...", // one of the demands allowed in COGNITIVE DEMAND, if given`}
  "content": {
    ${!legacy && ["GRAMMAR", "VOCABULARY"].includes(cell.skill) && ["B2", "C1", "C2"].includes(cell.cefr) ? `"context":       "...", // 2-4 sentence discourse context containing the gap` : ""}
    ${cell.skill === "READING" ? `"passage":       "...", // ${wc?.label ?? "appropriate length"}` : ""}
    ${cell.skill === "LISTENING" ? `"ttsScript":     "...", // natural spoken discourse, NOT a written essay read aloud` : ""}
    "question":      "...",
    "options": [
      {"id": "A", "text": "...", "isCorrect": false, "rationale": "...", "distractorRationale": "..."},
      {"id": "B", "text": "...", "isCorrect": true,  "rationale": "Correct because..."},
      {"id": "C", "text": "...", "isCorrect": false, "rationale": "...", "distractorRationale": "..."},
      {"id": "D", "text": "...", "isCorrect": false, "rationale": "...", "distractorRationale": "..."}
    ],
    "correctAnswer": "B"
  },
  "estimatedDifficulty": ${CEFR_THETA_SEED[cell.cefr] ?? 0},
  "cefrJustification":  "...", // Why this item targets ${cell.cefr} specifically
  "fairnessConcerns":   "none" // or list any cultural/accessibility concerns
}` : isProductive ? `
JSON ARRAY OUTPUT — exactly ${batchSize} items, each object:
{
  "skill":         "${cell.skill}",
  "cefrLevel":     "${cell.cefr}",
  "subskill":      "${cell.subskill}",
  "genre":         "${cell.genre ?? ""}",
  "topic":         "${cell.topic ?? ""}",
  "construct":     "...",
  "evidenceStatement": "...",
  "itemType":      "${itemType}",
  "content": {
    "prompt":        "...", // the task instruction for the candidate
    "audience":      "...", // who the candidate is writing/speaking to
    "purpose":       "...", // communicative purpose of the task
    "contextNote":   "...", // any context the candidate needs
    "responseTime":  ${cell.skill === "SPEAKING" ? 90 : 0},
    "prepTime":      ${cell.skill === "SPEAKING" ? 30 : 0},
    "minWords":      ${cell.skill === "WRITING" ? (wc?.min ?? 80) : 0},
    "maxWords":      ${cell.skill === "WRITING" ? (wc?.max ?? 300) : 0},
    "rubric": {
      "taskFulfilment": "...",
      "organisation":   "...",
      "lexicalResource":"...",
      "grammar":        "...",
      "communicativeEffectiveness": "..."
    }
  },
  "estimatedDifficulty": ${CEFR_THETA_SEED[cell.cefr] ?? 0},
  "cefrJustification":  "...",
  "fairnessConcerns":   "none"
}` : "{}";

  return `You are the B4Skills Assessment Content Factory — a team of senior Cambridge ESOL psychometricians, CEFR alignment specialists, and language-testing researchers.

Your role is to generate ${batchSize} psychometrically valid English assessment item${batchSize > 1 ? "s" : ""} against a precise blueprint specification. You are NOT generating random English questions — you are generating measurement instruments.

CRITICAL CHAIN (follow in order — §3 Core Principle):
CONSTRUCT → DESCRIPTOR → SUBSKILL → TASK → EVIDENCE → RESPONSE → SCORE → INFERENCE

BLUEPRINT SPECIFICATION:
${constructLine}
${evidenceLine}
CEFR TARGET:         ${cell.cefr}
SKILL:               ${cell.skill}
SUBSKILL:            ${cell.subskill}
${genreLine}
${topicLine}
${registerLine}
${wcLine}
ITEM TYPE:           ${itemType}
DESCRIPTOR REF:      ${cell.descriptorRef ?? "CEFR Companion Volume 2020"}
${ageNote}
${diversityNote}

QUALITY GATES (must pass before output):
- §70 No trick questions — difficulty must arise from LANGUAGE PROCESSING, not deception
- §71 Ambiguity check — could a proficient candidate reasonably defend another answer? If yes, revise
- §57-58 Sensitivity — no political persuasion, religious judgement, graphic content, or culturally unfair assumptions
- §4 CEFR precision — text difficulty ≠ item difficulty ≠ CEFR level. A short text can test C1 inference. Justify your level assignment
- §67 Option length — correct answer must not be systematically longer than distractors
- §32 Keyword matching — item must not be answerable by spotting a repeated word from the passage
- §91 Copyright — content must be 100% original, not adapted from Cambridge/IELTS/TOEFL/Pearson
${distractorSpec}
${legacy ? "" : `\n${itemType === "DRAG_DROP" && isReceptive ? matchingRules(cell.skill) + "\n\n" + buildQualityBlock(cell.skill, cell.cefr, "NONE") : buildQualityBlock(cell.skill, cell.cefr, itemType)}\n`}
${outputSpec}

Output ONLY valid JSON array. No markdown, no commentary, no \`\`\`json fences.`;
}

// ── Parse and validate AI output ──────────────────────────────────────────────

interface RawGeneratedItem {
  skill: string;
  cefrLevel: string;
  subskill?: string;
  genre?: string;
  topic?: string;
  construct?: string;
  evidenceStatement?: string;
  itemType: string;
  content: Record<string, unknown>;
  estimatedDifficulty?: number;
  cefrJustification?: string;
  fairnessConcerns?: string;
  cognitiveDemand?: string;
}

function parseAIOutput(raw: string): { items: RawGeneratedItem[]; parseError?: string } {
  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return { items: arr.filter((x) => x && typeof x === "object") };
  } catch (e) {
    return { items: [], parseError: `JSON parse failed: ${(e as Error).message}` };
  }
}

function validateRawItem(item: RawGeneratedItem, cell: BlueprintCell): string[] {
  const errs: string[] = [];
  const c = item.content ?? {};

  if (!item.skill) errs.push("Missing skill");
  if (!item.cefrLevel) errs.push("Missing cefrLevel");

  if ((item.itemType ?? "").includes("DRAG") && Array.isArray((c as any).pairs)) {
    errs.push(...validateRawMatching(c as unknown as RawMatching));
    if (cell.skill === "READING" && !(c.passage || c.text)) errs.push("READING item missing passage");
    if (cell.skill === "LISTENING" && !(c.ttsScript || c.transcript)) errs.push("LISTENING item missing ttsScript/transcript");
    return errs;
  }
  const isMCQ = (item.itemType ?? "").includes("CHOICE") || (item.itemType ?? "").includes("FILL") || (item.itemType ?? "").includes("DRAG");
  if (isMCQ) {
    const opts: any[] = Array.isArray(c.options) ? c.options : [];
    if (opts.length < 4) errs.push(`Only ${opts.length} options (need 4)`);
    if (!opts.some((o: any) => o.isCorrect === true)) errs.push("No correct option marked");
    if (!(c.question || c.stem || c.prompt)) errs.push("Missing question/stem/prompt");
    if (cell.skill === "READING" && !(c.passage || c.text || c.readingText)) errs.push("READING item missing passage");
    if (cell.skill === "LISTENING" && !(c.ttsScript || c.transcript || c.audioUrl)) errs.push("LISTENING item missing ttsScript/transcript");
  }

  if (["WRITING", "SPEAKING"].includes(cell.skill)) {
    if (!(c.prompt || c.stem || c.question)) errs.push("WRITING/SPEAKING item missing prompt");
  }

  return errs;
}

// ── Draft generation (no DB) ──────────────────────────────────────────────────

export type RawDraft = RawGeneratedItem;

/**
 * Passage-based items are long and the model's reasoning tokens share the same
 * output budget, so large requests silently truncate into invalid JSON.
 * Generate in small chunks and merge.
 */
const CHUNK_SIZE: Record<string, number> = { READING: 3, LISTENING: 3 };
const DEFAULT_CHUNK = 8;

/** Calls the model and returns parsed, structurally valid drafts. Writes nothing. */
export async function generateDrafts(
  cell: BlueprintCell,
  count: number,
  opts: { legacy?: boolean } = {}
): Promise<{ items: RawDraft[]; skippedReasons: string[] }> {
  const skippedReasons: string[] = [];
  const valid: RawDraft[] = [];
  const total = Math.min(count, 20);
  const chunk = CHUNK_SIZE[cell.skill] ?? DEFAULT_CHUNK;

  for (let done = 0, idx = 0; done < total; done += chunk, idx++) {
    const size = Math.min(chunk, total - done);
    let rawText = "";
    try {
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildSystemPrompt(cell, size, idx, opts),
        config: { temperature: 0.85, maxOutputTokens: 24576 },
      } as any);
      rawText = (resp as any).text ?? (resp as any).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (err) {
      skippedReasons.push(`AI call failed: ${(err as Error).message}`);
      continue;
    }
    const { items, parseError } = parseAIOutput(rawText);
    if (parseError) skippedReasons.push(parseError);
    for (const parsed of items) {
      const raw = parsed && typeof parsed.content === "object" && parsed.content
        ? { ...parsed, content: normalizeSourceFields(parsed.content as Record<string, unknown>) }
        : parsed;
      const errs = validateRawItem(raw, cell);
      const bad = raw && typeof raw.content === "object" && raw.content ? unusableSourceFields(raw.content as Record<string, unknown>) : [];
      if (bad.length) errs.push(`Source text not usable as plain text: ${bad.join(", ")}`);
      if (errs.length) skippedReasons.push(`Item skipped — ${errs.join("; ")}`);
      else valid.push(raw);
    }
  }
  return { items: valid, skippedReasons };
}

// ── Core batch generator ──────────────────────────────────────────────────────

export async function runBatchGeneration(spec: BatchSpec): Promise<BatchResult> {
  const t0 = Date.now();
  const { cell, count, triggeredBy } = spec;
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Cap at 20 per API call (§190 controlled batches)
  const safeCount = Math.min(count, 20);
  const itemType = cell.itemType ?? DEFAULT_ITEM_TYPE[cell.skill] ?? "MULTIPLE_CHOICE";
  const theta = CEFR_THETA_SEED[cell.cefr] ?? 0.0;

  const storedIds: string[] = [];
  const skippedReasons: string[] = [];
  let duplicatesBlocked = 0;
  let nearMatchWarnings = 0;

  const generated = await generateDrafts(cell, safeCount);
  skippedReasons.push(...generated.skippedReasons);
  if (generated.items.length === 0) {
    return {
      batchId, cell,
      requested: safeCount, generated: 0,
      storedIds, skipped: safeCount, skippedReasons,
      duplicatesBlocked: 0, nearMatchWarnings: 0,
      durationMs: Date.now() - t0, reviewQueueSize: 0,
    };
  }

  for (const raw of generated.items) {
    if (["READING", "LISTENING"].includes(cell.skill) && !isDemandAllowed(cell.cefr, raw.cognitiveDemand)) {
      skippedReasons.push(`Item skipped — cognitiveDemand "${raw.cognitiveDemand ?? "missing"}" not allowed at ${cell.cefr}`);
      continue;
    }

    // Normalize content: ensure options have rationale field
    const content: Record<string, unknown> = { ...raw.content };
    let guessingParam = ["WRITING", "SPEAKING"].includes(cell.skill) ? 0.0 : 0.25;
    if (Array.isArray((content as any).pairs)) {
      const { pairs, extraItems, ...rest } = content as any;
      const assembled = assembleMatching({ prompt: String(rest.prompt ?? ""), pairs, extraItems }, `${batchId}:${storedIds.length}:${skippedReasons.length}`);
      for (const k of Object.keys(content)) delete (content as any)[k];
      Object.assign(content, rest, assembled);
      guessingParam = guessingForMatching(assembled.dropZones.length, assembled.draggableItems.length);
    }
    if (Array.isArray(content.options)) {
      content.options = (content.options as any[]).map((o) => ({
        id: o.id ?? o.label,
        text: o.text ?? o.content,
        isCorrect: !!o.isCorrect,
        rationale: o.rationale ?? "",
        distractorRationale: o.distractorRationale ?? "",
      }));
    }

    // ── Content gates (integrity heuristics + blind-solve) ────────────────────
    let hardening: Pick<HardenResult, "status" | "rounds"> | null = null;
    if (itemType === "MULTIPLE_CHOICE" && ["READING", "LISTENING"].includes(cell.skill)) {
      const h = await hardenDistractors({ skill: cell.skill, cefr: cell.cefr, content });
      Object.assign(content, h.content);
      hardening = { status: h.status, rounds: h.rounds };
    }
    const draft = { type: itemType as any, skill: cell.skill as any, cefrLevel: cell.cefr as any, content: content as any };
    const integrity = await runContentIntegrityGate(draft);
    if (integrity.verdict === "FAIL") {
      skippedReasons.push(`Item skipped — content-integrity: ${integrity.issues.map((i) => i.message).join("; ")}`);
      continue;
    }
    const textDep = draft.type === "DRAG_DROP"
      ? await runMatchingDependencyGate(draft).catch(() => null)
      : await runTextDependencyGate(draft).catch(() => null);
    const gateFlags = [
      ...integrity.issues.map((i) => i.code),
      ...(textDep?.issues.map((i) => i.code) ?? []),
    ];

    // ── Semantic duplicate screening (§195) ───────────────────────────────────
    let embeddingVec: number[] | null = null;
    let nearMatchNote: string | null = null;
    try {
      const { result, embedding } = await screenItemForDuplicates(content, cell.skill, cell.cefr);
      if (result.isDuplicate && result.topMatch) {
        duplicatesBlocked++;
        skippedReasons.push(
          `Duplicate blocked (similarity ${(result.topMatch.similarity * 100).toFixed(1)}% ≥ ${DUP_THRESHOLD * 100}%) — near-clone of item ${result.topMatch.itemId}`,
        );
        continue; // skip this item entirely
      }
      if (embedding.length > 0) embeddingVec = embedding;
      if (result.isNearMatch && result.topMatch) {
        nearMatchWarnings++;
        nearMatchNote = `Near-match ${(result.topMatch.similarity * 100).toFixed(1)}% (≥ ${NEAR_THRESHOLD * 100}%) — possible variant of ${result.topMatch.itemId}`;
      }
    } catch (embedErr) {
      // Embedding failure is non-fatal — log and continue without dedup
      skippedReasons.push(`Embedding failed (item saved without dedup): ${(embedErr as Error).message}`);
    }

    // Pre-generate item code (unique, stable, human-readable)
    let itemCode: string | null = null;
    try {
      itemCode = await nextItemCode(cell.skill, cell.cefr);
    } catch {
      // Non-fatal: item saves without a code; backfillItemCodes() can fill later
    }

    try {
      const stored = await prisma.item.create({
        data: {
          itemCode: itemCode ?? undefined,
          type: itemType as any,
          skill: cell.skill as any,
          cefrLevel: cell.cefr as any,
          difficulty: raw.estimatedDifficulty ?? theta,
          discrimination: 1.0,
          guessing: guessingParam,
          content: content as any,
          tags: [cell.skill, cell.cefr, cell.subskill, cell.genre, cell.topic].filter(Boolean) as string[],
          status: "DRAFT",
          pipelineStage: "AI_DRAFT",
          subskill: cell.subskill,
          genre: cell.genre ?? null,
          topic: cell.topic ?? null,
          construct: raw.construct ?? cell.construct ?? null,
          evidenceStatement: raw.evidenceStatement ?? cell.evidenceStatement ?? null,
          descriptorRef: cell.descriptorRef ?? null,
          register: cell.register ?? null,
          englishVariant: cell.englishVariant ?? "INTERNATIONAL",
          ageSuitability: (cell.ageSuitability ?? "UNIVERSAL") as any,
          culturalLoad: cell.culturalLoad ?? "LOW",
          securityClass: "ASSESSMENT",
          provenance: "ORIGINAL_AI_ASSISTED",
          embeddingVec: embeddingVec as any,
          metadata: {
            batchId,
            triggeredBy,
            cefrJustification: raw.cefrJustification,
            fairnessConcerns: raw.fairnessConcerns,
            notes: spec.notes,
            generatedAt: new Date().toISOString(),
            ...(raw.cognitiveDemand ? { cognitiveDemand: raw.cognitiveDemand } : {}),
            generationGates: { flags: gateFlags, textDependency: textDep?.metrics ?? null, hardening, promptVersion: "v2" },
            ...(nearMatchNote ? { nearMatchWarning: nearMatchNote } : {}),
          } as any,
        },
        select: { id: true },
      });
      storedIds.push(stored.id);

      // Auto-score IQS immediately so reviewers see quality signal in review queue
      try {
        const { computeAndPersistIqs } = await import("../psychometrics/item-quality-score.js");
        await computeAndPersistIqs(stored.id);
      } catch {
        // IQS failure is non-fatal — reviewers will see null iqScore; run iqs:batch later
      }
    } catch (dbErr) {
      skippedReasons.push(`DB write failed: ${(dbErr as Error).message}`);
    }
  }

  return {
    batchId,
    cell,
    requested: safeCount,
    generated: storedIds.length,
    storedIds,
    skipped: safeCount - storedIds.length,
    skippedReasons,
    duplicatesBlocked,
    nearMatchWarnings,
    durationMs: Date.now() - t0,
    reviewQueueSize: storedIds.length,
  };
}

// ── Feedback loop: aggregate rejection reasons (§194) ─────────────────────────

export async function getBatchFeedback(batchId: string): Promise<{
  totalGenerated: number;
  inReview: number;
  approved: number;
  rejected: number;
  rejectionCategories: Record<string, number>;
}> {
  const items = await prisma.item.findMany({
    where: { metadata: { path: ["batchId"], equals: batchId } } as any,
    select: { id: true, pipelineStage: true, itemReviews: { select: { verdict: true, reviewType: true, revisionsReq: true } } },
  });

  const rejectionCategories: Record<string, number> = {};
  let approved = 0, rejected = 0;

  for (const it of items) {
    for (const rev of it.itemReviews) {
      if (rev.verdict === "REJECT") {
        rejected++;
        for (const r of rev.revisionsReq) {
          rejectionCategories[r] = (rejectionCategories[r] ?? 0) + 1;
        }
      } else if (rev.verdict === "APPROVE") {
        approved++;
      }
    }
  }

  return {
    totalGenerated: items.length,
    inReview: items.filter((i) => ["AI_DRAFT", "LANGUAGE_REVIEW", "CEFR_REVIEW", "FAIRNESS_REVIEW", "MODERATION"].includes(i.pipelineStage)).length,
    approved,
    rejected,
    rejectionCategories,
  };
}
