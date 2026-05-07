/**
 * generate-missing-listening-audio.ts
 *
 * Generates TTS audio for LISTENING items that have a `transcript` field
 * in their content JSON but no `audioUrl`.
 *
 * - FIB items: strips [answer] markers from transcript before TTS
 *   (the markers are editorial annotations; the actual words remain)
 * - MC items: uses transcript as-is
 *
 * Audio is saved to public/audio/ and content.audioUrl is patched in DB.
 *
 * Usage:
 *   npx tsx scripts/generate-missing-listening-audio.ts
 *   FORCE=1 npx tsx scripts/generate-missing-listening-audio.ts   # overwrite existing
 *   DRY_RUN=1 npx tsx scripts/generate-missing-listening-audio.ts # no writes
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
  console.error("GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const FORCE = process.env.FORCE === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../public/audio");

// ---------------------------------------------------------------------------
// WAV header — Gemini TTS returns raw 16-bit PCM at 24 kHz mono
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Clean transcript for TTS: remove editorial [answer] markers
// e.g. "She's [wearing a yellow hat]" → "She's wearing a yellow hat"
// ---------------------------------------------------------------------------
function cleanTranscript(transcript: string): string {
  return transcript
    .replace(/\[([^\]]+)\]/g, "$1") // strip brackets, keep inner text
    .replace(/\*([^*]+)\*/g, "$1")  // strip asterisks (emphasis)
    .trim();
}

// ---------------------------------------------------------------------------
// Voice selection based on item tags / product line
// ---------------------------------------------------------------------------
function resolveVoice(tags: string[], cefrLevel: string): string {
  if (tags.includes("primary")) return "Aoede";       // warm, child-friendly
  if (tags.includes("junior")) return "Puck";          // clear, youthful
  if (tags.includes("academia")) return "Fenrir";      // authoritative
  if (tags.includes("corporate")) return "Orus";       // professional
  if (tags.includes("language-schools")) return "Charon"; // clear, standard
  // Fall back by CEFR: higher levels → more natural/complex voice
  if (["C1", "C2"].includes(cefrLevel)) return "Umbriel";
  if (["B2", "B1"].includes(cefrLevel)) return "Kore";
  return "Aoede"; // A1/A2 default
}

// ---------------------------------------------------------------------------
// Build naturalness preamble
// ---------------------------------------------------------------------------
function buildPrompt(tags: string[], ttsText: string, cefrLevel: string): string {
  let preamble = "Read the following naturally and clearly:\n\n";
  if (tags.includes("primary")) {
    preamble = "Read the following in a warm, clear, slow voice suitable for young children aged 7–10 learning English:\n\n";
  } else if (tags.includes("junior")) {
    preamble = "Read the following in a clear, friendly voice at a moderate pace suitable for teenagers aged 11–14 learning English:\n\n";
  } else if (tags.includes("academia")) {
    preamble = "Read the following as a natural academic conversation, clearly and at a thoughtful pace:\n\n";
  } else if (tags.includes("corporate")) {
    preamble = "Read the following in a professional, clear voice as if in a workplace conversation:\n\n";
  }
  return preamble + ttsText;
}

// ---------------------------------------------------------------------------
// Rate limit helper — wait between API calls
// ---------------------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  }

  // Find all ACTIVE LISTENING items with transcript but no audioUrl
  const items = await prisma.item.findMany({
    where: { skill: "LISTENING", status: "ACTIVE" },
    select: { id: true, type: true, cefrLevel: true, content: true, tags: true },
  });

  const targets = items.filter((item) => {
    const c = item.content as Record<string, unknown>;
    return !c.audioUrl && c.transcript;
  });

  console.log(`\nTotal LISTENING items: ${items.length}`);
  console.log(`Items needing audio: ${targets.length}`);
  if (DRY_RUN) console.log("DRY RUN — no files or DB writes.\n");

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of targets) {
    const c = item.content as Record<string, unknown>;
    const transcript = c.transcript as string;
    const tags = item.tags as string[];
    const filename = `listening-${item.id}.wav`;
    const outputPath = path.join(PUBLIC_AUDIO_DIR, filename);
    const audioUrl = `/audio/${filename}`;

    if (!FORCE && fs.existsSync(outputPath)) {
      console.log(`[SKIP]  ${item.id} — file exists`);
      // Patch audioUrl in DB even if file exists (in case it was missed)
      if (!DRY_RUN) {
        await prisma.item.update({
          where: { id: item.id },
          data: { content: { ...(item.content as object), audioUrl } },
        });
      }
      skipped++;
      continue;
    }

    const ttsText = cleanTranscript(transcript);
    const voiceName = resolveVoice(tags, item.cefrLevel);
    const prompt = buildPrompt(tags, ttsText, item.cefrLevel);

    console.log(`[GEN]   ${item.id} (${item.cefrLevel}) → ${voiceName}`);
    console.log(`        tags: ${tags.join(", ")}`);
    console.log(`        transcript preview: ${ttsText.slice(0, 80)}…`);

    if (DRY_RUN) {
      generated++;
      continue;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        throw new Error("Empty response from Gemini TTS");
      }

      const audioParts = parts.filter((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));
      if (audioParts.length === 0) {
        throw new Error("No audio parts in Gemini TTS response");
      }

      const pcmBase64 = audioParts[0].inlineData!.data as string;
      const pcm = Buffer.from(pcmBase64, "base64");
      const wav = buildWavHeader(pcm);
      fs.writeFileSync(outputPath, wav);

      // Patch content.audioUrl in DB
      await prisma.item.update({
        where: { id: item.id },
        data: { content: { ...(item.content as object), audioUrl } },
      });

      console.log(`        ✓ saved → ${filename} (${(wav.length / 1024).toFixed(0)} KB)`);
      generated++;

      // Rate limit — Gemini TTS is billed per request
      await sleep(1500);
    } catch (err: any) {
      console.error(`        ✗ ERROR: ${err.message}`);
      errors++;
      await sleep(2000);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Generated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
