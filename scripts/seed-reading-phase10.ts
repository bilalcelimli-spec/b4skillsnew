/**
 * READING PHASE 10 — ACADEMIA / SPECIALIZED
 * Module: "The Epistemology of Doubt"
 * CEFR: C2 | Postgraduate / Specialist | ~415 words | Dense academic essay (philosophy of science)
 * 6 questions: rhetorical_strategy ×1, lexical_precision ×2, implicit_argument ×1,
 *              critical_evaluation ×1, synthesis ×1
 *
 * SOTA notes:
 * - Philosophy of science / epistemology: peak C2 genre.
 * - Sustained irony + metalinguistic self-awareness in the text itself.
 * - IRT b-params: +2.2 → +2.8 (C2 ceiling range).
 * - Distractors exploit: false paraphrase of hedged claims, lexical near-neighbours
 *   (systematic vs. systemic; falsifiable vs. testable), and conflation of the
 *   writer's meta-argument with a first-order empirical claim.
 *
 *   npx tsx scripts/seed-reading-phase10.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "academia-reading-epistemology-doubt";
const PRODUCT_LINE = "ACADEMIA";
const MODULE_TITLE = "The Epistemology of Doubt";
const CEFR_BAND    = "C2";

const PASSAGE = `Science, we are often told, is distinguished from other knowledge-producing practices by its willingness to be wrong. This formulation — elegant in its simplicity — contains a philosophical claim that is both correct and deeply incomplete. Popper's criterion of falsifiability identified a genuine asymmetry: no quantity of confirming instances can verify a universal claim, but a single counterexample can refute it. The asymmetry is real. The conclusion Popper drew from it — that scientific rationality consists in actively seeking refutation — is considerably more contentious than its near-universal acceptance in public discourse would suggest.

The difficulty begins at the level of practice. Scientists do not, in the ordinary course of their work, seek to disprove their own theories. They defend them. When anomalous results emerge, the default scientific response is not to abandon the theory but to interrogate the anomaly: is the instrument calibrated correctly? Was the sample contaminated? Has an auxiliary hypothesis failed? This is not irrationality — it is the reasonable conservatism of investigators who understand that well-established theories are more likely to be correct than individual experimental results are to be reliable. Lakatos formalised this observation into his account of research programmes, distinguishing a 'hard core' of commitments that a research community will protect at almost any cost from a 'protective belt' of auxiliary assumptions that absorbs contrary evidence.

But conservatism in theory-defence carries risks that are easy to understate. The same cognitive and institutional architecture that correctly shields mature theories from premature abandonment also creates structural resistance to paradigm-level revision. Kuhn's account of scientific revolutions — however contested in its details — captures something genuinely important: communities of inquiry may sustain a failing research programme well beyond what an idealised rational agent would permit, not from stupidity, but from the deep investment of careers, institutions, and identities.

What this implies for the epistemology of doubt is subtle. Doubt is not the negation of knowledge; it is its precondition. But the productive deployment of doubt is neither easy nor automatic. It requires institutional structures that incentivise criticism — peer review that genuinely challenges rather than validates; research cultures that reward intellectual risk; funding regimes that allow exploratory work not tied to expected outcomes. Without these conditions, the principle of falsifiability remains a methodological aspiration rather than a description of how knowledge actually advances.

The great irony, perhaps, is that the epistemology most faithful to science's self-image — rigorous, self-correcting, doubt-embracing — is also the one least likely to emerge without deliberate institutional design.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C2 — metalinguistic commentary, dense academic argument, named theoretical frameworks (Popper, Lakatos, Kuhn), ironic self-referentiality, complex hedging.
✓ Text type (philosophy of science essay) authentic C2 ceiling genre.
✓ Q1 (rhetorical_strategy) — function of opening: "correct AND deeply incomplete" signals concession-before-critique.
✓ Q2 (lexical_precision) — "falsifiability" (Popperian technical term) vs. general testability.
✓ Q3 (implicit_argument) — Lakatos's hard core/protective belt: what this implies about scientists resisting refutation.
✓ Q4 (critical_evaluation) — what qualification the writer adds to Kuhn's account.
✓ Q5 (synthesis) — combining para 4–5: institutional conditions enabling productive doubt.
✓ Q6 (lexical_precision) — "heuristic" — not present in text, replaced by "auxiliary hypothesis" — test: "auxiliary" in Lakatosian context vs. colloquial.
✓ ~415 words; C2 timed reading (18–22 min).
HUMAN REVIEW: Q3 requires knowledge of Lakatos's terminology from the text — confirm all needed context is within the passage (not assumed prior knowledge).
`;

const items = [
  // Q1 — Rhetorical strategy: opening move
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.2, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "philosophy_of_science", "c2", "rhetorical_strategy", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 415, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "rhetorical_strategy", questionNumber: 1,
      prompt: "What rhetorical purpose does the phrase 'both correct and deeply incomplete' serve in the first paragraph?",
      options: [
        { text: "It signals that the writer believes Popper's criterion is entirely wrong.",               isCorrect: false, rationale: "The writer explicitly concedes Popper's asymmetry is 'real' — the move is concession-before-qualification, not total rejection." },
        { text: "It establishes a concessive structure that grants partial validity to a popular claim before critiquing its incompleteness.", isCorrect: true, rationale: "The formulation mirrors the essay's structural strategy: grant what is correct (falsifiability as real) in order to introduce the more important qualification (Popper's conclusion is 'contentious')." },
        { text: "It shows that the writer is uncertain whether science is a reliable knowledge-producing practice.", isCorrect: false, rationale: "The writer questions Popper's specific formulation, not science's epistemic status broadly." },
        { text: "It introduces the Lakatosian critique of falsificationism directly.",                      isCorrect: false, rationale: "Lakatos is introduced in paragraph 2; the opening phrase sets up the broader critical strategy without naming Lakatos." },
      ],
    },
  },
  // Q2 — Lexical precision: "falsifiability"
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.3, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "philosophy_of_science", "c2", "lexical_precision", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 415, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "lexical_precision", questionNumber: 2,
      prompt: "As used in this article, 'falsifiability' means:",
      options: [
        { text: "The capacity of a theory to be shown to be false by evidence.",          isCorrect: true,  rationale: "In Popper's philosophy of science, a theory is 'falsifiable' if there exists some possible observation that could, in principle, contradict it — enabling refutation." },
        { text: "The likelihood that a theory will eventually be proven wrong.",          isCorrect: false, rationale: "'Falsifiability' is a logical criterion about what could potentially refute a theory, not a probabilistic prediction about whether it will be." },
        { text: "The process of independently verifying experimental results.",           isCorrect: false, rationale: "Verification/replication is a related but distinct scientific practice; falsifiability is specifically about potential disproof." },
        { text: "The degree to which a theory makes specific numerical predictions.",     isCorrect: false, rationale: "Quantitative precision is related to testability but is not the definition of falsifiability." },
      ],
    },
  },
  // Q3 — Implicit argument: Lakatos and theory defence
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.4, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "philosophy_of_science", "c2", "implicit_argument", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 415, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "implicit_argument", questionNumber: 3,
      prompt: "What does the writer imply about scientific communities through Lakatos's concept of the 'protective belt'?",
      options: [
        { text: "Scientific communities are dishonest and systematically suppress contradictory evidence.", isCorrect: false, rationale: "The writer explicitly calls the conservatism 'reasonable', not dishonest; the protective belt is a rational institutional response." },
        { text: "Scientists are rational when they protect core theories by questioning individual anomalous results.", isCorrect: true, rationale: "The protective belt absorbs contrary evidence by questioning auxiliary assumptions — the writer endorses this as 'reasonable conservatism' of investigators who trust established theories over individual results." },
        { text: "The hard core of a research programme can never be revised under any circumstances.",    isCorrect: false, rationale: "The hard core is protected 'at almost any cost' — but Kuhn's discussion of revolutions implies paradigm change is possible, and the writer's argument elsewhere supports this." },
        { text: "Lakatos's account confirms that Popper's falsificationism is entirely correct.",        isCorrect: false, rationale: "Lakatos's account is introduced to complicate Popper's — it formalises why scientists do not in practice follow strict Popperian falsificationism." },
      ],
    },
  },
  // Q4 — Critical evaluation: writer's qualification of Kuhn
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.5, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "philosophy_of_science", "c2", "critical_evaluation", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 415, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "critical_evaluation", questionNumber: 4,
      prompt: "How does the writer qualify the reference to Kuhn's account of scientific revolutions?",
      options: [
        { text: "By arguing that Kuhn's account is entirely accurate and requires no qualification.",     isCorrect: false, rationale: "The writer acknowledges Kuhn's account is 'contested in its details' — an explicit qualification." },
        { text: "By dismissing Kuhn's account as too speculative to be of use in this argument.",        isCorrect: false, rationale: "The writer uses Kuhn's insight as a genuine contribution ('captures something genuinely important') despite acknowledging contestation." },
        { text: "By accepting Kuhn's core insight about paradigm resistance while acknowledging that details of his account are disputed.", isCorrect: true, rationale: "The writer's hedge 'however contested in its details' concedes Kuhnian controversy while using the account's central observation about community resistance to revision." },
        { text: "By claiming that Kuhn applies only to natural sciences, not social sciences.",           isCorrect: false, rationale: "No such domain restriction is asserted in the text." },
      ],
    },
  },
  // Q5 — Synthesis: institutional conditions for productive doubt
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.6, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "philosophy_of_science", "c2", "synthesis", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 415, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "synthesis", questionNumber: 5,
      prompt: "What does the article suggest, across paragraphs 4 and 5, about how genuine doubt functions in science?",
      options: [
        { text: "Genuine doubt is natural to scientists and operates automatically without institutional support.", isCorrect: false, rationale: "The writer explicitly argues the 'productive deployment of doubt is neither easy nor automatic' and requires deliberate institutional design." },
        { text: "Genuine doubt requires deliberate institutional structures — criticism-incentivising review, risk-rewarding culture, and exploratory funding.", isCorrect: true, rationale: "Paragraph 4 lists specific institutional conditions; paragraph 5 reinforces that the self-correcting ideal requires 'deliberate institutional design' — the synthesis is: productive doubt is institution-dependent." },
        { text: "Doubt is only productive when it leads to the immediate refutation of existing theories.", isCorrect: false, rationale: "The article argues against naive falsificationism; doubt is productive even when it doesn't immediately overturn theories, as long as the system incentivises it." },
        { text: "The most productive doubt comes from outside scientific communities, not from within them.", isCorrect: false, rationale: "Internal institutional structures — peer review, research culture — are the focus; external doubt is not the argument." },
      ],
    },
  },
  // Q6 — Lexical precision: "auxiliary hypothesis"
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.8, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "philosophy_of_science", "c2", "lexical_precision", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 415, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "lexical_precision", questionNumber: 6,
      prompt: "In the context of the second paragraph, what is an 'auxiliary hypothesis'?",
      options: [
        { text: "The main theoretical claim that a scientist is trying to prove.",                    isCorrect: false, rationale: "Auxiliary hypotheses are the supporting assumptions surrounding the core claim, not the core claim itself." },
        { text: "A supporting assumption (about instruments, conditions, etc.) that can absorb anomalous results without abandoning the main theory.", isCorrect: true, rationale: "In Lakatosian philosophy of science, auxiliary hypotheses (the 'protective belt') include assumptions about instruments, conditions, and methodology that can be modified to explain away anomalies while preserving the theory's core." },
        { text: "A secondary hypothesis proposed after a theory has been disproved.",                isCorrect: false, rationale: "Auxiliary hypotheses are part of the theory's architecture from the outset — they are not post-hoc replacements." },
        { text: "A statistical tool used to test whether experimental results are significant.",     isCorrect: false, rationale: "Statistical significance testing is a methodological tool; an auxiliary hypothesis is a philosophical/conceptual element of a theory's structure." },
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
