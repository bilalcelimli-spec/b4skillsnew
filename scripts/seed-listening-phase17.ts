/**
 * LISTENING PHASE 17 — CORPORATE
 * Module: "Customer Service Call"
 * CEFR: B2 | Customer service dialogue | ~100 seconds
 * 6 questions — complaint handling, compensation, implication
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'corporate-customer-service-call';
const PRODUCT_LINE = 'CORPORATE';
const MODULE_TITLE = 'Customer Service Call';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 100;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  speakingRate: 0.92,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Linda (customer service rep, female, calm professional register): en-US-Neural2-F. Mr. Reeves (customer, male, frustrated at start, then accepting): en-US-Neural2-A, pitch -0.5. "TK dash 8847" — say "T-K dash eight-eight-four-seven" (spell out letters and digits). "fifteen percent" — FIFF-teen per-SENT. "fifteen" distinguished from "fifty." Pause 1.0s between turns.',
};

const HUMAN_SCRIPT = `[Linda — customer service representative, female adult | Mr. Reeves — customer, male adult, frustrated]

Linda: Good afternoon, TechSure customer support. My name is Linda. How can I help you today?
Mr. Reeves: Yes — I am quite frustrated, actually. I ordered a laptop stand two weeks ago, and it still has not arrived. I got a confirmation email saying five to seven working days.
Linda: I am so sorry to hear that, Mr. Reeves. I completely understand your frustration. Could I take your order number?
Mr. Reeves: It is TK dash 8847.
Linda: Thank you. Let me pull that up... I can see the order here. It looks like there was a delay at our fulfilment warehouse due to a stock discrepancy. The item only shipped this morning.
Mr. Reeves: This morning? So I have been waiting two weeks and you are only sending it today?
Linda: I understand that is not the experience we want you to have, and I sincerely apologise. What I can do is upgrade your delivery to express at no extra charge, so you should receive it tomorrow by noon. Additionally, I would like to offer you a fifteen percent discount code to use on a future order.
Mr. Reeves: Well... that is something, I suppose. What if I do not receive it tomorrow?
Linda: If the item has not arrived by tomorrow at five PM, please call us back and we will issue an immediate full refund. I will also flag your account internally so the team is aware.
Mr. Reeves: Alright. Thank you, Linda.
Linda: Thank you for your patience, Mr. Reeves. Have a good afternoon.`;

const TTS_SCRIPT = `Good afternoon. TechSure customer support. My name is Linda. How can I help you today?
Yes. I am quite frustrated, actually. I ordered a laptop stand two weeks ago and it still has not arrived. I got a confirmation email saying five to seven working days.
I am so sorry to hear that, Mr. Reeves. I completely understand your frustration. Could I take your order number?
It is T-K dash 8-8-4-7.
Thank you. Let me pull that up. I can see the order here. It looks like there was a delay at our fulfilment warehouse due to a stock discrepancy. The item only shipped this morning.
This morning? So I have been waiting two weeks and you are only sending it today?
I understand that is not the experience we want you to have, and I sincerely apologise. What I can do is upgrade your delivery to express at no extra charge, so you should receive it tomorrow by noon. Additionally, I would like to offer you a fifteen percent discount code to use on a future order.
Well. That is something, I suppose. What if I do not receive it tomorrow?
If the item has not arrived by tomorrow at five PM, please call us back and we will issue an immediate full refund. I will also flag your account internally so the team is aware.
Alright. Thank you, Linda.
Thank you for your patience, Mr. Reeves. Have a good afternoon.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Two clearly differentiated voices: Linda (calm, empathetic professional) vs Mr. Reeves (frustrated initially, softening).
- "TK dash 8847" — dictate as "T-K-dash-eight-eight-four-seven." Verify character-by-character synthesis.
- "fifteen percent" — FIFF-teen (not FIFTY percent). Critical distinction; verify TTS.
- "express delivery" — EK-spres deh-LIV-er-ee; standard compound.
- "fulfilment warehouse" — ful-FIL-ment WARE-house; British spelling ("fulfilment" vs "fulfillment").
- "stock discrepancy" — dis-KREP-un-see; verify five-syllable word.
- Pause 1.0s between turns. Linda's tone: consistently warm even when Mr. Reeves is hostile.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — customer service dialogue, complaint handling, conditional promises.
✓ Corporate product line — authentic customer service interaction.
✓ Q3 tests understanding of cause of delay (stock discrepancy at fulfilment warehouse).
✓ Q5 tests tracking of two-part compensation offer (express delivery + 15% discount code).
✓ Q6 tests conditional implication (if item doesn't arrive by 5pm = full refund).
✓ IRT range 0.3 to 0.8 appropriate for B2 corporate.
HUMAN REVIEW: Confirm "fifteen percent" vs "fifty percent" disambiguation in audio.
`;

const items = [
  // Q1 — Detail: what Mr. Reeves ordered
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'customer-service', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Linda (customer service representative, female adult)', 'Mr. Reeves (customer, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What did Mr. Reeves order?',
      options: [
        { text: 'A laptop',           isCorrect: false, rationale: 'A laptop is not what he ordered — he ordered a laptop stand.' },
        { text: 'A phone charger',    isCorrect: false, rationale: 'A phone charger is not mentioned.' },
        { text: 'A keyboard',         isCorrect: false, rationale: 'A keyboard is not mentioned.' },
        { text: 'A laptop stand',     isCorrect: true,  rationale: 'Mr. Reeves says "I ordered a laptop stand two weeks ago."' },
      ],
    },
  },
  // Q2 — Detail: how long ago the order was placed
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'customer-service', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Linda (customer service representative, female adult)', 'Mr. Reeves (customer, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'How long ago did Mr. Reeves place his order?',
      options: [
        { text: 'Five days ago',   isCorrect: false, rationale: 'Five days is within the expected delivery window; not the time given.' },
        { text: 'One week ago',    isCorrect: false, rationale: 'One week is not the time stated.' },
        { text: 'Two weeks ago',   isCorrect: true,  rationale: 'Mr. Reeves says "I ordered a laptop stand two weeks ago."' },
        { text: 'Three weeks ago', isCorrect: false, rationale: 'Three weeks is not the time stated.' },
      ],
    },
  },
  // Q3 — Detail: cause of delay
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'customer-service', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Linda (customer service representative, female adult)', 'Mr. Reeves (customer, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What caused the delay in delivery?',
      options: [
        { text: 'A postal strike',                                    isCorrect: false, rationale: 'A postal strike is not mentioned.' },
        { text: 'An incorrect delivery address',                      isCorrect: false, rationale: 'An address error is not mentioned.' },
        { text: 'A stock discrepancy at the fulfilment warehouse',    isCorrect: true,  rationale: 'Linda says "a delay at our fulfilment warehouse due to a stock discrepancy."' },
        { text: 'The item was discontinued',                          isCorrect: false, rationale: 'The item was not discontinued; it has now shipped.' },
      ],
    },
  },
  // Q4 — Detail: when the item shipped
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'customer-service', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Linda (customer service representative, female adult)', 'Mr. Reeves (customer, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'When did the item actually ship?',
      options: [
        { text: 'The previous day',  isCorrect: false, rationale: 'It shipped this morning, not yesterday.' },
        { text: 'Last Friday',       isCorrect: false, rationale: 'Friday is not when it shipped.' },
        { text: 'A week ago',        isCorrect: false, rationale: 'A week ago is not when it shipped.' },
        { text: 'That morning — the day of the call', isCorrect: true, rationale: 'Linda says "The item only shipped this morning."' },
      ],
    },
  },
  // Q5 — Detail: what compensation Linda offers
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'compensation', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Linda (customer service representative, female adult)', 'Mr. Reeves (customer, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'What two things does Linda offer Mr. Reeves?',
      options: [
        { text: 'A full refund immediately and a replacement item',       isCorrect: false, rationale: 'A full refund is only offered as a conditional (if the item doesn\'t arrive). No replacement is offered.' },
        { text: 'Free membership and express delivery',                   isCorrect: false, rationale: 'Free membership is not offered.' },
        { text: 'Express delivery upgrade plus a 15% discount code',     isCorrect: true,  rationale: 'Linda offers "upgrade your delivery to express at no extra charge" and "a fifteen percent discount code."' },
        { text: 'A full refund and a 10% discount code',                  isCorrect: false, rationale: 'The refund is conditional; the discount is 15%, not 10%.' },
      ],
    },
  },
  // Q6 — Conditional: what happens if item doesn't arrive by 5pm
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'inference', 'conditional', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Linda (customer service representative, female adult)', 'Mr. Reeves (customer, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 6,
      prompt: 'What will happen if the item does not arrive by 5pm the next day?',
      options: [
        { text: 'A replacement will be sent automatically',  isCorrect: false, rationale: 'A replacement is not the stated outcome; a refund is.' },
        { text: 'Mr. Reeves must visit a TechSure store',   isCorrect: false, rationale: 'Visiting a store is not mentioned.' },
        { text: 'He will receive store credit',              isCorrect: false, rationale: 'Store credit is not the compensation offered.' },
        { text: 'An immediate full refund will be issued',   isCorrect: true,  rationale: 'Linda says "If the item has not arrived by tomorrow at five PM, please call us back and we will issue an immediate full refund."' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 17 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 17 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
