/**
 * LISTENING PHASE 11 — 15-MINUTE DIAGNOSTIC
 * Module: "Office Discussion"
 * CEFR: B2 | Diagnostic, workplace dialogue | ~70 seconds
 * 5 questions — inference, implicit meaning, problem-solving
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'diagnostic-office-discussion';
const PRODUCT_LINE = 'DIAGNOSTIC';
const MODULE_TITLE = 'Office Discussion';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 70;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.92,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two professional adult voices. Rachel (project manager, female): en-US-Neural2-C, neutral professional register. Ben (team member, male): en-US-Neural2-A, slightly casual. Natural workplace pace. "Henderson" — HEN-der-sun, clear. Pause 1.0s between turns. No exaggerated emotion.',
};

const HUMAN_SCRIPT = `[Rachel — project manager, female adult | Ben — team member, male adult]

Rachel: Ben, I want to talk about the client presentation next Thursday. I am a bit worried about the timing.
Ben: Why? Have they changed the slot?
Rachel: No, but three of our key slides still need updating with the latest sales data, and Tom is away until Wednesday.
Ben: Could someone else update them?
Rachel: Possibly. Maria knows the system, but she is working on the Henderson account. I do not want to pull her off that.
Ben: What if I stay late on Wednesday evening? Tom will be back, and we could get the slides done together in a couple of hours.
Rachel: That could work. But are you sure Tom will be ready after his trip?
Ben: He told me he is flying back Tuesday night, so he should be fine. And honestly, it is a two-hour job maximum.
Rachel: OK. Let me check with Tom and confirm. If that plan works, I will feel a lot better about the presentation.
Ben: I will send him a message now so he is prepared.`;

const TTS_SCRIPT = `Ben, I want to talk about the client presentation next Thursday. I am a bit worried about the timing.
Why? Have they changed the slot?
No, but three of our key slides still need updating with the latest sales data, and Tom is away until Wednesday.
Could someone else update them?
Possibly. Maria knows the system, but she is working on the Henderson account. I do not want to pull her off that.
What if I stay late on Wednesday evening? Tom will be back, and we could get the slides done together in a couple of hours.
That could work. But are you sure Tom will be ready after his trip?
He told me he is flying back Tuesday night, so he should be fine. And honestly, it is a two-hour job maximum.
OK. Let me check with Tom and confirm. If that plan works, I will feel a lot better about the presentation.
I will send him a message now so he is prepared.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Two professional voices; subtle contrast in gender and slight register difference.
- "Henderson" — HEN-der-sun; common surname, likely fine in TTS.
- "flying back Tuesday night" — natural phrase, no unusual pronunciation.
- "a two-hour job" — natural British/American phrasing.
- Avoid robotic pauses inside each turn; allow natural sentence-level rhythm.
- Pause 1.0s between turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — workplace dialogue with implicit information, problem recognition, conditional planning.
✓ Diagnostic appropriate — 5 items at B1/B2 boundary; Q4 and Q5 require multi-step inference.
✓ Q3 requires understanding of a reason given implicitly ("working on the Henderson account" = unavailable).
✓ Q4 asks what Ben proposes — requires integrating information from two turns.
✓ IRT range 0.1 to 0.6 appropriate for B2 diagnostic boundary.
HUMAN REVIEW: Naturalness of dialogue rhythm; no over-pacing.
`;

const items = [
  // Q1 — Detail/inference: what is Rachel's concern
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b2', 'inference', 'workplace', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Rachel (project manager, female adult)', 'Ben (team member, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What is Rachel worried about?',
      options: [
        { text: 'The client has cancelled the presentation',   isCorrect: false, rationale: 'The client has not cancelled; Rachel confirms the slot has not changed.' },
        { text: 'Three slides need updating and Tom is away', isCorrect: true,  rationale: 'Rachel explains both issues: unsaved slides and Tom\'s absence until Wednesday.' },
        { text: 'The meeting room is double-booked',          isCorrect: false, rationale: 'No room booking issue is mentioned.' },
        { text: 'Maria does not know how to use the system',  isCorrect: false, rationale: 'Rachel says Maria DOES know the system; the issue is she is busy elsewhere.' },
      ],
    },
  },
  // Q2 — Detail: why the slides are a problem
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b2', 'detail', 'workplace', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Rachel (project manager, female adult)', 'Ben (team member, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'Why can the slides not be updated immediately?',
      options: [
        { text: 'The latest data has not been released yet',        isCorrect: false, rationale: 'The data exists; the problem is that Tom, who can do the update, is away.' },
        { text: 'Tom, who can update the slides, is away until Wednesday', isCorrect: true, rationale: 'Rachel says the slides need updating and "Tom is away until Wednesday."' },
        { text: 'The client changed the required content',          isCorrect: false, rationale: 'A change in content requirements is not mentioned.' },
        { text: 'The presentation software is not working',         isCorrect: false, rationale: 'No technical issue with the software is mentioned.' },
      ],
    },
  },
  // Q3 — Inference: why Maria cannot help
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b2', 'inference', 'workplace', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Rachel (project manager, female adult)', 'Ben (team member, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 3,
      prompt: 'Why does Rachel not want to ask Maria to update the slides?',
      options: [
        { text: 'Maria does not know how to update the slides',        isCorrect: false, rationale: 'Rachel says Maria knows the system; the problem is her current assignment.' },
        { text: 'Maria is on holiday',                                 isCorrect: false, rationale: 'Maria is at work — she is on a different account, not on holiday.' },
        { text: 'Maria is working on the Henderson account',           isCorrect: true,  rationale: 'Rachel says Maria is on the Henderson account and she does not want to pull her off it.' },
        { text: 'Maria and Rachel do not have a good working relationship', isCorrect: false, rationale: 'No interpersonal tension is implied.' },
      ],
    },
  },
  // Q4 — Detail/inference: Ben's proposed solution
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b2', 'inference', 'workplace', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Rachel (project manager, female adult)', 'Ben (team member, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'What solution does Ben propose?',
      options: [
        { text: 'Hire a freelancer to update the slides',          isCorrect: false, rationale: 'A freelancer is not mentioned.' },
        { text: 'Postpone the Thursday presentation',              isCorrect: false, rationale: 'Postponing is not Ben\'s suggestion.' },
        { text: 'He and Tom stay late Wednesday evening to update the slides together', isCorrect: true, rationale: 'Ben says "What if I stay late on Wednesday evening? Tom will be back, and we could get the slides done together."' },
        { text: 'Ask Rachel to update the slides herself',         isCorrect: false, rationale: 'Ben does not suggest this.' },
      ],
    },
  },
  // Q5 — Detail: when Tom is flying back
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'b2', 'detail', 'workplace', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Rachel (project manager, female adult)', 'Ben (team member, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'When is Tom flying back from his trip?',
      options: [
        { text: 'Monday',          isCorrect: false, rationale: 'Monday is not mentioned as his return.' },
        { text: 'Tuesday night',   isCorrect: true,  rationale: 'Ben says "He told me he is flying back Tuesday night."' },
        { text: 'Wednesday morning', isCorrect: false, rationale: 'Wednesday morning is when Rachel earlier implied Tom would be back, but Ben clarifies it is Tuesday night.' },
        { text: 'Thursday morning', isCorrect: false, rationale: 'Thursday is the presentation day — Tom will already be back by then.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 11 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 11 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
