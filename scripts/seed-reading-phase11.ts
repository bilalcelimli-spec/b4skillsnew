/**
 * READING — Phase 11: Gap-fill to reach 200
 * Module: "The Myth of Multitasking"
 * CEFR: B1–B2 | Language Schools / Academia | ~290 words | Magazine science article
 * 8 questions: gist ×1, detail ×3, inference ×2, vocabulary-in-context ×2
 *
 * SEED_TAG: "seed-reading-phase11"
 * Distribution: B1=4, B2=4 = 8 items
 *
 *   npx tsx scripts/seed-reading-phase11.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SEED_TAG    = "seed-reading-phase11";
const MODULE_ID    = "langschool-reading-multitasking-myth";
const PRODUCT_LINE = "Language Schools";
const MODULE_TITLE = "The Myth of Multitasking";

const PASSAGE = `You may believe you can listen to a podcast, reply to a message, and follow a conversation all at once. Research suggests you are wrong. What we call multitasking is, in most cases, rapid task-switching — and the cost to performance is significant.

Psychologists at Stanford University compared students who described themselves as heavy media multitaskers with those who rarely combined tasks. The heavy multitaskers performed worse on tests of attention, memory, and the ability to switch between tasks — the very skills they believed they had developed through constant practice. It appears that regularly dividing attention does not train the brain to handle multiple streams of information; it simply reduces the quality of each.

The reason lies in the brain's attentional bottleneck. The prefrontal cortex, responsible for planning and decision-making, can focus deeply on only one demanding task at a time. When we attempt to do two such tasks simultaneously, both compete for the same limited neural resources. Reaction times slow, errors increase, and the sense of productivity is largely an illusion.

Some tasks can of course be combined: walking and talking, for instance, or listening to music while doing routine physical work. These pairings work because one task is sufficiently automatic to require minimal conscious attention. The problem arises when both tasks demand active thinking.

The practical implication is clear. If you want to work at your best, reduce interruptions, close unnecessary tabs, and give your full attention to one task before moving to the next. The evidence consistently shows that focused, sequential working outperforms the scattered approach most people default to in an always-connected world.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ B1/B2 range — accessible vocabulary with some academic hedging (suggests, appears, largely).
✓ Text type (magazine science article) appropriate for language school and academic contexts.
✓ Q1 (gist) — central claim (multitasking is task-switching with costs).
✓ Q2 (detail) — Stanford finding about heavy multitaskers.
✓ Q3 (detail) — attentional bottleneck explanation.
✓ Q4 (detail) — when task-combining does work.
✓ Q5 (inference) — implication of the bottleneck for productivity claims.
✓ Q6 (inference) — why heavy multitaskers performed unexpectedly poorly.
✓ Q7 (vocab-in-context) — "bottleneck".
✓ Q8 (vocab-in-context) — "sequential".
✓ ~290 words; B1–B2 timed reading (8–10 min).
`;

const items = [
  // Q1 — Gist
  {
    cefrLevel: "B1", difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b1", "gist", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B1", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "gist", questionNumber: 1,
      prompt: "What is the main message of this article?",
      options: [
        { text: "Smartphones are the biggest cause of poor concentration.",         isCorrect: false, rationale: "Smartphones are implied in the context but the article's main focus is on multitasking in general." },
        { text: "Doing several things at once actually reduces performance, not improves it.", isCorrect: true, rationale: "The article argues multitasking is rapid task-switching with significant performance costs." },
        { text: "The prefrontal cortex can be trained to multitask efficiently.",   isCorrect: false, rationale: "The article argues against this; the Stanford study shows heavy multitaskers did not improve." },
        { text: "Walking and talking is the best example of effective multitasking.", isCorrect: false, rationale: "This is a minor supporting detail, not the main message." },
      ],
    },
  },
  // Q2 — Detail: Stanford result
  {
    cefrLevel: "B1", difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b1", "detail", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B1", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 2,
      prompt: "What did the Stanford study find about heavy media multitaskers?",
      options: [
        { text: "They were better at paying attention and switching between tasks.",     isCorrect: false, rationale: "The opposite is true — they performed worse on exactly those skills." },
        { text: "They performed worse on attention, memory, and task-switching tests.", isCorrect: true, rationale: "The article states they scored lower on 'tests of attention, memory, and the ability to switch between tasks.'" },
        { text: "They were just as good as light multitaskers on all measures.",        isCorrect: false, rationale: "The article shows a clear performance gap, with heavy multitaskers doing worse." },
        { text: "They had better reaction times than students who rarely multitasked.", isCorrect: false, rationale: "Slower reaction times are linked to task-switching; the heavy multitaskers did not have an advantage." },
      ],
    },
  },
  // Q3 — Detail: attentional bottleneck
  {
    cefrLevel: "B2", difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b2", "detail", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B2", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 3,
      prompt: "According to the article, why does attempting two demanding tasks simultaneously reduce performance?",
      options: [
        { text: "The body becomes physically tired when performing two tasks at once.",         isCorrect: false, rationale: "The explanation is neural/cognitive, not physical." },
        { text: "Both tasks compete for the same limited neural resources in the prefrontal cortex.", isCorrect: true, rationale: "The article explains that the prefrontal cortex can only focus on one demanding task; two tasks compete for its limited capacity." },
        { text: "The memory system cannot store information from more than one source.",        isCorrect: false, rationale: "Memory storage is not the mechanism described for the performance drop during simultaneous tasks." },
        { text: "People become bored and lose motivation when doing two things at once.",       isCorrect: false, rationale: "Motivation/boredom is not part of the explanation offered in the article." },
      ],
    },
  },
  // Q4 — Detail: when combining tasks works
  {
    cefrLevel: "B1", difficulty: 0.1, discrimination: 1.1, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b1", "detail", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B1", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 4,
      prompt: "When does the article say that combining two tasks can work?",
      options: [
        { text: "When both tasks require active, conscious thinking.",                  isCorrect: false, rationale: "The article says combining such tasks is specifically problematic." },
        { text: "When one of the tasks is automatic and requires very little conscious attention.", isCorrect: true, rationale: "The article states task-pairing works 'because one task is sufficiently automatic to require minimal conscious attention.'" },
        { text: "When a person has practised multitasking for several years.",         isCorrect: false, rationale: "The Stanford study suggests practice does not improve multitasking; it does not help." },
        { text: "When the tasks involve different areas of the body, e.g. hands and eyes.", isCorrect: false, rationale: "The article's explanation focuses on attention and cognition, not the body parts involved." },
      ],
    },
  },
  // Q5 — Inference: productivity illusion
  {
    cefrLevel: "B2", difficulty: 0.7, discrimination: 1.2, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b2", "inference", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B2", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 5,
      prompt: "What does the writer imply by calling the sense of productivity 'largely an illusion'?",
      options: [
        { text: "People who multitask are usually trying to avoid real work.",                   isCorrect: false, rationale: "The writer makes no claim about motivation; the point concerns perception vs reality of output." },
        { text: "Multitaskers feel they are being productive but their actual output is lower quality.", isCorrect: true, rationale: "The word 'illusion' implies the feeling does not match reality; combined with the performance data, the implication is false perception of productivity." },
        { text: "Measuring productivity accurately is impossible in modern workplaces.",         isCorrect: false, rationale: "Measurement methodology is not discussed; the point is about subjective feeling vs actual performance." },
        { text: "Only managers who observe staff closely can judge how productive someone is.",  isCorrect: false, rationale: "The article does not mention managerial observation; the point is self-perception vs cognitive reality." },
      ],
    },
  },
  // Q6 — Inference: heavy multitaskers' paradox
  {
    cefrLevel: "B2", difficulty: 0.8, discrimination: 1.2, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b2", "inference", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B2", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 6,
      prompt: "Why is the Stanford finding described as particularly surprising?",
      options: [
        { text: "Nobody expected university students to participate in the study.",                  isCorrect: false, rationale: "The choice of participants is not the source of surprise." },
        { text: "Heavy multitaskers performed worst in the very areas they believed they had mastered.", isCorrect: true, rationale: "The article notes they believed they had 'developed' those skills through practice — yet they scored lowest on exactly those measures." },
        { text: "Light multitaskers completed the tests much faster than expected.",                isCorrect: false, rationale: "The speed of light multitaskers is not mentioned as surprising." },
        { text: "The study was conducted at a university famous for technology research.",         isCorrect: false, rationale: "The institution's reputation is not cited as a source of surprise." },
      ],
    },
  },
  // Q7 — Vocabulary-in-context: "bottleneck"
  {
    cefrLevel: "B2", difficulty: 0.6, discrimination: 1.2, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b2", "vocabulary_in_context", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B2", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_in_context", questionNumber: 7,
      prompt: "In the phrase 'attentional bottleneck', what does 'bottleneck' most closely mean in this context?",
      options: [
        { text: "A physical restriction in the shape of the human brain.",    isCorrect: false, rationale: "'Bottleneck' is used metaphorically here; the article refers to cognitive, not anatomical, limitation." },
        { text: "A point where processing capacity is limited, causing slowdowns.", isCorrect: true, rationale: "A bottleneck is a constriction point; here it means the prefrontal cortex can only process one demanding stream at a time." },
        { text: "A stage at which the brain deletes unnecessary information.", isCorrect: false, rationale: "Deletion/forgetting is not what the metaphor describes; it refers to capacity limitation." },
        { text: "A moment of peak concentration when the brain works fastest.", isCorrect: false, rationale: "A bottleneck implies restriction, not peak performance." },
      ],
    },
  },
  // Q8 — Vocabulary-in-context: "sequential"
  {
    cefrLevel: "B1", difficulty: 0.2, discrimination: 1.1, guessing: 0.25,
    tags: ["reading", "language-schools", "science", "b1", "vocabulary_in_context", MODULE_ID, SEED_TAG],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: "B1", wordCount: 290, textType: "magazine science article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_in_context", questionNumber: 8,
      prompt: "In the final paragraph, what does 'sequential' mean in 'focused, sequential working'?",
      options: [
        { text: "Doing tasks one after another in order.",          isCorrect: true,  rationale: "'Sequential' means following a sequence — completing one task before starting the next, which is precisely the advice given." },
        { text: "Doing tasks simultaneously to save time.",        isCorrect: false, rationale: "Simultaneous working is what the article argues against; 'sequential' is its opposite." },
        { text: "Working at very high speed without stopping.",    isCorrect: false, rationale: "Speed is not implied by 'sequential'; the word relates to order, not pace." },
        { text: "Asking others for help to divide the workload.",  isCorrect: false, rationale: "Delegation/collaboration is not the meaning of 'sequential' in this context." },
      ],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} reading items`);
    const byLevel: Record<string, number> = {};
    for (const i of items) byLevel[i.cefrLevel] = (byLevel[i.cefrLevel] || 0) + 1;
    console.table(byLevel);
    return;
  }

  const existing = await prisma.item.findFirst({ where: { tags: { has: SEED_TAG } } });
  if (existing && process.env.FORCE !== "1") {
    console.log(`⚠️  Module ${MODULE_ID} already seeded. Use FORCE=1 to re-seed.`);
    return;
  }
  if (existing && process.env.FORCE === "1") {
    await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted existing items for ${SEED_TAG}`);
  }

  let created = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE",
        skill: "READING",
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        status: "ACTIVE",
        tags: item.tags,
        content: item.content,
      },
    });
    created++;
  }

  const totals: Record<string, number> = {};
  for (const i of items) totals[i.cefrLevel] = (totals[i.cefrLevel] || 0) + 1;
  console.log(`\n✅  Inserted ${created} reading items`);
  console.table(totals);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
