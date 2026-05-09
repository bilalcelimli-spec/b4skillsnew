/**
 * TOEFL Junior Item Generation Script
 *
 * Generates assessment items aligned to TOEFL Junior Standard format for all sections:
 *   - Section 1: Listening Comprehension  (Parts 1–3)
 *   - Section 2: Language Form and Meaning (Grammar + Vocabulary)
 *   - Section 3: Reading Comprehension
 *
 * Uses toefl-junior-framework + toefl-junior-prompts to build Gemini prompts,
 * then seeds items into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-toefl-junior-items.ts [--section LISTENING|LFM|READING|ALL] [--dry-run]
 *
 * Examples:
 *   npx tsx scripts/seed-toefl-junior-items.ts --section LISTENING --dry-run
 *   npx tsx scripts/seed-toefl-junior-items.ts --section ALL
 *   npx tsx scripts/seed-toefl-junior-items.ts --section LFM
 */

import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";
import {
  type ToeflJuniorSection,
  TOEFL_JUNIOR_META,
  TOEFL_JUNIOR_TASKS,
  getTasksForSection,
} from "../src/lib/toefl-junior/toefl-junior-framework";
import {
  buildToeflJuniorPrompt,
  validateToeflJuniorItem,
} from "../src/lib/toefl-junior/toefl-junior-prompts";

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const sectionArg = (args[findArg(args, "--section") + 1] ?? "ALL").toUpperCase();
const dryRun = args.includes("--dry-run");

function findArg(arr: string[], flag: string): number {
  const i = arr.indexOf(flag);
  return i === -1 ? arr.length : i;
}

// ─── Config ──────────────────────────────────────────────────────────────────

/** Items (or sets) to generate per task per topic. Keep low (3) for first run. */
const ITEMS_PER_TOPIC = 3;

/** Topics to cycle through per task */
const TOPICS_PER_TASK = 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateWithGemini(prompt: string): Promise<unknown[]> {
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
    console.error("  Gemini error:", msg.slice(0, 140));
    return [];
  }
}

function skillToEnum(skill: string): string {
  const map: Record<string, string> = {
    LISTENING: "LISTENING",
    READING: "READING",
    GRAMMAR: "GRAMMAR",
    VOCABULARY: "VOCABULARY",
    WRITING: "WRITING",
    SPEAKING: "SPEAKING",
  };
  return map[skill] ?? "READING";
}

function cefrToEnum(cefr: string): string {
  const valid = ["A2", "B1", "B2", "A1", "PRE_A1", "C1", "C2"];
  const normalised = cefr.replace("+", "").replace("-", "");
  return valid.includes(normalised) ? normalised : "B1";
}

function itemTypeToEnum(type: string): string {
  const map: Record<string, string> = {
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    FILL_IN_BLANKS: "FILL_IN_BLANKS",
    WRITING_PROMPT: "WRITING_PROMPT",
    SPEAKING_PROMPT: "SPEAKING_PROMPT",
  };
  return map[type] ?? "MULTIPLE_CHOICE";
}

// ─── Flatten set-based responses ─────────────────────────────────────────────

/**
 * TOEFL Junior listening/reading prompts return sets (1 stimulus + N questions).
 * Flatten them into individual item objects for DB storage, attaching the
 * transcript/passage to each question's content.
 */
function flattenItems(
  rawList: unknown[],
  taskId: string
): Array<Record<string, unknown>> {
  const flat: Array<Record<string, unknown>> = [];

  for (const raw of rawList) {
    const obj = raw as Record<string, unknown>;

    // Already a flat item (grammar/vocab)
    if (obj.content && !obj.questions) {
      flat.push(obj);
      continue;
    }

    // Set structure: { transcript/passage, questions: [...] }
    const sharedData: Record<string, unknown> = {};
    if (obj.transcript) sharedData.transcript = obj.transcript;
    if (obj.passage)    sharedData.passage    = obj.passage;
    if (obj.setId)      sharedData.setId       = obj.setId;
    if (obj.genre)      sharedData.genre       = obj.genre;

    const questions = Array.isArray(obj.questions) ? obj.questions : [];
    for (const q of questions) {
      const qObj = q as Record<string, unknown>;
      const mergedContent = { ...sharedData, ...(qObj.content as Record<string, unknown> ?? {}) };
      flat.push({ ...qObj, content: mergedContent });
    }
  }

  return flat;
}

// ─── Item persistence ────────────────────────────────────────────────────────

