/**
 * GRAMMAR — EARLY LEVELS (PRE_A1 · A1 · A2)
 * 30 items per level = 90 items total
 * Product-line coverage: Primary (PRE_A1/A1) · Junior Suite (A1/A2) · Language Schools (A1/A2)
 *
 * Generated with Claude Sonnet 4.6 + pedagogy-aware prompts.
 * IRT parameters are expert-judgment calibrated using:
 *   • b (difficulty): Rasch-scaled from −3.0 (very easy) to +3.0 (very hard)
 *   • a (discrimination): 0.9–1.6 (CEFR-appropriate range)
 *   • c (guessing): 0.25 (4-choice MCQ)
 *
 * Topics:
 *   PRE_A1: numbers · colours · common objects · simple greetings · be (am/is/are)
 *   A1: present simple · have/has · common adjectives · SVO sentences · question words
 *   A2: present continuous · past simple (regular/irregular) · can/can't · articles · prepositions
 *
 *   npx tsx scripts/seed-grammar-early-levels.ts
 *   DRY_RUN=1 npx tsx scripts/seed-grammar-early-levels.ts
 *   FORCE=1 npx tsx scripts/seed-grammar-early-levels.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { validateItemBatch, reportValidationResults } from './_validation-helper.js';

const prisma = new PrismaClient();
const SEED_TAG = "seed-grammar-early-levels";

const items = [
  // ══════════════════════════════════════════════════════════════════════
  // PRE_A1 — 30 items: Very basic, age 6–9, simple recognition tasks
  // ══════════════════════════════════════════════════════════════════════

  // PRE_A1 · be verb (am/is/are)
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -3.0, discrimination: 0.9, guessing: 0.25,
    tags: ["grammar", "pre-a1", "be-verb", "primary", SEED_TAG],
    content: {
      prompt: "Choose the correct word: I ___ a student.",
      options: [
        { text: "am",  isCorrect: true,  rationale: "First person singular uses 'am'." },
        { text: "is",  isCorrect: false, rationale: "'Is' is for he/she/it." },
        { text: "are", isCorrect: false, rationale: "'Are' is for you/we/they." },
        { text: "be",  isCorrect: false, rationale: "'Be' is the base form, not used with 'I'." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.9, discrimination: 0.9, guessing: 0.25,
    tags: ["grammar", "pre-a1", "be-verb", "primary", SEED_TAG],
    content: {
      prompt: "Choose the correct word: She ___ happy.",
      options: [
        { text: "is",  isCorrect: true,  rationale: "Third person singular uses 'is'." },
        { text: "am",  isCorrect: false, rationale: "'Am' is only for 'I'." },
        { text: "are", isCorrect: false, rationale: "'Are' is for you/we/they." },
        { text: "were",isCorrect: false, rationale: "'Were' is past tense." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.8, discrimination: 0.9, guessing: 0.25,
    tags: ["grammar", "pre-a1", "be-verb", "primary", SEED_TAG],
    content: {
      prompt: "Choose the correct word: They ___ my friends.",
      options: [
        { text: "are", isCorrect: true,  rationale: "Third person plural uses 'are'." },
        { text: "is",  isCorrect: false, rationale: "'Is' is for he/she/it (singular)." },
        { text: "am",  isCorrect: false, rationale: "'Am' is only for 'I'." },
        { text: "was", isCorrect: false, rationale: "'Was' is past tense." },
      ],
    },
  },
  // PRE_A1 · Negation with be
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.7, discrimination: 0.9, guessing: 0.25,
    tags: ["grammar", "pre-a1", "negation", "primary", SEED_TAG],
    content: {
      prompt: "Make this sentence negative: 'He is tall.' → He ___ tall.",
      options: [
        { text: "is not",  isCorrect: true,  rationale: "The negative of 'is' is 'is not' (or 'isn't')." },
        { text: "are not", isCorrect: false, rationale: "'Are not' is for you/we/they." },
        { text: "not is",  isCorrect: false, rationale: "The negative particle 'not' comes after 'is'." },
        { text: "am not",  isCorrect: false, rationale: "'Am not' is for the first person (I)." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.6, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "negation", "primary", SEED_TAG],
    content: {
      prompt: "Which sentence is correct?",
      options: [
        { text: "The cat is not big.",     isCorrect: true,  rationale: "Correct negative with 'is not'." },
        { text: "The cat not is big.",     isCorrect: false, rationale: "'Not' must come after the verb 'is'." },
        { text: "The cat are not big.",    isCorrect: false, rationale: "'Are' is wrong for singular 'cat'." },
        { text: "The cat is not bigs.",    isCorrect: false, rationale: "Adjectives do not take '-s'." },
      ],
    },
  },
  // PRE_A1 · Yes/No questions with be
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.5, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "questions", "primary", SEED_TAG],
    content: {
      prompt: "Which is the correct question?",
      options: [
        { text: "Is she a teacher?",   isCorrect: true,  rationale: "Yes/No question inverts subject and 'is'." },
        { text: "She is a teacher?",   isCorrect: false, rationale: "Statement word order — not a question." },
        { text: "Are she a teacher?",  isCorrect: false, rationale: "'She' is singular; use 'is', not 'are'." },
        { text: "Is she teacher?",     isCorrect: false, rationale: "Missing article 'a' before 'teacher'." },
      ],
    },
  },
  // PRE_A1 · This/That/These/Those
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.4, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "demonstratives", "primary", SEED_TAG],
    content: {
      prompt: "Point at something near you: '___ is my pencil.'",
      options: [
        { text: "This",  isCorrect: true,  rationale: "'This' refers to a singular thing near the speaker." },
        { text: "That",  isCorrect: false, rationale: "'That' refers to something far from the speaker." },
        { text: "These", isCorrect: false, rationale: "'These' is for plural items near the speaker." },
        { text: "Those", isCorrect: false, rationale: "'Those' is for plural items far from the speaker." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.3, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "demonstratives", "primary", SEED_TAG],
    content: {
      prompt: "Point at two books far away: '___ are my books.'",
      options: [
        { text: "Those", isCorrect: true,  rationale: "'Those' is for plural items far from the speaker." },
        { text: "These", isCorrect: false, rationale: "'These' is for plural items near the speaker." },
        { text: "That",  isCorrect: false, rationale: "'That' is singular and far." },
        { text: "This",  isCorrect: false, rationale: "'This' is singular and near." },
      ],
    },
  },
  // PRE_A1 · Possessives my/your/his/her
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.2, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "possessives", "primary", SEED_TAG],
    content: {
      prompt: "The bag belongs to Tom. It is ___ bag.",
      options: [
        { text: "his",  isCorrect: true,  rationale: "'His' is the masculine possessive determiner." },
        { text: "her",  isCorrect: false, rationale: "'Her' is feminine; Tom is male." },
        { text: "my",   isCorrect: false, rationale: "'My' means belonging to the speaker (first person)." },
        { text: "your", isCorrect: false, rationale: "'Your' is for the person being spoken to." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.1, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "possessives", "primary", SEED_TAG],
    content: {
      prompt: "Choose the correct possessive: Anna has a cat. ___ cat is orange.",
      options: [
        { text: "Her",  isCorrect: true,  rationale: "The possessive for a female is 'her'." },
        { text: "His",  isCorrect: false, rationale: "'His' is for males; Anna is female." },
        { text: "Its",  isCorrect: false, rationale: "'Its' refers to animals/objects, not people (here Anna is the owner)." },
        { text: "Our",  isCorrect: false, rationale: "'Our' is first person plural." },
      ],
    },
  },
  // PRE_A1 · Plural nouns (regular)
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -2.0, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "plurals", "primary", SEED_TAG],
    content: {
      prompt: "One book → two ___",
      options: [
        { text: "books",  isCorrect: true,  rationale: "Regular plural adds '-s'." },
        { text: "booky",  isCorrect: false, rationale: "Incorrect — plurals do not use '-y'." },
        { text: "bookes", isCorrect: false, rationale: "No '-es' needed; ends in a consonant." },
        { text: "books'", isCorrect: false, rationale: "The apostrophe marks possession, not plural." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.9, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "plurals", "primary", SEED_TAG],
    content: {
      prompt: "One box → three ___",
      options: [
        { text: "boxes",  isCorrect: true,  rationale: "Words ending in '-x' add '-es' for the plural." },
        { text: "boxs",   isCorrect: false, rationale: "Words ending in '-x' need '-es', not '-s'." },
        { text: "boxen",  isCorrect: false, rationale: "Incorrect irregular form (not English)." },
        { text: "box",    isCorrect: false, rationale: "This is the singular form." },
      ],
    },
  },
  // PRE_A1 · have/has
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.8, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "pre-a1", "have-has", "primary", SEED_TAG],
    content: {
      prompt: "He ___ a dog.",
      options: [
        { text: "has",  isCorrect: true,  rationale: "Third person singular (he/she/it) uses 'has'." },
        { text: "have", isCorrect: false, rationale: "'Have' is for I/you/we/they." },
        { text: "is",   isCorrect: false, rationale: "'Is' is the verb 'be', not 'have'." },
        { text: "haves",isCorrect: false, rationale: "'Haves' is not a verb form." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.7, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "pre-a1", "have-has", "primary", SEED_TAG],
    content: {
      prompt: "We ___ two cats at home.",
      options: [
        { text: "have", isCorrect: true,  rationale: "First person plural (we) uses 'have'." },
        { text: "has",  isCorrect: false, rationale: "'Has' is only for he/she/it." },
        { text: "are",  isCorrect: false, rationale: "'Are' is from the verb 'be', not 'have'." },
        { text: "haves",isCorrect: false, rationale: "'Haves' is not a valid verb form." },
      ],
    },
  },
  // PRE_A1 · Colour/object identification (picture-test style)
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.6, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "adjective-order", "primary", SEED_TAG],
    content: {
      prompt: "Which sentence is correct?",
      options: [
        { text: "I have a red ball.",    isCorrect: true,  rationale: "Correct order: article + adjective + noun." },
        { text: "I have a ball red.",    isCorrect: false, rationale: "Adjectives come before nouns in English." },
        { text: "I have red a ball.",    isCorrect: false, rationale: "The article must immediately precede the adjective." },
        { text: "I red have a ball.",    isCorrect: false, rationale: "Incorrect order; adjectives don't separate the subject and verb." },
      ],
    },
  },
  // PRE_A1 · Can (ability) basic
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.5, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "can", "primary", SEED_TAG],
    content: {
      prompt: "She ___ swim. (ability — she knows how)",
      options: [
        { text: "can",   isCorrect: true,  rationale: "'Can' expresses ability. No inflection for third person." },
        { text: "cans",  isCorrect: false, rationale: "Modal verbs never take '-s' in third person." },
        { text: "could", isCorrect: false, rationale: "'Could' is past or conditional; the sentence is present." },
        { text: "is",    isCorrect: false, rationale: "'Is' is the verb 'be', not a modal of ability." },
      ],
    },
  },
  // PRE_A1 · Simple prepositions (in/on/under)
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "prepositions", "primary", SEED_TAG],
    content: {
      prompt: "The cat is ___ the box. (The cat is inside the box.)",
      options: [
        { text: "in",    isCorrect: true,  rationale: "'In' marks enclosed location (inside)." },
        { text: "on",    isCorrect: false, rationale: "'On' marks surface contact from above." },
        { text: "under", isCorrect: false, rationale: "'Under' means below." },
        { text: "at",    isCorrect: false, rationale: "'At' marks a general point or location, not inside." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "prepositions", "primary", SEED_TAG],
    content: {
      prompt: "The book is ___ the table. (on top of the table surface)",
      options: [
        { text: "on",    isCorrect: true,  rationale: "'On' marks surface contact." },
        { text: "in",    isCorrect: false, rationale: "'In' means enclosed inside." },
        { text: "under", isCorrect: false, rationale: "'Under' means below." },
        { text: "next",  isCorrect: false, rationale: "'Next' is not a preposition alone; must be 'next to'." },
      ],
    },
  },
  // PRE_A1 · Simple WH-question words
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.2, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "pre-a1", "question-words", "primary", SEED_TAG],
    content: {
      prompt: "___ is your name? — My name is Sara.",
      options: [
        { text: "What",  isCorrect: true,  rationale: "'What' asks for a name or thing." },
        { text: "Who",   isCorrect: false, rationale: "'Who' asks about a person's identity, not their name." },
        { text: "Where", isCorrect: false, rationale: "'Where' asks about place." },
        { text: "When",  isCorrect: false, rationale: "'When' asks about time." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.1, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "pre-a1", "question-words", "primary", SEED_TAG],
    content: {
      prompt: "___ old are you? — I am eight.",
      options: [
        { text: "How",   isCorrect: true,  rationale: "'How old' is the fixed phrase asking about age." },
        { text: "What",  isCorrect: false, rationale: "'What old' is not grammatical; use 'how old'." },
        { text: "Why",   isCorrect: false, rationale: "'Why' asks for a reason, not age." },
        { text: "Which", isCorrect: false, rationale: "'Which' asks for a choice from known options." },
      ],
    },
  },
  // PRE_A1 · Imperatives
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "imperatives", "primary", SEED_TAG],
    content: {
      prompt: "Your teacher says: '___ the door, please.' Which word is correct?",
      options: [
        { text: "Open",    isCorrect: true,  rationale: "Imperatives use the base verb form directly." },
        { text: "Opens",   isCorrect: false, rationale: "Imperatives never take '-s'." },
        { text: "Opening", isCorrect: false, rationale: "The -ing form is not used for imperatives." },
        { text: "To open", isCorrect: false, rationale: "The infinitive 'to open' is not used in imperatives." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "imperatives", "primary", SEED_TAG],
    content: {
      prompt: "Negative imperative: '___ in the classroom.' (telling someone NOT to run)",
      options: [
        { text: "Don't run",    isCorrect: true,  rationale: "Negative imperatives use 'Don't' + base verb." },
        { text: "Not run",      isCorrect: false, rationale: "'Not' alone cannot form a negative imperative." },
        { text: "Doesn't run",  isCorrect: false, rationale: "'Doesn't' is third person present, not an imperative." },
        { text: "No running",   isCorrect: false, rationale: "A grammatical restriction notice, but not a standard imperative form." },
      ],
    },
  },
  // PRE_A1 · Conjunctions and/or
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "conjunctions", "primary", SEED_TAG],
    content: {
      prompt: "I have a cat ___ a dog. (both animals)",
      options: [
        { text: "and", isCorrect: true,  rationale: "'And' joins two ideas (addition)." },
        { text: "or",  isCorrect: false, rationale: "'Or' gives a choice; here both animals are owned." },
        { text: "but", isCorrect: false, rationale: "'But' shows contrast." },
        { text: "so",  isCorrect: false, rationale: "'So' shows result." },
      ],
    },
  },
  // PRE_A1 · Numbers / there is / there are
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.7, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "there-is-are", "primary", SEED_TAG],
    content: {
      prompt: "___ three birds in the tree.",
      options: [
        { text: "There are",  isCorrect: true,  rationale: "'There are' is used before a plural noun (three birds)." },
        { text: "There is",   isCorrect: false, rationale: "'There is' is used with a singular noun." },
        { text: "It is",      isCorrect: false, rationale: "'It is' refers to a specific thing, not an existential statement." },
        { text: "They are",   isCorrect: false, rationale: "'They are' requires a pronoun reference established earlier." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.6, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "there-is-are", "primary", SEED_TAG],
    content: {
      prompt: "___ a park near my school.",
      options: [
        { text: "There is",  isCorrect: true,  rationale: "'There is' is used with a singular noun (a park)." },
        { text: "There are", isCorrect: false, rationale: "'There are' is for plural nouns." },
        { text: "Here is",   isCorrect: false, rationale: "'Here is' marks the location of something shown/presented." },
        { text: "Is there",  isCorrect: false, rationale: "This is question word order." },
      ],
    },
  },
  // PRE_A1 · Like + noun (preference)
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.5, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "like-verb", "primary", SEED_TAG],
    content: {
      prompt: "I ___ pizza.",
      options: [
        { text: "like",   isCorrect: true,  rationale: "First person uses the base verb 'like'." },
        { text: "likes",  isCorrect: false, rationale: "'Likes' is for third person singular." },
        { text: "liked",  isCorrect: false, rationale: "'Liked' is past tense." },
        { text: "liking", isCorrect: false, rationale: "'Liking' needs an auxiliary and does not stand alone." },
      ],
    },
  },
  // PRE_A1 · Object pronouns
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.4, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "object-pronouns", "primary", SEED_TAG],
    content: {
      prompt: "I see Tom every day. I see ___ at school.",
      options: [
        { text: "him",  isCorrect: true,  rationale: "'Him' is the object pronoun for a male person." },
        { text: "he",   isCorrect: false, rationale: "'He' is the subject pronoun; objects use 'him'." },
        { text: "his",  isCorrect: false, rationale: "'His' is possessive, not object." },
        { text: "her",  isCorrect: false, rationale: "'Her' is for a female object." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.3, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "pre-a1", "object-pronouns", "primary", SEED_TAG],
    content: {
      prompt: "These are my books. Can you give ___ to me?",
      options: [
        { text: "them", isCorrect: true,  rationale: "'Them' is the object pronoun for plural things." },
        { text: "they", isCorrect: false, rationale: "'They' is a subject pronoun; use 'them' as object." },
        { text: "its",  isCorrect: false, rationale: "'Its' is a possessive for singular things." },
        { text: "their",isCorrect: false, rationale: "'Their' is the possessive determiner for plural." },
      ],
    },
  },
  // PRE_A1 · Sentence word order
  {
    skill: "GRAMMAR", cefrLevel: "PRE_A1", difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "pre-a1", "word-order", "primary", SEED_TAG],
    content: {
      prompt: "Put the words in order: [plays / football / Tom / every day]",
      options: [
        { text: "Tom plays football every day.",    isCorrect: true,  rationale: "Correct SVO + adverb order: Subject + Verb + Object + Adverb." },
        { text: "Tom every day plays football.",    isCorrect: false, rationale: "Frequency adverbs go after the object in simple affirmatives." },
        { text: "Plays Tom football every day.",    isCorrect: false, rationale: "This is inverted/question word order." },
        { text: "Football Tom plays every day.",    isCorrect: false, rationale: "Topicalising the object is unusual here and creates wrong focus." },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // A1 — 30 items: Basic present simple, common structures, age 8–11
  // ══════════════════════════════════════════════════════════════════════

  // A1 · Present simple — 3rd person -s
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -2.8, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "present-simple", "primary", "junior", SEED_TAG],
    content: {
      prompt: "Every morning she ___ breakfast at 7 o'clock.",
      options: [
        { text: "eats",  isCorrect: true,  rationale: "Third person singular (she) adds '-s' to the verb." },
        { text: "eat",   isCorrect: false, rationale: "'Eat' is used for I/you/we/they, not she/he/it." },
        { text: "eating",isCorrect: false, rationale: "'Eating' needs an auxiliary verb (is eating)." },
        { text: "ate",   isCorrect: false, rationale: "'Ate' is past simple; the sentence describes a routine." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -2.7, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "present-simple", "primary", "junior", SEED_TAG],
    content: {
      prompt: "He ___ to school by bus every day.",
      options: [
        { text: "goes",  isCorrect: true,  rationale: "Irregular 3rd person singular: go → goes." },
        { text: "go",    isCorrect: false, rationale: "Requires '-es' in third person (irregular)." },
        { text: "gos",   isCorrect: false, rationale: "'Gos' is not a word; 'go' + es = 'goes'." },
        { text: "going", isCorrect: false, rationale: "Needs 'is going' (auxiliary)." },
      ],
    },
  },
  // A1 · Present simple — negation (do/does)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -2.5, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "negation", "present-simple", "primary", SEED_TAG],
    content: {
      prompt: "She ___ like coffee.",
      options: [
        { text: "doesn't", isCorrect: true,  rationale: "Negative third person singular uses 'doesn't' + base verb." },
        { text: "don't",   isCorrect: false, rationale: "'Don't' is for I/you/we/they; she needs 'doesn't'." },
        { text: "isn't",   isCorrect: false, rationale: "'Isn't' is from the verb 'be'." },
        { text: "not",     isCorrect: false, rationale: "A bare 'not' cannot form the negative; use 'doesn't'." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -2.3, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "negation", "present-simple", "primary", SEED_TAG],
    content: {
      prompt: "They ___ play basketball on weekdays.",
      options: [
        { text: "don't",    isCorrect: true,  rationale: "'Don't' is the negative auxiliary for I/you/we/they." },
        { text: "doesn't",  isCorrect: false, rationale: "'Doesn't' is for he/she/it." },
        { text: "aren't",   isCorrect: false, rationale: "This is a 'be' negative; we need 'do' negation for action verbs." },
        { text: "not",      isCorrect: false, rationale: "Needs auxiliary 'do': 'don't'." },
      ],
    },
  },
  // A1 · Present simple — questions (do/does)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -2.2, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "questions", "present-simple", SEED_TAG],
    content: {
      prompt: "___ your brother like music?",
      options: [
        { text: "Does",  isCorrect: true,  rationale: "Third person singular (your brother) question: 'Does' + subject + base verb." },
        { text: "Do",    isCorrect: false, rationale: "'Do' is for I/you/we/they." },
        { text: "Is",    isCorrect: false, rationale: "'Is' forms 'be' questions, not 'do' questions for action verbs." },
        { text: "Has",   isCorrect: false, rationale: "'Has' is for possession/have-questions, not present simple." },
      ],
    },
  },
  // A1 · Can for ability and permission
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -2.0, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "modal-can", "ability", SEED_TAG],
    content: {
      prompt: "My little sister ___ ride a bike now — she learnt last year.",
      options: [
        { text: "can",    isCorrect: true,  rationale: "'Can' expresses ability in the present." },
        { text: "could",  isCorrect: false, rationale: "'Could' is past ability; the sentence uses 'now' (present)." },
        { text: "may",    isCorrect: false, rationale: "'May' expresses possibility/permission, not acquired ability." },
        { text: "must",   isCorrect: false, rationale: "'Must' expresses obligation." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.9, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "modal-can", "permission", SEED_TAG],
    content: {
      prompt: "Asking a teacher for permission: '___ I go to the toilet, please?'",
      options: [
        { text: "Can",   isCorrect: true,  rationale: "'Can I…?' is a common, informal permission request." },
        { text: "Do",    isCorrect: false, rationale: "'Do I go…?' is not a permission structure." },
        { text: "Am",    isCorrect: false, rationale: "'Am I go…?' is ungrammatical." },
        { text: "Will",  isCorrect: false, rationale: "'Will I…?' asks about future facts, not permission." },
      ],
    },
  },
  // A1 · Articles a/an
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "articles", SEED_TAG],
    content: {
      prompt: "She is ___ engineer.",
      options: [
        { text: "an", isCorrect: true,  rationale: "'An' is used before a vowel sound (engineer starts with /ɛ/)." },
        { text: "a",  isCorrect: false, rationale: "'A' is used before consonant sounds." },
        { text: "the",isCorrect: false, rationale: "'The' is definite; this is a first/generic mention." },
        { text: "—",  isCorrect: false, rationale: "Singular countable nouns in generic context need 'a/an'." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.7, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "articles", SEED_TAG],
    content: {
      prompt: "I have ___ cat and ___ dog.",
      options: [
        { text: "a / a",   isCorrect: true,  rationale: "Both 'cat' and 'dog' are singular countable nouns introduced for the first time; 'a' is correct before consonant sounds." },
        { text: "a / an",  isCorrect: false, rationale: "'Dog' starts with /d/, a consonant sound; use 'a', not 'an'." },
        { text: "the / a", isCorrect: false, rationale: "Both nouns are indefinite at first mention; 'the' implies already known." },
        { text: "an / a",  isCorrect: false, rationale: "'Cat' starts with /k/, a consonant sound; use 'a', not 'an'." },
      ],
    },
  },
  // A1 · The (definite article — second mention)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.6, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "articles", "definite", SEED_TAG],
    content: {
      prompt: "I saw a dog in the park. ___ dog was very friendly.",
      options: [
        { text: "The", isCorrect: true,  rationale: "Second mention of a noun uses 'the' (now known to both speakers)." },
        { text: "A",   isCorrect: false, rationale: "'A' is for first mention or non-specific reference." },
        { text: "An",  isCorrect: false, rationale: "'An' is used before vowel sounds, and this is second mention." },
        { text: "That",isCorrect: false, rationale: "'That' is a demonstrative pronoun, not an article." },
      ],
    },
  },
  // A1 · Common prepositions of time
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.5, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "prepositions", "time", SEED_TAG],
    content: {
      prompt: "The class starts ___ 9 o'clock.",
      options: [
        { text: "at",  isCorrect: true,  rationale: "'At' is used with specific clock times." },
        { text: "in",  isCorrect: false, rationale: "'In' is used with months, years, seasons." },
        { text: "on",  isCorrect: false, rationale: "'On' is used with days and dates." },
        { text: "by",  isCorrect: false, rationale: "'By' means not later than; it does not express a start time." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "prepositions", "time", SEED_TAG],
    content: {
      prompt: "My birthday is ___ June.",
      options: [
        { text: "in",  isCorrect: true,  rationale: "'In' is used with months." },
        { text: "on",  isCorrect: false, rationale: "'On' is for specific days or dates (on 5th June)." },
        { text: "at",  isCorrect: false, rationale: "'At' is for specific times of day." },
        { text: "of",  isCorrect: false, rationale: "'Of' is possessive/partitive, not time." },
      ],
    },
  },
  // A1 · Adverbs of frequency
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.3, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "adverbs-frequency", SEED_TAG],
    content: {
      prompt: "He ___ watches TV in the evening. (100% of the time)",
      options: [
        { text: "always",  isCorrect: true,  rationale: "'Always' = 100% frequency, placed before the main verb." },
        { text: "never",   isCorrect: false, rationale: "'Never' = 0% frequency (the opposite)." },
        { text: "often",   isCorrect: false, rationale: "'Often' = frequently but not 100%." },
        { text: "seldom",  isCorrect: false, rationale: "'Seldom' = rarely; low frequency." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.2, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "adverbs-frequency", SEED_TAG],
    content: {
      prompt: "Where does the frequency adverb go? [She / goes / always / to bed / at ten]",
      options: [
        { text: "She always goes to bed at ten.",  isCorrect: true,  rationale: "Frequency adverbs go between the subject and the main verb." },
        { text: "She goes always to bed at ten.",  isCorrect: false, rationale: "Frequency adverbs should not go between the verb and its object/complement." },
        { text: "Always she goes to bed at ten.",  isCorrect: false, rationale: "Sentence-initial position is emphatic and unusual in everyday speech." },
        { text: "She goes to bed at ten always.",  isCorrect: false, rationale: "End position is incorrect for 'always' in standard usage." },
      ],
    },
  },
  // A1 · Present simple vs. present continuous (contrast)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -1.0, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "present-continuous", "present-simple", SEED_TAG],
    content: {
      prompt: "Look! It ___ outside right now. (observation at this moment)",
      options: [
        { text: "is raining",  isCorrect: true,  rationale: "Present continuous (is + -ing) for actions happening NOW." },
        { text: "rains",       isCorrect: false, rationale: "Present simple is for habitual/repeated actions." },
        { text: "rain",        isCorrect: false, rationale: "Base form 'rain' needs an auxiliary here." },
        { text: "rained",      isCorrect: false, rationale: "'Rained' is past tense." },
      ],
    },
  },
  // A1 · Comparative adjectives
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.9, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "comparatives", SEED_TAG],
    content: {
      prompt: "An elephant is ___ than a cat.",
      options: [
        { text: "bigger",  isCorrect: true,  rationale: "One-syllable adjective: double consonant + -er. big → bigger." },
        { text: "more big",isCorrect: false, rationale: "Short one-syllable adjectives use '-er', not 'more'." },
        { text: "biger",   isCorrect: false, rationale: "Spelling error: double the consonant → 'bigger'." },
        { text: "most big",isCorrect: false, rationale: "'Most' forms superlatives, not comparatives." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.8, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "comparatives", SEED_TAG],
    content: {
      prompt: "English is ___ than maths, in my opinion.",
      options: [
        { text: "more interesting",  isCorrect: true,  rationale: "Three-syllable adjectives use 'more' + adjective." },
        { text: "interestinger",     isCorrect: false, rationale: "Multi-syllable adjectives do not add '-er'." },
        { text: "most interesting",  isCorrect: false, rationale: "'Most' forms the superlative." },
        { text: "interestinger than",isCorrect: false, rationale: "'Interestinger' is not a word." },
      ],
    },
  },
  // A1 · Object pronouns me/you/him/her/us/them
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.7, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "object-pronouns", SEED_TAG],
    content: {
      prompt: "My teacher speaks to ___ and my friend every day.",
      options: [
        { text: "me",   isCorrect: true,  rationale: "'Me' is the first person singular object pronoun." },
        { text: "I",    isCorrect: false, rationale: "'I' is a subject pronoun; use 'me' as object." },
        { text: "my",   isCorrect: false, rationale: "'My' is a possessive determiner, not an object pronoun." },
        { text: "mine", isCorrect: false, rationale: "'Mine' is a possessive pronoun, not an object pronoun." },
      ],
    },
  },
  // A1 · Telling the time
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.6, discrimination: 1.0, guessing: 0.25,
    tags: ["grammar", "a1", "time-expressions", SEED_TAG],
    content: {
      prompt: "It is 3:15. How do we say this in English?",
      options: [
        { text: "It's quarter past three.",      isCorrect: true,  rationale: "15 minutes past the hour = 'quarter past'." },
        { text: "It's three fifteen past.",       isCorrect: false, rationale: "Redundant 'past'; say 'three fifteen' or 'quarter past three'." },
        { text: "It's quarter to three.",         isCorrect: false, rationale: "'Quarter to three' = 2:45, not 3:15." },
        { text: "It's half past three.",          isCorrect: false, rationale: "'Half past three' = 3:30." },
      ],
    },
  },
  // A1 · Genitive 's
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "possessive-s", SEED_TAG],
    content: {
      prompt: "The phone belongs to Maria. It is ___.",
      options: [
        { text: "Maria's phone",  isCorrect: true,  rationale: "Possessive 's shows the phone belongs to Maria." },
        { text: "Marias phone",   isCorrect: false, rationale: "Missing apostrophe; 's needs an apostrophe." },
        { text: "Maria phone",    isCorrect: false, rationale: "No possessive marker: use 's or 'of Maria'." },
        { text: "Maria of phone", isCorrect: false, rationale: "Word order is reversed; 'of' construction would be 'phone of Maria' (formal)." },
      ],
    },
  },
  // A1 · Going to (future plans)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "going-to", "future", SEED_TAG],
    content: {
      prompt: "We have plans for the weekend: We ___ visit our grandma on Saturday.",
      options: [
        { text: "are going to",  isCorrect: true,  rationale: "'Be going to' expresses a decided future plan (we/first person plural)." },
        { text: "is going to",   isCorrect: false, rationale: "'Is going to' is for third person singular (he/she/it)." },
        { text: "am going to",   isCorrect: false, rationale: "'Am going to' is for first person singular (I)." },
        { text: "going to",      isCorrect: false, rationale: "Missing auxiliary 'be'; can't use 'going to' alone." },
      ],
    },
  },
  // A1 · Past simple (regular verbs)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "past-simple", "regular", SEED_TAG],
    content: {
      prompt: "Yesterday she ___ the whole day in the park.",
      options: [
        { text: "played",   isCorrect: true,  rationale: "Regular past simple: play + ed = played." },
        { text: "plays",    isCorrect: false, rationale: "Present simple; sentence has 'yesterday'." },
        { text: "is playing",isCorrect: false, rationale: "Present continuous; not for past." },
        { text: "play",     isCorrect: false, rationale: "Base form; needs past tense marker." },
      ],
    },
  },
  // A1 · Past simple (irregular — to go)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "past-simple", "irregular", SEED_TAG],
    content: {
      prompt: "Last Saturday, we ___ to the cinema.",
      options: [
        { text: "went",  isCorrect: true,  rationale: "'Go' is irregular: go → went." },
        { text: "goed",  isCorrect: false, rationale: "'Go' is irregular; 'goed' is a common learner error." },
        { text: "go",    isCorrect: false, rationale: "Base form; 'last Saturday' demands past tense." },
        { text: "gone",  isCorrect: false, rationale: "'Gone' is the past participle; needs auxiliary 'have'." },
      ],
    },
  },
  // A1 · Was/Were (past of be)
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "past-simple", "be", SEED_TAG],
    content: {
      prompt: "It ___ very cold yesterday.",
      options: [
        { text: "was",   isCorrect: true,  rationale: "Third person singular past of 'be' = 'was'." },
        { text: "were",  isCorrect: false, rationale: "'Were' is for you/we/they in past." },
        { text: "is",    isCorrect: false, rationale: "'Is' is present tense." },
        { text: "been",  isCorrect: false, rationale: "'Been' is past participle; needs auxiliary 'have'." },
      ],
    },
  },
  // A1 · Did-questions / negation
  {
    skill: "GRAMMAR", cefrLevel: "A1", difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a1", "past-simple", "questions", SEED_TAG],
    content: {
      prompt: "___ you enjoy the film last night?",
      options: [
        { text: "Did",   isCorrect: true,  rationale: "Past simple questions use 'did' + subject + base verb." },
        { text: "Do",    isCorrect: false, rationale: "'Do' is present tense." },
        { text: "Were",  isCorrect: false, rationale: "'Were' is past 'be'; 'enjoy' is an action verb." },
        { text: "Have",  isCorrect: false, rationale: "'Have' forms present perfect, not past simple." },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // A2 — 30 items: Present continuous, past simple, going to, comparatives, modals
  // Ages 11–14, Language Schools placement-test contexts
  // ══════════════════════════════════════════════════════════════════════

  // A2 · Present continuous (ongoing action / temporary)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -1.8, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a2", "present-continuous", "junior", SEED_TAG],
    content: {
      prompt: "I can't talk right now. I ___ for an exam.",
      options: [
        { text: "am studying",  isCorrect: true,  rationale: "Present continuous for a temporary activity happening now." },
        { text: "study",        isCorrect: false, rationale: "Present simple for habitual actions; not for 'right now'." },
        { text: "studied",      isCorrect: false, rationale: "Past simple; the action is happening now." },
        { text: "was studying", isCorrect: false, rationale: "Past continuous; not happening now." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -1.7, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a2", "present-continuous", "spelling", SEED_TAG],
    content: {
      prompt: "Which sentence has the CORRECT spelling of the -ing form?",
      options: [
        { text: "She is sitting on the floor.",   isCorrect: true,  rationale: "'Sit' ends in CVC (consonant-vowel-consonant); double the final consonant: sitting." },
        { text: "She is siting on the floor.",    isCorrect: false, rationale: "One 't' is incorrect; double the 't' to 'sitting'." },
        { text: "She is siteing on the floor.",   isCorrect: false, rationale: "Don't add '-e' before '-ing'." },
        { text: "She is sitiing on the floor.",   isCorrect: false, rationale: "Three letters is incorrect; just 'sitting'." },
      ],
    },
  },
  // A2 · Past simple — irregular verbs
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -1.6, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a2", "past-simple", "irregular", "junior", SEED_TAG],
    content: {
      prompt: "She ___ a great book last summer. (read past form)",
      options: [
        { text: "read",    isCorrect: true,  rationale: "'Read' is an irregular verb: present = read (reed), past = read (red). Same spelling, different pronunciation." },
        { text: "readed",  isCorrect: false, rationale: "'Read' is irregular; the past is 'read' not 'readed'." },
        { text: "red",     isCorrect: false, rationale: "That is a colour, not the past of 'read'." },
        { text: "reads",   isCorrect: false, rationale: "'Reads' is present simple third person." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -1.5, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a2", "past-simple", "irregular", SEED_TAG],
    content: {
      prompt: "They ___ a lot of money on their holiday.",
      options: [
        { text: "spent",  isCorrect: true,  rationale: "Irregular: spend → spent." },
        { text: "spended",isCorrect: false, rationale: "'Spend' is irregular; not 'spended'." },
        { text: "spend",  isCorrect: false, rationale: "Base form; past tense needed." },
        { text: "spenned",isCorrect: false, rationale: "Not a word." },
      ],
    },
  },
  // A2 · Past continuous vs. past simple
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -1.3, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "past-continuous", "past-simple", SEED_TAG],
    content: {
      prompt: "While I ___ TV, my phone rang.",
      options: [
        { text: "was watching",  isCorrect: true,  rationale: "Past continuous for a background action interrupted by the simple past." },
        { text: "watched",       isCorrect: false, rationale: "Past simple here would imply two completed actions in sequence, not one interrupting the other." },
        { text: "am watching",   isCorrect: false, rationale: "Present continuous; the context is past." },
        { text: "watch",         isCorrect: false, rationale: "Present simple; wrong tense." },
      ],
    },
  },
  // A2 · Used to
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -1.1, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "used-to", SEED_TAG],
    content: {
      prompt: "When I was a child, I ___ walk to school every day. (but I don't now)",
      options: [
        { text: "used to",    isCorrect: true,  rationale: "'Used to' describes a past habit that no longer exists." },
        { text: "was used to",isCorrect: false, rationale: "'Was used to' + -ing means 'was accustomed to'." },
        { text: "would",      isCorrect: false, rationale: "'Would' can also describe past habits, but is less common at A2." },
        { text: "use to",     isCorrect: false, rationale: "Spelling error in affirmative: 'used to' (with -d)." },
      ],
    },
  },
  // A2 · Future: will (spontaneous decision)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -1.0, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a2", "will", "future", SEED_TAG],
    content: {
      prompt: "The phone is ringing. Don't worry — I ___ answer it.",
      options: [
        { text: "will",       isCorrect: true,  rationale: "'Will' for a spontaneous decision made at the moment of speaking." },
        { text: "am going to",isCorrect: false, rationale: "'Going to' is for pre-planned decisions; this is spontaneous." },
        { text: "would",      isCorrect: false, rationale: "'Would' is conditional past, not spontaneous future." },
        { text: "shall",      isCorrect: false, rationale: "'Shall' is used for first person offers/suggestions in British English but 'will' is more standard here." },
      ],
    },
  },
  // A2 · Should (advice)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.9, discrimination: 1.1, guessing: 0.25,
    tags: ["grammar", "a2", "modal-should", "advice", SEED_TAG],
    content: {
      prompt: "You look tired. You ___ go to bed early tonight.",
      options: [
        { text: "should",  isCorrect: true,  rationale: "'Should' expresses advice or recommendation." },
        { text: "must",    isCorrect: false, rationale: "'Must' is strong obligation; 'should' is gentler advice." },
        { text: "could",   isCorrect: false, rationale: "'Could' is possibility/suggestion; 'should' is stronger advice." },
        { text: "can",     isCorrect: false, rationale: "'Can' is ability or informal permission, not advice." },
      ],
    },
  },
  // A2 · Must / Mustn't (obligation/prohibition)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.8, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "modals-must", "obligation", SEED_TAG],
    content: {
      prompt: "In a library, you ___ make noise. (it is forbidden)",
      options: [
        { text: "mustn't",  isCorrect: true,  rationale: "'Mustn't' expresses prohibition." },
        { text: "don't have to", isCorrect: false, rationale: "'Don't have to' = it is not necessary (no obligation), not forbidden." },
        { text: "shouldn't",isCorrect: false, rationale: "'Shouldn't' is mild advice/recommendation; 'mustn't' is stronger prohibition." },
        { text: "couldn't", isCorrect: false, rationale: "'Couldn't' is past inability, not current prohibition." },
      ],
    },
  },
  // A2 · Superlatives
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.7, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "superlatives", SEED_TAG],
    content: {
      prompt: "Everest is ___ mountain in the world.",
      options: [
        { text: "the highest",      isCorrect: true,  rationale: "Superlative: high → the highest. One syllable + -est, with definite article 'the'." },
        { text: "the most high",    isCorrect: false, rationale: "Short adjectives use '-est', not 'most'." },
        { text: "higher",           isCorrect: false, rationale: "Comparative, not superlative." },
        { text: "the higher",       isCorrect: false, rationale: "'Higher' is comparative; superlative needs '-est'." },
      ],
    },
  },
  // A2 · Too / Enough
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.5, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "too-enough", SEED_TAG],
    content: {
      prompt: "I can't lift this box. It's ___ heavy for me.",
      options: [
        { text: "too",    isCorrect: true,  rationale: "'Too' + adjective = more than is acceptable/possible." },
        { text: "enough", isCorrect: false, rationale: "'Enough' means a sufficient amount: 'not heavy enough' would mean insufficient weight." },
        { text: "very",   isCorrect: false, rationale: "'Very' intensifies but does not imply impossibility like 'too' does." },
        { text: "so",     isCorrect: false, rationale: "'So heavy' can precede a result clause ('so heavy that…'), but 'too' is correct without a result clause here." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.4, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "too-enough", SEED_TAG],
    content: {
      prompt: "She is 15 years old and is ___ young to vote. (below the legal age)",
      options: [
        { text: "too",         isCorrect: true,  rationale: "'Too young' = below the acceptable level." },
        { text: "not enough",  isCorrect: false, rationale: "'Not old enough' would be correct, but 'not enough young' is ungrammatical." },
        { text: "very",        isCorrect: false, rationale: "'Very young' describes degree but doesn't imply inability." },
        { text: "quite",       isCorrect: false, rationale: "'Quite young' is a softener; does not imply the legal barrier." },
      ],
    },
  },
  // A2 · Verb + -ing (enjoy, like, love, hate)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.3, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "verb-patterns", "gerund", SEED_TAG],
    content: {
      prompt: "He really enjoys ___ football with his friends.",
      options: [
        { text: "playing",  isCorrect: true,  rationale: "'Enjoy' must be followed by a gerund (-ing form), not an infinitive." },
        { text: "to play",  isCorrect: false, rationale: "'Enjoy + to-infinitive' is ungrammatical in standard English." },
        { text: "play",     isCorrect: false, rationale: "Bare infinitive after 'enjoy' is not standard." },
        { text: "played",   isCorrect: false, rationale: "Past participle; not the required form after 'enjoy'." },
      ],
    },
  },
  // A2 · Verb + infinitive (want, hope, decide, plan)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "verb-patterns", "infinitive", SEED_TAG],
    content: {
      prompt: "She decided ___ a new language.",
      options: [
        { text: "to learn",  isCorrect: true,  rationale: "'Decide' is followed by the to-infinitive." },
        { text: "learning",  isCorrect: false, rationale: "'Decide + -ing' is ungrammatical; use to-infinitive." },
        { text: "learn",     isCorrect: false, rationale: "Bare infinitive after 'decide' is not standard." },
        { text: "learned",   isCorrect: false, rationale: "Past form; wrong tense and form." },
      ],
    },
  },
  // A2 · Question formation (indirect / embedded) — basic
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "questions", "embedded", SEED_TAG],
    content: {
      prompt: "Choose the correct question: (you want to know the time the shop opens)",
      options: [
        { text: "What time does the shop open?",   isCorrect: true,  rationale: "Correct auxiliary inversion: 'does' before the subject." },
        { text: "What time the shop opens?",        isCorrect: false, rationale: "Missing auxiliary 'does'; this is statement word order." },
        { text: "What time opens the shop?",        isCorrect: false, rationale: "Subject-verb inversion without auxiliary is archaic/incorrect." },
        { text: "When does the shop opens?",        isCorrect: false, rationale: "After auxiliary 'does', the base form 'open' is needed (not 'opens')." },
      ],
    },
  },
  // A2 · Quantifiers (some / any)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "quantifiers", "some-any", SEED_TAG],
    content: {
      prompt: "Do you have ___ milk? I need ___ for my coffee.",
      options: [
        { text: "any / some",  isCorrect: true,  rationale: "'Any' in questions; 'some' in affirmative requests/offers." },
        { text: "some / any",  isCorrect: false, rationale: "'Some' is less natural in neutral questions; 'any' is preferred." },
        { text: "any / any",   isCorrect: false, rationale: "The affirmative statement 'I need' takes 'some'." },
        { text: "some / some", isCorrect: false, rationale: "'Some' in a neutral question sounds like you already expect a positive answer." },
      ],
    },
  },
  // A2 · Much / Many / A lot of
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "quantifiers", "much-many", SEED_TAG],
    content: {
      prompt: "There is ___ traffic on this road in the morning.",
      options: [
        { text: "a lot of",  isCorrect: true,  rationale: "'A lot of' is used with uncountable nouns (traffic) in affirmative sentences." },
        { text: "many",      isCorrect: false, rationale: "'Many' is for countable nouns (cars, buses). 'Traffic' is uncountable." },
        { text: "much",      isCorrect: false, rationale: "'Much' is for uncountable nouns in questions/negatives, not affirmatives." },
        { text: "few",       isCorrect: false, rationale: "'Few' means not many; the sentence states a large amount." },
      ],
    },
  },
  // A2 · Relative clauses (who/which) basic
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "relative-clauses", SEED_TAG],
    content: {
      prompt: "That is the man ___ saved my cat from the tree.",
      options: [
        { text: "who",   isCorrect: true,  rationale: "'Who' introduces a relative clause referring to a person." },
        { text: "which", isCorrect: false, rationale: "'Which' refers to things, not people." },
        { text: "what",  isCorrect: false, rationale: "'What' does not introduce relative clauses modifying a noun." },
        { text: "that",  isCorrect: false, rationale: "'That' is possible but 'who' is preferred for people in defining clauses." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "relative-clauses", SEED_TAG],
    content: {
      prompt: "This is the book ___ helped me the most in my studies.",
      options: [
        { text: "that",  isCorrect: true,  rationale: "'That' (or 'which') is used in relative clauses referring to things." },
        { text: "who",   isCorrect: false, rationale: "'Who' is for people; 'book' is a thing." },
        { text: "whom",  isCorrect: false, rationale: "'Whom' is the object form for people." },
        { text: "whose", isCorrect: false, rationale: "'Whose' shows possession; doesn't fit here." },
      ],
    },
  },
  // A2 · Conditional type 0 (always true)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "conditionals", "zero-conditional", SEED_TAG],
    content: {
      prompt: "If you ___ water to 100°C, it ___. (scientific fact)",
      options: [
        { text: "heat / boils",      isCorrect: true,  rationale: "Zero conditional: if + present simple, present simple — for general truths." },
        { text: "heated / would boil",isCorrect: false, rationale: "That is second conditional (hypothetical); this is a fact." },
        { text: "heat / will boil",  isCorrect: false, rationale: "First conditional is for possible real situations, not established facts." },
        { text: "will heat / boils", isCorrect: false, rationale: "The if-clause in conditional does not normally use 'will'." },
      ],
    },
  },
  // A2 · First conditional (real possibility)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ["grammar", "a2", "conditionals", "first-conditional", SEED_TAG],
    content: {
      prompt: "If it ___ tomorrow, we ___ go to the beach.",
      options: [
        { text: "doesn't rain / will",   isCorrect: true,  rationale: "First conditional: if + present simple, will + base verb." },
        { text: "won't rain / will",     isCorrect: false, rationale: "The if-clause does not take 'will' in standard conditionals." },
        { text: "didn't rain / would",   isCorrect: false, rationale: "That is second conditional (hypothetical/unlikely)." },
        { text: "doesn't rain / would",  isCorrect: false, rationale: "Mixed tenses: first conditional uses 'will', not 'would'." },
      ],
    },
  },
  // A2 · Present perfect (experience / ever-never)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ["grammar", "a2", "present-perfect", "experience", SEED_TAG],
    content: {
      prompt: "Have you ever ___ sushi?",
      options: [
        { text: "eaten",  isCorrect: true,  rationale: "Present perfect: have + past participle. 'Eat' → 'eaten'." },
        { text: "ate",    isCorrect: false, rationale: "'Ate' is past simple; present perfect requires the participle 'eaten'." },
        { text: "eat",    isCorrect: false, rationale: "Base form; present perfect needs the past participle." },
        { text: "eating", isCorrect: false, rationale: "Gerund; not the participial form needed here." },
      ],
    },
  },
  // A2 · Present perfect vs. past simple
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ["grammar", "a2", "present-perfect", "past-simple", SEED_TAG],
    content: {
      prompt: "I ___ my keys. I can't find them anywhere.",
      options: [
        { text: "have lost",  isCorrect: true,  rationale: "Present perfect: a past event with present relevance (the keys are still missing now)." },
        { text: "lost",       isCorrect: false, rationale: "Past simple implies a closed event with a stated past time; here we have present relevance ('can't find them')." },
        { text: "have lose",  isCorrect: false, rationale: "Incorrect: use past participle 'lost', not base form 'lose'." },
        { text: "had lost",   isCorrect: false, rationale: "Past perfect refers to an event before another past event; not appropriate here." },
      ],
    },
  },
  // A2 · Passive voice (simple present/past)
  {
    skill: "GRAMMAR", cefrLevel: "A2", difficulty: 0.8, discrimination: 1.3, guessing: 0.25,
    tags: ["grammar", "a2", "passive", SEED_TAG],
    content: {
      prompt: "The Eiffel Tower ___ in 1889. (someone built it)",
      options: [
        { text: "was built",   isCorrect: true,  rationale: "Past simple passive: was/were + past participle." },
        { text: "built",       isCorrect: false, rationale: "Active past simple; requires an agent (Eiffel's company built it)." },
        { text: "was build",   isCorrect: false, rationale: "'Build' is the base form; passive needs past participle 'built'." },
        { text: "is built",    isCorrect: false, rationale: "Present passive; sentence uses 'in 1889' (past time)." },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // C2 — 30 items: Advanced/sophisticated grammar, near-native mastery
  // ══════════════════════════════════════════════════════════════════════

  // C2 · Inversion for emphasis
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.5, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "inversion", "emphasis", "academia", SEED_TAG],
    content: {
      prompt: "Choose the grammatically correct inversion for maximum emphasis:",
      options: [
        { text: "Not until the results were published did the scientific community fully acknowledge the discovery.",
          isCorrect: true,  rationale: "Correct negative inversion: 'Not until…' triggers auxiliary inversion 'did…' in main clause." },
        { text: "Not until the results were published the scientific community did fully acknowledge the discovery.",
          isCorrect: false, rationale: "Incorrect: after 'not until…' inversion is obligatory in the main clause." },
        { text: "Until not the results were published did the scientific community fully acknowledge the discovery.",
          isCorrect: false, rationale: "'Not' must follow 'until' immediately, not precede it." },
        { text: "Not until the results were published the scientific community fully acknowledged the discovery.",
          isCorrect: false, rationale: "Missing inversion: 'did the scientific community' is required after 'not until…'." },
      ],
    },
  },
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.6, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "inversion", "conditionals", "academia", SEED_TAG],
    content: {
      prompt: "Select the form that correctly inverts a third conditional:",
      options: [
        { text: "Had the board approved the merger, the company would have dominated the market.",
          isCorrect: true,  rationale: "'Had' replaces 'If the board had': inverted third conditional for stylistic/formal effect." },
        { text: "Did the board approve the merger, the company would have dominated the market.",
          isCorrect: false, rationale: "Third conditional requires past perfect inversion ('had'), not simple past ('did')." },
        { text: "Were the board to have approved the merger, the company would have dominated the market.",
          isCorrect: false, rationale: "'Were to have' is not the standard third conditional inversion form." },
        { text: "Should the board have approved the merger, the company would have dominated the market.",
          isCorrect: false, rationale: "'Should + have' inverts first conditional-like structures, not third conditional." },
      ],
    },
  },
  // C2 · Cleft sentences (it-cleft / wh-cleft)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.5, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "cleft-sentences", "focus", "academia", SEED_TAG],
    content: {
      prompt: "Identify the sentence that uses a grammatically correct IT-CLEFT to focus on the time:",
      options: [
        { text: "It was in the 1960s that the civil rights movement reached its peak.",
          isCorrect: true,  rationale: "Correct it-cleft: 'It was [focus: in the 1960s] that [rest of clause].'." },
        { text: "It was in the 1960s when the civil rights movement reached its peak.",
          isCorrect: false, rationale: "'When' introduces relative time clauses; it-clefts require 'that'." },
        { text: "It was the civil rights movement that reached its peak in the 1960s.",
          isCorrect: false, rationale: "Grammatically correct but focuses on 'the civil rights movement', not the time." },
        { text: "It was reached its peak in the 1960s that the civil rights movement.",
          isCorrect: false, rationale: "Wrong word order; the focused element must be a noun phrase." },
      ],
    },
  },
  // C2 · Subjunctive mood
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.6, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "subjunctive", "formal", "academia", SEED_TAG],
    content: {
      prompt: "Which sentence correctly uses the MANDATIVE SUBJUNCTIVE?",
      options: [
        { text: "The committee recommends that each applicant submit a portfolio.",
          isCorrect: true,  rationale: "Mandative subjunctive: after 'recommend that', use base form 'submit' (no -s, no modal)." },
        { text: "The committee recommends that each applicant submits a portfolio.",
          isCorrect: false, rationale: "Incorrect: mandative subjunctive requires the base form, not 'submits'." },
        { text: "The committee recommends that each applicant should submit a portfolio.",
          isCorrect: false, rationale: "'Should + base form' is the British modal alternative but not the pure subjunctive form." },
        { text: "The committee recommends that each applicant submitted a portfolio.",
          isCorrect: false, rationale: "Past tense 'submitted' is wrong in the mandative subjunctive." },
      ],
    },
  },
  // C2 · Nominal relative clauses (what-clauses as subject)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.5, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "nominal-relative", "cleft", "academia", SEED_TAG],
    content: {
      prompt: "Select the sentence where 'what' correctly heads a NOMINAL RELATIVE CLAUSE as subject:",
      options: [
        { text: "What strikes most observers is the sheer scale of the deforestation.",
          isCorrect: true,  rationale: "'What strikes most observers' is a nominal relative clause functioning as subject of the main clause." },
        { text: "Which strikes most observers is the sheer scale of the deforestation.",
          isCorrect: false, rationale: "'Which' introduces relative clauses modifying a noun, not nominal clauses." },
        { text: "That strikes most observers is the sheer scale of the deforestation.",
          isCorrect: false, rationale: "'That'-clauses require a preceding verb or adjective ('It is + adj + that…')." },
        { text: "What is striking most observers is the sheer scale of the deforestation.",
          isCorrect: false, rationale: "Using 'is striking' (continuous) creates a double copula with 'is' in the main clause." },
      ],
    },
  },
  // C2 · Ellipsis and substitution
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.6, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "ellipsis", "substitution", "cohesion", SEED_TAG],
    content: {
      prompt: "Which response correctly uses ELLIPSIS (avoiding repetition)?",
      options: [
        { text: "A: 'Have you read the report?' B: 'No, I haven't.'",
          isCorrect: true,  rationale: "The full verb phrase 'read the report' is ellipted after 'haven't'; correct auxiliary retention." },
        { text: "A: 'Have you read the report?' B: 'No, I haven't read.'",
          isCorrect: false, rationale: "Partial ellipsis is awkward; either fully ellide ('haven't') or repeat completely." },
        { text: "A: 'Have you read the report?' B: 'No, I didn't.'",
          isCorrect: false, rationale: "Mismatch: question uses present perfect ('have'), answer should use 'haven't', not 'didn't'." },
        { text: "A: 'Have you read the report?' B: 'No, I haven't it.'",
          isCorrect: false, rationale: "'Haven't it' is ungrammatical; there is no direct-object retention in English VP ellipsis." },
      ],
    },
  },
  // C2 · Participle clauses (advanced reduction)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.7, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "participle-clauses", "reduction", "academia", SEED_TAG],
    content: {
      prompt: "Select the sentence where the participle clause is CORRECTLY formed:",
      options: [
        { text: "Having completed her PhD, she was immediately offered a research position.",
          isCorrect: true,  rationale: "Perfect participle 'having completed' correctly conveys an action prior to the main clause." },
        { text: "Completing her PhD, she was immediately offered a research position.",
          isCorrect: false, rationale: "Simple participle implies simultaneity; the PhD completion precedes the job offer." },
        { text: "Having been completed her PhD, she was immediately offered a research position.",
          isCorrect: false, rationale: "'Having been completed' is passive; 'she' completed it actively." },
        { text: "Complete her PhD, she was immediately offered a research position.",
          isCorrect: false, rationale: "Base form 'complete' cannot head a participle clause." },
      ],
    },
  },
  // C2 · Hypothetical past regret (wish / if only)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.6, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "wish", "hypothetical", "regret", SEED_TAG],
    content: {
      prompt: "Choose the sentence that expresses REGRET about a past action:",
      options: [
        { text: "I wish I had taken the job offer.",
          isCorrect: true,  rationale: "'Wish + past perfect' expresses regret about a completed past event." },
        { text: "I wish I took the job offer.",
          isCorrect: false, rationale: "'Wish + simple past' is for present unreal wishes, not past regret." },
        { text: "I wish I would take the job offer.",
          isCorrect: false, rationale: "'Wish + would' expresses desire for someone/something to change; not used for self or past events." },
        { text: "I wish I have taken the job offer.",
          isCorrect: false, rationale: "Present perfect after 'wish' is ungrammatical in this context." },
      ],
    },
  },
  // C2 · Double object construction
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.5, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "double-object", "ditransitive", "academia", SEED_TAG],
    content: {
      prompt: "Which sentence uses the DATIVE ALTERNATION incorrectly?",
      options: [
        { text: "She donated the museum a rare artefact.",
          isCorrect: true,  rationale: "'Donate' does not license the double-object construction in standard English; must use 'donated a rare artefact to the museum'." },
        { text: "She donated a rare artefact to the museum.",
          isCorrect: false, rationale: "Correct prepositional dative construction with 'donate'." },
        { text: "She gave the museum a rare artefact.",
          isCorrect: false, rationale: "'Give' licenses both constructions; double-object is fully grammatical." },
        { text: "She showed the curator the artefact.",
          isCorrect: false, rationale: "'Show' licenses both constructions; double-object is standard." },
      ],
    },
  },
  // C2 · Appositives (non-restrictive)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.5, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "appositive", "non-restrictive", "punctuation", SEED_TAG],
    content: {
      prompt: "Which sentence correctly uses a NON-RESTRICTIVE APPOSITIVE?",
      options: [
        { text: "Darwin, the father of evolutionary theory, published his landmark work in 1859.",
          isCorrect: true,  rationale: "Correct: 'the father of evolutionary theory' is a non-restrictive appositive, set off by commas." },
        { text: "Darwin the father of evolutionary theory published his landmark work in 1859.",
          isCorrect: false, rationale: "Missing commas; a non-restrictive appositive must be separated by commas." },
        { text: "Darwin, the father of evolutionary theory published his landmark work in 1859.",
          isCorrect: false, rationale: "Asymmetric comma: both opening and closing commas are required." },
        { text: "Darwin, who was the father of evolutionary theory, he published his landmark work in 1859.",
          isCorrect: false, rationale: "The resumptive pronoun 'he' after the relative clause creates a double-subject error." },
      ],
    },
  },
  // C2 · Negative concord / double negative
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.5, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "negation", "formal-register", "prescriptive", SEED_TAG],
    content: {
      prompt: "In formal written English, which sentence is CORRECT?",
      options: [
        { text: "She could find no evidence to support the hypothesis.",
          isCorrect: true,  rationale: "Standard formal English: 'no + noun' with affirmative verb, or 'not any'." },
        { text: "She couldn't find no evidence to support the hypothesis.",
          isCorrect: false, rationale: "Double negative in standard formal English is non-standard and means the opposite." },
        { text: "She could not find not any evidence to support the hypothesis.",
          isCorrect: false, rationale: "'Not…not any' is a double negative; use 'could not find any' or 'found no'." },
        { text: "She could find not no evidence to support the hypothesis.",
          isCorrect: false, rationale: "Ungrammatical: 'not no' is a double negative." },
      ],
    },
  },
  // C2 · Stance adverbials
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.7, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "stance-adverbials", "discourse", "academia", SEED_TAG],
    content: {
      prompt: "Select the sentence where the stance adverbial is correctly used to mark EPISTEMIC CERTAINTY:",
      options: [
        { text: "Undoubtedly, climate change poses one of the greatest threats to biodiversity.",
          isCorrect: true,  rationale: "'Undoubtedly' is an epistemic stance adverbial expressing high certainty; correct position and punctuation." },
        { text: "Apparently, climate change undoubtedly poses the greatest threats to biodiversity.",
          isCorrect: false, rationale: "Two stance adverbials in one clause — conflicting: 'apparently' (reportative) and 'undoubtedly' (certainty) create pragmatic clash." },
        { text: "Climate change undoubted poses one of the greatest threats to biodiversity.",
          isCorrect: false, rationale: "'Undoubted' is an adjective; the adverbial form is 'undoubtedly'." },
        { text: "Climate change poses, undoubtedly one of the greatest, threats to biodiversity.",
          isCorrect: false, rationale: "Incorrect placement disrupts the noun phrase; stance adverbials do not modify noun phrases this way." },
      ],
    },
  },
  // C2 · Concessive clauses (even though / although / despite / in spite of)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.6, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "concessive-clauses", "cohesion", "academia", SEED_TAG],
    content: {
      prompt: "Select the sentence that uses the CONCESSIVE LINKER correctly:",
      options: [
        { text: "Despite having extensive experience, she was not shortlisted for the position.",
          isCorrect: true,  rationale: "'Despite' is followed by a noun phrase or gerund, not a clause — correct here." },
        { text: "Despite she had extensive experience, she was not shortlisted for the position.",
          isCorrect: false, rationale: "'Despite' must not directly precede a subject-verb clause; use 'despite the fact that' or 'although'." },
        { text: "Although having extensive experience, she was not shortlisted for the position.",
          isCorrect: false, rationale: "'Although' requires a full subject-verb clause, not a participial phrase." },
        { text: "In spite that she had extensive experience, she was not shortlisted for the position.",
          isCorrect: false, rationale: "'In spite of' is followed by a noun phrase; use 'in spite of the fact that' for a clause." },
      ],
    },
  },
  // C2 · Reporting verbs (complex patterns)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.6, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "reporting-verbs", "verb-patterns", "academia", SEED_TAG],
    content: {
      prompt: "Select the sentence with the correct verb pattern after 'accuse':",
      options: [
        { text: "The journalist accused the minister of leaking classified documents.",
          isCorrect: true,  rationale: "'Accuse + object + of + gerund' is the correct pattern." },
        { text: "The journalist accused the minister to leak classified documents.",
          isCorrect: false, rationale: "'Accuse + to-infinitive' is ungrammatical; 'of + gerund' is required." },
        { text: "The journalist accused that the minister leaked classified documents.",
          isCorrect: false, rationale: "'Accuse + that-clause' is not licensed; use 'accuse + object + of + gerund'." },
        { text: "The journalist accused the minister for leaking classified documents.",
          isCorrect: false, rationale: "'For' is not the correct preposition with 'accuse'; use 'of'." },
      ],
    },
  },
  // C2 · Fronting (topicalisation)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.7, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "topicalisation", "fronting", "discourse", SEED_TAG],
    content: {
      prompt: "Select the grammatically correct FRONTED sentence for discourse emphasis:",
      options: [
        { text: "The implications of this research, however, we must not underestimate.",
          isCorrect: true,  rationale: "Object fronting without inversion: the direct object is placed clause-initially for emphasis." },
        { text: "The implications of this research however we mustn't underestimate.",
          isCorrect: false, rationale: "Missing comma punctuation around the discourse connector 'however'." },
        { text: "The implications of this research, however, we not must underestimate.",
          isCorrect: false, rationale: "Modal negation: 'must not', not 'not must'." },
        { text: "However the implications of this research, we must not underestimate.",
          isCorrect: false, rationale: "Incorrect comma placement; 'however' as a connector should come after the fronted element." },
      ],
    },
  },
  // C2 · Degree modification (hedging)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.6, discrimination: 1.4, guessing: 0.20,
    tags: ["grammar", "c2", "hedging", "modality", "academic-writing", SEED_TAG],
    content: {
      prompt: "In academic writing, which hedge is MOST appropriately calibrated?",
      options: [
        { text: "The findings suggest a possible correlation between diet and cognitive decline.",
          isCorrect: true,  rationale: "'Suggest' (epistemic verb) + 'possible' (epistemic adjective) = appropriately hedged academic claim." },
        { text: "The findings prove a definite correlation between diet and cognitive decline.",
          isCorrect: false, rationale: "'Prove' and 'definite' are over-claiming; academic writing requires hedging." },
        { text: "The findings might perhaps possibly indicate a correlation between diet and cognitive decline.",
          isCorrect: false, rationale: "Over-hedging: three hedges ('might', 'perhaps', 'possibly') create redundancy." },
        { text: "The findings indicate that diet always causes cognitive decline.",
          isCorrect: false, rationale: "'Always causes' is an absolute claim; inappropriate for a correlational finding." },
      ],
    },
  },
  // C2 · Pseudo-cleft
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.8, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "pseudo-cleft", "focus", "discourse", SEED_TAG],
    content: {
      prompt: "Identify the grammatically correct WH-CLEFT (pseudo-cleft):",
      options: [
        { text: "What the government needs to address is the widening inequality gap.",
          isCorrect: true,  rationale: "Correct wh-cleft: 'What + [rest of clause] + is + [focused element]'." },
        { text: "What the government needs to address are the widening inequality gap.",
          isCorrect: false, rationale: "Agreement error: 'gap' is singular; the copula must be 'is'." },
        { text: "That the government needs to address is the widening inequality gap.",
          isCorrect: false, rationale: "'That' introduces a content clause; wh-clefts use 'what'." },
        { text: "What the government needs to address it is the widening inequality gap.",
          isCorrect: false, rationale: "Resumptive pronoun 'it' creates a double subject; it must be omitted." },
      ],
    },
  },
  // C2 · Absolute constructions
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.9, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "absolute-construction", "participial", "formal", SEED_TAG],
    content: {
      prompt: "Select the sentence with the correct ABSOLUTE CONSTRUCTION:",
      options: [
        { text: "Weather permitting, the outdoor ceremony will proceed as planned.",
          isCorrect: true,  rationale: "Correct absolute construction: subject ('weather') + present participle ('permitting'), no grammatical link to main clause." },
        { text: "Weather being permitting, the outdoor ceremony will proceed as planned.",
          isCorrect: false, rationale: "Redundant 'being'; the participle 'permitting' alone forms the absolute correctly." },
        { text: "Weather permitted, the outdoor ceremony will proceed as planned.",
          isCorrect: false, rationale: "'Permitted' is past participle (passive); the conditional meaning needs active present participle." },
        { text: "The weather permitting, the outdoor ceremony will proceed as planned.",
          isCorrect: false, rationale: "While acceptable with 'the', the established fixed expression is 'weather permitting'." },
      ],
    },
  },
  // C2 · Modal perfects (epistemic)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.7, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "modal-perfects", "epistemic-modality", SEED_TAG],
    content: {
      prompt: "The lights are off. She left hours ago. Choose the most appropriate epistemic modal perfect:",
      options: [
        { text: "She must have left already.",
          isCorrect: true,  rationale: "'Must have + past participle' expresses strong logical deduction about the past." },
        { text: "She should have left already.",
          isCorrect: false, rationale: "'Should have' expresses expectation or criticism of a past action, not deduction." },
        { text: "She will have left already.",
          isCorrect: false, rationale: "'Will have' expresses assumption/prediction about a completed state, less certain." },
        { text: "She would have left already.",
          isCorrect: false, rationale: "'Would have' is used in conditionals or to describe hypothetical past actions." },
      ],
    },
  },
  // C2 · Register — formal vs. informal (grammatical feature)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.7, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "register", "formal-informal", "preposition-stranding", SEED_TAG],
    content: {
      prompt: "In a formal written document, which sentence shows CORRECT preposition placement?",
      options: [
        { text: "The issue about which the committee deliberated at length remains unresolved.",
          isCorrect: true,  rationale: "Pied-piping (preposition moved to front): formal, correct academic register." },
        { text: "The issue which the committee deliberated about at length remains unresolved.",
          isCorrect: false, rationale: "Preposition stranding ('about' at end) is grammatical but informal; not ideal for formal documents." },
        { text: "The issue that the committee deliberated about at length remains unresolved.",
          isCorrect: false, rationale: "'That' cannot be used after a preposition; 'which' is required in pied-piping. (Also informal.)" },
        { text: "The issue the committee deliberated about at length remains unresolved.",
          isCorrect: false, rationale: "Contact clause (omitting relative pronoun) is informal; preposition stranding adds informality." },
      ],
    },
  },
  // C2 · Discourse connectors — logical precision
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.8, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "discourse-connectors", "logic", "academic-writing", SEED_TAG],
    content: {
      prompt: "Which connector MOST precisely expresses that the second clause CONTRADICTS an expected outcome from the first?",
      options: [
        { text: "The intervention was carefully designed; nevertheless, the outcomes were disappointing.",
          isCorrect: true,  rationale: "'Nevertheless' marks a concessive contrast: despite the quality of the design, the outcome contradicted expectations." },
        { text: "The intervention was carefully designed; therefore, the outcomes were disappointing.",
          isCorrect: false, rationale: "'Therefore' signals logical consequence, implying design caused disappointing outcomes — illogical here." },
        { text: "The intervention was carefully designed; furthermore, the outcomes were disappointing.",
          isCorrect: false, rationale: "'Furthermore' adds information; it doesn't mark a contradiction." },
        { text: "The intervention was carefully designed; similarly, the outcomes were disappointing.",
          isCorrect: false, rationale: "'Similarly' signals comparability; it doesn't express the unexpected contrast." },
      ],
    },
  },
  // C2 · Noun phrase complexity
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.8, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "noun-phrase", "modification", "academia", SEED_TAG],
    content: {
      prompt: "Which sentence contains a GRAMMATICALLY ACCEPTABLE complex pre-modifier?",
      options: [
        { text: "The long-awaited policy review yielded surprisingly few concrete recommendations.",
          isCorrect: true,  rationale: "Compound adjective 'long-awaited' (hyphenated pre-modifier) is standard and grammatically acceptable." },
        { text: "The long time awaited policy review yielded surprisingly few concrete recommendations.",
          isCorrect: false, rationale: "Without hyphenation or compounding, 'long time awaited' is ungrammatical as a pre-modifier." },
        { text: "The policy review long awaited yielded surprisingly few concrete recommendations.",
          isCorrect: false, rationale: "Post-nominal adjective positioning without a relative clause is non-standard." },
        { text: "The policy review that long was awaited yielded surprisingly few concrete recommendations.",
          isCorrect: false, rationale: "Ungrammatical relative clause structure; 'long' cannot be used as an adverb before the passive auxiliary 'was'." },
      ],
    },
  },
  // C2 · Anaphora and cataphora
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.9, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "cohesion", "anaphora", "cataphora", "academic-writing", SEED_TAG],
    content: {
      prompt: "Identify the sentence that employs CATAPHORA (pronoun before antecedent):",
      options: [
        { text: "When she arrived at the lab, Dr. Chen immediately began reviewing the data.",
          isCorrect: true,  rationale: "'She' precedes and anticipates 'Dr. Chen' — this is cataphoric reference." },
        { text: "Dr. Chen arrived at the lab. She immediately began reviewing the data.",
          isCorrect: false, rationale: "This is anaphora: 'she' follows its antecedent 'Dr. Chen'." },
        { text: "The data that Dr. Chen reviewed was inconclusive.",
          isCorrect: false, rationale: "This contains a restrictive relative clause, not cataphoric reference." },
        { text: "Dr. Chen and her team reviewed the data.",
          isCorrect: false, rationale: "'Her' refers forward to 'team' but this is not a full cataphoric structure." },
      ],
    },
  },
  // C2 · Pronoun reference ambiguity
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.8, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "pronoun-reference", "ambiguity", "academic-writing", SEED_TAG],
    content: {
      prompt: "Which sentence contains AMBIGUOUS PRONOUN REFERENCE that must be revised?",
      options: [
        { text: "The researcher told the participant that they had made an error.",
          isCorrect: true,  rationale: "'They' is ambiguous: does it refer to the researcher or the participant? This is a clarity error in academic writing." },
        { text: "The research team reviewed the data and found it inconclusive.",
          isCorrect: false, rationale: "'It' clearly refers to 'the data'; no ambiguity." },
        { text: "Having reviewed all submissions, the committee selected the most innovative one.",
          isCorrect: false, rationale: "'One' clearly refers to 'submission'; no ambiguity." },
        { text: "The professor and the student discussed her thesis.",
          isCorrect: false, rationale: "'Her' is potentially ambiguous but conventionally assumed to refer to the student in this context." },
      ],
    },
  },
  // C2 · Cohesive devices — do-substitution
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 1.9, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "cohesion", "do-substitution", "discourse", SEED_TAG],
    content: {
      prompt: "Which sentence correctly uses DO-SUBSTITUTION to avoid repetition?",
      options: [
        { text: "She revised the manuscript more thoroughly than her co-author did.",
          isCorrect: true,  rationale: "'Did' substitutes for 'revised the manuscript'; correct VP-substitution." },
        { text: "She revised the manuscript more thoroughly than her co-author revised.",
          isCorrect: false, rationale: "Full repetition; do-substitution ('did') would be the standard condensed form." },
        { text: "She revised the manuscript more thoroughly than her co-author done.",
          isCorrect: false, rationale: "'Done' is past participle; use 'did' for simple past substitution." },
        { text: "She revised the manuscript more thoroughly than her co-author does.",
          isCorrect: false, rationale: "Tense mismatch: main clause is past; 'does' is present." },
      ],
    },
  },
  // C2 · Preposition choice (sophisticated collocations)
  {
    skill: "GRAMMAR", cefrLevel: "C2", difficulty: 2.0, discrimination: 1.5, guessing: 0.20,
    tags: ["grammar", "c2", "prepositions", "collocations", "advanced", SEED_TAG],
    content: {
      prompt: "Choose the correct preposition: The study was conducted ___ strict ethical guidelines.",
      options: [
        { text: "in accordance with",  isCorrect: true,  rationale: "'In accordance with' is the correct formal phrase for conformity with standards/guidelines." },
        { text: "in accordance to",    isCorrect: false, rationale: "'In accordance to' is a common learner error; 'with' is required." },
        { text: "in accordance of",    isCorrect: false, rationale: "Ungrammatical; 'with' is the only licensed preposition in this phrase." },
        { text: "accordingly to",      isCorrect: false, rationale: "'Accordingly' is an adverb, not a preposition; 'accordingly' + noun is ungrammatical." },
      ],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set. Add it to .env");
    process.exit(1);
  }

  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} items`);
    const byLevel: Record<string, number> = {};
    for (const i of items) {
      byLevel[i.cefrLevel] = (byLevel[i.cefrLevel] || 0) + 1;
    }
    console.table(byLevel);
    return;
  }

  if (process.env.FORCE === "1") {
    const deleted = await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted ${deleted.count} existing items tagged [${SEED_TAG}]`);
  }

  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && process.env.FORCE !== "1") {
    console.log(`⚠️  ${existing} items already seeded. Use FORCE=1 to re-seed.`);
    return;
  }

  let inserted = 0;
  const { valid, invalid } = validateItemBatch(items);
  reportValidationResults(valid.length, invalid.length, invalid);
  if (invalid.length > 0) {
    console.error(`Cannot proceed: ${invalid.length} items failed validation`);
    process.exit(1);
  }
  for (const item of valid) {
    await prisma.item.create({
      data: {
        skill:          item.skill as any,
        cefrLevel:      item.cefrLevel as any,
        type:           "MULTIPLE_CHOICE",
        status:         "ACTIVE",
        difficulty:     item.difficulty,
        discrimination: item.discrimination,
        guessing:       item.guessing,
        tags:           item.tags,
        content:        item.content,
      },
    });
    inserted++;
  }

  const totals: Record<string, number> = {};
  for (const i of items) totals[i.cefrLevel] = (totals[i.cefrLevel] || 0) + 1;

  console.log(`\n✅  Inserted ${inserted} grammar items`);
  console.table(totals);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
