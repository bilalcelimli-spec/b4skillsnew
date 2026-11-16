/**
 * Picture-based young-learner tasks (plan: docs/quality/young-learner-expansion-plan-2026-11.md §4).
 *
 *   L-PIC3       listen, choose 1 of 3 pictures            LISTENING  MULTIPLE_CHOICE
 *   R-PICSENT    look, choose the sentence that is true     READING    MULTIPLE_CHOICE
 *   V-PICWORD    look, choose the word                      VOCABULARY MULTIPLE_CHOICE
 *   S-PIC        describe a picture / answer about it       SPEAKING   SPEAKING_PROMPT
 *   W-PICSTORY   write the story of three pictures          WRITING    WRITING_PROMPT
 *
 * Original items only: the task formats follow international young-learner
 * exams, the content does not copy any of them. Every picture is generated
 * with Gemini and must pass a separate vision check (item-images.ts) before
 * it is attached; listening drafts must also pass the strict blind solver.
 * Everything is stored as DRAFT / AI_DRAFT. Listening audio is a later step
 * (generate-primary-listening-audio.ts --trigger <triggeredBy>).
 */

import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../prisma.js";
import { CEFR_THETA_SEED } from "./blueprint.js";
import { nextItemCode } from "./item-codes.js";
import { DIVERSE_NAMES, ageContextViolations, rotatePick, settingsFor, unanchoredNames } from "./age-context.js";
import { runTextDependencyGate, solveMcq } from "../ai/validation/gates/text-dependency.js";
import {
  compressForWeb, generateVerifiedIllustration, uploadItemImage,
  type AgeBand, type ImageKind, type ImageVerdict,
} from "../media/item-images.js";

export type PictureTask = "L-PIC3" | "R-PICSENT" | "V-PICWORD" | "S-PIC" | "W-PICSTORY";

export interface PictureCell {
  task: PictureTask;
  cefr: "PRE_A1" | "A1" | "A2" | "B1";
  productLine: "primary" | "junior";
  topic: string;
  count: number;
}

const TASK_META: Record<PictureTask, { skill: string; type: string; subskill: string; genre: string }> = {
  "L-PIC3":     { skill: "LISTENING",  type: "MULTIPLE_CHOICE", subskill: "SPECIFIC_INFORMATION", genre: "conversation" },
  "R-PICSENT":  { skill: "READING",    type: "MULTIPLE_CHOICE", subskill: "EXPLICIT_DETAIL",      genre: "picture" },
  "V-PICWORD":  { skill: "VOCABULARY", type: "MULTIPLE_CHOICE", subskill: "WORD_MEANING",         genre: "picture" },
  "S-PIC":      { skill: "SPEAKING",   type: "SPEAKING_PROMPT", subskill: "DESCRIPTION",          genre: "picture" },
  "W-PICSTORY": { skill: "WRITING",    type: "WRITING_PROMPT",  subskill: "NARRATIVE",            genre: "picture_story" },
};

/** Word targets per level for the picture story (Flyers ~20, Key 35+, Preliminary ~100). */
const STORY_WORDS: Record<string, [number, number]> = { PRE_A1: [10, 20], A1: [15, 30], A2: [35, 60], B1: [80, 110] };

const LEVEL_LANGUAGE: Record<string, string> = {
  PRE_A1: "Pre-A1: single words and very short present-simple sentences; colours, numbers 1-20, animals, family, toys, food, body, clothes, school objects, prepositions in/on/under/next to.",
  A1: "A1: short sentences, present simple and continuous, can/can't, have got, there is/are, simple adjectives, likes and dislikes, daily routines, places in town, weather.",
  A2: "A2: past simple, going to, comparatives and superlatives, must/have to, short connected sentences with and/but/because, everyday topics.",
  B1: "B1: a range of tenses including present perfect, first conditional, reasons and opinions, short narratives with sequencers.",
};

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

