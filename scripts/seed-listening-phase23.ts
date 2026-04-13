/**
 * LISTENING PHASE 23 — LANGUAGE SCHOOLS
 * Module: "B2 End-of-Level — Urban Sociologist Interview"
 * CEFR: B2 | End-of-level summative test | ~92 seconds
 * 6 questions — opinion, academic register, implicit reasoning, vocabulary in context
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'langschool-b2-endoflevel-urban';
const PRODUCT_LINE = 'LANGUAGE_SCHOOLS';
const MODULE_TITLE = 'B2 End-of-Level — Urban Sociologist Interview';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 92;

const TTS_SETTINGS = {
  languageCode: 'en-GB',
  voiceName: 'en-GB-Neural2-C',
  speakingRate: 0.88,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Caroline (presenter, female, clear broadcast RP): en-GB-Neural2-C. Professor Lawton (male, measured academic tone): en-GB-Neural2-B. "co-present" — KOH-PREZ-ent; compound; TTS may split unnaturally. Consider SSML or hyphen handling. "privatised" — PRIE-vuh-tized (UK English). "spontaneous" — spon-TAY-nee-us; four syllables. "genuinely" — JEN-yoo-in-lee; three syllables. "impoverish" — im-POV-uh-rish. Academic pace — confident, not rushed. Pause 1.0s between turns.',
};

const HUMAN_SCRIPT = `[Caroline — radio presenter, female adult | Professor Hugh Lawton — urban sociologist, male adult]

Caroline: Professor Lawton, you have spent thirty years studying how cities shape human behaviour. What do you consider the most significant change in urban life in recent decades?
Professor Lawton: Without hesitation, I would say the smartphone's impact on shared public space. If you spend time in any city today — on public transport, in parks, in cafés — you will notice that people are increasingly co-present but not actually connecting. The physical space is shared, but the mental space is privatised.
Caroline: Some would argue that is simply an evolution, not a problem.
Professor Lawton: And I do not entirely disagree. Technology changes the texture of social life, but it does not necessarily impoverish it. My concern is less about the technology itself and more about the design of public spaces. Cities that have invested in genuinely welcoming, well-maintained, inclusive public areas continue to produce spontaneous social interaction. The problem is that many urban administrations have withdrawn funding from these spaces precisely at the moment when the social fabric most needs them.
Caroline: So the issue is political and economic, not technological.
Professor Lawton: Largely, yes. The tendency to blame technology is, I think, a way of avoiding harder questions about resource allocation and the values that drive urban planning decisions.
Caroline: Professor Lawton, thank you — a genuinely thought-provoking perspective.`;

const TTS_SCRIPT = `Professor Lawton, you have spent thirty years studying how cities shape human behaviour. What do you consider the most significant change in urban life in recent decades?
Without hesitation, I would say the smartphone impact on shared public space. If you spend time in any city today, on public transport, in parks, in cafes, you will notice that people are increasingly present in the same space but not actually connecting. The physical space is shared, but the mental space is privatised.
Some would argue that is simply an evolution, not a problem.
And I do not entirely disagree. Technology changes the texture of social life, but it does not necessarily impoverish it. My concern is less about the technology itself and more about the design of public spaces. Cities that have invested in genuinely welcoming, well-maintained, inclusive public areas continue to produce spontaneous social interaction. The problem is that many urban administrations have withdrawn funding from these spaces precisely at the moment when the social fabric most needs them.
So the issue is political and economic, not technological.
Largely, yes. The tendency to blame technology is, I think, a way of avoiding harder questions about resource allocation and the values that drive urban planning decisions.
Professor Lawton, thank you. A genuinely thought-provoking perspective.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "co-present" — compound form. TTS may break unnaturally. In TTS script replaced with "present in the same space." Human assembly may prefer original phrasing.
- "privatised" — UK spelling. TTS should synthesise correctly.
- "spontaneous" — spon-TAY-nee-us; verify four-syllable rendering.
- "impoverish" — im-POV-uh-rish; not a high-frequency word; verify.
- "genuinely" — JEN-yoo-in-lee; three syllables; verify TTS does not collapse to two.
- "resource allocation" — reh-SORS al-oh-KAY-shun; academic phrase; verify clarity.
- Academic pace: deliberate and measured, not slow — 0.88 is correct.
- Pause 1.0s between turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — opinion-led academic dialogue, analytic vocabulary, implied reasoning.
✓ Language Schools product line — end-of-level B2 summative test.
✓ Q1 (30 years) — B2 easy; stated explicitly; tests attention at opening.
✓ Q2 (smartphone impact) — B2 medium; main opinion extracted from abstract formulation.
✓ Q3 ("co-present but not connecting") — B2+ vocabulary in context; requires understanding implied definition.
✓ Q4 (technology vs design of public spaces) — B2/C1 nuanced position; tests ability to track a concession + counterposition.
✓ Q5 (cities with good public spaces — spontaneous interaction) — B2 medium; causal link inference.
✓ Q6 (blaming technology avoids harder questions) — B2+ ; requires tracking rhetorical function.
✓ IRT difficulty 0.4 to 0.9 appropriate for B2 end-of-level.
HUMAN REVIEW: Confirm Q3 distractors do not overlap in meaning at B2 level.
`;

const items = [
  // Q1 — B2 easy: professor's experience
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b2', 'end-of-level', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Caroline (radio presenter, female adult)', 'Professor Hugh Lawton (urban sociologist, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'For how many years has Professor Lawton been studying cities and human behaviour?',
      options: [
        { text: 'Ten years',    isCorrect: false, rationale: 'Ten years is not stated.' },
        { text: 'Twenty years', isCorrect: false, rationale: 'Twenty years is not stated.' },
        { text: 'Thirty years', isCorrect: true,  rationale: 'Caroline says "you have spent thirty years studying how cities shape human behaviour."' },
        { text: 'Forty years',  isCorrect: false, rationale: 'Forty years is not stated.' },
      ],
    },
  },
  // Q2 — B2 medium: most significant change
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b2', 'end-of-level', 'main-idea', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Caroline (radio presenter, female adult)', 'Professor Hugh Lawton (urban sociologist, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'main-idea', questionNumber: 2,
      prompt: 'What does Professor Lawton consider the most significant change in urban life?',
      options: [
        { text: 'The increase in private car ownership',             isCorrect: false, rationale: 'Car ownership is not discussed.' },
        { text: 'The smartphone\'s impact on shared public space',   isCorrect: true,  rationale: 'The professor says "Without hesitation, I would say the smartphone\'s impact on shared public space."' },
        { text: 'The withdrawal of government funding from cities',  isCorrect: false, rationale: 'Funding withdrawal is mentioned but as a consequence, not the most significant change he identifies.' },
        { text: 'The growth of café culture',                       isCorrect: false, rationale: 'Cafés are mentioned as a setting but not as the key change.' },
      ],
    },
  },
  // Q3 — B2+ vocabulary in context
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b2', 'end-of-level', 'vocabulary-in-context', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Caroline (radio presenter, female adult)', 'Professor Hugh Lawton (urban sociologist, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'vocabulary-in-context', questionNumber: 3,
      prompt: 'What does Professor Lawton mean when he says people are "co-present but not actually connecting"?',
      options: [
        { text: 'People use their phones at the same time in the same place', isCorrect: false, rationale: 'This is too literal; the phrase describes a social dynamic, not just simultaneous phone use.' },
        { text: 'People are physically in the same space but not interacting socially', isCorrect: true, rationale: 'The contrast "physical space is shared, but the mental space is privatised" clarifies the meaning.' },
        { text: 'People live in the same city but never meet',                 isCorrect: false, rationale: 'This goes beyond the described scenario, which is about specific shared spaces.' },
        { text: 'People work together but do not communicate about personal topics', isCorrect: false, rationale: 'The context is public space, not specifically workplace interaction.' },
      ],
    },
  },
  // Q4 — B2+ nuanced position (concession + counter)
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b2', 'end-of-level', 'inference', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Caroline (radio presenter, female adult)', 'Professor Hugh Lawton (urban sociologist, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'What is Professor Lawton\'s main concern about public space and technology?',
      options: [
        { text: 'Technology is entirely negative for urban communities',                     isCorrect: false, rationale: 'The professor explicitly says he does not entirely disagree that technology is just an evolution.' },
        { text: 'He is more concerned about public space design than about technology itself', isCorrect: true,  rationale: 'He says "My concern is less about the technology itself and more about the design of public spaces."' },
        { text: 'Smartphones should be banned from public spaces',                           isCorrect: false, rationale: 'He does not advocate for banning smartphones.' },
        { text: 'Social interaction only happens in private spaces now',                     isCorrect: false, rationale: 'He says cities with good public spaces still produce spontaneous interaction.' },
      ],
    },
  },
  // Q5 — B2 medium: what well-designed public spaces produce
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b2', 'end-of-level', 'detail', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Caroline (radio presenter, female adult)', 'Professor Hugh Lawton (urban sociologist, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'What do cities that invest in well-maintained public spaces continue to produce?',
      options: [
        { text: 'Higher property values',             isCorrect: false, rationale: 'Property values are not mentioned.' },
        { text: 'Spontaneous social interaction',     isCorrect: true,  rationale: 'The professor says cities that invest in inclusive public areas "continue to produce spontaneous social interaction."' },
        { text: 'Reduced crime rates',                isCorrect: false, rationale: 'Crime is not discussed.' },
        { text: 'Greater political participation',    isCorrect: false, rationale: 'Political participation is not mentioned.' },
      ],
    },
  },
  // Q6 — B2+ rhetorical function
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'language-schools', 'b2', 'end-of-level', 'inference', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Caroline (radio presenter, female adult)', 'Professor Hugh Lawton (urban sociologist, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 6,
      prompt: 'According to Professor Lawton, what does blaming technology allow people to avoid?',
      options: [
        { text: 'Accepting that social change is inevitable',                               isCorrect: false, rationale: 'Inevitability is not the specific topic he raises.' },
        { text: 'Harder questions about resource allocation and urban planning values',      isCorrect: true,  rationale: 'He says "The tendency to blame technology is a way of avoiding harder questions about resource allocation and the values that drive urban planning decisions."' },
        { text: 'Investing in new technology',                                              isCorrect: false, rationale: 'He is not arguing for investment in new technology instead.' },
        { text: 'Discussing the role of private companies in urban design',                 isCorrect: false, rationale: 'Private companies are not specifically raised as the avoided topic.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 23 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 23 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
