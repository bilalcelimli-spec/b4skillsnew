#!/usr/bin/env tsx

/**
 * TTS audio for the Primary (7-10) listening DRAFTs made by
 * generate-primary-expansion.ts. Dry-run by default.
 *
 *   npx tsx scripts/jobs/generate-primary-listening-audio.ts            # plan: speakers, voices, script
 *   npx tsx scripts/jobs/generate-primary-listening-audio.ts --apply    # synthesise, upload, set audioUrl
 *   npx tsx scripts/jobs/generate-primary-listening-audio.ts --apply --limit 2
 *
 * Voices follow the speaker label (Mum → adult female, Kenji → boy …) instead
 * of turn order, so "Dad" never gets a female voice. Gemini dialogue mode
 * takes two voices; with 3+ speakers they are grouped by gender and the item
 * is listed as "shared voices" for the human listening check.
 *
 * Files go to the public Supabase bucket question-audio under
 * primary/<run>/<itemId>.wav (immutable, upsert off). Only DRAFT items of
 * this job without audio are touched; every item stays DRAFT with
 * audioMetadata.humanListeningVerdict = "PENDING".
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { GoogleGenAI, Modality } from "@google/genai";
import { prisma } from "../../src/lib/prisma.js";
import { buildWavHeader, buildTtsPrompt } from "../../src/lib/audio/tts-generator.js";
import { parseSpeakerTurn } from "../../src/lib/audio/speaker-labels.js";
import { inspectWav } from "../../src/lib/audio/wav-evidence.js";
import { supabaseStorageClient } from "../../src/lib/storage/private-storage.js";

const APPLY = process.argv.includes("--apply");
const li = process.argv.indexOf("--limit");
const LIMIT = li >= 0 ? Number(process.argv[li + 1]) : Infinity;
const BUCKET = "question-audio";
const MODEL = "gemini-2.5-flash-preview-tts";

type Kind = "adultF" | "childF" | "adultM" | "childM";
const VOICE: Record<Kind, [string, string]> = {
  adultF: ["Aoede", "Kore"], childF: ["Leda", "Aoede"],
  adultM: ["Charon", "Puck"], childM: ["Puck", "Charon"],
};
const F_ADULT = /^(mum|mom|mother|grandma|granny|aunt|miss|ms|mrs|teacher|librarian)\b/i;
const M_ADULT = /^(dad|father|grandpa|grandad|uncle|mr|coach)\b/i;
const F_CHILD = /^(amara|sofia|lily|maya|mia|yuna|priya|fatima|leila|zara|hana|nadia|elif|rosa|aiko|ingrid|malia|lena)\b/i;
const M_CHILD = /^(kenji|ravi|liam|leo|tom|omar|elias|tobias|kwame|tariq|marcus|soren|arnav|emeka|jonas|daniel|dario|chidi)\b/i;
function kindOf(label: string): Kind {
  if (F_ADULT.test(label)) return "adultF";
  if (M_ADULT.test(label)) return "adultM";
  if (M_CHILD.test(label)) return "childM";
  if (F_CHILD.test(label)) return "childF";
  return "adultF"; // unknown narrator/announcer
}
const isFemale = (k: Kind) => k === "adultF" || k === "childF";

/** Plain spoken text: no markup, no quote marks around turns. */
const clean = (s: string) => s.replace(/\*+/g, "").replace(/^["“”']+|["“”']+$/g, "").replace(/\s+/g, " ").trim();

interface Plan { prompt: string; speechConfig: Record<string, unknown>; voices: string; speakers: string[]; sharedVoices: boolean }

function plan(script: string): Plan {
  const turns = script.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => parseSpeakerTurn(l) ?? { speaker: "", utterance: l });
  const speakers = [...new Set(turns.map((t) => t.speaker).filter(Boolean))];
  const pre = "Read this conversation for children aged 7 to 10 who are learning English. Speak slowly and clearly, in a warm, friendly way, with a short pause between turns.\n\n";

  if (speakers.length < 2) {
    const kind = kindOf(speakers[0] ?? "");
    const voice = VOICE[kind][0];
    const text = turns.map((t) => clean(t.utterance)).join("\n");
    return { prompt: buildTtsPrompt("primary-item", text, "A1", "primary"), speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }, voices: voice, speakers, sharedVoices: false };
  }

  // Two voice channels. Two speakers: one each. 3+: adults vs children (a teacher
  // talking to a class), else by gender, else alternate.
  const kinds = speakers.map(kindOf);
  let channel: number[];
  if (speakers.length === 2) channel = [0, 1];
  else {
    const adult = kinds.map((k) => k.startsWith("adult"));
    const fem = kinds.map(isFemale);
    channel = adult.some((a) => a !== adult[0]) ? adult.map((a) => (a === adult[0] ? 0 : 1))
      : fem.some((f) => f !== fem[0]) ? fem.map((f) => (f === fem[0] ? 0 : 1))
      : speakers.map((_, i) => i % 2);
  }
  const firstOf = (c: number) => kinds[channel.indexOf(c)];
  let voiceA = VOICE[firstOf(0)][0];
  let voiceB = VOICE[firstOf(1)][0];
  if (voiceB === voiceA) voiceB = VOICE[firstOf(1)][1];
  const label = (c: number) => (c === 0 ? "Speaker A" : "Speaker B");
  const lines = turns.map((t) => `${t.speaker ? label(channel[speakers.indexOf(t.speaker)]) : label(0)}: ${clean(t.utterance)}`);
  return {
    prompt: pre + lines.join("\n"),
    speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [
      { speaker: "Speaker A", voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceA } } },
      { speaker: "Speaker B", voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceB } } },
    ] } },
    voices: `${speakers.map((s, i) => `${s}=${channel[i] === 0 ? voiceA : voiceB}`).join(", ")}`,
    speakers,
    sharedVoices: speakers.length > 2,
  };
}

