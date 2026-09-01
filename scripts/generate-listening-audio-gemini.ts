/**
 * Listening Audio Generator — Google Gemini 2.5 Flash TTS
 *
 * Reads all unique LISTENING modules from the database, generates natural-sounding
 * audio with Gemini 2.5 Flash TTS, saves WAV files to public/audio/, then patches
 * every item in that module with content.audioUrl pointing to the file.
 *
 * Uses src/lib/audio/tts-generator.ts — single source of truth for TTS logic.
 *
 * Usage:
 *   npx tsx scripts/generate-listening-audio-gemini.ts
 *   FORCE=1 npx tsx scripts/generate-listening-audio-gemini.ts  # overwrite existing
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { generateListeningAudio } from "../src/lib/audio/tts-generator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const FORCE = process.env.FORCE === "1";
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../public/audio");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
    console.log(`Created: ${PUBLIC_AUDIO_DIR}`);
  }

  // Fetch all LISTENING items
  const items = await prisma.item.findMany({
    where: { skill: "LISTENING" },
    select: { id: true, cefrLevel: true, content: true },
  });

  // Deduplicate by moduleId, collecting item IDs per module
  const moduleMap = new Map<string, { ttsScript: string; cefr: string; itemIds: string[] }>();
  for (const item of items) {
    const c = item.content as Record<string, any> | null;
    if (!c?.moduleId || !c?.ttsScript) continue;
    const mid = c.moduleId as string;
    if (!moduleMap.has(mid)) {
      moduleMap.set(mid, { ttsScript: c.ttsScript, cefr: item.cefrLevel, itemIds: [] });
    }
    moduleMap.get(mid)!.itemIds.push(item.id);
  }

  console.log(`\n🎙  Found ${moduleMap.size} unique listening modules.\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const [moduleId, { ttsScript, cefr, itemIds }] of moduleMap.entries()) {
    const outputPath = path.join(PUBLIC_AUDIO_DIR, `${moduleId}.wav`);
    const audioUrl = `/audio/${moduleId}.wav`;

    if (!FORCE && fs.existsSync(outputPath)) {
      console.log(`[SKIP]  ${moduleId} — file exists`);
      await patchAudioUrl(itemIds, audioUrl);
      skipped++;
      continue;
    }

    try {
      console.log(`[GEN]   ${moduleId} (${cefr})`);
      const result = await generateListeningAudio({ moduleId, ttsScript, cefrLevel: cefr, outputDir: PUBLIC_AUDIO_DIR });
      console.log(`[OK]    ${result.fileSizeKb} KB, ${result.durationSeconds}s, voice: ${result.voiceName} → ${result.absolutePath}`);
      await patchAudioUrl(itemIds, result.audioUrl);
      generated++;
      // Respect rate limits — Gemini TTS: ~10 RPM on free tier
      await new Promise((r) => setTimeout(r, 4000));
    } catch (err: any) {
      console.error(`[ERR]   ${moduleId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Generated : ${generated}
 Skipped   : ${skipped}
 Errors    : ${errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

async function patchAudioUrl(itemIds: string[], audioUrl: string) {
  for (const id of itemIds) {
    const item = await prisma.item.findUnique({ where: { id }, select: { content: true } });
    if (!item) continue;
    const existing = (item.content as Record<string, any>) ?? {};
    if (existing.audioUrl === audioUrl) continue;
    await prisma.item.update({
      where: { id },
      data: { content: { ...existing, audioUrl } },
    });
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
