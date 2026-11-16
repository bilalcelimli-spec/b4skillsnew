/**
 * Item illustrations for young-learner tasks (Primary 7-10, Junior 11-14).
 *
 *   generateIllustration  Gemini image model, one consistent picture-book style
 *   verifyIllustration    a separate vision call: the picture must be identified
 *                         as its own description among the alternatives, carry no
 *                         text, and be suitable for the age band
 *   uploadItemImage       public bucket question-images, content-addressed key
 *
 * A picture that fails verification is never attached to an item; callers
 * retry generation (bounded) and otherwise drop the draft.
 */

import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { supabaseStorageClient } from "../storage/private-storage.js";

export const IMAGE_MODEL = process.env.ITEM_IMAGE_MODEL ?? "gemini-2.5-flash-image";
export const VISION_MODEL = process.env.ITEM_VISION_MODEL ?? "gemini-2.5-flash";
export const IMAGE_BUCKET = "question-images";

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

export type AgeBand = "YOUNG_LEARNER" | "TEEN";
export type ImageKind = "object" | "scene" | "strip3";

/** One house style so pictures in an item (and across the bank) look like one book. */
export function illustrationStyle(age: AgeBand): string {
  return [
    "Flat vector illustration in the style of a modern children's picture book.",
    "Clean, even outlines, soft solid colours, simple shapes, plain white background, no shadows or gradients.",
    age === "YOUNG_LEARNER"
      ? "Friendly and simple for 7-10 year olds; large, clearly separated objects."
      : "Friendly, slightly more detailed for 11-14 year olds; realistic proportions, not babyish.",
    "People: a diverse mix of skin tones and features, everyday modern clothes, no brand logos.",
    "Absolutely no text, letters, numbers, signs with words, speech bubbles, scribbles or captions anywhere in the picture.",
    "Draw only the people, animals and objects that are named; do not add extra characters, toys or props.",
    "Nothing frightening, violent, unsafe or adult. Culturally neutral settings.",
  ].join(" ");
}

export function buildImagePrompt(description: string, kind: ImageKind, age: AgeBand): string {
  const layout = kind === "object"
    ? "Show exactly this and nothing else, centred, filling most of the square frame:"
    : kind === "scene"
      ? "Show this scene. Every element listed must be clearly visible and easy to point at:"
      : "Draw a comic strip of exactly three panels side by side, left to right, separated by white gutters, with the same characters drawn consistently in every panel. Panel contents:";
  return `${illustrationStyle(age)}\n\n${layout}\n${description}`;
}

export interface GeneratedImage { bytes: Buffer; mimeType: string; model: string; prompt: string }

export async function generateIllustration(description: string, kind: ImageKind, age: AgeBand): Promise<GeneratedImage> {
  const prompt = buildImagePrompt(description, kind, age);
  const response = await ai().models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: [Modality.IMAGE],
      imageConfig: { aspectRatio: kind === "strip3" ? "21:9" : kind === "scene" ? "4:3" : "1:1" },
    } as any,
  });
  const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error(`image model returned no image (${response.candidates?.[0]?.finishReason ?? "no candidate"})`);
  return { bytes: Buffer.from(part.inlineData.data, "base64"), mimeType: part.inlineData.mimeType ?? "image/png", model: IMAGE_MODEL, prompt };
}

export interface ImageCheck {
  /** What the picture must show (its own description). */
  expected: string;
  /** Other descriptions it must NOT be mistaken for (the other options), may be empty. */
  alternatives?: string[];
  /** Elements that must be visible (scenes / strips). */
  mustShow?: string[];
  age: AgeBand;
}

export interface ImageVerdict {
  ok: boolean;
  picked: string | null;
  missing: string[];
  containsText: boolean;
  ageAppropriate: boolean;
  reasons: string[];
}

const VERDICT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bestMatchIndex: { type: Type.INTEGER },
    visible: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
    alsoMatchesAnother: { type: Type.BOOLEAN },
    containsText: { type: Type.BOOLEAN },
    ageAppropriate: { type: Type.BOOLEAN },
    note: { type: Type.STRING },
  },
  required: ["bestMatchIndex", "alsoMatchesAnother", "visible", "containsText", "ageAppropriate"],
};

/** Deterministic order so the expected description is not always first. */
function order(n: number, seed: string): number[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ i, 0x01000193) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j]!, idx[i]!]; }
  return idx;
}

