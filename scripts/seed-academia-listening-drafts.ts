/**
 * Academia listening sets (one recording, two questions), wave 01.
 *
 * Default run validates the authored content and writes nothing.
 * --apply inserts DRAFT records only (pipelineStage AI_DRAFT, no audio, seed
 * parameters marked paramSource "prior"). Existing item codes are never
 * overwritten, so a rerun cannot undo review work.
 *
 *   npx tsx scripts/seed-academia-listening-drafts.ts                  # validate all levels
 *   npx tsx scripts/seed-academia-listening-drafts.ts --level=B1,B2    # validate some levels
 *   npx tsx scripts/seed-academia-listening-drafts.ts --packet         # also write the review files
 *   npx tsx scripts/seed-academia-listening-drafts.ts --apply          # insert as DRAFT
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Prisma } from "@prisma/client";
import { isAdaptiveEligible } from "../src/lib/assessment-engine/adaptive-policy.js";
import { shuffleMcqOptions } from "../src/lib/assessment-engine/mcq-options.js";
import { scoreObjectiveResponse } from "../src/lib/assessment-engine/objective-response.js";
import { passageKey } from "../src/lib/assessment-engine/passage-cap.js";
import { SkillType, type Item } from "../src/lib/assessment-engine/types.js";
import { runContentIntegrityGate } from "../src/lib/ai/validation/gates/content-integrity.js";
import { parseSpeakerTurn } from "../src/lib/audio/speaker-labels.js";
import { unanchoredNames } from "../src/lib/content-factory/age-context.js";
import { CEFR_THETA_SEED, LISTENING_SUBSKILLS } from "../src/lib/content-factory/blueprint.js";
import { isDemandAllowed } from "../src/lib/content-factory/generation-guidelines.js";
import { PRODUCT_LINE_PROFILES } from "../src/lib/product-lines/profiles.js";
import { auditItemEvidence, record } from "../src/lib/quality/item-evidence-audit.js";
import { validateItemStructure } from "../src/lib/validation/item-schema.js";
import type { AcademiaRecording } from "./content/academia-listening-item.js";
import { b1Recordings } from "./content/academia-listening-b1.js";
import { b2Recordings } from "./content/academia-listening-b2.js";
import { c1Recordings } from "./content/academia-listening-c1.js";
import { c2Recordings } from "./content/academia-listening-c2.js";

const BATCH = "academia-listening-wave-01";
const TRIGGER = `claude-code:${BATCH}`;
const OUT = "scripts/jobs/.out/academia-listening";
const RECORDINGS: AcademiaRecording[] = [...b1Recordings, ...b2Recordings, ...c1Recordings, ...c2Recordings];

/**
 * Cover test by an LLM reviewer that saw the questions without recording or key
 * (2026-11-21). "solved" = it picked the key. A direction for human review, not
 * evidence about candidates. Items rewritten after the test are not listed.
 */
const COVER_TEST: Record<string, { solved: boolean; confidence: string }> =
  JSON.parse(readFileSync(new URL("./content/academia-listening-cover-test.json", import.meta.url), "utf8"));

/** Spoken words per recording; longer and denser as the level rises. */
const WORDS: Record<string, [number, number]> = { B1: [130, 220], B2: [190, 300], C1: [250, 380], C2: [260, 460] };
const SCALE: Record<string, string> = {
  lecture: "Understanding as a member of a live audience",
  presentation: "Understanding as a member of a live audience",
  short_talk: "Understanding as a member of a live audience",
  announcement: "Understanding announcements and instructions",
  conversation: "Understanding conversation between other people",
  discussion: "Understanding conversation between other people",
};
const ABSOLUTES = /\b(only|always|never|all|none|completely|entirely|every|must|impossible|exclusively|merely|solely|purely|utterly|totally|nothing|no one|nobody)\b/i;

const spokenLines = (script: string) => script.split("\n").map((line) => line.trim()).filter(Boolean);
const spokenText = (script: string) => spokenLines(script).map((line) => parseSpeakerTurn(line)?.utterance ?? line).join(" ");

