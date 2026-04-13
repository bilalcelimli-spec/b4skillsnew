/**
 * LISTENING PHASE 1 — PRIMARY
 * Module: "Morning at School"
 * CEFR: Pre-A1 / A1 | Ages 7–10 | ~52 seconds
 * 5 questions covering detail, gist, instruction
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'primary-morning-school';
const PRODUCT_LINE = 'PRIMARY';
const MODULE_TITLE = 'Morning at School';
const CEFR_BAND = 'A1';
const ESTIMATED_DURATION_SECONDS = 52;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  speakingRate: 0.82,
  pitch: 1.0,
  audioEncoding: 'MP3',
  notes: 'Use a warm, clear female voice for the teacher. Keep pace very slow. A second voice profile (en-US-Neural2-A, speakingRate 0.85) can be used for Tom for production with two-voice TTS.',
};

const HUMAN_SCRIPT = `[Ms. Green — teacher, female adult | Tom — student, male child, age 8]

Ms. Green: Good morning, Tom! Come in. Are you ready for Monday?
Tom: Good morning, Ms. Green! Yes, I am. Is today maths?
Ms. Green: Yes! Maths is first, then reading. Did you bring your pencil case?
Tom: Oh no. I forgot it at home!
Ms. Green: That is okay. You can borrow a pencil from the box on my desk.
Tom: Thank you, Ms. Green! I love maths.
Ms. Green: I know you do. Now sit down quickly — we are starting in two minutes!`;

const TTS_SCRIPT = `Good morning, Tom. Come in. Are you ready for Monday?
Good morning! Yes, I am. Is today maths?
Yes. Maths is first, then reading. Did you bring your pencil case?
Oh no. I forgot it at home!
That is okay. You can borrow a pencil from the box on my desk.
Thank you! I love maths.
I know you do. Now sit down quickly. We are starting in two minutes.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Remove all speaker labels before synthesis.
- Split into separate audio chunks if using two-voice TTS.
- Avoid contractions: use "I am" not "I'm", "it is" not "it's" for clearer synthesis.
- Pause 1.5s between speaker turns.
- "Ms. Green" — synthesise as "Miz Green".
- "pencil case" — stress both syllables evenly: PEN-sil CASE.
- Replay policy: allow two listens for Primary.
- Background sound: none required — script is self-contained.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A1 — only present simple, known vocabulary, concrete nouns.
✓ Child-safe content — school setting, no sensitive themes.
✓ TTS-suitable — no idioms, minimal contractions, clear syntax.
✓ All questions answerable from audio alone.
✓ Distractor fairness — all options are plausible school subjects/objects.
✓ Duration estimate: ~52 seconds at slow rate.
HUMAN REVIEW: Check "Oh no" phrasing sounds natural in TTS; may need emphasis tag.
`;

const items = [
  // Q1 — Detail: first subject
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'school', 'a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ms. Green (teacher, female adult)', 'Tom (student, male child)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What subject is first today?',
      options: [
        { text: 'Reading',  isCorrect: false, rationale: 'Reading is mentioned second, after maths.' },
        { text: 'Maths',    isCorrect: true,  rationale: 'Ms. Green says "Maths is first, then reading."' },
        { text: 'Art',      isCorrect: false, rationale: 'Art is not mentioned in the recording.' },
        { text: 'Science',  isCorrect: false, rationale: 'Science is not mentioned in the recording.' },
      ],
    },
  },
  // Q2 — Detail: what Tom forgot
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'school', 'a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ms. Green (teacher, female adult)', 'Tom (student, male child)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What did Tom forget?',
      options: [
        { text: 'His school bag',    isCorrect: false, rationale: 'His bag is not mentioned; he forgot his pencil case.' },
        { text: 'His homework',      isCorrect: false, rationale: 'Homework is not mentioned in the recording.' },
        { text: 'His pencil case',   isCorrect: true,  rationale: 'Tom says "I forgot it at home" after Ms. Green asks about his pencil case.' },
        { text: 'His reading book',  isCorrect: false, rationale: 'No book is mentioned as forgotten.' },
      ],
    },
  },
  // Q3 — Detail: where to borrow a pencil
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'school', 'a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ms. Green (teacher, female adult)', 'Tom (student, male child)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'Where can Tom get a pencil?',
      options: [
        { text: 'From another student',       isCorrect: false, rationale: 'Ms. Green does not suggest asking a classmate.' },
        { text: 'From the box on her desk',   isCorrect: true,  rationale: 'Ms. Green says "You can borrow a pencil from the box on my desk."' },
        { text: 'From the school office',     isCorrect: false, rationale: 'The school office is not mentioned.' },
        { text: 'From her pencil case',       isCorrect: false, rationale: 'Ms. Green mentions a box on her desk, not her pencil case.' },
      ],
    },
  },
  // Q4 — Inference: how Tom feels about maths
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'primary', 'school', 'a1', 'inference', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ms. Green (teacher, female adult)', 'Tom (student, male child)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'How does Tom feel about maths?',
      options: [
        { text: 'He is scared of it',    isCorrect: false, rationale: 'Tom expresses no fear; he says he loves maths.' },
        { text: 'He loves it',           isCorrect: true,  rationale: 'Tom explicitly says "I love maths."' },
        { text: 'He finds it boring',    isCorrect: false, rationale: 'Tom shows no sign of boredom — the opposite is true.' },
        { text: 'He does not know',      isCorrect: false, rationale: 'Tom gives a clear, positive opinion.' },
      ],
    },
  },
  // Q5 — Instruction: what Ms. Green tells Tom to do at the end
  {
    skill: 'LISTENING', cefrLevel: 'A1', difficulty: -0.7, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'school', 'a1', 'instructions', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ms. Green (teacher, female adult)', 'Tom (student, male child)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'instructions', questionNumber: 5,
      prompt: 'What does Ms. Green tell Tom to do at the end?',
      options: [
        { text: 'Get a pencil case',       isCorrect: false, rationale: 'She already offered a solution for the pencil case earlier.' },
        { text: 'Sit down quickly',        isCorrect: true,  rationale: 'Ms. Green says "Now sit down quickly — we are starting in two minutes."' },
        { text: 'Open his reading book',   isCorrect: false, rationale: 'No instruction to open a book is given.' },
        { text: 'Wait outside',            isCorrect: false, rationale: 'She invites him in, not out.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 1 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 1 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
