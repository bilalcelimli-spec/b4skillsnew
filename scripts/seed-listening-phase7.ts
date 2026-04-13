/**
 * LISTENING PHASE 7 — JUNIOR SUITE
 * Module: "Teen Traveller Interview"
 * CEFR: B1 | Ages 11–14 | ~88 seconds
 * 6 questions — radio interview, narrative, inference
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'junior-teen-traveller-interview';
const PRODUCT_LINE = 'JUNIOR_SUITE';
const MODULE_TITLE = 'Teen Traveller Interview';
const CEFR_BAND = 'B1';
const ESTIMATED_DURATION_SECONDS = 88;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  speakingRate: 0.90,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two-speaker dialogue. Jamie (adult host): en-US-Neural2-D, speakingRate 0.90, pitch 0.0. Zara (13-year-old girl): en-US-Neural2-F, speakingRate 0.90, pitch 1.0 to suggest a younger/higher voice. "Morocco" — muh-ROK-oh; verify. "Mount Fuji" — fyoo-JEE; verify. Pause 1.2s between speaker turns.',
};

const HUMAN_SCRIPT = `[Jamie — youth radio host, adult male | Zara — guest, female, age 13]

Jamie: Welcome back to Youth Wave Radio. I am here today with Zara, who at just thirteen has already visited twelve countries. Zara, that is incredible. What got you into travelling so young?
Zara: Well, my parents are photographers, so we travel a lot for their work. I started keeping a travel journal when I was nine, and now I actually write a blog about every place we visit.
Jamie: What has been your favourite destination so far?
Zara: Definitely Japan. The food was amazing, the people were so kind, and everything was so organised. I also got to see Mount Fuji, which was unbelievable.
Jamie: Have you ever had a bad experience while travelling?
Zara: One time in Morocco, we missed our connecting flight and had to wait at the airport for seven hours. I was quite upset at first, but then we started talking to a local family and it turned into one of my favourite memories.
Jamie: That is a great story. What advice would you give to other young people who want to travel?
Zara: Keep a journal of everything — not just the good things. And always try the local food. You never know what you might love!
Jamie: Brilliant advice. Thanks, Zara!`;

const TTS_SCRIPT = `Welcome back to Youth Wave Radio. I am here today with Zara, who at just thirteen has already visited twelve countries. Zara, that is incredible. What got you into travelling so young?
Well, my parents are photographers, so we travel a lot for their work. I started keeping a travel journal when I was nine, and now I actually write a blog about every place we visit.
What has been your favourite destination so far?
Definitely Japan. The food was amazing, the people were so kind, and everything was so organised. I also got to see Mount Fuji, which was unbelievable.
Have you ever had a bad experience while travelling?
One time in Morocco, we missed our connecting flight and had to wait at the airport for seven hours. I was quite upset at first, but then we started talking to a local family and it turned into one of my favourite memories.
That is a great story. What advice would you give to other young people who want to travel?
Keep a journal of everything. Not just the good things. And always try the local food. You never know what you might love.
Brilliant advice. Thanks, Zara.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Two voices required: Jamie (adult, calm host) and Zara (teen girl, enthusiastic).
- "Morocco" — verify pronunciation: muh-ROK-oh (NOT muh-ROH-koh or MAR-oh-koh).
- "Mount Fuji" — FYOO-jee; common TTS errors here, verify.
- "travel journal" — natural compound, even stress.
- "connecting flight" — con-NEK-ting FLIYT; clear.
- Use different TTS voice profiles for each speaker if possible.
- Pause 0.8–1.0s between each speaker turn.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B1 — autobiographical narrative, expressed opinions, reasons, some inference.
✓ Junior-appropriate — travel theme, no adult content.
✓ Two clearly differentiated speakers.
✓ Questions cover factual recall (Q1–5) and inferred meaning (Q6 — advice/opinion).
✓ Distractors plausible; "Morocco" and "Japan" are both mentioned, requiring discrimination.
✓ IRT difficulty range -0.2 to 0.3 appropriate for B1 Junior audience.
HUMAN REVIEW: Verify pronunciation notes are followed in final audio.
`;

const items = [
  // Q1 — Detail: reason for travel
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'junior', 'interview', 'travel', 'b1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Jamie (youth radio host, adult male)', 'Zara (guest, female, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'Why does Zara travel so much?',
      options: [
        { text: 'She won a travel competition',             isCorrect: false, rationale: 'No competition is mentioned.' },
        { text: 'Her parents are photographers who travel for work', isCorrect: true, rationale: 'Zara says "my parents are photographers, so we travel a lot for their work."' },
        { text: 'Her school arranges international trips',  isCorrect: false, rationale: 'Zara\'s school is not the reason for her travel.' },
        { text: 'She travels alone to learn independence',  isCorrect: false, rationale: 'Zara travels with her family, not alone.' },
      ],
    },
  },
  // Q2 — Detail: when she started her journal
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'interview', 'travel', 'b1', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Jamie (youth radio host, adult male)', 'Zara (guest, female, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'When did Zara start keeping a travel journal?',
      options: [
        { text: 'When she was seven',        isCorrect: false, rationale: 'Seven is not the age given.' },
        { text: 'When she was nine',         isCorrect: true,  rationale: 'Zara says "I started keeping a travel journal when I was nine."' },
        { text: 'When she was eleven',       isCorrect: false, rationale: 'Eleven is not mentioned in this context.' },
        { text: 'When she started her blog', isCorrect: false, rationale: 'She started the blog later — the journal came first, at age nine.' },
      ],
    },
  },
  // Q3 — Detail: favourite destination
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'interview', 'travel', 'b1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Jamie (youth radio host, adult male)', 'Zara (guest, female, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What is Zara\'s favourite destination so far?',
      options: [
        { text: 'Morocco', isCorrect: false, rationale: 'Morocco is where she had a bad experience, not her favourite.' },
        { text: 'France',  isCorrect: false, rationale: 'France is not mentioned in the interview.' },
        { text: 'Japan',   isCorrect: true,  rationale: 'Zara says "Definitely Japan" when asked about her favourite destination.' },
        { text: 'Australia', isCorrect: false, rationale: 'Australia is not mentioned.' },
      ],
    },
  },
  // Q4 — Detail: what went wrong in Morocco
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'junior', 'interview', 'travel', 'b1', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Jamie (youth radio host, adult male)', 'Zara (guest, female, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What went wrong during Zara\'s trip to Morocco?',
      options: [
        { text: 'They lost their luggage',             isCorrect: false, rationale: 'Luggage is not mentioned.' },
        { text: 'Their hotel was double-booked',        isCorrect: false, rationale: 'Hotel problems are not mentioned.' },
        { text: 'They missed their connecting flight',  isCorrect: true,  rationale: 'Zara says "we missed our connecting flight."' },
        { text: 'Their tour guide cancelled the trip',  isCorrect: false, rationale: 'A tour guide is not mentioned.' },
      ],
    },
  },
  // Q5 — Detail: how long they waited
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'junior', 'interview', 'travel', 'b1', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Jamie (youth radio host, adult male)', 'Zara (guest, female, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'How long did Zara and her family wait at the airport in Morocco?',
      options: [
        { text: 'Two hours',   isCorrect: false, rationale: 'Two hours is not the time stated.' },
        { text: 'Four hours',  isCorrect: false, rationale: 'Four hours is not the time stated.' },
        { text: 'Seven hours', isCorrect: true,  rationale: 'Zara says "we had to wait at the airport for seven hours."' },
        { text: 'Overnight',   isCorrect: false, rationale: 'She does not say they spent the night there.' },
      ],
    },
  },
  // Q6 — Advice / opinion: food recommendation
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'junior', 'interview', 'travel', 'b1', 'inference', 'opinion', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Jamie (youth radio host, adult male)', 'Zara (guest, female, age 13)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'opinion', questionNumber: 6,
      prompt: 'What advice does Zara give about food when travelling?',
      options: [
        { text: 'Only eat food you already know is safe',      isCorrect: false, rationale: 'Zara gives the opposite message — she encourages trying new foods.' },
        { text: 'Always try the local food',                   isCorrect: true,  rationale: 'Zara says "always try the local food. You never know what you might love."' },
        { text: 'Bring familiar food from home',               isCorrect: false, rationale: 'Bringing food from home is not suggested.' },
        { text: 'Stick to restaurants recommended by tourists', isCorrect: false, rationale: 'Tourist restaurants are not mentioned.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 7 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 7 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
