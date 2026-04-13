/**
 * LISTENING PHASE 3 — PRIMARY
 * Module: "Shopping for Fruit"
 * CEFR: Pre-A1 / A1 | Ages 7–10 | ~45 seconds
 * 5 questions — transactional dialogue, numbers, quantities
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'primary-shopping-fruit';
const PRODUCT_LINE = 'PRIMARY';
const MODULE_TITLE = 'Shopping for Fruit';
const CEFR_BAND = 'PRE_A1';
const ESTIMATED_DURATION_SECONDS = 45;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-A',
  speakingRate: 0.80,
  pitch: 0.5,
  audioEncoding: 'MP3',
  notes: 'British English preferred for "one pound fifty / fifty pence" authenticity. Two-voice production recommended: adult female for Mrs Omar, young male voice for Ben. Pause clearly between each exchange. Numbers must be spoken correctly: one pound fifty, fifty pence.',
};

const HUMAN_SCRIPT = `[Mrs Omar — shop assistant, adult female | Ben — child customer, male, age 7]

Mrs Omar: Hello! What do you want today?
Ben: Hello. Can I have some apples, please?
Mrs Omar: Yes! How many apples?
Ben: Four apples, please. And some bananas.
Mrs Omar: How many bananas?
Ben: Three bananas. Thank you!
Mrs Omar: Anything else?
Ben: No, thank you. How much is it?
Mrs Omar: It is one pound fifty.
Ben: Here is two pounds.
Mrs Omar: And here is your change. Fifty pence. Goodbye!
Ben: Goodbye!`;

const TTS_SCRIPT = `Hello. What do you want today?
Hello. Can I have some apples, please?
Yes. How many apples?
Four apples, please. And some bananas.
How many bananas?
Three bananas. Thank you.
Anything else?
No, thank you. How much is it?
It is one pound fifty.
Here is two pounds.
And here is your change. Fifty pence. Goodbye.
Goodbye.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Use British English voices for currency accuracy.
- "one pound fifty" — synthesise as a cash amount; verify TTS does not say "one point fifty."
- "fifty pence" — two words, clear pause between them.
- "Mrs Omar" — TTS safe, two syllables: OH-mar.
- Pause 1.2s between speaker turns.
- Ensure Ben's lines sound young/lighter; adjust pitch if single-voice production.
- No background sound effects needed.
- Replay: allow two listens.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ Pre-A1/A1 — numbers, fruit names, simple transactional exchange.
✓ Child-safe — market context, money, polite phrases.
✓ TTS-compatible — short turns, no ambiguous phrases.
✓ All questions answerable directly from audio.
✓ Duration ~45s — within Primary guideline.
HUMAN REVIEW: Confirm number synthesis is correct ("four apples", "three bananas", "one pound fifty", "fifty pence").
`;

const items = [
  // Q1 — Detail: number of apples
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -1.3, discrimination: 0.9, guessing: 0.25,
    tags: ['listening', 'primary', 'shopping', 'numbers', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mrs Omar (shop assistant, adult female)', 'Ben (customer, male child, age 7)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'How many apples does Ben buy?',
      options: [
        { text: 'Two',   isCorrect: false, rationale: 'Two is not stated; Ben asks for four apples.' },
        { text: 'Three', isCorrect: false, rationale: 'Three is the number of bananas, not apples.' },
        { text: 'Four',  isCorrect: true,  rationale: 'Ben says "Four apples, please."' },
        { text: 'Five',  isCorrect: false, rationale: 'Five is not mentioned.' },
      ],
    },
  },
  // Q2 — Detail: what else Ben buys
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -1.2, discrimination: 0.9, guessing: 0.25,
    tags: ['listening', 'primary', 'shopping', 'fruit', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mrs Omar (shop assistant, adult female)', 'Ben (customer, male child, age 7)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What other fruit does Ben buy?',
      options: [
        { text: 'Oranges',  isCorrect: false, rationale: 'Oranges are not mentioned.' },
        { text: 'Grapes',   isCorrect: false, rationale: 'Grapes are not mentioned.' },
        { text: 'Bananas',  isCorrect: true,  rationale: 'Ben asks for "some bananas" after the apples.' },
        { text: 'Mangoes',  isCorrect: false, rationale: 'Mangoes are not mentioned.' },
      ],
    },
  },
  // Q3 — Detail: total price
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'shopping', 'money', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mrs Omar (shop assistant, adult female)', 'Ben (customer, male child, age 7)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'How much does the fruit cost?',
      options: [
        { text: 'One pound',         isCorrect: false, rationale: 'One pound is not the price stated.' },
        { text: 'One pound fifty',   isCorrect: true,  rationale: 'Mrs Omar says "It is one pound fifty."' },
        { text: 'Two pounds',        isCorrect: false, rationale: 'Two pounds is what Ben pays, not the price.' },
        { text: 'Fifty pence',       isCorrect: false, rationale: 'Fifty pence is the change, not the total price.' },
      ],
    },
  },
  // Q4 — Detail: how much change Ben receives
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'shopping', 'money', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mrs Omar (shop assistant, adult female)', 'Ben (customer, male child, age 7)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'How much change does Ben get?',
      options: [
        { text: 'Ten pence',     isCorrect: false, rationale: 'Ten pence is not mentioned.' },
        { text: 'Twenty pence',  isCorrect: false, rationale: 'Twenty pence is not mentioned.' },
        { text: 'Fifty pence',   isCorrect: true,  rationale: 'Mrs Omar says "here is your change. Fifty pence."' },
        { text: 'One pound',     isCorrect: false, rationale: 'One pound is not the change amount.' },
      ],
    },
  },
  // Q5 — Gist: who is the shop assistant
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -1.1, discrimination: 0.9, guessing: 0.25,
    tags: ['listening', 'primary', 'shopping', 'pre-a1', 'gist', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mrs Omar (shop assistant, adult female)', 'Ben (customer, male child, age 7)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'gist', questionNumber: 5,
      prompt: 'Who is selling the fruit?',
      options: [
        { text: 'Ben',       isCorrect: false, rationale: 'Ben is the customer buying the fruit.' },
        { text: 'Mrs Omar',  isCorrect: true,  rationale: 'Mrs Omar is the shop assistant who answers "Hello! What do you want today?"' },
        { text: 'Lucy',      isCorrect: false, rationale: 'Lucy is not in this recording.' },
        { text: 'Tom',       isCorrect: false, rationale: 'Tom is not in this recording.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 3 — ${MODULE_TITLE} (${items.length} items)…`);
  let inserted = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: 'MULTIPLE_CHOICE', skill: item.skill as any, cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty, discrimination: item.discrimination, guessing: item.guessing,
        tags: item.tags, status: 'ACTIVE', content: item.content,
      },
    });
    inserted++;
  }
  console.log(`✓ Listening Phase 3 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
