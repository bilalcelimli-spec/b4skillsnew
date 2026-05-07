/**
 * Cambridge Item Generation Script
 *
 * Generates assessment items aligned to Cambridge exam formats for all 5 exams:
 *   - Cambridge YLE Starters (Pre-A1)
 *   - Cambridge YLE Movers   (A1)
 *   - Cambridge YLE Flyers   (A2)
 *   - Cambridge A2 Key / KET (A2)
 *   - Cambridge B1 Preliminary / PET (B1)
 *
 * Uses the cambridge-framework + cambridge-prompts to build exam-specific
 * Gemini prompts, then seeds the items into the DB.
 *
 * Usage:
 *   npx tsx scripts/seed-cambridge-items.ts [--exam STARTERS|MOVERS|FLYERS|KET|PET|ALL] [--dry-run]
 *
 * Examples:
 *   npx tsx scripts/seed-cambridge-items.ts --exam STARTERS
 *   npx tsx scripts/seed-cambridge-items.ts --exam ALL --dry-run
 */

import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";
import {
  type CambridgeExam,
  CAMBRIDGE_EXAM_META,
  CAMBRIDGE_TASKS,
  getTasksForExam,
} from "../src/lib/cambridge/cambridge-framework";
import {
  buildCambridgePrompt,
  validateCambridgeItem,
} from "../src/lib/cambridge/cambridge-prompts";

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const examArg = (args[find(args, "--exam") + 1] ?? "ALL").toUpperCase() as CambridgeExam | "ALL";
const dryRun = args.includes("--dry-run");

function find(arr: string[], flag: string): number {
  const i = arr.indexOf(flag);
  return i === -1 ? arr.length : i;
}

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * How many items to generate per task part per topic.
 * Keep low (3) for first seeding run to limit API cost.
 * Increase to 10+ for production seeding.
 */
const ITEMS_PER_TOPIC = 3;

/**
 * For each task, pick topics from the exam's official topic list.
 * We cycle through topics so each task part gets different content.
 */
const TOPICS_PER_PART = 2;

const SKILL_MAP: Record<string, string> = {
  READING_WRITING: "READING",
  READING: "READING",
  WRITING: "WRITING",
  LISTENING: "LISTENING",
  SPEAKING: "SPEAKING",
};

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
    console.error("  Gemini error:", msg.slice(0, 120));
    return [];
  }
}

function skillToEnum(skill: string): string {
  const map: Record<string, string> = {
    READING: "READING",
    WRITING: "WRITING",
    LISTENING: "LISTENING",
    SPEAKING: "SPEAKING",
    READING_WRITING: "READING",
    VOCABULARY: "VOCABULARY",
    GRAMMAR: "GRAMMAR",
  };
  return map[skill] ?? "READING";
}

function cefrToEnum(cefr: string): string {
  const valid = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  return valid.includes(cefr) ? cefr : "A2";
}

function itemTypeToEnum(type: string): string {
  const map: Record<string, string> = {
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    FILL_IN_BLANKS: "FILL_IN_BLANKS",
    DRAG_DROP: "DRAG_DROP",
    WRITING_PROMPT: "WRITING_PROMPT",
    SPEAKING_PROMPT: "SPEAKING_PROMPT",
    INTEGRATED_TASK: "INTEGRATED_TASK",
  };
  return map[type] ?? "MULTIPLE_CHOICE";
}

// ─── Item persistence ────────────────────────────────────────────────────────

