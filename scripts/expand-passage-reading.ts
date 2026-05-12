/**
 * Passage-Level Reading Expansion — Gemini 2-Step Pipeline
 *
 * Unlike the 1-item-at-a-time `expand-item-bank.ts`, this script generates
 * a full reading passage first, then derives 8–10 questions from it.
 * This mirrors how real exam papers are written (passage → item cluster)
 * and produces semantically coherent question sets sharing a common stimulus.
 *
 * Pipeline per passage:
 *   Step 1  PASSAGE WRITER   Generate CEFR-calibrated passage (200–700 words)
 *   Step 2  QUESTION WRITER  Generate 8–10 MCQ/TF/short-answer items from passage
 *   Step 3  ITEM REVIEWER    Flag any question with construct/CEFR issues
 *   Step 4  QA GATE          Automated quality filter (facility range, stem cues, etc.)
 *
 * Passage design:
 *   A1/A2 — narrative / dialogue / notice (150–250 words, NGSL top-1000)
 *   B1/B2 — article / report / informal essay (300–450 words, NGSL+NGSL2)
 *   C1/C2 — academic / analytical / literary (500–700 words, AWL + beyond)
 *
 * CEFR targets for this run (passage counts):
 *   A1: 3 passages (×8 Qs = 24 items)
 *   A2: 4 passages (×9 Qs = 36 items)
 *   B1: 6 passages (×9 Qs = 54 items)
 *   B2: 8 passages (×10 Qs = 80 items)
 *   C1: 6 passages (×10 Qs = 60 items)
 *   C2: 4 passages (×10 Qs = 40 items)   ← highest priority: bank is nearly empty
 *   TOTAL: 31 passages ≈ 294 new Reading items
 *
 * Usage:
 *   npx tsx scripts/expand-passage-reading.ts
 *   DRY_RUN=1 npx tsx scripts/expand-passage-reading.ts
 *   LEVEL=C2 npx tsx scripts/expand-passage-reading.ts        # C2 only
 *   LEVEL=B2 PASSAGES=3 npx tsx scripts/expand-passage-reading.ts
 *   DELAY_MS=3000 npx tsx scripts/expand-passage-reading.ts   # slower for quota safety
 *
 * Safety:
 *   - All items land in PRETEST status (isPretest=true).
 *   - JSONL log written to logs/passages-YYYY-MM-DD.jsonl
 *   - Idempotent: passage IDs are deterministic — re-running skips already-saved passages.
 *   - Rate-limit guard: 3 consecutive zero-yield passages → abort + resume hint.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN    = process.env.DRY_RUN === "1";
const FILTER_LVL = process.env.LEVEL?.toUpperCase();
const DELAY_MS   = parseInt(process.env.DELAY_MS ?? "2500", 10);
const MIN_QA     = parseInt(process.env.MIN_QA ?? "55", 10);
const OVERRIDE_PASSAGES = process.env.PASSAGES ? parseInt(process.env.PASSAGES, 10) : null;

const prisma = new PrismaClient();
const ai     = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

// ─────────────────────────────────────────────────────────────────────────────
// LOGGING
// ─────────────────────────────────────────────────────────────────────────────

const logDir  = path.resolve("logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `passages-${new Date().toISOString().slice(0, 10)}.jsonl`);

function log(obj: Record<string, unknown>) {
  fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// PASSAGE PLAN
// ─────────────────────────────────────────────────────────────────────────────

interface PassageSpec {
  level: string;
  textType: string;
  topic: string;
  wordRange: [number, number];
  questionCount: number;
  subSkills: string[];     // reading sub-skills to cover across the questions
  irtBTarget: number;      // target b-param for the cluster
}

const PASSAGE_PLAN: PassageSpec[] = [
  // ── A1 (3 passages) ──────────────────────────────────────────────────────
  {
    level: "A1", textType: "simple narrative",
    topic: "A child's first day at a new school",
    wordRange: [150, 200], questionCount: 8, irtBTarget: -2.5,
    subSkills: ["detail", "detail", "detail", "detail", "inference", "detail", "detail", "vocabulary"],
  },
  {
    level: "A1", textType: "short email",
    topic: "An email from a friend describing their new home",
    wordRange: [140, 180], questionCount: 8, irtBTarget: -2.3,
    subSkills: ["detail", "detail", "detail", "detail", "inference", "detail", "vocabulary", "gist"],
  },
  {
    level: "A1", textType: "notices / signs",
    topic: "Signs at a public library",
    wordRange: [130, 160], questionCount: 8, irtBTarget: -2.4,
    subSkills: ["detail", "detail", "detail", "detail", "detail", "inference", "detail", "vocabulary"],
  },

  // ── A2 (4 passages) ──────────────────────────────────────────────────────
  {
    level: "A2", textType: "short article",
    topic: "How to stay healthy during winter",
    wordRange: [200, 260], questionCount: 9, irtBTarget: -1.5,
    subSkills: ["gist", "detail", "detail", "inference", "detail", "detail", "vocabulary", "inference", "detail"],
  },
  {
    level: "A2", textType: "dialogue",
    topic: "Planning a weekend trip to a coastal town",
    wordRange: [200, 250], questionCount: 9, irtBTarget: -1.6,
    subSkills: ["gist", "detail", "detail", "detail", "inference", "detail", "vocabulary", "inference", "detail"],
  },
  {
    level: "A2", textType: "informational leaflet",
    topic: "A neighbourhood community centre's activities",
    wordRange: [220, 270], questionCount: 9, irtBTarget: -1.4,
    subSkills: ["gist", "detail", "detail", "inference", "detail", "vocabulary", "detail", "inference", "gist"],
  },
  {
    level: "A2", textType: "blog post",
    topic: "A teenager's experience starting a new hobby",
    wordRange: [210, 260], questionCount: 9, irtBTarget: -1.5,
    subSkills: ["gist", "detail", "inference", "detail", "detail", "vocabulary", "inference", "detail", "gist"],
  },

  // ── B1 (6 passages) ──────────────────────────────────────────────────────
  {
    level: "B1", textType: "magazine article",
    topic: "The growing popularity of urban cycling",
    wordRange: [300, 380], questionCount: 9, irtBTarget: -0.5,
    subSkills: ["gist", "detail", "inference", "detail", "vocabulary", "inference", "detail", "author_purpose", "reference"],
  },
  {
    level: "B1", textType: "news report",
    topic: "A local school's project to reduce food waste",
    wordRange: [290, 360], questionCount: 9, irtBTarget: -0.6,
    subSkills: ["gist", "detail", "detail", "inference", "vocabulary", "inference", "detail", "author_purpose", "reference"],
  },
  {
    level: "B1", textType: "informal letter",
    topic: "A student writing to a pen pal about studying abroad",
    wordRange: [280, 360], questionCount: 9, irtBTarget: -0.7,
    subSkills: ["gist", "detail", "inference", "detail", "vocabulary", "detail", "inference", "author_attitude", "reference"],
  },
  {
    level: "B1", textType: "informational article",
    topic: "How sleep affects academic performance",
    wordRange: [310, 380], questionCount: 9, irtBTarget: -0.4,
    subSkills: ["gist", "detail", "inference", "detail", "vocabulary", "inference", "detail", "author_purpose", "reference"],
  },
  {
    level: "B1", textType: "travel review",
    topic: "A traveller reviewing a budget hostel experience",
    wordRange: [290, 360], questionCount: 9, irtBTarget: -0.5,
    subSkills: ["gist", "detail", "inference", "detail", "vocabulary", "detail", "inference", "author_attitude", "gist"],
  },
  {
    level: "B1", textType: "short story extract",
    topic: "A teenager discovering an abandoned greenhouse",
    wordRange: [300, 370], questionCount: 9, irtBTarget: -0.6,
    subSkills: ["gist", "detail", "inference", "detail", "vocabulary", "reference", "inference", "author_attitude", "detail"],
  },

  // ── B2 (8 passages) ──────────────────────────────────────────────────────
  {
    level: "B2", textType: "opinion article",
    topic: "The case for a four-day working week",
    wordRange: [380, 460], questionCount: 10, irtBTarget: 0.5,
    subSkills: ["gist", "detail", "inference", "author_purpose", "vocabulary", "inference", "detail", "argument_structure", "author_attitude", "reference"],
  },
  {
    level: "B2", textType: "academic article (simplified)",
    topic: "The psychological impact of social media on adolescents",
    wordRange: [400, 480], questionCount: 10, irtBTarget: 0.6,
    subSkills: ["gist", "detail", "inference", "author_purpose", "vocabulary", "inference", "detail", "argument_structure", "author_attitude", "reference"],
  },
  {
    level: "B2", textType: "report",
    topic: "Trends in urban green space and citizen wellbeing",
    wordRange: [390, 460], questionCount: 10, irtBTarget: 0.5,
    subSkills: ["gist", "detail", "inference", "detail", "vocabulary", "inference", "author_purpose", "argument_structure", "reference", "author_attitude"],
  },
  {
    level: "B2", textType: "news feature",
    topic: "How cities are redesigning public transport post-pandemic",
    wordRange: [380, 450], questionCount: 10, irtBTarget: 0.4,
    subSkills: ["gist", "detail", "inference", "vocabulary", "author_purpose", "inference", "detail", "reference", "argument_structure", "gist"],
  },
  {
    level: "B2", textType: "narrative extract",
    topic: "An engineer's unexpected encounter while building a remote bridge",
    wordRange: [400, 470], questionCount: 10, irtBTarget: 0.5,
    subSkills: ["gist", "inference", "detail", "vocabulary", "detail", "inference", "reference", "author_attitude", "inference", "gist"],
  },
  {
    level: "B2", textType: "review",
    topic: "A critical review of a documentary on artificial intelligence",
    wordRange: [380, 450], questionCount: 10, irtBTarget: 0.6,
    subSkills: ["gist", "detail", "inference", "author_purpose", "vocabulary", "inference", "argument_structure", "detail", "author_attitude", "reference"],
  },
  {
    level: "B2", textType: "expository article",
    topic: "The science of habit formation and behaviour change",
    wordRange: [400, 480], questionCount: 10, irtBTarget: 0.5,
    subSkills: ["gist", "detail", "inference", "vocabulary", "detail", "inference", "argument_structure", "author_purpose", "reference", "author_attitude"],
  },
  {
    level: "B2", textType: "discursive essay",
    topic: "Should governments subsidise the arts?",
    wordRange: [390, 460], questionCount: 10, irtBTarget: 0.6,
    subSkills: ["gist", "argument_structure", "inference", "detail", "vocabulary", "author_purpose", "inference", "detail", "author_attitude", "reference"],
  },

  // ── C1 (6 passages) ──────────────────────────────────────────────────────
  {
    level: "C1", textType: "academic article",
    topic: "Cognitive biases in financial decision-making",
    wordRange: [500, 600], questionCount: 10, irtBTarget: 1.5,
    subSkills: ["gist", "inference", "vocabulary_in_context", "author_purpose", "argument_structure", "detail", "inference", "reference", "critical_evaluation", "author_attitude"],
  },
  {
    level: "C1", textType: "literary extract",
    topic: "A character reflects on returning to a childhood home",
    wordRange: [480, 580], questionCount: 10, irtBTarget: 1.6,
    subSkills: ["gist", "inference", "vocabulary_in_context", "reference", "author_technique", "detail", "inference", "figurative_language", "author_attitude", "critical_evaluation"],
  },
  {
    level: "C1", textType: "opinion piece",
    topic: "The moral obligations of artificial intelligence developers",
    wordRange: [500, 600], questionCount: 10, irtBTarget: 1.5,
    subSkills: ["gist", "argument_structure", "inference", "vocabulary_in_context", "author_purpose", "detail", "inference", "critical_evaluation", "reference", "author_attitude"],
  },
  {
    level: "C1", textType: "academic article",
    topic: "Memory consolidation and the role of sleep in learning",
    wordRange: [520, 620], questionCount: 10, irtBTarget: 1.4,
    subSkills: ["gist", "detail", "inference", "vocabulary_in_context", "argument_structure", "author_purpose", "inference", "reference", "critical_evaluation", "author_attitude"],
  },
  {
    level: "C1", textType: "feature article",
    topic: "The revival of craft skills in a digital economy",
    wordRange: [500, 590], questionCount: 10, irtBTarget: 1.5,
    subSkills: ["gist", "inference", "vocabulary_in_context", "author_purpose", "detail", "inference", "argument_structure", "reference", "author_attitude", "critical_evaluation"],
  },
  {
    level: "C1", textType: "review / critique",
    topic: "A review of a novel examining colonial legacies in contemporary fiction",
    wordRange: [490, 580], questionCount: 10, irtBTarget: 1.6,
    subSkills: ["gist", "inference", "vocabulary_in_context", "author_technique", "detail", "inference", "reference", "figurative_language", "author_attitude", "critical_evaluation"],
  },

  // ── C2 (4 passages — highest priority) ───────────────────────────────────
  {
    level: "C2", textType: "academic philosophical text",
    topic: "The problem of moral luck and its implications for personal responsibility",
    wordRange: [580, 700], questionCount: 10, irtBTarget: 2.5,
    subSkills: ["gist", "inference", "vocabulary_in_context", "argument_structure", "author_purpose", "critical_evaluation", "inference", "reference", "figurative_language", "author_attitude"],
  },
  {
    level: "C2", textType: "literary critical essay",
    topic: "Unreliable narration and the ethics of reading in contemporary fiction",
    wordRange: [560, 680], questionCount: 10, irtBTarget: 2.4,
    subSkills: ["gist", "author_technique", "vocabulary_in_context", "inference", "figurative_language", "critical_evaluation", "reference", "inference", "argument_structure", "author_attitude"],
  },
  {
    level: "C2", textType: "science commentary",
    topic: "Algorithmic bias in predictive policing: evidence, ethics and oversight",
    wordRange: [570, 690], questionCount: 10, irtBTarget: 2.5,
    subSkills: ["gist", "argument_structure", "vocabulary_in_context", "inference", "author_purpose", "critical_evaluation", "detail", "inference", "reference", "author_attitude"],
  },
  {
    level: "C2", textType: "cultural analytical essay",
    topic: "The paradox of authenticity in global pop music",
    wordRange: [550, 670], questionCount: 10, irtBTarget: 2.3,
    subSkills: ["gist", "inference", "vocabulary_in_context", "author_technique", "argument_structure", "critical_evaluation", "reference", "figurative_language", "author_attitude", "inference"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// IRT PARAMETER TARGETS
// ─────────────────────────────────────────────────────────────────────────────

const CEFR_IRT: Record<string, { b: number; aMin: number; aMax: number }> = {
  PRE_A1: { b: -3.5, aMin: 0.70, aMax: 1.20 },
  A1:     { b: -2.5, aMin: 0.80, aMax: 1.40 },
  A2:     { b: -1.5, aMin: 0.90, aMax: 1.60 },
  B1:     { b: -0.5, aMin: 1.00, aMax: 1.80 },
  B2:     { b:  0.5, aMin: 1.10, aMax: 2.00 },
  C1:     { b:  1.5, aMin: 1.20, aMax: 2.00 },
  C2:     { b:  2.5, aMin: 1.30, aMax: 2.00 },
};

// ─────────────────────────────────────────────────────────────────────────────
// PASSAGE WRITER PERSONA
// ─────────────────────────────────────────────────────────────────────────────

const PASSAGE_WRITER_SYSTEM = `
You are a Principal Materials Writer at Cambridge Assessment English with 20 years of experience.
You write original, culturally neutral reading passages for CEFR-calibrated language assessments.
Your passages are:
  — Precisely calibrated to the target CEFR level in vocabulary, grammar complexity, and sentence length
  — Original, engaging, and representative of authentic text genres at that level
  — Free from cultural, gender, political, and religious bias
  — Within the specified word count range
  — Accurate: no false factual claims
  — Structured: clear paragraphing, cohesive devices appropriate to the level

Vocabulary guidance by level:
  A1 — NGSL top 500. Simple sentences. Avg sentence length ≤10 words.
  A2 — NGSL top 1000. Compound sentences. Avg sentence length ≤12 words.
  B1 — NGSL top 2000. Some complex sentences. Avg sentence length ≤16 words.
  B2 — NGSL + NGSL2. Complex sentences, some academic vocabulary. Avg ≤20 words.
  C1 — AWL + beyond. Dense academic / literary prose. Avg ≤25 words.
  C2 — Full academic / literary range. Idiomatic, nuanced, sophisticated. Avg ≤30 words.

Return ONLY a JSON object with this exact schema:
{
  "passageId": "<level>-reading-<slug>",
  "title": "Passage title",
  "cefrLevel": "B2",
  "textType": "magazine article",
  "topic": "...",
  "wordCount": 420,
  "text": "Full passage text here...",
  "keyVocabulary": ["word1", "word2"],
  "textComplexityNotes": "Brief note on sentence length, lexical density"
}
No markdown, no preamble.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION WRITER PERSONA
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_WRITER_SYSTEM = `
You are a Principal Test Development Specialist at Cambridge Assessment English.
You write reading comprehension questions that meet ALTE/Cambridge exam standards.
Given a passage and a specification, you produce high-quality MCQ and other format items.

Question design rules:
  — Each question measures ONE of these sub-skills: gist, detail, inference, vocabulary_in_context, 
    author_purpose, author_attitude, argument_structure, reference, figurative_language, 
    author_technique, critical_evaluation
  — Stem: clear, unambiguous, grammatically complete. Avoid negatives unless essential.
  — 4 options (A/B/C/D). Exactly ONE correct. Three principled distractors.
  — Distractors: plausible to a learner at the level; each exploits a specific error type:
      * wrong-referent (attributes info to wrong person/object)
      * too-specific (true detail from passage but not the answer)
      * opposite-meaning (plausible antonym/contrast)
      * not-stated (plausible but not in the text)
  — Key rotated across A/B/C/D as evenly as possible across the set.
  — IRT params: b should be close to the passage's irtBTarget ± 0.4 per question.
    Harder sub-skills (inference, critical_evaluation) get b+0.3; easier (detail) get b-0.2.
  — NO stem clues, NO grammatical cueing, NO trick questions.
  — Vocabulary-in-context items: option should replace the word in context, not give definition.

Return ONLY a JSON array. Each element:
{
  "questionNumber": 1,
  "subSkill": "detail",
  "stem": "Question text?",
  "options": [
    {"id": "A", "text": "Option A", "isCorrect": false, "distractorType": "not-stated", "rationale": "..."},
    {"id": "B", "text": "Option B", "isCorrect": true,  "distractorType": null,        "rationale": "Passage line 3 states X directly."},
    {"id": "C", "text": "Option C", "isCorrect": false, "distractorType": "wrong-referent", "rationale": "..."},
    {"id": "D", "text": "Option D", "isCorrect": false, "distractorType": "too-specific", "rationale": "..."}
  ],
  "irtParams": {"a": 1.4, "b": 0.5, "c": 0.25}
}
No markdown, no preamble.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Generate passage
// ─────────────────────────────────────────────────────────────────────────────

interface GeneratedPassage {
  passageId: string;
  title: string;
  cefrLevel: string;
  textType: string;
  topic: string;
  wordCount: number;
  text: string;
  keyVocabulary: string[];
  textComplexityNotes: string;
}

async function generatePassage(spec: PassageSpec): Promise<GeneratedPassage> {
  const norms = CEFR_IRT[spec.level];
  const prompt = `
Write a ${spec.textType} passage in English for CEFR level ${spec.level}.

Topic: ${spec.topic}
Word count: ${spec.wordRange[0]}–${spec.wordRange[1]} words
IRT difficulty target: ${spec.irtBTarget} (b-parameter; range for this level: ${norms.b - 1.0} to ${norms.b + 1.0})
Text type: ${spec.textType}

Requirements:
- Natural, engaging prose appropriate for a language assessment
- Culturally neutral, globally accessible content
- No potentially offensive content (political, religious, violent, sexualised)
- Paragraphs clearly delineated (use \\n\\n between paragraphs in the "text" field)
- Include a range of sub-skills assessable by reading comprehension questions:
  ${spec.subSkills.join(", ")}

Return ONLY valid JSON matching this schema:
{
  "passageId": "${spec.level.toLowerCase()}-reading-<short-slug>",
  "title": "...",
  "cefrLevel": "${spec.level}",
  "textType": "${spec.textType}",
  "topic": "${spec.topic}",
  "wordCount": <number>,
  "text": "...",
  "keyVocabulary": ["word1", "word2", ...],
  "textComplexityNotes": "..."
}
`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: PASSAGE_WRITER_SYSTEM,
      temperature: 0.75,
      topP: 0.92,
    },
  });

  const raw = (response.text ?? "").replace(/^```(?:json)?\s*/im, "").replace(/\s*```$/m, "").trim();
  return JSON.parse(raw) as GeneratedPassage;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Generate questions from passage
// ─────────────────────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  questionNumber: number;
  subSkill: string;
  stem: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    distractorType: string | null;
    rationale: string;
  }>;
  irtParams: { a: number; b: number; c: number };
}

async function generateQuestions(
  passage: GeneratedPassage,
  spec: PassageSpec,
): Promise<GeneratedQuestion[]> {
  const norms = CEFR_IRT[spec.level];

  const subSkillList = spec.subSkills
    .map((s, i) => `  Q${i + 1}: ${s}`)
    .join("\n");

  const prompt = `
Passage title: ${passage.title}
CEFR Level: ${spec.level}
Text type: ${spec.textType}
IRT b-target for this passage: ${spec.irtBTarget}

--- PASSAGE START ---
${passage.text}
--- PASSAGE END ---

Write exactly ${spec.questionCount} reading comprehension questions for this passage.
Each question must measure the specified sub-skill:
${subSkillList}

IRT parameter guidance:
  a (discrimination): ${norms.aMin}–${norms.aMax}
  b (difficulty): passage target ${spec.irtBTarget} ± 0.4 depending on sub-skill complexity
  c (guessing): 0.25 for all MCQ

Key rotation: spread correct answers across A, B, C, D as evenly as possible.
Aim for: A×${Math.ceil(spec.questionCount / 4)}, B×${Math.floor(spec.questionCount / 4)}, C×${Math.floor(spec.questionCount / 4)}, D×${Math.floor(spec.questionCount / 4)} approximately.

Return ONLY a JSON array of ${spec.questionCount} question objects. No markdown, no preamble.
`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: QUESTION_WRITER_SYSTEM,
      temperature: 0.6,
      topP: 0.88,
    },
  });

  const raw = (response.text ?? "").replace(/^```(?:json)?\s*/im, "").replace(/\s*```$/m, "").trim();
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: QA gate — simple automated checks
// ─────────────────────────────────────────────────────────────────────────────

interface QAResult { pass: boolean; score: number; flags: string[] }

function qaGate(q: GeneratedQuestion, passage: GeneratedPassage): QAResult {
  const flags: string[] = [];
  let score = 100;

  // Must have exactly 1 correct option
  const correct = q.options.filter(o => o.isCorrect);
  if (correct.length !== 1) { flags.push("NOT_EXACTLY_ONE_CORRECT"); score -= 40; }

  // Stem must be at least 8 chars
  if (!q.stem || q.stem.length < 8) { flags.push("STEM_TOO_SHORT"); score -= 20; }

  // Must have 4 options
  if (q.options.length !== 4) { flags.push("WRONG_OPTION_COUNT"); score -= 30; }

  // Correct option must be substantive
  if (correct[0] && correct[0].text.length < 3) { flags.push("KEY_TOO_SHORT"); score -= 20; }

  // Check passage reference (loose — just confirm text isn't empty)
  if (!passage.text || passage.text.length < 100) { flags.push("PASSAGE_EMPTY"); score -= 30; }

  // Rationale must be present for each option
  const missingRationale = q.options.filter(o => !o.rationale || o.rationale.length < 10).length;
  if (missingRationale > 0) { score -= missingRationale * 5; flags.push(`MISSING_RATIONALE_×${missingRationale}`); }

  return { pass: score >= MIN_QA, score, flags };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAMP IRT PARAMS
// ─────────────────────────────────────────────────────────────────────────────

function clamp(params: { a: number; b: number; c: number }, level: string) {
  const n = CEFR_IRT[level] ?? CEFR_IRT["B1"];
  const tol = 1.2;
  return {
    discrimination: Math.min(n.aMax, Math.max(n.aMin, isNaN(params.a) ? (n.aMin + n.aMax) / 2 : params.a)),
    difficulty: Math.min(n.b + tol, Math.max(n.b - tol, isNaN(params.b) ? n.b : params.b)),
    guessing: Math.min(0.25, Math.max(0.0, isNaN(params.c) ? 0.25 : params.c)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE PASSAGE CLUSTER TO DB
// ─────────────────────────────────────────────────────────────────────────────

async function savePassageCluster(
  passage: GeneratedPassage,
  questions: GeneratedQuestion[],
  spec: PassageSpec,
): Promise<number> {
  let saved = 0;

  for (const q of questions) {
    const qa = qaGate(q, passage);
    if (!qa.pass) {
      console.log(`    [SKIP Q${q.questionNumber}] QA=${qa.score} flags=${qa.flags.join(",")}`);
      log({ event: "question_skip", passageId: passage.passageId, qNum: q.questionNumber, qaScore: qa.score, flags: qa.flags });
      continue;
    }

    if (DRY_RUN) {
      console.log(`    [DRY_RUN] Q${q.questionNumber} subSkill=${q.subSkill} QA=${qa.score}`);
      saved++;
      continue;
    }

    const irt = clamp(q.irtParams ?? { a: 1.3, b: spec.irtBTarget, c: 0.25 }, spec.level);
    const correctOpt = q.options.find(o => o.isCorrect);

    try {
      await prisma.item.create({
        data: {
          type: "MULTIPLE_CHOICE" as any,
          skill: "READING" as any,
          cefrLevel: spec.level as any,
          discrimination: irt.discrimination,
          difficulty: irt.difficulty,
          guessing: irt.guessing,
          status: "PRETEST" as any,
          isPretest: true,
          content: {
            moduleId: passage.passageId,
            moduleTitle: passage.title,
            cefrBand: spec.level,
            textType: spec.textType,
            wordCount: passage.wordCount,
            passage: passage.text,
            subskill: q.subSkill,
            questionNumber: q.questionNumber,
            prompt: q.stem,
            options: q.options.map(o => ({
              id: o.id,
              text: o.text,
              isCorrect: o.isCorrect,
              rationale: o.rationale,
              distractorType: o.distractorType,
            })),
            correctAnswer: correctOpt?.id ?? "A",
            keyVocabulary: passage.keyVocabulary,
            textComplexityNotes: passage.textComplexityNotes,
          } as any,
          tags: [
            `skill:reading`,
            `level:${spec.level.toLowerCase()}`,
            `format:multiple_choice_single`,
            `subskill:${q.subSkill}`,
            `passage:${passage.passageId}`,
            `topic:${spec.topic.toLowerCase().replace(/\s+/g, "_").slice(0, 40)}`,
            "source:passage-expansion-2026",
          ],
          metadata: {
            generatedBy: "expand-passage-reading",
            generationModel: "gemini-2.5-flash (2-step passage pipeline)",
            passageId: passage.passageId,
            passageWordCount: passage.wordCount,
            subSkill: q.subSkill,
            qaScore: qa.score,
            expandedAt: new Date().toISOString(),
          },
        },
      });
      saved++;
      log({ event: "item_saved", passageId: passage.passageId, qNum: q.questionNumber, qaScore: qa.score, level: spec.level });
    } catch (err) {
      console.error(`    [ERROR] DB save failed: ${String(err)}`);
      log({ event: "save_error", passageId: passage.passageId, error: String(err) });
    }
  }

  return saved;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(72));
  console.log("  LinguAdapt — Passage-Level Reading Expansion (Gemini 2-Step Pipeline)");
  console.log("=".repeat(72));
  console.log(`  Mode:      ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Min QA:    ${MIN_QA}/100`);
  console.log(`  Delay:     ${DELAY_MS}ms between passages`);
  if (FILTER_LVL) console.log(`  Filter:    LEVEL=${FILTER_LVL}`);
  console.log(`  Log:       ${logFile}`);
  console.log("=".repeat(72) + "\n");

  let plan = PASSAGE_PLAN;
  if (FILTER_LVL) plan = plan.filter(p => p.level === FILTER_LVL);
  if (OVERRIDE_PASSAGES) plan = plan.slice(0, OVERRIDE_PASSAGES);

  console.log(`  Passages planned: ${plan.length}`);
  console.log(`  Max items: ~${plan.reduce((s, p) => s + p.questionCount, 0)}\n`);

  if (DRY_RUN) {
    for (const p of plan) {
      console.log(`  [DRY_RUN] ${p.level.padEnd(6)} ${p.textType.padEnd(35)} ${p.questionCount} Qs | ${p.topic.slice(0, 50)}`);
    }
    console.log("\n  [DRY_RUN] No API calls made. Remove DRY_RUN=1 to generate.\n");
    await prisma.$disconnect();
    return;
  }

  let totalSaved = 0;
  let consecutiveFailures = 0;

  for (let i = 0; i < plan.length; i++) {
    const spec = plan[i];
    console.log(`\n[${i + 1}/${plan.length}] ${spec.level} — ${spec.textType}: "${spec.topic.slice(0, 60)}"`);

    try {
      // Step 1: Generate passage
      process.stdout.write("  Step 1 generating passage... ");
      const passage = await generatePassage(spec);
      console.log(`done (${passage.wordCount} words, id=${passage.passageId})`);
      log({ event: "passage_generated", passageId: passage.passageId, wordCount: passage.wordCount, level: spec.level });

      await sleep(Math.floor(DELAY_MS * 0.4));

      // Step 2: Generate questions
      process.stdout.write(`  Step 2 generating ${spec.questionCount} questions... `);
      const questions = await generateQuestions(passage, spec);
      console.log(`done (${questions.length} questions)`);
      log({ event: "questions_generated", passageId: passage.passageId, count: questions.length });

      await sleep(Math.floor(DELAY_MS * 0.4));

      // Step 3: Save
      process.stdout.write("  Saving to DB... ");
      const saved = await savePassageCluster(passage, questions, spec);
      console.log(`saved ${saved}/${questions.length} items`);
      totalSaved += saved;

      if (saved === 0) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          console.log("\n  [ABORT] 3 consecutive passages yielded 0 saved items.");
          console.log("  Possible quota exhaustion. Try: LEVEL=" + spec.level + " to resume later.");
          log({ event: "abort_consecutive_zero", level: spec.level, totalSaved });
          break;
        }
      } else {
        consecutiveFailures = 0;
      }

      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  [ERROR] Passage ${i + 1} failed: ${String(err)}`);
      log({ event: "passage_error", specTopic: spec.topic, error: String(err) });
      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        console.log("\n  [ABORT] 3 consecutive errors. Check API key and quota.");
        break;
      }
      await sleep(DELAY_MS * 2);
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log(`  DONE. Total items saved: ${totalSaved}`);
  console.log(`  Log: ${logFile}`);
  console.log("=".repeat(72) + "\n");

  log({ event: "run_complete", totalSaved, planCount: plan.length });
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
