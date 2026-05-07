/**
 * Suite 100-Item Seeder
 *
 * Generates exactly 100 English assessment items split across two product lines
 * and all four receptive/structural skills.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  PRIMARY (7-10)   — Cambridge YLE style  — 40 items      │
 * │    READING     12  Cambridge Movers/Flyers A1-A2          │
 * │    LISTENING   12  Cambridge Movers/Flyers A1-A2          │
 * │    GRAMMAR      8  Cambridge Movers/Flyers A1-A2          │
 * │    VOCABULARY   8  Cambridge Starters/Movers A1-A2        │
 * ├──────────────────────────────────────────────────────────┤
 * │  JUNIOR SUITE (11-14) — TOEFL Junior + Cambridge KET/PET │
 * │                        style — 60 items                  │
 * │    READING     15  TOEFL Junior RC + Cambridge KET/PET    │
 * │    LISTENING   15  TOEFL Junior L Part 1-2                │
 * │    GRAMMAR     15  TOEFL Junior LFM Grammar + KET LFM     │
 * │    VOCABULARY  15  TOEFL Junior LFM Vocab + PET Reading   │
 * └──────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   npx tsx scripts/seed-suite-100-items.ts [--dry-run]
 *
 * The --dry-run flag builds all prompts and prints stats without calling the API.
 */

import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";

// Cambridge imports
import {
  CAMBRIDGE_EXAM_META,
  getTasksForExam,
} from "../src/lib/cambridge/cambridge-framework";
import { buildCambridgePrompt } from "../src/lib/cambridge/cambridge-prompts";

// TOEFL Junior imports
import {
  TOEFL_JUNIOR_META,
  getToeflJuniorTask,
} from "../src/lib/toefl-junior/toefl-junior-framework";
import { buildToeflJuniorPrompt } from "../src/lib/toefl-junior/toefl-junior-prompts";

// ─── Infrastructure ──────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const dryRun = process.argv.includes("--dry-run");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Batch plan ─────────────────────────────────────────────────────────────
// Each entry defines one Gemini call that returns N items.

interface BatchJob {
  /** Human-readable label for logging */
  label: string;
  /** product line tag for DB */
  productLine: "Primary (7-10)" | "Junior Suite (11-14)";
  /** Skill for DB */
  skill: "READING" | "LISTENING" | "GRAMMAR" | "VOCABULARY";
  /** How many items this call should return */
  count: number;
  /** CEFR levels to tag */
  cefrLevels: string[];
  /** The built prompt */
  prompt: string;
  /** Exam source for traceability */
  examSource: string;
  /** Whether response is set-based (needs flattening) */
  setsBased: boolean;
}

// ─── Prompt helpers ──────────────────────────────────────────────────────────

const PRIMARY_TOPICS = [
  "animals", "school", "food and drink", "sports", "colours and shapes",
  "family", "toys and games", "transport", "the home", "weather",
];

const JUNIOR_TOPICS = [
  "science and technology", "health and fitness", "school life",
  "history and social studies", "geography and environment",
  "arts and music", "nature and wildlife", "media and communication",
  "sports and competitions", "food and nutrition",
];

/**
 * Build a custom prompt for grammar items at A1/A2 level (Cambridge YLE style).
 * The cambridge-framework grammar tasks don't exist as a standalone part in YLE,
 * so we write a direct prompt.
 */