function ageOf(productLine: string): AgeBand { return productLine === "primary" ? "YOUNG_LEARNER" : "TEEN"; }
function ageText(productLine: string): string { return productLine === "primary" ? "7-10" : "11-14"; }

/** What the model must return for each task (one JSON object per item). */
function taskSpec(task: PictureTask, cefr: string): { instructions: string; schema: Record<string, unknown> } {
  const str = { type: Type.STRING };
  const strArr = { type: Type.ARRAY, items: str };
  switch (task) {
    case "L-PIC3": return {
      instructions: [
        "TASK: Listen and choose the right picture (3 pictures).",
        "- prompt: the printed question, e.g. \"What does Sam want to eat?\" (also read aloud in the recording).",
        "- ttsScript: a short dialogue between two named speakers, each line 'Name: words'. 4-8 lines.",
        "- All three pictured things are MENTIONED in the dialogue. Two are considered and rejected or corrected (\"Is it the red one? - No, the blue one.\"), one is the answer. The answer is never simply the first or the last thing mentioned.",
        "- options: exactly 3 pictures. Each has imageDescription (what to draw: one subject, concrete, drawable, no text) and imageAlt (2-6 neutral words for screen readers, e.g. \"a blue bike\").",
        "- The three pictures differ in ONE clear visual detail (colour, number, object, action or position), so only listening tells them apart.",
        "- correctIndex: 0, 1 or 2. evidence: the line of the dialogue that gives the answer.",
      ].join("\n"),
      schema: { prompt: str, ttsScript: str, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { imageDescription: str, imageAlt: str }, required: ["imageDescription", "imageAlt"] } }, correctIndex: { type: Type.INTEGER }, evidence: str },
    };
    case "R-PICSENT": return {
      instructions: [
        "TASK: Look at the picture and choose the sentence that is true (3 sentences).",
        "- sceneDescription: a scene to draw with 4-6 clearly countable/locatable elements (people, animals, objects, actions, positions). No text in the picture.",
        "- mustShow: 3-5 short facts the picture must show, including the fact the correct sentence states.",
        "- prompt: \"Look at the picture. Which sentence is true?\"",
        "- options: 3 sentences of the same length and pattern. Exactly one is true of the scene. The other two each change ONE detail of something that IS in the picture (number, colour, position, action, who), so they cannot be rejected without looking.",
        "- falseFacts: for each wrong sentence, the fact that would make it true (it must NOT be in the picture).",
        "- correctIndex: 0, 1 or 2.",
      ].join("\n"),
      schema: { sceneDescription: str, mustShow: strArr, prompt: str, options: strArr, falseFacts: strArr, correctIndex: { type: Type.INTEGER } },
    };
    case "V-PICWORD": return {
      instructions: [
        "TASK: Look at the picture and choose the word (3 options).",
        "- target: one concrete, drawable word at this level. imageDescription: how to draw it alone, with no other objects.",
        "- prompt: \"Look at the picture. What is it?\" (or \"What is she doing?\" for verbs).",
        "- options: 3 single words or short phrases from the same category and level (e.g. three fruits), only one matches the picture. No option may be visible in the picture.",
        "- correctIndex: 0, 1 or 2.",
      ].join("\n"),
      schema: { target: str, imageDescription: str, prompt: str, options: strArr, correctIndex: { type: Type.INTEGER } },
    };
    case "S-PIC": return {
      instructions: [
        "TASK: Speaking about a picture.",
        "- sceneDescription: a lively scene with 5-7 elements a child can name and describe (people doing things, animals, objects, colours, positions). No text.",
        "- mustShow: the 4-6 elements the questions rely on.",
        `- prompt: what the child sees and hears, simple and friendly. ${cefr === "PRE_A1" || cefr === "A1" ? "3-4 short questions about the picture (Where is…? What colour is…? How many…? What is … doing?)." : "Ask the child to describe the picture and say what the people are doing and what might happen next, with 2 short follow-up questions."}`,
        "- rubric: taskFulfilment, lexicalResource, grammar, pronunciation, communicativeEffectiveness descriptors for this level (one sentence each).",
        "- sampleAnswer: a short model answer at this level (reviewer only).",
      ].join("\n"),
      schema: { sceneDescription: str, mustShow: strArr, prompt: str, rubric: { type: Type.OBJECT, properties: { taskFulfilment: str, lexicalResource: str, grammar: str, pronunciation: str, communicativeEffectiveness: str } }, sampleAnswer: str },
    };
    case "W-PICSTORY": {
      const [min, max] = STORY_WORDS[cefr] ?? [20, 40];
      return {
        instructions: [
          "TASK: Write the story shown in three pictures.",
          "- panels: exactly 3 panel descriptions, same named characters, a clear beginning, problem and ending. Each panel: who, where, what happens. No text in the pictures.",
          "- mustShow: one key element per panel (3 items).",
          `- prompt: friendly instruction, e.g. "Look at the three pictures. Write the story. Write ${min} or more words." Name the main character so the child can start.`,
          `- minWords ${min}, maxWords ${max}.`,
          "- rubric: taskFulfilment, organisation, lexicalResource, grammar, communicativeEffectiveness descriptors for this level (one sentence each).",
          "- sampleAnswer: a model story at this level (reviewer only).",
        ].join("\n"),
        schema: { panels: strArr, mustShow: strArr, prompt: str, minWords: { type: Type.INTEGER }, maxWords: { type: Type.INTEGER }, rubric: { type: Type.OBJECT, properties: { taskFulfilment: str, organisation: str, lexicalResource: str, grammar: str, communicativeEffectiveness: str } }, sampleAnswer: str },
      };
    }
  }
}