// ── Turn check: the TTS model sometimes drops a whole turn. Transcribe the WAV and
// require most content words of every turn to be heard. ──
const norm = (s: string) => s.toLowerCase().replace(/(\d+):00/g, "$1").replace(/\bmom\b/g, "mum").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const NUM: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12" };
const canon = (w: string) => NUM[w.replace(/'s$/, "")] ?? w.replace(/'s$/, "").replace(/re$/, "er");
const STOP = new Set(["a", "an", "the", "is", "it", "to", "and", "of", "in", "on", "at", "you", "i", "my", "we", "oh", "yes", "no", "o'clock", "clock"]);

async function missingTurns(ai: GoogleGenAI, wav: Buffer, script: string): Promise<string[]> {
  const r = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: [{ role: "user", parts: [
    { inlineData: { mimeType: "audio/wav", data: wav.toString("base64") } },
    { text: "Transcribe this audio exactly, words only, no speaker labels." }] }] } as any);
  const heard = new Set(norm((r as any).text ?? "").map(canon));
  return script.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => clean(parseSpeakerTurn(l)?.utterance ?? l))
    .filter((u) => {
      const words = norm(u).map(canon).filter((w) => !STOP.has(w));
      if (words.length === 0) return false;
      return words.filter((w) => heard.has(w)).length / words.length < 0.6;
    });
}

