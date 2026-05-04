/**
 * READING PHASE 4 — LANGUAGE SCHOOLS / CORPORATE
 * Module: "Are City Bikes Good for Everyone?"
 * CEFR: B1 | General adult / Corporate | ~240 words | Opinion article
 * 6 questions: gist ×1, detail ×2, inference ×1, author's attitude ×1, vocabulary-in-context ×1
 *
 * SOTA notes:
 * - Opinion article: authentic B1 genre (newspaper opinion piece).
 * - Both sides of argument presented — tests ability to track viewpoints.
 * - IRT b-params: +0.0 → +0.7 (B1 mid-to-upper range).
 * - Distractors exploit argument-conflation: mixing the author's view with cited views.
 *
 *   npx tsx scripts/seed-reading-phase4.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "corp-reading-city-bikes";
const PRODUCT_LINE = "CORPORATE";
const MODULE_TITLE = "Are City Bikes Good for Everyone?";
const CEFR_BAND    = "B1";

const PASSAGE = `City bike-sharing schemes are becoming popular in many towns and cities around the world. Supporters say they reduce car traffic, improve air quality, and encourage people to exercise. It is hard to argue with these benefits on paper.

However, not everyone is convinced. A survey of regular cyclists in London found that 62% felt less safe after city bike programmes were introduced because more inexperienced riders share the roads. Local businesses near docking stations have also complained that bikes block deliveries and reduce parking for customers.

There is a social issue too. Most bike-share programmes charge a monthly fee. This makes them less accessible to people on lower incomes, which means the environmental benefits are not shared equally across society.

Supporters of city bike schemes point to cities such as Copenhagen and Amsterdam, where cycling has been successfully integrated into urban planning for decades. In those cities, separate cycle lanes and clear rules have solved many of the problems seen elsewhere.

Perhaps the lesson is simple: city bikes can work very well, but only if the right infrastructure is in place first. Without it, they create as many problems as they solve.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B1 — compound sentences, relative clauses, simple conditional; opinion signals (supporters say / not convinced / perhaps).
✓ Text type (opinion article) authentic for B1; balanced argument with a concluding position.
✓ Q1 (gist) — writer's main conclusion; tests reading the last paragraph.
✓ Q2 (detail) — survey percentage; distractor traps: wrong figure, wrong group.
✓ Q3 (detail) — Copenhagen/Amsterdam example purpose.
✓ Q4 (inference) — implied social inequality argument.
✓ Q5 (author's attitude) — stance on city bikes (conditional support); tests overall text.
✓ Q6 (vocabulary-in-context) — "integrated" in urban planning context.
✓ ~240 words; B1 timed reading (7–9 min).
HUMAN REVIEW: Confirm 62% survey figure is not confused with other statistics in distractor set.
`;

const items = [
  // Q1 — Gist / conclusion
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "opinion", "b1", "gist", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 240, textType: "opinion article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "gist", questionNumber: 1,
      prompt: "What is the writer's main conclusion about city bike schemes?",
      options: [
        { text: "City bikes always cause more problems than benefits.",     isCorrect: false, rationale: "The writer acknowledges benefits and offers a conditional solution, not an absolute negative view." },
        { text: "City bikes work well when the right infrastructure exists.", isCorrect: true,  rationale: "The final paragraph states they can work 'only if the right infrastructure is in place first.'" },
        { text: "City bikes should be banned from all major cities.",        isCorrect: false, rationale: "No call for a ban is made; the writer supports city bikes under certain conditions." },
        { text: "Copenhagen and Amsterdam are the only cities that can use city bikes.", isCorrect: false, rationale: "These cities are examples, not exclusions — the writer implies other cities can follow their model." },
      ],
    },
  },
  // Q2 — Detail: survey result
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.1, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "opinion", "b1", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 240, textType: "opinion article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 2,
      prompt: "According to a survey, what percentage of regular London cyclists felt less safe after city bike programmes were introduced?",
      options: [
        { text: "42%", isCorrect: false, rationale: "42% is not mentioned; the survey found 62% felt less safe." },
        { text: "52%", isCorrect: false, rationale: "52% is not the figure in the text; 62% is stated explicitly." },
        { text: "62%", isCorrect: true,  rationale: "The article states '62% felt less safe after city bike programmes were introduced.'" },
        { text: "72%", isCorrect: false, rationale: "72% is a plausible but incorrect figure; the actual percentage is 62%." },
      ],
    },
  },
  // Q3 — Detail: purpose of Copenhagen/Amsterdam reference
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.2, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "opinion", "b1", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 240, textType: "opinion article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 3,
      prompt: "Why does the writer mention Copenhagen and Amsterdam?",
      options: [
        { text: "To show that city bikes are only practical in small countries.",          isCorrect: false, rationale: "City size or country size is not the point; the argument is about infrastructure and planning." },
        { text: "To give examples of cities where cycling has been successfully planned.", isCorrect: true,  rationale: "The paragraph uses these cities to support the argument that good infrastructure enables successful cycling integration." },
        { text: "To argue that other cities should not try to copy their model.",          isCorrect: false, rationale: "The opposite is implied — these cities provide a positive model for others to follow." },
        { text: "To show that cycling is a European tradition, not universal.",            isCorrect: false, rationale: "Cultural tradition is not the point; the focus is on planning and infrastructure." },
      ],
    },
  },
  // Q4 — Inference: social inequality
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.4, discrimination: 1.15, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "opinion", "b1", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 240, textType: "opinion article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 4,
      prompt: "What does the writer imply about the environmental benefits of city bikes?",
      options: [
        { text: "They are exaggerated and not actually significant.",                   isCorrect: false, rationale: "The writer acknowledges the environmental benefits; the concern is unequal access, not insignificance." },
        { text: "They are mainly enjoyed by people who can afford the monthly fee.",    isCorrect: true,  rationale: "The writer says monthly fees make schemes 'less accessible to people on lower incomes', implying only wealthier users benefit." },
        { text: "They are only possible in cities with good weather.",                  isCorrect: false, rationale: "Weather is not mentioned; the inequality argument is financial, not climatic." },
        { text: "They are greater in cities with fewer cars.",                          isCorrect: false, rationale: "Traffic levels are not linked to the social equity point being made." },
      ],
    },
  },
  // Q5 — Author's attitude
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "opinion", "b1", "author_attitude", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 240, textType: "opinion article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "author_attitude", questionNumber: 5,
      prompt: "Which best describes the writer's overall attitude to city bike schemes?",
      options: [
        { text: "Strongly in favour — the benefits are clear and undeniable.",     isCorrect: false, rationale: "The writer raises significant criticisms (safety, inequality, business impact), so 'strongly in favour' is too extreme." },
        { text: "Strongly against — city bikes cause too many problems.",          isCorrect: false, rationale: "The writer does not advocate removal; a conditional solution is offered." },
        { text: "Cautiously supportive — bikes can succeed with proper planning.", isCorrect: true,  rationale: "The writer presents both sides but concludes city bikes can 'work very well' with the right infrastructure — a cautiously positive view." },
        { text: "Neutral — the article presents both sides without a personal view.", isCorrect: false, rationale: "The final paragraph clearly expresses the writer's own position, so the article is not neutral." },
      ],
    },
  },
  // Q6 — Vocabulary-in-context: "integrated"
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.7, discrimination: 1.2, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "corporate", "opinion", "b1", "vocabulary_in_context", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 240, textType: "opinion article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_in_context", questionNumber: 6,
      prompt: "In the phrase 'cycling has been successfully integrated into urban planning', what does 'integrated' mean?",
      options: [
        { text: "Replaced",   isCorrect: false, rationale: "'Replaced' implies one thing substituting another; integration means combining within a larger system." },
        { text: "Discussed",  isCorrect: false, rationale: "'Discussed' describes a conversation, not a structural planning outcome." },
        { text: "Included as a central part of the system", isCorrect: true, rationale: "'Integrated' means fully incorporated or made part of the whole — here, cycling is built into the city's planning system." },
        { text: "Promoted",   isCorrect: false, rationale: "'Promoted' means encouraging something; integration is about structural inclusion, not just advertising." },
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
