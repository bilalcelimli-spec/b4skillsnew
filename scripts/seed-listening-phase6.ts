/**
 * LISTENING PHASE 6 — JUNIOR SUITE
 * Module: "School Fair Announcement"
 * CEFR: A2 | Ages 11–14 | ~72 seconds
 * 6 questions — announcement, practical information, detail
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'junior-school-fair-announcement';
const PRODUCT_LINE = 'JUNIOR_SUITE';
const MODULE_TITLE = 'School Fair Announcement';
const CEFR_BAND = 'A2';
const ESTIMATED_DURATION_SECONDS = 72;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-B',
  speakingRate: 0.88,
  pitch: 0.5,
  audioEncoding: 'MP3',
  notes: 'Single teenage presenter voice, clear, slightly formal for announcement context. British English preferred for school register. Dates must be spoken clearly: "the fifteenth of October." Currency: "two pounds fifty" and "four pounds." Pause 1.0s between each announcement segment.',
};

const HUMAN_SCRIPT = `[Student presenter — school PA or radio announcement, teenage voice]

Attention, everyone! This is an announcement from the Student Council.
Our annual school fair is taking place next Saturday, the fifteenth of October, from ten in the morning until four in the afternoon.
This year, the fair will be held on the school sports field — not in the main hall as before.
There will be food stalls, a talent show, and a second-hand book sale.
Tickets are two pounds fifty for students and four pounds for adults.
Money raised will go to the school library fund.
If you would like to help on the day, please sign up with your form tutor by Wednesday.
Volunteers will receive a free lunch voucher.
Do not miss this great event!`;

const TTS_SCRIPT = `Attention, everyone. This is an announcement from the Student Council.
Our annual school fair is taking place next Saturday, the fifteenth of October, from ten in the morning until four in the afternoon.
This year, the fair will be held on the school sports field. Not in the main hall as before.
There will be food stalls, a talent show, and a second-hand book sale.
Tickets are two pounds fifty for students and four pounds for adults.
Money raised will go to the school library fund.
If you would like to help on the day, please sign up with your form tutor by Wednesday.
Volunteers will receive a free lunch voucher.
Do not miss this great event.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Single speaker — student presenter voice.
- "the fifteenth of October" — stress FIFT-eenth; ensure ordinal is spoken, not "15."
- "two pounds fifty" and "four pounds" — British currency; verify TTS does not say "four point zero."
- "second-hand book sale" — hyphenated compound, five stresses: SEC-ond HAND BOOK SALE; flatten to even stress in TTS.
- "form tutor" — specific British school term; TTS safe.
- Pause 1.0s after each major fact (date, venue, ticket prices, deadline).
- Replay: one listen at this level; two if included in a practice context.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A2 — concrete details, dates, prices, locations all explicitly stated.
✓ Junior-appropriate — school event, no adult content.
✓ All 6 questions map to specific details in the announcement.
✓ Distractors draw on plausible alternatives from context ("main hall" vs "sports field").
✓ Duration ~72s — within Junior 60–90s guideline.
HUMAN REVIEW: Check date synthesis. Confirm "school library fund" sounds natural in TTS.
`;

const items = [
  // Q1 — Detail: date
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'announcement', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Student presenter (teenage voice, school announcement)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'On what date is the school fair?',
      options: [
        { text: 'The 5th of October',   isCorrect: false, rationale: 'The 5th is not the date mentioned.' },
        { text: 'The 12th of October',  isCorrect: false, rationale: 'The 12th is not the date mentioned.' },
        { text: 'The 15th of October',  isCorrect: true,  rationale: 'The presenter says "the fifteenth of October."' },
        { text: 'The 20th of October',  isCorrect: false, rationale: 'The 20th is not mentioned.' },
      ],
    },
  },
  // Q2 — Detail: venue change
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'announcement', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Student presenter (teenage voice, school announcement)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'Where will the fair be held this year?',
      options: [
        { text: 'The school main hall',     isCorrect: false, rationale: 'The main hall is explicitly mentioned as the previous venue, NOT this year\'s.' },
        { text: 'The school sports field',  isCorrect: true,  rationale: 'The presenter says it will be on the school sports field.' },
        { text: 'The school car park',      isCorrect: false, rationale: 'The car park is not mentioned.' },
        { text: 'The local town square',    isCorrect: false, rationale: 'An offsite venue is not mentioned.' },
      ],
    },
  },
  // Q3 — Detail: student ticket price
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'announcement', 'a2', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Student presenter (teenage voice, school announcement)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'How much is a student ticket?',
      options: [
        { text: '£1.50', isCorrect: false, rationale: 'One pound fifty is not the student ticket price.' },
        { text: '£2.50', isCorrect: true,  rationale: 'The presenter says "Tickets are two pounds fifty for students."' },
        { text: '£3.00', isCorrect: false, rationale: 'Three pounds is not stated.' },
        { text: '£4.00', isCorrect: false, rationale: 'Four pounds is the adult ticket price.' },
      ],
    },
  },
  // Q4 — Detail: purpose of the money
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'announcement', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Student presenter (teenage voice, school announcement)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'Where will the money raised go?',
      options: [
        { text: 'The school sports equipment fund',  isCorrect: false, rationale: 'Sports equipment is not the stated destination of funds.' },
        { text: 'The school library fund',           isCorrect: true,  rationale: 'The presenter says "Money raised will go to the school library fund."' },
        { text: 'A local children\'s charity',       isCorrect: false, rationale: 'A charity is not mentioned.' },
        { text: 'The Student Council budget',        isCorrect: false, rationale: 'The Student Council makes the announcement but is not the fund destination.' },
      ],
    },
  },
  // Q5 — Detail: volunteer sign-up deadline
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'announcement', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Student presenter (teenage voice, school announcement)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'By when must volunteers sign up?',
      options: [
        { text: 'Monday',    isCorrect: false, rationale: 'Monday is not the deadline given.' },
        { text: 'Tuesday',   isCorrect: false, rationale: 'Tuesday is not the deadline given.' },
        { text: 'Wednesday', isCorrect: true,  rationale: 'The presenter says "sign up with your form tutor by Wednesday."' },
        { text: 'Thursday',  isCorrect: false, rationale: 'Thursday is not the deadline given.' },
      ],
    },
  },
  // Q6 — Detail: volunteer reward
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'announcement', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Student presenter (teenage voice, school announcement)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'What do volunteers receive?',
      options: [
        { text: 'A free fair ticket',      isCorrect: false, rationale: 'A free ticket is not the reward stated.' },
        { text: 'A free lunch voucher',    isCorrect: true,  rationale: 'The presenter says "Volunteers will receive a free lunch voucher."' },
        { text: 'A gift from the library', isCorrect: false, rationale: 'A library gift is not mentioned.' },
        { text: 'Extra credit at school',  isCorrect: false, rationale: 'Extra credit is not mentioned.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 6 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 6 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
