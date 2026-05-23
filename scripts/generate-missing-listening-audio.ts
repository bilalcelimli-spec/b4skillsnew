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
// NOTE: do NOT call this on dialogue transcripts — it would strip speaker labels.
// ---------------------------------------------------------------------------
function cleanTranscript(transcript: string): string {
  return transcript
    .replace(/\[([^\]]+)\]/g, "$1") // strip brackets, keep inner text
    .replace(/\*([^*]+)\*/g, "$1")  // strip asterisks (emphasis)
    .trim();
}

// ---------------------------------------------------------------------------
// Dialogue detection: "Name: text" lines
// ---------------------------------------------------------------------------
const DIALOGUE_LINE_RE = /^([A-Z][a-zA-Z.\s]+):\s+\S/m;

function isDialogue(transcript: string): boolean {
  return DIALOGUE_LINE_RE.test(transcript);
}

// Extract ordered unique speaker names from "Name: text" format
function extractSpeakers(transcript: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const re = /^([A-Z][a-zA-Z.\s]+):/gm;
  let m;
  while ((m = re.exec(transcript)) !== null) {
    const name = m[1].trim();
    if (!seen.has(name)) { seen.add(name); order.push(name); }
  }
  return order;
}

// Convert "Name: text\nName2: text" → "[Name] text\n[Name2] text" for Gemini multi-speaker
function reformatForMultiSpeaker(transcript: string): string {
  return transcript
    .replace(/^([A-Z][a-zA-Z.\s]+):\s*/gm, (_, name) => `[${name.trim()}] `)
    .trim();
}

// ---------------------------------------------------------------------------
// Voice assignment (gender-heuristic, same logic as regenerate-dialogue-audio.ts)
// ---------------------------------------------------------------------------
const FEMALE_NAMES = new Set([
  "chloe", "sarah", "maria", "emily", "sophia", "lucy", "anna", "emma",
  "grace", "kalinda", "ruth", "ms", "mrs", "miss", "librarian",
]);
const MALE_NAMES = new Set([
  "david", "alex", "ben", "leo", "jake", "tom", "daniel", "mark", "anton",
  "james", "kai", "mr", "coach", "teacher",
]);
const FEMALE_VOICE = "Aoede";
const MALE_VOICE   = "Charon";
const NEUTRAL_ALT  = "Kore";

function guessGender(name: string): "female" | "male" | "unknown" {
  const lower = name.toLowerCase().split(" ")[0].replace(/\.$/, "");
  if (FEMALE_NAMES.has(lower)) return "female";
  if (MALE_NAMES.has(lower))   return "male";
  return "unknown";
}

function assignVoices(speakers: string[]): Record<string, string> {
  const assigned: Record<string, string> = {};
  let femaleUsed = false;
  let maleUsed = false;
  for (const speaker of speakers) {
    const gender = guessGender(speaker);
    if (gender === "female") {
      assigned[speaker] = femaleUsed ? NEUTRAL_ALT : FEMALE_VOICE;
      femaleUsed = true;
    } else if (gender === "male") {
      assigned[speaker] = maleUsed ? "Puck" : MALE_VOICE;
      maleUsed = true;
    } else {
      const used = Object.values(assigned);
      if (!used.includes(FEMALE_VOICE))      assigned[speaker] = FEMALE_VOICE;
      else if (!used.includes(MALE_VOICE))   assigned[speaker] = MALE_VOICE;
      else                                   assigned[speaker] = NEUTRAL_ALT;
    }
  }
  return assigned;
}

// ---------------------------------------------------------------------------
// Voice selection for monologue items
// ---------------------------------------------------------------------------
function resolveVoice(tags: string[], cefrLevel: string): string {
  if (tags.includes("primary")) return "Aoede";
  if (tags.includes("junior")) return "Puck";
  if (tags.includes("academia")) return "Fenrir";
  if (tags.includes("corporate")) return "Orus";
  if (tags.includes("language-schools")) return "Charon";
  if (["C1", "C2"].includes(cefrLevel)) return "Umbriel";
  if (["B2", "B1"].includes(cefrLevel)) return "Kore";
  return "Aoede";
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

    // Detect dialogue: use multi-speaker TTS if ≥2 distinct speakers found
    const dialogue = isDialogue(transcript);
    const speakers = dialogue ? extractSpeakers(transcript) : [];
    const voiceMap = speakers.length >= 2 ? assignVoices(speakers) : {};

    if (dialogue && speakers.length >= 2) {
      console.log(`[GEN]   ${item.id} (${item.cefrLevel}) → MULTI-SPEAKER: ${speakers.map(s => `${s}→${voiceMap[s]}`).join(" | ")}`);
    } else {
      console.log(`[GEN]   ${item.id} (${item.cefrLevel}) → ${voiceName}`);
    }
    console.log(`        tags: ${tags.join(", ")}`);
    console.log(`        transcript preview: ${ttsText.slice(0, 80)}…`);

    if (DRY_RUN) {
      generated++;
      continue;
    }

    try {
      let speechConfig: any;
      let ttsInput: string;
      let instruction: string;

      if (dialogue && speakers.length >= 2) {
        // Multi-speaker: reformat transcript for Gemini's speaker-label syntax
        ttsInput = reformatForMultiSpeaker(transcript);
        instruction = "Read the following conversation aloud as a natural dialogue between the speakers. Do not generate any new content — only read the text provided.\n\n";
        speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakers.map((speaker) => ({
              speaker,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[speaker] } },
            })),
          },
        };
      } else {
        // Monologue: single voice as before
        ttsInput = ttsText;
        instruction = buildPrompt(tags, "", item.cefrLevel).replace(/\n\n$/, "\n\n");
        speechConfig = {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        };
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: instruction + ttsInput }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig,
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