function makeDrafts(rec: AcademiaRecording) {
  return rec.questions.map((q, position) => {
    const options = q.options.map(([text, rationale], index) => ({
      id: String.fromCharCode(65 + index), text, rationale, isCorrect: index === q.key,
    }));
    // No content.passage: the candidate hears the recording and never reads it.
    const content = {
      prompt: q.prompt,
      options,
      correctIndex: q.key,
      correctAnswer: String.fromCharCode(65 + q.key),
      ttsScript: rec.script,
      transcript: rec.script,
      numberOfSpeakers: Math.max(1, rec.speakers.length),
      ...(rec.speakers.length ? { speakers: rec.speakers } : {}),
      productLine: "ACADEMIA",
    };
    const cover = COVER_TEST[`${rec.code}${"AB"[position]}`];
    const fields = {
      itemCode: `${rec.code}${"AB"[position]}`,
      type: "MULTIPLE_CHOICE",
      skill: "LISTENING",
      cefrLevel: rec.level,
      subskill: q.subskill,
      genre: rec.genre,
      topic: rec.topic,
      construct: `Listening (${rec.genre.replace("_", " ")}, academic setting): ${q.subskill.replace(/_/g, " ").toLowerCase()}`,
      evidenceStatement: q.evidence,
      descriptorRef: `CEFR Companion Volume (2020) · ${SCALE[rec.genre]} · ${rec.level}`,
    } as const;
    return {
      ...fields,
      content,
      difficulty: CEFR_THETA_SEED[rec.level],
      discrimination: 1.0,
      guessing: 0.25,
      tags: ["academia", BATCH],
      status: "DRAFT",
      pipelineStage: "AI_DRAFT",
      isPretest: false,
      register: "academic",
      englishVariant: "INTERNATIONAL",
      ageSuitability: "ADULT",
      culturalLoad: "LOW",
      securityClass: "ASSESSMENT",
      provenance: "ORIGINAL_AI_ASSISTED",
      metadata: {
        source: BATCH,
        triggeredBy: TRIGGER,
        batchFingerprint: createHash("sha256").update(JSON.stringify({ fields, content })).digest("hex"),
        paramSource: "prior",
        cognitiveDemand: q.demand,
        recordingCode: rec.code,
        recordingTitle: rec.title,
        setPosition: position + 1,
        audio: "pending",
        generationGates: {
          promptVersion: "authored-set-v1",
          flags: cover ? (cover.solved ? ["TEXTDEP-SOLVABLE-BLIND"] : []) : ["TEXTDEP-UNCHECKED"],
          textDependency: cover ? { blindOk: cover.solved, confidence: cover.confidence, method: "LLM cover test, one pass" } : null,
        },
      },
    } satisfies Prisma.ItemCreateManyInput;
  });
}

/**
 * Review files: blind.json holds the questions without recording or key (cover
 * test: can the key be found without listening?), review.md holds everything.
 */
function writePacket(recordings: AcademiaRecording[]) {
  mkdirSync(OUT, { recursive: true });
  const blind = recordings.flatMap((rec) => rec.questions.map((q, position) => ({
    code: `${rec.code}${"AB"[position]}`, level: rec.level, setting: rec.genre, prompt: q.prompt,
    options: Object.fromEntries(q.options.map(([text], index) => [String.fromCharCode(65 + index), text])),
  })));
  writeFileSync(`${OUT}/wave-01-blind.json`, JSON.stringify(blind, null, 1));
  const review = recordings.map((rec) => [
    `## ${rec.code} · ${rec.level} · ${rec.genre} · ${rec.title}`,
    "",
    ...spokenLines(rec.script).map((line) => `> ${line}`),
    "",
    ...rec.questions.flatMap((q, position) => [
      `**${rec.code}${"AB"[position]}** (${q.subskill}, ${q.demand}) ${q.prompt}`,
      "",
      ...q.options.map(([text, rationale], index) => `- ${String.fromCharCode(65 + index)}${index === q.key ? " ✅" : ""} ${text} — _${rationale}_`),
      "",
    ]),
  ].join("\n")).join("\n");
  writeFileSync(`${OUT}/wave-01-review.md`, `# Academia listening wave 01 — DRAFT review copy\n\n${review}\n`);
  console.log(`Review files: ${OUT}/wave-01-blind.json, ${OUT}/wave-01-review.md`);
}

