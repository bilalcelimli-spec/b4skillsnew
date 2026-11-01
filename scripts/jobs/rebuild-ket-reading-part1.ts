#!/usr/bin/env tsx

/**
 * Rebuilds the Cambridge KET Reading Part 1 items that the 2026-11-01 bank
 * review pulled from service (8 options, no question, one option set shared by
 * five items). Dry-run by default; --apply writes two DRAFT items.
 *
 *   npx tsx scripts/jobs/rebuild-ket-reading-part1.ts
 *   npx tsx scripts/jobs/rebuild-ket-reading-part1.ts --apply
 *
 * 1. One DRAG_DROP matching item: the five notices that shared an option set
 *    are the rows, the eight sentences the choices (three unused) — the real
 *    Part 1 task, with its instruction.
 * 2. One 4-option MCQ for the park-gym sign, whose own task partner was
 *    already retired; the question is now stored.
 *
 * Wording changes against the old options, all reviewer-visible in
 * metadata.rebuild.changes. The source items stay in REVIEW; nothing is
 * promoted. Running --apply twice writes nothing the second time.
 */

import { prisma } from "../../src/lib/prisma.js";
import { assembleMatching, guessingForMatching, validateAssembledMatching, validateRawMatching, type RawMatching } from "../../src/lib/content-factory/matching-items.js";
import { nextItemCode } from "../../src/lib/content-factory/item-codes.js";

const APPLY = process.argv.includes("--apply");
const ACTOR = "claude-code:ket-rebuild-2026-11";
const SOURCE_TAGS = ["junior", "suite", "reading", "cambridge_ket_pet", "a2"];
const TASK_ID = "KET_R_PART1";

const MATCH_SOURCES = ["REA-A2-0150-MVX1N7S2", "REA-A2-0150-MVX1N7VY", "REA-A2-0150-MVX1N7QX", "REA-A2-0150-MVX1N7UG", "REA-A2-0150-MVX1N7T6"];
const MCQ_SOURCE = "REA-A2-0150-MVX1N7XJ";

const matching: RawMatching = {
  prompt: "Read the five notices. Which sentence (A–H) says what each notice means? Match each notice to one sentence. There are three sentences you do not need.",
  pairs: [
    { zone: "Doctor's Surgery: Appointments must be booked online or by phone. No walk-ins, please.", answer: "You need to arrange your visit before you come." },
    { zone: "Gym Class Sign-up: All places for Tuesday's yoga class are now full. Check next week's schedule.", answer: "There is no space left in this week's class." },
    { zone: "Fitness Centre: Please bring a towel for your workout. Keep equipment clean for everyone's health.", answer: "You must clean the machines after you use them." },
    { zone: "Swimming Pool Notice: Children under 8 years old must be accompanied by an adult in the water.", answer: "An adult must swim with young children." },
    { zone: "Smoothie Bar: Try our new 'Energy Boost' drink with fresh fruit and vitamins – perfect after exercise!", answer: "There is a new healthy drink to have after sport." },
  ],
  extraItems: [
    "This activity is free for children under eight.",
    "You can only pay for classes using your phone.",
    "The shop has run out of fresh fruit today.",
  ],
};
const CHANGES = [
  "'You cannot join this lesson today.' → 'There is no space left in this week's class.' (the notice says Tuesday, not today)",
  "'People must get in the water with young children.' → 'An adult must swim with young children.' (clear subject)",
  "'You must make sure the machines are clean after you use them' → 'You must clean the machines after you use them.' (missing full stop; length)",
  "'There is a new healthy drink to help you after sport.' → '…to have after sport.' (length within the matching rule)",
];

const mcq = {
  passage: "Park Gym Equipment: Only for users aged 16+. Please read safety instructions before use.",
  prompt: "What does this sign say?",
  options: [
    { text: "You must be at least sixteen to use this equipment.", isCorrect: true },
    { text: "Children under sixteen can use it with an adult.", isCorrect: false },
    { text: "You need to book before you use this equipment.", isCorrect: false },
    { text: "This equipment is closed to everyone on Fridays.", isCorrect: false },
  ],
};

