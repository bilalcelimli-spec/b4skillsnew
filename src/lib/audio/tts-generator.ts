/**
 * tts-generator — Gemini 2.5 Flash TTS wrapper
 *
 * Shared library used by both the in-app API endpoint
 * (POST /api/items/:id/generate-audio) and the CLI batch script
 * (scripts/generate-listening-audio-gemini.ts).
 *
 * Gemini TTS returns raw 16-bit PCM at 24 kHz mono.
 * We prepend a RIFF/WAV header so browsers can play it directly.
 */

import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";
import path from "path";

// ── WAV constants ─────────────────────────────────────────────────────────────

const WAV_SAMPLE_RATE = 24_000;
const WAV_CHANNELS    = 1;
const WAV_BITS        = 16;

export function buildWavHeader(pcm: Buffer): Buffer {
  const byteRate   = WAV_SAMPLE_RATE * WAV_CHANNELS * (WAV_BITS / 8);
  const blockAlign = WAV_CHANNELS * (WAV_BITS / 8);
  const header     = Buffer.alloc(44);

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

// ── Voice assignments ─────────────────────────────────────────────────────────
// Voices confirmed available on Gemini 2.5 Flash TTS.
// Selected for register + age appropriacy per product line.

export function resolveVoice(moduleId: string, productLine?: string): string {
  const line = productLine?.toLowerCase() ?? "";
  if (line.includes("primary") || moduleId.startsWith("primary-"))       return "Aoede";    // warm, child-friendly
  if (line.includes("junior") || moduleId.startsWith("junior-"))         return "Puck";     // clear, youthful
  if (line.includes("diagnostic") || moduleId.startsWith("diagnostic-")) return "Kore";     // natural, neutral
  if (line.includes("academia") || moduleId.startsWith("academia-"))     return "Fenrir";   // authoritative, measured
  if (line.includes("corporate") || moduleId.startsWith("corporate-"))   return "Orus";     // professional, clear
  if (line.includes("langschool") || moduleId.startsWith("langschool-")) return "Charon";   // clear, standard
  if (line.includes("special") || moduleId.startsWith("specialized-"))   return "Umbriel";  // thoughtful, measured
  return "Kore";
}

// ── Naturalness-enhanced TTS prompt ─────────────────────────────────────────

export function buildTtsPrompt(moduleId: string, ttsScript: string, cefr: string, productLine?: string): string {
  const line = productLine?.toLowerCase() ?? "";
  const preambles: Array<[string, string]> = [
    ["primary",    "Read the following in a warm, clear, unhurried voice suitable for young children aged 7–10 learning English. Pronounce every word distinctly:\n\n"],
    ["junior",     "Read the following in a clear, friendly voice at a moderate pace for teenagers aged 11–14 learning English:\n\n"],
    ["diagnostic", "Read the following naturally and conversationally, as if you are speaking in a real-life situation. Do not sound like a recording:\n\n"],
    ["academia",   "Read the following as a measured academic lecture. Speak clearly at a thoughtful, authoritative pace:\n\n"],
    ["corporate",  "Read the following in a professional, clear voice as if in a workplace setting. Sound confident and concise:\n\n"],
    ["langschool", "Read the following naturally and clearly, at a pace suitable for language learners:\n\n"],
    ["special",    "Read the following in a thoughtful, engaged manner appropriate for advanced language assessment:\n\n"],
  ];

  const prefix = preambles.find(([k]) => line.includes(k) || moduleId.startsWith(k + "-"))?.[1]
    ?? (cefr <= "A2"
      ? "Read the following clearly and slowly. Pronounce every word distinctly:\n\n"
      : cefr <= "B2"
        ? "Read the following naturally and clearly:\n\n"
        : "Read the following at a natural, fluent pace as in authentic conversation:\n\n");

  return prefix + ttsScript;
}

// ── Main export ────────────────────────────────────────────────────────────────

export interface TtsResult {
  audioUrl: string;       // relative URL served by Express static (/audio/...)
  absolutePath: string;   // full filesystem path of the saved WAV
  durationSeconds: number;
  voiceName: string;
  fileSizeKb: number;
}

export async function generateListeningAudio(opts: {
  moduleId: string;
  ttsScript: string;
  cefrLevel: string;
  productLine?: string;
  /** Absolute path to the directory where WAV files are saved. Defaults to <cwd>/public/audio */
  outputDir?: string;
}): Promise<TtsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const outputDir = opts.outputDir ?? path.join(process.cwd(), "public", "audio");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const voiceName = resolveVoice(opts.moduleId, opts.productLine);
  const prompt    = buildTtsPrompt(opts.moduleId, opts.ttsScript, opts.cefrLevel, opts.productLine);
  const ai        = new GoogleGenAI({ apiKey });

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
  if (!part?.inlineData?.data) {
    throw new Error("Gemini TTS returned no audio data");
  }

  const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
  const wavBuffer = buildWavHeader(pcmBuffer);

  const fileName     = `${opts.moduleId}.wav`;
  const absolutePath = path.join(outputDir, fileName);
  fs.writeFileSync(absolutePath, wavBuffer);

  // Estimate duration: PCM bytes / (sampleRate × channels × bytesPerSample)
  const durationSeconds = Math.round(pcmBuffer.length / (WAV_SAMPLE_RATE * WAV_CHANNELS * (WAV_BITS / 8)));

  return {
    audioUrl: `/audio/${fileName}`,
    absolutePath,
    durationSeconds,
    voiceName,
    fileSizeKb: Math.round(wavBuffer.length / 1024),
  };
}
