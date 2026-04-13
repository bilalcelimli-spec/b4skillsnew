/**
 * LISTENING PHASE 21 — LANGUAGE SCHOOLS
 * Module: "Formative A2 — Weekend Plans"
 * CEFR: A2 | Formative progress check | ~76 seconds
 * 6 questions — daily life vocabulary, time expressions, simple reasoning
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'langschool-formative-a2-weekend';
const PRODUCT_LINE = 'LANGUAGE_SCHOOLS';
const MODULE_TITLE = 'Formative A2 — Weekend Plans';
const CEFR_BAND = 'A2';
const ESTIMATED_DURATION_SECONDS = 76;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-C',
  speakingRate: 0.91,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Kalinda (female adult, friendly and warm): en-GB-Neural2-C. James (male adult, casual and helpful): en-GB-Neural2-B. "half past one" — verify natural synthesis for this British English time expression. "two-thirty" — TWO-thirty, level stress. "Italian" — ih-TAL-ee-un. "comedy" — KOM-uh-dee. Pace is comfortable A2 — not rushed. Pause 0.8s between turns.',
};

const HUMAN_SCRIPT = `[Kalinda — female adult | James — male adult]

Kalinda: James, do you have any plans for the weekend?
James: Not really. I want to go to the cinema on Saturday. There is a new film — it is a comedy. Do you want to come?
Kalinda: I would love to, but I am busy on Saturday. I am helping my sister move to her new flat.
James: Oh, that is nice! Is she moving far?
Kalinda: No, just across town. But she has a lot of furniture, so it will be a long day. Maybe Sunday?
James: Sunday works. Let me check... yes, Sunday is free for me. What time does the cinema open?
Kalinda: I think around eleven in the morning. We could go in the afternoon.
James: Good idea. Shall we have lunch first? There is a nice Italian restaurant near the cinema.
Kalinda: Perfect. I love Italian food. What time shall we meet?
James: How about one o'clock? We can get food at half past one and catch the two-thirty showing.
Kalinda: Great. It is a plan!`;

const TTS_SCRIPT = `James, do you have any plans for the weekend?
Not really. I want to go to the cinema on Saturday. There is a new film. It is a comedy. Do you want to come?
I would love to, but I am busy on Saturday. I am helping my sister move to her new flat.
Oh, that is nice! Is she moving far?
No, just across town. But she has a lot of furniture, so it will be a long day. Maybe Sunday?
Sunday works. Let me check. Yes, Sunday is free for me. What time does the cinema open?
I think around eleven in the morning. We could go in the afternoon.
Good idea. Shall we have lunch first? There is a nice Italian restaurant near the cinema.
Perfect. I love Italian food. What time shall we meet?
How about one o clock? We can get food at half past one and catch the two-thirty showing.
Great. It is a plan!`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "half past one" — standard British English time expression. Verify TTS renders this naturally as 1:30 announcement, not in a robotic/clipped way.
- "two-thirty" — level two-syllable stress on TWO and THIR; verify.
- "one o'clock" — TTS script uses "one o clock" without apostrophe to encourage correct synthesis.
- "comedy" — KOM-uh-dee; verify no unusual stress.
- Pace: Slightly slower than natural speech — A2 learner-friendly.
- Pause 0.8s between turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A2 — everyday social dialogue, future plans, time expressions.
✓ Language Schools product line — formative progress check, A2 unit.
✓ Q1 + Q2 (cinema, Kalinda's reason) — A1/A2 level; explicitly stated.
✓ Q3 (comedy) — A2; one-word detail.
✓ Q4 (Italian restaurant) — A2; factual inference from suggestion.
✓ Q5 (meeting time = 1pm) — A2; time expression tracking.
✓ Q6 (film showing time = 2:30) — A2; requires tracking first mention of "two-thirty showing."
✓ IRT difficulty range -0.3 to 0.2 appropriate for A2 formative.
HUMAN REVIEW: Confirm Q5 and Q6 traps are not too similar.
`;

const items = [
  // Q1 — A2: What does James want to do on Saturday?
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'formative', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Kalinda (female adult)', 'James (male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What does James want to do on Saturday?',
      options: [
        { text: 'Go to a restaurant',   isCorrect: false, rationale: 'James suggests a restaurant for Sunday, not as the main Saturday plan.' },
        { text: 'Go to the cinema',     isCorrect: true,  rationale: 'James says "I want to go to the cinema on Saturday."' },
        { text: 'Help his sister move', isCorrect: false, rationale: 'It is Kalinda who is helping her sister move, not James.' },
        { text: 'Go to the park',       isCorrect: false, rationale: 'The park is not mentioned by James.' },
      ],
    },
  },
  // Q2 — A2: Why can Kalinda not go on Saturday?
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'formative', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Kalinda (female adult)', 'James (male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'Why can Kalinda not go to the cinema on Saturday?',
      options: [
        { text: 'She is working',                          isCorrect: false, rationale: 'Work is not given as the reason.' },
        { text: 'She does not like comedy films',          isCorrect: false, rationale: 'Kalinda does not say she dislikes comedies; she says she would love to come.' },
        { text: 'She is helping her sister move to a new flat', isCorrect: true, rationale: 'Kalinda says "I am busy on Saturday. I am helping my sister move to her new flat."' },
        { text: 'She has a family visit',                  isCorrect: false, rationale: 'A family visit (other than helping her sister) is not stated.' },
      ],
    },
  },
  // Q3 — A2: What type of film is it?
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'formative', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Kalinda (female adult)', 'James (male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What type of film does James want to see?',
      options: [
        { text: 'An action film', isCorrect: false, rationale: 'An action film is not described.' },
        { text: 'A horror film',  isCorrect: false, rationale: 'A horror film is not described.' },
        { text: 'A romance film', isCorrect: false, rationale: 'A romance film is not described.' },
        { text: 'A comedy',       isCorrect: true,  rationale: 'James says "There is a new film — it is a comedy."' },
      ],
    },
  },
  // Q4 — A2: What does James suggest before the cinema?
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'formative', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Kalinda (female adult)', 'James (male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What does James suggest they do before going to the cinema on Sunday?',
      options: [
        { text: 'Have coffee',                           isCorrect: false, rationale: 'Coffee is not specifically mentioned.' },
        { text: 'Have lunch at an Italian restaurant',   isCorrect: true,  rationale: 'James says "Shall we have lunch first? There is a nice Italian restaurant near the cinema."' },
        { text: 'Go for a walk in the park',             isCorrect: false, rationale: 'A walk is not suggested.' },
        { text: 'Go to a supermarket',                   isCorrect: false, rationale: 'A supermarket is not suggested.' },
      ],
    },
  },
  // Q5 — A2: What time do they agree to meet?
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'formative', 'time-expression', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Kalinda (female adult)', 'James (male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'What time do James and Kalinda agree to meet?',
      options: [
        { text: '11:00 am', isCorrect: false, rationale: 'Kalinda says the cinema opens around eleven but they do not plan to meet at opening time.' },
        { text: '1:00 pm',  isCorrect: true,  rationale: 'James suggests "How about one o\'clock?" This is their agreed meeting time.' },
        { text: '1:30 pm',  isCorrect: false, rationale: '1:30 (half past one) is when they plan to eat, not when they meet.' },
        { text: '2:30 pm',  isCorrect: false, rationale: '2:30 is the film showing time, not the meeting time.' },
      ],
    },
  },
  // Q6 — A2: What time is the film showing they plan to see?
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'formative', 'time-expression', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Kalinda (female adult)', 'James (male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'Which film showing do James and Kalinda plan to attend?',
      options: [
        { text: 'The 11:00 am showing', isCorrect: false, rationale: 'James suggests going in the afternoon, not at 11am.' },
        { text: 'The 1:00 pm showing',  isCorrect: false, rationale: '1pm is their meeting time, not the film time.' },
        { text: 'The 1:30 pm showing',  isCorrect: false, rationale: '1:30 is when they plan to eat lunch.' },
        { text: 'The 2:30 pm showing',  isCorrect: true,  rationale: 'James says "catch the two-thirty showing."' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 21 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 21 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
