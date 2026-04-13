/**
 * LISTENING PHASE 8 — JUNIOR SUITE
 * Module: "Weekend Plans — The Climbing Wall"
 * CEFR: B1 | Ages 11–14 | ~83 seconds
 * 6 questions — peer conversation, plans, inference
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'junior-climbing-wall-weekend';
const PRODUCT_LINE = 'JUNIOR_SUITE';
const MODULE_TITLE = 'Weekend Plans — The Climbing Wall';
const CEFR_BAND = 'B1';
const ESTIMATED_DURATION_SECONDS = 83;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  speakingRate: 0.91,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two teenage voices. Alex (age 11, male): en-US-Neural2-D, pitch 0.5. Priya (age 12, female): en-US-Neural2-F, pitch 1.0. Natural conversational pace. "harnesses" — HAR-ness-iz. "under-fourteens" — stress on FOUR-teens. Pause 0.8s between turns.',
};

const HUMAN_SCRIPT = `[Alex — male, age 11 | Priya — female, age 12]

Alex: Priya, what are you doing this weekend? Do you want to come to the climbing wall with me on Saturday?
Priya: Hmm, I have never been climbing before. Is it difficult?
Alex: They have walls for all levels. You start with the easiest ones and work up. I went last month and it was really fun. They give you harnesses and show you what to do.
Priya: OK, but what if I fall?
Alex: You are tied to a rope the whole time. You cannot actually fall — well, you can fall a little, but the rope catches you. It is totally safe.
Priya: Alright, I am kind of curious now. What time does it open?
Alex: It opens at nine, but I was thinking around eleven. That way we can have breakfast first.
Priya: That works. How much does it cost?
Alex: Eight pounds for under-fourteens. It includes all the equipment.
Priya: That is not too bad. Should I bring anything?
Alex: Just comfortable clothes and sports shoes. They have everything else there.
Priya: Great. I will ask my mum tonight and message you.`;

const TTS_SCRIPT = `Priya, what are you doing this weekend? Do you want to come to the climbing wall with me on Saturday?
Hmm. I have never been climbing before. Is it difficult?
They have walls for all levels. You start with the easiest ones and work up. I went last month and it was really fun. They give you harnesses and show you what to do.
OK, but what if I fall?
You are tied to a rope the whole time. You cannot actually fall. Well, you can fall a little, but the rope catches you. It is totally safe.
Alright, I am kind of curious now. What time does it open?
It opens at nine, but I was thinking around eleven. That way we can have breakfast first.
That works. How much does it cost?
Eight pounds for under-fourteens. It includes all the equipment.
That is not too bad. Should I bring anything?
Just comfortable clothes and sports shoes. They have everything else there.
Great. I will ask my mum tonight and message you.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Two teen voices — Alex (slightly younger, male) and Priya (female, slightly older).
- "harnesses" — clear two-syllable word: HAR-ness-iz (three syllables total). Verify TTS.
- "under-fourteens" — hyphenated compound; TTS should stress FOUR-teens.
- "eight pounds" — British currency; verify number synthesis.
- Keep conversational rhythm — short question/answer exchanges; don't over-pause.
- Pause 0.8–1.0s between turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B1 — negotiating plans, expressing and responding to concerns, specific factual detail.
✓ Junior-appropriate — safe activity, peer conversation, no adult content.
✓ Safety concern + reassurance arc makes this authentic B1 task.
✓ Q1–Q3 are lower difficulty (explicit detail). Q4–Q6 require number precision and summary.
✓ IRT range -0.1 to 0.4 — appropriate for B1 Junior.
HUMAN REVIEW: Confirm £8 for under-fourteens is clear in audio. Check harnesses pronunciation.
`;

const items = [
  // Q1 — Detail: where Alex wants to go
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'conversation', 'b1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Alex (male, age 11)', 'Priya (female, age 12)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'Where does Alex invite Priya to go on Saturday?',
      options: [
        { text: 'The swimming pool',  isCorrect: false, rationale: 'The swimming pool is not mentioned.' },
        { text: 'The skate park',     isCorrect: false, rationale: 'The skate park is not mentioned.' },
        { text: 'The climbing wall',  isCorrect: true,  rationale: 'Alex says "Do you want to come to the climbing wall with me on Saturday?"' },
        { text: 'The sports centre',  isCorrect: false, rationale: 'A general sports centre is not the specific destination.' },
      ],
    },
  },
  // Q2 — Detail: Priya's first concern
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'conversation', 'b1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Alex (male, age 11)', 'Priya (female, age 12)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What is Priya\'s first concern about climbing?',
      options: [
        { text: 'She is afraid of heights',      isCorrect: false, rationale: 'She does not explicitly say she is afraid of heights — she asks if it is difficult.' },
        { text: 'She thinks it will be difficult', isCorrect: true, rationale: 'Priya says "I have never been climbing before. Is it difficult?"' },
        { text: 'It is too expensive',             isCorrect: false, rationale: 'The price concern comes later in the conversation.' },
        { text: 'She does not have the right shoes', isCorrect: false, rationale: 'Shoes are mentioned later; her first concern is difficulty.' },
      ],
    },
  },
  // Q3 — Detail: safety — what keeps climbers safe
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'conversation', 'b1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Alex (male, age 11)', 'Priya (female, age 12)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What safety equipment does Alex mention?',
      options: [
        { text: 'Helmets and knee pads',   isCorrect: false, rationale: 'Helmets and knee pads are not mentioned.' },
        { text: 'Harnesses and a rope',    isCorrect: true,  rationale: 'Alex mentions harnesses and says "you are tied to a rope the whole time."' },
        { text: 'A net below the wall',    isCorrect: false, rationale: 'A safety net is not mentioned.' },
        { text: 'Crash mats on the floor', isCorrect: false, rationale: 'Crash mats are not mentioned.' },
      ],
    },
  },
  // Q4 — Detail: suggested time
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'conversation', 'b1', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Alex (male, age 11)', 'Priya (female, age 12)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What time does Alex suggest they arrive at the climbing wall?',
      options: [
        { text: '9am — when it opens',   isCorrect: false, rationale: 'Alex mentions the 9am opening time but says he was thinking of going at eleven instead.' },
        { text: '10am',  isCorrect: false, rationale: '10am is not the suggested time.' },
        { text: '11am',  isCorrect: true,  rationale: 'Alex says "I was thinking around eleven. That way we can have breakfast first."' },
        { text: 'Midday', isCorrect: false, rationale: 'Midday is not the suggested time.' },
      ],
    },
  },
  // Q5 — Detail: price for under-fourteens
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'junior', 'conversation', 'b1', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Alex (male, age 11)', 'Priya (female, age 12)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'How much does it cost for under-fourteens?',
      options: [
        { text: '£5',  isCorrect: false, rationale: 'Five pounds is not the price stated.' },
        { text: '£8',  isCorrect: true,  rationale: 'Alex says "Eight pounds for under-fourteens."' },
        { text: '£10', isCorrect: false, rationale: 'Ten pounds is not the price stated.' },
        { text: '£12', isCorrect: false, rationale: 'Twelve pounds is not the price stated.' },
      ],
    },
  },
  // Q6 — Detail: what to bring
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'junior', 'conversation', 'b1', 'detail', 'instructions', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Alex (male, age 11)', 'Priya (female, age 12)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'What does Alex tell Priya to bring?',
      options: [
        { text: 'A packed lunch and a water bottle',    isCorrect: false, rationale: 'Food and drink are not mentioned.' },
        { text: 'Comfortable clothes and sports shoes', isCorrect: true,  rationale: 'Alex says "Just comfortable clothes and sports shoes."' },
        { text: 'Her own harness and gloves',           isCorrect: false, rationale: 'She does not need her own harness — equipment is provided.' },
        { text: 'A towel and a change of clothes',      isCorrect: false, rationale: 'A towel is not mentioned.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 8 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 8 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