function buildPrimaryGrammarPrompt(topic: string, count: number): string {
  const grammarPoints = [
    "simple present (he/she/it -s)", "simple past (regular and irregular)",
    "present continuous (is/are + -ing)", "going to (future plans)",
    "can/can't (ability)", "have got", "there is / there are",
    "articles (a/an/the)", "prepositions of place (in/on/under/next to/between)",
    "adjectives and comparative forms (bigger/smaller/more exciting)",
    "adverbs of frequency (always/usually/sometimes/never)",
    "plural nouns (regular and irregular)", "possessives (my/his/her/their)",
    "imperatives", "question words (what/where/when/who/how/why)",
  ];
  const selected = grammarPoints
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, 6))
    .join("; ");

  return `
You are a Cambridge Young Learners (YLE) item writer generating ${count} grammar items
for children aged 7–10 (A1–A2 CEFR, Cambridge Movers/Flyers style).

FORMAT: Each item is a single sentence with ONE blank. The student chooses from
4 options (all the same lexical base but different grammatical forms).

CONTENT TOPIC: ${topic}

GRAMMAR POINTS TO COVER: ${selected}

LANGUAGE CONSTRAINTS:
- Vocabulary must be simple and appropriate for 7–10 year olds.
- Sentences must be short (max 12 words).
- Contexts should be colourful, child-friendly, and fun.
- Avoid negative sentences in stems.
- All 4 options same part of speech, roughly same length.

OUTPUT FORMAT — JSON array of ${count} items:
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "GRAMMAR",
    "cefrLevel": "<A1 or A2>",
    "difficulty": <b, -2.0 to 0.0>,
    "discrimination": <a, 0.6–1.8>,
    "guessing": 0.25,
    "content": {
      "prompt": "<sentence with ___ for the blank>",
      "options": [
        { "id": "A", "text": "..." },
        { "id": "B", "text": "..." },
        { "id": "C", "text": "..." },
        { "id": "D", "text": "..." }
      ],
      "correctAnswer": "<A/B/C/D>",
      "grammarPoint": "<specific grammar point>",
      "cambridge_style": "YLE",
      "topic": "${topic}"
    }
  }
]

Generate exactly ${count} items, each testing a DIFFERENT grammar point.
ONE correct answer only. Distractors = plausible learner errors.
`.trim();
}

/**
 * Build a vocabulary prompt for Primary (Cambridge Starters/Movers style).
 */
function buildPrimaryVocabPrompt(topic: string, count: number): string {
  return `
You are a Cambridge Young Learners (YLE) item writer generating ${count} vocabulary items
for children aged 7–10 (A1–A2 CEFR, Cambridge Starters/Movers style).

FORMAT: Picture-and-word matching OR sentence completion.
Each item: a short sentence or phrase with a blank (or underlined word), 4 options.

CONTENT TOPIC: ${topic}

LANGUAGE CONSTRAINTS:
- Target words must come from the Cambridge Starters/Movers word list (150–300 word core).
- Sentences max 10 words. Child-friendly, fun, visual contexts.
- All 4 options are the same part of speech (nouns or verbs or adjectives).
- Distractors: same semantic field, plausible substitutions that are clearly wrong.

OUTPUT FORMAT — JSON array of ${count} items:
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "VOCABULARY",
    "cefrLevel": "<A1 or A2>",
    "difficulty": <b, -2.5 to -0.5>,
    "discrimination": <a, 0.6–1.8>,
    "guessing": 0.25,
    "content": {
      "prompt": "<sentence with ___ or underlined target word>",
      "options": [
        { "id": "A", "text": "..." },
        { "id": "B", "text": "..." },
        { "id": "C", "text": "..." },
        { "id": "D", "text": "..." }
      ],
      "correctAnswer": "<A/B/C/D>",
      "targetWord": "<the vocabulary item being tested>",
      "cambridge_style": "YLE",
      "topic": "${topic}"
    }
  }
]

Generate exactly ${count} items. Each tests a different high-frequency word from the topic.
`.trim();
}

// ─── Build the 100-item plan ─────────────────────────────────────────────────

