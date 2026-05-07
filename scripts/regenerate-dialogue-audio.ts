/**
 * regenerate-dialogue-audio.ts
 *
 * Re-generates TTS audio for LISTENING items whose transcript contains
 * dialogue turns (e.g. "Chloe: ...\nLibrarian: ...").
 *
 * Uses Gemini's multi-speaker TTS API so each character gets a distinct voice.
 * Speaker voices are assigned based on name/gender heuristics.
 *
 * Usage:
 *   npx tsx scripts/regenerate-dialogue-audio.ts
 *   DRY_RUN=1 npx tsx scripts/regenerate-dialogue-audio.ts
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
if (!API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }

const ai = new GoogleGenAI({ apiKey: API_KEY });
const DRY_RUN = process.env.DRY_RUN === "1";
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../public/audio");

// Dialogue pattern: line starting with "Name: text" (handles Ms. / Mr. / Coach Miller etc.)
const DIALOGUE_LINE_RE = /^([A-Z][a-zA-Z.\s]+):\s+\S/m;

// ---------------------------------------------------------------------------
// WAV header
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
// Heuristic voice assignment by speaker name
// Gemini available voices: Aoede, Puck, Charon, Kore, Fenrir, Leda,
//   Orus, Zephyr, Umbriel, Algieba, Despina, Erinome, Gacrux, Isonoe,
//   Laomedeia, Pulcherrima, Rasalgethi, Sadachbia, Sadaltager, Schedar,
//   Sulafat, Vindemiatrix, Zubenelgenubi
// ---------------------------------------------------------------------------
const FEMALE_NAMES = new Set([
  "chloe", "sarah", "maria", "emily", "sophia", "lucy", "anna", "emma",
  "ms", "mrs", "miss", "librarian",
]);
const MALE_NAMES = new Set([
  "david", "alex", "ben", "leo", "jake", "tom", "daniel", "mark", "mr",
  "coach", "teacher",
]);

// Nice voice pairs for teen conversations (junior items)
const FEMALE_VOICE = "Aoede";  // warm, clear female
const MALE_VOICE = "Charon";   // deep, clear male
const NEUTRAL_ALT = "Kore";    // fallback second voice if both same gender

function guessGender(name: string): "female" | "male" | "unknown" {
  // Strip trailing dot (e.g. "Mr." → "mr", "Ms." → "ms")
  const lower = name.toLowerCase().split(" ")[0].replace(/\.$/, "");
  if (FEMALE_NAMES.has(lower)) return "female";
  if (MALE_NAMES.has(lower)) return "male";
  return "unknown";
}

function assignVoices(speakers: string[]): Record<string, string> {
  const assigned: Record<string, string> = {};
  // Track which voices are already used
  let femaleVoiceUsed = false;
  let maleVoiceUsed = false;

  for (const speaker of speakers) {
    const gender = guessGender(speaker);
    if (gender === "female") {
      assigned[speaker] = femaleVoiceUsed ? NEUTRAL_ALT : FEMALE_VOICE;
      femaleVoiceUsed = true;
    } else if (gender === "male") {
      assigned[speaker] = maleVoiceUsed ? "Puck" : MALE_VOICE;
      maleVoiceUsed = true;
    } else {
      // Unknown gender — alternate between voices
      const usedVoices = Object.values(assigned);
      if (!usedVoices.includes(FEMALE_VOICE)) {
        assigned[speaker] = FEMALE_VOICE;
      } else if (!usedVoices.includes(MALE_VOICE)) {
        assigned[speaker] = MALE_VOICE;
      } else {
        assigned[speaker] = NEUTRAL_ALT;
      }
    }
  }
  return assigned;
}

// ---------------------------------------------------------------------------
// Parse unique speaker names in order of appearance
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const items = await prisma.item.findMany({
    where: { skill: "LISTENING", status: "ACTIVE" },
    select: { id: true, cefrLevel: true, content: true, tags: true },
  });

  const dialogueItems = items.filter((item) => {
    const t = (item.content as any).transcript || "";
    return DIALOGUE_LINE_RE.test(t);
  });

  console.log(`\nDialogue LISTENING items found: ${dialogueItems.length}`);
  if (DRY_RUN) console.log("DRY RUN — no files or DB writes.\n");

  let generated = 0;
  let errors = 0;

  for (const item of dialogueItems) {
    const c = item.content as any;
    const transcript = c.transcript as string;
    const tags = item.tags as string[];
    const filename = `listening-${item.id}.wav`;
    const outputPath = path.join(PUBLIC_AUDIO_DIR, filename);
    const audioUrl = `/audio/${filename}`;

    const speakers = extractSpeakers(transcript);
    const voiceMap = assignVoices(speakers);

    console.log(`\n[GEN]  ${item.id} (${item.cefrLevel}) tags: ${tags.slice(0,2).join(",")}`);
    console.log(`       Speakers: ${speakers.map((s) => `${s} → ${voiceMap[s]}`).join(" | ")}`);
    console.log(`       Snippet: ${transcript.slice(0, 100)}…`);

    if (DRY_RUN) { generated++; continue; }

    try {
      // Build speakerVoiceConfigs
      const speakerVoiceConfigs = speakers.map((speaker) => ({
        speaker,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceMap[speaker] },
        },
      }));

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: transcript }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: { speakerVoiceConfigs },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) throw new Error("Empty TTS response");

      const audioParts = parts.filter((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));
      if (audioParts.length === 0) throw new Error("No audio parts in response");

      const pcm = Buffer.from(audioParts[0].inlineData!.data as string, "base64");
      const wav = buildWavHeader(pcm);
      fs.writeFileSync(outputPath, wav);

      // Update DB audioUrl (may already exist — overwrite)
      await prisma.item.update({
        where: { id: item.id },
        data: { content: { ...c, audioUrl } },
      });

      console.log(`       ✓ saved → ${filename} (${(wav.length / 1024).toFixed(0)} KB)`);
      generated++;
      await sleep(2000);
    } catch (err: any) {
      console.error(`       ✗ ERROR: ${err.message}`);
      errors++;
      await sleep(2000);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Generated: ${generated} | Errors: ${errors}`);
  if (errors > 0) console.log("Re-run with FORCE=1 to retry errors.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
