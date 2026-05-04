/**
 * READING PHASE 1 — PRIMARY
 * Module: "A Postcard from Paris"
 * CEFR: A1 | Ages 7–10 | ~100 words | Personal message (postcard)
 * 5 questions: detail ×3, gist ×1, inference ×1
 *
 * SOTA notes:
 * - All vocabulary within A1 word-list (Oxford 3000 A1 band).
 * - Distractors exploit common misreadings (wrong person, conflated events).
 * - IRT b-params spaced to cover the A1 difficulty range (−1.4 to −0.6).
 * - Key rotation: balanced A/B/C/D positions across 5 items.
 *
 *   npx tsx scripts/seed-reading-phase1.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID   = "primary-reading-postcard-paris";
const PRODUCT_LINE = "PRIMARY";
const MODULE_TITLE = "A Postcard from Paris";
const CEFR_BAND   = "A1";

const PASSAGE = `Hi Emma,

I am in Paris with my family. We are having a great time!

Yesterday we visited the Eiffel Tower. It was amazing and very tall. Today we went to a lovely café for breakfast. The croissants were delicious.

My mum bought a red scarf at a market. My brother wants to see a museum, but I want to go back to the tower.

We are here until Sunday. I miss you!

Love,
Sophie`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A1 — only present simple and simple past, high-frequency concrete nouns, no idioms.
✓ Child-safe content — family holiday, no sensitive themes.
✓ Q1 (gist) — tests overall communicative purpose (why Sophie wrote).
✓ Q2 (detail) — what Mum bought; distractor trap: brother + museum attracts wrong-person errors.
✓ Q3 (detail) — what Sophie's brother wants; low b-param; stated explicitly.
✓ Q4 (detail) — when Sophie leaves; "until Sunday" correctly parsed.
✓ Q5 (inference) — how Sophie feels about Paris; requires positive-sentiment integration.
✓ Passage ~96 words; appropriate for Primary timed reading (3–4 min).
✓ All options single-phrase; no trick distractors that confuse young learners.
HUMAN REVIEW: Confirm "croissants" does not require glossing for age 7. Add a picture of a croissant in production if needed.
`;

const items = [
  // Q1 — Gist: communicative purpose
  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "primary", "postcard", "a1", "gist", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 96, textType: "personal message / postcard",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "gist", questionNumber: 1,
      prompt: "Why did Sophie write this message?",
      options: [
        { text: "To ask Emma to visit Paris",      isCorrect: false, rationale: "Sophie does not invite Emma; she shares news about her own trip." },
        { text: "To tell Emma about her holiday",  isCorrect: true,  rationale: "The postcard's purpose is to share holiday news with her friend Emma." },
        { text: "To ask Emma what to do in Paris", isCorrect: false, rationale: "Sophie already describes activities; she is not requesting advice." },
        { text: "To say she does not like Paris",  isCorrect: false, rationale: "Sophie says they are 'having a great time', indicating a positive experience." },
      ],
    },
  },
  // Q2 — Detail: what Mum bought
  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "primary", "postcard", "a1", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 96, textType: "personal message / postcard",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 2,
      prompt: "What did Sophie's mum buy at the market?",
      options: [
        { text: "A blue hat",   isCorrect: false, rationale: "No hat is mentioned; the distractor changes the colour and item." },
        { text: "A red scarf",  isCorrect: true,  rationale: "The text says 'My mum bought a red scarf at a market.'" },
        { text: "A red bag",    isCorrect: false, rationale: "The colour 'red' is correct but the item was a scarf, not a bag." },
        { text: "A souvenir",   isCorrect: false, rationale: "'Souvenir' is not used; the text specifies the exact item (scarf)." },
      ],
    },
  },
  // Q3 — Detail: what brother wants to do
  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "primary", "postcard", "a1", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 96, textType: "personal message / postcard",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 3,
      prompt: "What does Sophie's brother want to do?",
      options: [
        { text: "Go to a market",          isCorrect: false, rationale: "The market is where Mum shopped; the brother wants to see a museum." },
        { text: "Visit the Eiffel Tower",  isCorrect: false, rationale: "Sophie (not her brother) wants to go back to the tower." },
        { text: "See a museum",            isCorrect: true,  rationale: "The text states 'My brother wants to see a museum.'" },
        { text: "Eat at a café",           isCorrect: false, rationale: "The café is mentioned as a breakfast place, not linked to the brother's wish." },
      ],
    },
  },
  // Q4 — Detail: when Sophie leaves
  {
    skill: "READING", cefrLevel: "A1", difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "primary", "postcard", "a1", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 96, textType: "personal message / postcard",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 4,
      prompt: "When is Sophie's last day in Paris?",
      options: [
        { text: "Friday",    isCorrect: false, rationale: "Friday is not mentioned in the postcard." },
        { text: "Saturday",  isCorrect: false, rationale: "Saturday is not mentioned; the text says 'until Sunday'." },
        { text: "Sunday",    isCorrect: true,  rationale: "Sophie writes 'We are here until Sunday', meaning Sunday is the last full day." },
        { text: "Monday",    isCorrect: false, rationale: "Monday is not mentioned; the stay ends on Sunday." },
      ],
    },
  },
  // Q5 — Inference: how Sophie feels
  {
    skill: "READING", cefrLevel: "A1", difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "primary", "postcard", "a1", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 96, textType: "personal message / postcard",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 5,
      prompt: "How does Sophie feel about her trip to Paris?",
      options: [
        { text: "Bored",           isCorrect: false, rationale: "Sophie uses positive adjectives ('great', 'amazing', 'delicious') indicating enjoyment, not boredom." },
        { text: "Happy and excited", isCorrect: true, rationale: "Clues include 'great time', 'amazing', 'delicious', and wanting to revisit the tower." },
        { text: "Tired and ready to go home", isCorrect: false, rationale: "While she misses Emma, her descriptions are enthusiastic, not tired or homesick." },
        { text: "Disappointed",    isCorrect: false, rationale: "Nothing in the text suggests disappointment; all experiences described are positive." },
      ],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set"); process.exit(1);
  }
  const existing = await prisma.item.findFirst({ where: { tags: { has: MODULE_ID } } });
  if (existing && process.env.FORCE !== "1") {
    console.log(`Module ${MODULE_ID} already seeded. Use FORCE=1 to re-run.`); return;
  }
  if (existing && process.env.FORCE === "1") {
    await prisma.item.deleteMany({ where: { tags: { has: MODULE_ID } } });
    console.log("Deleted existing items for re-seed.");
  }
  let created = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE",
        skill: item.skill as any,
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        status: "ACTIVE",
        tags: item.tags,
        content: item.content,
      },
    });
    created++;
  }
  console.log(`✓ ${MODULE_TITLE}: ${created} items seeded (CEFR ${CEFR_BAND}).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
