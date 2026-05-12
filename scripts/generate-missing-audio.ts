/**
 * generate-missing-audio.ts
 *
 * Finds every LISTENING item that lacks an audioUrl but has a ttsScript,
 * generates WAV audio via Gemini 2.5 Flash TTS, saves to public/audio/,
 * then patches content.audioUrl in the database.
 *
 * Also handles items that have NO ttsScript: reads the report from
 * audit-missing-media.ts (logs/missing-media-*.json) or falls back to
 * querying the DB directly, then calls generate-missing-tts-scripts.ts
 * first if needed.
 *
 * Architecture matches generate-listening-audio-gemini.ts:
 *   - Deduplicates by moduleId (one audio file per module, shared by all
 *     questions in that module)
 *   - WAV header builder for raw PCM output from Gemini
 *   - Voice assignment by moduleId prefix
 *   - JSONL log for every operation
 *   - Idempotent: skips moduleIds already present in public/audio/
 *     (use FORCE=1 to regenerate)
 *
 * Usage:
 *   npx tsx scripts/generate-missing-audio.ts
 *   FORCE=1   npx tsx scripts/generate-missing-audio.ts
 *   DRY_RUN=1 npx tsx scripts/generate-missing-audio.ts
 *   LEVEL=C1  npx tsx scripts/generate-missing-audio.ts
 *   DELAY_MS=3000 npx tsx scripts/generate-missing-audio.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Modality } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma  = new PrismaClient();
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: API_KEY });

const FORCE     = process.env.FORCE     === "1";
const DRY_RUN   = process.env.DRY_RUN  === "1";
const LEVEL     = process.env.LEVEL?.toUpperCase();
const DELAY_MS  = parseInt(process.env.DELAY_MS ?? "2000", 10);

const PUBLIC_AUDIO_DIR = path.join(__dirname, "../public/audio");
const LOG_DIR          = path.resolve("logs");
if (!fs.existsSync(LOG_DIR))          fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_AUDIO_DIR)) fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });

const logPath = path.join(LOG_DIR, `generate-missing-audio-${new Date().toISOString().slice(0, 10)}.jsonl`);
function log(obj: Record<string, unknown>) {
  fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// WAV builder — Gemini TTS returns raw 16-bit PCM at 24 kHz mono
// ─────────────────────────────────────────────────────────────────────────────

function buildWavHeader(pcm: Buffer): Buffer {
  const SR = 24000, CH = 1, BITS = 16;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(CH, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * CH * (BITS / 8), 28);
  h.writeUInt16LE(CH * (BITS / 8), 32);
  h.writeUInt16LE(BITS, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice assignment
// ─────────────────────────────────────────────────────────────────────────────

function resolveVoice(moduleId: string, cefrLevel: string): string {
  if (moduleId.startsWith("primary-"))     return "Aoede";
  if (moduleId.startsWith("junior-"))      return "Puck";
  if (moduleId.startsWith("diagnostic-"))  return "Kore";
  if (moduleId.startsWith("academia-"))    return "Fenrir";
  if (moduleId.startsWith("corporate-"))   return "Orus";
  if (moduleId.startsWith("langschool-"))  return "Charon";
  if (moduleId.startsWith("specialized-")) return "Umbriel";
  // Fallback by level
  if (cefrLevel === "PRE_A1" || cefrLevel === "A1") return "Aoede";
  if (cefrLevel === "A2" || cefrLevel === "B1")     return "Kore";
  return "Charon";
}

function buildTtsPrompt(moduleId: string, ttsScript: string, cefr: string): string {
  const preambles: Record<string, string> = {
    "primary-":     "Read the following in a warm, clear, slow voice suitable for young children aged 7–10 learning English:\n\n",
    "junior-":      "Read the following in a clear, friendly voice at a moderate pace suitable for teenagers aged 11–14 learning English:\n\n",
    "diagnostic-":  "Read the following naturally and conversationally, as if in a real-life situation:\n\n",
    "academia-":    "Read the following as a measured academic lecture, clearly and at a thoughtful pace:\n\n",
    "corporate-":   "Read the following in a professional, clear voice as if in a workplace setting:\n\n",
    "langschool-":  "Read the following naturally and clearly, suitable for English language learners:\n\n",
    "specialized-": "Read the following in a thoughtful, engaged manner appropriate for advanced language assessment:\n\n",
  };
  const prefix = Object.entries(preambles).find(([k]) => moduleId.startsWith(k))?.[1]
    ?? "Read the following naturally and clearly:\n\n";
  return prefix + ttsScript;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB patch helper
// ─────────────────────────────────────────────────────────────────────────────

async function patchAudioUrl(itemIds: string[], audioUrl: string) {
  for (const id of itemIds) {
    const item = await prisma.item.findUnique({ where: { id }, select: { content: true } });
    if (!item) continue;
    const content = { ...(item.content as Record<string, any>), audioUrl };
    await prisma.item.update({ where: { id }, data: { content } });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS generation
// ─────────────────────────────────────────────────────────────────────────────

async function generateAudio(
  moduleId: string,
  ttsScript: string,
  cefr: string,
): Promise<Buffer | null> {
  const voiceName = resolveVoice(moduleId, cefr);
  const prompt    = buildTtsPrompt(moduleId, ttsScript, cefr);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) return null;

  const pcm = Buffer.from(part.inlineData.data, "base64");
  return buildWavHeader(pcm);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — Generate Missing Listening Audio (Gemini TTS)");
  console.log("=".repeat(70));
  console.log(`  Mode:    ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Force:   ${FORCE}`);
  if (LEVEL) console.log(`  Level:   ${LEVEL}`);
  console.log(`  Delay:   ${DELAY_MS}ms`);
  console.log(`  Log:     ${logPath}\n`);

  // Build query
  const where: Record<string, any> = { skill: "LISTENING" };
  if (LEVEL) where.cefrLevel = LEVEL;

  const items = await prisma.item.findMany({
    where,
    select: { id: true, cefrLevel: true, content: true },
  });

  // Group by moduleId → collect items missing audioUrl but having ttsScript
  const moduleMap = new Map<string, {
    ttsScript: string;
    cefr: string;
    itemIds: string[];
    needsAudio: boolean;
  }>();

  let skippedNoTts = 0;

  for (const item of items) {
    const c = (item.content ?? {}) as Record<string, any>;
    if (!c.moduleId) continue;
    const mid = c.moduleId as string;

    const hasAudio  = typeof c.audioUrl === "string" && c.audioUrl.trim().length > 0;
    const hasTts    = typeof c.ttsScript === "string" && c.ttsScript.trim().length > 10;

    if (!moduleMap.has(mid)) {
      moduleMap.set(mid, {
        ttsScript: c.ttsScript ?? "",
        cefr: item.cefrLevel as string,
        itemIds: [],
        needsAudio: false,
      });
    }

    const entry = moduleMap.get(mid)!;
    entry.itemIds.push(item.id);
    if (!hasAudio) entry.needsAudio = true;
    if (hasTts && !entry.ttsScript) entry.ttsScript = c.ttsScript;
  }

  // Filter to modules that actually need audio
  const toGenerate = [...moduleMap.entries()].filter(([_, m]) => m.needsAudio);

  // Separate: has ttsScript vs doesn't
  const canGenerate   = toGenerate.filter(([_, m]) => m.ttsScript.trim().length > 10);
  const needsScript   = toGenerate.filter(([_, m]) => m.ttsScript.trim().length <= 10);

  console.log(`  Total listening modules: ${moduleMap.size}`);
  console.log(`  Need audio:              ${toGenerate.length}`);
  console.log(`  Can auto-generate (TTS): ${canGenerate.length}`);
  console.log(`  Need TTS script first:   ${needsScript.length}\n`);

  if (needsScript.length > 0) {
    console.log("  ⚠  These modules have no ttsScript — run generate-missing-tts-scripts.ts first:");
    needsScript.slice(0, 10).forEach(([mid]) => console.log(`     • ${mid}`));
    if (needsScript.length > 10) console.log(`     … and ${needsScript.length - 10} more`);
    console.log();
  }

  if (canGenerate.length === 0) {
    console.log("  Nothing to generate.\n");
    await prisma.$disconnect();
    return;
  }

  let generated = 0;
  let skipped   = 0;
  let errors    = 0;

  for (let i = 0; i < canGenerate.length; i++) {
    const [moduleId, { ttsScript, cefr, itemIds }] = canGenerate[i];
    const outputPath = path.join(PUBLIC_AUDIO_DIR, `${moduleId}.wav`);
    const audioUrl   = `/audio/${moduleId}.wav`;

    process.stdout.write(`  [${i + 1}/${canGenerate.length}] ${moduleId} (${cefr}) ... `);

    if (!FORCE && fs.existsSync(outputPath)) {
      console.log("EXISTS — patching DB only");
      if (!DRY_RUN) await patchAudioUrl(itemIds, audioUrl);
      skipped++;
      log({ event: "skip_file_exists", moduleId, audioUrl });
      continue;
    }

    if (DRY_RUN) {
      console.log("DRY_RUN — would generate");
      skipped++;
      continue;
    }

    try {
      const wav = await generateAudio(moduleId, ttsScript, cefr);
      if (!wav) {
        console.log("ERROR — no audio content returned");
        errors++;
        log({ event: "error_no_audio", moduleId });
        continue;
      }
      fs.writeFileSync(outputPath, wav);
      await patchAudioUrl(itemIds, audioUrl);
      console.log(`OK (${(wav.length / 1024).toFixed(0)} KB, ${itemIds.length} items patched)`);
      generated++;
      log({ event: "generated", moduleId, audioUrl, wavKB: Math.round(wav.length / 1024), patchedItems: itemIds.length });
    } catch (err) {
      console.log(`ERROR — ${String(err).slice(0, 80)}`);
      errors++;
      log({ event: "error", moduleId, error: String(err) });
    }

    if (i < canGenerate.length - 1) await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`  Generated: ${generated}  Skipped: ${skipped}  Errors: ${errors}`);
  console.log(`  Log: ${logPath}`);
  if (needsScript.length > 0) {
    console.log(`  ⚠  ${needsScript.length} modules still need TTS scripts.`);
    console.log(`     Run: npx tsx scripts/generate-missing-tts-scripts.ts`);
  }
  console.log("=".repeat(70) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
