/**
 * TOEFL Junior Exam Framework
 *
 * Single source of truth for all TOEFL Junior knowledge embedded in the AI engine.
 *
 * Covers the TOEFL Junior Standard test (paper-based & digital):
 *  - Section 1: Listening Comprehension  (42 items)
 *  - Section 2: Language Form and Meaning (42 items)
 *  - Section 3: Reading Comprehension    (42 items)
 *
 * Sources:
 *  - ETS TOEFL Junior Standard Handbook for Score Recipients (2023)
 *  - ETS TOEFL Junior Interpretive Guide (2023)
 *  - ETS TOEFL Junior Score Descriptors (A2–B2 band alignment)
 *  - ETS TOEFL Junior Sample Questions and Practice Tests
 *  - CEFR Companion Volume (Council of Europe, 2020)
 *  - Common European Framework of Reference: ETS Global Alignment Report (2019)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXAM SECTION AND SKILL IDENTIFIERS
// ─────────────────────────────────────────────────────────────────────────────

/** The three scored sections of TOEFL Junior Standard */
export type ToeflJuniorSection =
  | "LISTENING"         // Section 1: Listening Comprehension
  | "LANG_FORM_MEANING" // Section 2: Language Form and Meaning
  | "READING";          // Section 3: Reading Comprehension

/** Mapped skill for DB storage */
export type ToeflJuniorSkill =
  | "LISTENING"
  | "GRAMMAR"
  | "VOCABULARY"
  | "READING";

// ─────────────────────────────────────────────────────────────────────────────
// 2. ITEM FORMAT TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────

export type ToeflJuniorItemFormat =
  // Listening formats
  | "SHORT_CONVERSATION_MCQ"    // Part 1: 2-speaker short exchange, 1 question
  | "SHORT_TALK_MCQ"            // Part 2: 1 speaker monologue, 3 questions
  | "ACADEMIC_DISCUSSION_MCQ"   // Part 3: classroom discussion/mini-lecture, 3 questions

  // Language Form and Meaning formats
  | "GRAMMAR_CONTEXT_MCQ"       // Part 1: grammar in sentence context
  | "VOCAB_CONTEXT_MCQ"         // Part 2: word meaning / synonym from context

  // Reading formats
  | "READING_PASSAGE_MCQ";      // 7 passages × 6 questions (main idea, detail, inference, vocab)

// ─────────────────────────────────────────────────────────────────────────────
// 3. TASK (PART) SPECIFICATION INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface ToeflJuniorTask {
  /** Unique ID, e.g. "TJ_L_PART1", "TJ_LFM_GRAMMAR", "TJ_RC" */
  id: string;
  section: ToeflJuniorSection;
  skill: ToeflJuniorSkill;
  partNumber: number;
  name: string;
  format: ToeflJuniorItemFormat;
  /** Total scorable items in this part */
  itemCount: number;
  /** IRT b-parameter (difficulty) range for this part */
  difficultyRange: [number, number];
  /** Approx. word count of stimulus/passage */
  stimulusWordRange?: [number, number];
  /** Number of questions per stimulus/passage */
  questionsPerStimulus: number;
  /** Options per question (always 4 for TOEFL Junior) */
  optionCount: 4;
  /** What the student must do */
  candidateTask: string;
  /** What the stimulus looks like */
  stimulusDescription: string;
  /** Guidance for generating effective distractors */
  distractorGuidance: string;
  /** Language/content constraints for this part */
  languageConstraints: string;
  /** Question types that appear in this part */
  questionTypes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ALL TOEFL JUNIOR TASKS
// ─────────────────────────────────────────────────────────────────────────────

