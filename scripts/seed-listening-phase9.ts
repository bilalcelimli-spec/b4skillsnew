/**
 * LISTENING PHASE 9 — 15-MINUTE DIAGNOSTIC
 * Module: "At the Tourist Information Office"
 * CEFR: A2 | Diagnostic, transactional | ~64 seconds
 * 5 questions — factual recall, practical language, service encounters
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'diagnostic-tourist-info-office';
const PRODUCT_LINE = 'DIAGNOSTIC';
const MODULE_TITLE = 'At the Tourist Information Office';
const CEFR_BAND = 'A2';
const ESTIMATED_DURATION_SECONDS = 64;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-B',
  speakingRate: 0.92,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two adult voices. Dan (officer, male): en-GB-Neural2-B. Ms. Kowalski (tourist, female): en-GB-Neural2-C. "Kowalski" — koh-WALL-ski; TTS may mispronounce; verify or respell as "ko-WALL-ski." "Westham" — WEST-um (not WEST-ham). "Grand Marina" — clear, even stress. Pause 1.0s between turns. Natural service-encounter register.',
};

const HUMAN_SCRIPT = `[Dan — tourist information officer, male adult | Ms. Kowalski — tourist, female adult]

Dan: Good afternoon. Welcome to the Westham Tourist Information Centre. How can I help?
Ms. Kowalski: Hello. I am visiting for three days and I am not sure what to see. Do you have any recommendations?
Dan: Absolutely. The castle and the old harbour are both worth a visit. The castle is open Tuesday to Sunday, nine to five. It costs six pounds for adults.
Ms. Kowalski: And what about the harbour?
Dan: The harbour is free. There are several excellent seafood restaurants there, too. I would suggest going in the evening when the lights are on — it is very beautiful.
Ms. Kowalski: That sounds lovely. Is there a bus that goes to both places?
Dan: Yes. The number seven bus stops right outside the castle and then continues to the harbour. It runs every fifteen minutes.
Ms. Kowalski: Perfect. One more thing — can you recommend a good hotel near the centre?
Dan: The Grand Marina Hotel is very popular. It is about a ten-minute walk from here. Shall I write the address down for you?
Ms. Kowalski: Yes, please. Thank you so much.`;

const TTS_SCRIPT = `Good afternoon. Welcome to the Westham Tourist Information Centre. How can I help?
Hello. I am visiting for three days and I am not sure what to see. Do you have any recommendations?
Absolutely. The castle and the old harbour are both worth a visit. The castle is open Tuesday to Sunday, nine to five. It costs six pounds for adults.
And what about the harbour?
The harbour is free. There are several excellent seafood restaurants there too. I would suggest going in the evening when the lights are on. It is very beautiful.
That sounds lovely. Is there a bus that goes to both places?
Yes. The number seven bus stops right outside the castle and then continues to the harbour. It runs every fifteen minutes.
Perfect. One more thing. Can you recommend a good hotel near the centre?
The Grand Marina Hotel is very popular. It is about a ten-minute walk from here. Shall I write the address down for you?
Yes please. Thank you so much.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "Kowalski" — foreign surname; TTS may default to incorrect stress. Try: "ko-WALL-ski" or use a respelling if synthesis is wrong. Flag for human review.
- "Westham" — WEST-um (like Chatham, Streatham). NOT "WEST-ham" like the football club. Flag for pronunciation review.
- "the number seven bus" — natural British English.
- "six pounds" — clear currency; verify.
- "fifteen minutes" — FIFF-teen, not FIF-teen with elision.
- "Grand Marina Hotel" — natural stress on Grand and Ma-.
- Pause 1.0s between each exchange turn.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A2 — explicit factual information exchange, transactional register, practical vocabulary.
✓ Diagnostic appropriate — 5 items, concrete detail, suitable for A2–B1 boundary discrimination.
✓ All 5 questions rely on explicitly stated information (no inference required).
✓ Distractors use plausible but incorrect numbers and days.
✓ IRT range -0.3 to 0.3 appropriate for A2 diagnostic.
HUMAN REVIEW: Confirm "Westham" and "Kowalski" pronunciation in final audio.
`;

const items = [
  // Q1 — Detail: castle open days
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', 'service-encounter', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Dan (tourist information officer, male adult)', 'Ms. Kowalski (tourist, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'On which days is the castle open?',
      options: [
        { text: 'Every day of the week',      isCorrect: false, rationale: 'The castle is not open every day.' },
        { text: 'Monday to Saturday',          isCorrect: false, rationale: 'Monday is not included in the opening days.' },
        { text: 'Weekends only',               isCorrect: false, rationale: 'The castle is open more than just weekends.' },
        { text: 'Tuesday to Sunday',           isCorrect: true,  rationale: 'Dan says "The castle is open Tuesday to Sunday."' },
      ],
    },
  },
  // Q2 — Detail: castle entry price
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Dan (tourist information officer, male adult)', 'Ms. Kowalski (tourist, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'How much does it cost for adults to enter the castle?',
      options: [
        { text: 'It is free',   isCorrect: false, rationale: 'The harbour is free, not the castle.' },
        { text: '£4',           isCorrect: false, rationale: 'Four pounds is not the price stated.' },
        { text: '£6',           isCorrect: true,  rationale: 'Dan says "It costs six pounds for adults."' },
        { text: '£8',           isCorrect: false, rationale: 'Eight pounds is not the price stated.' },
      ],
    },
  },
  // Q3 — Detail: best time to visit the harbour
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Dan (tourist information officer, male adult)', 'Ms. Kowalski (tourist, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'When does Dan suggest visiting the harbour?',
      options: [
        { text: 'In the morning, before the crowds',  isCorrect: false, rationale: 'Morning is not the suggestion given.' },
        { text: 'At midday',                          isCorrect: false, rationale: 'Midday is not the suggestion given.' },
        { text: 'Early afternoon',                    isCorrect: false, rationale: 'Early afternoon is not the suggestion given.' },
        { text: 'In the evening',                     isCorrect: true,  rationale: 'Dan says "I would suggest going in the evening when the lights are on."' },
      ],
    },
  },
  // Q4 — Detail: bus frequency
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Dan (tourist information officer, male adult)', 'Ms. Kowalski (tourist, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'How often does the number 7 bus run?',
      options: [
        { text: 'Every 10 minutes', isCorrect: false, rationale: 'Ten minutes is not the frequency stated.' },
        { text: 'Every 15 minutes', isCorrect: true,  rationale: 'Dan says "It runs every fifteen minutes."' },
        { text: 'Every 30 minutes', isCorrect: false, rationale: 'Thirty minutes is not the frequency stated.' },
        { text: 'Every hour',       isCorrect: false, rationale: 'Hourly is not the frequency stated.' },
      ],
    },
  },
  // Q5 — Detail: hotel distance
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.3, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Dan (tourist information officer, male adult)', 'Ms. Kowalski (tourist, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'How far is the Grand Marina Hotel from the tourist information centre?',
      options: [
        { text: '5 minutes\' walk',  isCorrect: false, rationale: 'Five minutes is not the distance given.' },
        { text: '10 minutes\' walk', isCorrect: true,  rationale: 'Dan says "it is about a ten-minute walk from here."' },
        { text: '20 minutes\' walk', isCorrect: false, rationale: 'Twenty minutes is not the distance given.' },
        { text: 'You must take a bus', isCorrect: false, rationale: 'The hotel is walkable — no bus is mentioned for the hotel.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 9 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 9 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
