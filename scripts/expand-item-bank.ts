/**
 * Item Bank Expansion — Batch Generation Script
 *
 * Doubles the item bank from ~2,234 → ~4,700 items while maintaining
 * CEFR construct validity, psychometric reliability, and Cambridge/ALTE
 * item-writing standards.
 *
 * Theoretical basis:
 *  - ALTE Code of Practice (2001, 2016 rev.) — item banking & quality assurance
 *  - Council of Europe CEFR Companion Volume (2020) — can-do descriptors
 *  - English Profile Programme — grammar & vocabulary inventories per CEFR level
 *  - Bachman & Palmer (2010) — Language Assessment in Practice
 *  - Haladyna, Downing & Rodriguez (2002) — MCQ item writing guidelines
 *  - IRT calibration targets: Hambleton & Swaminathan (1985)
 *
 * Priority order (most under-represented first):
 *   1. SPEAKING  (133 → 375 target)
 *   2. WRITING   (134 → 375 target)
 *   3. LISTENING (317 → 660 target) — especially C1/C2
 *   4. READING   (341 → 705 target) — especially PRE_A1/A1
 *   5. VOCABULARY(583 → 1170 target)
 *   6. GRAMMAR   (726 → 1415 target)
 *
 * Usage:
 *   npx tsx scripts/expand-item-bank.ts
 *   DRY_RUN=1 npx tsx scripts/expand-item-bank.ts        # preview only
 *   SKILL=SPEAKING npx tsx scripts/expand-item-bank.ts   # single skill
 *   SKILL=SPEAKING LEVEL=B1 npx tsx scripts/expand-item-bank.ts
 *   BATCH_SIZE=3 npx tsx scripts/expand-item-bank.ts     # items per API call
 *   DELAY_MS=2000 npx tsx scripts/expand-item-bank.ts    # rate limit delay
 *
 * Safety:
 *   - All generated items land in PRETEST status (isPretest=true)
 *   - Items are NOT activated — they need 50+ real responses for calibration
 *   - A JSONL log is written to logs/expand-YYYY-MM-DD.jsonl for auditing
 *   - Idempotent: re-running skips cells that already meet their target
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { AIItemGenerator } from "../src/lib/language-skills/ai-item-generator.js";
import type { ItemGenerationSpec } from "../src/lib/language-skills/item-writing-framework.js";

// ─── Configuration ────────────────────────────────────────────────────────────
const DRY_RUN = process.env.DRY_RUN === "1";
const FILTER_SKILL = process.env.SKILL?.toUpperCase();
const FILTER_LEVEL = process.env.LEVEL?.toUpperCase();
const BATCH_SIZE = Math.min(5, Math.max(1, parseInt(process.env.BATCH_SIZE ?? "4", 10)));
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1500", 10);
const MIN_QA_SCORE = parseInt(process.env.MIN_QA_SCORE ?? "55", 10);

const prisma = new PrismaClient();
const generator = new AIItemGenerator();

// ─── Logging ──────────────────────────────────────────────────────────────────
const logDir = path.resolve("logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `expand-${new Date().toISOString().slice(0, 10)}.jsonl`);

function log(obj: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...obj });
  fs.appendFileSync(logFile, line + "\n");
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Detect Gemini RESOURCE_EXHAUSTED (429) quota errors from log
let quotaExhausted = false;
let consecutiveZeroSaves = 0;
const MAX_CONSECUTIVE_ZERO = 3; // 3 batches tümü 0 kayıt → kota aşıldı

// ─── CEFR IRT Parameter Targets ───────────────────────────────────────────────
// Based on LinguAdapt standard-setting report and IRT calibration norms.
// b-parameters represent logit difficulty; a = discrimination; c = guessing
const CEFR_IRT_TARGETS: Record<string, { b: number; aMin: number; aMax: number; c_mc: number }> = {
  PRE_A1: { b: -3.5, aMin: 0.70, aMax: 1.20, c_mc: 0.20 },
  A1:     { b: -2.5, aMin: 0.80, aMax: 1.40, c_mc: 0.20 },
  A2:     { b: -1.5, aMin: 0.90, aMax: 1.60, c_mc: 0.20 },
  B1:     { b: -0.5, aMin: 1.00, aMax: 1.80, c_mc: 0.20 },
  B2:     { b:  0.5, aMin: 1.10, aMax: 2.00, c_mc: 0.20 },
  C1:     { b:  1.5, aMin: 1.20, aMax: 2.00, c_mc: 0.20 },
  C2:     { b:  2.5, aMin: 1.30, aMax: 2.00, c_mc: 0.20 },
};

// ─── Expansion Plan ────────────────────────────────────────────────────────────
// Target counts per (skill, CEFR) cell.
// Methodology: minimum CAT pool requirements + doubling constraint.
//   - GRAMMAR/VOCABULARY: ≥ 130 per level for stable CAT selection (content blueprint)
//   - READING/LISTENING: ≥ 70 per level minimum; ≥ 100 for B1-B2 high-traffic
//   - SPEAKING/WRITING: ≥ 40 per level (holistic scoring; lower pool acceptable)
// 2026-05 gap analysis: WRITING A1/A2 and LISTENING PRE_A1/A1/A2 are critical gaps.
// Total target: ~4,700 items (>2× current 2,234)
const EXPANSION_TARGETS: Record<string, Record<string, number>> = {
  SPEAKING:   { PRE_A1: 40, A1: 50, A2: 50, B1: 60, B2: 70, C1: 70, C2: 35 },
  WRITING:    { PRE_A1: 40, A1: 60, A2: 60, B1: 60, B2: 70, C1: 70, C2: 35 },
  LISTENING:  { PRE_A1: 50, A1: 60, A2: 115, B1: 165, B2: 125, C1: 115, C2: 40 },
  READING:    { PRE_A1: 25, A1: 65, A2: 105, B1: 130, B2: 155, C1: 135, C2: 90 },
  VOCABULARY: { PRE_A1: 65, A1: 185, A2: 200, B1: 225, B2: 205, C1: 190, C2: 100 },
  GRAMMAR:    { PRE_A1: 100, A1: 200, A2: 210, B1: 300, B2: 230, C1: 225, C2: 150 },
};

// ─── Item Format Selection ────────────────────────────────────────────────────
// Maps (skill, CEFR) → preferred ItemFormat for AIItemGenerator.
// Weighted toward highest-validity formats per ALTE/Cambridge guidance.
type ItemFormat =
  | "MULTIPLE_CHOICE_SINGLE" | "MULTIPLE_CHOICE_MULTI" | "TRUE_FALSE_NOT_GIVEN"
  | "MATCHING" | "GAP_FILL_CLOSED" | "GAP_FILL_OPEN" | "HEADING_MATCHING"
  | "SHORT_ANSWER" | "SUMMARY_COMPLETION" | "SENTENCE_INSERTION"
  | "SPEAKING_MONOLOGUE" | "SPEAKING_IMAGE" | "SPEAKING_OPINION" | "SPEAKING_ROLE_PLAY"
  | "WRITING_EMAIL" | "WRITING_ESSAY" | "WRITING_REPORT" | "WRITING_STORY" | "WRITING_SUMMARY"
  | "DRAG_DROP" | "CLOZE_PASSAGE" | "WORD_FORMATION";

function pickFormat(skill: string, level: string, index: number): ItemFormat {
  const early = ["PRE_A1", "A1"].includes(level);
  const mid   = ["A2", "B1"].includes(level);
  const high  = ["B2", "C1", "C2"].includes(level);

  const cycleOf = <T>(arr: T[]): T => arr[index % arr.length];

  switch (skill) {
    case "GRAMMAR":
      if (early) return cycleOf(["MULTIPLE_CHOICE_SINGLE", "GAP_FILL_CLOSED", "DRAG_DROP"] as ItemFormat[]);
      if (mid)   return cycleOf(["MULTIPLE_CHOICE_SINGLE", "GAP_FILL_CLOSED", "CLOZE_PASSAGE"] as ItemFormat[]);
      return cycleOf(["MULTIPLE_CHOICE_SINGLE", "CLOZE_PASSAGE", "WORD_FORMATION", "GAP_FILL_OPEN"] as ItemFormat[]);

    case "VOCABULARY":
      if (early) return cycleOf(["MULTIPLE_CHOICE_SINGLE", "MATCHING", "GAP_FILL_CLOSED"] as ItemFormat[]);
      if (mid)   return cycleOf(["MULTIPLE_CHOICE_SINGLE", "GAP_FILL_CLOSED", "MATCHING"] as ItemFormat[]);
      return cycleOf(["MULTIPLE_CHOICE_SINGLE", "WORD_FORMATION", "GAP_FILL_CLOSED", "MULTIPLE_CHOICE_MULTI"] as ItemFormat[]);

    case "READING":
      if (early) return cycleOf(["MULTIPLE_CHOICE_SINGLE", "MATCHING"] as ItemFormat[]);
      if (mid)   return cycleOf(["MULTIPLE_CHOICE_SINGLE", "TRUE_FALSE_NOT_GIVEN", "SHORT_ANSWER"] as ItemFormat[]);
      return cycleOf(["MULTIPLE_CHOICE_SINGLE", "TRUE_FALSE_NOT_GIVEN", "HEADING_MATCHING", "SUMMARY_COMPLETION"] as ItemFormat[]);

    case "LISTENING":
      if (early) return cycleOf(["MULTIPLE_CHOICE_SINGLE", "GAP_FILL_CLOSED"] as ItemFormat[]);
      if (mid)   return cycleOf(["MULTIPLE_CHOICE_SINGLE", "SHORT_ANSWER", "GAP_FILL_CLOSED"] as ItemFormat[]);
      return cycleOf(["MULTIPLE_CHOICE_SINGLE", "SUMMARY_COMPLETION", "SHORT_ANSWER"] as ItemFormat[]);

    case "SPEAKING":
      if (early) return cycleOf(["SPEAKING_IMAGE", "SPEAKING_ROLE_PLAY"] as ItemFormat[]);
      if (mid)   return cycleOf(["SPEAKING_IMAGE", "SPEAKING_ROLE_PLAY", "SPEAKING_OPINION"] as ItemFormat[]);
      return cycleOf(["SPEAKING_MONOLOGUE", "SPEAKING_OPINION", "SPEAKING_ROLE_PLAY"] as ItemFormat[]);

    case "WRITING":
      if (early) return cycleOf(["WRITING_STORY", "WRITING_EMAIL"] as ItemFormat[]);
      if (mid)   return cycleOf(["WRITING_EMAIL", "WRITING_ESSAY", "WRITING_STORY"] as ItemFormat[]);
      return cycleOf(["WRITING_ESSAY", "WRITING_REPORT", "WRITING_SUMMARY"] as ItemFormat[]);

    default:
      return "MULTIPLE_CHOICE_SINGLE";
  }
}

// ─── Topic Pool ────────────────────────────────────────────────────────────────
// 40 culturally neutral, globally accessible topics grouped by domain.
// Rotated cyclically to ensure lexical diversity across the item bank.
const TOPIC_POOL_BY_SKILL: Record<string, string[]> = {
  GRAMMAR: [
    "Daily routines and habits", "Shopping and money", "Travel and holidays",
    "Food and cooking", "Family and relationships", "Health and lifestyle",
    "Work and careers", "Education and learning", "Technology and devices",
    "Nature and environment", "Housing and neighbourhoods", "Sport and fitness",
    "Transport and infrastructure", "Media and communication", "Science and discovery",
  ],
  VOCABULARY: [
    "Animals and nature", "Colours and shapes", "Clothes and fashion",
    "Music and art", "Numbers and time", "Weather and seasons",
    "City life and places", "Jobs and responsibilities", "Food and restaurants",
    "Travel and transport", "Health and medicine", "Online communication",
    "Climate and energy", "Business and economics", "History and culture",
  ],
  READING: [
    "Urban green spaces and wellbeing", "Sustainable agriculture", "Remote work trends",
    "Renewable energy solutions", "Public library services", "Community volunteering",
    "Cultural exchange programmes", "Ocean conservation", "Digital literacy",
    "Space exploration initiatives", "Traditional crafts revival", "Urban mobility",
    "Global health challenges", "Youth entrepreneurship", "Museum accessibility",
  ],
  LISTENING: [
    "A radio interview about community gardens", "A podcast on digital minimalism",
    "A lecture on climate adaptation", "A tour guide describing a city landmark",
    "A conversation about career changes", "A health programme about sleep",
    "A documentary on ocean wildlife", "A business meeting summary",
    "A travel tip segment on sustainable tourism", "An educational talk on renewable energy",
    "A student discussing study habits", "A discussion on public transport improvements",
    "A science report on biodiversity", "An interview with a chef", "A talk on online learning",
  ],
  SPEAKING: [
    "Describe a memorable journey", "Talk about your daily exercise routine",
    "Describe a skill you would like to learn", "Compare city life and countryside living",
    "Discuss the benefits of learning a foreign language", "Describe a local community event",
    "Talk about a book or film that impressed you", "Discuss the impact of technology on daily life",
    "Describe your ideal workplace", "Talk about environmental challenges in your region",
    "Discuss the role of education in society", "Describe a cultural tradition you find interesting",
    "Talk about teamwork and collaboration", "Discuss the future of remote work",
    "Describe a volunteer experience or community project",
  ],
  WRITING: [
    "An email to a friend about a recent trip", "A formal letter to a local council",
    "An essay on the advantages of public transport", "A report on workplace diversity",
    "A story about an unexpected discovery", "An article about sustainable living",
    "An email requesting information about a course", "An essay on digital communication",
    "A report on youth participation in sport", "A story about a community project",
    "A formal proposal for a new service", "An essay on the value of arts education",
    "An email of complaint about a service", "A report on local environmental issues",
    "An essay on the relationship between technology and wellbeing",
  ],
};

// ─── ItemType Mapping ─────────────────────────────────────────────────────────
// Maps ItemFormat → Prisma ItemType enum
function toPrismaItemType(format: ItemFormat): string {
  if (["SPEAKING_MONOLOGUE", "SPEAKING_IMAGE", "SPEAKING_OPINION", "SPEAKING_ROLE_PLAY"].includes(format)) {
    return "SPEAKING_PROMPT";
  }
  if (["WRITING_EMAIL", "WRITING_ESSAY", "WRITING_REPORT", "WRITING_STORY", "WRITING_SUMMARY"].includes(format)) {
    return "WRITING_PROMPT";
  }
  if (["DRAG_DROP", "ORDERING", "MATCHING"].includes(format)) {
    return "DRAG_DROP";
  }
  if (["GAP_FILL_OPEN", "GAP_FILL_CLOSED", "SHORT_ANSWER", "WORD_FORMATION",
       "SUMMARY_COMPLETION", "SENTENCE_INSERTION", "CLOZE_PASSAGE"].includes(format)) {
    return "FILL_IN_BLANKS";
  }
  // MULTIPLE_CHOICE_SINGLE, MULTIPLE_CHOICE_MULTI, TRUE_FALSE_NOT_GIVEN,
  // HEADING_MATCHING, → MULTIPLE_CHOICE
  return "MULTIPLE_CHOICE";
}

// ─── Content Schema Builder ───────────────────────────────────────────────────
// Converts the AIItemGenerator output to the DB content JSON schema.
function buildContentJson(item: any, format: ItemFormat, skill: string): Record<string, unknown> {
  const isListening = skill === "LISTENING";
  const isSpeaking  = skill === "SPEAKING";
  const isWriting   = skill === "WRITING";

  // Build options array in [{id, text}] format if present
  let options: { id: string; text: string }[] | undefined;
  if (Array.isArray(item.options) && item.options.length > 0) {
    options = item.options.map((opt: unknown, i: number) => {
      if (typeof opt === "string") return { id: String.fromCharCode(65 + i), text: opt };
      if (typeof opt === "object" && opt !== null) {
        const o = opt as any;
        return { id: o.id ?? String.fromCharCode(65 + i), text: o.text ?? String(opt) };
      }
      return { id: String.fromCharCode(65 + i), text: String(opt) };
    });
  }

  const base: Record<string, unknown> = {
    prompt: item.question ?? item.stimulus ?? "",
    passage: (skill === "READING" || skill === "LISTENING") ? (item.stimulus ?? "") : undefined,
  };

  if (isListening) {
    const moduleId = `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    base.moduleId   = moduleId;
    base.ttsScript  = item.stimulus ?? item.question ?? "";
    base.ttsSettings = {
      languageCode: "en-GB",
      voiceName: pickTtsVoice(),
      speakingRate: 0.92, // ~140 wpm — natural conversational pace
      pitch: 0.0,
    };
  }

  if (options) base.options = options;

  if (item.correctAnswer) {
    base.correctAnswer = item.correctAnswer;
  }
  if (Array.isArray(item.acceptableAnswers) && item.acceptableAnswers.length > 0) {
    base.acceptableAnswers = item.acceptableAnswers;
  }

  if (isSpeaking || isWriting) {
    base.rubric = item.writingNotes
      ?? buildDefaultRubric(skill, item.cefrLevel ?? "B1");
    if (isWriting) {
      base.wordCount = buildWordCountRange(item.cefrLevel ?? "B1", format);
    }
    if (isSpeaking) {
      base.timeLimitSeconds = buildSpeakingTime(item.cefrLevel ?? "B1", format);
    }
  }

  if (item.distractorRationale) {
    base.distractorRationale = item.distractorRationale;
  }
  if (item.biasReview) {
    base.biasReview = item.biasReview;
  }

  // Strip undefined fields
  return Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined));
}

// Rotate through authentic English accent voices for listening items.
// Simulates natural exposure to BrE, AmE, AusE — per CEFR listening construct.
const TTS_VOICES = [
  "en-GB-Neural2-B",   // British male
  "en-GB-Neural2-C",   // British female
  "en-US-Neural2-D",   // American male
  "en-US-Neural2-F",   // American female
  "en-AU-Neural2-B",   // Australian male
  "en-AU-Neural2-C",   // Australian female
  "en-GB-Wavenet-D",   // British male (Wavenet)
  "en-US-Wavenet-H",   // American female (Wavenet)
];
let ttsVoiceIndex = 0;
function pickTtsVoice(): string {
  return TTS_VOICES[ttsVoiceIndex++ % TTS_VOICES.length];
}

// CEFR-calibrated writing word count ranges (Taylor & Galaczi 2011 benchmarks)
function buildWordCountRange(level: string, format: ItemFormat): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    PRE_A1: { min: 20,  max: 40  },
    A1:     { min: 30,  max: 60  },
    A2:     { min: 60,  max: 100 },
    B1:     { min: 100, max: 160 },
    B2:     { min: 180, max: 260 },
    C1:     { min: 220, max: 320 },
    C2:     { min: 280, max: 400 },
  };
  const base = ranges[level] ?? { min: 100, max: 200 };
  if (format === "WRITING_REPORT" || format === "WRITING_ESSAY") {
    return { min: base.min, max: Math.round(base.max * 1.3) };
  }
  return base;
}

// Speaking time limits per CEFR — aligned with B4Skills test spec
function buildSpeakingTime(level: string, format: ItemFormat): number {
  const times: Record<string, number> = {
    PRE_A1: 20, A1: 30, A2: 45, B1: 60, B2: 90, C1: 120, C2: 150,
  };
  const base = times[level] ?? 60;
  if (format === "SPEAKING_MONOLOGUE") return Math.round(base * 1.5);
  return base;
}

// Holistic rubric aligned with CEFR analytic scales.
// Writing: Task Achievement | Coherence/Cohesion | Lexical Resource | Grammatical Range & Accuracy
// Speaking: Range | Accuracy | Fluency | Interaction | Coherence
function buildDefaultRubric(skill: string, level: string): string {
  if (skill === "WRITING") {
    return JSON.stringify({
      criteria: ["Task Achievement", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy"],
      scale: "0–5 per criterion (total 20)",
      cefrBenchmark: level,
      notes: "Score holistically using CEFR can-do descriptors for the target level.",
    });
  }
  // SPEAKING
  return JSON.stringify({
    criteria: ["Grammatical Range & Accuracy", "Lexical Resource", "Fluency & Coherence", "Pronunciation"],
    scale: "0–5 per criterion (total 20)",
    cefrBenchmark: level,
    notes: "Rate the overall spoken performance against CEFR descriptors. Use calibration samples.",
  });
}

// ─── Tags Builder ─────────────────────────────────────────────────────────────
function buildTags(skill: string, level: string, format: ItemFormat, topicIndex: number): string[] {
  return [
    `skill:${skill.toLowerCase()}`,
    `level:${level.toLowerCase()}`,
    `format:${format.toLowerCase()}`,
    `topic_idx:${topicIndex}`,
    "source:aig-expansion-2025",
  ];
}

// ─── IRT Parameter Validation & Normalisation ─────────────────────────────────
// Clamps generated IRT params to acceptable psychometric ranges.
// Prevents calibration drift caused by LLM over/under-estimation.
function clampIrtParams(
  params: { a: number; b: number; c: number },
  level: string,
  isConstructedResponse: boolean,
): { discrimination: number; difficulty: number; guessing: number } {
  const norms = CEFR_IRT_TARGETS[level] ?? CEFR_IRT_TARGETS["B1"];
  const tolerance = 1.2; // allow ±1.2 logits around target b

  return {
    discrimination: Math.min(norms.aMax, Math.max(norms.aMin, isNaN(params.a) ? (norms.aMin + norms.aMax) / 2 : params.a)),
    difficulty: Math.min(norms.b + tolerance, Math.max(norms.b - tolerance, isNaN(params.b) ? norms.b : params.b)),
    guessing: isConstructedResponse ? 0.0 : Math.min(0.25, Math.max(0.0, isNaN(params.c) ? norms.c_mc : params.c)),
  };
}

// ─── Generation Cell ──────────────────────────────────────────────────────────
interface Cell {
  skill: string;
  level: string;
  current: number;
  target: number;
  deficit: number;
}

async function getCurrentCounts(): Promise<Map<string, number>> {
  const rows = await prisma.item.groupBy({
    by: ["skill", "cefrLevel"],
    where: { status: { in: ["ACTIVE", "PRETEST"] } },
    _count: { id: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(`${row.skill}__${row.cefrLevel}`, row._count.id);
  }
  return counts;
}

function buildCells(counts: Map<string, number>): Cell[] {
  const cells: Cell[] = [];
  for (const [skill, levelTargets] of Object.entries(EXPANSION_TARGETS)) {
    if (FILTER_SKILL && skill !== FILTER_SKILL) continue;
    for (const [level, target] of Object.entries(levelTargets)) {
      if (FILTER_LEVEL && level !== FILTER_LEVEL) continue;
      const current = counts.get(`${skill}__${level}`) ?? 0;
      const deficit = Math.max(0, target - current);
      cells.push({ skill, level, current, target, deficit });
    }
  }
  // Sort: highest deficit first (prioritises weakest cells)
  return cells.sort((a, b) => b.deficit - a.deficit);
}

// ─── Single Batch Generator ───────────────────────────────────────────────────
async function generateBatch(
  cell: Cell,
  batchIndex: number,
  batchSize: number,
): Promise<number> {
  const { skill, level } = cell;
  const format = pickFormat(skill, level, batchIndex);
  const topics = TOPIC_POOL_BY_SKILL[skill] ?? TOPIC_POOL_BY_SKILL["GRAMMAR"];
  const topicIndex = batchIndex % topics.length;
  const topic = topics[topicIndex];

  const spec: ItemGenerationSpec = {
    skill: skill as any,
    level: level as any,
    format: format as any,
    topic,
    quantity: batchSize,
    language: "en-GB",
  };

  const result = await generator.generate(spec);

  let saved = 0;
  for (const item of result.items) {
    try {
      // Apply quality gate
      const qaScore = item.qualityReport?.qualityScore ?? 0;
      if (qaScore < MIN_QA_SCORE) {
        console.log(`    [SKIP] QA score too low: ${qaScore} < ${MIN_QA_SCORE}`);
        log({ event: "item_skip_qa", skill, level, format, qaScore, reason: "below_threshold" });
        continue;
      }

      const isConstructedResponse = ["SPEAKING_PROMPT", "WRITING_PROMPT"].includes(toPrismaItemType(format));
      const irtParams = clampIrtParams(
        item.irtParams ?? { a: 1.2, b: CEFR_IRT_TARGETS[level]?.b ?? 0, c: 0.2 },
        level,
        isConstructedResponse,
      );
      const content = buildContentJson(item, format, skill);
      const tags = buildTags(skill, level, format, topicIndex);

      if (DRY_RUN) {
        console.log(`    [DRY_RUN] Would save: ${skill}/${level}/${format} QA=${qaScore}`);
        saved++;
        continue;
      }

      await prisma.item.create({
        data: {
          type: toPrismaItemType(format) as any,
          skill: skill as any,
          cefrLevel: level as any,
          discrimination: irtParams.discrimination,
          difficulty: irtParams.difficulty,
          guessing: irtParams.guessing,
          content: content as any,
          tags,
          status: "PRETEST",
          isPretest: true,
          metadata: {
            generatedBy: "aig-expansion-2025",
            generationModel: "gemini-2.5-flash (3-persona pipeline)",
            format,
            topic,
            qaScore,
            qaStatus: item.qualityReport?.status ?? "UNKNOWN",
            totalGenerationPasses: item.totalGenerationPasses ?? 1,
            reviewVerdict: item.itemReview?.overallVerdict ?? "N/A",
            cefrAlignmentScore: item.itemReview?.cefrAlignmentScore ?? null,
            constructClarity: item.itemReview?.constructClarity ?? null,
            readabilityScore: item.readabilityScore ?? null,
            expandedAt: new Date().toISOString(),
          },
        },
      });

      saved++;
      log({ event: "item_saved", skill, level, format, topic, qaScore, irtParams });
    } catch (err) {
      console.error(`    [ERROR] Saving item failed: ${String(err)}`);
      log({ event: "item_save_error", skill, level, format, error: String(err) });
    }
  }

  return saved;
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt Item Bank Expansion — CEFR-Psychometric Grade AIG");
  console.log("=".repeat(70));
  console.log(`  Mode:       ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE"}`);
  console.log(`  Batch size: ${BATCH_SIZE} items per API call`);
  console.log(`  Min QA:     ${MIN_QA_SCORE}/100`);
  console.log(`  Delay:      ${DELAY_MS}ms between calls`);
  if (FILTER_SKILL) console.log(`  Filter:     SKILL=${FILTER_SKILL}${FILTER_LEVEL ? ` LEVEL=${FILTER_LEVEL}` : ""}`);
  console.log(`  Log:        ${logFile}`);
  console.log("=".repeat(70));

  const counts = await getCurrentCounts();
  const cells = buildCells(counts);

  // Summary table
  let totalDeficit = 0;
  console.log("\n  DEFICIT ANALYSIS (highest priority first):\n");
  console.log("  Skill       | Level  | Current | Target | Need");
  console.log("  ------------|--------|---------|--------|-----");
  for (const c of cells) {
    if (c.deficit > 0) {
      totalDeficit += c.deficit;
      console.log(
        `  ${c.skill.padEnd(11)} | ${c.level.padEnd(6)} | ${String(c.current).padStart(7)} | ${String(c.target).padStart(6)} | +${c.deficit}`
      );
    }
  }
  console.log(`\n  TOTAL ITEMS TO GENERATE: ${totalDeficit}`);
  console.log(`  ESTIMATED API CALLS: ~${Math.ceil(totalDeficit / BATCH_SIZE)}`);
  console.log(`  ESTIMATED TIME: ~${Math.round((totalDeficit / BATCH_SIZE * (DELAY_MS + 15000)) / 60000)} minutes\n`);

  if (DRY_RUN) {
    console.log("  [DRY_RUN] Exiting without generating. Remove DRY_RUN=1 to run.\n");
    await prisma.$disconnect();
    return;
  }

  log({ event: "run_start", totalDeficit, filters: { FILTER_SKILL, FILTER_LEVEL }, batchSize: BATCH_SIZE });

  let totalSaved = 0;
  let totalAttempted = 0;

  for (const cell of cells) {
    if (cell.deficit <= 0) continue;

    console.log(`\n► ${cell.skill} / ${cell.level}  (need +${cell.deficit}, have ${cell.current}/${cell.target})`);
    log({ event: "cell_start", skill: cell.skill, level: cell.level, deficit: cell.deficit });

    let cellSaved = 0;
    let batchIndex = 0;

    while (cellSaved < cell.deficit) {
      const remaining = cell.deficit - cellSaved;
      const batchSize = Math.min(BATCH_SIZE, remaining);

      process.stdout.write(`  Batch ${batchIndex + 1} (${batchSize} items)... `);

      try {
        const saved = await generateBatch(cell, batchIndex, batchSize);
        cellSaved += saved;
        totalSaved += saved;
        totalAttempted += batchSize;
        process.stdout.write(`saved ${saved}/${batchSize}. Total: ${cellSaved}/${cell.deficit}\n`);

        if (saved === 0) {
          consecutiveZeroSaves++;
          if (consecutiveZeroSaves >= MAX_CONSECUTIVE_ZERO) {
            quotaExhausted = true;
            console.log("\n  [QUOTA] Gemini API günlük kotası aşıldı (10,000 istek/gün).");
            console.log("  [QUOTA] ~18 saat sonra yeniden çalıştırın: SKILL=" + cell.skill);
            log({ event: "quota_exhausted", skill: cell.skill, level: cell.level, savedSoFar: totalSaved });
            break;
          }
        } else {
          consecutiveZeroSaves = 0;
        }
      } catch (err) {
        process.stdout.write(`ERROR: ${String(err).slice(0, 80)}\n`);
        log({ event: "batch_error", skill: cell.skill, level: cell.level, batchIndex, error: String(err) });
      }

      batchIndex++;
      if (quotaExhausted) break;
      if (cellSaved < cell.deficit) await sleep(DELAY_MS);
    }

    console.log(`  ✓ ${cell.skill}/${cell.level}: ${cellSaved} items saved.`);
    log({ event: "cell_done", skill: cell.skill, level: cell.level, saved: cellSaved });

    if (quotaExhausted) break;
  }

  console.log("\n" + "=".repeat(70));
  console.log(`  EXPANSION COMPLETE`);
  console.log(`  Items saved: ${totalSaved} / ${totalAttempted} attempted`);
  console.log(`  Success rate: ${totalAttempted > 0 ? Math.round((totalSaved / totalAttempted) * 100) : 0}%`);
  console.log(`  Log: ${logFile}`);
  console.log("=".repeat(70));
  console.log("\n  NOTE: All items are in PRETEST status. They will be automatically");
  console.log("  activated after collecting ≥50 responses and passing IRT calibration.\n");

  log({ event: "run_complete", totalSaved, totalAttempted });
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("[FATAL]", err);
  log({ event: "fatal_error", error: String(err) });
  process.exit(1);
});