export async function verifyIllustration(image: GeneratedImage, check: ImageCheck): Promise<ImageVerdict> {
  const descriptions = [check.expected, ...(check.alternatives ?? [])];
  const perm = order(descriptions.length, check.expected);
  const shown = perm.map((i) => descriptions[i]!);
  const mustShow = check.mustShow ?? [];
  const prompt = [
    "You check pictures for a children's English test. Look at the picture carefully.",
    `1. Which ONE of these descriptions matches the picture best? Answer with its number (0-based).`,
    ...shown.map((d, i) => `   ${i}. ${d}`),
    "   Also say whether a child could reasonably think the picture shows one of the OTHER descriptions too (alsoMatchesAnother).",
    mustShow.length ? `2. For each element, is it clearly visible in the picture? Answer one boolean per element, in order:\n${mustShow.map((m, i) => `   ${i}. ${m}`).join("\n")}` : "2. Return an empty list for visible.",
    "3. Does the picture contain any written text, letters or numbers?",
    `4. Is it appropriate for children aged ${check.age === "YOUNG_LEARNER" ? "7-10" : "11-14"} (nothing frightening, violent or adult)?`,
  ].join("\n");
  const response = await ai().models.generateContent({
    model: VISION_MODEL,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: image.mimeType, data: image.bytes.toString("base64") } }, { text: prompt }] }],
    config: { responseMimeType: "application/json", responseSchema: VERDICT_SCHEMA, temperature: 0 },
  });
  const r = JSON.parse(response.text ?? "{}") as { bestMatchIndex?: number; alsoMatchesAnother?: boolean; visible?: boolean[]; containsText?: boolean; ageAppropriate?: boolean; note?: string };
  const picked = typeof r.bestMatchIndex === "number" && shown[r.bestMatchIndex] !== undefined ? shown[r.bestMatchIndex]! : null;
  const missing = mustShow.filter((_, i) => r.visible?.[i] !== true);
  const reasons: string[] = [];
  if (picked !== check.expected) reasons.push(`identified as "${picked ?? "nothing"}"`);
  if (missing.length) reasons.push(`not visible: ${missing.join(", ")}`);
  if (descriptions.length > 1 && r.alsoMatchesAnother) reasons.push("could also match another option");
  if (r.containsText) reasons.push("contains text");
  if (r.ageAppropriate === false) reasons.push("not age-appropriate");
  if (r.note && reasons.length) reasons.push(r.note);
  return { ok: reasons.length === 0, picked, missing, containsText: !!r.containsText, ageAppropriate: r.ageAppropriate !== false, reasons };
}

/** Generate, verify, retry. Returns the first verified picture or the last verdict. */
export async function generateVerifiedIllustration(
  description: string, kind: ImageKind, check: ImageCheck, attempts = 2,
): Promise<{ image: GeneratedImage | null; verdict: ImageVerdict; attempts: number }> {
  let verdict: ImageVerdict = { ok: false, picked: null, missing: [], containsText: false, ageAppropriate: true, reasons: ["not generated"] };
  for (let a = 1; a <= attempts; a++) {
    const image = await generateIllustration(description, kind, check.age);
    verdict = await verifyIllustration(image, check);
    if (verdict.ok) return { image, verdict, attempts: a };
  }
  return { image: null, verdict, attempts };
}

const run = promisify(execFile);

/**
 * Downscale and re-encode for delivery (a 1 MB PNG per option is too heavy on a
 * school tablet). Uses macOS `sips`, where the generation scripts run; elsewhere,
 * or if it fails, the original image is returned unchanged.
 */
export async function compressForWeb(image: GeneratedImage, maxSide = 768): Promise<GeneratedImage> {
  if (process.platform !== "darwin") return image;
  const base = join(tmpdir(), `item-img-${randomUUID()}`);
  try {
    await writeFile(`${base}.png`, image.bytes);
    await run("sips", ["-Z", String(maxSide), "-s", "format", "jpeg", "-s", "formatOptions", "82", `${base}.png`, "--out", `${base}.jpg`]);
    const bytes = await readFile(`${base}.jpg`);
    return bytes.length && bytes.length < image.bytes.length ? { ...image, bytes, mimeType: "image/jpeg" } : image;
  } catch {
    return image;
  } finally {
    await rm(`${base}.png`, { force: true }); await rm(`${base}.jpg`, { force: true });
  }
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Uploads to the public question-images bucket under <prefix>/<sha256>.<ext>; never overwrites. */
export async function uploadItemImage(image: GeneratedImage, prefix: string): Promise<{ url: string; key: string; sha256: string; bytes: number }> {
  const sha256 = createHash("sha256").update(image.bytes).digest("hex");
  const key = `${prefix}/${sha256}.${EXT[image.mimeType] ?? "png"}`;
  const storage = supabaseStorageClient();
  const { data: bucket } = await storage.storage.getBucket(IMAGE_BUCKET);
  if (!bucket) {
    const { error } = await storage.storage.createBucket(IMAGE_BUCKET, { public: true, allowedMimeTypes: Object.keys(EXT), fileSizeLimit: 5 * 1024 * 1024 });
    if (error && !/exists/i.test(error.message)) throw new Error(`could not create bucket ${IMAGE_BUCKET}: ${error.message}`);
  }
  const up = await storage.storage.from(IMAGE_BUCKET).upload(key, image.bytes, { contentType: image.mimeType, upsert: false, cacheControl: "31536000" });
  if (up.error && !/exists/i.test(up.error.message)) throw new Error(`upload: ${up.error.message}`);
  return { url: storage.storage.from(IMAGE_BUCKET).getPublicUrl(key).data.publicUrl, key, sha256, bytes: image.bytes.length };
}
