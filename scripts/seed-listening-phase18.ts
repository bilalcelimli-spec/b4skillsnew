/**
 * LISTENING PHASE 18 — CORPORATE
 * Module: "Job Interview — Marketing Manager"
 * CEFR: C1 | Professional interview dialogue | ~110 seconds
 * 6 questions — professional discourse, inference, evaluation
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'corporate-job-interview-marketing';
const PRODUCT_LINE = 'CORPORATE';
const MODULE_TITLE = 'Job Interview — Marketing Manager';
const CEFR_BAND = 'C1';
const ESTIMATED_DURATION_SECONDS = 110;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.89,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Claire (HR manager, female, professional interview register): en-US-Neural2-C. David (candidate, male, confident and articulate): en-US-Neural2-D. "thirty-two percent" — verify number synthesis: thirty-two, not three-two. "cross-functional" — KROSS-FUNK-shun-ul. "multi-market" — note hyphenated compound. "sidelined" — SIDE-lynd. Pause 1.0s between turns. Professional interview pace.',
};

const HUMAN_SCRIPT = `[Claire — HR manager, female adult | David — candidate, male adult]

Claire: David, thank you for coming in. You have had quite an impressive trajectory — regional marketing coordinator to head of brand within four years. Could you talk us through how that happened?
David: Of course. I joined the company at a time when they were genuinely struggling with brand identity — their messaging was inconsistent across channels. I proposed a full brand audit in my first month, which was a bit bold for a coordinator role, but my manager encouraged me to run with it. The audit identified three core issues, and I developed a twelve-month roadmap to address them. The results were strong — aided brand recall improved by thirty-two percent within the year — and I think that early initiative is what led to the faster-than-usual promotions.
Claire: That is impressive. What would you say your biggest professional challenge has been?
David: Honestly, it was managing a team that was resistant to change. When I introduced the new content strategy, two senior members pushed back quite hard. Rather than escalating immediately, I took them for individual conversations to understand their concerns. It turned out they felt their expertise was being sidelined. I revised the strategy to incorporate their input, and they became the most effective advocates for the change. I learned that resistance often masks a need for recognition.
Claire: That is a sophisticated read on team dynamics. One final question — where do you see yourself in five years?
David: I would like to be leading a cross-functional growth team, ideally in an international market context. I am genuinely drawn to the complexity of multi-market brand management.
Claire: Excellent. We will be in touch by the end of the week.`;

const TTS_SCRIPT = `David, thank you for coming in. You have had quite an impressive trajectory. Regional marketing coordinator to head of brand within four years. Could you talk us through how that happened?
Of course. I joined the company at a time when they were genuinely struggling with brand identity. Their messaging was inconsistent across channels. I proposed a full brand audit in my first month, which was a bit bold for a coordinator role, but my manager encouraged me to run with it. The audit identified three core issues, and I developed a twelve-month roadmap to address them. The results were strong. Aided brand recall improved by thirty-two percent within the year. And I think that early initiative is what led to the faster-than-usual promotions.
That is impressive. What would you say your biggest professional challenge has been?
Honestly, it was managing a team that was resistant to change. When I introduced the new content strategy, two senior members pushed back quite hard. Rather than escalating immediately, I took them for individual conversations to understand their concerns. It turned out they felt their expertise was being sidelined. I revised the strategy to incorporate their input, and they became the most effective advocates for the change. I learned that resistance often masks a need for recognition.
That is a sophisticated read on team dynamics. One final question. Where do you see yourself in five years?
I would like to be leading a cross-functional growth team, ideally in an international market context. I am genuinely drawn to the complexity of multi-market brand management.
Excellent. We will be in touch by the end of the week.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Two professional voices; David's voice should convey confident, articulate STAR-method storytelling.
- "thirty-two percent" — must say "thirty-TWO," not "thirty-too." Verify synthesis.
- "cross-functional" — KROSS-funk-shun-ul; five syllables; verify TTS renders clearly.
- "sidelined" — SIDE-lynd; past participle of sideline, should be fine.
- "multi-market" — MUL-tee-MAR-kit; compound adjective.
- "aided brand recall" — marketing term, natural; no pronunciation issues expected.
- Pause 1.0s between turns. Claire's questions: measured, evaluative. David's answers: fluent, longer turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C1 — professional interview, extended narrative, evaluative judgment, abstract concepts.
✓ Corporate product line — authentic B2/C1 interview scenario.
✓ Q2 tests understanding of brand audit metrics (32% brand recall improvement).
✓ Q4 tests understanding of the psychological insight (resistance masks need for recognition).
✓ Q5 tests specific method used (individual conversations, not escalation).
✓ Q6 tests future goals at C1 — requires parsing "cross-functional growth team" and "international market context."
✓ IRT range 0.5 to 1.0 appropriate for C1 corporate.
HUMAN REVIEW: Confirm 32% synthesis and cross-functional pronunciation.
`;

const items = [
  // Q1 — Detail: David's first role
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'corporate', 'c1', 'detail', 'interview', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Claire (HR manager, female adult)', 'David (candidate, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What was David\'s role when he first joined the company?',
      options: [
        { text: 'Head of brand',                      isCorrect: false, rationale: 'Head of brand is the role he reached after promotions, not his starting role.' },
        { text: 'Marketing director',                 isCorrect: false, rationale: 'Marketing director is not the role mentioned.' },
        { text: 'Brand analyst',                      isCorrect: false, rationale: 'Brand analyst is not the role mentioned.' },
        { text: 'Regional marketing coordinator',     isCorrect: true,  rationale: 'Claire introduces David\'s trajectory as "regional marketing coordinator to head of brand."' },
      ],
    },
  },
  // Q2 — Detail: what David proposed in first month
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'corporate', 'c1', 'detail', 'interview', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Claire (HR manager, female adult)', 'David (candidate, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What did David propose in his first month?',
      options: [
        { text: 'A new marketing campaign',   isCorrect: false, rationale: 'A campaign is not what David proposed initially.' },
        { text: 'A team restructure',         isCorrect: false, rationale: 'A team restructure is not what David proposed.' },
        { text: 'A customer satisfaction survey', isCorrect: false, rationale: 'A customer survey is not the proposal described.' },
        { text: 'A full brand audit',        isCorrect: true,  rationale: 'David says "I proposed a full brand audit in my first month."' },
      ],
    },
  },
  // Q3 — Detail: brand recall improvement
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'corporate', 'c1', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Claire (HR manager, female adult)', 'David (candidate, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'By how much did aided brand recall improve?',
      options: [
        { text: '12%', isCorrect: false, rationale: 'Twelve percent is not the figure stated.' },
        { text: '22%', isCorrect: false, rationale: 'Twenty-two percent is not the figure stated.' },
        { text: '32%', isCorrect: true,  rationale: 'David says "aided brand recall improved by thirty-two percent within the year."' },
        { text: '52%', isCorrect: false, rationale: 'Fifty-two percent is not the figure stated.' },
      ],
    },
  },
  // Q4 — Insight: what resistance often masks
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'corporate', 'c1', 'inference', 'insight', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Claire (HR manager, female adult)', 'David (candidate, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'What does David say he learned about resistance in the workplace?',
      options: [
        { text: 'It should be escalated to senior management immediately',    isCorrect: false, rationale: 'David explicitly chose NOT to escalate immediately.' },
        { text: 'It is a sign that the strategy needs to be replaced',       isCorrect: false, rationale: 'David revised the strategy to incorporate input, but not because the whole strategy was wrong.' },
        { text: 'It should be ignored to maintain project momentum',         isCorrect: false, rationale: 'David addressed the resistance directly, not ignored it.' },
        { text: 'Resistance often masks a need for recognition',             isCorrect: true,  rationale: 'David says "I learned that resistance often masks a need for recognition."' },
      ],
    },
  },
  // Q5 — Detail: how David handled resistant team members
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'corporate', 'c1', 'detail', 'interview', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Claire (HR manager, female adult)', 'David (candidate, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'How did David respond to the resistant team members?',
      options: [
        { text: 'He reported the situation to senior management',               isCorrect: false, rationale: 'David explicitly said he did not escalate immediately.' },
        { text: 'He replaced them with more junior team members',               isCorrect: false, rationale: 'Replacing them is not mentioned.' },
        { text: 'He ignored the resistance and continued with his strategy',    isCorrect: false, rationale: 'David engaged with the resistance directly.' },
        { text: 'He had individual conversations and revised the strategy to incorporate their input', isCorrect: true, rationale: 'David says "I took them for individual conversations… I revised the strategy to incorporate their input."' },
      ],
    },
  },
  // Q6 — Detail: five-year goal
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'corporate', 'c1', 'detail', 'interview', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Claire (HR manager, female adult)', 'David (candidate, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'Where does David want to be in five years?',
      options: [
        { text: 'Starting his own marketing consultancy',                    isCorrect: false, rationale: 'Starting his own business is not David\'s stated goal.' },
        { text: 'Returning to a coordinator role in a larger company',       isCorrect: false, rationale: 'A step backwards in seniority is not mentioned.' },
        { text: 'Working in a completely different sector',                  isCorrect: false, rationale: 'David expresses continued interest in brand management.' },
        { text: 'Leading a cross-functional growth team in an international market context', isCorrect: true, rationale: 'David says "I would like to be leading a cross-functional growth team, ideally in an international market context."' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 18 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 18 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
