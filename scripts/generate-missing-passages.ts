/**
 * generate-missing-passages.ts
 *
 * Finds READING items that have NO content.passage and NO content.passageUrl,
 * then uses Gemini to write a CEFR-appropriate reading passage that the
 * question can be answered from, and saves it to content.passage in the DB.
 *
 * Architecture:
 *   - Groups items by moduleId/passageId — all questions in one module share
 *     one generated passage.
 *   - For items with no moduleId, generates a dedicated passage per item.
 *   - Two-persona pipeline:
 *       PASSAGE_WRITER persona → writes the passage
 *       (optional) QA persona → scores coherence, returns ≥55 to accept
 *   - DRY_RUN, FORCE, LEVEL, DELAY_MS env vars
 *   - JSONL log to logs/generate-missing-passages-YYYY-MM-DD.jsonl
 *
 * Usage:
 *   npx tsx scripts/generate-missing-passages.ts
 *   DRY_RUN=1 npx tsx scripts/generate-missing-passages.ts
 *   LEVEL=B2  npx tsx scripts/generate-missing-passages.ts
 *   FORCE=1   npx tsx scripts/generate-missing-passages.ts  # overwrite existing
 *   MIN_QA=60 npx tsx scripts/generate-missing-passages.ts  # QA threshold
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma  = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: API_KEY });

const DRY_RUN  = process.env.DRY_RUN === "1";
const FORCE    = process.env.FORCE   === "1";
const LEVEL    = process.env.LEVEL?.toUpperCase();
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "2200", 10);
const MIN_QA   = parseInt(process.env.MIN_QA ?? "55", 10);

const LOG_DIR  = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const logPath  = path.join(LOG_DIR, `generate-missing-passages-${new Date().toISOString().slice(0, 10)}.jsonl`);
function log(obj: Record<string, unknown>) {
  fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// CEFR passage specs
// ─────────────────────────────────────────────────────────────────────────────

const CEFR_SPECS: Record<string, { words: string; complexity: string; genre: string }> = {
  PRE_A1: { words: "40–70",   complexity: "very simple, 1-clause sentences",          genre: "simple description or sign" },
  A1:     { words: "60–100",  complexity: "simple sentences, high-frequency vocab",    genre: "short message, notice, or description" },
  A2:     { words: "100–160", complexity: "compound sentences, everyday vocabulary",   genre: "short article, email, or narrative" },
  B1:     { words: "200–280", complexity: "complex sentences, some abstract language", genre: "magazine article, report, or narrative" },
  B2:     { words: "280–380", complexity: "varied syntax, nuanced arguments",          genre: "newspaper article, essay, or review" },
  C1:     { words: "360–500", complexity: "sophisticated syntax, academic register",   genre: "academic text, in-depth analysis, or feature article" },
  C2:     { words: "480–650", complexity: "complex argumentation, specialist register",genre: "research abstract, editorial, or cultural essay" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Passage writer persona
// ─────────────────────────────────────────────────────────────────────────────

const PASSAGE_SYSTEM = `
You are a Principal Reading Test Materials Writer at Cambridge Assessment English.
You write authentic, interesting reading passages for English language assessment.

Rules:
1. Output ONLY the passage text — no markdown headers, no JSON, no commentary.
2. Write naturally for the genre and level specified.
3. The passage must explicitly support the answers to the questions provided.
4. Use British English spelling unless the item clearly calls for American English.
5. Do not copy the question stems verbatim into the passage; paraphrase where needed.
6. Paragraphs only — no bullet lists unless the genre demands it (e.g., a notice).
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// QA persona (quick)
// ─────────────────────────────────────────────────────────────────────────────

const QA_SYSTEM = `
You are a senior item quality reviewer for Cambridge Assessment English.
You evaluate whether a reading passage is appropriate and supports the given questions.
Respond ONLY with a JSON object: {"score": <0-100>, "reason": "<one sentence>"}
`.trim();

async function qaScore(passage: string, questions: string[], cefr: string): Promise<number> {
  const prompt = `
CEFR: ${cefr}
Passage (first 600 chars): ${passage.slice(0, 600)}
Questions: ${questions.slice(0, 3).join(" | ")}
Does the passage support these questions, match the level, and read naturally?
`.trim();
  try {
    const r = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction: QA_SYSTEM, temperature: 0.1, topP: 0.8 },
    });
    const raw = (r.text ?? "{}").replace(/```json|```/g, "").trim();
    const obj = JSON.parse(raw);
    return typeof obj.score === "number" ? obj.score : 50;
  } catch {
    return 60; // lenient on QA failure
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Passage generation
// ─────────────────────────────────────────────────────────────────────────────

async function generatePassage(
  cefr: string,
  topic: string,
  questionStems: string[],
  subskill?: string,
): Promise<string | null> {
  const spec = CEFR_SPECS[cefr] ?? CEFR_SPECS["B1"];
  const questionsBlock = questionStems.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join("\n");

  const prompt = `
CEFR level: ${cefr}
Word count target: ${spec.words}
Sentence complexity: ${spec.complexity}
Genre / text type: ${spec.genre}
Topic / subject area: ${topic}
Reading sub-skill tested: ${subskill ?? "general comprehension"}

Questions the passage must support (each question must be answerable from the text):
${questionsBlock}

Write the complete reading passage now.
`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: PASSAGE_SYSTEM,
      temperature: 0.65,
      topP: 0.92,
    },
  });

  const text = (response.text ?? "").trim();
  if (!text || text.length < 50) return null;
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB patch helpers
// ─────────────────────────────────────────────────────────────────────────────

async function patchPassage(itemIds: string[], passage: string) {
  for (const id of itemIds) {
    const item = await prisma.item.findUnique({ where: { id }, select: { content: true } });
    if (!item) continue;
    const updated = { ...(item.content as Record<string, any>), passage };
    await prisma.item.update({ where: { id }, data: { content: updated } });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — Generate Missing Reading Passages (Gemini)");
  console.log("=".repeat(70));
  console.log(`  Mode:   ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Force:  ${FORCE}`);
  console.log(`  MIN_QA: ${MIN_QA}`);
  if (LEVEL) console.log(`  Level:  ${LEVEL}`);
  console.log(`  Log:    ${logPath}\n`);

  const where: Record<string, any> = { skill: "READING" };
  if (LEVEL) where.cefrLevel = LEVEL;

  const items = await prisma.item.findMany({
    where,
    select: { id: true, cefrLevel: true, content: true },
  });

  // Separate: already has passage vs missing
  const needsPassage = items.filter(item => {
    const c = (item.content ?? {}) as Record<string, any>;
    const hasPassage    = typeof c.passage === "string" && c.passage.trim().length > 50;
    const hasPassageUrl = typeof c.passageUrl === "string" && c.passageUrl.trim().length > 0;
    return (!hasPassage && !hasPassageUrl) || FORCE;
  });

  console.log(`  Total READING items:   ${items.length}`);
  console.log(`  Items needing passage: ${needsPassage.length}\n`);

  if (needsPassage.length === 0) {
    console.log("  All reading items already have passages. Use FORCE=1 to regenerate.\n");
    await prisma.$disconnect();
    return;
  }

  // Group by moduleId where possible — one passage per module group
  interface PassageGroup {
    cefr: string;
    topic: string;
    subskill?: string;
    questions: string[];
    itemIds: string[];
    content: Record<string, any>; // representative content for the group
  }

  const groupMap = new Map<string, PassageGroup>();
  const soloItems: typeof needsPassage = [];

  for (const item of needsPassage) {
    const c = (item.content ?? {}) as Record<string, any>;
    const mid = c.moduleId ?? c.passageId;
    const prompt = c.prompt ?? c.stem ?? c.question ?? "";
    const topic  = c.topic ?? c.subject ?? c.moduleId ?? mid ?? "general interest";

    if (mid) {
      if (!groupMap.has(mid)) {
        groupMap.set(mid, {
          cefr: item.cefrLevel as string,
          topic,
          subskill: c.subskill,
          questions: [],
          itemIds: [],
          content: c,
        });
      }
      const g = groupMap.get(mid)!;
      g.itemIds.push(item.id);
      if (prompt) g.questions.push(prompt);
    } else {
      soloItems.push(item);
    }
  }

  let generated = 0;
  let rejected  = 0;
  let errors    = 0;
  let idx       = 0;
  const total   = groupMap.size + soloItems.length;

  // ── Process module groups ──────────────────────────────────────────────────
  for (const [groupKey, g] of groupMap.entries()) {
    idx++;
    process.stdout.write(`  [${idx}/${total}] group:${groupKey} (${g.cefr}) ${g.questions.length} Qs ... `);

    if (DRY_RUN) { console.log("DRY_RUN"); generated++; continue; }

    try {
      const passage = await generatePassage(g.cefr, g.topic, g.questions, g.subskill);
      if (!passage) { console.log("ERROR — empty passage"); errors++; continue; }

      const qa = await qaScore(passage, g.questions, g.cefr);
      await sleep(400);

      if (qa < MIN_QA) {
        console.log(`REJECTED — QA ${qa} < ${MIN_QA}`);
        rejected++;
        log({ event: "rejected", groupKey, qa, cefr: g.cefr });
        continue;
      }

      await patchPassage(g.itemIds, passage);
      const words = passage.split(/\s+/).length;
      console.log(`OK (${words}w, QA=${qa}, ${g.itemIds.length} items)`);
      generated++;
      log({ event: "passage_written", groupKey, cefr: g.cefr, words, qa, items: g.itemIds.length });
    } catch (err) {
      console.log(`ERROR — ${String(err).slice(0, 80)}`);
      errors++;
      log({ event: "error", groupKey, error: String(err) });
    }

    await sleep(DELAY_MS);
  }

  // ── Process solo items ─────────────────────────────────────────────────────
  for (let j = 0; j < soloItems.length; j++) {
    const item = soloItems[j];
    const c    = (item.content ?? {}) as Record<string, any>;
    idx++;
    const cefr   = item.cefrLevel as string;
    const topic  = c.topic ?? c.subject ?? "general interest";
    const prompt = c.prompt ?? c.stem ?? c.question ?? "";
    process.stdout.write(`  [${idx}/${total}] item:${item.id} (${cefr}) ... `);

    if (DRY_RUN) { console.log("DRY_RUN"); generated++; continue; }

    try {
      const passage = await generatePassage(cefr, topic, [prompt], c.subskill);
      if (!passage) { console.log("ERROR — empty passage"); errors++; continue; }

      const qa = await qaScore(passage, [prompt], cefr);
      await sleep(400);

      if (qa < MIN_QA) {
        console.log(`REJECTED — QA ${qa} < ${MIN_QA}`);
        rejected++;
        log({ event: "rejected", itemId: item.id, qa, cefr });
        continue;
      }

      await patchPassage([item.id], passage);
      const words = passage.split(/\s+/).length;
      console.log(`OK (${words}w, QA=${qa})`);
      generated++;
      log({ event: "passage_written", itemId: item.id, cefr, words, qa });
    } catch (err) {
      console.log(`ERROR — ${String(err).slice(0, 80)}`);
      errors++;
      log({ event: "error", itemId: item.id, error: String(err) });
    }

    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`  Generated: ${generated}  Rejected: ${rejected}  Errors: ${errors}`);
  console.log(`  Log: ${logPath}`);
  console.log("=".repeat(70) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
