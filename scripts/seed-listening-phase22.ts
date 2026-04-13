/**
 * LISTENING PHASE 22 — LANGUAGE SCHOOLS
 * Module: "Summative B1 — Checking In at the Hotel"
 * CEFR: B1 | Summative end-of-unit test | ~87 seconds
 * 6 questions — transactional dialogue, practical comprehension, implicit meaning
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'langschool-summative-b1-hotel';
const PRODUCT_LINE = 'LANGUAGE_SCHOOLS';
const MODULE_TITLE = 'Summative B1 — Checking In at the Hotel';
const CEFR_BAND = 'B1';
const ESTIMATED_DURATION_SECONDS = 87;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-C',
  speakingRate: 0.91,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Celia (hotel receptionist, female, professional and helpful): en-GB-Neural2-C. Mr. Nguyen (hotel guest, male, polite and precise): en-GB-Neural2-B. "Nguyen" — TTS HIGH RISK. Vietnamese surname commonly rendered incorrectly. Options: (1) Use SSML phoneme <phoneme alphabet="ipa" ph="ŋwiːn">Nguyen</phoneme>. (2) In TTS script replace with "Mr. N" or "Mr. Nwin" for synthesis only. Human review required. "one hundred and twelve pounds" — verify full numeric synthesis. "six-thirty to ten" — verify time expression pair synthesis. Pause 1.0s between turns.',
};

const HUMAN_SCRIPT = `[Celia — hotel receptionist, female adult | Mr. Nguyen — hotel guest, male adult]

Celia: Good evening. Welcome to the Bankside Hotel. Do you have a reservation?
Mr. Nguyen: Yes, I do. My name is Nguyen — N-G-U-Y-E-N. I booked online about three weeks ago.
Celia: Let me check... yes, I have you here. A double room for four nights, checking out on Thursday. Is that correct?
Mr. Nguyen: That is right. Actually, I had a question — is it possible to extend my stay by one night? I have a meeting that was moved to Friday morning.
Celia: Let me check availability for Thursday night... yes, we do have rooms available. The rate for Thursday will be one hundred and twelve pounds, which is slightly higher than your original booking rate because it falls on a weekend.
Mr. Nguyen: I see. That is fine, I will take it. Also, I noticed the room I booked was listed as a city view — is that guaranteed?
Celia: For standard bookings, we cannot guarantee a specific view. However, I can see that a city-view room is currently available, and since you are extending your stay, I am happy to put you in that one.
Mr. Nguyen: Wonderful. Thank you very much.
Celia: Of course. Breakfast is served from six-thirty to ten. The lift is just to your right. Have a pleasant stay.`;

const TTS_SCRIPT = `Good evening. Welcome to the Bankside Hotel. Do you have a reservation?
Yes, I do. My name is Nwin. I booked online about three weeks ago.
Let me check. Yes, I have you here. A double room for four nights, checking out on Thursday. Is that correct?
That is right. Actually, I had a question. Is it possible to extend my stay by one night? I have a meeting that was moved to Friday morning.
Let me check availability for Thursday night. Yes, we do have rooms available. The rate for Thursday will be one hundred and twelve pounds, which is slightly higher than your original booking rate because it falls on a weekend.
I see. That is fine, I will take it. Also, I noticed the room I booked was listed as a city view. Is that guaranteed?
For standard bookings, we cannot guarantee a specific view. However, I can see that a city-view room is currently available, and since you are extending your stay, I am happy to put you in that one.
Wonderful. Thank you very much.
Of course. Breakfast is served from six-thirty to ten. The lift is just to your right. Have a pleasant stay.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "Nguyen" — CRITICAL. TTS OUTPUT UNRELIABLE. Use SSML phoneme or substitute with "Mr. N" / "Nwin" in spoken script. This name is used only once in HUMAN_SCRIPT; the question does not test the name itself.
- "one hundred and twelve pounds" — British English format; verify synthesis.
- "six-thirty to ten" — verify pair is rendered naturally; should sound: "six-thirty... to... ten."
- "double room" — standard hotel vocabulary; verify clarity.
- "extending your stay" — three-word phrase; verify natural delivery.
- "city-view room" — compound adjective; verify even stress: SIT-ee-VYOO.
- Pause 1.0s between turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B1 — transactional hotel dialogue, practical vocabulary, one conditional situation (extension request).
✓ Language Schools product line — summative B1 end-of-unit assessment.
✓ Q1 (original nights) — B1 easy; answer is explicitly stated.
✓ Q2 (reason for extension) — B1 mid; stated directly but requires identifying the cause.
✓ Q3 (why Thursday is more expensive) — B1+ ; requires linking "falls on a weekend" → higher rate.
✓ Q4 (£112 price) — B1 ; specific figure, number tracking required.
✓ Q5 (city view not guaranteed for standard bookings) — B1+ ; explicit negative statement.
✓ Q6 (breakfast times) — B1 ; listening for a specific time pair.
✓ IRT difficulty range 0.0 to 0.5 appropriate for a B1 summative.
HUMAN REVIEW: Confirm Nguyen pronunciation workaround is acceptable.
`;

const items = [
  // Q1 — B1 easy: original nights booked
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b1', 'summative', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Celia (hotel receptionist, female adult)', 'Mr. Nguyen (hotel guest, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'How many nights did Mr. Nguyen originally book?',
      options: [
        { text: 'Three nights', isCorrect: false, rationale: 'Three nights is incorrect; the booking is for four nights.' },
        { text: 'Four nights',  isCorrect: true,  rationale: 'Celia confirms "A double room for four nights."' },
        { text: 'Five nights',  isCorrect: false, rationale: 'Five nights is incorrect.' },
        { text: 'One week',     isCorrect: false, rationale: 'One week is incorrect.' },
      ],
    },
  },
  // Q2 — B1: why he wants to extend
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b1', 'summative', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Celia (hotel receptionist, female adult)', 'Mr. Nguyen (hotel guest, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'Why does Mr. Nguyen want to extend his stay?',
      options: [
        { text: 'He missed his flight',                          isCorrect: false, rationale: 'A flight is not mentioned.' },
        { text: 'A meeting was moved to Friday morning',         isCorrect: true,  rationale: 'Mr. Nguyen says "I have a meeting that was moved to Friday morning."' },
        { text: 'He wants to see more of the city',             isCorrect: false, rationale: 'Tourism is not the stated reason.' },
        { text: 'The hotel offered him a discount',             isCorrect: false, rationale: 'No discount is offered to prompt the extension request.' },
      ],
    },
  },
  // Q3 — B1+: why Thursday is more expensive
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b1', 'summative', 'inference', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Celia (hotel receptionist, female adult)', 'Mr. Nguyen (hotel guest, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 3,
      prompt: 'Why is the Thursday night rate higher than the original booking rate?',
      options: [
        { text: 'It is a special holiday',          isCorrect: false, rationale: 'A holiday is not the stated reason.' },
        { text: 'It falls on a weekend',            isCorrect: true,  rationale: 'Celia says the rate is "slightly higher than your original booking rate because it falls on a weekend."' },
        { text: 'It is a superior room',            isCorrect: false, rationale: 'Room type is discussed separately; the price difference is about the day, not the room.' },
        { text: 'It includes breakfast',            isCorrect: false, rationale: 'Breakfast inclusion is not given as the reason for the higher rate.' },
      ],
    },
  },
  // Q4 — B1: specific price for Thursday night
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b1', 'summative', 'detail', 'number', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Celia (hotel receptionist, female adult)', 'Mr. Nguyen (hotel guest, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'How much does the Thursday night stay cost?',
      options: [
        { text: '£99',  isCorrect: false, rationale: 'Not the stated price.' },
        { text: '£105', isCorrect: false, rationale: 'Not the stated price.' },
        { text: '£112', isCorrect: true,  rationale: 'Celia says "The rate for Thursday will be one hundred and twelve pounds."' },
        { text: '£125', isCorrect: false, rationale: 'Not the stated price.' },
      ],
    },
  },
  // Q5 — B1: city-view policy for standard bookings
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b1', 'summative', 'inference', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Celia (hotel receptionist, female adult)', 'Mr. Nguyen (hotel guest, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 5,
      prompt: 'Can Mr. Nguyen be guaranteed a city-view room under his standard booking?',
      options: [
        { text: 'Yes, it is guaranteed with any booking',              isCorrect: false, rationale: 'Celia explicitly says the hotel cannot guarantee a specific view for standard bookings.' },
        { text: 'No, but he can request it at extra cost',            isCorrect: false, rationale: 'Extra cost is not mentioned; the city-view room is offered without extra charge as a gesture.' },
        { text: 'No, specific views cannot be guaranteed for standard bookings', isCorrect: true, rationale: 'Celia says "For standard bookings, we cannot guarantee a specific view." She then offers one as a favour.' },
        { text: 'Yes, because he is a returning customer',            isCorrect: false, rationale: 'There is no mention of Mr. Nguyen being a returning customer.' },
      ],
    },
  },
  // Q6 — B1: breakfast service hours
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b1', 'summative', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Celia (hotel receptionist, female adult)', 'Mr. Nguyen (hotel guest, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'What are the hotel breakfast serving hours?',
      options: [
        { text: '7:00 am to 10:30 am', isCorrect: false, rationale: 'These exact times are not stated.' },
        { text: '7:00 am to 10:00 am', isCorrect: false, rationale: 'The start time is 6:30, not 7:00.' },
        { text: '6:30 am to 10:00 am', isCorrect: true,  rationale: 'Celia says "Breakfast is served from six-thirty to ten."' },
        { text: '6:00 am to 9:30 am',  isCorrect: false, rationale: 'These exact times are not stated.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 22 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 22 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
