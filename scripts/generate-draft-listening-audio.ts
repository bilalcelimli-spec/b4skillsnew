/**
 * generate-draft-listening-audio.ts
 *
 * Generates TTS audio for the 54 DRAFT LISTENING items that have a
 * `ttsScript` field (multi-speaker dialogue) but no `audioUrl`.
 *
 * All 54 items use [Speaker A] / [Speaker B] dialogue, so we use
 * Gemini 2.5 Flash multi-speaker TTS for natural two-voice output.
 *
 * Voice pairs vary by CEFR level and topic tags:
 *   Primary / Junior   → Aoede (F) + Puck (M)   — warm, youthful
 *   B1 / B2 academia   → Kore (F) + Fenrir (M)  — clear, academic
 *   B2 / C1 corporate  → Aoede (F) + Orus (M)   — professional
 *   Default            → Kore (F) + Charon (M)  — neutral, clear
 *
 * Audio is saved to public/audio/listening-<id>.wav (16-bit PCM 24 kHz).
 * content.audioUrl is patched in DB after each successful synthesis.
 *
 * Usage:
 *   npx tsx scripts/generate-draft-listening-audio.ts
 *   DRY_RUN=1 npx tsx scripts/generate-draft-listening-audio.ts
 *   FORCE=1   npx tsx scripts/generate-draft-listening-audio.ts  # overwrite existing
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Modality } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌  GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const FORCE = process.env.FORCE === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../public/audio");

// ── WAV header builder (Gemini TTS → 16-bit PCM, 24 kHz, mono) ──────────────

const WAV_SAMPLE_RATE = 24000;
const WAV_CHANNELS = 1;
const WAV_BITS = 16;

function buildWavHeader(pcm: Buffer): Buffer {
  const byteRate = WAV_SAMPLE_RATE * WAV_CHANNELS * (WAV_BITS / 8);
  const blockAlign = WAV_CHANNELS * (WAV_BITS / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(WAV_CHANNELS, 22);
  header.writeUInt32LE(WAV_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(WAV_BITS, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ── Voice-pair selection ──────────────────────────────────────────────────────

interface VoicePair { speakerA: string; speakerB: string }

function resolveVoicePair(tags: string[], cefrLevel: string): VoicePair {
  if (tags.includes("primary"))    return { speakerA: "Aoede",  speakerB: "Puck"   };
  if (tags.includes("junior"))     return { speakerA: "Aoede",  speakerB: "Puck"   };
  if (tags.includes("academia"))   return { speakerA: "Kore",   speakerB: "Fenrir" };
  if (tags.includes("corporate"))  return { speakerA: "Aoede",  speakerB: "Orus"   };
  if (["C1", "C2"].includes(cefrLevel)) return { speakerA: "Umbriel", speakerB: "Fenrir" };
  if (["B2", "B1"].includes(cefrLevel)) return { speakerA: "Kore",    speakerB: "Charon" };
  return { speakerA: "Aoede", speakerB: "Puck" };
}

// ── Detect speaker labels actually used in this ttsScript ─────────────────────
// Excludes known stage-direction tokens (pause, long pause, sound, music, etc.)

const STAGE_DIRECTIONS = new Set([
  "pause", "long pause", "short pause", "brief pause",
  "sound", "music", "sfx", "noise", "ambient",
  "narrator", "narration",
]);

function detectSpeakers(ttsScript: string): string[] {
  const found = new Set<string>();
  for (const m of ttsScript.matchAll(/\[([^\]]+)\]/g)) {
    const label = m[1].trim().toLowerCase();
    if (!STAGE_DIRECTIONS.has(label)) {
      found.add(m[1].trim()); // preserve original casing
    }
  }
  return [...found];
}

// ── Rate-limit helper ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  }

  const items = await prisma.item.findMany({
    where: { skill: "LISTENING", status: "DRAFT" },
    select: { id: true, cefrLevel: true, tags: true, content: true },
  });

  // Target: has ttsScript, no audioUrl
  const targets = items.filter((item) => {
    const c = item.content as Record<string, unknown>;
    return !!c.ttsScript && !c.audioUrl;
  });

  console.log(`\nDRAFT LISTENING items total : ${items.length}`);
  console.log(`Needing audio generation   : ${targets.length}`);
  if (DRY_RUN) console.log("⚠️  DRY RUN — no files or DB writes.\n");
  else         console.log();

  let generated = 0;
  let skipped   = 0;
  let errors    = 0;

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    const c = item.content as Record<string, unknown>;
    const ttsScript = c.ttsScript as string;
    const tags = (item.tags ?? []) as string[];
    const filename  = `listening-${item.id}.wav`;
    const outputPath = path.join(PUBLIC_AUDIO_DIR, filename);
    const audioUrl  = `/audio/${filename}`;

    const { speakerA, speakerB } = resolveVoicePair(tags, item.cefrLevel);
    const speakers = detectSpeakers(ttsScript);

    console.log(`[${i + 1}/${targets.length}] ${item.id.slice(0, 10)} (${item.cefrLevel})`);
    console.log(`  voices : ${speakerA} / ${speakerB}`);
    console.log(`  labels : ${speakers.join(", ")}`);
    console.log(`  preview: ${ttsScript.replace(/\n/g, " ").slice(0, 90)}…`);

    if (!FORCE && fs.existsSync(outputPath)) {
      console.log("  ↳ file already exists — patching DB\n");
      if (!DRY_RUN) {
        await prisma.item.update({
          where: { id: item.id },
          data: { content: { ...(item.content as object), audioUrl } },
        });
      }
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log("  ↳ [DRY RUN] would generate\n");
      generated++;
      continue;
    }

    try {
      // Build speakerVoiceConfigs: map the first two unique speaker labels
      // to the resolved voice pair (A=speakerA, B=speakerB).
      const [labelA, labelB] = speakers;
      const speakerVoiceConfigs: any[] = [];

      if (labelA) {
        speakerVoiceConfigs.push({
          speaker: labelA,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerA } },
        });
      }
      if (labelB) {
        speakerVoiceConfigs.push({
          speaker: labelB,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerB } },
        });
      }

      const speechConfig =
        speakerVoiceConfigs.length >= 2
          ? { multiSpeakerVoiceConfig: { speakerVoiceConfigs } }
          : { voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerA } } };

      // Explicit instruction required — without it Gemini sometimes tries to
      // generate text instead of reading the transcript (INVALID_ARGUMENT 400).
      const instruction =
        speakerVoiceConfigs.length >= 2
          ? "Read the following conversation aloud as a natural dialogue between the two speakers. Do not generate any new content — only read the text provided.\n\n"
          : "Read the following text aloud naturally and clearly. Do not generate any new content — only read the text provided.\n\n";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: instruction + ttsScript }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig,
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const audioPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));
      if (!audioPart) throw new Error("No audio part in Gemini TTS response");

      const pcm = Buffer.from(audioPart.inlineData!.data as string, "base64");
      const wav = buildWavHeader(pcm);
      fs.writeFileSync(outputPath, wav);

      await prisma.item.update({
        where: { id: item.id },
        data: {
          content: { ...(item.content as object), audioUrl },
          status:  "ACTIVE",   // promote DRAFT → ACTIVE now it has audio
        },
      });

      console.log(`  ✅ saved ${filename} (${(wav.length / 1024).toFixed(0)} KB) → status ACTIVE\n`);
      generated++;
      await sleep(1500); // respect Gemini rate limits
    } catch (err: any) {
      console.error(`  ✗ ERROR: ${err.message}\n`);
      errors++;
      await sleep(2500);
    }
  }

  console.log("══════════════════════════════════════════");
  console.log(`Generated (→ ACTIVE): ${generated}`);
  console.log(`Skipped (file existed): ${skipped}`);
  console.log(`Errors:               ${errors}`);
  console.log("══════════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
