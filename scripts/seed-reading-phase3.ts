/**
 * READING PHASE 3 — LANGUAGE SCHOOLS / 15-MIN DIAGNOSTIC
 * Module: "Clara's First Week at Work"
 * CEFR: A2/B1 | General adult | ~180 words | Short narrative article
 * 6 questions: gist ×1, detail ×3, inference ×1, vocabulary-in-context ×1
 *
 * SOTA notes:
 * - Narrative text type: highly authentic for A2/B1 learners.
 * - Mix of stated and implicit information across questions.
 * - IRT b-params: −0.5 → +0.4 (bridging A2–B1 difficulty range).
 * - Distractors target common errors: over-generalising, wrong referent.
 *
 *   npx tsx scripts/seed-reading-phase3.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "ls-reading-clara-first-week";
const PRODUCT_LINE = "LANGUAGE_SCHOOLS";
const MODULE_TITLE = "Clara's First Week at Work";
const CEFR_BAND    = "A2";

const PASSAGE = `Clara started her new job at a small bookshop three weeks ago. Before that, she worked in a supermarket for two years, but she always wanted to work with books.

In her first week, she felt a little nervous. She did not know all the customers yet, and she was worried about finding the right books quickly. Her manager, David, was very patient. He showed her how to use the computer system and introduced her to the other staff.

By the end of the first week, Clara felt much more confident. She even helped a customer choose a birthday present for his daughter. The customer was happy and came back the next day to say thank you.

Clara's favourite part of the job is recommending books to people. She says she reads a lot at home so that she can give better suggestions. She is now thinking about starting a book club at the shop on Saturday mornings.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A2/B1 — past simple, past continuous (implied), present simple; narrative + description.
✓ Text type (short narrative article) authentic for Language Schools / 15-Min Diagnostic.
✓ Q1 (gist) — what the article is mainly about.
✓ Q2 (detail) — previous job; trap: supermarket vs. bookshop.
✓ Q3 (detail) — what David did; tested directly from explicit text.
✓ Q4 (detail) — why the customer returned; requires localising a specific event.
✓ Q5 (inference) — why Clara reads at home; requires connecting stated information.
✓ Q6 (vocabulary-in-context) — "confident" contextual meaning.
✓ ~180 words; A2/B1 timed reading (6–8 min).
HUMAN REVIEW: Check "recommending" is within A2 productive vocabulary; may simplify prompt if needed.
`;

const items = [
  // Q1 — Gist
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.5, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "language_schools", "narrative", "a2", "gist", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 180, textType: "short narrative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "gist", questionNumber: 1,
      prompt: "What is this article mainly about?",
      options: [
        { text: "How to get a job in a bookshop",    isCorrect: false, rationale: "The article describes Clara's experience, not advice on how to get this type of job." },
        { text: "Clara's experience starting a new job", isCorrect: true, rationale: "The article follows Clara through her first week at the bookshop and her growing confidence." },
        { text: "Why bookshops are better than supermarkets", isCorrect: false, rationale: "No comparison of workplace quality is made — this is Clara's personal story." },
        { text: "The best ways to recommend books",  isCorrect: false, rationale: "Book recommendations are mentioned briefly but are not the main subject." },
      ],
    },
  },
  // Q2 — Detail: previous job
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.4, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "language_schools", "narrative", "a2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 180, textType: "short narrative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 2,
      prompt: "Where did Clara work before the bookshop?",
      options: [
        { text: "In a library",       isCorrect: false, rationale: "A library is not mentioned; Clara worked in a supermarket before the bookshop." },
        { text: "In a café",          isCorrect: false, rationale: "A café is not mentioned in the article." },
        { text: "In a supermarket",   isCorrect: true,  rationale: "The article states 'she worked in a supermarket for two years.'" },
        { text: "In another bookshop", isCorrect: false, rationale: "The current job is her first bookshop job; she came from a supermarket." },
      ],
    },
  },
  // Q3 — Detail: what David did
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.3, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "language_schools", "narrative", "a2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 180, textType: "short narrative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 3,
      prompt: "What did David do to help Clara in her first week?",
      options: [
        { text: "He gave her extra money",              isCorrect: false, rationale: "Pay is not mentioned; David helped with the computer system and introductions." },
        { text: "He let her choose her own working hours", isCorrect: false, rationale: "Working hours are not discussed in this context." },
        { text: "He showed her the computer system and introduced her to the team", isCorrect: true, rationale: "The text states David 'showed her how to use the computer system and introduced her to the other staff.'" },
        { text: "He recommended books to her",          isCorrect: false, rationale: "It was Clara who recommended books to customers, not David to Clara." },
      ],
    },
  },
  // Q4 — Detail: why the customer returned
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "language_schools", "narrative", "a2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 180, textType: "short narrative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 4,
      prompt: "Why did the customer come back the next day?",
      options: [
        { text: "To buy another book",       isCorrect: false, rationale: "Buying another book is not stated as the reason for returning." },
        { text: "To say thank you to Clara", isCorrect: true,  rationale: "The text says 'The customer came back the next day to say thank you.'" },
        { text: "To return a damaged book",  isCorrect: false, rationale: "No damaged book is mentioned in the article." },
        { text: "To ask for a refund",       isCorrect: false, rationale: "A refund is not mentioned; the customer's return was to express gratitude." },
      ],
    },
  },
  // Q5 — Inference: why Clara reads at home
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.2, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "language_schools", "narrative", "b1", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 180, textType: "short narrative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 5,
      prompt: "Why does Clara read a lot at home?",
      options: [
        { text: "Because she has no other hobbies",          isCorrect: false, rationale: "The text does not say reading is her only hobby; this over-generalises." },
        { text: "So she can give customers better book suggestions", isCorrect: true, rationale: "Clara says she reads so she 'can give better suggestions' — directly linked to her job role." },
        { text: "Because her manager asked her to",          isCorrect: false, rationale: "David is not mentioned in connection with her reading habits." },
        { text: "To prepare for the Saturday book club",     isCorrect: false, rationale: "The book club is a future idea; Clara's current reading is linked to customer recommendations." },
      ],
    },
  },
  // Q6 — Vocabulary-in-context: "confident"
  {
    skill: "READING", cefrLevel: "B1", difficulty: 0.4, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "language_schools", "narrative", "b1", "vocabulary_in_context", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 180, textType: "short narrative article",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_in_context", questionNumber: 6,
      prompt: "What does 'more confident' mean in the context of the article?",
      options: [
        { text: "More tired after a long week",              isCorrect: false, rationale: "Fatigue is the opposite feeling to the positive shift described in the text." },
        { text: "More sure of herself and less worried",     isCorrect: true,  rationale: "Confident means self-assured; Clara moved from 'nervous' at the start to 'confident' by the end of the week." },
        { text: "More interested in the job",                isCorrect: false, rationale: "Interest is related but not the precise meaning of confident; the shift is from anxiety to security." },
        { text: "More well-known to the customers",          isCorrect: false, rationale: "Recognition by customers is a contributing factor, not the definition of feeling confident." },
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
