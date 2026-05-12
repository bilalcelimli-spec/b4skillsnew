/**
 * generate-missing-tts-scripts.ts
 *
 * Finds LISTENING items that have NO ttsScript (so generate-missing-audio.ts
 * cannot synthesise them), then uses Gemini to write a natural, CEFR-appropriate
 * TTS script based on the item's content (prompt, options, topic, etc.).
 *
 * After writing the script it saves it to content.ttsScript in the DB.
 * generate-missing-audio.ts can then pick it up and synthesise the audio.
 *
 * TTS script conventions:
 *   - Reads ALL content needed for the question (stimulus + question stem)
 *   - Uses speaker labels for dialogues: "[Speaker A] ... [Speaker B] ..."
 *   - Pause markers: "[pause]" — inserted before questions
 *   - Naturalness: contractions, discourse markers, realistic fillers at lower
 *     CEFR levels (A1/A2)
 *   - Length: A1=40–80w  A2=80–140w  B1=120–200w  B2=200–300w  C1/C2=280–400w
 *
 * Usage:
 *   npx tsx scripts/generate-missing-tts-scripts.ts
 *   DRY_RUN=1  npx tsx scripts/generate-missing-tts-scripts.ts
 *   LEVEL=B1   npx tsx scripts/generate-missing-tts-scripts.ts
 *   FORCE=1    npx tsx scripts/generate-missing-tts-scripts.ts  # overwrite existing
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: API_KEY });

const DRY_RUN  = process.env.DRY_RUN === "1";
const FORCE    = process.env.FORCE   === "1";
const LEVEL    = process.env.LEVEL?.toUpperCase();
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1800", 10);

const LOG_DIR  = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const logPath  = path.join(LOG_DIR, `generate-missing-tts-scripts-${new Date().toISOString().slice(0, 10)}.jsonl`);
function log(obj: Record<string, unknown>) {
  fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// TTS SCRIPT WRITER PERSONA
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a Principal Listening Test Materials Writer at Cambridge Assessment English.
You write scripts for listening test audio recordings — natural, spoken English
that will be read by a text-to-speech voice.

Rules:
1. Write ONLY the spoken text — no JSON, no markdown, no headings.
2. Speaker labels (for multi-speaker passages): [Speaker A], [Speaker B], etc.
3. Pause markers: [pause] (inserted before the question stem).
4. Naturalness: use contractions, discourse markers, realistic spoken language.
5. Calibrate to the CEFR level:
   PRE_A1/A1: very short, simple sentences, basic vocabulary, slow-friendly pace.
   A2: short sentences, common vocabulary.
   B1: some complex sentences, everyday topic vocabulary.
   B2: natural spoken pace, some abstract language.
   C1/C2: sophisticated, nuanced, academic-register discourse.
6. Encode the question stem at the end, preceded by [pause].
7. Do NOT include answer options — they are shown on screen.
8. Length targets (words in the spoken script):
   PRE_A1/A1: 40–80 words
   A2:        80–130 words
   B1:        130–200 words
   B2:        200–290 words
   C1:        270–370 words
   C2:        330–420 words
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// Script generation
// ─────────────────────────────────────────────────────────────────────────────

async function generateTtsScript(item: {
  id: string;
  cefrLevel: string;
  content: Record<string, any>;
}): Promise<string | null> {
  const c = item.content;
  const level = item.cefrLevel;

  // Build a rich description of what the item is about
  const prompt = c.prompt ?? c.stem ?? c.question ?? "";
  const topic   = c.topic ?? c.moduleId ?? "";
  const textType = c.textType ?? c.format ?? "conversation";
  const options = (c.options ?? []).map((o: any) => o.text ?? o).join(" / ");
  const context = c.context ?? c.scenario ?? c.situation ?? "";
  const transcript = c.transcript ?? c.text ?? "";

  const userPrompt = `
CEFR Level: ${level}
Listening text type: ${textType}
Topic / moduleId: ${topic}
${context ? `Scenario context: ${context}` : ""}
Question stem: ${prompt}
${options ? `Answer options (shown on screen, do not read): ${options}` : ""}
${transcript ? `Existing transcript fragment (expand/rewrite to full TTS script): ${transcript}` : ""}

Write a complete TTS script for this listening item. The audio should lead up to
and include the question stem (preceded by [pause]). Do not include answer options.
`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.6,
      topP: 0.9,
    },
  });

  const text = (response.text ?? "").trim();
  if (!text || text.length < 20) return null;
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — Generate Missing TTS Scripts (Gemini)");
  console.log("=".repeat(70));
  console.log(`  Mode:  ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  if (LEVEL) console.log(`  Level: ${LEVEL}`);
  console.log(`  Log:   ${logPath}\n`);

  const where: Record<string, any> = { skill: "LISTENING" };
  if (LEVEL) where.cefrLevel = LEVEL;

  const items = await prisma.item.findMany({
    where,
    select: { id: true, cefrLevel: true, content: true },
  });

  // Deduplicate by moduleId — generate one script per module, apply to all items
  const moduleMap = new Map<string, { content: Record<string, any>; cefr: string; itemIds: string[] }>();
  const nonModuleItems: typeof items = [];

  for (const item of items) {
    const c = (item.content ?? {}) as Record<string, any>;
    const hasTts = typeof c.ttsScript === "string" && c.ttsScript.trim().length > 10;
    if (hasTts && !FORCE) continue; // already has a script

    if (c.moduleId) {
      const mid = c.moduleId as string;
      if (!moduleMap.has(mid)) {
        moduleMap.set(mid, { content: c, cefr: item.cefrLevel as string, itemIds: [] });
      }
      moduleMap.get(mid)!.itemIds.push(item.id);
    } else {
      nonModuleItems.push(item);
    }
  }

  const totalModules = moduleMap.size;
  const totalItems   = nonModuleItems.length;
  console.log(`  Modules needing TTS script:  ${totalModules}`);
  console.log(`  Non-module items needing it: ${totalItems}\n`);

  if (totalModules === 0 && totalItems === 0) {
    console.log("  Nothing to do.\n");
    await prisma.$disconnect();
    return;
  }

  let written = 0;
  let errors  = 0;

  // ── Process modules ──────────────────────────────────────────────────────────
  let idx = 0;
  for (const [moduleId, { content, cefr, itemIds }] of moduleMap.entries()) {
    idx++;
    process.stdout.write(`  [${idx}/${totalModules}] module:${moduleId} (${cefr}) ... `);

    if (DRY_RUN) { console.log("DRY_RUN"); written++; continue; }

    try {
      const script = await generateTtsScript({ id: itemIds[0], cefrLevel: cefr, content });
      if (!script) { console.log("ERROR — empty response"); errors++; continue; }

      // Patch all items in the module
      for (const id of itemIds) {
        const item = await prisma.item.findUnique({ where: { id }, select: { content: true } });
        if (!item) continue;
        const updated = { ...(item.content as Record<string, any>), ttsScript: script };
        await prisma.item.update({ where: { id }, data: { content: updated } });
      }

      console.log(`OK (${script.split(/\s+/).length}w, ${itemIds.length} items)`);
      written++;
      log({ event: "script_written", moduleId, cefr, words: script.split(/\s+/).length, items: itemIds.length });
    } catch (err) {
      console.log(`ERROR — ${String(err).slice(0, 80)}`);
      errors++;
      log({ event: "error", moduleId, error: String(err) });
    }

    await sleep(DELAY_MS);
  }

  // ── Process non-module items ─────────────────────────────────────────────────
  for (let j = 0; j < nonModuleItems.length; j++) {
    const item = nonModuleItems[j];
    const c    = (item.content ?? {}) as Record<string, any>;
    process.stdout.write(`  [item ${j + 1}/${totalItems}] ${item.id} (${item.cefrLevel}) ... `);

    if (DRY_RUN) { console.log("DRY_RUN"); written++; continue; }

    try {
      const script = await generateTtsScript({ id: item.id, cefrLevel: item.cefrLevel as string, content: c });
      if (!script) { console.log("ERROR — empty response"); errors++; continue; }

      const updated = { ...c, ttsScript: script };
      await prisma.item.update({ where: { id: item.id }, data: { content: updated } });

      console.log(`OK (${script.split(/\s+/).length}w)`);
      written++;
      log({ event: "script_written", itemId: item.id, cefr: item.cefrLevel, words: script.split(/\s+/).length });
    } catch (err) {
      console.log(`ERROR — ${String(err).slice(0, 80)}`);
      errors++;
      log({ event: "error", itemId: item.id, error: String(err) });
    }

    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`  Scripts written: ${written}  Errors: ${errors}`);
  console.log(`  Log: ${logPath}`);
  console.log(`  Next: npx tsx scripts/generate-missing-audio.ts`);
  console.log("=".repeat(70) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
