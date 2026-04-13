/**
 * LISTENING PHASE 19 — CORPORATE
 * Module: "Project Handover Briefing"
 * CEFR: B2 | Workplace handover dialogue | ~95 seconds
 * 6 questions — professional detail, instruction-following, prioritisation
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'corporate-project-handover';
const PRODUCT_LINE = 'CORPORATE';
const MODULE_TITLE = 'Project Handover Briefing';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 95;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.90,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Two voices. Sophie (outgoing project lead, female, knowledgeable and helpful): en-US-Neural2-C. James (incoming lead, male, attentive): en-US-Neural2-D. "Felipe" — feh-LEE-pay (Spanish name); TTS may mispronounce; verify or flag for human correction. "Li Wei" — lee-WAY (Chinese name); TTS likely to fail; consider phonetic spelling "Lee Way." "Synapse" — SY-naps. "non-negotiable" — nahn-neh-GOH-shee-uh-bul. Pause 1.0s between turns.',
};

const HUMAN_SCRIPT = `[Sophie — outgoing project lead, female adult | James — incoming project lead, male adult]

Sophie: James, thanks for sitting down with me. I know you are taking over the Vantage project next Monday, so I want to walk you through where things stand.
James: Perfect. I have read the brief, but obviously there is a lot of detail that does not make it into documentation.
Sophie: Exactly. So, the project is officially in phase three — stakeholder testing. We have three client contacts: Marcus at the main office, and two regional managers, Diane and Felipe. Marcus is very detail-oriented and expects weekly written updates. Diane prefers quick calls. Felipe tends to respond slowly by email, so if you need a fast answer from him, call directly.
James: Good to know. What about the timeline?
Sophie: We are currently on track, but there are two risk areas. First, the user testing feedback is due by the fourteenth, and historically the client has sent things late. I would chase them by the twelfth to be safe. Second, there is a third-party vendor — Synapse Systems — who are handling the data migration. They have been good, but their technical contact changed last month. The new contact is Li Wei. I will send you her details.
James: OK. And what would you say is the most important thing not to miss?
Sophie: The steering committee call on the twenty-eighth. That is non-negotiable — Marcus chairs it and tracks attendance.
James: Understood. I will make sure that is in the diary immediately.
Sophie: Great. I will send you a full handover document by Friday. Feel free to call me after that if anything comes up.`;

const TTS_SCRIPT = `James, thanks for sitting down with me. I know you are taking over the Vantage project next Monday, so I want to walk you through where things stand.
Perfect. I have read the brief, but obviously there is a lot of detail that does not make it into documentation.
Exactly. So, the project is officially in phase three. Stakeholder testing. We have three client contacts. Marcus at the main office, and two regional managers, Diane and Felipe. Marcus is very detail-oriented and expects weekly written updates. Diane prefers quick calls. Felipe tends to respond slowly by email, so if you need a fast answer from him, call directly.
Good to know. What about the timeline?
We are currently on track, but there are two risk areas. First, the user testing feedback is due by the fourteenth, and historically the client has sent things late. I would chase them by the twelfth to be safe. Second, there is a third-party vendor, Synapse Systems, who are handling the data migration. They have been good, but their technical contact changed last month. The new contact is Lee Way. I will send you her details.
OK. And what would you say is the most important thing not to miss?
The steering committee call on the twenty-eighth. That is non-negotiable. Marcus chairs it and tracks attendance.
Understood. I will make sure that is in the diary immediately.
Great. I will send you a full handover document by Friday. Feel free to call me after that if anything comes up.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "Felipe" — feh-LEE-pay; TTS HIGH RISK of saying FEE-lip or feh-LEEP. Verify or add manual ssml phoneme.
- "Li Wei" changed to "Lee Way" in TTS script for better synthesis. HUMAN REVIEW: confirm accuracy.
- "Synapse" — SY-naps; one syllable first word (not sin-apse). Typically fine.
- "non-negotiable" — nahn-neh-GOH-shee-uh-bul; 6 syllables; verify TTS synthesis.
- "the twenty-eighth" — ordinal date; verify synthesis.
- "phase three" — natural business phrase.
- "stakeholder testing" — four syllables total; clear business term.
- Pause 1.0s between turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — handover briefing, professional instruction-following, conditional advice.
✓ Corporate product line — realistic project handover scenario.
✓ Multiple people referenced (Marcus, Diane, Felipe, Li Wei, Synapse Systems) — tracking requires careful listening.
✓ Q3 tests implied correct communication method for Felipe (call directly, not email).
✓ Q4 tests causal reasoning (chase by 12th because client is historically late AND deadline is 14th).
✓ Q6 tests identification of the single most important item.
✓ IRT range 0.3 to 0.8 appropriate for B2 corporate.
HUMAN REVIEW: Confirm Felipe and Li Wei pronunciations.
`;

const items = [
  // Q1 — Detail: project phase
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'handover', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Sophie (outgoing project lead, female adult)', 'James (incoming project lead, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What phase is the Vantage project currently in?',
      options: [
        { text: 'Phase 1 — planning',         isCorrect: false, rationale: 'Planning is phase 1; the project is in a later phase.' },
        { text: 'Phase 2 — build',            isCorrect: false, rationale: 'Build phase is not the current phase.' },
        { text: 'Phase 3 — stakeholder testing', isCorrect: true, rationale: 'Sophie says "the project is officially in phase three — stakeholder testing."' },
        { text: 'Phase 4 — deployment',       isCorrect: false, rationale: 'Deployment is not the current phase.' },
      ],
    },
  },
  // Q2 — Detail: how Marcus prefers to receive updates
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'handover', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Sophie (outgoing project lead, female adult)', 'James (incoming project lead, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'How does Marcus prefer to receive project updates?',
      options: [
        { text: 'Daily phone calls',          isCorrect: false, rationale: 'Daily calls are not Marcus\'s preference.' },
        { text: 'Monthly email summaries',    isCorrect: false, rationale: 'Monthly emails are not Marcus\'s preference — he expects weekly updates.' },
        { text: 'One-to-one meetings',        isCorrect: false, rationale: 'One-to-one meetings are not described as Marcus\'s preference here.' },
        { text: 'Weekly written updates',     isCorrect: true,  rationale: 'Sophie says Marcus "expects weekly written updates."' },
      ],
    },
  },
  // Q3 — Implicit: best way to get a quick response from Felipe
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'inference', 'handover', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Sophie (outgoing project lead, female adult)', 'James (incoming project lead, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 3,
      prompt: 'What is the best way to get a fast response from Felipe?',
      options: [
        { text: 'Send him an email',           isCorrect: false, rationale: 'Sophie says Felipe responds slowly by email — the opposite of fast.' },
        { text: 'Call him directly',           isCorrect: true,  rationale: 'Sophie says "if you need a fast answer from him, call directly."' },
        { text: 'Contact Marcus first',        isCorrect: false, rationale: 'There is no suggestion of routing communication through Marcus to reach Felipe.' },
        { text: 'Message through Diane',       isCorrect: false, rationale: 'Diane is a separate contact, not a relay to Felipe.' },
      ],
    },
  },
  // Q4 — Reasoning: why to chase by the 12th
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'inference', 'reasoning', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Sophie (outgoing project lead, female adult)', 'James (incoming project lead, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'Why does Sophie suggest chasing the client for feedback by the 12th?',
      options: [
        { text: 'The vendor needs the feedback before the 12th',        isCorrect: false, rationale: 'The vendor deadline is separate; it is the client who has a history of being late.' },
        { text: 'Marcus has asked for early submission',                isCorrect: false, rationale: 'Marcus\'s request for early submission is not stated.' },
        { text: 'The client historically sends things late, and the deadline is the 14th', isCorrect: true, rationale: 'Sophie says feedback is "due by the fourteenth, and historically the client has sent things late. I would chase them by the twelfth to be safe."' },
        { text: 'It takes two days to process the feedback',            isCorrect: false, rationale: 'A two-day processing time is not the stated reason.' },
      ],
    },
  },
  // Q5 — Detail: what changed with Synapse Systems
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'handover', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Sophie (outgoing project lead, female adult)', 'James (incoming project lead, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'What changed with Synapse Systems last month?',
      options: [
        { text: 'They changed their pricing',              isCorrect: false, rationale: 'Pricing changes are not mentioned.' },
        { text: 'They missed a delivery deadline',         isCorrect: false, rationale: 'Sophie says they have been good; no missed deadline is mentioned.' },
        { text: 'Their technical contact changed to Li Wei', isCorrect: true, rationale: 'Sophie says "their technical contact changed last month. The new contact is Li Wei."' },
        { text: 'They were replaced by another vendor',   isCorrect: false, rationale: 'Synapse Systems are still the vendor handling the data migration.' },
      ],
    },
  },
  // Q6 — Priority: most important thing not to miss
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'corporate', 'b2', 'detail', 'priority', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 2, speakers: ['Sophie (outgoing project lead, female adult)', 'James (incoming project lead, male adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'What does Sophie say is the most important thing not to miss?',
      options: [
        { text: 'The user testing feedback deadline on the 14th',      isCorrect: false, rationale: 'The 14th deadline is important but Sophie says the steering committee call is the one non-negotiable item.' },
        { text: 'The weekly written update to Marcus',                 isCorrect: false, rationale: 'Marcus\'s updates are important but not singled out as the top priority.' },
        { text: 'The handover meeting with Sophie',                    isCorrect: false, rationale: 'This meeting is happening now; Sophie means a future commitment.' },
        { text: 'The steering committee call on the 28th',             isCorrect: true,  rationale: 'Sophie says "The steering committee call on the twenty-eighth. That is non-negotiable — Marcus chairs it and tracks attendance."' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 19 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 19 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
