/**
 * LISTENING PHASE 25 — SPECIALIZED
 * Module: "Listen and Respond — Career Change Advice"
 * CEFR: B2 | Integrated productive skill — listen + spoken/written response | ~97 seconds
 * 4 MC comprehension questions + 1 extended speaking/writing task (productive)
 * Speakers: Ruth (career advisor, female) + Kai (client, gender-neutral)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'specialized-listen-respond-career';
const PRODUCT_LINE = 'SPECIALIZED';
const MODULE_TITLE = 'Listen and Respond — Career Change Advice';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 97;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  speakingRate: 0.90,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Ruth (career advisor, female adult, warm and professional): en-US-Neural2-F. Kai (client, gender-neutral — use a neutral adult male voice): en-US-Neural2-D. Single-voice fallback if needed: en-US-Neural2-C for both. "induction" — in-DUK-shun; standard word. "school-based" — compound adjective; even stress SCHOOL-based. "university-based" — four syllables plus "based." "secondary school" — standard. "committed" — kuh-MIT-id. "qualification" — kwol-ih-fih-KAY-shun. Warm conversational pace. Pause 1.0s between turns.',
};

const HUMAN_SCRIPT = `[Ruth — career advisor, female adult | Kai — client, gender-neutral]

Ruth: So, Kai, you mentioned in your email that you are thinking about leaving your current IT role to move into teaching. What is driving that?
Kai: Honestly, I enjoy the problem-solving part of my job, but I feel quite disconnected from people. I sit alone most of the day and I miss having more human contact.
Ruth: That makes a lot of sense. Teaching does provide that contact, but it also comes with its own challenges. Have you thought about what age group you would want to work with?
Kai: Probably secondary school — around sixteen to eighteen. I have a technical background, so I was thinking computer science or maths.
Ruth: Both are high-demand subjects, which is good. The practical pathway would be a one-year teacher training programme — either school-based or university-based. School-based is faster at getting you into the classroom, but the university route tends to give more structured theory.
Kai: How long would it take overall?
Ruth: The training itself is a year. After that, you would complete a two-year induction period in a school before being fully qualified. So, realistically, three years to full qualification.
Kai: That feels significant. But I think I need this kind of change. I feel a bit stuck where I am.
Ruth: That feeling is worth listening to. I would suggest visiting one or two local schools to observe some lessons first — before committing. It is a low-risk way to test your assumptions.
Kai: That is a great idea. I will do that.`;

const TTS_SCRIPT = `So, Kai, you mentioned in your email that you are thinking about leaving your current IT role to move into teaching. What is driving that?
Honestly, I enjoy the problem-solving part of my job, but I feel quite disconnected from people. I sit alone most of the day and I miss having more human contact.
That makes a lot of sense. Teaching does provide that contact, but it also comes with its own challenges. Have you thought about what age group you would want to work with?
Probably secondary school. Around sixteen to eighteen. I have a technical background, so I was thinking computer science or maths.
Both are high-demand subjects, which is good. The practical pathway would be a one-year teacher training programme. Either school-based or university-based. School-based is faster at getting you into the classroom, but the university route tends to give more structured theory.
How long would it take overall?
The training itself is a year. After that, you would complete a two-year induction period in a school before being fully qualified. So, realistically, three years to full qualification.
That feels significant. But I think I need this kind of change. I feel a bit stuck where I am.
That feeling is worth listening to. I would suggest visiting one or two local schools to observe some lessons first, before committing. It is a low-risk way to test your assumptions.
That is a great idea. I will do that.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "school-based" and "university-based" — compound adjectives; verify synthesis does not break at hyphen.
- "induction period" — professional education term; verify clarity.
- "fully qualified" — two-word phrase; verify even stress.
- "three years to full qualification" — summary statement; slightly slower delivery appropriate for emphasis.
- "low-risk way to test your assumptions" — professional advisory phrase; verify natural flow.
- "gender-neutral" voice for Kai: aim for a neutral adult tone (not overtly masculine or feminine). en-US-Neural2-D is default; reviewer may choose en-US-Neural2-A as alternative.
- Pause 1.0s between turns.
- Warm, non-clinical tone throughout — this is a supportive career advisory dialogue.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — practical advisory dialogue, conditional pathways, evaluative response task.
✓ Specialized product line — integrated skill: comprehension + spoken/written response.
✓ MC Q1 (why Kai wants to leave IT) — B2 easy; explicitly stated motivation.
✓ MC Q2 (subjects — CS or maths) — B2 easy; stated directly.
✓ MC Q3 (training duration = 1 year) — B2 medium; requires distinguishing training (1yr) from total (3yr).
✓ MC Q4 (total = 3 years) — B2 medium; requires adding training + induction.
✓ Productive Q5 (speak/write 60-90 words — advice to a friend) — B2; elicits modal language, summarising advice, personal application.
✓ Scoring rubric includes content, accuracy, and fluency/coherence dimensions.
✓ IRT: MC 0.2–0.5; productive task guessing 0.0.
HUMAN REVIEW: Consider whether Q3/Q4 are too close; recommend spacing them or adding brief distractor trap.
`;

const items = [
  // Q1 — B2 easy: reason for wanting to leave IT
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'specialized', 'b2', 'listen-and-respond', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ruth (career advisor, female adult)', 'Kai (client, gender-neutral)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'Why does Kai want to leave their IT job?',
      options: [
        { text: 'The salary is too low',                                 isCorrect: false, rationale: 'Salary is not mentioned.' },
        { text: 'They find the technical work too difficult',           isCorrect: false, rationale: 'Kai says they enjoy the problem-solving part, so difficulty is not the issue.' },
        { text: 'They feel disconnected from people and miss human contact', isCorrect: true, rationale: 'Kai says "I feel quite disconnected from people... I miss having more human contact."' },
        { text: 'They want to work shorter hours',                      isCorrect: false, rationale: 'Working hours are not the stated motivation.' },
      ],
    },
  },
  // Q2 — B2 easy: subjects Kai is considering
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'specialized', 'b2', 'listen-and-respond', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ruth (career advisor, female adult)', 'Kai (client, gender-neutral)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What subjects is Kai considering teaching?',
      options: [
        { text: 'Physics and engineering',        isCorrect: false, rationale: 'These subjects are not mentioned.' },
        { text: 'Computer science or maths',      isCorrect: true,  rationale: 'Kai says "I have a technical background, so I was thinking computer science or maths."' },
        { text: 'English and technology',         isCorrect: false, rationale: 'English is not mentioned as a subject Kai is considering.' },
        { text: 'Business studies and economics', isCorrect: false, rationale: 'These subjects are not mentioned.' },
      ],
    },
  },
  // Q3 — B2 medium: training duration (1 year only, not total)
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'specialized', 'b2', 'listen-and-respond', 'detail', 'number', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ruth (career advisor, female adult)', 'Kai (client, gender-neutral)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'How long does the teacher training programme itself last?',
      options: [
        { text: 'Six months',   isCorrect: false, rationale: 'Six months is not stated.' },
        { text: 'One year',     isCorrect: true,  rationale: 'Ruth says "The training itself is a year."' },
        { text: 'Two years',    isCorrect: false, rationale: 'Two years refers to the induction period, not the training programme itself.' },
        { text: 'Three years',  isCorrect: false, rationale: 'Three years is the total time to full qualification, not just the training.' },
      ],
    },
  },
  // Q4 — B2 medium: total time to qualification
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'specialized', 'b2', 'listen-and-respond', 'detail', 'number', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ruth (career advisor, female adult)', 'Kai (client, gender-neutral)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'How many years in total does it take to become a fully qualified teacher, according to Ruth?',
      options: [
        { text: 'One year',    isCorrect: false, rationale: 'One year is only the training; the induction period adds two more years.' },
        { text: 'Two years',   isCorrect: false, rationale: 'Two years is the induction period only.' },
        { text: 'Three years', isCorrect: true,  rationale: 'Ruth says "realistically, three years to full qualification" (1 year training + 2 year induction).' },
        { text: 'Four years',  isCorrect: false, rationale: 'Four years is not stated.' },
      ],
    },
  },
  // Q5 — PRODUCTIVE TASK (spoken or written response), stored as MULTIPLE_CHOICE with scoring rubric
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.4, guessing: 0.0,
    tags: ['listening', 'specialized', 'b2', 'listen-and-respond', 'productive-task', 'speaking-writing', 'extended-response', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Ruth (career advisor, female adult)', 'Kai (client, gender-neutral)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'extended-response', questionNumber: 5,
      taskType: 'productive',
      responseFormat: 'spoken-or-written',
      wordCountTarget: '60–90 words (written) / 45–75 seconds (spoken)',
      prompt: 'A friend is thinking about making the same career change — from IT into teaching. Based on the advice in the recording, what would you tell them to consider? Speak or write your answer in 60–90 words.',
      options: [
        {
          text: 'Full marks — covers key content points with accurate language and coherent structure',
          isCorrect: true,
          rationale: 'SCORING RUBRIC (8 points total): Content (4 pts) — 1 pt each for: (1) teaching requires training (~1 year); (2) school-based vs university-based options; (3) two-year induction before full qualification / total ~3 years; (4) suggestion to visit/observe schools before committing. Language accuracy (2 pts) — appropriate modal verbs (should, could, would), accurate present/conditional tenses, relevant vocabulary. Fluency and coherence (2 pts) — logical order, appropriate connectors (first / also / finally), no major long pauses (spoken) or structural gaps (written). Penalty: responses below 50 words or above 110 words deduct 1 pt from total.',
        },
        {
          text: 'Partial marks — 3 content points covered',
          isCorrect: false,
          rationale: '3 points for content; language and coherence judged independently.',
        },
        {
          text: 'Partial marks — 2 content points covered',
          isCorrect: false,
          rationale: '2 points for content; language and coherence judged independently.',
        },
        {
          text: 'Minimal marks — 1 content point or inaccurate/irrelevant content',
          isCorrect: false,
          rationale: '1 point for content if at least one accurate detail is given. 0 points if content is unrelated or fabricated.',
        },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 25 — ${MODULE_TITLE} (${items.length} items — 4 MC + 1 productive)…`);
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
  console.log(`✓ Listening Phase 25 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