function buildPlan(): BatchJob[] {
  const jobs: BatchJob[] = [];

  // ── PRIMARY (7-10) ── Cambridge YLE style ──────────────────────────────────

  // READING — 12 items split across Movers + Flyers reading tasks
  const moyersReadingTasks = getTasksForExam("MOVERS").filter(
    (t) => t.skill === "READING_WRITING"
  );
  const flyersReadingTasks = getTasksForExam("FLYERS").filter(
    (t) => t.skill === "READING_WRITING"
  );

  [
    { tasks: moyersReadingTasks, count: 6, cefr: ["A1"], exam: "MOVERS" as const },
    { tasks: flyersReadingTasks, count: 6, cefr: ["A2"], exam: "FLYERS" as const },
  ].forEach(({ tasks, count, cefr, exam }) => {
    if (tasks.length === 0) return;
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    const topic = PRIMARY_TOPICS[Math.floor(Math.random() * PRIMARY_TOPICS.length)];
    const meta = CAMBRIDGE_EXAM_META[exam];
    jobs.push({
      label: `PRIMARY READING (Cambridge ${exam} - ${task.name})`,
      productLine: "Primary (7-10)",
      skill: "READING",
      count,
      cefrLevels: cefr,
      prompt: buildCambridgePrompt(task.id, topic, count),
      examSource: `cambridge_${exam.toLowerCase()}`,
      setsBased: false,
    });
  });

  // LISTENING — 12 items split across Movers + Flyers listening tasks
  [
    { exam: "MOVERS" as const, count: 6, cefr: ["A1"] },
    { exam: "FLYERS" as const, count: 6, cefr: ["A2"] },
  ].forEach(({ exam, count, cefr }) => {
    const tasks = getTasksForExam(exam).filter((t) => t.skill === "LISTENING");
    if (tasks.length === 0) return;
    const task = tasks[0]; // Part 1 listening
    const topic = PRIMARY_TOPICS[(jobs.length) % PRIMARY_TOPICS.length];
    jobs.push({
      label: `PRIMARY LISTENING (Cambridge ${exam} - ${task.name})`,
      productLine: "Primary (7-10)",
      skill: "LISTENING",
      count,
      cefrLevels: cefr,
      prompt: buildCambridgePrompt(task.id, topic, count),
      examSource: `cambridge_${exam.toLowerCase()}`,
      setsBased: false,
    });
  });

  // GRAMMAR — 8 items (A1-A2, Cambridge YLE style)
  jobs.push({
    label: "PRIMARY GRAMMAR (Cambridge YLE style A1-A2)",
    productLine: "Primary (7-10)",
    skill: "GRAMMAR",
    count: 8,
    cefrLevels: ["A1", "A2"],
    prompt: buildPrimaryGrammarPrompt(PRIMARY_TOPICS[3], 8),
    examSource: "cambridge_yle",
    setsBased: false,
  });

  // VOCABULARY — 8 items (A1-A2, Cambridge Starters/Movers style)
  jobs.push({
    label: "PRIMARY VOCABULARY (Cambridge Starters/Movers style)",
    productLine: "Primary (7-10)",
    skill: "VOCABULARY",
    count: 8,
    cefrLevels: ["A1", "A2"],
    prompt: buildPrimaryVocabPrompt(PRIMARY_TOPICS[0], 8),
    examSource: "cambridge_yle",
    setsBased: false,
  });

  // ── JUNIOR SUITE (11-14) ── TOEFL Junior + KET/PET style ──────────────────

  // READING — 15 items
  // 8 from TOEFL Junior RC (passage-based, B1) + 7 from Cambridge KET/PET Reading
  {
    const tjRcTask = getToeflJuniorTask("TJ_RC")!;
    const topic = JUNIOR_TOPICS[0];
    const genre = TOEFL_JUNIOR_META.readingGenres[1]; // science article
    jobs.push({
      label: "JUNIOR READING (TOEFL Junior RC - B1 passages)",
      productLine: "Junior Suite (11-14)",
      skill: "READING",
      count: 8,
      cefrLevels: ["B1"],
      prompt: buildToeflJuniorPrompt("TJ_RC", topic, 1, genre), // 1 passage → 6 questions; we ask for 2 to get ~8-12
      examSource: "toefl_junior",
      setsBased: true, // passage + questions
    });
  }
  {
    const ketRcTasks = getTasksForExam("KET").filter((t) => t.skill === "READING");
    const petRcTasks = getTasksForExam("PET").filter((t) => t.skill === "READING");
    const taskPool = [...ketRcTasks, ...petRcTasks];
    const task = taskPool[0];
    const topic = JUNIOR_TOPICS[1];
    jobs.push({
      label: "JUNIOR READING (Cambridge KET/PET style A2-B1)",
      productLine: "Junior Suite (11-14)",
      skill: "READING",
      count: 7,
      cefrLevels: ["A2", "B1"],
      prompt: buildCambridgePrompt(task.id, topic, 7),
      examSource: "cambridge_ket_pet",
      setsBased: false,
    });
  }

  // LISTENING — 15 items
  // 9 from TOEFL Junior L Part 1 (short conversations, A2-B1)
  // 6 from TOEFL Junior L Part 2 (short talks, B1)
  {
    const topic1 = JUNIOR_TOPICS[2];
    jobs.push({
      label: "JUNIOR LISTENING (TOEFL Junior L Part 1 - short conversations)",
      productLine: "Junior Suite (11-14)",
      skill: "LISTENING",
      count: 9,
      cefrLevels: ["A2", "B1"],
      prompt: buildToeflJuniorPrompt("TJ_L_PART1", topic1, 9),
      examSource: "toefl_junior",
      setsBased: false,
    });
  }
  {
    const topic2 = JUNIOR_TOPICS[3];
    // Part 2 returns sets of 3; request 2 sets = 6 items
    jobs.push({
      label: "JUNIOR LISTENING (TOEFL Junior L Part 2 - short talks)",
      productLine: "Junior Suite (11-14)",
      skill: "LISTENING",
      count: 6,
      cefrLevels: ["B1"],
      prompt: buildToeflJuniorPrompt("TJ_L_PART2", topic2, 6),
      examSource: "toefl_junior",
      setsBased: true,
    });
  }

  // GRAMMAR — 15 items
  // 9 from TOEFL Junior LFM Grammar (B1)
  // 6 from Cambridge KET Language Form (A2)
  {
    const topic = JUNIOR_TOPICS[4];
    jobs.push({
      label: "JUNIOR GRAMMAR (TOEFL Junior LFM - B1)",
      productLine: "Junior Suite (11-14)",
      skill: "GRAMMAR",
      count: 9,
      cefrLevels: ["B1"],
      prompt: buildToeflJuniorPrompt("TJ_LFM_GRAMMAR", topic, 9),
      examSource: "toefl_junior",
      setsBased: false,
    });
  }
  {
    const ketLfmTasks = getTasksForExam("KET").filter((t) => t.skill === "READING");
    const task = ketLfmTasks.find((t) => t.partNumber === 6) ?? ketLfmTasks[0];
    const topic = JUNIOR_TOPICS[5];
    jobs.push({
      label: "JUNIOR GRAMMAR (Cambridge KET LFM - A2)",
      productLine: "Junior Suite (11-14)",
      skill: "GRAMMAR",
      count: 6,
      cefrLevels: ["A2"],
      prompt: buildCambridgePrompt(task.id, topic, 6),
      examSource: "cambridge_ket",
      setsBased: false,
    });
  }

  // VOCABULARY — 15 items
  // 9 from TOEFL Junior LFM Vocab (B1)
  // 6 from Cambridge PET Reading vocab-in-context (B1)
  {
    const topic = JUNIOR_TOPICS[6];
    jobs.push({
      label: "JUNIOR VOCABULARY (TOEFL Junior LFM Vocab - B1)",
      productLine: "Junior Suite (11-14)",
      skill: "VOCABULARY",
      count: 9,
      cefrLevels: ["B1"],
      prompt: buildToeflJuniorPrompt("TJ_LFM_VOCAB", topic, 9),
      examSource: "toefl_junior",
      setsBased: false,
    });
  }
  {
    const petRcTasks = getTasksForExam("PET").filter((t) => t.skill === "READING");
    const task = petRcTasks[0];
    const topic = JUNIOR_TOPICS[7];
    jobs.push({
      label: "JUNIOR VOCABULARY (Cambridge PET Reading vocab-in-context - B1)",
      productLine: "Junior Suite (11-14)",
      skill: "VOCABULARY",
      count: 6,
      cefrLevels: ["A2", "B1"],
      prompt: buildCambridgePrompt(task.id, topic, 6),
      examSource: "cambridge_pet",
      setsBased: false,
    });
  }

  return jobs;
}

