/**
 * LISTENING PHASE 10 — 15-MINUTE DIAGNOSTIC
 * Module: "A Voicemail from the Landlord"
 * CEFR: B1 | Diagnostic, monologue | ~62 seconds
 * 5 questions — instruction, sequence, implication
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'diagnostic-landlord-voicemail';
const PRODUCT_LINE = 'DIAGNOSTIC';
const MODULE_TITLE = 'A Voicemail from the Landlord';
const CEFR_BAND = 'B1';
const ESTIMATED_DURATION_SECONDS = 62;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-B',
  speakingRate: 0.91,
  pitch: -0.5,
  audioEncoding: 'MP3',
  notes: 'Single adult male voice, slightly formal — landlord leaving a professional voicemail. Slight ambient drop-off to simulate phone/voicemail audio quality if possible. "three B" — stress B as flat letter, not number. "Thursday the twenty-second" — verify ordinal date synthesis. "between two and five" — plain cardinal numbers, not military time. Pause 1.2s between topic shifts.',
};

const HUMAN_SCRIPT = `[Mr Thompson — landlord, male adult, leaving a voicemail message]

Hello, this message is for apartment three B. This is Mr Thompson, your landlord. I am calling to let you know that the maintenance team will be coming to your building on Thursday the twenty-second, between two and five in the afternoon.
They will be checking and replacing the water pipes on the second floor. This means there will be no hot water in the entire building during those three hours.
You do not need to be home for this work — it will all take place in the corridors and utility rooms.
However, if you have any questions or concerns, please call me back on this number before Wednesday evening.
Also, starting next month, parking will require a new permit. I will send details by email next week.
Thank you, and I apologise for any inconvenience.`;

const TTS_SCRIPT = `Hello. This message is for apartment three B. This is Mr Thompson, your landlord. I am calling to let you know that the maintenance team will be coming to your building on Thursday the twenty-second, between two and five in the afternoon.
They will be checking and replacing the water pipes on the second floor. This means there will be no hot water in the entire building during those three hours.
You do not need to be home for this work. It will all take place in the corridors and utility rooms.
However, if you have any questions or concerns, please call me back on this number before Wednesday evening.
Also, starting next month, parking will require a new permit. I will send details by email next week.
Thank you, and I apologise for any inconvenience.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Single male voice, clear and professional — landlord register, not overly warm.
- "Thursday the twenty-second" — ordinal, not "22nd" spoken literally. Verify: "twen-tee-SEK-und."
- "three B" — apartment letter; should sound like "three BEE," not "three B" ending in a stop.
- "between two and five" — clock times spoken as cardinal "two" and "five," not "2 PM."
- "corridors and utility rooms" — cor-ih-DORz; verify.
- "apologise" — British spelling/pronunciation: uh-POL-oh-jize.
- Subtle voicemail quality audio filter recommended.
- Pause 1.2s between each distinct instruction section.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B1 — monologue, formal message, practical instruction, implicit implication (Q4: no need to be home).
✓ Diagnostic appropriate — 5 items, concrete instruction + implication question for B1 discrimination.
✓ Q4 tests understanding of explicit negation ("you do not need to be home").
✓ Q5 tests deadline with embedded reasoning (call back before Wednesday for Thursday work).
✓ IRT range -0.1 to 0.4 appropriate for B1 diagnostic.
HUMAN REVIEW: Confirm "Thursday the twenty-second" ordinal is synthesised correctly.
`;

const items = [
  // Q1 — Detail: maintenance day
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b1', 'detail', 'voicemail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Thompson (landlord, male adult, voicemail)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What day will the maintenance team come to the building?',
      options: [
        { text: 'Tuesday the 20th',   isCorrect: false, rationale: 'Tuesday is not the day mentioned.' },
        { text: 'Wednesday the 21st', isCorrect: false, rationale: 'Wednesday is the deadline to call back, not the maintenance day.' },
        { text: 'Thursday the 22nd',  isCorrect: true,  rationale: 'Mr Thompson says "coming to your building on Thursday the twenty-second."' },
        { text: 'Friday the 23rd',    isCorrect: false, rationale: 'Friday is not the day mentioned.' },
      ],
    },
  },
  // Q2 — Detail: time window
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b1', 'detail', 'numbers', 'voicemail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Thompson (landlord, male adult, voicemail)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'Between what hours will the maintenance work take place?',
      options: [
        { text: '9am to 12pm',  isCorrect: false, rationale: 'Morning hours are not the time window given.' },
        { text: '10am to 2pm',  isCorrect: false, rationale: 'This window is not the one stated.' },
        { text: '2pm to 5pm',   isCorrect: true,  rationale: 'Mr Thompson says "between two and five in the afternoon."' },
        { text: 'All day',      isCorrect: false, rationale: 'The work is limited to a three-hour window in the afternoon.' },
      ],
    },
  },
  // Q3 — Detail: what will be affected
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b1', 'detail', 'voicemail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Thompson (landlord, male adult, voicemail)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What will tenants not have access to during the work?',
      options: [
        { text: 'Electricity',     isCorrect: false, rationale: 'Electricity is not mentioned as affected.' },
        { text: 'Hot water',       isCorrect: true,  rationale: 'Mr Thompson says "there will be no hot water in the entire building during those three hours."' },
        { text: 'Internet access', isCorrect: false, rationale: 'Internet is not mentioned.' },
        { text: 'Parking',         isCorrect: false, rationale: 'Parking is mentioned separately — it requires a new permit next month, but is not being blocked.' },
      ],
    },
  },
  // Q4 — Implication: does tenant need to be home?
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b1', 'inference', 'voicemail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Thompson (landlord, male adult, voicemail)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'Does the tenant need to be home during the maintenance work?',
      options: [
        { text: 'Yes, the tenant must be at home',             isCorrect: false, rationale: 'The message says the opposite.' },
        { text: 'Yes, but only for the first hour',            isCorrect: false, rationale: 'This nuance is not stated — the tenant does not need to be home at all.' },
        { text: 'No, the tenant does not need to be home',     isCorrect: true,  rationale: 'Mr Thompson says "You do not need to be home for this work."' },
        { text: 'Only if they have questions or concerns',     isCorrect: false, rationale: 'Questions should be directed by phone, not by being home. The work itself does not require presence.' },
      ],
    },
  },
  // Q5 — Detail: deadline to call back
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b1', 'detail', 'voicemail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Mr Thompson (landlord, male adult, voicemail)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'By when should tenants call back with questions?',
      options: [
        { text: 'Before Thursday morning',      isCorrect: false, rationale: 'Thursday morning is when the work starts, not the deadline to call.' },
        { text: 'Before Wednesday evening',     isCorrect: true,  rationale: 'Mr Thompson says "please call me back on this number before Wednesday evening."' },
        { text: 'By the end of the week',       isCorrect: false, rationale: 'End of week is a vague answer not supported by the recording.' },
        { text: 'There is no deadline to call', isCorrect: false, rationale: 'An explicit deadline (Wednesday evening) is given.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 10 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 10 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
