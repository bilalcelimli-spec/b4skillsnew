/**
 * READING PHASE 6 — CORPORATE / ACADEMIA
 * Module: "Should We Trust Artificial Intelligence in Decision-Making?"
 * CEFR: B2/C1 | Corporate & academic adult | ~330 words | Argumentative article
 * 6 questions: gist ×1, argument_structure ×1, inference ×2, author_purpose ×1, vocabulary-in-context ×1
 *
 * SOTA notes:
 * - Argumentative text: canonical B2–C1 genre (opinion/analysis essay).
 * - Requires tracking: premise → counter-argument → qualified conclusion.
 * - IRT b-params: +0.8 → +1.5 (B2 upper / C1 lower range).
 * - Distractors exploit: over-strong conclusions, premise misattribution, word confusion.
 *
 *   npx tsx scripts/seed-reading-phase6.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "corp-reading-ai-trust";
const PRODUCT_LINE = "CORPORATE";
const MODULE_TITLE = "Should We Trust Artificial Intelligence in Decision-Making?";
const CEFR_BAND    = "B2";

const PASSAGE = `Artificial intelligence systems are increasingly used to support — or in some cases, replace — human judgement in high-stakes decisions: who receives a loan, which job applicant is shortlisted, even which patients receive priority medical treatment. Proponents argue that algorithms eliminate human bias and deliver consistent, data-driven outcomes. On the surface, this appears compelling.

Yet the case for algorithmic decision-making contains a fundamental tension. Machine learning models learn from historical data, which itself reflects past human biases. A hiring algorithm trained on historical employment data from an industry where women were systematically underrepresented will, by design, tend to reproduce that bias — not eliminate it. The model has learned to pattern-match against a biased baseline.

A second concern is opacity. Many high-performing AI models operate as 'black boxes': even their designers cannot fully explain why a particular decision was reached. This creates a serious accountability gap. If a loan applicant is refused, they have a legal right in many jurisdictions to understand the reason. An unexplainable algorithm cannot fulfil that obligation.

Defenders of AI point to human decision-making's own well-documented flaws — fatigue, emotional inconsistency, and overt prejudice — and argue that even an imperfect algorithm may outperform a fatigued or biased human decision-maker. This is a reasonable point, but it sets an unacceptably low bar. The comparison should not be 'AI versus a bad human', but 'AI versus well-designed human processes with appropriate oversight'.

Ultimately, the question is not whether to use AI in decision-making, but how. Transparency, independent auditing, and clear limits on automated authority are the minimum preconditions for responsible deployment. Without them, the promise of fairer decisions remains exactly that — a promise.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2/C1 — complex argument tracking, hedging, concession structures, sophisticated lexis.
✓ Text type (argumentative article) authentic B2/C1 genre.
✓ Q1 (gist) — writer's main argument structure (not just topic).
✓ Q2 (argument_structure) — function of paragraph 4 (concession + reframing); tests rhetorical awareness.
✓ Q3 (inference) — implied mechanism by which AI reproduces bias.
✓ Q4 (inference) — what "accountability gap" implies about individuals' rights.
✓ Q5 (author_purpose) — why the writer raises the "bad human" comparison.
✓ Q6 (vocabulary-in-context) — "opacity" in AI context.
✓ ~330 words; B2/C1 timed reading (11–14 min).
HUMAN REVIEW: Q2 requires identification of concession move — confirm B2/C1 boundary placement is appropriate.
`;

const items = [
  // Q1 — Gist
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.8, discrimination: 1.25, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "argumentative", "b2", "gist", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 330, textType: "argumentative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "gist", questionNumber: 1,
      prompt: "What is the writer's central argument?",
      options: [
        { text: "Artificial intelligence is inherently biased and should not be used for decisions.", isCorrect: false, rationale: "The writer does not advocate total rejection; the conclusion calls for conditions under which AI can be responsibly used." },
        { text: "AI can be used in decision-making, but only with transparency and oversight.",        isCorrect: true,  rationale: "The final paragraph explicitly states the conditions: transparency, auditing, and limits on automated authority." },
        { text: "Human decision-makers are always more reliable than AI algorithms.",                  isCorrect: false, rationale: "The writer acknowledges human decision-making flaws; the argument is not absolute human superiority." },
        { text: "Machine learning models will eventually eliminate all forms of human bias.",          isCorrect: false, rationale: "This is presented as a proponent's claim that the writer directly challenges." },
      ],
    },
  },
  // Q2 — Argument structure: paragraph 4 function
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.9, discrimination: 1.25, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "argumentative", "b2", "argument_structure", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 330, textType: "argumentative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "argument_structure", questionNumber: 2,
      prompt: "What is the function of the fourth paragraph (beginning 'Defenders of AI point to...')?",
      options: [
        { text: "To prove that AI decision-making is superior to human decision-making.",      isCorrect: false, rationale: "The writer concedes this point only to immediately reframe and limit it — not to prove AI superiority." },
        { text: "To introduce the writer's main conclusion about AI regulation.",              isCorrect: false, rationale: "The conclusion appears in the final paragraph; paragraph 4 handles a concession and counter-argument." },
        { text: "To acknowledge a valid counter-argument while arguing it sets too low a standard.", isCorrect: true, rationale: "The writer concedes the point is 'reasonable' but argues it 'sets an unacceptably low bar', reframing the comparison." },
        { text: "To summarise the evidence against the use of AI in decision-making.",        isCorrect: false, rationale: "This paragraph actually partially defends AI before the writer's reframing — it does not summarise anti-AI evidence." },
      ],
    },
  },
  // Q3 — Inference: bias reproduction mechanism
  {
    skill: "READING", cefrLevel: "B2", difficulty: 1.0, discrimination: 1.3, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "argumentative", "b2", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 330, textType: "argumentative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 3,
      prompt: "What does the writer imply about why AI hiring algorithms reproduce gender bias?",
      options: [
        { text: "Because AI programmers are themselves gender-biased.",                           isCorrect: false, rationale: "Programmer bias is not mentioned; the argument concerns the training data, not the people writing the code." },
        { text: "Because the historical employment data used to train the model reflects past discrimination.", isCorrect: true, rationale: "The writer says the model is 'trained on historical employment data from an industry where women were systematically underrepresented' — the data encodes past bias." },
        { text: "Because AI cannot process information about gender at all.",                     isCorrect: false, rationale: "The opposite is implied — the model processes gender-linked patterns in the training data too effectively." },
        { text: "Because the algorithm intentionally favours male candidates.",                   isCorrect: false, rationale: "The writer says the bias is unintentional — by design the model pattern-matches against a biased baseline." },
      ],
    },
  },
  // Q4 — Inference: accountability gap and legal rights
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.2, discrimination: 1.3, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "argumentative", "c1", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 330, textType: "argumentative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 4,
      prompt: "What does the writer imply about black-box AI systems and legal requirements?",
      options: [
        { text: "Black-box AI is already illegal in all jurisdictions.",                                      isCorrect: false, rationale: "The writer says individuals have a legal right to an explanation 'in many jurisdictions' — not that black-box AI is universally banned." },
        { text: "Black-box AI may be unable to meet individuals' legal right to understand decisions about them.", isCorrect: true, rationale: "The writer argues an unexplainable algorithm 'cannot fulfil that obligation' to give a reason — implying a potential legal conflict." },
        { text: "Loan applicants do not currently have any legal rights regarding algorithmic decisions.",      isCorrect: false, rationale: "The writer acknowledges these rights exist in many jurisdictions." },
        { text: "Only medical AI systems face legal accountability challenges.",                               isCorrect: false, rationale: "Loans are the specific example given; the accountability problem applies to AI decision-making broadly." },
      ],
    },
  },
  // Q5 — Author's purpose: the "bad human" comparison
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.3, discrimination: 1.3, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "argumentative", "c1", "author_purpose", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 330, textType: "argumentative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "author_purpose", questionNumber: 5,
      prompt: "Why does the writer say 'the comparison should not be AI versus a bad human'?",
      options: [
        { text: "To agree with AI defenders that human decision-making is always worse.",                  isCorrect: false, rationale: "The writer does not agree with this conclusion; it is stated only to be reframed." },
        { text: "To argue that the debate is framed too narrowly and the real benchmark should be higher.", isCorrect: true,  rationale: "The writer challenges the framing of the argument: the correct comparison is 'AI versus well-designed human processes' — raising the standard." },
        { text: "To suggest that all human decision-makers are biased or fatigued.",                       isCorrect: false, rationale: "The writer acknowledges human flaws but explicitly argues against this as the basis for accepting AI." },
        { text: "To show that AI is better than the worst human decision-makers.",                         isCorrect: false, rationale: "The writer calls this 'an unacceptably low bar' — this is precisely what the writer is arguing against." },
      ],
    },
  },
  // Q6 — Vocabulary-in-context: "opacity"
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.5, discrimination: 1.35, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "argumentative", "c1", "vocabulary_in_context", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 330, textType: "argumentative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_in_context", questionNumber: 6,
      prompt: "In the context of the third paragraph, what does 'opacity' refer to?",
      options: [
        { text: "The fact that AI models are expensive and difficult to build.",              isCorrect: false, rationale: "Cost and technical difficulty are not the concern here; opacity refers to the inability to explain decisions." },
        { text: "The inability to understand or explain how an AI model reaches its decisions.", isCorrect: true,  rationale: "The paragraph defines opacity immediately: models that designers 'cannot fully explain' — lack of interpretability." },
        { text: "The slow processing speed of some machine learning algorithms.",            isCorrect: false, rationale: "Processing speed is unrelated to the accountability argument being made." },
        { text: "The visual interface of AI dashboards being too complex for users.",        isCorrect: false, rationale: "Visual interface design is not the subject; opacity here is an epistemological concept about explainability." },
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