async function persistItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>,
  taskId: string,
  exam: CambridgeExam
): Promise<boolean> {
  const content = raw.content ?? {};
  const cefrLevel = cefrToEnum(raw.cefrLevel ?? "A2");
  const skill = skillToEnum(raw.skill ?? "READING");
  const type = itemTypeToEnum(raw.type ?? "MULTIPLE_CHOICE");

  // Attach Cambridge metadata to content
  const enrichedContent = {
    ...content,
    cambridge_task_id: taskId,
    cambridge_exam: exam,
    cambridge_exam_full: CAMBRIDGE_EXAM_META[exam].fullName,
    cambridge_cefr: CAMBRIDGE_EXAM_META[exam].cefr,
  };

  try {
    await prisma.item.create({
      data: {
        skill: skill as never,
        type: type as never,
        cefrLevel: cefrLevel as never,
        status: "ACTIVE",
        content: enrichedContent as never,
        params: {
          a: raw.discrimination ?? 1.2,
          b: raw.difficulty ?? 0,
          c: raw.guessing ?? 0.25,
        },
        tags: ["cambridge", exam.toLowerCase(), `cambridge-${exam.toLowerCase()}`],
        productLine: "Primary (7-10)",
      },
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Skip duplicates silently
    if (!msg.includes("Unique constraint")) {
      console.error("  DB error:", msg.slice(0, 120));
    }
    return false;
  }
}

// ─── Per-exam seeder ─────────────────────────────────────────────────────────

async function seedExam(exam: CambridgeExam): Promise<void> {
  const meta = CAMBRIDGE_EXAM_META[exam];
  const tasks = getTasksForExam(exam);
  const topics = meta.topicAreas;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶  ${meta.fullName} (${meta.cefr}) — ${tasks.length} task parts`);
  console.log(`${"─".repeat(60)}`);

  let totalGenerated = 0;
  let totalPersisted = 0;
  let totalRejected = 0;

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
    const task = tasks[taskIndex];

    for (let topicOffset = 0; topicOffset < TOPICS_PER_PART; topicOffset++) {
      const topic = topics[(taskIndex * TOPICS_PER_PART + topicOffset) % topics.length];

      console.log(`\n  [${task.id}] Part ${task.partNumber} | ${task.format} | Topic: "${topic}"`);

      let prompt: string;
      try {
        prompt = buildCambridgePrompt(task.id, topic, ITEMS_PER_TOPIC);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ⚠ Skipped (prompt build error): ${msg}`);
        continue;
      }

      if (dryRun) {
        console.log(`  [DRY RUN] Prompt built (${prompt.length} chars). Skipping API call.`);
        continue;
      }

      const rawItems = await generateWithGemini(prompt);
      totalGenerated += rawItems.length;
      console.log(`  Generated ${rawItems.length} raw items`);

      for (const raw of rawItems) {
        const item = raw as Record<string, unknown>;

        // Validate against Cambridge task spec
        const { isValid, issues } = validateCambridgeItem(item, task.id);
        if (!isValid) {
          console.log(`  ✗ Rejected: ${issues.join("; ")}`);
          totalRejected++;
          continue;
        }

        const ok = await persistItem(item, task.id, exam);
        if (ok) {
          totalPersisted++;
          process.stdout.write("  ✓ ");
        } else {
          totalRejected++;
          process.stdout.write("  ✗ ");
        }
      }

      // Rate limit: 1 req/s on Gemini free tier
      await sleep(1100);
    }
  }

  console.log(`\n  Summary: generated=${totalGenerated} persisted=${totalPersisted} rejected=${totalRejected}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (dryRun) {
    console.log("🔵 DRY RUN mode — no API calls, no DB writes");
  }

  const examsToRun: CambridgeExam[] =
    examArg === "ALL"
      ? ["STARTERS", "MOVERS", "FLYERS", "KET", "PET"]
      : [examArg as CambridgeExam];

  console.log(`\nCambridge Item Seeder`);
  console.log(`Exams: ${examsToRun.join(", ")}`);
  console.log(`Items per topic: ${ITEMS_PER_TOPIC}  |  Topics per part: ${TOPICS_PER_PART}`);
  console.log(`Estimated items: ~${examsToRun.reduce((acc, e) => acc + getTasksForExam(e).length, 0) * TOPICS_PER_PART * ITEMS_PER_TOPIC}`);

  for (const exam of examsToRun) {
    await seedExam(exam);
  }

  console.log("\n✅ Cambridge seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
