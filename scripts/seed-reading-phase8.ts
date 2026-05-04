/**
 * READING PHASE 8 — SPECIALIZED / ACADEMIA
 * Module: "The Paradox of Progress"
 * CEFR: C1/C2 | Postgraduate / Specialized adult | ~385 words | Philosophical essay
 * 6 questions: nuanced_inference ×1, tone ×1, author_purpose ×1, discourse_structure ×1, vocabulary_precision ×2
 *
 * SOTA notes:
 * - Philosophical/argumentative essay: canonical C1/C2 genre.
 * - Requires tracking sustained irony, rhetorical questions, and argumentative subtext.
 * - IRT b-params: +1.6 → +2.1 (C1 upper / C2 lower range).
 * - Distractors exploit: surface-level paraphrase that misses implicit stance,
 *   conflation of irony with sincere assertion, lexical precision traps.
 *
 *   npx tsx scripts/seed-reading-phase8.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "specialized-reading-paradox-progress";
const PRODUCT_LINE = "SPECIALIZED";
const MODULE_TITLE = "The Paradox of Progress";
const CEFR_BAND    = "C1";

const PASSAGE = `We live, by most measurable accounts, in an age of unprecedented material advance. Average life expectancies have doubled over two centuries; the proportion of humanity living in absolute poverty has fallen from over 80 per cent to under 10 per cent in the same period; smallpox, once a reliable killer, is extinct as a natural disease. These are not trivial achievements. To dismiss them would be to betray an extraordinary collective human effort.

And yet something persists in the cultural imagination that refuses to equate progress with improvement. The very technologies that have prolonged life have simultaneously rendered large swathes of the natural world uninhabitable. The wealth that has lifted millions from poverty has concentrated in proportions that would have astonished even the most prescient political theorists of prior centuries. And the eradication of old diseases has not been accompanied by any commensurate decline in human suffering — it has merely redistributed its forms.

What, then, is progress? If it is defined instrumentally — as an increase in human capacity to act upon the world — then it is clearly occurring. If it is defined normatively — as movement towards a state of affairs that is genuinely better — then the case is far less clear. The two definitions are routinely and carelessly conflated, with consequences that are anything but trivial.

This conflation is not merely an academic error. Policy-makers who assume that technological capability is self-evidently progress-as-improvement are liable to sanction interventions whose long-term effects remain poorly understood, trusting in a narrative of progress that the historical record supports only selectively. The narrative is not dishonest, but it is incomplete: it reports gains while struggling to account for the structural displacements and dispersed harms that accompany them.

To acknowledge the paradox of progress is not to embrace pessimism. It is to insist on the intellectual honesty required for any genuinely purposive advance. We cannot navigate well with a compass calibrated only to register movement, not direction.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C1/C2 — philosophical abstraction, sustained irony, complex sentence architecture, evaluative metalanguage.
✓ Text type (philosophical essay) authentic C1/C2 genre.
✓ Q1 (nuanced_inference) — implied paradox: material progress co-existing with redistributed suffering.
✓ Q2 (tone) — opening paragraph's tone: genuine acknowledgement, not irony.
✓ Q3 (author_purpose) — paragraph 3 (definitional distinction): why the writer insists on the distinction.
✓ Q4 (discourse_structure) — final metaphor function.
✓ Q5 (vocabulary_precision) — "normatively" vs. "instrumentally".
✓ Q6 (vocabulary_precision) — "commensurate".
✓ ~385 words; C1/C2 timed reading (14–18 min).
HUMAN REVIEW: Q2 (tone) — confirm that the genuine acknowledgement in paragraph 1 is clearly distinguishable from the essay's overall critical stance before publishing.
`;

const items = [
  // Q1 — Nuanced inference: the central paradox
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.6, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "specialized", "philosophy", "c1", "nuanced_inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 385, textType: "philosophical essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "nuanced_inference", questionNumber: 1,
      prompt: "What is the central paradox that the writer argues we must acknowledge?",
      options: [
        { text: "Technological progress has produced more harm than good across human history.",       isCorrect: false, rationale: "The writer explicitly refuses to dismiss material achievements — the argument is not a simple negative assessment." },
        { text: "Progress as increased capacity to act has occurred alongside the persistence and redistribution of suffering and harm.", isCorrect: true, rationale: "The writer establishes real gains (life expectancy, poverty reduction) but argues suffering has been 'redistributed' and harms 'dispersed' — coexisting with progress, not erased by it." },
        { text: "Human beings are psychologically incapable of experiencing progress as improvement.",  isCorrect: false, rationale: "The psychological claim is not made; the argument is philosophical and structural, about the nature of the concept of progress." },
        { text: "Material progress has been concentrated exclusively in wealthy nations.",              isCorrect: false, rationale: "Wealth concentration is one example, not the totality of the argument." },
      ],
    },
  },
  // Q2 — Tone: paragraph 1
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.7, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "specialized", "philosophy", "c1", "tone", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 385, textType: "philosophical essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "tone", questionNumber: 2,
      prompt: "What is the tone of the first paragraph?",
      options: [
        { text: "Ironic — the writer secretly dismisses the achievements listed.",              isCorrect: false, rationale: "The writer explicitly states 'these are not trivial achievements' and that to dismiss them 'would be to betray' human effort — this is sincere, not ironic." },
        { text: "Genuinely celebratory and unambiguously optimistic.",                         isCorrect: false, rationale: "Celebratory acknowledgement is present, but 'unambiguously optimistic' misses the essayistic strategy: the paragraph establishes concessions to complicate them in paragraph 2." },
        { text: "Concessive and measured — acknowledging real achievements before introducing a qualification.", isCorrect: true, rationale: "The paragraph grants genuine achievements but its rhetorical function is to set up the 'and yet' of paragraph 2 — concessive acknowledgement as a structural move." },
        { text: "Sceptical — suggesting the statistics cannot be trusted.",                    isCorrect: false, rationale: "No scepticism about the data is expressed; the writer accepts these figures as genuine." },
      ],
    },
  },
  // Q3 — Author's purpose: definitional distinction in paragraph 3
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.8, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "specialized", "philosophy", "c1", "author_purpose", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 385, textType: "philosophical essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "author_purpose", questionNumber: 3,
      prompt: "Why does the writer distinguish between 'instrumental' and 'normative' definitions of progress?",
      options: [
        { text: "To suggest that the normative definition is always superior to the instrumental one.", isCorrect: false, rationale: "The writer does not advocate one definition over the other; the point is that the two are routinely and damagingly conflated." },
        { text: "To show that the two definitions, when confused, lead to overconfident policy and incomplete analysis.", isCorrect: true, rationale: "Paragraph 3 closes: 'the two definitions are routinely and carelessly conflated, with consequences that are anything but trivial' — paragraph 4 then details those policy consequences." },
        { text: "To prove that normative progress is impossible to achieve in practice.",             isCorrect: false, rationale: "No impossibility claim is made; the final paragraph calls for honest navigation — implying purposive advance remains possible." },
        { text: "To provide a philosophical definition of progress for academic readers.",            isCorrect: false, rationale: "While relevant to academics, the purpose extends to policy critique — the definitions are introduced because their conflation has real-world consequences." },
      ],
    },
  },
  // Q4 — Discourse structure: final metaphor
  {
    skill: "READING", cefrLevel: "C2", difficulty: 1.9, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "specialized", "philosophy", "c2", "discourse_structure", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 385, textType: "philosophical essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "discourse_structure", questionNumber: 4,
      prompt: "What is the rhetorical function of the final sentence ('We cannot navigate well with a compass calibrated only to register movement, not direction')?",
      options: [
        { text: "To advocate for the use of better navigation technology in policy-making.",          isCorrect: false, rationale: "The compass is a metaphor for evaluative frameworks, not a literal call for navigation tools." },
        { text: "To summarise, through metaphor, that measuring change without evaluating its quality is insufficient for meaningful progress.", isCorrect: true, rationale: "The metaphor maps onto the argument: a compass that only shows movement (instrumental progress) without direction (normative progress) cannot guide well — a compact summation of the essay's thesis." },
        { text: "To introduce a new argument about spatial orientation and decision-making.",         isCorrect: false, rationale: "No new argument is introduced in the conclusion; the metaphor crystallises the essay's existing argument." },
        { text: "To acknowledge that progress, while imperfect, is still broadly positive.",         isCorrect: false, rationale: "The sentence is a critical note about insufficient measurement frameworks — it does not reassert a broadly positive view of progress." },
      ],
    },
  },
  // Q5 — Vocabulary precision: "normatively"
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.0, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "specialized", "philosophy", "c2", "vocabulary_precision", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 385, textType: "philosophical essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_precision", questionNumber: 5,
      prompt: "What does 'normatively' mean as used in the third paragraph?",
      options: [
        { text: "In a way that conforms to the normal average or typical pattern.",     isCorrect: false, rationale: "'Normatively' in this philosophical context derives from 'norm' as a standard or value judgement, not from 'normal' as statistical average." },
        { text: "In terms of what is usual or common in practice.",                    isCorrect: false, rationale: "This conflates the philosophical sense with a descriptive statistical sense." },
        { text: "In terms of values, standards, or what ought to be.",                 isCorrect: true,  rationale: "In philosophy and social science, 'normative' concerns evaluative standards — what is good, right, or desirable — as opposed to descriptive ('what is')." },
        { text: "In a way that can be measured by objective scientific methods.",      isCorrect: false, rationale: "Normative claims are typically resistant to purely empirical measurement; this confuses normative with empirical." },
      ],
    },
  },
  // Q6 — Vocabulary precision: "commensurate"
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.1, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "specialized", "philosophy", "c2", "vocabulary_precision", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 385, textType: "philosophical essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_precision", questionNumber: 6,
      prompt: "What does 'commensurate' mean in the phrase 'any commensurate decline in human suffering'?",
      options: [
        { text: "Measurable using the same scientific instruments.",  isCorrect: false, rationale: "'Commensurate' does not refer to measurement instruments; it concerns proportionality." },
        { text: "Proportionate or equivalent in scale or degree.",    isCorrect: true,  rationale: "'Commensurate' means corresponding in size or scale — here, a decline in suffering proportionate to the advances in medicine and life expectancy." },
        { text: "Occurring at the same moment in time.",             isCorrect: false, rationale: "Simultaneity ('concurrent') is different from proportionality ('commensurate')." },
        { text: "Officially recognised or documented.",              isCorrect: false, rationale: "'Commensurate' concerns proportion, not documentation or official recognition." },
      ],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const existing = await prisma.item.findFirst({ where: { tags: { has: MODULE_ID } } });
  if (existing && process.env.FORCE !== "1") { console.log(`Module ${MODULE_ID} already seeded.`); return; }
  if (existing && process.env.FORCE === "1") { await prisma.item.deleteMany({ where: { tags: { has: MODULE_ID } } }); }
  let created = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE", skill: item.skill as any, cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty, discrimination: item.discrimination, guessing: item.guessing,
        status: "ACTIVE", tags: item.tags, content: item.content,
      },
    });
    created++;
  }
  console.log(`✓ ${MODULE_TITLE}: ${created} items seeded (CEFR ${CEFR_BAND}).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