/** Read-only: run the turn check on every audio this job produced. */
async function check() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const items = await prisma.item.findMany({ where: { skill: "LISTENING", status: "DRAFT", metadata: { path: ["triggeredBy"], equals: "claude-code:primary-expansion" } }, select: { itemCode: true, content: true }, orderBy: { itemCode: "asc" } });
  const failed: string[] = [];
  const unchecked: string[] = [];
  for (const it of items) {
    const c = it.content as Record<string, any>;
    if (!c.audioUrl) { failed.push(it.itemCode!); console.log(`${it.itemCode}  NO AUDIO`); continue; }
    let lost: string[] | null = null;
    for (let attempt = 1; attempt <= 3 && lost === null; attempt++) {
      try {
        const wav = Buffer.from(await (await fetch(c.audioUrl, { signal: AbortSignal.timeout(60_000) })).arrayBuffer());
        lost = await missingTurns(ai, wav, String(c.ttsScript));
      } catch (e) {
        if (attempt === 3) { unchecked.push(it.itemCode!); console.log(`${it.itemCode}  NOT CHECKED: ${(e as Error).message}`); }
        else await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
    if (lost?.length) { failed.push(it.itemCode!); console.log(`${it.itemCode}  missing: ${lost.map((u) => `"${u.slice(0, 50)}"`).join("; ")}`); }
  }
  const passed = items.length - failed.length - unchecked.length;
  console.log(`\n${passed}/${items.length} pass, ${failed.length} fail, ${unchecked.length} not checked${failed.length ? `\nredo: --redo ${failed.join(",")}` : ""}${unchecked.length ? `\nrecheck: ${unchecked.join(",")}` : ""}`);
}

async function main() {
  if (process.argv.includes("--check")) return check();
  const ri = process.argv.indexOf("--redo");
  const REDO = new Set(ri >= 0 ? process.argv[ri + 1].split(",") : []);
  const items = (await prisma.item.findMany({
    where: { skill: "LISTENING", status: "DRAFT", metadata: { path: ["triggeredBy"], equals: "claude-code:primary-expansion" } },
    select: { id: true, itemCode: true, cefrLevel: true, content: true, metadata: true },
    orderBy: { itemCode: "asc" },
  })).filter((it) => (it.content as any)?.ttsScript && (REDO.size ? REDO.has(it.itemCode!) : !(it.content as any)?.audioUrl));
  const targets = items.slice(0, LIMIT);
  console.log(`${targets.length} Primary listening drafts need audio${APPLY ? "" : " (dry run — nothing written)"}`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const storage = APPLY ? supabaseStorageClient() : null;
  const run = randomUUID();
  const report: unknown[] = [];
  let ok = 0;

  for (const it of targets) {
    const c = it.content as Record<string, any>;
    const p = plan(String(c.ttsScript));
    const words = String(c.ttsScript).split(/\s+/).length;
    console.log(`${it.itemCode}  [${p.voices}]${p.sharedVoices ? "  SHARED VOICES" : ""}`);
    if (!APPLY) { report.push({ code: it.itemCode, voices: p.voices, sharedVoices: p.sharedVoices, prompt: p.prompt }); continue; }

    try {
      let wav: Buffer | null = null;
      let secs = 0;
      for (let attempt = 1; attempt <= 4 && !wav; attempt++) {
        try {
          const resp = await ai.models.generateContent({ model: MODEL, contents: [{ role: "user", parts: [{ text: p.prompt }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: p.speechConfig } } as any);
          const data = resp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!data) throw new Error("no audio data");
          const candidate = buildWavHeader(Buffer.from(data, "base64"));
          const ev = inspectWav(candidate);
          secs = ev.durationSeconds ?? 0;
          // ~1.0–3.5 words per second for slow child-directed speech.
          if (!ev.valid || secs < words / 3.5 || secs > words / 1.0 + 8) throw new Error(`implausible audio: ${ev.reason ?? ""} ${secs}s for ${words} words`);
          const lost = await missingTurns(ai, candidate, String(c.ttsScript));
          if (lost.length) throw new Error(`turn(s) not heard: ${lost.map((u) => `"${u.slice(0, 40)}"`).join("; ")}`);
          wav = candidate;
        } catch (e) {
          console.log(`   attempt ${attempt}: ${(e as Error).message}`);
          if (attempt === 4) throw e;
          await new Promise((r) => setTimeout(r, 3000 * attempt));
        }
      }

      const key = `primary/${run}/${it.id}.wav`;
      const up = await storage!.storage.from(BUCKET).upload(key, wav!, { contentType: "audio/wav", upsert: false, cacheControl: "31536000" });
      if (up.error) throw new Error(`upload failed: ${up.error.message}`);
      const audioUrl = storage!.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
      const sourceHash = createHash("sha256").update(String(c.ttsScript)).digest("hex");

      await prisma.item.update({ where: { id: it.id }, data: { content: { ...c, audioUrl,
        audioMetadata: { speakers: p.speakers, voices: p.voices, sharedVoices: p.sharedVoices, durationSeconds: secs, model: MODEL,
          generatedAt: new Date().toISOString(), sourceHash, storageProvider: "supabase", turnCheck: "passed", humanListeningVerdict: "PENDING",
          ...(c.audioUrl ? { previousAudioUrl: c.audioUrl } : {}) } } } });
      ok++;
      report.push({ code: it.itemCode, audioUrl, secs, words, voices: p.voices, sharedVoices: p.sharedVoices });
      console.log(`   ✓ ${secs}s, ${words} words`);
    } catch (e) {
      report.push({ code: it.itemCode, error: (e as Error).message });
      console.log(`   ✗ ${(e as Error).message}`);
    }
  }

  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync(`scripts/jobs/.out/primary-listening-audio${APPLY ? "" : "-plan"}.json`, JSON.stringify(report, null, 1));
  console.log(APPLY ? `audio set on ${ok}/${targets.length}; report scripts/jobs/.out/primary-listening-audio.json` : "plan: scripts/jobs/.out/primary-listening-audio-plan.json");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