async function persistItem(
  raw: Record<string, unknown>,
  taskId: string
): Promise<boolean> {
  const content = (raw.content ?? {}) as Record<string, unknown>;
  const cefrLevel = cefrToEnum(String(raw.cefrLevel ?? "B1"));
  const skill = skillToEnum(String(raw.skill ?? "READING"));
  const type = itemTypeToEnum(String(raw.type ?? "MULTIPLE_CHOICE"));

  const enrichedContent = {
    ...content,
    toefl_task_id: taskId,
    toefl_exam: "TOEFL_JUNIOR",
    toefl_exam_full: TOEFL_JUNIOR_META.fullName,
    toefl_section: TOEFL_JUNIOR_TASKS.find((t) => t.id === taskId)?.section ?? "READING",
  };

  try {
    await prisma.item.create({
      data: {
        skill: skill as never,
        type: type as never,
        cefrLevel: cefrLevel as never,
        status: "ACTIVE",
        content: enrichedContent as never,
        discrimination: (raw.discrimination as number) ?? 1.2,
        difficulty: (raw.difficulty as number) ?? 0,
        guessing: (raw.guessing as number) ?? 0.25,
        tags: ["toefl-junior", "ets", `toefl-${taskId.toLowerCase().replace(/_/g, "-")}`],
      },
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Unique constraint")) {
      console.error("  DB error:", msg.slice(0, 120));
    }
    return false;
  }
}

// ─── Per-task seeder ─────────────────────────────────────────────────────────

async function seedTask(
  taskId: string,
  topics: string[],
  taskIndex: number
): Promise<{ generated: number; persisted: number; rejected: number }> {
  let generated = 0, persisted = 0, rejected = 0;

  for (let i = 0; i < TOPICS_PER_TASK; i++) {
    const topic = topics[(taskIndex * TOPICS_PER_TASK + i) % topics.length];
    const genre = TOEFL_JUNIOR_META.readingGenres[(taskIndex * TOPICS_PER_TASK + i) % TOEFL_JUNIOR_META.readingGenres.length];

    let prompt: string;
    try {
      prompt = buildToeflJuniorPrompt(taskId, topic, ITEMS_PER_TOPIC, genre);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`    ⚠ Skipped (prompt build): ${msg}`);
      continue;
    }

    if (dryRun) {
      console.log(`    [DRY RUN] Prompt ready (${prompt.length} chars) — topic: "${topic}"`);
      continue;
    }

    const rawList = await generateWithGemini(prompt);
    const flatItems = flattenItems(rawList, taskId);
    generated += flatItems.length;

    for (const item of flatItems) {
      const { isValid, issues } = validateToeflJuniorItem(item, taskId);
      if (!isValid) {
        console.log(`    ✗ Rejected: ${issues.join("; ")}`);
        rejected++;
        continue;
      }
      const ok = await persistItem(item, taskId);
      if (ok) { persisted++; process.stdout.write("✓ "); }
      else     { rejected++;  process.stdout.write("✗ "); }
    }

    await sleep(1100);
  }

  return { generated, persisted, rejected };
}

// ─── Per-section seeder ───────────────────────────────────────────────────────

async function seedSection(section: ToeflJuniorSection): Promise<void> {
  const tasks = getTasksForSection(section);
  const topics = TOEFL_JUNIOR_META.topicAreas;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶  Section: ${section} — ${tasks.length} task(s)`);
  console.log(`${"─".repeat(60)}`);

  let totalGenerated = 0, totalPersisted = 0, totalRejected = 0;

  for (let idx = 0; idx < tasks.length; idx++) {
    const task = tasks[idx];
    console.log(`\n  [${task.id}] ${task.name}`);

    const { generated, persisted, rejected } = await seedTask(task.id, topics, idx);
    totalGenerated += generated;
    totalPersisted += persisted;
    totalRejected  += rejected;
  }

  console.log(`\n  Section summary: generated=${totalGenerated} persisted=${totalPersisted} rejected=${totalRejected}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (dryRun) {
    console.log("🔵 DRY RUN mode — no API calls, no DB writes");
  }

  const sectionMap: Record<string, ToeflJuniorSection> = {
    LISTENING: "LISTENING",
    LFM: "LANG_FORM_MEANING",
    READING: "READING",
  };

  const sectionsToRun: ToeflJuniorSection[] =
    sectionArg === "ALL"
      ? ["LISTENING", "LANG_FORM_MEANING", "READING"]
      : [sectionMap[sectionArg] ?? "LISTENING"];

  console.log(`\nTOEFL Junior Item Seeder — ${TOEFL_JUNIOR_META.fullName}`);
  console.log(`Sections: ${sectionsToRun.join(", ")}`);
  console.log(`Items per topic: ${ITEMS_PER_TOPIC}  |  Topics per task: ${TOPICS_PER_TASK}`);

  for (const section of sectionsToRun) {
    await seedSection(section);
  }

  console.log("\n✅ TOEFL Junior seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