export function buildPicturePrompt(cell: PictureCell, n: number, batchIndex: number, seed: string): string {
  const { instructions } = taskSpec(cell.task, cell.cefr);
  const key = [cell.task, cell.cefr, cell.productLine, cell.topic, seed].join("|");
  const names = rotatePick(DIVERSE_NAMES, 6, `names|${key}`, batchIndex);
  const settings = rotatePick(settingsFor(ageOf(cell.productLine)), 3, `settings|${key}`, batchIndex);
  return [
    `You write ORIGINAL items for an adaptive English placement test for children aged ${ageText(cell.productLine)}. Do not copy or imitate any published exam item.`,
    `CEFR level: ${cell.cefr}. ${LEVEL_LANGUAGE[cell.cefr] ?? ""}`,
    `Topic area: ${cell.topic}. Use only vocabulary a child at this level knows; keep every sentence natural.`,
    `Characters (use these names, different ones per item): ${names.join(", ")}. Settings to choose from: ${settings.join("; ")}.`,
    cell.productLine === "primary"
      ? "Age rules: children's lives only (home, school, park, zoo, birthday, holidays, pets, toys, food). No adult work, money, romance, danger or scary content."
      : "Age rules: a teenager's life (school, clubs, sport, hobbies, family, friends, holidays, local places). No university, jobs, money, dating, alcohol.",
    "Pictures are drawn by an illustrator from your descriptions: describe concrete, drawable things only; never ask for written words in a picture.",
    instructions,
    `Return a JSON array of ${n} items, each different in situation and answer position.`,
  ].join("\n\n");
}

async function draftItems(cell: PictureCell, n: number, batchIndex: number, seed: string): Promise<any[]> {
  const { schema } = taskSpec(cell.task, cell.cefr);
  const response = await ai().models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPicturePrompt(cell, n, batchIndex, seed),
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: schema as any } },
      temperature: 0.9,
    },
  });
  const parsed = JSON.parse(response.text ?? "[]");
  return Array.isArray(parsed) ? parsed : [];
}