export const TOEFL_JUNIOR_TASKS: ToeflJuniorTask[] = [

  // ── Section 1: Listening Comprehension ─────────────────────────────────────

  {
    id: "TJ_L_PART1",
    section: "LISTENING",
    skill: "LISTENING",
    partNumber: 1,
    name: "Listening Part 1 — Short Conversations",
    format: "SHORT_CONVERSATION_MCQ",
    itemCount: 18,
    difficultyRange: [-1.5, 0.5],
    stimulusWordRange: [50, 120],
    questionsPerStimulus: 1,
    optionCount: 4,
    candidateTask: "Listen to a short conversation between two people and answer a question about it.",
    stimulusDescription:
      "Two-speaker exchange of 4–8 turns set in everyday school contexts " +
      "(classroom, cafeteria, hallway, library, gym, after-school activities). " +
      "Natural speech with contracted forms, hesitations, and informal vocabulary. " +
      "Each conversation is completely independent.",
    distractorGuidance:
      "Distractors must reference words/ideas from the audio but be wrong in meaning, " +
      "time, person, location, or quantity. At least one distractor must be a near-miss " +
      "that tests understanding of the full exchange rather than a single phrase.",
    languageConstraints:
      "Vocabulary at A2–B1 level. No idioms opaque to non-native speakers aged 11–15. " +
      "Both speakers speak at natural (not slow) pace. Common school topics only.",
    questionTypes: [
      "Main idea / topic",
      "Detail / factual",
      "Inference (what does the speaker imply?)",
      "Purpose (why does Speaker A say…?)",
      "Function (what does the speaker mean by…?)",
    ],
  },

  {
    id: "TJ_L_PART2",
    section: "LISTENING",
    skill: "LISTENING",
    partNumber: 2,
    name: "Listening Part 2 — Short Talks",
    format: "SHORT_TALK_MCQ",
    itemCount: 12,
    difficultyRange: [-1.0, 1.0],
    stimulusWordRange: [100, 200],
    questionsPerStimulus: 3,
    optionCount: 4,
    candidateTask:
      "Listen to a short talk by one speaker and answer three questions about it.",
    stimulusDescription:
      "Single-speaker monologue: school announcements, teacher instructions, " +
      "recorded audio guides, short presentations, or news-style reports. " +
      "Not academically dense. Each set has one talk + 3 questions.",
    distractorGuidance:
      "Distractors should reflect plausible but incorrect details (wrong day/number/ " +
      "person). One distractor per item should require full talk comprehension " +
      "(not answerable from a single sentence).",
    languageConstraints:
      "B1 vocabulary. One speaker only. No background noise in transcript. " +
      "Monologue length ~100–200 words. Everyday school/community topics.",
    questionTypes: [
      "Main idea / primary purpose",
      "Detail / factual",
      "Inference",
      "Speaker attitude or tone",
    ],
  },

  {
    id: "TJ_L_PART3",
    section: "LISTENING",
    skill: "LISTENING",
    partNumber: 3,
    name: "Listening Part 3 — Academic Discussions",
    format: "ACADEMIC_DISCUSSION_MCQ",
    itemCount: 12,
    difficultyRange: [-0.5, 1.5],
    stimulusWordRange: [200, 380],
    questionsPerStimulus: 3,
    optionCount: 4,
    candidateTask:
      "Listen to a classroom discussion or mini-lecture and answer three questions about it.",
    stimulusDescription:
      "Classroom setting: teacher + 1–2 students. Topics drawn from school subjects " +
      "(science, social studies, history, geography, health, arts). " +
      "Information presented includes explanation, cause-effect, comparison, classification. " +
      "Contains natural academic language: hedging, enumeration, summarising.",
    distractorGuidance:
      "At least one question per set tests inference or speaker purpose. " +
      "Vocabulary-in-context questions use a word from the audio in a question stem. " +
      "Distractors must be plausible misunderstandings of the academic content.",
    languageConstraints:
      "B1–B2 level academic vocabulary. Classroom-appropriate topics for ages 11–15. " +
      "No highly specialised jargon. Transcript length 200–380 words.",
    questionTypes: [
      "Main idea / gist",
      "Detail / factual (from lecture or discussion)",
      "Inference / implied meaning",
      "Vocabulary-in-context",
      "Speaker purpose / function",
      "Organisation / structure of talk",
    ],
  },

  // ── Section 2: Language Form and Meaning ────────────────────────────────────

  {
    id: "TJ_LFM_GRAMMAR",
    section: "LANG_FORM_MEANING",
    skill: "GRAMMAR",
    partNumber: 1,
    name: "Language Form — Grammar in Context",
    format: "GRAMMAR_CONTEXT_MCQ",
    itemCount: 21,
    difficultyRange: [-1.5, 1.5],
    stimulusWordRange: [20, 60],
    questionsPerStimulus: 1,
    optionCount: 4,
    candidateTask:
      "Choose the word or phrase that best completes the sentence.",
    stimulusDescription:
      "Single sentence or very short paragraph (2–3 sentences) with one blank. " +
      "The blank tests a specific grammatical form. " +
      "Context is always sufficient to determine the correct form.",
    distractorGuidance:
      "All 4 options must use the same lexical base but differ in form " +
      "(tense, aspect, voice, number, mood). Distractors must represent " +
      "systematic learner errors for the specific grammar point being tested.",
    languageConstraints:
      "B1–B2 grammar. No trick vocabulary. Sentence context is natural and clear. " +
      "Topics: everyday school life, science facts, social studies, sports, arts.",
    questionTypes: [
      "Verb tense / aspect (simple, perfect, continuous, perfect continuous)",
      "Subject-verb agreement",
      "Articles (a/an/the/zero article)",
      "Prepositions (time, place, direction)",
      "Modal verbs (can/could/should/must/might/would)",
      "Gerunds and infinitives",
      "Conditional sentences (0/1st/2nd/3rd)",
      "Passive voice",
      "Relative clauses (who/which/that/whose)",
      "Reported speech",
      "Comparatives and superlatives",
      "Conjunctions and connectors (although/whereas/unless/provided that)",
      "Noun/adjective/adverb forms in context",
    ],
  },

  {
    id: "TJ_LFM_VOCAB",
    section: "LANG_FORM_MEANING",
    skill: "VOCABULARY",
    partNumber: 2,
    name: "Meaning in Context — Vocabulary",
    format: "VOCAB_CONTEXT_MCQ",
    itemCount: 21,
    difficultyRange: [-1.5, 1.5],
    stimulusWordRange: [30, 100],
    questionsPerStimulus: 1,
    optionCount: 4,
    candidateTask:
      "Choose the word or phrase that best matches the meaning of the underlined/highlighted word or that best completes the sentence.",
    stimulusDescription:
      "Sentence or short 2–3 sentence context. Target word/phrase is underlined or " +
      "a blank is provided. Context must provide enough clues to determine meaning. " +
      "Items may test: synonym, definition, contextual meaning, or collocation.",
    distractorGuidance:
      "All options must be the same part of speech as the target word. " +
      "At least 2 distractors must be semantically plausible without full context. " +
      "One distractor should be a word that looks similar (form-based confusion).",
    languageConstraints:
      "Target vocabulary at B1–B2 level (academic and subject-specific terms). " +
      "Context sentences use only A2–B1 surrounding vocabulary. " +
      "No proper nouns as distractors. Topics: science, technology, school life, " +
      "nature, health, history, geography.",
    questionTypes: [
      "Synonym in context",
      "Definition from context (What does X mean in this passage?)",
      "Collocation (which word fits the blank?)",
      "Word with multiple meanings (which meaning is intended here?)",
      "Phrasal verb meaning",
      "Academic vocabulary (Tier 2 words: analyse, contribute, vary, significant…)",
    ],
  },

  // ── Section 3: Reading Comprehension ────────────────────────────────────────

  {
    id: "TJ_RC",
    section: "READING",
    skill: "READING",
    partNumber: 1,
    name: "Reading Comprehension — 7 Passages",
    format: "READING_PASSAGE_MCQ",
    itemCount: 42,
    difficultyRange: [-1.5, 1.5],
    stimulusWordRange: [200, 450],
    questionsPerStimulus: 6,
    optionCount: 4,
    candidateTask:
      "Read the passage and answer six questions about it.",
    stimulusDescription:
      "Seven passages covering a variety of genres and text types: " +
      "(1–2) Literary/narrative — short story excerpt, personal letter, or diary; " +
      "(2–3) Informational — science article, history, geography, health, social studies; " +
      "(1) Practical — email, notice, schedule, instructions, brochure; " +
      "(1) Mixed-genre or longer informational text. " +
      "Passage length: 200–450 words. Authentic-like style.",
    distractorGuidance:
      "Main-idea distractors: too narrow (only one detail), too broad, or distorted. " +
      "Detail distractors: plausible but incorrect facts drawn from the passage. " +
      "Inference distractors: logically possible but not supported by text. " +
      "Vocabulary distractors: all same part of speech, context-ignorant meanings.",
    languageConstraints:
      "Passages at B1–B2 reading level (Flesch-Kincaid ~60–75 for easier passages, " +
      "~50–65 for harder ones). Appropriate for ages 11–15. " +
      "No adult content, violence, religion, or controversial politics.",
    questionTypes: [
      "Main idea / primary purpose of passage",
      "Detail / factual (directly stated in text)",
      "Inference (implied, not directly stated)",
      "Vocabulary-in-context (as used in paragraph X, the word Y means…)",
      "Reference (what does the pronoun/noun phrase refer to?)",
      "Author's purpose / tone / attitude",
      "Text organisation / function of a paragraph",
      "Comparison / contrast across passages (rare)",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXAM METADATA
// ─────────────────────────────────────────────────────────────────────────────

export interface ToeflJuniorExamMeta {
  /** Short display name */
  shortName: string;
  /** Full official name */
  fullName: string;
  /** Publisher / test developer */
  developer: string;
  /** Primary CEFR range */
  cefrRange: [string, string]; // e.g. ["A2", "B2"]
  /** Score range per section */
  scoreRange: [number, number]; // [100, 300]
  /** Score range for combined total */
  totalScoreRange: [number, number]; // [300, 900]
  /** IRT theta range for item calibration */
  thetaRange: [number, number];
  /** Target age group */
  ageGroup: string;
  /** Grade level */
  gradeLevel: string;
  /** Total test time in minutes */
  totalTimeMinutes: number;
  /** Total number of scored items */
  totalItems: number;
  /** CEFR score bands */
  scoreBands: Array<{
    label: string;
    cefr: string;
    sectionScoreRange: [number, number];
  }>;
  /** Official topic domains */
  topicAreas: string[];
  /** Grammar syllabus (Language Form targets) */
  grammarSyllabus: string[];
  /** Academic vocabulary targets (Meaning in Context) */
  vocabularyFocus: string[];
  /** Reading text genres */
  readingGenres: string[];
}

export const TOEFL_JUNIOR_META: ToeflJuniorExamMeta = {
  shortName: "TOEFL Junior",
  fullName: "TOEFL Junior Standard",
  developer: "ETS (Educational Testing Service)",
  cefrRange: ["A2", "B2"],
  scoreRange: [100, 300],
  totalScoreRange: [300, 900],
  thetaRange: [-1.5, 1.5],
  ageGroup: "Ages 11–15 (middle school / lower secondary)",
  gradeLevel: "Grades 6–9 (US equivalent)",
  totalTimeMinutes: 115,
  totalItems: 126,

  scoreBands: [
    {
      label: "Beginning",
      cefr: "A2",
      sectionScoreRange: [100, 199],
    },
    {
      label: "Intermediate",
      cefr: "B1",
      sectionScoreRange: [200, 249],
    },
    {
      label: "High Intermediate",
      cefr: "B1+",
      sectionScoreRange: [225, 259],
    },
    {
      label: "Advanced",
      cefr: "B2",
      sectionScoreRange: [250, 300],
    },
  ],

  topicAreas: [
    "school life and activities",
    "family and friends",
    "science and technology",
    "health and physical education",
    "history and social studies",
    "geography and environment",
    "arts and music",
    "literature and stories",
    "sports and hobbies",
    "food and nutrition",
    "community and society",
    "nature and wildlife",
    "transport and travel",
    "future plans and careers",
    "media and communication",
  ],

  grammarSyllabus: [
    "simple present / present continuous / present perfect (simple and continuous)",
    "simple past / past continuous / past perfect (simple and continuous)",
    "future forms (will, going to, present continuous for arrangements, simple present for schedules)",
    "modal verbs (can/could/should/must/might/may/would/ought to/need to/have to)",
    "passive voice (all tenses)",
    "conditionals (zero, first, second, third, mixed)",
    "relative clauses (defining and non-defining: who/which/that/whose/where/when)",
    "reported speech (statements, questions, commands)",
    "gerunds and infinitives (as subject, after verbs/adjectives/prepositions)",
    "comparatives and superlatives (regular and irregular)",
    "articles (a/an/the/zero article — with abstract nouns, proper nouns, unique nouns)",
    "prepositions (time: in/on/at/by/until/since/for; place: in/on/at/over/under/between; movement: to/from/into/out of/through)",
    "conjunctions and connectors (although/even though/whereas/despite/however/therefore/as a result/provided that/unless/as long as)",
    "subject-verb agreement (complex subjects: either…or/neither…nor/collective nouns)",
    "noun clauses (what/that/whether/if as object of verb or preposition)",
    "participial phrases (present and past participle as modifier)",
    "ellipsis and substitution (so do I / neither can she)",
    "quantifiers (a few/few, a little/little, much/many/a lot of/plenty of/several/each/every/all/both/neither/either)",
    "word order in questions (embedded/indirect questions: Do you know where…?)",
  ],

  vocabularyFocus: [
    "Tier 2 academic words (analyse, compare, contribute, define, demonstrate, evaluate, identify, indicate, require, significant, vary)",
    "Science vocabulary (adapted for grades 6–9): organism, photosynthesis, hypothesis, experiment, observe, classify, reproduce, ecosystem, adaptation",
    "Social studies vocabulary: economy, government, democracy, migration, civilization, agriculture, trade, settlement",
    "Health/PE vocabulary: nutrition, calories, exercise, cardiovascular, immune system, balanced diet",
    "Geography vocabulary: climate, altitude, latitude, longitude, continent, peninsula, tributary, erosion",
    "Phrasal verbs (common B1–B2): carry out, find out, give up, look forward to, run out of, take part in, turn down",
    "Words with multiple meanings used in academic contexts",
    "Collocations with high-frequency academic verbs (make progress, solve a problem, draw a conclusion, conduct research)",
    "Prefixes and suffixes for derivation (re-/un-/dis- ; -tion/-ment/-ness/-ful/-less/-able/-ous/-ive)",
  ],

  readingGenres: [
    "personal letter / email",
    "diary entry",
    "fictional narrative / short story excerpt",
    "science article (school-level)",
    "history / social studies article",
    "geography / environment article",
    "health / PE informational text",
    "arts / music / culture article",
    "practical text (notice, schedule, brochure, instructions)",
    "biography / profile",
    "interview or Q&A format",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. SCORE BAND → CEFR → IRT THETA MAPPING
// ─────────────────────────────────────────────────────────────────────────────

export const TOEFL_JUNIOR_SCORE_TO_CEFR: Array<{
  scoreRange: [number, number];
  cefr: string;
  thetaRange: [number, number];
  descriptor: string;
}> = [
  {
    scoreRange: [100, 149],
    cefr: "A2",
    thetaRange: [-1.5, -0.8],
    descriptor:
      "Can understand frequently used expressions in familiar areas. " +
      "Needs clear, slow speech and simple written texts.",
  },
  {
    scoreRange: [150, 199],
    cefr: "A2+",
    thetaRange: [-0.8, -0.3],
    descriptor:
      "Can understand main points of short messages and straightforward texts " +
      "on familiar school-related topics.",
  },
  {
    scoreRange: [200, 224],
    cefr: "B1",
    thetaRange: [-0.3, 0.2],
    descriptor:
      "Can understand the main points of clear standard speech and texts on " +
      "familiar school subjects (science, history, arts).",
  },
  {
    scoreRange: [225, 259],
    cefr: "B1+",
    thetaRange: [0.2, 0.8],
    descriptor:
      "Can understand extended speech and read texts of moderate complexity " +
      "in academic subjects; identifies implicit meaning in familiar contexts.",
  },
  {
    scoreRange: [260, 300],
    cefr: "B2",
    thetaRange: [0.8, 1.5],
    descriptor:
      "Can understand extended speech and complex texts, including implicit " +
      "meaning. Handles academic language appropriate for middle school.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Get a task by its ID */
export function getToeflJuniorTask(id: string): ToeflJuniorTask | undefined {
  return TOEFL_JUNIOR_TASKS.find((t) => t.id === id);
}

/** Get all tasks for a given section */
export function getTasksForSection(
  section: ToeflJuniorSection
): ToeflJuniorTask[] {
  return TOEFL_JUNIOR_TASKS.filter((t) => t.section === section);
}

/** Convert a section-level score to CEFR */
export function scoreToCefr(score: number): string {
  for (const band of TOEFL_JUNIOR_SCORE_TO_CEFR) {
    if (score >= band.scoreRange[0] && score <= band.scoreRange[1]) {
      return band.cefr;
    }
  }
  return "B1";
}

/** Convert a CEFR level to the typical TOEFL Junior theta range */
export function cefrToThetaRange(cefr: string): [number, number] {
  const map: Record<string, [number, number]> = {
    A2: [-1.5, -0.8],
    "A2+": [-0.8, -0.3],
    B1: [-0.3, 0.2],
    "B1+": [0.2, 0.8],
    B2: [0.8, 1.5],
  };
  return map[cefr] ?? [-0.5, 0.5];
}

/** Get all question types across all TOEFL Junior tasks */
export function getAllQuestionTypes(): string[] {
  const set = new Set<string>();
  TOEFL_JUNIOR_TASKS.forEach((t) => t.questionTypes.forEach((q) => set.add(q)));
  return [...set];
}
