/**
 * Listening Audio Generator — Google Gemini 2.5 Flash TTS
 *
 * Reads all unique LISTENING modules from the database, generates natural-sounding
 * audio with Gemini 2.5 Flash TTS, saves WAV files to public/audio/, then patches
 * every item in that module with content.audioUrl pointing to the file.
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
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../public/audio");

// ---------------------------------------------------------------------------
// Voice assignments — map moduleId prefix → Gemini voice name
// Available voices (confirmed): aoede, autonoe, callirrhoe, charon, despina, enceladus,
//   erinome, fenrir, gacrux, iapetus, kore, laomedeia, leda, orus, puck, pulcherrima,
//   rasalgethi, sadachbia, sadaltager, schedar, sulafat, umbriel, vindemiatrix, zephyr
// ---------------------------------------------------------------------------
function resolveVoice(moduleId: string): string {
  if (moduleId.startsWith("primary-"))     return "Aoede";    // warm, gentle, child-friendly
  if (moduleId.startsWith("junior-"))      return "Puck";     // clear, youthful
  if (moduleId.startsWith("diagnostic-"))  return "Kore";     // natural, neutral
  if (moduleId.startsWith("academia-"))    return "Fenrir";   // authoritative, measured
  if (moduleId.startsWith("corporate-"))   return "Orus";     // professional, clear
  if (moduleId.startsWith("langschool-"))  return "Charon";   // clear, standard
  if (moduleId.startsWith("specialized-")) return "Umbriel";  // thoughtful, measured
  return "Kore"; // fallback
}

// ---------------------------------------------------------------------------
// Build a naturalness-enhanced prompt for Gemini TTS
// Instructional prefix improves prosody without relying on SSML
// ---------------------------------------------------------------------------
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
      // Still patch audioUrl in DB if missing
      await patchAudioUrl(itemIds, audioUrl);
      skipped++;
      continue;
    }

    const voiceName = resolveVoice(moduleId);
    const prompt = buildTtsPrompt(moduleId, ttsScript, cefr);

    try {
      console.log(`[GEN]   ${moduleId} → voice: ${voiceName} (${cefr})`);

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

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (!part?.inlineData?.data) {
        throw new Error("No audio data returned from Gemini");
      }

      const audioBuffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`[OK]    Saved ${(audioBuffer.length / 1024).toFixed(0)} KB → ${outputPath}`);

      await patchAudioUrl(itemIds, audioUrl);
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
    if (existing.audioUrl === audioUrl) continue; // already patched
    await prisma.item.update({
      where: { id },
      data: { content: { ...existing, audioUrl } },
    });
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
