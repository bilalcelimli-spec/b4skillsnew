/**
 * LISTENING PHASE 4 — PRIMARY
 * Module: "Classroom Instructions"
 * CEFR: Pre-A1 | Ages 7–10 | ~42 seconds
 * 5 questions — instruction-following, sequential commands
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'primary-classroom-instructions';
const PRODUCT_LINE = 'PRIMARY';
const MODULE_TITLE = 'Classroom Instructions';
const CEFR_BAND = 'PRE_A1';
const ESTIMATED_DURATION_SECONDS = 42;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  speakingRate: 0.80,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Clear adult male teacher voice. Slow, measured delivery with natural pauses between instructions. Each imperative clause should have a 0.8s pause after it. This represents a single-speaker classroom instruction recording.',
};

const HUMAN_SCRIPT = `[Mr Hall — teacher, male adult]

Good morning, everyone! Listen carefully, please.
First, open your books to page twelve.
Now, look at the picture at the top of the page.
Good. Next, circle the correct word below the picture.
Do not write in the box — just circle the word.
When you finish, turn your book over and sit quietly.
If you need help, put your hand up.
OK, you may start now. Good luck!`;

const TTS_SCRIPT = `Good morning, everyone. Listen carefully, please.
First, open your books to page twelve.
Now, look at the picture at the top of the page.
Good. Next, circle the correct word below the picture.
Do not write in the box. Just circle the word.
When you finish, turn your book over and sit quietly.
If you need help, put your hand up.
You may start now. Good luck.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Single speaker — one clear adult male voice.
- Pause 0.8–1.0s after each instruction sentence.
- "page twelve" — synthesise as ordinal: TWELVE (not "1-2").
- "circle" — two syllables, SIR-kl; verify TTS does not stress unusually.
- "Do not write in the box — just circle the word" — the dash is a natural pause; split into two sentences for TTS: "Do not write in the box. Just circle the word."
- "turn your book over" — phrasal verb, verify even stress.
- No background sound effects.
- Replay: allow two listens.
- This module is suitable for test-taking instruction simulation.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ Pre-A1 — simple imperatives, ordinal numbers, classroom objects.
✓ Child-safe — standard classroom setting.
✓ All questions test instruction comprehension, not memory overload.
✓ Duration ~42s — within Pre-A1 Primary guideline.
✓ TTS-suitable — short imperative sentences, no contractions.
HUMAN REVIEW: Instruct reviewers to verify that question order mirrors instruction order in the script.
`;

const items = [
  // Q1 — Instruction: page number
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -1.3, discrimination: 0.9, guessing: 0.25,
    tags: ['listening', 'primary', 'instructions', 'classroom', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Hall (teacher, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What page do students open their books to?',
      options: [
        { text: 'Page 2',   isCorrect: false, rationale: 'Page 2 is not stated.' },
        { text: 'Page 10',  isCorrect: false, rationale: 'Page 10 is not stated.' },
        { text: 'Page 12',  isCorrect: true,  rationale: 'Mr Hall says "open your books to page twelve."' },
        { text: 'Page 20',  isCorrect: false, rationale: 'Page 20 is not stated.' },
      ],
    },
  },
  // Q2 — Instruction: what to look at
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'instructions', 'classroom', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Hall (teacher, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What should students look at on the page?',
      options: [
        { text: 'A list of words at the bottom',  isCorrect: false, rationale: 'The bottom section is not the focus; students look at the picture at the top.' },
        { text: 'A picture at the top',           isCorrect: true,  rationale: 'Mr Hall says "look at the picture at the top of the page."' },
        { text: 'A box in the middle',            isCorrect: false, rationale: 'The box is mentioned as something NOT to write in, not as the initial focus.' },
        { text: 'The page number',                isCorrect: false, rationale: 'The page number is only used to navigate, not to look at.' },
      ],
    },
  },
  // Q3 — Instruction: what to do with the word
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'instructions', 'classroom', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Hall (teacher, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What should students do with the correct word?',
      options: [
        { text: 'Underline it',   isCorrect: false, rationale: 'Underlining is not mentioned.' },
        { text: 'Write it',       isCorrect: false, rationale: 'Mr Hall says specifically "Do not write in the box."' },
        { text: 'Circle it',      isCorrect: true,  rationale: 'Mr Hall says "circle the correct word" and "just circle the word."' },
        { text: 'Cross it out',   isCorrect: false, rationale: 'Crossing out is not mentioned.' },
      ],
    },
  },
  // Q4 — Instruction: what to do when finished
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'instructions', 'classroom', 'pre-a1', 'sequence', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Hall (teacher, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'sequence', questionNumber: 4,
      prompt: 'What should students do when they finish?',
      options: [
        { text: 'Raise their hand',                      isCorrect: false, rationale: 'Raising a hand is for students who need help, not for those who finish.' },
        { text: 'Turn their book over and sit quietly',  isCorrect: true,  rationale: 'Mr Hall says "turn your book over and sit quietly."' },
        { text: 'Check their answers with a friend',    isCorrect: false, rationale: 'This is not mentioned.' },
        { text: 'Open the next page',                    isCorrect: false, rationale: 'Opening the next page is not mentioned.' },
      ],
    },
  },
  // Q5 — Instruction: how to ask for help
  {
    skill: 'LISTENING', cefrLevel: 'PRE_A1', difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'primary', 'instructions', 'classroom', 'pre-a1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Hall (teacher, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'If students need help, what should they do?',
      options: [
        { text: 'Call the teacher\'s name',  isCorrect: false, rationale: 'Calling out is not the instruction given.' },
        { text: 'Ask a friend',              isCorrect: false, rationale: 'Asking a friend is not mentioned.' },
        { text: 'Put their hand up',         isCorrect: true,  rationale: 'Mr Hall says "If you need help, put your hand up."' },
        { text: 'Stand up',                  isCorrect: false, rationale: 'Standing up is not the instruction.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 4 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 4 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
