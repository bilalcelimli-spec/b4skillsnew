/**
 * LISTENING PHASE 20 — LANGUAGE SCHOOLS
 * Module: "Placement Test — Moving to Edinburgh"
 * CEFR: A2 | Placement discriminator A1–B1 | ~72 seconds
 * 6 questions — factual recall, detail, vocabulary in context
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'langschool-placement-edinburgh';
const PRODUCT_LINE = 'LANGUAGE_SCHOOLS';
const MODULE_TITLE = 'Placement Test — Moving to Edinburgh';
const CEFR_BAND = 'A2';
const ESTIMATED_DURATION_SECONDS = 72;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-C',
  speakingRate: 0.92,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Grace (female adult, warm collegial tone): en-GB-Neural2-C. Anton (male adult, slightly excited): en-GB-Neural2-B. "Edinburgh" — CRITICAL: TTS will mispronounce. Phonetically: ED-in-bruh. NOT "Ed-in-burg" or "Ed-in-BYOO-roh". Add SSML phoneme tag or substitute "Edinbruh" in TTS script. "Fringe" — FRINJ (normal word). "suburbs" — SUB-urbz. "conference" — KON-fuh-rens. Pause 0.8s between turns.',
};

const HUMAN_SCRIPT = `[Grace — female adult colleague | Anton — male adult colleague]

Grace: Anton, I heard you are thinking about moving to Edinburgh. Is that true?
Anton: Yes! I got a job offer there last week. I am very excited, but also a little nervous.
Grace: What kind of job is it?
Anton: It is in software development. The company works on educational apps. I think it suits me well.
Grace: Edinburgh is a fantastic city. Cold, but amazing. Have you visited before?
Anton: Once, for a conference two years ago. I only had two days, so I did not see much. I know the castle and the old town, but that was about it.
Grace: You will love it properly when you live there. The arts scene is really active, especially in August during the festival.
Anton: Yes! The Fringe Festival — I have always wanted to see that. Do you think I will manage to find an apartment close to the city centre?
Grace: It depends on your budget. The centre can be quite expensive. But there are good transport links from the suburbs, so you might find it more practical to live slightly outside.
Anton: That is useful. I will start looking online this weekend.`;

const TTS_SCRIPT = `Anton, I heard you are thinking about moving to Edinbruh. Is that true?
Yes! I got a job offer there last week. I am very excited, but also a little nervous.
What kind of job is it?
It is in software development. The company works on educational apps. I think it suits me well.
Edinbruh is a fantastic city. Cold, but amazing. Have you visited before?
Once, for a conference two years ago. I only had two days, so I did not see much. I know the castle and the old town, but that was about it.
You will love it properly when you live there. The arts scene is really active, especially in August during the festival.
Yes! The Fringe Festival. I have always wanted to see that. Do you think I will manage to find an apartment close to the city centre?
It depends on your budget. The centre can be quite expensive. But there are good transport links from the suburbs, so you might find it more practical to live slightly outside.
That is useful. I will start looking online this weekend.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "Edinburgh" — HIGHEST RISK. TTS systems commonly produce wrong pronunciation. Use SSML: <phoneme alphabet="ipa" ph="ˈɛd.ɪn.brə">Edinburgh</phoneme>. In plain TTS script replaced with "Edinbruh" — requires human review.
- "Fringe Festival" — correctly synthesised.
- "suburbs" — verify no unusual stress.
- Speech pace: Comfortable A2 pace; slightly slow for placement test context.
- Pause 0.8s between turns throughout.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A2 — simple factual conversation about life change. Appropriate for placement section A1-B1.
✓ Language Schools product line — placement test context.
✓ Q1 (location) — PRE_A1/A1 level; very explicit in script.
✓ Q2 (reason for move) — A1/A2; stated directly.
✓ Q3 (job type — educational apps) — A2; one step from "software development company."
✓ Q4 (timing of last visit) — A2; requires tracking "two years ago."
✓ Q5 (Fringe Festival) — A2/B1 boundary; cultural vocabulary.
✓ Q6 (cost of city centre) — A2/B1; requires comprehension of "can be quite expensive."
✓ IRT difficulty range -0.4 to 0.3 appropriate for A2 placement.
`;

const items = [
  // Q1 — A1 equivalent: destination
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'placement', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Grace (female adult colleague)', 'Anton (male adult colleague)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'Where is Anton planning to move?',
      options: [
        { text: 'London',    isCorrect: false, rationale: 'London is not mentioned in the recording.' },
        { text: 'Edinburgh', isCorrect: true,  rationale: 'Grace asks if Anton is thinking about moving to Edinburgh, and he confirms.' },
        { text: 'Glasgow',   isCorrect: false, rationale: 'Glasgow is not mentioned in the recording.' },
        { text: 'Bristol',   isCorrect: false, rationale: 'Bristol is not mentioned in the recording.' },
      ],
    },
  },
  // Q2 — A2: reason for moving
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'placement', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Grace (female adult colleague)', 'Anton (male adult colleague)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'Why is Anton moving to Edinburgh?',
      options: [
        { text: 'He wants to study there',     isCorrect: false, rationale: 'Study is not the reason; he got a job offer.' },
        { text: 'He got a job offer there',    isCorrect: true,  rationale: 'Anton says "I got a job offer there last week."' },
        { text: 'His family lives there',      isCorrect: false, rationale: 'Family is not mentioned as the reason.' },
        { text: 'He visited and fell in love with the city', isCorrect: false, rationale: 'His previous visit lasted only two days; this is not the stated reason.' },
      ],
    },
  },
  // Q3 — A2: what the company makes
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'placement', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Grace (female adult colleague)', 'Anton (male adult colleague)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What does Anton\'s new company make?',
      options: [
        { text: 'Business software',       isCorrect: false, rationale: 'The company makes educational apps, not generic business software.' },
        { text: 'Educational apps',        isCorrect: true,  rationale: 'Anton says "The company works on educational apps."' },
        { text: 'Video games',             isCorrect: false, rationale: 'Video games are not mentioned.' },
        { text: 'Online banking tools',    isCorrect: false, rationale: 'Banking tools are not mentioned.' },
      ],
    },
  },
  // Q4 — A2: when Anton last visited Edinburgh
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'placement', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Grace (female adult colleague)', 'Anton (male adult colleague)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'When did Anton last visit Edinburgh?',
      options: [
        { text: 'One year ago',   isCorrect: false, rationale: 'One year ago is not correct; he says two years ago.' },
        { text: 'Two years ago',  isCorrect: true,  rationale: 'Anton says "Once, for a conference two years ago."' },
        { text: 'Three years ago', isCorrect: false, rationale: 'Three years ago is not correct.' },
        { text: 'He has never visited', isCorrect: false, rationale: 'He has visited once, two years ago.' },
      ],
    },
  },
  // Q5 — A2/B1: August event
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'placement', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Grace (female adult colleague)', 'Anton (male adult colleague)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'What event in Edinburgh does Grace mention that happens in August?',
      options: [
        { text: 'The Highland Games',     isCorrect: false, rationale: 'The Highland Games are not mentioned in the recording.' },
        { text: 'The Fringe Festival',    isCorrect: true,  rationale: 'Grace mentions "the arts scene is really active, especially in August during the festival" and Anton confirms "The Fringe Festival."' },
        { text: 'The Edinburgh Marathon', isCorrect: false, rationale: 'The marathon is not mentioned in the recording.' },
        { text: 'A music conference',     isCorrect: false, rationale: 'The conference mentioned was Anton\'s past work trip, not an August event.' },
      ],
    },
  },
  // Q6 — A2/B1: city centre cost
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: 0.3, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'language-schools', 'a2', 'placement', 'inference', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Grace (female adult colleague)', 'Anton (male adult colleague)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 6,
      prompt: 'What does Grace say about living in the city centre of Edinburgh?',
      options: [
        { text: 'It is very noisy',          isCorrect: false, rationale: 'Noise is not mentioned by Grace.' },
        { text: 'It can be quite expensive', isCorrect: true,  rationale: 'Grace says "The centre can be quite expensive."' },
        { text: 'It is far from transport',  isCorrect: false, rationale: 'Grace says the suburbs have good transport; she does not say the centre lacks transport.' },
        { text: 'It is the best option for Anton', isCorrect: false, rationale: 'Grace suggests the suburbs might be more practical, not the centre.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 20 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 20 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
