/**
 * READING PHASE 5 — ACADEMIA / CORPORATE
 * Module: "The Science of Sleep"
 * CEFR: B2 | Academic & professional adult | ~310 words | Scientific article
 * 6 questions: gist ×1, detail ×2, inference ×2, vocabulary-in-context ×1
 *
 * SOTA notes:
 * - Informational/scientific text type: canonical B2 genre (magazine science article).
 * - Multiple paragraph tracking required; no single-sentence answers.
 * - IRT b-params: +0.5 → +1.1 (solid B2 range).
 * - Distractors exploit summary distortion and plausible-but-unsupported conclusions.
 *
 *   npx tsx scripts/seed-reading-phase5.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { validateItemBatch, reportValidationResults } from './_validation-helper.js';
const prisma = new PrismaClient();

const MODULE_ID    = "academia-reading-sleep-science";
const PRODUCT_LINE = "ACADEMIA";
const MODULE_TITLE = "The Science of Sleep";
const CEFR_BAND    = "B2";

const PASSAGE = `For most of human history, sleep was considered a passive state — the body simply switching off until morning. Modern neuroscience has overturned that assumption entirely. Sleep is now understood to be a highly active process, during which the brain performs essential maintenance tasks that are impossible while we are awake.

One of the most significant discoveries in sleep research is the role of the glymphatic system. Active mainly during sleep, this network of channels in the brain clears away metabolic waste products, including proteins associated with neurodegenerative diseases such as Alzheimer's. Studies on mice have shown that the glymphatic system is nearly ten times more active during sleep than during wakefulness. Whether this finding fully translates to humans remains an area of active research, but the implications are significant.

Sleep is also central to memory consolidation. During slow-wave sleep, the hippocampus — the brain's primary short-term memory store — systematically replays recently acquired information and transfers it to the cortex for long-term storage. Disrupting this phase impairs learning far more severely than simply reducing total sleep time.

Despite this scientific consensus, surveys consistently show that a large proportion of adults in industrialised nations sleep fewer than the recommended seven to nine hours per night. The reasons are largely structural: long working hours, digital screen exposure before bed, and shift work disrupt the natural circadian rhythm that regulates the sleep-wake cycle.

Researchers argue that treating insufficient sleep as a personal failing misses the point. Sleep deprivation is, in large part, a design problem — a consequence of how modern societies are organised — and addressing it requires systemic, not merely individual, solutions.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — complex noun phrases, passive structures, academic hedging (remains/whether/suggests), logical connectors.
✓ Text type (science article) authentic B2 academic input.
✓ Q1 (gist) — central claim of the passage (sleep is active, not passive).
✓ Q2 (detail) — glymphatic activity ratio (×10); trap: wrong multiplier.
✓ Q3 (detail) — what happens to memory during slow-wave sleep.
✓ Q4 (inference) — why treating sleep deprivation as personal failing is inadequate.
✓ Q5 (inference) — implication of glymphatic system research for Alzheimer's.
✓ Q6 (vocabulary-in-context) — "consolidation" in memory research context.
✓ ~310 words; B2 timed reading (10–12 min).
HUMAN REVIEW: Q5 requires multi-sentence synthesis; confirm inference gap is fair for B2 rather than C1.
`;

const items = [
  // Q1 — Gist
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "science", "b2", "gist", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 310, textType: "scientific article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "gist", questionNumber: 1,
      prompt: "What is the central argument of this article?",
      options: [
        { text: "People in modern societies deliberately choose to sleep less.",                        isCorrect: false, rationale: "The article attributes sleep deprivation to structural factors, not deliberate choice." },
        { text: "Sleep is an active biological process with critical functions for brain health.",       isCorrect: true,  rationale: "The opening reframes sleep as active maintenance; subsequent paragraphs detail these functions (glymphatic, memory)." },
        { text: "The glymphatic system is the most important discovery in neuroscience.",               isCorrect: false, rationale: "The glymphatic system is one example; the broader argument concerns sleep's overall active role." },
        { text: "Alzheimer's disease is primarily caused by insufficient sleep.",                       isCorrect: false, rationale: "The article notes an association between glymphatic function and Alzheimer's-related proteins, not a direct causal claim." },
      ],
    },
  },
  // Q2 — Detail: glymphatic activity ratio
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.6, discrimination: 1.2, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "science", "b2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 310, textType: "scientific article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 2,
      prompt: "According to mouse studies, how much more active is the glymphatic system during sleep compared with wakefulness?",
      options: [
        { text: "Twice as active",       isCorrect: false, rationale: "The article specifies 'nearly ten times', not two times." },
        { text: "Five times as active",  isCorrect: false, rationale: "Five times is half the figure stated; the article reports nearly ten times." },
        { text: "Nearly ten times as active", isCorrect: true, rationale: "The text states the glymphatic system is 'nearly ten times more active during sleep than during wakefulness.'" },
        { text: "Twenty times as active", isCorrect: false, rationale: "Twenty times is double the stated figure; the article says nearly ten times." },
      ],
    },
  },
  // Q3 — Detail: memory consolidation
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.6, discrimination: 1.2, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "science", "b2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 310, textType: "scientific article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 3,
      prompt: "According to the article, what happens to recently learned information during slow-wave sleep?",
      options: [
        { text: "It is permanently deleted from the hippocampus.",                          isCorrect: false, rationale: "Information is transferred to the cortex, not deleted." },
        { text: "It is replayed by the hippocampus and moved to the cortex for long-term storage.", isCorrect: true, rationale: "The article states the hippocampus 'replays recently acquired information and transfers it to the cortex for long-term storage.'" },
        { text: "It is immediately encoded in the cortex without hippocampal involvement.", isCorrect: false, rationale: "The hippocampus is specifically named as the mediator in this process." },
        { text: "It is reinforced only if total sleep time exceeds nine hours.",            isCorrect: false, rationale: "The article links disruption of the sleep phase to learning impairment, but does not specify a minimum total duration for consolidation." },
      ],
    },
  },
  // Q4 — Inference: structural causes
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.8, discrimination: 1.25, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "science", "b2", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 310, textType: "scientific article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 4,
      prompt: "What does the writer imply by saying sleep deprivation is 'a design problem'?",
      options: [
        { text: "Beds and mattresses are not designed well enough for good sleep.",              isCorrect: false, rationale: "Physical sleep products are not discussed; 'design' here refers to the organisation of society." },
        { text: "Individuals simply need better personal habits to sleep more.",                 isCorrect: false, rationale: "The writer explicitly argues against treating sleep deprivation as a personal failing." },
        { text: "How modern work and life are organised causes insufficient sleep structurally.", isCorrect: true,  rationale: "The writer calls it 'a consequence of how modern societies are organised', requiring 'systemic' solutions." },
        { text: "New technology should be designed to help people sleep better.",               isCorrect: false, rationale: "Technology is mentioned as a disruptor (screens), not a potential solution in this paragraph." },
      ],
    },
  },
  // Q5 — Inference: Alzheimer's implication
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.9, discrimination: 1.25, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "science", "b2", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 310, textType: "scientific article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 5,
      prompt: "What can be inferred about the potential link between sleep and Alzheimer's disease?",
      options: [
        { text: "Scientists have conclusively proven that sleep prevents Alzheimer's.",       isCorrect: false, rationale: "The article uses hedging language ('remains an area of active research'), indicating no definitive conclusion yet." },
        { text: "Poor sleep may contribute to the accumulation of harmful proteins in the brain.", isCorrect: true, rationale: "The glymphatic system clears Alzheimer's-associated proteins during sleep; if sleep is poor, these may accumulate — this is the implied risk." },
        { text: "Alzheimer's patients should sleep more than nine hours per night.",          isCorrect: false, rationale: "No specific treatment recommendation for Alzheimer's patients is made in the article." },
        { text: "The glymphatic system only functions in patients who already have Alzheimer's.", isCorrect: false, rationale: "The glymphatic system is described as operating in all sleeping brains, not only in those with disease." },
      ],
    },
  },
  // Q6 — Vocabulary-in-context: "consolidation"
  {
    skill: "READING", cefrLevel: "B2", difficulty: 1.1, discrimination: 1.3, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "science", "b2", "vocabulary_in_context", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 310, textType: "scientific article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_in_context", questionNumber: 6,
      prompt: "In the phrase 'memory consolidation', what does 'consolidation' most closely mean?",
      options: [
        { text: "The creation of entirely new memories during sleep.",       isCorrect: false, rationale: "Consolidation concerns strengthening and transferring existing memories, not creating new ones during sleep." },
        { text: "The process of strengthening and stabilising memories.",    isCorrect: true,  rationale: "Consolidation in neuroscience refers to the process by which unstable short-term memories become stable long-term ones." },
        { text: "The deletion of unimportant memories to free up capacity.", isCorrect: false, rationale: "While forgetting is a related phenomenon, 'consolidation' specifically describes strengthening, not deletion." },
        { text: "The conscious review of learned material before sleep.",    isCorrect: false, rationale: "Conscious review is a waking activity; consolidation is an automatic process occurring during sleep." },
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
  const { valid, invalid } = validateItemBatch(items);
  reportValidationResults(valid.length, invalid.length, invalid);
  if (invalid.length > 0) {
    console.error(`Cannot proceed: ${invalid.length} items failed validation`);
    process.exit(1);
  }
  for (const item of valid) {
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