const LETTERS = ["A", "B", "C", "D"];

/** Shape the model output into item content; null with a reason when it is unusable. */
export function shapeContent(task: PictureTask, raw: any): { content: Record<string, any>; reason?: undefined } | { content?: undefined; reason: string } {
  const three = (a: unknown) => Array.isArray(a) && a.length === 3;
  const key = Number(raw?.correctIndex);
  if (["L-PIC3", "R-PICSENT", "V-PICWORD"].includes(task) && !(key >= 0 && key <= 2)) return { reason: "correctIndex not 0-2" };
  switch (task) {
    case "L-PIC3":
      if (!three(raw.options) || !raw.ttsScript || !raw.prompt) return { reason: "need prompt, ttsScript and 3 picture options" };
      return { content: {
        prompt: String(raw.prompt), ttsScript: String(raw.ttsScript), numberOfSpeakers: 2,
        options: raw.options.map((o: any, i: number) => ({ id: LETTERS[i], text: "", imageAlt: String(o.imageAlt ?? ""), isCorrect: i === key })),
        correctAnswer: LETTERS[key], imageSpecs: raw.options.map((o: any) => String(o.imageDescription ?? "")), evidence: raw.evidence ?? null,
      } };
    case "R-PICSENT":
      if (!three(raw.options) || !raw.sceneDescription) return { reason: "need sceneDescription and 3 sentences" };
      return { content: {
        prompt: String(raw.prompt || "Look at the picture. Which sentence is true?"),
        options: raw.options.map((t: any, i: number) => ({ id: LETTERS[i], text: String(t), isCorrect: i === key })),
        correctAnswer: LETTERS[key], imageSpec: String(raw.sceneDescription), mustShow: raw.mustShow ?? [], falseFacts: raw.falseFacts ?? [],
      } };
    case "V-PICWORD":
      if (!three(raw.options) || !raw.imageDescription) return { reason: "need imageDescription and 3 words" };
      return { content: {
        prompt: String(raw.prompt || "Look at the picture. What is it?"),
        options: raw.options.map((t: any, i: number) => ({ id: LETTERS[i], text: String(t), isCorrect: i === key })),
        correctAnswer: LETTERS[key], imageSpec: String(raw.imageDescription), targetWord: String(raw.target ?? raw.options[key]),
      } };
    case "S-PIC":
      if (!raw.sceneDescription || !raw.prompt) return { reason: "need sceneDescription and prompt" };
      return { content: { prompt: String(raw.prompt), imageSpec: String(raw.sceneDescription), mustShow: raw.mustShow ?? [], rubric: raw.rubric ?? {}, sampleAnswer: raw.sampleAnswer ?? null } };
    case "W-PICSTORY":
      if (!three(raw.panels) || !raw.prompt) return { reason: "need 3 panels and prompt" };
      return { content: {
        prompt: String(raw.prompt), imageSpec: raw.panels.map((p: any, i: number) => `Panel ${i + 1}: ${p}`).join("\n"),
        mustShow: raw.mustShow ?? [], minWords: Number(raw.minWords) || 0, maxWords: Number(raw.maxWords) || 0, rubric: raw.rubric ?? {}, sampleAnswer: raw.sampleAnswer ?? null,
      } };
  }
}

export interface PictureBatchResult { cell: string; requested: number; stored: number; storedIds: string[]; skipped: string[]; images: { generated: number; rejected: number } }

