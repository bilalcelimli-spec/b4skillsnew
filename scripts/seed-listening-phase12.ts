/**
 * LISTENING PHASE 12 — ACADEMIA
 * Module: "Cognitive Load Theory"
 * CEFR: B2 | Academic lecture excerpt | ~120 seconds
 * 6 questions — academic listening, terminology, implication
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'academia-cognitive-load-theory';
const PRODUCT_LINE = 'ACADEMIA';
const MODULE_TITLE = 'Cognitive Load Theory';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 120;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.87,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Single academic female voice — Dr. Sarah Wallis, cognitive psychology lecture. Clear, measured pace. "Sweller" — SWELL-er; verify. "extraneous" — eks-TRAY-nee-us; verify. "germane" — jer-MAIN; common TTS error (may say "jer-MAHN"). "schemas" — SKEE-muz; critical pronunciation check. Pause 1.5s between conceptual sections.',
};

const HUMAN_SCRIPT = `[Dr. Sarah Wallis — cognitive psychology lecturer, female adult]

Today I want to introduce you to a concept that has had a significant influence on instructional design: cognitive load theory, originally developed by John Sweller in the late 1980s.
The central premise of the theory is that working memory — the part of the mind that processes active information — has a limited capacity. When we are learning, we use this working memory to process new information, make connections, and begin forming long-term memories. The problem arises when we ask learners to process more information than their working memory can handle. This is known as cognitive overload.
Sweller identified three types of cognitive load. The first, intrinsic load, refers to the inherent difficulty of the material itself. A complex mathematical proof, for example, has high intrinsic load. The second is extraneous load — this is the load caused by poor design or unnecessary complexity in how information is presented. This is the type of load that instructional designers should work to minimise. The third type, germane load, is the effort associated with processing information and building schemas — it is actually productive and should be encouraged.
The practical implication for educators is straightforward: reduce extraneous cognitive load in your materials, and you free up mental resources for the actual learning. We will look at specific strategies for doing this in tomorrow's seminar.`;

const TTS_SCRIPT = `Today I want to introduce you to a concept that has had a significant influence on instructional design. Cognitive load theory, originally developed by John Sweller in the late nineteen eighties.
The central premise of the theory is that working memory — the part of the mind that processes active information — has a limited capacity. When we are learning, we use this working memory to process new information, make connections, and begin forming long-term memories. The problem arises when we ask learners to process more information than their working memory can handle. This is known as cognitive overload.
Sweller identified three types of cognitive load. The first, intrinsic load, refers to the inherent difficulty of the material itself. A complex mathematical proof has high intrinsic load. The second is extraneous load. This is the load caused by poor design or unnecessary complexity in how information is presented. This is the type of load that instructional designers should work to minimise. The third type, germane load, is the effort associated with processing information and building schemas. It is actually productive and should be encouraged.
The practical implication for educators is straightforward. Reduce extraneous cognitive load in your materials, and you free up mental resources for the actual learning. We will look at specific strategies for doing this in tomorrow's seminar.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Single clear academic voice — measured lecture pace.
- "Sweller" — SWELL-er; likely fine in TTS. Verify.
- "extraneous" — eks-TRAY-nee-us; TTS may say eks-TRAN-yus. Verify.
- "germane" — jer-MAIN (rhymes with "complain"). TTS sometimes renders as jer-MAHN (French-style). CRITICAL: verify this is correct.
- "schemas" — SKEE-muz (NOT shee-muz or she-MAZ). Verify.
- "nineteen eighties" — speak out "1980s" in full.
- Pause 1.5s at paragraph breaks between the three load types.
- Academic register — measured, no emotional inflection.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — formal academic monologue, technical terminology, classification of concepts.
✓ Academia product line — appropriate for university-level English learner.
✓ Q4 and Q5 both target extraneous load to test careful listening (same answer = valid discrimination item).
✓ Q6 tests conceptual understanding (germane load is productive, unlike the others).
✓ IRT range 0.4 to 0.9 appropriate for B2 academia.
HUMAN REVIEW: Verify all pronunciation flags. Check germane, schemas, Sweller.
`;

const items = [
  // Q1 — Detail: who developed the theory
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Sarah Wallis (cognitive psychology lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'Who originally developed cognitive load theory?',
      options: [
        { text: 'Lev Vygotsky',  isCorrect: false, rationale: 'Vygotsky is associated with the Zone of Proximal Development, not cognitive load theory.' },
        { text: 'John Sweller',  isCorrect: true,  rationale: 'Dr. Wallis says the theory was "originally developed by John Sweller in the late 1980s."' },
        { text: 'Jean Piaget',   isCorrect: false, rationale: 'Piaget is associated with constructivist developmental stages, not cognitive load theory.' },
        { text: 'Benjamin Bloom', isCorrect: false, rationale: 'Bloom is associated with his taxonomy of learning objectives, not cognitive load theory.' },
      ],
    },
  },
  // Q2 — Detail: what has limited capacity
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Sarah Wallis (cognitive psychology lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'According to the lecture, what has a limited capacity?',
      options: [
        { text: 'Long-term memory',      isCorrect: false, rationale: 'Long-term memory stores information without a tight capacity limit; it is working memory that is limited.' },
        { text: 'Working memory',        isCorrect: true,  rationale: 'Dr. Wallis says "working memory … has a limited capacity."' },
        { text: 'Attention span',        isCorrect: false, rationale: 'Attention span is not specifically named as the limited element.' },
        { text: 'Processing speed',      isCorrect: false, rationale: 'Processing speed is not the concept discussed here.' },
      ],
    },
  },
  // Q3 — Detail: what is cognitive overload
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Sarah Wallis (cognitive psychology lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What is "cognitive overload" as described in the lecture?',
      options: [
        { text: 'When students feel tired or unmotivated',             isCorrect: false, rationale: 'Tiredness and motivation are not part of the definition given.' },
        { text: 'When the content is too simple to be challenging',    isCorrect: false, rationale: 'Overload refers to content being too demanding, not too easy.' },
        { text: 'When learners must process more than their working memory can handle', isCorrect: true, rationale: 'Dr. Wallis says it arises "when we ask learners to process more information than their working memory can handle."' },
        { text: 'When students do not pay adequate attention',         isCorrect: false, rationale: 'Attention is not defined as the mechanism of cognitive overload.' },
      ],
    },
  },
  // Q4 — Detail: which load comes from poor design
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'terminology', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Sarah Wallis (cognitive psychology lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'Which type of load is caused by poor instructional design?',
      options: [
        { text: 'Intrinsic load',  isCorrect: false, rationale: 'Intrinsic load is the inherent difficulty of the material, not design-related.' },
        { text: 'Germane load',    isCorrect: false, rationale: 'Germane load is the productive effort of building schemas, not a design problem.' },
        { text: 'Extraneous load', isCorrect: true,  rationale: 'Dr. Wallis: "extraneous load — this is the load caused by poor design or unnecessary complexity."' },
        { text: 'Cognitive load',  isCorrect: false, rationale: '"Cognitive load" is the umbrella term; extraneous is the specific type created by poor design.' },
      ],
    },
  },
  // Q5 — Application: which load should be minimised
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'inference', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Sarah Wallis (cognitive psychology lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 5,
      prompt: 'According to the lecture, which type of cognitive load should instructional designers work to minimise?',
      options: [
        { text: 'Intrinsic load',          isCorrect: false, rationale: 'Intrinsic load is inherent to the material and cannot be easily reduced.' },
        { text: 'Germane load',            isCorrect: false, rationale: 'Germane load is productive and should be encouraged, not minimised.' },
        { text: 'Extraneous load',         isCorrect: true,  rationale: 'Dr. Wallis says extraneous load is "the type of load that instructional designers should work to minimise."' },
        { text: 'All types equally',       isCorrect: false, rationale: 'Only extraneous load is singled out for reduction; the others are either inherent or productive.' },
      ],
    },
  },
  // Q6 — Conceptual understanding: germane load
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'inference', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Sarah Wallis (cognitive psychology lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 6,
      prompt: 'How is germane load described in the lecture?',
      options: [
        { text: 'Harmful and should be reduced like extraneous load',  isCorrect: false, rationale: 'The lecture explicitly says germane load is productive and should be encouraged.' },
        { text: 'The same as intrinsic load',                          isCorrect: false, rationale: 'They are two distinct categories; germane is about schema-building, intrinsic is about material difficulty.' },
        { text: 'Caused by unnecessarily complex design',              isCorrect: false, rationale: 'That is the definition of extraneous load, not germane.' },
        { text: 'Productive effort of building schemas — should be encouraged', isCorrect: true, rationale: 'Dr. Wallis says germane load "is the effort associated with processing information and building schemas — it is actually productive and should be encouraged."' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 12 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 12 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
