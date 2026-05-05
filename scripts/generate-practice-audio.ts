/**
 * generate-practice-audio.ts
 * Generates a short practice/demo audio file for the PracticeMode tutorial
 * using Gemini 2.5 Flash TTS and saves it to public/audio/practice-demo.wav
 *
 * Usage:  npx tsx scripts/generate-practice-audio.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Modality } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SCRIPT = `
Hello! Welcome to the listening practice.
In the actual test, you will hear a short audio recording like this one.
Listen carefully — you can play it a maximum of two times.
After listening, answer the question below.
Good luck!
`.trim();

async function pcm16ToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Promise<Buffer> {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);        // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const outDir = path.join(__dirname, "../public/audio");
  const outPath = path.join(outDir, "practice-demo.wav");

  if (fs.existsSync(outPath)) {
    console.log("practice-demo.wav already exists — skipping (delete it to regenerate).");
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  console.log("Generating practice demo audio via Gemini TTS…");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: SCRIPT }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    } as any,
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("No audio data in Gemini response");

  const pcm = Buffer.from(audioData, "base64");
  const wav = await pcm16ToWav(pcm);
  fs.writeFileSync(outPath, wav);
  console.log(`Saved: ${outPath} (${(wav.length / 1024).toFixed(1)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