/** Generates, gates, illustrates and stores one cell. Images are uploaded only for drafts that pass every gate. */
export async function runPictureBatch(cell: PictureCell, opts: { triggeredBy: string; seed?: string; notes?: string }): Promise<PictureBatchResult> {
  const meta = TASK_META[cell.task];
  const age = ageOf(cell.productLine);
  const label = `${cell.productLine}/${cell.cefr}/${cell.task}/${cell.topic}`;
  const result: PictureBatchResult = { cell: label, requested: cell.count, stored: 0, storedIds: [], skipped: [], images: { generated: 0, rejected: 0 } };
  const seed = opts.seed ?? String(Date.now());
  let raws: any[] = [];
  try { raws = await draftItems(cell, cell.count, 0, seed); } catch (e) { result.skipped.push(`model output: ${(e as Error).message}`); return result; }

  for (const raw of raws.slice(0, cell.count)) {
    const shaped = shapeContent(cell.task, raw);
    if (!shaped.content) { result.skipped.push(`structure: ${shaped.reason}`); continue; }
    const content = shaped.content;
    const ageHits = ageContextViolations({ ...content, imageSpec: undefined } as any, age);
    if (ageHits.length) { result.skipped.push(`age-context: ${ageHits.join(", ")}`); continue; }
    if (unanchoredNames(content).length && cell.task === "L-PIC3") { result.skipped.push(`names not in recording: ${unanchoredNames(content).join(", ")}`); continue; }

    // Listening: strict blind solver with the picture descriptions as option text.
    let textDep: unknown = null;
    if (cell.task === "L-PIC3") {
      const draft = { type: "MULTIPLE_CHOICE", skill: "LISTENING", cefrLevel: cell.cefr,
        content: { ...content, options: content.options.map((o: any) => ({ ...o, text: o.imageAlt })) } } as any;
      let gate = await runTextDependencyGate(draft).catch(() => null);
      if (!gate || gate.verdict === "ERROR") gate = await runTextDependencyGate(draft).catch(() => null);
      const codes = gate?.issues.map((i) => i.code) ?? [];
      if (!gate || gate.verdict === "ERROR" || gate.verdict === "SKIPPED") { result.skipped.push(`text dependency: gate unavailable (${gate?.verdict ?? "no result"})`); continue; }
      if (codes.some((c) => /SOLVABLE-BLIND|KEY-UNCONFIRMED/.test(c))) { result.skipped.push(`text dependency: ${codes.join(", ")}`); continue; }
      textDep = gate.metrics ?? null;
    }
    // Reading: the sentences alone must not give the answer.
    if (cell.task === "R-PICSENT") {
      const blind = await solveMcq(content.prompt, content.options.map((o: any) => o.text), null, "picture").catch(() => null);
      if (blind === Number(raw.correctIndex)) { result.skipped.push("picture dependency: solvable without the picture"); continue; }
    }

    // Pictures: generate + verify, then compress and upload.
    const images: Array<{ slot: string; description: string; kind: ImageKind; check: Parameters<typeof generateVerifiedIllustration>[2] }> = [];
    if (cell.task === "L-PIC3") {
      const alts: string[] = content.imageSpecs;
      alts.forEach((d, i) => images.push({ slot: `option${i}`, description: d, kind: "object", check: { expected: d, alternatives: alts.filter((_, j) => j !== i), age } }));
    } else if (cell.task === "V-PICWORD") {
      const words = content.options.map((o: any) => o.text);
      images.push({ slot: "stem", description: content.imageSpec, kind: "object",
        check: { expected: words[Number(raw.correctIndex)], alternatives: words.filter((_: string, j: number) => j !== Number(raw.correctIndex)), age } });
    } else if (cell.task === "R-PICSENT") {
      const sentences = content.options.map((o: any) => o.text);
      images.push({ slot: "stem", description: content.imageSpec, kind: "scene",
        check: { expected: sentences[Number(raw.correctIndex)], alternatives: sentences.filter((_: string, j: number) => j !== Number(raw.correctIndex)), mustShow: content.mustShow, age } });
    } else {
      images.push({ slot: "stem", description: content.imageSpec, kind: cell.task === "W-PICSTORY" ? "strip3" : "scene",
        check: { expected: content.imageSpec.split("\n")[0]!.slice(0, 200), alternatives: [], mustShow: content.mustShow, age } });
    }

    const verified: Array<{ slot: string; image: NonNullable<Awaited<ReturnType<typeof generateVerifiedIllustration>>["image"]>; verdict: ImageVerdict; attempts: number }> = [];
    let failed: string | null = null;
    for (const spec of images) {
      try {
        const r = await generateVerifiedIllustration(spec.description, spec.kind, spec.check, 2);
        result.images.generated += r.attempts;
        if (!r.image) { result.images.rejected += r.attempts; failed = `${spec.slot}: ${r.verdict.reasons.join("; ")}`; break; }
        result.images.rejected += r.attempts - 1;
        verified.push({ slot: spec.slot, image: r.image, verdict: r.verdict, attempts: r.attempts });
      } catch (e) { failed = `${spec.slot}: ${(e as Error).message}`; break; }
    }
    if (failed) { result.skipped.push(`image: ${failed}`); continue; }

    try {
      const itemCode = await nextItemCode(meta.skill, cell.cefr).catch(() => null);
      const prefix = `young-learners/${cell.productLine}/${itemCode ?? `draft-${Date.now()}`}`;
      const uploads: Record<string, { url: string; sha256: string; bytes: number }> = {};
      for (const v of verified) uploads[v.slot] = await uploadItemImage(await compressForWeb(v.image), prefix);

      const finalContent: Record<string, any> = { ...content, productLine: cell.productLine };
      if (cell.task === "L-PIC3") finalContent.options = content.options.map((o: any, i: number) => ({ ...o, imageUrl: uploads[`option${i}`]!.url }));
      else finalContent.imageUrl = uploads.stem!.url;
      if (cell.task === "S-PIC") { finalContent.prepTime = age === "YOUNG_LEARNER" ? 15 : 30; finalContent.responseTime = age === "YOUNG_LEARNER" ? 45 : 60; }
      // Authoring evidence lives in metadata, not in candidate content.
      const AUTHORING = ["imageSpecs", "imageSpec", "mustShow", "falseFacts", "evidence", "targetWord"] as const;
      const authoring = Object.fromEntries(AUTHORING.map((k) => [k, content[k]]).filter(([, v]) => v !== undefined));
      for (const k of AUTHORING) delete finalContent[k];

      const stored = await prisma.item.create({
        data: {
          itemCode: itemCode ?? undefined,
          type: meta.type as any, skill: meta.skill as any, cefrLevel: cell.cefr as any,
          difficulty: CEFR_THETA_SEED[cell.cefr] ?? 0, discrimination: 1.0,
          guessing: meta.type === "MULTIPLE_CHOICE" ? 1 / 3 : 0,
          content: finalContent as any,
          tags: [meta.skill, cell.cefr, meta.subskill, meta.genre, cell.topic, cell.productLine, cell.task].filter(Boolean),
          status: "DRAFT", pipelineStage: "AI_DRAFT",
          subskill: meta.subskill, genre: meta.genre, topic: cell.topic,
          englishVariant: "INTERNATIONAL", ageSuitability: age as any, culturalLoad: "LOW",
          securityClass: "ASSESSMENT", provenance: "ORIGINAL_AI_ASSISTED",
          metadata: {
            triggeredBy: opts.triggeredBy, notes: opts.notes, generatedAt: new Date().toISOString(),
            taskType: cell.task, authoring,
            generationGates: { promptVersion: "picture-v1", textDependency: textDep, flags: [] },
            images: verified.map((v) => ({ slot: v.slot, model: v.image.model, attempts: v.attempts, verdict: v.verdict, ...uploads[v.slot] })),
          } as any,
        },
        select: { id: true },
      });
      result.storedIds.push(stored.id);
      result.stored++;
    } catch (e) {
      result.skipped.push(`store: ${(e as Error).message}`);
    }
  }
  if (raws.length < cell.count) result.skipped.push(`model returned ${raws.length}/${cell.count}`);
  return result;
}
