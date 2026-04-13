/**
 * LISTENING PHASE 13 — ACADEMIA
 * Module: "Research Ethics Seminar"
 * CEFR: C1 | Academic seminar discussion | ~130 seconds
 * 7 questions — evaluation, nuanced argument, abstract reasoning
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'academia-research-ethics-seminar';
const PRODUCT_LINE = 'ACADEMIA';
const MODULE_TITLE = 'Research Ethics Seminar';
const CEFR_BAND = 'C1';
const ESTIMATED_DURATION_SECONDS = 130;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.87,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Three voices: Prof. Chen (authoritative female academic), Marcus (thoughtful male student), Anouschka (analytical female student). "Anouschka" — ah-NOO-shkah; TTS likely to fail; respell in TTS as "Anoushka" (ah-NOOSH-kah). "deceptive priming" — even stress, no rush. "proportionality" — five syllables: pro-POR-shun-AL-ih-tee. "methodological" — six syllables. Pause 1.2s between speaker turns.',
};

const HUMAN_SCRIPT = `[Prof. Chen — professor, female adult | Marcus — student, male adult | Anouschka — student, female adult]

Prof. Chen: So, to continue from last week, I want to open today's discussion with a question. In your reading, did anyone find a case where the ethical framework and the research outcome seemed to be in genuine tension? Marcus?
Marcus: Yes, actually. I was looking at that study on deceptive priming in psychology — the one where participants were not told the true purpose of the experiment until a debrief at the end. The study produced genuinely useful data on implicit bias, but participants had been deliberately misled during the procedure. I find it difficult to reconcile that with full informed consent.
Prof. Chen: That is a classic example. The argument from the researchers was that prior knowledge of the hypothesis would contaminate the results — a methodological necessity, they claimed. Anouschka, do you find that justification convincing?
Anouschka: Only partially. I think there is a spectrum here. A mild deception for a low-risk study is quite different from withholding information that could affect whether someone participates at all. The key question is whether the deception materially altered the participant's decision to take part.
Prof. Chen: Exactly right. And this is what the concept of proportionality addresses. Ethical review boards do not apply a single standard — they weigh the scientific value of the research against the degree and type of deception involved. What this means in practice is that the bar for justifying deception rises sharply when the subject matter is sensitive or when participants might be harmed, even psychologically, by the revelation.
Marcus: So it is not a blanket prohibition, but context-dependent.
Prof. Chen: Precisely. And that nuance is what makes research ethics such a genuinely difficult field.`;

const TTS_SCRIPT = `So, to continue from last week, I want to open today's discussion with a question. In your reading, did anyone find a case where the ethical framework and the research outcome seemed to be in genuine tension? Marcus?
Yes, actually. I was looking at that study on deceptive priming in psychology. The one where participants were not told the true purpose of the experiment until a debrief at the end. The study produced genuinely useful data on implicit bias, but participants had been deliberately misled during the procedure. I find it difficult to reconcile that with full informed consent.
That is a classic example. The argument from the researchers was that prior knowledge of the hypothesis would contaminate the results. A methodological necessity, they claimed. Anoushka, do you find that justification convincing?
Only partially. I think there is a spectrum here. A mild deception for a low-risk study is quite different from withholding information that could affect whether someone participates at all. The key question is whether the deception materially altered the participant's decision to take part.
Exactly right. And this is what the concept of proportionality addresses. Ethical review boards do not apply a single standard. They weigh the scientific value of the research against the degree and type of deception involved. What this means in practice is that the bar for justifying deception rises sharply when the subject matter is sensitive, or when participants might be harmed, even psychologically, by the revelation.
So it is not a blanket prohibition, but context-dependent.
Precisely. And that nuance is what makes research ethics such a genuinely difficult field.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Three distinct voices: Prof. Chen (senior female, authoritative), Marcus (male student, thoughtful), Anouschka/Anoushka (female student, analytical precision).
- "Anouschka" in TTS script changed to "Anoushka" for better synthesis: ah-NOOSH-kah. HUMAN REVIEW: verify name pronunciation.
- "deceptive priming" — dee-SEP-tiv PRY-ming; two clear words.
- "proportionality" — pro-POR-shun-AL-ih-tee; 5 syllables; common TTS stress error. Verify.
- "methodological" — meth-oh-doh-LOJ-ih-kull; verify.
- "materially altered" — natural academic phrasing; TTS should handle fine.
- Pause 1.0–1.2s between speaker turns.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C1 — abstract academic discussion, evaluation of argument, nuanced position.
✓ Multiple speakers; requires tracking who said what.
✓ Q3 (Anouschka's key test) and Q4 (proportionality concept) are highest-difficulty items.
✓ Q6 and Q7 require integration of two different speakers' contributions.
✓ IRT range 0.6 to 1.1 appropriate for C1 academia.
HUMAN REVIEW: Confirm Anouschka pronunciation and three-voice differentiation.
`;

const items = [
  // Q1 — Detail: what type of study Marcus cites
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'seminar', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 3, speakers: ['Prof. Chen (professor, female adult)', 'Marcus (student, male adult)', 'Anouschka (student, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What type of study does Marcus describe from his reading?',
      options: [
        { text: 'A medical drug trial',                        isCorrect: false, rationale: 'Marcus describes a psychology study, not a medical trial.' },
        { text: 'An educational assessment',                   isCorrect: false, rationale: 'The study is about implicit bias research, not an educational assessment.' },
        { text: 'A psychology study using deceptive priming',  isCorrect: true,  rationale: 'Marcus says "that study on deceptive priming in psychology."' },
        { text: 'A large-scale survey on public opinion',      isCorrect: false, rationale: 'A survey is not what Marcus describes; he describes an experiment with deception.' },
      ],
    },
  },
  // Q2 — Reasoning: why researchers used deception
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'inference', 'seminar', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 3, speakers: ['Prof. Chen (professor, female adult)', 'Marcus (student, male adult)', 'Anouschka (student, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 2,
      prompt: 'Why did the researchers in the study use deception?',
      options: [
        { text: 'To save time in the study design',                isCorrect: false, rationale: 'Time-saving is not the reason given.' },
        { text: 'Prior knowledge of the hypothesis would have contaminated the results', isCorrect: true, rationale: 'Prof. Chen says "prior knowledge of the hypothesis would contaminate the results — a methodological necessity."' },
        { text: 'They were required to by the ethics board',       isCorrect: false, rationale: 'The ethics board is discussed as reviewers, not as the ones who required deception.' },
        { text: 'Participants would have refused to take part',    isCorrect: false, rationale: 'This is Anouschka\'s concern about the implication of deception — not the reason given for using it.' },
      ],
    },
  },
  // Q3 — Evaluation: Anouschka's key test for deception
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'inference', 'evaluation', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 3, speakers: ['Prof. Chen (professor, female adult)', 'Marcus (student, male adult)', 'Anouschka (student, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 3,
      prompt: 'According to Anouschka, what is the key question in evaluating deception in research?',
      options: [
        { text: 'Whether participants felt upset afterwards',                         isCorrect: false, rationale: 'Emotional upset is not the specific test Anouschka proposes.' },
        { text: 'Whether the data produced was published in a peer-reviewed journal', isCorrect: false, rationale: 'Publication status is not her criterion.' },
        { text: 'Whether the deception materially altered the participant\'s decision to take part', isCorrect: true, rationale: 'Anouschka says "The key question is whether the deception materially altered the participant\'s decision to take part."' },
        { text: 'Whether the study was later replicated without deception',           isCorrect: false, rationale: 'Replication is not discussed by Anouschka.' },
      ],
    },
  },
  // Q4 — Concept: what proportionality addresses
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'terminology', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 3, speakers: ['Prof. Chen (professor, female adult)', 'Marcus (student, male adult)', 'Anouschka (student, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What concept does Prof. Chen introduce to describe the ethical review process?',
      options: [
        { text: 'Informed consent',      isCorrect: false, rationale: 'Informed consent is discussed but is not the concept Prof. Chen introduces at this point.' },
        { text: 'Anonymity',             isCorrect: false, rationale: 'Anonymity is not mentioned.' },
        { text: 'Proportionality',       isCorrect: true,  rationale: 'Prof. Chen says "this is what the concept of proportionality addresses."' },
        { text: 'Beneficence',           isCorrect: false, rationale: 'Beneficence is a research ethics principle but not the term used here.' },
      ],
    },
  },
  // Q5 — When the justification bar rises
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'seminar', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 3, speakers: ['Prof. Chen (professor, female adult)', 'Marcus (student, male adult)', 'Anouschka (student, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'According to Prof. Chen, when does the bar for justifying deception rise sharply?',
      options: [
        { text: 'When the study involves more than 100 participants',                     isCorrect: false, rationale: 'Study size is not mentioned as a factor.' },
        { text: 'When subject matter is sensitive or participants might be harmed',       isCorrect: true,  rationale: 'Prof. Chen says "the bar rises sharply when the subject matter is sensitive or when participants might be harmed, even psychologically, by the revelation."' },
        { text: 'When all deception must be fully justified — the bar is always high',   isCorrect: false, rationale: 'Prof. Chen describes a spectrum, not a uniform standard.' },
        { text: 'When the research has not been peer-reviewed in advance',               isCorrect: false, rationale: 'Peer review status is not a factor mentioned.' },
      ],
    },
  },
  // Q6 — Marcus's conclusion
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'inference', 'seminar', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 3, speakers: ['Prof. Chen (professor, female adult)', 'Marcus (student, male adult)', 'Anouschka (student, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 6,
      prompt: 'What does Marcus conclude at the end of the discussion?',
      options: [
        { text: 'Deception in research is always unethical and should be banned',         isCorrect: false, rationale: 'Marcus says the opposite — it is "not a blanket prohibition."' },
        { text: 'Ethics boards always approve deception if the study is scientifically valuable', isCorrect: false, rationale: 'Prof. Chen explains it is weighed and context-dependent; not automatic approval.' },
        { text: 'Whether deception is acceptable is context-dependent, not a blanket prohibition', isCorrect: true, rationale: 'Marcus summarises: "So it is not a blanket prohibition, but context-dependent."' },
        { text: 'The law, rather than ethics boards, should decide these cases',          isCorrect: false, rationale: 'Legal jurisdiction is not raised; Prof. Chen agrees with Marcus\'s summary.' },
      ],
    },
  },
  // Q7 — What makes research ethics difficult
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'inference', 'opinion', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 3, speakers: ['Prof. Chen (professor, female adult)', 'Marcus (student, male adult)', 'Anouschka (student, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 7,
      prompt: 'Why does Prof. Chen describe research ethics as "a genuinely difficult field"?',
      options: [
        { text: 'Because there are too many studies to review',                         isCorrect: false, rationale: 'Volume of studies is not the reason given.' },
        { text: 'Because of its nuance and context-dependence',                         isCorrect: true,  rationale: 'Prof. Chen says "that nuance is what makes research ethics such a genuinely difficult field."' },
        { text: 'Because ethics boards disagree with each other',                       isCorrect: false, rationale: 'Inter-board disagreement is not mentioned.' },
        { text: 'Because there are no international laws governing research ethics',    isCorrect: false, rationale: 'Legal frameworks are not discussed.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 13 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 13 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
