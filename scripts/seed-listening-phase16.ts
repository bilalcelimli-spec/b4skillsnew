/**
 * LISTENING PHASE 16 — CORPORATE
 * Module: "Monday Team Standup"
 * CEFR: B2 | Workplace meeting | ~90 seconds
 * 6 questions — meeting language, task tracking, implicit meaning
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'corporate-monday-standup';
const PRODUCT_LINE = 'CORPORATE';
const MODULE_TITLE = 'Monday Team Standup';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 90;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.91,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Four voices: Sarah (manager, female), Jake (male), Aisha (female), Tom (male, on a call from Berlin — slight phone/distant audio quality if possible). "Hendricks" — HEN-driks. "analytics" — an-uh-LIT-iks. Tom\'s voice slightly thinner. Pause 0.8s between turns. Professional meeting register.',
};

const HUMAN_SCRIPT = `[Sarah — manager, female adult | Jake — team member, male adult | Aisha — team member, female adult | Tom — team member, male adult, joining remotely from Berlin]

Sarah: OK, good morning everyone. Quick Monday standup. Let us keep it brief. Jake, let us start with you.
Jake: Sure. Last week I finished the copy for the Hendricks landing page. I sent it to the client for approval on Friday. Now I am waiting on their feedback before I can move to phase two.
Sarah: Good. Anything blocking you right now?
Jake: Not yet, but if they do not respond by Wednesday, we might need to push the launch date.
Sarah: Noted. I will follow up with their contact this afternoon. Aisha?
Aisha: I am still working on the analytics dashboard. I hit a small problem with the data integration on Thursday — there was a mismatch in how the two systems format dates. I sorted it yesterday, so I am back on track. I should have a working prototype ready by Thursday.
Sarah: Great. Tom, you are joining us from Berlin today, right?
Tom: Yes, I am here for three meetings with the logistics client. The first one is at two this afternoon, and then dinner this evening. The rest are Tuesday and Wednesday.
Sarah: Can you send a brief update to the team channel after each meeting? Even just a one-line summary.
Tom: Of course. Will do.
Sarah: Perfect. Thanks everyone. Have a good week.`;

const TTS_SCRIPT = `OK, good morning everyone. Quick Monday standup. Let us keep it brief. Jake, let us start with you.
Sure. Last week I finished the copy for the Hendricks landing page. I sent it to the client for approval on Friday. Now I am waiting on their feedback before I can move to phase two.
Good. Anything blocking you right now?
Not yet, but if they do not respond by Wednesday, we might need to push the launch date.
Noted. I will follow up with their contact this afternoon. Aisha?
I am still working on the analytics dashboard. I hit a small problem with the data integration on Thursday. There was a mismatch in how the two systems format dates. I sorted it yesterday, so I am back on track. I should have a working prototype ready by Thursday.
Great. Tom, you are joining us from Berlin today, right?
Yes, I am here for three meetings with the logistics client. The first one is at two this afternoon, and then dinner this evening. The rest are Tuesday and Wednesday.
Can you send a brief update to the team channel after each meeting? Even just a one-line summary.
Of course. Will do.
Perfect. Thanks everyone. Have a good week.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Four distinct voices. If only two are available: alternate male/female per speaker.
- Tom's audio should sound slightly more distant or compressed (phone quality) for realism.
- "Hendricks" — HEN-driks; common TTS surname, should be fine.
- "analytics" — an-uh-LIT-iks; verify TTS does not stress first syllable (AN-uh-lit-iks is wrong).
- "mismatch" — stress first syllable: MIS-match.
- "phase two" — natural; no special handling.
- Pause 0.8–1.0s between turns; meeting rhythm, not overly slow.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — workplace standup, conditional statements, implicit meaning (Q2: consequence if no response).
✓ Corporate product line — four-speaker meeting is authentic professional content.
✓ Q3 tests understanding of a technical problem explained informally ("mismatch in date formatting").
✓ Q6 tests understanding of a specific action request made at the end.
✓ IRT range 0.2 to 0.7 appropriate for B2 corporate.
HUMAN REVIEW: Confirm four-voice differentiation and Tom's remote quality.
`;

const items = [
  // Q1 — Detail: what Jake finished last week
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'meeting', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 4, speakers: ['Sarah (manager, female adult)', 'Jake (team member, male adult)', 'Aisha (team member, female adult)', 'Tom (team member, male adult, remote)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What task did Jake complete last week?',
      options: [
        { text: 'He built the analytics dashboard',               isCorrect: false, rationale: 'The analytics dashboard is Aisha\'s task.' },
        { text: 'He wrote the copy for the Hendricks landing page', isCorrect: true, rationale: 'Jake says "Last week I finished the copy for the Hendricks landing page."' },
        { text: 'He sent the final project report to the client',  isCorrect: false, rationale: 'A project report is not Jake\'s task.' },
        { text: 'He prepared a client presentation',             isCorrect: false, rationale: 'A presentation is not what Jake completed.' },
      ],
    },
  },
  // Q2 — Implication: what happens if client doesn't respond by Wednesday
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'inference', 'meeting', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 4, speakers: ['Sarah (manager, female adult)', 'Jake (team member, male adult)', 'Aisha (team member, female adult)', 'Tom (team member, male adult, remote)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 2,
      prompt: 'What will happen if the client does not respond by Wednesday?',
      options: [
        { text: 'Jake will cancel the project',              isCorrect: false, rationale: 'Jake does not have the authority to cancel the project and does not suggest this.' },
        { text: 'Sarah will call the client immediately',    isCorrect: false, rationale: 'Sarah says she will follow up this afternoon, but not cancel if no response by Wed.' },
        { text: 'The launch date may need to be pushed',    isCorrect: true,  rationale: 'Jake says "if they do not respond by Wednesday, we might need to push the launch date."' },
        { text: 'Phase two will start without approval',    isCorrect: false, rationale: 'Jake says he is waiting on feedback before moving to phase two — the opposite.' },
      ],
    },
  },
  // Q3 — Detail: Aisha's problem
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'meeting', 'technical', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 4, speakers: ['Sarah (manager, female adult)', 'Jake (team member, male adult)', 'Aisha (team member, female adult)', 'Tom (team member, male adult, remote)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What problem did Aisha encounter on Thursday?',
      options: [
        { text: 'The analytics server crashed',                          isCorrect: false, rationale: 'A server crash is not described.' },
        { text: 'She lost access to the client data files',              isCorrect: false, rationale: 'Lost files are not mentioned.' },
        { text: 'A mismatch in how two systems formatted dates',        isCorrect: true,  rationale: 'Aisha says "there was a mismatch in how the two systems format dates."' },
        { text: 'The client changed the analytics requirements',        isCorrect: false, rationale: 'A change in requirements is not mentioned.' },
      ],
    },
  },
  // Q4 — Detail: when Aisha's prototype will be ready
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'meeting', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 4, speakers: ['Sarah (manager, female adult)', 'Jake (team member, male adult)', 'Aisha (team member, female adult)', 'Tom (team member, male adult, remote)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'By when will Aisha\'s working prototype be ready?',
      options: [
        { text: 'By Wednesday',  isCorrect: false, rationale: 'Wednesday is not Aisha\'s target date.' },
        { text: 'By Thursday',   isCorrect: true,  rationale: 'Aisha says "I should have a working prototype ready by Thursday."' },
        { text: 'By Friday',     isCorrect: false, rationale: 'Friday is not Aisha\'s target date.' },
        { text: 'By Monday',     isCorrect: false, rationale: 'The meeting is on Monday — the prototype is not yet ready.' },
      ],
    },
  },
  // Q5 — Detail: where Tom is calling from
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'meeting', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 4, speakers: ['Sarah (manager, female adult)', 'Jake (team member, male adult)', 'Aisha (team member, female adult)', 'Tom (team member, male adult, remote)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'Where is Tom joining the call from?',
      options: [
        { text: 'Paris',     isCorrect: false, rationale: 'Paris is not where Tom is.' },
        { text: 'Amsterdam', isCorrect: false, rationale: 'Amsterdam is not where Tom is.' },
        { text: 'Berlin',    isCorrect: true,  rationale: 'Sarah asks "you are joining us from Berlin today, right?" and Tom confirms.' },
        { text: 'London',    isCorrect: false, rationale: 'London is not mentioned as Tom\'s location.' },
      ],
    },
  },
  // Q6 — Detail: what Sarah asks Tom to do
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'instruction', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 4, speakers: ['Sarah (manager, female adult)', 'Jake (team member, male adult)', 'Aisha (team member, female adult)', 'Tom (team member, male adult, remote)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'What does Sarah ask Tom to do after each client meeting?',
      options: [
        { text: 'Send a full written report',           isCorrect: false, rationale: 'Sarah asks for only a brief one-line update, not a full report.' },
        { text: 'Call Sarah directly with an update',   isCorrect: false, rationale: 'Sarah asks for a message in the team channel, not a direct call.' },
        { text: 'Write a meeting agenda for the next session', isCorrect: false, rationale: 'An agenda is not what is requested.' },
        { text: 'Post a brief one-line update in the team channel', isCorrect: true, rationale: 'Sarah says "Can you send a brief update to the team channel after each meeting? Even just a one-line summary."' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 16 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 16 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