// ─── Gemini call ─────────────────────────────────────────────────────────────

async function callGemini(prompt: string, attempt = 1): Promise<unknown[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = response.text ?? "[]";
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const is503 = msg.includes('"code":503') || msg.includes("503");
    const is429 = msg.includes('"code":429') || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
    if ((is503 || is429) && attempt <= 5) {
      const wait = Math.min(8000 * attempt, 40000); // 8s, 16s, 24s, 32s, 40s
      console.log(`    ⏳ Retry ${attempt}/5 after ${wait / 1000}s (${is503 ? "503 overload" : "429 rate limit"})…`);
      await sleep(wait);
      return callGemini(prompt, attempt + 1);
    }
    console.error("    Gemini error:", msg.slice(0, 150));
    return [];
  }
}

// ─── Flatten set-based responses ─────────────────────────────────────────────

function flattenItems(rawList: unknown[]): Array<Record<string, unknown>> {
  const flat: Array<Record<string, unknown>> = [];
  for (const raw of rawList) {
    const obj = raw as Record<string, unknown>;
    if (obj.content && !obj.questions) {
      flat.push(obj);
      continue;
    }
    const shared: Record<string, unknown> = {};
    if (obj.transcript) shared.transcript = obj.transcript;
    if (obj.passage)    shared.passage    = obj.passage;
    if (obj.setId)      shared.setId      = obj.setId;
    if (obj.genre)      shared.genre      = obj.genre;
    const questions = Array.isArray(obj.questions) ? obj.questions : [];
    for (const q of questions) {
      const qObj = q as Record<string, unknown>;
      flat.push({
        ...qObj,
        content: { ...shared, ...(qObj.content as Record<string, unknown> ?? {}) },
      });
    }
  }
  return flat;
}

