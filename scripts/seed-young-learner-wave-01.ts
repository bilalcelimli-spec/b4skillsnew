/**
 * Validate the authored wave packages (Wave 01 by default). --apply inserts DRAFT records only.
 * Existing codes are immutable here so a rerun cannot overwrite review work.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { shuffleMcqOptions } from "../src/lib/assessment-engine/mcq-options.js";
import { scoreObjectiveResponse } from "../src/lib/assessment-engine/objective-response.js";
import { MAX_ITEMS_PER_PASSAGE, passageKey } from "../src/lib/assessment-engine/passage-cap.js";
import { SkillType, type Item } from "../src/lib/assessment-engine/types.js";
import { parseSpeakerTurn } from "../src/lib/audio/speaker-labels.js";
import { CEFR_DIFFICULTY_MAP } from "../src/lib/cefr/cefr-framework.js";
import { ageContextViolations, unanchoredNames } from "../src/lib/content-factory/age-context.js";
import { auditItemEvidence, record } from "../src/lib/quality/item-evidence-audit.js";
import { writingWordRange } from "../src/lib/quality/writing-content-audit.js";
import { resolveTaskRubric, rubricReviewReasons } from "../src/lib/scoring/rubric-validation.js";
import { candidateItemContent } from "../src/lib/security/answer-sanitizer.js";
import { validateItemBeforeSave, validateItemStructure } from "../src/lib/validation/item-schema.js";
import { waveItems as wave01 } from "./content/young-learner-wave-01.js";
import { waveItems as wave02 } from "./content/young-learner-wave-02.js";
import { waveItems as wave03 } from "./content/young-learner-wave-03.js";
import { waveItems as wave04 } from "./content/young-learner-wave-04.js";
import { waveItems as wave05 } from "./content/young-learner-wave-05.js";
import { waveItems as wave06 } from "./content/young-learner-wave-06.js";
import { waveItems as wave07 } from "./content/young-learner-wave-07.js";

const waves = new Map([["01", wave01], ["02", wave02], ["03", wave03], ["04", wave04], ["05", wave05], ["06", wave06], ["07", wave07]]);

function makeDraft(item: (typeof wave01)[number], batch: string) {
  const { productLine, content, rejectedAnswer, readingSetId, ...fields } = item;
  const ageSuitability = productLine === "primary" ? "YOUNG_LEARNER" : "TEEN";
  return {
    ...fields,
    content,
    ageSuitability,
    culturalLoad: "LOW",
    englishVariant: "INTERNATIONAL",
    difficulty: CEFR_DIFFICULTY_MAP[item.cefrLevel],
    guessing: item.type === "MULTIPLE_CHOICE" ? 0.25 : 0,
    tags: [productLine, batch],
    status: "DRAFT",
    pipelineStage: "AI_DRAFT",
    isPretest: false,
    securityClass: "ASSESSMENT",
    provenance: "ORIGINAL_AI_ASSISTED",
    metadata: {
      source: batch,
      triggeredBy: batch,
      ...(readingSetId ? { readingSetId } : {}),
      batchFingerprint: createHash("sha256").update(JSON.stringify(rejectedAnswer ? { ...item, rejectedAnswer: undefined } : item)).digest("hex"),
      paramSource: "prior",
    },
  } satisfies Prisma.ItemCreateManyInput;
}

async function main() {
  const args = process.argv.slice(2);
  const selection = args.filter((arg) => arg !== "--apply");
  const wave = selection[0]?.match(/^--wave=(\w+)$/)?.[1] ?? (selection.length ? "" : "01");
  if (selection.length > 1 || (wave !== "all" && !waves.has(wave))) {
    const supported = [...waves.keys(), "all"].map((id) => `--wave=${id}`).join(", ");
    throw new Error(`Use one of ${supported}, optionally with --apply.`);
  }
  const selectedWaves = [...waves].filter(([id]) => wave === "all" || id === wave);
  const drafts = selectedWaves.flatMap(([id, items]) => items.map((item) => makeDraft(item, `young-learner-wave-${id}`)));
  const rejectedAnswers = new Map(selectedWaves.flatMap(([, items]) => items.map((item) => [item.itemCode, item.rejectedAnswer])));
  const codes = new Set<string>();
  const stimuli = new Map<string, string>();
  const readingSets = new Map<string, ReturnType<typeof makeDraft>[]>();
  const counts: Record<string, number> = {};
  let needsAudio = 0;

  for (const draft of drafts) {
    const { content, skill, itemCode, ageSuitability } = draft;
    const group = `${content.productLine}/${draft.cefrLevel}/${skill}`;
    counts[group] = (counts[group] ?? 0) + 1;
    const issues = validateItemStructure(skill, content);
    const saveCheck = await validateItemBeforeSave(skill, content, draft.type);
    if (!saveCheck.success) issues.push(`Admin validation: ${saveCheck.error}`);
    issues.push(...ageContextViolations(content, ageSuitability));
    issues.push(...unanchoredNames(content));
    if (codes.has(itemCode)) issues.push("Duplicate item code");
    codes.add(itemCode);

    const stimulus = String(content.passage ?? content.ttsScript ?? content.scaffold ?? content.prompt).trim();
    const setId = draft.metadata.readingSetId;
    const stimulusOwner = setId ?? itemCode;
    if (stimuli.has(stimulus) && stimuli.get(stimulus) !== stimulusOwner) issues.push("Duplicate stimulus outside its declared set");
    stimuli.set(stimulus, stimulusOwner);
    if (setId) {
      if (skill !== "READING" || typeof content.passage !== "string") issues.push("Reading set item needs a reading passage");
      const members = readingSets.get(setId) ?? [];
      members.push(draft);
      readingSets.set(setId, members);
    }

    const options = Array.isArray(content.options) ? content.options.map(record) : [];
    const session = `${draft.metadata.source}-validation`;
    const scoringItem: Item = {
      id: itemCode,
      skill: SkillType[skill],
      type: draft.type,
      params: { a: 1, b: draft.difficulty, c: draft.guessing },
      metadata: content,
    };
    if (draft.type === "MULTIPLE_CHOICE") {
      const index = Number(content.correctIndex);
      if (options.length !== 4 || new Set(options.map((o) => String(o.text).toLowerCase().trim())).size !== 4)
        issues.push("Expected four distinct options");
      if (options.filter((o) => o.isCorrect).length !== 1 || !options[index]?.isCorrect || options[index].id !== content.correctAnswer)
        issues.push("The answer index, ID and correct flag disagree");
      if (options.some((o) => !o.rationale?.trim())) issues.push("Option rationale missing");
      if (issues.length === 0) {
        const shuffled = shuffleMcqOptions(options, String(content.correctAnswer), session, itemCode);
        if (!shuffled || shuffled.shuffledOptions.some((option) =>
          scoreObjectiveResponse(scoringItem, session, option.id) !== Number(option.text === options[index].text),
        )) issues.push("Production scoring disagrees with the key after shuffling");
      }
    }
    if (draft.type === "FILL_IN_BLANKS" && issues.length === 0) {
      const blanks = Array.isArray(content.blanks) ? content.blanks.map(record) : [];
      const rejected = rejectedAnswers.get(itemCode);
      if (blanks.length !== 1 || !Array.isArray(blanks[0].acceptableAnswers) || !rejected ||
        blanks[0].acceptableAnswers.some((answer: string) => scoreObjectiveResponse(scoringItem, session, answer) !== 1) ||
        scoreObjectiveResponse(scoringItem, session, rejected) !== 0)
        issues.push("Production scoring disagrees with the single blank answer cases");
    }
    if (skill === "WRITING" || skill === "SPEAKING") {
      issues.push(...rubricReviewReasons(resolveTaskRubric(content)));
      const sample = typeof content.sampleAnswer === "string" ? content.sampleAnswer.trim() : "";
      const words = sample ? sample.split(/\s+/).length : 0;
      if (skill === "WRITING") {
        const range = writingWordRange(content);
        if (!words || words < range.min || (range.max !== null && words > range.max))
          issues.push("Model answer outside written word range");
      } else if (!words || words > Number(content.responseTime) * 1.5) {
        issues.push("Model answer exceeds response time at a review pace of 90 words per minute");
      }
      const candidate = record(candidateItemContent(skill, content));
      if (candidate.prompt !== content.prompt || "rubric" in candidate || "scoringRubric" in candidate || "sampleAnswer" in candidate)
        issues.push("Candidate payload does not preserve the prompt and hide scoring materials");
    }
    if (skill === "LISTENING") {
      const turns = String(content.ttsScript).split("\n").map(parseSpeakerTurn);
      const labels = [...new Set(turns.map((turn) => turn?.speaker))];
      if (turns.some((turn) => !turn?.utterance.trim()) ||
        JSON.stringify(labels) !== JSON.stringify(content.speakers) || labels.length !== content.numberOfSpeakers ||
        content.ttsScript !== content.transcript)
        issues.push("Listening turns, speaker labels, and transcript disagree");
    }

    for (const finding of auditItemEvidence({ ...draft, id: itemCode, version: 1 })) {
      if (finding.rule === "AUDIO_MISSING" && skill === "LISTENING") needsAudio++;
      else if (finding.severity === "BLOCKER" || finding.severity === "REVIEW") issues.push(finding.rule);
    }

    if (issues.length > 0) throw new Error(`${itemCode}: ${issues.join(", ")}`);
  }

  for (const [id, members] of readingSets) {
    const distinct = (field: (member: (typeof members)[number]) => unknown) => new Set(members.map(field)).size;
    const key = passageKey({ metadata: members[0].content });
    if (!key || members.length !== 2 || members.length > MAX_ITEMS_PER_PASSAGE ||
      distinct((member) => passageKey({ metadata: member.content })) !== 1 ||
      distinct((member) => member.cefrLevel) !== 1 || distinct((member) => member.content.productLine) !== 1 ||
      distinct((member) => member.subskill) !== members.length || distinct((member) => member.content.prompt) !== members.length)
      throw new Error(`${id}: a reading pair must share one level, product and passage, with two distinct tasks.`);
  }

  console.table(counts);
  console.log(`Validated ${drafts.length} unique drafts. ${needsAudio} listening scripts await production audio.`);
  if (readingSets.size) console.log(`Validated ${readingSets.size} reading pairs.`);
  if (!args.includes("--apply")) return;

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const saved = await db.$transaction(async (tx) => {
      const inserted = await tx.item.createMany({ data: drafts, skipDuplicates: true });
      const found = await tx.item.findMany({
        where: { itemCode: { in: [...codes] } },
        select: { itemCode: true, metadata: true },
      });
      const byCode = new Map(found.map((row) => [row.itemCode, row]));
      for (const draft of drafts) {
        const row = byCode.get(draft.itemCode);
        if (record(row?.metadata).batchFingerprint !== draft.metadata.batchFingerprint)
          throw new Error(`Batch fingerprint mismatch for ${draft.itemCode}; transaction rolled back.`);
      }
      return { inserted: inserted.count, confirmed: found.length };
    }, { timeout: 30_000 });
    console.log(`Inserted ${saved.inserted} DRAFT records. Confirmed ${saved.confirmed} batch records.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
