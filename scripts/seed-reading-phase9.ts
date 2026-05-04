/**
 * READING PHASE 9 — ACADEMIA / SPECIALIZED
 * Module: "On the Nature of Expertise"
 * CEFR: C2 | Academic / Specialist adult | ~410 words | Complex academic essay
 * 6 questions: critical_reading ×1, lexical_precision ×2, implicit_argument ×1, rhetorical_strategy ×1, synthesis ×1
 *
 * SOTA notes:
 * - Complex academic essay: the definitive C2 genre.
 * - Requires multi-paragraph synthesis, recognition of rhetorical moves,
 *   and critical distance from the writer's own argument.
 * - IRT b-params: +2.0 → +2.6 (C2 upper tier).
 * - Distractors exploit: plausible surface reading, vocabulary near-synonyms with
 *   precision distinction, conflation of the writer's concession with the thesis.
 *
 *   npx tsx scripts/seed-reading-phase9.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "academia-reading-nature-expertise";
const PRODUCT_LINE = "ACADEMIA";
const MODULE_TITLE = "On the Nature of Expertise";
const CEFR_BAND    = "C2";

const PASSAGE = `The popular conception of expertise tends to resolve neatly: given sufficient practice — the frequently cited figure is ten thousand hours — a person will attain mastery in almost any domain. This view has the satisfying simplicity of a formula. It has also, in recent years, been substantially revised.

The revision is not a wholesale rejection. The role of deliberate practice in skill acquisition is well-established and remains significant. What is contested is the claim that practice alone is sufficient, or that its effects are roughly equivalent across individuals and domains. Longitudinal studies of chess players, musicians, and athletes reveal that the variance in performance explained by practice time is considerably more modest than the popular account implies — typically between 20 and 30 per cent, depending on the domain. The remainder is attributable to a complex of factors including working memory capacity, early domain exposure, quality of instruction, and — a conclusion that sits uncomfortably with meritocratic sensibilities — heritable cognitive traits.

The problem with the simplified account is not merely empirical inaccuracy. It generates two distortive effects. First, it places the full burden of under-performance on the individual, treating slow progress as a motivational failure rather than a contextual one. Second, it obscures the structural conditions that enable practice of sufficient quality and duration: access to expert coaching, financial security to defer employment, and the time asymmetries that disproportionately advantage those already advantaged.

There is a further complication. Expertise is not a unitary phenomenon. Deliberate practice produces the most measurable gains in domains characterised by stable rules and clear feedback — chess, surgery, classical music. In domains of high complexity and low predictability — macroeconomic forecasting, long-term strategic planning, clinical diagnosis of rare conditions — the relationship between experience and performance is far weaker, and in some cases negative. The expert's confidence, calibrated to tractable problems, may actually impair judgement in intractable ones.

What this body of research ultimately unsettles is not the value of expertise, but the conditions under which it should be trusted. A well-calibrated expert in a stable domain is an epistemic asset. An overconfident expert operating beyond the boundaries of that domain is an epistemic liability. The task — for institutions and individuals alike — is to develop the metacognitive capacity to distinguish between the two.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C2 — complex argumentation, hedged empirical claims, metacognitive vocabulary, sustained critical essay structure.
✓ Text type (academic essay) authentic C2 genre; discourse level comprehension required throughout.
✓ Q1 (critical_reading) — what evidence-based revision the writer makes to the popular account.
✓ Q2 (lexical_precision) — "deliberate" vs. general practice; disambiguation required.
✓ Q3 (implicit_argument) — structural conditions enabling practice; what is implied about equity.
✓ Q4 (rhetorical_strategy) — why the writer introduces chess/surgery as examples specifically.
✓ Q5 (synthesis) — combining paragraphs 4–5: what the research ultimately challenges.
✓ Q6 (lexical_precision) — "epistemic" in scholarly context.
✓ ~410 words; C2 timed reading (16–20 min).
HUMAN REVIEW: Q5 (synthesis) requires drawing from two non-adjacent paragraphs — confirm integration gap is appropriate for C2 rather than beyond-test-level.
`;

const items = [
  // Q1 — Critical reading: what is revised (not rejected)
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.0, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "expertise", "c2", "critical_reading", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 410, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "critical_reading", questionNumber: 1,
      prompt: "According to the writer, what does the research actually revise about the popular account of expertise?",
      options: [
        { text: "It disproves that practice has any role in skill acquisition.",                            isCorrect: false, rationale: "The writer states the revision is 'not a wholesale rejection'; practice remains 'significant'." },
        { text: "It challenges the claim that practice alone is sufficient and that its effects are uniform across people and domains.", isCorrect: true, rationale: "The writer says what is 'contested' is 'the claim that practice alone is sufficient, or that its effects are roughly equivalent across individuals and domains.'" },
        { text: "It shows that ten thousand hours of practice always leads to expert-level performance.",   isCorrect: false, rationale: "This is the popular account being revised, not what the research confirms." },
        { text: "It argues that expertise is entirely determined by heritable cognitive traits.",            isCorrect: false, rationale: "Heritable traits are listed as one contributing factor; the essay treats the determinants as plural and complex." },
      ],
    },
  },
  // Q2 — Lexical precision: "deliberate" practice
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.0, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "expertise", "c2", "lexical_precision", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 410, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "lexical_precision", questionNumber: 2,
      prompt: "What does 'deliberate practice' most precisely refer to in the context of skill acquisition research?",
      options: [
        { text: "Any practice carried out over a long period of time.",                              isCorrect: false, rationale: "Duration alone does not constitute deliberate practice; the concept requires intentional, structured effort aimed at improvement." },
        { text: "Practice that is structured, effortful, and targeted at improving specific weaknesses.", isCorrect: true, rationale: "In skill acquisition research (Ericsson et al.), 'deliberate practice' refers to focused, intentional repetition aimed at specific improvement — not casual or incidental activity." },
        { text: "Practice that is performed with full conscious awareness of each action.",          isCorrect: false, rationale: "Conscious awareness alone does not capture the intentional improvement-targeting aspect of the term." },
        { text: "Practice supervised directly by an expert coach.",                                 isCorrect: false, rationale: "Coaching is a related enabler, but deliberate practice is defined by its structure and intent, not necessarily the presence of a coach." },
      ],
    },
  },
  // Q3 — Implicit argument: structural conditions and equity
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.1, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "expertise", "c2", "implicit_argument", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 410, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "implicit_argument", questionNumber: 3,
      prompt: "What does the writer imply by listing 'access to expert coaching, financial security, and time asymmetries' as conditions enabling practice?",
      options: [
        { text: "These factors prove that expertise is impossible to achieve without wealth.",            isCorrect: false, rationale: "Impossibility is not claimed; the writer argues the simplified account obscures unequal structural conditions — a critique of the narrative, not an absolute claim." },
        { text: "The simplified account of expertise ignores how social and economic privilege facilitates deliberate practice.", isCorrect: true, rationale: "By listing conditions that 'disproportionately advantage those already advantaged', the writer implies the practice-only narrative overlooks structural inequity." },
        { text: "Coaching quality is the single most important factor in achieving expertise.",           isCorrect: false, rationale: "Coaching is one of several structural factors listed; no hierarchy is established among them." },
        { text: "Financial security eliminates the need for deliberate practice altogether.",             isCorrect: false, rationale: "Financial security is listed as an enabling condition for practice, not a replacement for it." },
      ],
    },
  },
  // Q4 — Rhetorical strategy: chess/surgery as examples
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.2, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "expertise", "c2", "rhetorical_strategy", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 410, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "rhetorical_strategy", questionNumber: 4,
      prompt: "Why does the writer specifically cite chess, surgery, and classical music as examples in the fourth paragraph?",
      options: [
        { text: "To show that these domains are the only ones worth studying in expertise research.",      isCorrect: false, rationale: "The examples are used to contrast with high-complexity domains; no claim to their unique research value is made." },
        { text: "To illustrate the domain conditions under which deliberate practice has the most measurable effect.", isCorrect: true, rationale: "These are introduced as examples of domains with 'stable rules and clear feedback' — precisely the conditions that make practice-performance relationships strong." },
        { text: "To argue that these fields require more practice than other domains.",                    isCorrect: false, rationale: "Quantity of practice required is not the point; the stability of feedback and rules is what distinguishes them." },
        { text: "To show that expertise in high-status professions always transfers to other fields.",     isCorrect: false, rationale: "The article argues against cross-domain transfer — expertise may actually impair judgement outside its defining domain." },
      ],
    },
  },
  // Q5 — Synthesis: what the research ultimately unsettles
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.4, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "expertise", "c2", "synthesis", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 410, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "synthesis", questionNumber: 5,
      prompt: "Drawing on both the fourth and fifth paragraphs, what is the key practical implication the writer draws from the research?",
      options: [
        { text: "Experts should be excluded from decision-making in complex domains.",                       isCorrect: false, rationale: "Exclusion is not advocated; the writer calls for 'metacognitive capacity to distinguish' — a refinement of trust, not its elimination." },
        { text: "Expertise itself is unreliable and should not be trusted in any context.",                  isCorrect: false, rationale: "The writer distinguishes between 'well-calibrated experts' (epistemic assets) and overconfident ones — expertise is not uniformly dismissed." },
        { text: "Trust in expertise should be conditional on whether the domain is stable and the expert's confidence is well-calibrated.", isCorrect: true, rationale: "Paragraph 4 identifies stable vs. unpredictable domains as the key variable; paragraph 5 maps this onto 'epistemic asset' vs. 'epistemic liability' — the synthesis is domain-match + calibration." },
        { text: "Only practitioners with over ten thousand hours of practice should be considered genuine experts.", isCorrect: false, rationale: "The essay's entire argument challenges the sufficiency of practice-hour thresholds; this answer reasserts the simplified account the writer critiques." },
      ],
    },
  },
  // Q6 — Lexical precision: "epistemic"
  {
    skill: "READING", cefrLevel: "C2", difficulty: 2.6, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "expertise", "c2", "lexical_precision", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 410, textType: "academic essay",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "lexical_precision", questionNumber: 6,
      prompt: "What does 'epistemic' mean in the phrases 'epistemic asset' and 'epistemic liability'?",
      options: [
        { text: "Related to economic value and financial risk.",                                         isCorrect: false, rationale: "'Epistemic' derives from 'episteme' (knowledge); it is not an economic term." },
        { text: "Relating to knowledge, the reliability of information, and the grounds for belief.",    isCorrect: true,  rationale: "Epistemic concerns knowledge and its justification — here, the expert is an asset or liability in terms of the knowledge and judgement they provide." },
        { text: "Related to ethics and moral responsibility.",                                          isCorrect: false, rationale: "'Epistemic' concerns knowledge; 'ethical' concerns morality — these are distinct philosophical domains." },
        { text: "Related to the emotional or psychological state of the individual.",                   isCorrect: false, rationale: "The psychological sense of expertise confidence is discussed earlier, but 'epistemic' in this context is a knowledge-centred philosophical term." },
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
