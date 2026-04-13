/**
 * LISTENING PHASE 2 — PRIMARY
 * Module: "My Pet and My Family"
 * CEFR: A1 | Ages 7–10 | ~55 seconds
 * 5 questions — monologue narrative, gist and detail
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'primary-pet-family';
const PRODUCT_LINE = 'PRIMARY';
const MODULE_TITLE = 'My Pet and My Family';
const CEFR_BAND = 'A1';
const ESTIMATED_DURATION_SECONDS = 55;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-G',
  speakingRate: 0.83,
  pitch: 2.0,
  audioEncoding: 'MP3',
  notes: 'Use a slightly higher-pitched, child-friendly voice. High pitch simulates a young narrator. Keep pace slow and clear. No background effects needed.',
};

const HUMAN_SCRIPT = `[Lucy — child narrator, female, age 8]

My name is Lucy. I am eight years old. I live with my mum, my dad, and my little brother Max.
We also have a dog called Biscuit. Biscuit is brown and white. He likes to run in the garden.
Every morning, I give Biscuit his food. Then I drink my orange juice and eat my toast.
My brother Max does not like mornings. He is always sleepy!
On Saturdays, we all go to the park. Biscuit runs very fast. He is the fastest dog at the park!`;

const TTS_SCRIPT = `My name is Lucy. I am eight years old. I live with my mum, my dad, and my little brother Max.
We also have a dog called Biscuit. Biscuit is brown and white. He likes to run in the garden.
Every morning, I give Biscuit his food. Then I drink my orange juice and eat my toast.
My brother Max does not like mornings. He is always sleepy.
On Saturdays, we all go to the park. Biscuit runs very fast. He is the fastest dog at the park.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Single speaker — one TTS voice throughout.
- No speaker labels to remove.
- Pause 0.8s between sentences, 1.2s between paragraphs.
- "Biscuit" — common English word; no pronunciation issue.
- "mum" — British English; ensure TTS uses [mʌm], not [mɑːm]. Consider switching to "mom" for US audience.
- Keep all sentences complete before synthesis split.
- Do not split "Every morning, I give Biscuit his food" — keep as one clause.
- Replay policy: allow two listens for Primary.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A1 — simple present, family vocabulary, pets, daily routine.
✓ Child-safe, emotionally warm, concrete narrative.
✓ No abstract vocabulary or complex syntax.
✓ All 5 questions answerable from the audio.
✓ Duration ~55 seconds at 0.83 rate — within Primary 35–60s guideline.
HUMAN REVIEW: Confirm "fastest dog at the park" sounds natural in TTS (superlative + definite article combination).
`;

const items = [
  // Q1 — Detail: narrator's name
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -1.2, discrimination: 0.9, guessing: 0.25,
    tags: ['listening', 'primary', 'family', 'a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Lucy (child narrator, female, age 8)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What is the narrator\'s name?',
      options: [
        { text: 'Max',    isCorrect: false, rationale: 'Max is her little brother.' },
        { text: 'Lucy',   isCorrect: true,  rationale: 'She says "My name is Lucy" at the start.' },
        { text: 'Emma',   isCorrect: false, rationale: 'Emma is not mentioned in the recording.' },
        { text: 'Biscuit',isCorrect: false, rationale: 'Biscuit is the family dog, not the narrator.' },
      ],
    },
  },
  // Q2 — Detail: dog's colour
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'animals', 'a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Lucy (child narrator, female, age 8)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What colour is Biscuit?',
      options: [
        { text: 'Black and brown',  isCorrect: false, rationale: 'Black is not mentioned; Biscuit is brown and white.' },
        { text: 'Brown and white',  isCorrect: true,  rationale: 'Lucy says "Biscuit is brown and white."' },
        { text: 'White and grey',   isCorrect: false, rationale: 'Grey is not mentioned.' },
        { text: 'All black',        isCorrect: false, rationale: 'All black is not stated.' },
      ],
    },
  },
  // Q3 — Detail: Lucy's morning routine for Biscuit
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'routine', 'a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Lucy (child narrator, female, age 8)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What does Lucy do every morning for Biscuit?',
      options: [
        { text: 'She takes him for a walk',  isCorrect: false, rationale: 'Walking is mentioned on Saturdays, not as a daily morning routine.' },
        { text: 'She gives him his food',    isCorrect: true,  rationale: 'Lucy says "Every morning, I give Biscuit his food."' },
        { text: 'She brushes him',           isCorrect: false, rationale: 'Brushing is not mentioned in the recording.' },
        { text: 'She plays with him',        isCorrect: false, rationale: 'Playing in the garden is mentioned but not as a morning feeding task.' },
      ],
    },
  },
  // Q4 — Inference: how Max feels in the mornings
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -0.6, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'family', 'a1', 'inference', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Lucy (child narrator, female, age 8)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'How does Max feel in the mornings?',
      options: [
        { text: 'Happy and excited', isCorrect: false, rationale: 'Max is described as the opposite — sleepy, not happy.' },
        { text: 'Sleepy',             isCorrect: true,  rationale: 'Lucy says "My brother Max does not like mornings. He is always sleepy!"' },
        { text: 'Angry',              isCorrect: false, rationale: 'Anger is not mentioned; sleepiness is.' },
        { text: 'Hungry',             isCorrect: false, rationale: 'Hunger is not mentioned for Max.' },
      ],
    },
  },
  // Q5 — Detail: where the family goes on Saturdays
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'family', 'a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Lucy (child narrator, female, age 8)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'Where does the family go on Saturdays?',
      options: [
        { text: 'To the garden', isCorrect: false, rationale: 'Biscuit runs in the garden daily; the family goes to the park on Saturdays.' },
        { text: 'To the park',   isCorrect: true,  rationale: 'Lucy says "On Saturdays, we all go to the park."' },
        { text: 'To the shops',  isCorrect: false, rationale: 'Shopping is not mentioned.' },
        { text: 'To school',     isCorrect: false, rationale: 'Saturday is a day off school.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 2 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 2 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