async function main() {
  const args = process.argv.slice(2);
  const levels = args.find((arg) => arg.startsWith("--level="))?.slice(8).split(",");
  const selected = RECORDINGS.filter((rec) => !levels || levels.includes(rec.level));
  if (selected.length === 0) throw new Error("No recordings selected.");

  const academia = PRODUCT_LINE_PROFILES["Academia"];
  const problems: string[] = [];
  const warnings: string[] = [];
  const codes = new Set<string>();
  const setKeys = new Map<string, string>();
  const counts: Record<string, { recordings: number; questions: number; words: number }> = {};
  const keyPositions: Record<string, number[]> = {};
  const drafts: ReturnType<typeof makeDrafts> = [];

  for (const rec of selected) {
    const fail = (message: string) => problems.push(`${rec.code}: ${message}`);
    const lines = spokenLines(rec.script);
    const turns = lines.map(parseSpeakerTurn);
    const labels = [...new Set(turns.flatMap((turn) => (turn ? [turn.speaker] : [])))];
    if (rec.speakers.length === 0 ? labels.length > 0 : turns.some((turn) => !turn) || JSON.stringify(labels) !== JSON.stringify(rec.speakers))
      fail(`speaker labels in the script (${labels.join(", ") || "none"}) do not match speakers (${rec.speakers.join(", ") || "monologue"})`);
    if (/[[\]*_#]|\s{2,}\S/.test(rec.script.replace(/\n/g, " "))) fail("script contains markup or stage directions");

    const spoken = spokenText(rec.script);
    const words = spoken.split(/\s+/).length;
    const [min, max] = WORDS[rec.level];
    if (words < min || words > max) fail(`${words} spoken words, expected ${min}-${max} at ${rec.level}`);
    if (!SCALE[rec.genre]) fail(`unknown genre ${rec.genre}`);

    const [first, second] = rec.questions;
    if (first.subskill === second.subskill) fail(`both questions target ${first.subskill}`);

    const pair = makeDrafts(rec);
    const keys = pair.map((draft) => passageKey({ metadata: draft.content }));
    if (!keys[0] || keys[0] !== keys[1]) fail("the two questions do not share one set key");
    const clash = keys[0] ? setKeys.get(keys[0]) : undefined;
    if (clash) fail(`same recording text as ${clash}`);
    if (keys[0]) setKeys.set(keys[0], rec.code);

    counts[rec.level] ??= { recordings: 0, questions: 0, words: 0 };
    counts[rec.level].recordings++;
    counts[rec.level].words += words;

    for (const [position, draft] of pair.entries()) {
      const q = rec.questions[position];
      const { content, itemCode } = draft;
      const issue = (message: string) => problems.push(`${itemCode}: ${message}`);
      const warn = (message: string) => warnings.push(`${itemCode}: ${message}`);
      counts[rec.level].questions++;
      (keyPositions[rec.level] ??= [0, 0, 0, 0])[q.key]++;
      if (codes.has(itemCode)) issue("duplicate item code");
      codes.add(itemCode);

      for (const error of validateItemStructure("LISTENING", content)) issue(error);
      if ("passage" in content) issue("content.passage must stay empty for listening");
      if (content.ttsScript !== rec.script) issue("ttsScript differs from the recording script");
      for (const name of unanchoredNames(content)) issue(`question names ${name}, who is not in the recording`);
      // A name the candidate must recognise has to be heard, not only printed as a speaker label.
      const asked = [q.prompt, ...q.options.map(([text]) => text)].join("\n");
      for (const label of rec.speakers) {
        const name = label.split(" ").pop()!;
        if (new RegExp(`\\b${name}\\b`).test(asked) && !new RegExp(`\\b${name}\\b`).test(spoken)) issue(`${label} is named in the question but never named aloud`);
      }
      if (!(LISTENING_SUBSKILLS as readonly string[]).includes(q.subskill)) issue(`unknown listening subskill ${q.subskill}`);
      if (!isDemandAllowed(rec.level, q.demand)) issue(`cognitive demand ${q.demand} is not allowed at ${rec.level}`);

      const texts = q.options.map(([text]) => text.trim());
      if (new Set(texts.map((text) => text.toLowerCase())).size !== 4) issue("options are not four distinct texts");
      if (q.options.some(([, rationale]) => !rationale.trim())) issue("option rationale missing");
      const lengths = texts.map((text) => text.length);
      const others = lengths.filter((_, index) => index !== q.key);
      const mean = others.reduce((sum, length) => sum + length, 0) / 3;
      if (lengths[q.key] === Math.max(...lengths) && lengths[q.key] > mean * 1.25) warn(`key is the longest option (${lengths[q.key]} vs mean ${mean.toFixed(0)})`);
      if (lengths[q.key] === Math.min(...lengths) && lengths[q.key] < mean * 0.75) warn(`key is the shortest option (${lengths[q.key]} vs mean ${mean.toFixed(0)})`);
      const absolute = texts.filter((text, index) => index !== q.key && ABSOLUTES.test(text));
      if (absolute.length && !ABSOLUTES.test(texts[q.key])) warn(`absolute wording in distractors: ${absolute.join(" | ")}`);

      const session = `${BATCH}-validation`;
      const scoringItem: Item = {
        id: itemCode, skill: SkillType.LISTENING, type: draft.type,
        params: { a: draft.discrimination, b: draft.difficulty, c: draft.guessing }, metadata: content,
      };
      const shuffled = shuffleMcqOptions(content.options, content.correctAnswer, session, itemCode);
      if (!shuffled || shuffled.shuffledOptions.some((option) =>
        scoreObjectiveResponse(scoringItem, session, option.id) !== Number(option.text === texts[q.key])))
        issue("production scoring disagrees with the key after shuffling");

      const integrity = await runContentIntegrityGate({
        type: draft.type, skill: draft.skill, cefrLevel: draft.cefrLevel,
        content: { ...content, cognitiveDemand: q.demand },
      } as unknown as Parameters<typeof runContentIntegrityGate>[0]);
      for (const found of integrity.issues) issue(`${found.code}: ${found.message}`);

      for (const finding of auditItemEvidence({ ...draft, id: itemCode, version: 1 })) {
        if (finding.rule === "AUDIO_MISSING") continue; // audio is a separate, later step
        if (finding.severity === "BLOCKER" || finding.severity === "REVIEW") issue(finding.rule);
      }

      const servable = { ...draft, status: "ACTIVE" };
      if (!isAdaptiveEligible(servable, academia, SkillType.LISTENING)) issue("would not be eligible for Academia once active");
      if (isAdaptiveEligible(draft, academia, SkillType.LISTENING)) issue("a DRAFT must not be eligible for delivery");
      drafts.push(draft);
    }
  }

  for (const [level, positions] of Object.entries(keyPositions)) {
    const total = positions.reduce((sum, n) => sum + n, 0);
    if (total >= 8 && Math.max(...positions) > total * 0.4) problems.push(`${level}: key positions cluster (A-D = ${positions.join("/")})`);
  }

  console.table(Object.fromEntries(Object.entries(counts).map(([level, c]) => [level, {
    recordings: c.recordings, questions: c.questions, meanWords: Math.round(c.words / c.recordings), keysAtoD: keyPositions[level].join("/"),
  }])));
  if (warnings.length) console.log(`Warnings (${warnings.length}):\n  ${warnings.join("\n  ")}`);
  if (problems.length) throw new Error(`Validation failed (${problems.length}):\n  ${problems.join("\n  ")}`);
  console.log(`Validated ${drafts.length} drafts in ${setKeys.size} recordings. All need audio; none is written yet.`);
  if (args.includes("--packet")) writePacket(selected);
  if (!args.includes("--apply")) return;

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const saved = await db.$transaction(async (tx) => {
      const inserted = await tx.item.createMany({ data: drafts, skipDuplicates: true });
      const found = await tx.item.findMany({
        where: { itemCode: { in: [...codes] } },
        select: { id: true, itemCode: true, cefrLevel: true, status: true, metadata: true },
      });
      const byCode = new Map(found.map((row) => [row.itemCode, row]));
      for (const draft of drafts) {
        const row = byCode.get(draft.itemCode);
        if (row?.status !== "DRAFT" || record(row.metadata).batchFingerprint !== draft.metadata.batchFingerprint)
          throw new Error(`${draft.itemCode} exists with other content or status; transaction rolled back.`);
      }
      return { inserted: inserted.count, found };
    }, { timeout: 60_000, maxWait: 15_000 });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/wave-01-ids.json`, JSON.stringify(saved.found.map((row) => ({ id: row.id, code: row.itemCode, cefr: row.cefrLevel })), null, 1));
    console.log(`Inserted ${saved.inserted} DRAFT records. Confirmed ${saved.found.length} batch records. Ids: ${OUT}/wave-01-ids.json`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
