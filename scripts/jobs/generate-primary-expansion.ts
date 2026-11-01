#!/usr/bin/env tsx

/**
 * Primary (7-10) bank expansion — all six skills, PRE_A1–A2.
 * Items go through the gated generator and are stored as DRAFT (never served)
 * with the "primary" tag + content.productLine, so once reviewed and promoted
 * they enter the Primary pool.
 *
 *   npx tsx scripts/jobs/generate-primary-expansion.ts --dry-run     # 2 drafts per skill, no DB writes
 *   npx tsx scripts/jobs/generate-primary-expansion.ts               # full run (~230 requested)
 *   npx tsx scripts/jobs/generate-primary-expansion.ts --scale 0.5   # smaller run
 *   npx tsx scripts/jobs/generate-primary-expansion.ts --only READING,LISTENING
 *
 * Listening drafts have a ttsScript but no audio yet (separate step).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { runBatchGeneration, generateDrafts } from "../../src/lib/content-factory/batch-generator.js";
import type { BlueprintCell } from "../../src/lib/content-factory/blueprint.js";
import { prisma } from "../../src/lib/prisma.js";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const DRY = process.argv.includes("--dry-run");
const SCALE = Number(arg("--scale") ?? 1);
const ONLY = arg("--only")?.split(",").map((s) => s.trim().toUpperCase());

const BASE: Partial<BlueprintCell> = {
  ageSuitability: "YOUNG_LEARNER", ageRange: [7, 10], productLine: "primary",
  culturalLoad: "LOW", englishVariant: "INTERNATIONAL",
};
type Spec = [cefr: string, skill: string, subskill: string, genre: string, topic: string, count: number, extra?: Partial<BlueprintCell>];

const SPECS: Spec[] = [
  // READING — 55
  ["PRE_A1", "READING", "EXPLICIT_DETAIL", "notice", "animals", 6],
  ["PRE_A1", "READING", "SPECIFIC_INFORMATION", "narrative", "family", 6],
  ["A1", "READING", "EXPLICIT_DETAIL", "email", "school", 7],
  ["A1", "READING", "SPECIFIC_INFORMATION", "notice", "food", 7],
  ["A1", "READING", "GIST", "narrative", "hobbies", 6],
  ["A2", "READING", "MAIN_IDEA", "narrative", "holidays", 6],
  ["A2", "READING", "REFERENCE_RESOLUTION", "narrative", "friends", 6],
  ["A2", "READING", "MEANING_FROM_CONTEXT", "blog", "sports", 5],
  ["A2", "READING", "EXPLICIT_DETAIL", "instructions", "school_trip", 6],
  // LISTENING — 55
  ["PRE_A1", "LISTENING", "FACTUAL_DETAIL", "conversation", "colours_and_clothes", 7],
  ["PRE_A1", "LISTENING", "SPECIFIC_INFORMATION", "conversation", "numbers_and_age", 6],
  ["A1", "LISTENING", "FACTUAL_DETAIL", "conversation", "food", 7],
  ["A1", "LISTENING", "SPECIFIC_INFORMATION", "announcement", "school", 7],
  ["A1", "LISTENING", "TOPIC", "short_talk", "pets", 6],
  ["A2", "LISTENING", "SEQUENCE", "short_talk", "weekend", 6],
  ["A2", "LISTENING", "FACTUAL_DETAIL", "conversation", "shopping", 6],
  ["A2", "LISTENING", "GIST", "conversation", "birthday_party", 5],
  ["A2", "LISTENING", "SPECIFIC_INFORMATION", "announcement", "sports_day", 5],
  // VOCABULARY — 45
  ["PRE_A1", "VOCABULARY", "RECEPTIVE_VOCABULARY", "multiple_choice_context", "animals", 6],
  ["PRE_A1", "VOCABULARY", "RECEPTIVE_VOCABULARY", "multiple_choice_context", "body_and_clothes", 6],
  ["PRE_A1", "VOCABULARY", "RECEPTIVE_VOCABULARY", "gap_fill", "home_and_toys", 5],
  ["A1", "VOCABULARY", "CONTEXTUAL_MEANING", "gap_fill", "food", 6],
  ["A1", "VOCABULARY", "RECEPTIVE_VOCABULARY", "multiple_choice_context", "weather_and_seasons", 6],
  ["A1", "VOCABULARY", "CONTEXTUAL_MEANING", "gap_fill", "school", 5],
  ["A2", "VOCABULARY", "COLLOCATION", "gap_fill", "daily_routines", 6],
  ["A2", "VOCABULARY", "CONTEXTUAL_MEANING", "multiple_choice_context", "places_in_town", 5],
  // GRAMMAR — 32
  ["PRE_A1", "GRAMMAR", "AGREEMENT", "gap_fill", "family", 5, { construct: "be / have got / there is-are agreement" }],
  ["A1", "GRAMMAR", "TENSE_ASPECT", "gap_fill", "daily_routines", 6, { construct: "present simple vs present continuous" }],
  ["A1", "GRAMMAR", "DETERMINERS", "gap_fill", "food", 5, { construct: "a / an / some / plural nouns" }],
  ["A2", "GRAMMAR", "TENSE_ASPECT", "gap_fill", "holidays", 6, { construct: "past simple (regular and common irregular verbs)" }],
  ["A2", "GRAMMAR", "COMPARISON", "multiple_choice_context", "animals", 5, { construct: "comparative and superlative adjectives" }],
  ["A2", "GRAMMAR", "MODALITY", "multiple_choice_context", "school", 5, { construct: "can / can't / must / mustn't" }],
  // WRITING — 22
  ["PRE_A1", "WRITING", "TASK_FULFILMENT", "story", "my_family", 6, { wordCountMin: 10, wordCountMax: 25 }],
  ["A1", "WRITING", "TASK_FULFILMENT", "email", "my_day", 8, { wordCountMin: 25, wordCountMax: 45 }],
  ["A2", "WRITING", "TASK_FULFILMENT", "story", "a_special_day", 8, { wordCountMin: 40, wordCountMax: 70 }],
  // SPEAKING — 22
  ["PRE_A1", "SPEAKING", "TASK_FULFILMENT", "personal_questions", "me_and_my_things", 6],
  ["A1", "SPEAKING", "TASK_FULFILMENT", "personal_questions", "home_and_school", 8],
  ["A2", "SPEAKING", "COHERENCE", "situational", "weekends_and_holidays", 8],
];

const CELLS = SPECS
  .filter(([, skill]) => !ONLY || ONLY.includes(skill))
  .map(([cefr, skill, subskill, genre, topic, count, extra]) => ({
    cell: { ...BASE, cefr, skill, subskill, genre, topic, ...extra } as BlueprintCell,
    count: Math.max(1, Math.round(count * SCALE)),
  }));

mkdirSync("scripts/jobs/.out", { recursive: true });

async function dryRun() {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const { cell } of CELLS) {
    if (seen.has(cell.skill)) continue;
    seen.add(cell.skill);
    const r = await generateDrafts(cell, 2);
    console.log(`${cell.cefr}/${cell.skill}/${cell.subskill}: ${r.items.length} drafts${r.skippedReasons.length ? " | " + r.skippedReasons.join(" ; ").slice(0, 300) : ""}`);
    out.push({ cell: `${cell.cefr}/${cell.skill}/${cell.subskill}`, items: r.items, skipped: r.skippedReasons });
  }
  writeFileSync("scripts/jobs/.out/primary-expansion-dryrun.json", JSON.stringify(out, null, 1));
  console.log("written: scripts/jobs/.out/primary-expansion-dryrun.json (no DB writes)");
}

async function run() {
  const requested = CELLS.reduce((s, c) => s + c.count, 0);
  console.log(`Requesting ${requested} DRAFT items across ${CELLS.length} cells`);
  let cursor = 0;
  const results: { cell: string; skill: string; r: Awaited<ReturnType<typeof runBatchGeneration>> }[] = [];
  async function worker() {
    while (cursor < CELLS.length) {
      const { cell, count } = CELLS[cursor++];
      const r = await runBatchGeneration({ cell, count, triggeredBy: "claude-code:primary-expansion", notes: "Primary (7-10) bank expansion 2026-10-30" });
      results.push({ cell: `${cell.cefr}/${cell.skill}/${cell.subskill}/${cell.topic}`, skill: cell.skill, r });
      console.log(`${cell.cefr}/${cell.skill}/${cell.subskill}: stored ${r.generated}/${r.requested} in ${Math.round(r.durationMs / 1000)}s${r.skippedReasons.length ? " | skipped: " + r.skippedReasons.slice(0, 3).join(" ; ").slice(0, 300) : ""}`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));

  const bySkill: Record<string, { requested: number; stored: number; dup: number }> = {};
  for (const { skill, r } of results) {
    const s = (bySkill[skill] ??= { requested: 0, stored: 0, dup: 0 });
    s.requested += r.requested; s.stored += r.generated; s.dup += r.duplicatesBlocked;
  }
  const ids = results.flatMap((x) => x.r.storedIds);
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, tags: true } });
  console.log("\nBY SKILL:", JSON.stringify(bySkill));
  console.log(`STORED ${items.length} items (status: ${[...new Set(items.map((x) => x.status))].join(",")}; primary-tagged: ${items.filter((x) => x.tags.includes("primary")).length})`);
  writeFileSync("scripts/jobs/.out/primary-expansion-ids.json", JSON.stringify(items.map((x) => ({ id: x.id, code: x.itemCode, skill: x.skill, cefr: x.cefrLevel })), null, 1));
  writeFileSync("scripts/jobs/.out/primary-expansion-skips.json", JSON.stringify(results.map((x) => ({ cell: x.cell, skipped: x.r.skippedReasons })), null, 1));
  console.log("ids: scripts/jobs/.out/primary-expansion-ids.json | skips: scripts/jobs/.out/primary-expansion-skips.json");
}

// ── --replace: retire the drafts the 2026-10-30 manual read rejected, generate replacements ──
const REJECTED: Record<string, string> = {
  ...Object.fromEntries(["GRA-A2-0212", "GRA-A2-0213", "GRA-A2-0214", "GRA-A2-0215", "GRA-A2-0216", "GRA-A2-0217", "GRA-A2-0218", "GRA-A2-0219", "GRA-A2-0220", "GRA-A2-0221"]
    .map((c) => [c, "construct: reading question over a text, key does not depend on the target grammar"])),
  "VOC-A2-0105": "two defensible keys (have/eat breakfast)",
  "VOC-A2-0107": "two defensible keys (clean/brush teeth)",
  "VOC-A2-0108": "two defensible keys (walk/go to school)",
  "VOC-PRE_A1-0038": "two defensible keys (shoes/socks)",
  "VOC-PRE_A1-0040": "several defensible keys (long hair/fingers/legs/arms)",
  "VOC-PRE_A1-0041": "several defensible keys (coat/hat/socks)",
  "VOC-PRE_A1-0044": "several defensible keys (bed/chair/table)",
  "GRA-PRE_A1-0113": "two defensible keys (family has/have — British usage)",
  ...Object.fromEntries(["VOC-PRE_A1-0032", "VOC-PRE_A1-0033", "VOC-PRE_A1-0034", "VOC-PRE_A1-0035", "VOC-PRE_A1-0036", "VOC-PRE_A1-0037"]
    .map((c) => [c, "weak: off-topic distractor (hat/dish/bed/box/table)"])),
  "VOC-A1-0102": "weak: key repeats a word in the stem (swing/swings)",
};
const REPLACEMENT_SPECS: Spec[] = [
  ["A2", "GRAMMAR", "COMPARISON", "gap_fill", "animals", 8, { construct: "comparative and superlative adjectives" }],
  ["A2", "GRAMMAR", "MODALITY", "gap_fill", "school_rules", 8, { construct: "can / can't / must / mustn't" }],
  ["PRE_A1", "GRAMMAR", "AGREEMENT", "gap_fill", "friends", 2, { construct: "be / have got agreement with singular and plural subjects (no collective nouns)" }],
  ["A2", "VOCABULARY", "COLLOCATION", "gap_fill", "daily_routines", 5],
  ["PRE_A1", "VOCABULARY", "RECEPTIVE_VOCABULARY", "gap_fill", "body_and_clothes", 4],
  ["PRE_A1", "VOCABULARY", "RECEPTIVE_VOCABULARY", "gap_fill", "home_and_toys", 2],
  ["PRE_A1", "VOCABULARY", "RECEPTIVE_VOCABULARY", "gap_fill", "animals", 9],
  ["A1", "VOCABULARY", "CONTEXTUAL_MEANING", "gap_fill", "school", 2],
];

// Round 2: reading/listening manual read (2026-10-30).
const OFF_CATEGORY = "key identifiable by form: distractors are a different kind of thing";
const TWO_KEYS = "more than one option is true according to the text";
const MARKUP = "markdown asterisks in the source text (TTS/display)";
const REJECTED_RL: Record<string, string> = {
  "REA-A1-0080": OFF_CATEGORY, "REA-A1-0081": OFF_CATEGORY, "REA-A1-0083": OFF_CATEGORY, "REA-A1-0097": OFF_CATEGORY,
  "REA-PRE_A1-0033": OFF_CATEGORY,
  "REA-A1-0087": TWO_KEYS + " (sit under a tree / read comics)", "REA-A1-0092": TWO_KEYS + " (small bananas / pieces of fruit)",
  "REA-A1-0095": TWO_KEYS + " (play with blocks / sit on the floor)", "REA-A2-0132": TWO_KEYS + " (fastest / faster than Sofia)",
  "REA-PRE_A1-0034": TWO_KEYS + " (a car / a game)", "REA-PRE_A1-0036": TWO_KEYS + " (a fish / Goldie)",
  "REA-A2-0126": "key wrong: 'finish the race' keyed as 'to stop'",
  "REA-A2-0129": "lexical lift: key word appears highlighted in the text",
  "REA-A2-0139": "near-duplicate of REA-A2-0133 (feel unwell → tell a teacher)",
  "REA-A2-0123": MARKUP, "REA-A2-0136": MARKUP + "; 'dribbling' above level",
  "LIS-A1-0048": MARKUP + "; odd distractors (Hide, Wolf)", "LIS-A1-0049": MARKUP,
  "LIS-A1-0050": TWO_KEYS + " (big / homemade / chicken sandwich)", "LIS-A1-0057": TWO_KEYS + " (ten o'clock / the next day)",
  "LIS-A2-0065": TWO_KEYS + " (several actions happen before the movie)", "LIS-A2-0080": TWO_KEYS + " (all options describe the talk)",
  "LIS-A2-0083": TWO_KEYS + " (party / her weekend)", "LIS-A2-0081": OFF_CATEGORY + " (only a hat can be worn)",
  "LIS-PRE_A1-0029": "near-duplicate of LIS-PRE_A1-0025 (age question)",
};
const RL_SPECS: Spec[] = [
  ["PRE_A1", "READING", "EXPLICIT_DETAIL", "notice", "pets", 4],
  ["A1", "READING", "EXPLICIT_DETAIL", "email", "school", 5],
  ["A1", "READING", "SPECIFIC_INFORMATION", "notice", "food", 4],
  ["A2", "READING", "REFERENCE_RESOLUTION", "narrative", "friends", 4],
  ["A2", "READING", "MEANING_FROM_CONTEXT", "narrative", "sports", 3],
  ["A2", "READING", "EXPLICIT_DETAIL", "narrative", "weekend", 3],
  ["A1", "LISTENING", "SPECIFIC_INFORMATION", "announcement", "school", 5],
  ["A2", "LISTENING", "SPECIFIC_INFORMATION", "conversation", "birthday_party", 3],
  ["A2", "LISTENING", "SEQUENCE", "short_talk", "weekend", 3],
  ["A2", "LISTENING", "FACTUAL_DETAIL", "conversation", "shopping", 3],
];

async function replace() {
  const RL = process.argv.includes("--rl");
  const rejected = RL ? REJECTED_RL : REJECTED;
  const specs = RL ? RL_SPECS : REPLACEMENT_SPECS;
  const idsFile = RL ? "scripts/jobs/.out/primary-replacement-rl-ids.json" : "scripts/jobs/.out/primary-replacement-ids.json";
  const codes = Object.keys(rejected);
  const old = await prisma.item.findMany({ where: { itemCode: { in: codes } }, select: { id: true, itemCode: true, status: true, metadata: true } });
  const at = new Date().toISOString();
  let retired = 0;
  for (const it of old) {
    const m: any = it.metadata ?? {};
    if (it.status !== "DRAFT" || m.triggeredBy !== "claude-code:primary-expansion") { console.log(`skip ${it.itemCode} (status ${it.status}, not this job's draft)`); continue; }
    await prisma.item.update({ where: { id: it.id }, data: {
      status: "RETIRED", pipelineStage: "RETIRED",
      metadata: { ...m, statusChange: { from: "DRAFT", fromStage: "AI_DRAFT", to: "RETIRED", at, by: "claude-code:primary-expansion-review", reason: rejected[it.itemCode!] } },
    } });
    retired++;
  }
  console.log(`retired ${retired}/${codes.length} rejected drafts`);

  const cells = specs.map(([cefr, skill, subskill, genre, topic, count, extra]) => ({ cell: { ...BASE, cefr, skill, subskill, genre, topic, ...extra } as BlueprintCell, count }));
  const ids: string[] = [];
  // Item codes are numbered per skill+CEFR, so cells sharing one run in sequence (parallel runs collided on itemCode).
  const groups = Object.values(cells.reduce<Record<string, typeof cells>>((g, c) => ((g[`${c.cell.skill}/${c.cell.cefr}`] ??= []).push(c), g), {}));
  let cursor = 0;
  async function worker() {
    while (cursor < groups.length) {
      for (const { cell, count } of groups[cursor++]) {
        const r = await runBatchGeneration({ cell, count, triggeredBy: "claude-code:primary-expansion", notes: "Primary (7-10) replacements after manual review 2026-10-30" });
        ids.push(...r.storedIds);
        console.log(`${cell.cefr}/${cell.skill}/${cell.subskill}/${cell.topic}: stored ${r.generated}/${r.requested}${r.skippedReasons.length ? " | " + r.skippedReasons.slice(0, 2).join(" ; ").slice(0, 200) : ""}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true } });
  writeFileSync(idsFile, JSON.stringify(items.map((x) => ({ id: x.id, code: x.itemCode, skill: x.skill, cefr: x.cefrLevel })), null, 1));
  console.log(`stored ${items.length} replacement drafts → ${idsFile}`);
}

// ── --revise-ws: writing/speaking manual read (2026-10-31) ──
// Candidates see only content.prompt; the generator had put the bullet points
// in contextNote and mixed "you" with a named character. Only the prompt
// changes; the previous prompt/contextNote are kept in metadata.editorialRevision.
const STORY = "Write about yourself. Remember to include:";
const REVISIONS: Record<string, { prompt: string; reason: string }> = {
  "WRI-A2-0011": { prompt: `Write a story about a special day when you helped someone.\n${STORY}\n• who you helped\n• what you did\n• how you both felt`, reason: "no bullet points visible; mixed perspective (Amara)" },
  "WRI-A2-0012": { prompt: `Imagine it was a special day at school. Write a story about what happened.\n${STORY}\n• what made the day special (for example, a visitor or a game)\n• one fun thing you did\n• how the children felt`, reason: "bullets only in contextNote (not shown); mixed perspective (Kenji)" },
  "WRI-A2-0013": { prompt: `Write a story about a special present you got or gave to someone.\n${STORY}\n• what the present was\n• who gave it or got it\n• why it made the day special`, reason: "bullets only in contextNote (not shown); mixed perspective (Sofia)" },
  "WRI-A2-0014": { prompt: `Imagine a special animal visited your home or school. Write a story about this day.\nRemember to include:\n• what animal it was\n• what it did\n• how everyone felt`, reason: "bullets only in contextNote (not shown); mixed perspective (Ravi)" },
  "WRI-A2-0015": { prompt: `Write a story about a fun trip to a special place, for example a park, a museum or the beach. You can write about a real trip or invent one.\n${STORY}\n• where you went\n• one exciting thing you saw\n• what you liked most about the day`, reason: "bullets only in contextNote (not shown); mixed perspective (Amara); assumes a trip happened" },
  "WRI-A2-0016": { prompt: `Write about a day when you made some food at home or at school, for example a cake, cookies or a sandwich.\n${STORY}\n• what you made\n• who helped you\n• how it tasted or how you felt`, reason: "bullets only in contextNote (not shown); mixed perspective (Kenji)" },
  "WRI-A2-0017": { prompt: `Imagine you found something special, for example a toy, a coin or something interesting in the playground. Write a story.\nRemember to include:\n• what you found\n• where you found it\n• what you did with it`, reason: "bullets only in contextNote (not shown); mixed perspective (Sofia)" },
  "WRI-A2-0018": { prompt: `Write a story about a fun game you played with friends, at school, in the park or at a friend's house.\n${STORY}\n• what game you played\n• who was with you\n• why it was a great day`, reason: "bullets only in contextNote (not shown); mixed perspective (Ravi)" },
  "WRI-PRE_A1-0017": { prompt: `Write about someone in your family. It can be anyone in your family.\nTell me:\n• their name\n• what they like to do\n• one thing about what they look like`, reason: "listed only mum, dad, brother/sister" },
  "SPE-PRE_A1-0041": { prompt: `Tell me about a toy or a thing you really like. What is it? What colour is it?`, reason: "too vague for PRE_A1; no guiding questions" },
  "SPE-PRE_A1-0044": { prompt: `What is your favourite food or drink? Why do you like it?`, reason: "yes/no question invites a one-word answer" },
  "SPE-A2-0057": { prompt: `Sofia is looking at old photos. Tell her about a fun day out you remember. It can be a holiday, a trip or a day at the park. Where did you go? What did you see? What did you do there?`, reason: "assumed the child had been on a holiday" },
};

async function reviseWs() {
  const items = await prisma.item.findMany({ where: { itemCode: { in: Object.keys(REVISIONS) } }, select: { id: true, itemCode: true, status: true, content: true, metadata: true } });
  const at = new Date().toISOString();
  let changed = 0;
  for (const it of items) {
    const m: any = it.metadata ?? {};
    const c: any = it.content ?? {};
    if (it.status !== "DRAFT" || m.triggeredBy !== "claude-code:primary-expansion" || m.editorialRevision) { console.log(`skip ${it.itemCode}`); continue; }
    const rev = REVISIONS[it.itemCode!];
    await prisma.item.update({ where: { id: it.id }, data: {
      content: { ...c, prompt: rev.prompt, contextNote: "Reviewer note: the candidate sees only the prompt." },
      version: { increment: 1 },
      metadata: { ...m, editorialRevision: { at, by: "claude-code:primary-expansion-review", reason: rev.reason, previous: { prompt: c.prompt, contextNote: c.contextNote } } },
    } });
    changed++;
  }
  console.log(`revised ${changed}/${Object.keys(REVISIONS).length} writing/speaking drafts`);
}

(DRY ? dryRun() : process.argv.includes("--revise-ws") ? reviseWs() : process.argv.includes("--replace") ? replace() : run())
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