async function main() {
  const sources = await prisma.item.findMany({ where: { itemCode: { in: [...MATCH_SOURCES, MCQ_SOURCE] } }, select: { id: true, itemCode: true, status: true, difficulty: true, discrimination: true } });
  if (sources.length !== MATCH_SOURCES.length + 1) throw new Error(`expected 6 source items, found ${sources.length}`);
  const notInReview = sources.filter((s) => s.status !== "REVIEW");
  if (notInReview.length) throw new Error(`source items must be in REVIEW: ${notInReview.map((s) => s.itemCode).join(", ")}`);
  const already = await prisma.item.count({ where: { metadata: { path: ["rebuild", "by"], equals: ACTOR } } });
  if (already) { console.log(`${already} rebuilt item(s) already exist — nothing to do`); return; }

  const rawErrors = validateRawMatching(matching);
  const assembled = assembleMatching(matching, "ket-part1-health-fitness");
  // The notices are the reading text (READING items need a passage); rows carry short labels.
  const passage = assembled.dropZones.map((notice, i) => `Notice ${i + 1}\n${notice}`).join("\n\n");
  assembled.dropZones = assembled.dropZones.map((_, i) => `Notice ${i + 1}`);
  const errors = [...rawErrors, ...validateAssembledMatching(assembled)];
  if (errors.length) throw new Error(`matching item invalid: ${errors.join("; ")}`);

  // Scored all-or-nothing (structured-response: every row must match), so the seed b is the θ
  // at which a candidate gets all five source items right with p = 0.5 — not their mean b.
  const matchSources = sources.filter((s) => MATCH_SOURCES.includes(s.itemCode!));
  const p = (t: number, s: { discrimination: number; difficulty: number }) => 1 / (1 + Math.exp(-1.7 * s.discrimination * (t - s.difficulty)));
  let lo = -4, hi = 4;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (matchSources.reduce((acc, s) => acc * p(mid, s), 1) < 0.5) lo = mid; else hi = mid; }
  const matchB = Number(((lo + hi) / 2).toFixed(2));
  const mcqB = sources.find((s) => s.itemCode === MCQ_SOURCE)!.difficulty;
  const guessing = guessingForMatching(assembled.dropZones.length, assembled.draggableItems.length);
  const ids = Object.fromEntries(sources.map((s) => [s.itemCode, s.id]));

  console.log(`MATCHING  ${assembled.dropZones.length} notices × ${assembled.draggableItems.length} sentences, b=${matchB} (all five right at p=0.5), c=${guessing.toFixed(3)}`);
  matching.pairs.forEach((pair, i) => console.log(`  ${assembled.dropZones[i]}: ${pair.zone.slice(0, 50).padEnd(50)} → ${assembled.draggableItems[assembled.correctMapping[String(i)]]}`));
  console.log(`  unused: ${assembled.draggableItems.filter((_, i) => !Object.values(assembled.correctMapping).includes(i)).join(" | ")}`);
  console.log(`MCQ       "${mcq.prompt}" b=${mcqB}  key: ${mcq.options.find((o) => o.isCorrect)!.text}`);
  if (!APPLY) { console.log("dry run — nothing written"); return; }

  const now = new Date().toISOString();
  const base = {
    skill: "READING" as const, cefrLevel: "A2" as const, status: "DRAFT" as const, pipelineStage: "EDITING" as const,
    tags: SOURCE_TAGS, ageSuitability: "TEEN" as const, culturalLoad: "LOW", englishVariant: "BRITISH", securityClass: "ASSESSMENT" as const,
    discrimination: 1.0,
  };
  const matchItem = await prisma.item.create({ data: { ...base,
    itemCode: await nextItemCode("READING", "A2"), type: "DRAG_DROP", difficulty: matchB, guessing,
    subskill: "SPECIFIC_INFORMATION", genre: "notice", topic: "health and fitness",
    content: { passage, ...assembled, productLine: "JUNIOR_SUITE", suite: "Junior Suite (11-14)", exam_source: "cambridge_ket_pet", cambridge_exam: "KET", cambridge_task_id: TASK_ID } as any,
    metadata: { triggeredBy: ACTOR, rebuild: { by: ACTOR, at: now, from: MATCH_SOURCES.map((c) => ({ code: c, id: ids[c] })), reason: "8-option MCQs without a question; one shared option set across five items", changes: CHANGES, seedDifficulty: "theta where all five source items are answered correctly with p = 0.5 (all-or-nothing scoring)" } } as any,
  }, select: { id: true, itemCode: true } });
  const mcqItem = await prisma.item.create({ data: { ...base,
    itemCode: await nextItemCode("READING", "A2"), type: "MULTIPLE_CHOICE", difficulty: mcqB, guessing: 0.25,
    subskill: "EXPLICIT_DETAIL", genre: "notice", topic: "health and fitness",
    content: { ...mcq, productLine: "JUNIOR_SUITE", suite: "Junior Suite (11-14)", exam_source: "cambridge_ket_pet", cambridge_exam: "KET", cambridge_task_id: TASK_ID } as any,
    metadata: { triggeredBy: ACTOR, rebuild: { by: ACTOR, at: now, from: [{ code: MCQ_SOURCE, id: ids[MCQ_SOURCE] }], reason: "8-option MCQ without a question; its task partner was retired", changes: ["question stored", "8 → 4 options, all about the sign", "distractor 'The park gym is closed on Fridays.' → 'This equipment is closed to everyone on Fridays.' (length)"] } } as any,
  }, select: { id: true, itemCode: true } });

  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/ket-rebuild-ids.json", JSON.stringify([matchItem, mcqItem].map((x) => ({ id: x.id, code: x.itemCode })), null, 1));
  console.log(`wrote DRAFT ${matchItem.itemCode} (matching) and ${mcqItem.itemCode} (MCQ) → scripts/jobs/.out/ket-rebuild-ids.json`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
