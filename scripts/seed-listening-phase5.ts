/**
 * LISTENING PHASE 5 — JUNIOR SUITE
 * Module: "The Science Project"
 * CEFR: A2–B1 | Ages 11–14 | ~82 seconds
 * 6 questions — peer discussion, gist, detail, inference
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'junior-science-project';
const PRODUCT_LINE = 'JUNIOR_SUITE';
const MODULE_TITLE = 'The Science Project';
const CEFR_BAND = 'A2';
const ESTIMATED_DURATION_SECONDS = 82;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  speakingRate: 0.90,
  pitch: 1.5,
  audioEncoding: 'MP3',
  notes: 'Two teen voices recommended. Mia: en-US-Neural2-F (female, slightly higher pitch). Daniel: en-US-Neural2-A (male, neutral). Both at speakingRate 0.90. Moderate pace — more natural than Primary but still clear. Pause 1.0s between speaker turns.',
};

const HUMAN_SCRIPT = `[Mia — student, female, age 12 | Daniel — student, male, age 13]

Mia: Daniel, our science project is due on Friday! What are we going to do?
Daniel: I was thinking we could do something about plants. Like, how does sunlight affect how fast they grow?
Mia: That sounds good, but we only have four days. Can we actually do an experiment in that time?
Daniel: Maybe not a live one. But we could do research and make a poster. We could show data from online studies.
Mia: OK. I can find the data tonight if you design the poster layout.
Daniel: Sure. I am good at drawing. Should we also include a conclusion section?
Mia: Yes, definitely. And we need a bibliography at the end — Miss Patel always checks that.
Daniel: Right. Let me write down what we need: data, poster design, conclusion, and bibliography.
Mia: Perfect. Let us meet at the library tomorrow after school to put it all together.
Daniel: Sounds like a plan!`;

const TTS_SCRIPT = `Daniel, our science project is due on Friday. What are we going to do?
I was thinking we could do something about plants. How does sunlight affect how fast they grow?
That sounds good, but we only have four days. Can we actually do an experiment in that time?
Maybe not a live one. But we could do research and make a poster. We could show data from online studies.
I can find the data tonight if you design the poster layout.
Sure. I am good at drawing. Should we also include a conclusion section?
Yes, definitely. And we need a bibliography at the end. Miss Patel always checks that.
Right. We need: data, poster design, conclusion, and bibliography.
Perfect. Let us meet at the library tomorrow after school.
Sounds like a plan.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Two-voice production strongly recommended for natural dialogue feel.
- "bibliography" — four syllables: bib-lee-OG-ruh-fee; verify TTS is accurate.
- "Miss Patel" — PATEL: puh-TELL; verify TTS stress.
- "conclusion" — three syllables, con-CLUE-zhun.
- Pause 1.0s between speaker turns; 1.5s between topic shifts.
- Remove speaker labels before synthesis.
- "Let us meet" — do not contract to "Let's" for clearer synthesis.
- Replay: one listen recommended at this level.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A2–B1 — moderate vocab, future plans, study skills context.
✓ Age-appropriate — school project, peer conversation, no adult complexity.
✓ TTS-compatible — dialogic turns are short enough for clear synthesis.
✓ All 6 questions traceable to specific audio moments.
✓ Duration ~82s — within Junior Suite guideline.
HUMAN REVIEW: Confirm "bibliography" is synthesised correctly. Flag if TTS mispronounces "Patel."
`;

const items = [
  // Q1 — Detail: deadline
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'school', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mia (student, female, age 12)', 'Daniel (student, male, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'When is the science project due?',
      options: [
        { text: 'Monday',    isCorrect: false, rationale: 'Monday is not the deadline mentioned.' },
        { text: 'Wednesday', isCorrect: false, rationale: 'Wednesday is mentioned as when they plan to meet, not the deadline.' },
        { text: 'Friday',    isCorrect: true,  rationale: 'Mia says "our science project is due on Friday."' },
        { text: 'Saturday',  isCorrect: false, rationale: 'Saturday is not mentioned.' },
      ],
    },
  },
  // Q2 — Detail: project topic
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'school', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mia (student, female, age 12)', 'Daniel (student, male, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What is the topic of their project?',
      options: [
        { text: 'The effect of water on animal growth',         isCorrect: false, rationale: 'The topic is sunlight and plants, not water and animals.' },
        { text: 'How sunlight affects how fast plants grow',    isCorrect: true,  rationale: 'Daniel proposes "how does sunlight affect how fast they grow?" about plants.' },
        { text: 'Different types of plants in their school',   isCorrect: false, rationale: 'Identifying types of plants is not the proposed topic.' },
        { text: 'The history of plant science',                isCorrect: false, rationale: 'History of science is not the topic discussed.' },
      ],
    },
  },
  // Q3 — Reason: why no live experiment
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'school', 'a2', 'reason', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mia (student, female, age 12)', 'Daniel (student, male, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'reason', questionNumber: 3,
      prompt: 'Why will they NOT do a live experiment?',
      options: [
        { text: 'They do not have the right equipment',     isCorrect: false, rationale: 'Equipment is not the reason given.' },
        { text: 'Their teacher does not allow it',          isCorrect: false, rationale: 'The teacher is not cited as the reason.' },
        { text: 'They do not have enough time',             isCorrect: true,  rationale: 'Mia says "we only have four days" — the time constraint rules out a live experiment.' },
        { text: 'The topic is not suitable for experiments',isCorrect: false, rationale: 'Suitability is not raised; time is the constraint.' },
      ],
    },
  },
  // Q4 — Detail: what Mia will do tonight
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'school', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mia (student, female, age 12)', 'Daniel (student, male, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What will Mia do tonight?',
      options: [
        { text: 'Design the poster layout',  isCorrect: false, rationale: 'Daniel will design the poster layout.' },
        { text: 'Find the data online',      isCorrect: true,  rationale: 'Mia says "I can find the data tonight."' },
        { text: 'Write the bibliography',    isCorrect: false, rationale: 'The bibliography is planned, but not assigned to Mia specifically for tonight.' },
        { text: 'Draft the conclusion',      isCorrect: false, rationale: 'The conclusion is on the list but not Mia\'s task for tonight.' },
      ],
    },
  },
  // Q5 — Detail: Daniel's self-described skill
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'school', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mia (student, female, age 12)', 'Daniel (student, male, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'What does Daniel say he is good at?',
      options: [
        { text: 'Research',   isCorrect: false, rationale: 'Mia offers to do the research.' },
        { text: 'Writing',    isCorrect: false, rationale: 'Writing is not cited as Daniel\'s skill.' },
        { text: 'Drawing',    isCorrect: true,  rationale: 'Daniel says "I am good at drawing."' },
        { text: 'Speaking',   isCorrect: false, rationale: 'Speaking ability is not mentioned.' },
      ],
    },
  },
  // Q6 — Detail: who checks the bibliography
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'school', 'a2', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Mia (student, female, age 12)', 'Daniel (student, male, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'Who always checks the bibliography?',
      options: [
        { text: 'Mr Hall',    isCorrect: false, rationale: 'Mr Hall is not in this recording.' },
        { text: 'Mia',        isCorrect: false, rationale: 'Mia mentions it but says the teacher checks it.' },
        { text: 'Miss Patel', isCorrect: true,  rationale: 'Mia says "Miss Patel always checks that."' },
        { text: 'Daniel',     isCorrect: false, rationale: 'Daniel is the student, not the teacher.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 5 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 5 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