// ─── CEFR normalisation ───────────────────────────────────────────────────────

function normaliseCefr(raw: unknown, fallback: string[]): string {
  const s = String(raw ?? "").replace("+", "").replace("-", "").toUpperCase();
  const valid = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  if (valid.includes(s)) return s;
  // Try fallback from job spec
  const fb = fallback[0]?.replace("+", "").replace("-", "").toUpperCase() ?? "B1";
  return valid.includes(fb) ? fb : "B1";
}

// ─── Persist ─────────────────────────────────────────────────────────────────

async function persistItem(
  raw: Record<string, unknown>,
  job: BatchJob
): Promise<boolean> {
  const content = (raw.content ?? {}) as Record<string, unknown>;
  const skill = raw.skill ? String(raw.skill) : job.skill;
  const cefrLevel = normaliseCefr(raw.cefrLevel, job.cefrLevels);
  const type = (() => {
    const t = String(raw.type ?? "MULTIPLE_CHOICE");
    const valid = ["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "DRAG_DROP", "SPEAKING_PROMPT", "WRITING_PROMPT", "INTEGRATED_TASK"];
    return valid.includes(t) ? t : "MULTIPLE_CHOICE";
  })();

  const enriched = {
    ...content,
    suite: job.productLine,
    exam_source: job.examSource,
  };

  try {
    await prisma.item.create({
      data: {
        skill: skill as never,
        type: type as never,
        cefrLevel: cefrLevel as never,
        status: "ACTIVE",
        content: enriched as never,
        difficulty:    typeof raw.difficulty    === "number" ? raw.difficulty    : 0,
        discrimination: typeof raw.discrimination === "number" ? raw.discrimination : 1.2,
        guessing:      typeof raw.guessing      === "number" ? raw.guessing      : 0.25,
        tags: [
          ...job.productLine.toLowerCase().split(" ").slice(0, 2),
          job.skill.toLowerCase(),
          job.examSource,
          cefrLevel.toLowerCase(),
        ],
        metadata: { suite: job.productLine, generatedBy: "seed-suite-100-items" } as never,
      },
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Unique constraint")) {
      console.error("    DB error:", msg.slice(0, 120));
    }
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const plan = buildPlan();

  // Print plan summary
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         Suite 100-Item Seeder                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  if (dryRun) console.log("\n🔵 DRY RUN — no API calls, no DB writes\n");

  const primaryJobs  = plan.filter((j) => j.productLine === "Primary (7-10)");
  const juniorJobs   = plan.filter((j) => j.productLine === "Junior Suite (11-14)");

  const tally = (jobs: BatchJob[], skill: string) =>
    jobs.filter((j) => j.skill === skill).reduce((s, j) => s + j.count, 0);

  console.log("Plan:");
  console.log("  PRIMARY (7-10)");
  for (const s of ["READING", "LISTENING", "GRAMMAR", "VOCABULARY"]) {
    console.log(`    ${s.padEnd(12)} ${tally(primaryJobs, s)} items`);
  }
  console.log(`    ${"TOTAL".padEnd(12)} ${primaryJobs.reduce((s, j) => s + j.count, 0)} items`);
  console.log("  JUNIOR SUITE (11-14)");
  for (const s of ["READING", "LISTENING", "GRAMMAR", "VOCABULARY"]) {
    console.log(`    ${s.padEnd(12)} ${tally(juniorJobs, s)} items`);
  }
  console.log(`    ${"TOTAL".padEnd(12)} ${juniorJobs.reduce((s, j) => s + j.count, 0)} items`);
  console.log(`  ${"GRAND TOTAL".padEnd(16)} ${plan.reduce((s, j) => s + j.count, 0)} items`);
  console.log(`\n  Gemini calls: ${plan.length}\n`);

  if (dryRun) {
    plan.forEach((j) => console.log(`  [DRY RUN] ${j.label} — ${j.count} items`));
    return;
  }

  // Run jobs
  const counters = {
    generated: 0, persisted: 0, rejected: 0,
    bySkill: {} as Record<string, { persisted: number; target: number }>,
    bySuite: {} as Record<string, { persisted: number; target: number }>,
  };

  for (const job of plan) {
    if (!counters.bySkill[job.skill])        counters.bySkill[job.skill]        = { persisted: 0, target: 0 };
    if (!counters.bySuite[job.productLine])  counters.bySuite[job.productLine]  = { persisted: 0, target: 0 };
    counters.bySkill[job.skill].target       += job.count;
    counters.bySuite[job.productLine].target += job.count;

    console.log(`\n▶ ${job.label}`);
    const rawList = await callGemini(job.prompt);
    const items = job.setsBased ? flattenItems(rawList) : rawList.map((r) => r as Record<string, unknown>);
    counters.generated += items.length;

    for (const item of items) {
      const ok = await persistItem(item, job);
      if (ok) {
        counters.persisted++;
        counters.bySkill[job.skill].persisted++;
        counters.bySuite[job.productLine].persisted++;
        process.stdout.write("✓ ");
      } else {
        counters.rejected++;
        process.stdout.write("✗ ");
      }
    }
    process.stdout.write("\n");

    await sleep(3000); // Rate-limit between Gemini calls
  }

  // Final report
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Results                                                ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  Generated: ${counters.generated}  Persisted: ${counters.persisted}  Rejected: ${counters.rejected}\n`);

  console.log("  By Skill:");
  for (const [skill, c] of Object.entries(counters.bySkill)) {
    const bar = "█".repeat(c.persisted).padEnd(c.target, "░");
    console.log(`    ${skill.padEnd(12)} [${bar}] ${c.persisted}/${c.target}`);
  }

  console.log("\n  By Suite:");
  for (const [suite, c] of Object.entries(counters.bySuite)) {
    const bar = "█".repeat(c.persisted).padEnd(c.target, "░");
    console.log(`    ${suite.padEnd(24)} [${bar}] ${c.persisted}/${c.target}`);
  }

  console.log("\n✅ Done.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
