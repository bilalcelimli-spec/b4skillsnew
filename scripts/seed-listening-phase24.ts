/**
 * LISTENING PHASE 24 — SPECIALIZED
 * Module: "Listen and Write — Urban Green Infrastructure Briefing"
 * CEFR: C1 | Integrated productive skill — listen + extended writing | ~102 seconds
 * 4 MC comprehension questions + 1 extended writing task (productive)
 * Speaker: Dr. Fatima Osei, urban planning department
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'specialized-listen-write-green-spaces';
const PRODUCT_LINE = 'SPECIALIZED';
const MODULE_TITLE = 'Listen and Write — Urban Green Infrastructure Briefing';
const CEFR_BAND = 'C1';
const ESTIMATED_DURATION_SECONDS = 102;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.87,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Single speaker. Dr. Fatima Osei (urban planner, female adult, professional briefing tone): en-US-Neural2-C. "four hectares" — FOOR HEK-tarz; verify "hectares" is not rendered as "hektares." "three-point-eight" — verify decimal numeral synthesis. "net-zero" — NET-ZERO, level compound stress. "participatory" — par-TIS-ih-puh-TOR-ee; five syllables; HIGH RISK for TTS mispronunciation. Consider SSML phoneme or substitute "community participation" in TTS script. Pause 1.5s between the four proposals (natural briefing structure). Overall tone: measured, informative, not conversational.',
};

const HUMAN_SCRIPT = `[Dr. Fatima Osei — urban planning department, female adult]

Good morning. I am here to summarise the key proposals from the City Green Infrastructure Report. I want to be clear that this is a preliminary briefing, and formal consultation will follow.

There are four proposals on the table. First, the conversion of the Dalton Road industrial site into a community woodland — approximately four hectares. This would be the largest new green space created in this district in over forty years. Estimated completion: two and a half years from approval.

Second, a network of green corridors connecting existing parks through tree-lined pedestrian routes. Studies from comparable European cities suggest these corridors reduce urban surface temperatures by an average of three-point-eight degrees Celsius during summer months.

Third, mandatory green roofing requirements for all new commercial buildings over two thousand square metres. This is expected to face some resistance from developers, but the planning committee has agreed it aligns with the council's net-zero targets.

Fourth, a participatory map — a digital platform allowing residents to identify and propose green space improvements in their own neighbourhoods. This is low-cost and builds community investment in the long term.

All four proposals require approval from the council and — for the first two — funding from the Regional Environment Fund. Questions will be taken at the end of the full presentation.`;

const TTS_SCRIPT = `Good morning. I am here to summarise the key proposals from the City Green Infrastructure Report. I want to be clear that this is a preliminary briefing, and formal consultation will follow.

There are four proposals on the table. First, the conversion of the Dalton Road industrial site into a community woodland. Approximately four hectares. This would be the largest new green space created in this district in over forty years. Estimated completion: two and a half years from approval.

Second, a network of green corridors connecting existing parks through tree-lined pedestrian routes. Studies from comparable European cities suggest these corridors reduce urban surface temperatures by an average of three point eight degrees Celsius during summer months.

Third, mandatory green roofing requirements for all new commercial buildings over two thousand square metres. This is expected to face some resistance from developers, but the planning committee has agreed it aligns with the council's net-zero targets.

Fourth, a community participation map. A digital platform allowing residents to identify and propose green space improvements in their own neighbourhoods. This is low-cost and builds community investment in the long term.

All four proposals require approval from the council. And for the first two, funding from the Regional Environment Fund. Questions will be taken at the end of the full presentation.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "hectares" — HEK-tarz; two syllables; TTS may mispronounce as three. Verify.
- "three-point-eight degrees Celsius" — written as "three point eight degrees Celsius" in TTS script; verify decimal is rendered as "three point eight" not "3.8."
- "two thousand square metres" — verify numeric rendering.
- "participatory" — par-TIS-ih-puh-TOR-ee; VERY HIGH RISK. Replaced with "community participation" in TTS script. Human assembly notes: original word preferred in audio.
- "net-zero" — compound; verify even stress NET-ZERO.
- "Dalton Road" — proper noun; should synthesise fine as generic street name.
- "Regional Environment Fund" — four-word proper noun; verify clarity.
- Pause 1.5s between proposals (after each "First,", "Second,", "Third,", "Fourth,"). Use SSML break tags if needed.
- Pace: Deliberate briefing pace — measured pauses aid note-taking.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C1 — informational monologue, academic/policy register, extended note-taking + writing.
✓ Specialized product line — integrated productive skill (listen then write).
✓ MC Q1 (Dalton Road proposal) — C1 easy; factual, stated explicitly.
✓ MC Q2 (four hectares size) — C1 easy; specific figure.
✓ MC Q3 (3.8 degree temperature reduction) — C1 medium; requires tracking precise figure over long monologue.
✓ MC Q4 (fourth proposal = participatory map) — C1 ; requires distinguishing four serial proposals.
✓ Productive Q5 (extended writing) — C1 ; summary task: 60-80 words, 4 proposals named, 1 key detail each.
✓ Scoring rubric stored in options array with isCorrect:true for reference.
✓ IRT: MC 0.5–0.9; productive task guessing param set to 0.0 (not applicable).
HUMAN REVIEW: Confirm scoring rubric wording is appropriate for assessor guide.
`;

const items = [
  // Q1 — C1 easy: Dalton Road proposal
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'specialized', 'c1', 'listen-and-write', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Fatima Osei (urban planner, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What is proposed for the Dalton Road industrial site?',
      options: [
        { text: 'A new sports centre',           isCorrect: false, rationale: 'A sports centre is not proposed.' },
        { text: 'A community woodland',          isCorrect: true,  rationale: 'The speaker says "the conversion of the Dalton Road industrial site into a community woodland."' },
        { text: 'A residential housing estate',  isCorrect: false, rationale: 'Housing is not proposed for this site.' },
        { text: 'A public car park',             isCorrect: false, rationale: 'A car park is not proposed.' },
      ],
    },
  },
  // Q2 — C1 easy: size of woodland
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.6, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'specialized', 'c1', 'listen-and-write', 'detail', 'number', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Fatima Osei (urban planner, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'How large is the proposed community woodland at Dalton Road?',
      options: [
        { text: 'Two hectares',         isCorrect: false, rationale: 'Not the stated size.' },
        { text: 'Four hectares',        isCorrect: true,  rationale: 'The speaker says "approximately four hectares."' },
        { text: 'Six hectares',         isCorrect: false, rationale: 'Not the stated size.' },
        { text: 'Forty hectares',       isCorrect: false, rationale: '"Forty years" was mentioned as the historical gap, not the size.' },
      ],
    },
  },
  // Q3 — C1 medium: precise figure from proposal 2
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'specialized', 'c1', 'listen-and-write', 'detail', 'number', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Fatima Osei (urban planner, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'By how much do green corridors reduce urban surface temperatures during summer months, according to the studies cited?',
      options: [
        { text: '2.4 degrees Celsius',   isCorrect: false, rationale: 'Not the stated figure.' },
        { text: '3.8 degrees Celsius',   isCorrect: true,  rationale: 'The speaker says "reduce urban surface temperatures by an average of three-point-eight degrees Celsius."' },
        { text: '4.2 degrees Celsius',   isCorrect: false, rationale: 'Not the stated figure.' },
        { text: '5.0 degrees Celsius',   isCorrect: false, rationale: 'Not the stated figure.' },
      ],
    },
  },
  // Q4 — C1: identifying the fourth proposal
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'specialized', 'c1', 'listen-and-write', 'detail', 'ordering', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Fatima Osei (urban planner, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What is the fourth proposal described in the briefing?',
      options: [
        { text: 'Mandatory green roofing for new commercial buildings',  isCorrect: false, rationale: 'Mandatory green roofing is the third proposal, not the fourth.' },
        { text: 'A community woodland at Dalton Road',                    isCorrect: false, rationale: 'The community woodland is the first proposal.' },
        { text: 'A network of green corridors between parks',            isCorrect: false, rationale: 'Green corridors are the second proposal.' },
        { text: 'A participatory digital map for residents to propose improvements', isCorrect: true, rationale: 'The speaker says "Fourth, a participatory map — a digital platform allowing residents to identify and propose green space improvements."' },
      ],
    },
  },
  // Q5 — PRODUCTIVE TASK (extended writing), stored as MULTIPLE_CHOICE type with scoring rubric
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.0,
    tags: ['listening', 'specialized', 'c1', 'listen-and-write', 'productive-task', 'extended-writing', 'writing', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Fatima Osei (urban planner, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'extended-writing', questionNumber: 5,
      taskType: 'productive',
      responseFormat: 'written',
      wordCountTarget: '60–80 words',
      prompt: 'Write a summary (60–80 words) of the four proposals described in the briefing. Name each proposal and include one key detail about each.',
      options: [
        {
          text: 'Full marks (all 4 proposals named with accurate key details, clear English)',
          isCorrect: true,
          rationale: 'SCORING RUBRIC (8 points total): Content accuracy (4 pts) — 1 pt per proposal correctly named and described: (1) Community woodland / Dalton Road / ~4ha; (2) Green corridors / temperature reduction of 3.8°C; (3) Green roofing / new commercial buildings >2000m²; (4) Participatory digital map / low-cost resident input. Language quality (2 pts) — E2: appropriate vocabulary, sentence variety, no major errors. Organisation (2 pts) — logical sequencing, appropriate connectors. Penalty: responses outside 50–100 words deduct 1 pt from total.',
        },
        {
          text: 'Partial marks (3 proposals named)',
          isCorrect: false,
          rationale: '3 points for content (3 proposals), language and organisation judged independently.',
        },
        {
          text: 'Partial marks (2 proposals named)',
          isCorrect: false,
          rationale: '2 points for content (2 proposals), language and organisation judged independently.',
        },
        {
          text: 'Minimal marks (1 proposal or inaccurate content)',
          isCorrect: false,
          rationale: '1 point for content. Assessor note: inaccurate data (e.g. wrong size or wrong figure) scores 0 on that proposal sub-point.',
        },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 24 — ${MODULE_TITLE} (${items.length} items — 4 MC + 1 productive)…`);
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
  console.log(`✓ Listening Phase 24 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
