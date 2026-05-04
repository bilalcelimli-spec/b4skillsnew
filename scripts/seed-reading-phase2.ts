/**
 * READING PHASE 2 — JUNIOR / LANGUAGE SCHOOLS
 * Module: "The School Library — New Rules"
 * CEFR: A2 | Ages 11–14 & general adult beginner | ~130 words | Public notice
 * 5 questions: gist ×1, detail ×3, vocabulary-in-context ×1
 *
 * SOTA notes:
 * - Text type: semi-formal public notice — realistic A2 input.
 * - Questions test rule/information retrieval and basic lexical inference.
 * - IRT b-params: −0.9 → −0.2 (A2 range with slight difficulty spread).
 * - Distractors exploit partial-information errors (right number, wrong context).
 *
 *   npx tsx scripts/seed-reading-phase2.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "junior-reading-library-notice";
const PRODUCT_LINE = "JUNIOR";
const MODULE_TITLE = "The School Library — New Rules";
const CEFR_BAND    = "A2";

const PASSAGE = `WESTFIELD SCHOOL LIBRARY — NEW OPENING HOURS AND BORROWING RULES

From Monday 10 September, the library will be open every school day from 8:00 am to 5:30 pm. It will also be open on Saturdays from 10:00 am to 1:00 pm.

BORROWING RULES:
• Students may borrow up to four books at a time.
• Books must be returned within two weeks.
• If you keep a book for more than two weeks, you will pay a fine of 10p per day.
• Reference books and magazines may NOT be borrowed — they must be read in the library.
• To borrow a book, you must show your student card.

We are very happy to help you find books. Please ask at the desk if you need help.
The Librarian, Mrs Patel`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR A2 — semi-formal notice; simple imperative + modal (must/may); concrete information.
✓ Text type (public notice) is an authentic A2 genre in Cambridge A2 Key / IELTS Academic foundation.
✓ Q1 (gist) — overall purpose of the notice.
✓ Q2 (detail) — Saturday hours; distractor traps: weekday closing time vs. Saturday.
✓ Q3 (detail) — fine rate per day (10p); distractors use different amounts.
✓ Q4 (detail) — which items cannot be borrowed; distractor: magazines vs. all non-fiction.
✓ Q5 (vocabulary-in-context) — "reference books": requires contextual meaning inference.
✓ Passage ~130 words; realistic A2 timed task (4–5 min).
HUMAN REVIEW: Confirm "10p per day" fine is culturally understandable across locales; may add "ten pence" gloss.
`;

const items = [
  // Q1 — Gist: purpose of the notice
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "junior", "notice", "a2", "gist", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 130, textType: "public notice / information text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "gist", questionNumber: 1,
      prompt: "What is the main purpose of this notice?",
      options: [
        { text: "To advertise new books in the library",         isCorrect: false, rationale: "No new books are mentioned; the notice is about hours and rules." },
        { text: "To inform students about library hours and rules", isCorrect: true, rationale: "The notice explains new opening times and updated borrowing rules from 10 September." },
        { text: "To invite students to join the library",        isCorrect: false, rationale: "Membership is not discussed; the notice assumes students already use the library." },
        { text: "To explain why the library is closing early",   isCorrect: false, rationale: "The library is not closing early — new hours are extended compared to a typical school day." },
      ],
    },
  },
  // Q2 — Detail: Saturday closing time
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.7, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "junior", "notice", "a2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 130, textType: "public notice / information text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 2,
      prompt: "What time does the library close on Saturdays?",
      options: [
        { text: "5:30 pm", isCorrect: false, rationale: "5:30 pm is the weekday closing time, not Saturday." },
        { text: "1:00 pm", isCorrect: true,  rationale: "The notice states Saturday hours are 10:00 am to 1:00 pm." },
        { text: "3:00 pm", isCorrect: false, rationale: "3:00 pm is not mentioned anywhere in the notice." },
        { text: "8:00 am", isCorrect: false, rationale: "8:00 am is the weekday opening time, not a closing time." },
      ],
    },
  },
  // Q3 — Detail: fine amount
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.6, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "junior", "notice", "a2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 130, textType: "public notice / information text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 3,
      prompt: "How much must a student pay for each late day?",
      options: [
        { text: "5p per day",  isCorrect: false, rationale: "5p is not mentioned; the fine is 10p per day." },
        { text: "10p per day", isCorrect: true,  rationale: "The rule states 'you will pay a fine of 10p per day.'" },
        { text: "20p per day", isCorrect: false, rationale: "20p is twice the stated fine; not mentioned in the notice." },
        { text: "50p per day", isCorrect: false, rationale: "50p is not mentioned and far exceeds the stated fine." },
      ],
    },
  },
  // Q4 — Detail: what cannot be borrowed
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "junior", "notice", "a2", "detail", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 130, textType: "public notice / information text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "detail", questionNumber: 4,
      prompt: "Which items are students NOT allowed to borrow?",
      options: [
        { text: "Textbooks",                   isCorrect: false, rationale: "Textbooks are not specifically mentioned in the borrowing restrictions." },
        { text: "Reference books and magazines", isCorrect: true, rationale: "The notice explicitly states 'Reference books and magazines may NOT be borrowed.'" },
        { text: "Magazines only",              isCorrect: false, rationale: "Magazines are restricted but so are reference books — both items are named." },
        { text: "All non-fiction books",       isCorrect: false, rationale: "Only reference books (a subset of non-fiction) are restricted, not all non-fiction." },
      ],
    },
  },
  // Q5 — Vocabulary-in-context: "reference books"
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "junior", "notice", "a2", "vocabulary_in_context", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 130, textType: "public notice / information text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "vocabulary_in_context", questionNumber: 5,
      prompt: "In the notice, what does 'reference books' most likely mean?",
      options: [
        { text: "Books you can borrow and take home",             isCorrect: false, rationale: "The notice says reference books may NOT be borrowed, so this contradicts the text." },
        { text: "Books used to look up information in the library", isCorrect: true, rationale: "Reference books (encyclopaedias, dictionaries) are kept in the library for in-situ use only — consistent with 'must be read in the library.'" },
        { text: "Books recommended by teachers",                  isCorrect: false, rationale: "Recommended books are a different category not discussed in this notice." },
        { text: "Books about foreign languages",                  isCorrect: false, rationale: "There is no connection to language books specifically in this context." },
      ],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const existing = await prisma.item.findFirst({ where: { tags: { has: MODULE_ID } } });
  if (existing && process.env.FORCE !== "1") {
    console.log(`Module ${MODULE_ID} already seeded. Use FORCE=1 to re-run.`); return;
  }
  if (existing && process.env.FORCE === "1") {
    await prisma.item.deleteMany({ where: { tags: { has: MODULE_ID } } });
    console.log("Deleted existing items for re-seed.");
  }
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
