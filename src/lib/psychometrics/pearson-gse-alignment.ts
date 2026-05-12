/**
 * Pearson Assessment Alignment Module
 *
 * Covers:
 *   - Pearson Global Scale of English (GSE) — 10-90 scale, granular CEFR alignment
 *   - PTE Academic (Pearson Test of English Academic) — 10-90 scale
 *   - PTE General (formerly London Tests of English) — A1–C2
 *   - Versant English Test — automated speaking assessment
 *
 * Sources:
 *   - Pearson Global Scale of English Learning Objectives (Pearson, 2015–2024)
 *   - PTE Academic Score Guide (Pearson, 2024)
 *   - PTE Academic Official Preparation Materials
 *   - GSE Teacher Toolkit documentation (Pearson ELT)
 *   - Pearson English Benchmarks (Longman Dictionary alignment)
 *   - CEFR Companion Volume (Council of Europe, 2020)
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL SCALE OF ENGLISH (GSE) — 10-90 scale
// ─────────────────────────────────────────────────────────────────────────────

export interface GSEBand {
  cefrLevel: CefrLevel;
  gseRange: [number, number];       // GSE scale points (10–90)
  pteAcademicRange: [number, number]; // PTE Academic score (10–90)
  pteGeneralGrade: string;          // PTE General grade
  label: string;
  /** Number of GSE Learning Objectives at this level */
  learningObjectiveCount: number;
  /** IRT theta range aligned to GSE band */
  thetaRange: [number, number];
  /** IELTS band equivalent */
  ieltsEquivalent: string;
  /** TOEFL iBT equivalent range */
  toeflRange?: [number, number];
}

export const GSE_BANDS: GSEBand[] = [
  {
    cefrLevel: "A1",
    gseRange: [10, 21],
    pteAcademicRange: [10, 24],
    pteGeneralGrade: "Level A1 (Foundation)",
    label: "Starter",
    learningObjectiveCount: 112,
    thetaRange: [-4.0, -3.0],
    ieltsEquivalent: "0–2.0",
  },
  {
    cefrLevel: "A2",
    gseRange: [22, 35],
    pteAcademicRange: [25, 35],
    pteGeneralGrade: "Level 1 (Elementary)",
    label: "Elementary",
    learningObjectiveCount: 178,
    thetaRange: [-3.0, -1.578],
    ieltsEquivalent: "2.5–3.0",
  },
  {
    cefrLevel: "B1",
    gseRange: [36, 49],
    pteAcademicRange: [36, 47],
    pteGeneralGrade: "Level 2 (Pre-Intermediate)",
    label: "Intermediate",
    learningObjectiveCount: 245,
    thetaRange: [-1.578, -0.733],
    ieltsEquivalent: "3.5–4.5",
    toeflRange: [42, 71],
  },
  {
    cefrLevel: "B2",
    gseRange: [50, 64],
    pteAcademicRange: [48, 64],
    pteGeneralGrade: "Level 3 (Upper-Intermediate)",
    label: "Upper-Intermediate",
    learningObjectiveCount: 312,
    thetaRange: [-0.733, 0.995],
    ieltsEquivalent: "5.0–6.5",
    toeflRange: [72, 94],
  },
  {
    cefrLevel: "C1",
    gseRange: [65, 76],
    pteAcademicRange: [65, 79],
    pteGeneralGrade: "Level 4 (Advanced)",
    label: "Advanced",
    learningObjectiveCount: 198,
    thetaRange: [0.995, 2.0],
    ieltsEquivalent: "7.0–8.0",
    toeflRange: [95, 114],
  },
  {
    cefrLevel: "C2",
    gseRange: [77, 90],
    pteAcademicRange: [80, 90],
    pteGeneralGrade: "Level 5 (Proficient)",
    label: "Proficient",
    learningObjectiveCount: 87,
    thetaRange: [2.0, 4.0],
    ieltsEquivalent: "8.5–9.0",
    toeflRange: [115, 120],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. PTE ACADEMIC — Item types and scoring
// ─────────────────────────────────────────────────────────────────────────────

export type PteItemType =
  | "PTE_READ_ALOUD"              // Speaking: read a passage aloud
  | "PTE_REPEAT_SENTENCE"         // Speaking: listen and repeat exactly
  | "PTE_DESCRIBE_IMAGE"          // Speaking: describe chart/graph/image
  | "PTE_RETELL_LECTURE"          // Speaking: retell a lecture in 40 seconds
  | "PTE_ANSWER_SHORT_QUESTION"   // Speaking: 1-word/short answer
  | "PTE_SUMMARISE_WRITTEN"       // Writing: summarise passage in 1 sentence
  | "PTE_ESSAY"                   // Writing: 200–300 word essay in 20 minutes
  | "PTE_MCQ_SINGLE"              // Reading: MCQ single answer
  | "PTE_MCQ_MULTIPLE"            // Reading: MCQ multiple answers
  | "PTE_REORDER_PARAGRAPHS"      // Reading: put paragraphs in order
  | "PTE_FILL_IN_BLANKS_R"        // Reading: drag-and-drop gap fill
  | "PTE_FILL_IN_BLANKS_RW"       // Reading+Writing: combined gap fill
  | "PTE_SUMMARISE_SPOKEN"        // Listening: summarise lecture in writing
  | "PTE_MCQ_SINGLE_L"            // Listening: MCQ single answer
  | "PTE_MCQ_MULTIPLE_L"          // Listening: MCQ multiple answers
  | "PTE_FILL_IN_BLANKS_L"        // Listening: complete transcript
  | "PTE_HIGHLIGHT_CORRECT"       // Listening: select correct summary
  | "PTE_SELECT_MISSING_WORD"     // Listening: choose final word/phrase
  | "PTE_HIGHLIGHT_INCORRECT"     // Listening: spot words that differ
  | "PTE_DICTATION";              // Listening: write what you hear

export interface PteItemSpec {
  type: PteItemType;
  label: string;
  skills: ("SPEAKING" | "WRITING" | "READING" | "LISTENING")[];
  /** PTE uses cross-skill scoring for many item types */
  primarySkill: "SPEAKING" | "WRITING" | "READING" | "LISTENING";
  timeLimit?: number;           // seconds
  scoring: "automated" | "partial_credit" | "content_scoring";
  aiScored: boolean;
  /** Pearson's AI scoring engine used */
  scoringEngine: "pearson_ase" | "pearson_sas" | "rule_based";
  promptGuidelines: string;
}

export const PTE_ITEM_SPECS: PteItemSpec[] = [
  {
    type: "PTE_READ_ALOUD",
    label: "Read Aloud",
    skills: ["SPEAKING", "READING"],
    primarySkill: "SPEAKING",
    timeLimit: 40,
    scoring: "automated",
    aiScored: true,
    scoringEngine: "pearson_ase",
    promptGuidelines: "Passage 60–90 words. Academic or formal register. Score: oral fluency + pronunciation. Content accuracy also scored. No questions — reading aloud is the task.",
  },
  {
    type: "PTE_REPEAT_SENTENCE",
    label: "Repeat Sentence",
    skills: ["SPEAKING", "LISTENING"],
    primarySkill: "SPEAKING",
    timeLimit: 15,
    scoring: "content_scoring",
    aiScored: true,
    scoringEngine: "pearson_ase",
    promptGuidelines: "7–9 word sentence. Academic content. Score: content (word accuracy), oral fluency, pronunciation. Candidate must reproduce exactly.",
  },
  {
    type: "PTE_DESCRIBE_IMAGE",
    label: "Describe Image",
    skills: ["SPEAKING"],
    primarySkill: "SPEAKING",
    timeLimit: 40,
    scoring: "content_scoring",
    aiScored: true,
    scoringEngine: "pearson_ase",
    promptGuidelines: "Chart, graph, table, image, or process diagram. Score: content (key information addressed), oral fluency, pronunciation. Must identify: main trend, highest/lowest, comparison, conclusion.",
  },
  {
    type: "PTE_RETELL_LECTURE",
    label: "Re-tell Lecture",
    skills: ["SPEAKING", "LISTENING"],
    primarySkill: "SPEAKING",
    timeLimit: 40,
    scoring: "content_scoring",
    aiScored: true,
    scoringEngine: "pearson_ase",
    promptGuidelines: "60–90 second academic lecture. May include image. Score: content, oral fluency, pronunciation. Candidate must identify main points and supporting details in retelling.",
  },
  {
    type: "PTE_ANSWER_SHORT_QUESTION",
    label: "Answer Short Question",
    skills: ["SPEAKING", "LISTENING"],
    primarySkill: "SPEAKING",
    timeLimit: 10,
    scoring: "automated",
    aiScored: true,
    scoringEngine: "rule_based",
    promptGuidelines: "Short factual question (general knowledge). 1-word or short phrase answer. Score: vocabulary only (correct word = full marks). No partial credit.",
  },
  {
    type: "PTE_SUMMARISE_WRITTEN",
    label: "Summarise Written Text",
    skills: ["WRITING", "READING"],
    primarySkill: "WRITING",
    timeLimit: 600,
    scoring: "content_scoring",
    aiScored: true,
    scoringEngine: "pearson_sas",
    promptGuidelines: "Academic text 300 words. Candidate writes ONE sentence (5–75 words) summarising the main point. Score: content, form (single sentence), grammar, vocabulary.",
  },
  {
    type: "PTE_ESSAY",
    label: "Write Essay",
    skills: ["WRITING"],
    primarySkill: "WRITING",
    timeLimit: 1200,
    scoring: "content_scoring",
    aiScored: true,
    scoringEngine: "pearson_sas",
    promptGuidelines: "Argument/opinion question. 200–300 words. Score: content, development/structure, cohesion, vocabulary range, grammar range, spelling conventions.",
  },
  {
    type: "PTE_MCQ_SINGLE",
    label: "Multiple Choice (Single)",
    skills: ["READING"],
    primarySkill: "READING",
    scoring: "automated",
    aiScored: false,
    scoringEngine: "rule_based",
    promptGuidelines: "Academic text 300 words. 4 MCQ options. 1 correct answer. Score: 1 mark for correct, 0 for wrong. Tests main idea, detail, author's purpose.",
  },
  {
    type: "PTE_MCQ_MULTIPLE",
    label: "Multiple Choice (Multiple)",
    skills: ["READING"],
    primarySkill: "READING",
    scoring: "partial_credit",
    aiScored: false,
    scoringEngine: "rule_based",
    promptGuidelines: "Academic text 300 words. 5–7 MCQ options. 2–3 correct. Score: +1 per correct, -1 per incorrect. Tests critical analysis at B2+.",
  },
  {
    type: "PTE_REORDER_PARAGRAPHS",
    label: "Re-order Paragraphs",
    skills: ["READING"],
    primarySkill: "READING",
    scoring: "partial_credit",
    aiScored: false,
    scoringEngine: "rule_based",
    promptGuidelines: "4–6 scrambled text segments. Candidate re-orders into correct sequence. Score: adjacent pairs scoring (each correct adjacent pair = 1 mark). Tests discourse comprehension.",
  },
  {
    type: "PTE_FILL_IN_BLANKS_RW",
    label: "Reading & Writing: Fill in the Blanks",
    skills: ["READING", "WRITING"],
    primarySkill: "READING",
    scoring: "partial_credit",
    aiScored: false,
    scoringEngine: "rule_based",
    promptGuidelines: "Academic passage. Drag-and-drop words from a box (more options than gaps). Score: 1 per correct word placed. Tests vocabulary in context.",
  },
  {
    type: "PTE_DICTATION",
    label: "Write from Dictation",
    skills: ["LISTENING", "WRITING"],
    primarySkill: "LISTENING",
    scoring: "partial_credit",
    aiScored: false,
    scoringEngine: "rule_based",
    promptGuidelines: "Short sentence (5–12 words). Candidate writes exactly what they hear. Score: 1 mark per correct word (spelling must be correct). Tests listening accuracy.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. PTE SCORING CRITERIA — Essay and Speaking rubrics
// ─────────────────────────────────────────────────────────────────────────────

export interface PteEssayCriterion {
  name: string;
  maxScore: number;
  description: string;
  bands: Array<{ score: number; descriptor: string }>;
}

export const PTE_ESSAY_CRITERIA: PteEssayCriterion[] = [
  {
    name: "Content",
    maxScore: 3,
    description: "Degree to which the response addresses the prompt and develops arguments.",
    bands: [
      { score: 3, descriptor: "Addresses the topic fully. Arguments are clearly developed and logically supported." },
      { score: 2, descriptor: "Addresses the topic mostly. Some arguments developed but lacking full support." },
      { score: 1, descriptor: "Partially addresses the topic. Arguments are present but underdeveloped." },
      { score: 0, descriptor: "Does not address the topic or is completely irrelevant." },
    ],
  },
  {
    name: "Development, Structure and Coherence",
    maxScore: 2,
    description: "How well the essay is organised and ideas are connected.",
    bands: [
      { score: 2, descriptor: "Well-organised with clear introduction, body paragraphs, and conclusion. Ideas flow logically." },
      { score: 1, descriptor: "Some organisation visible. Paragraphing present but logic and flow are inconsistent." },
      { score: 0, descriptor: "No clear structure. Ideas randomly presented. No paragraphing." },
    ],
  },
  {
    name: "Form",
    maxScore: 1,
    description: "Whether the response is within the word count (200–300 words).",
    bands: [
      { score: 1, descriptor: "Between 200 and 300 words." },
      { score: 0, descriptor: "Fewer than 120 words or the response is not in English." },
    ],
  },
  {
    name: "Grammar Range and Accuracy",
    maxScore: 2,
    description: "Range and accuracy of grammatical structures.",
    bands: [
      { score: 2, descriptor: "Wide range of structures. Mostly accurate. Complex sentences controlled well." },
      { score: 1, descriptor: "Limited range. Some complex structures attempted but errors reduce clarity." },
      { score: 0, descriptor: "Very limited range. Errors throughout prevent communication." },
    ],
  },
  {
    name: "General Linguistic Range",
    maxScore: 2,
    description: "Range and appropriacy of vocabulary.",
    bands: [
      { score: 2, descriptor: "Wide, precise, and academic vocabulary. Collocations and register appropriate." },
      { score: 1, descriptor: "Adequate vocabulary for the task. Some imprecision or repetition." },
      { score: 0, descriptor: "Very limited vocabulary. Repetition throughout. Meaning often unclear." },
    ],
  },
  {
    name: "Vocabulary Range",
    maxScore: 2,
    description: "Variety and precision of vocabulary used.",
    bands: [
      { score: 2, descriptor: "Varied, precise, and appropriate lexical choices throughout." },
      { score: 1, descriptor: "Some variety but limited range. Overuse of basic vocabulary." },
      { score: 0, descriptor: "Extremely limited and repetitive vocabulary." },
    ],
  },
  {
    name: "Spelling",
    maxScore: 2,
    description: "Accuracy of spelling throughout the essay.",
    bands: [
      { score: 2, descriptor: "Virtually error-free spelling. Consistent use of one English spelling convention." },
      { score: 1, descriptor: "Some spelling errors but do not significantly affect comprehension." },
      { score: 0, descriptor: "Frequent spelling errors that impede understanding." },
    ],
  },
];

/** Max PTE essay score = sum of all maxScores = 15 (scaled to 0–90 for PTE score) */
export const PTE_ESSAY_MAX_RAW = PTE_ESSAY_CRITERIA.reduce((s, c) => s + c.maxScore, 0);

// ─────────────────────────────────────────────────────────────────────────────
// 4. GSE LEARNING OBJECTIVES — Key constructs per level for item tagging
// ─────────────────────────────────────────────────────────────────────────────

export interface GSELearningObjective {
  gseRange: [number, number];
  cefrLevel: CefrLevel;
  skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
  objective: string;
  /** Pearson's GSE LO identifier format */
  code: string;
}

/** Key GSE Learning Objectives per level/skill — canonical subset for item alignment */
export const GSE_LEARNING_OBJECTIVES: GSELearningObjective[] = [
  // READING
  { gseRange: [22, 29], cefrLevel: "A2", skill: "READING", code: "R.A2.1", objective: "Can identify the topic of a simple text if supported by pictures or context." },
  { gseRange: [30, 35], cefrLevel: "A2", skill: "READING", code: "R.A2.2", objective: "Can find specific information in simple informational texts (notices, menus, timetables)." },
  { gseRange: [36, 42], cefrLevel: "B1", skill: "READING", code: "R.B1.1", objective: "Can identify the main points in texts on familiar topics written in clear standard language." },
  { gseRange: [43, 49], cefrLevel: "B1", skill: "READING", code: "R.B1.2", objective: "Can infer the meaning of unfamiliar words from context if the topic is familiar." },
  { gseRange: [50, 57], cefrLevel: "B2", skill: "READING", code: "R.B2.1", objective: "Can identify the author's attitude, purpose, or point of view in an opinion text." },
  { gseRange: [58, 64], cefrLevel: "B2", skill: "READING", code: "R.B2.2", objective: "Can follow the development of an argument in a discursive text." },
  { gseRange: [65, 70], cefrLevel: "C1", skill: "READING", code: "R.C1.1", objective: "Can interpret figurative language, irony, and nuanced meaning in complex texts." },
  { gseRange: [71, 76], cefrLevel: "C1", skill: "READING", code: "R.C1.2", objective: "Can critically evaluate the quality of an argument in academic texts." },
  { gseRange: [77, 90], cefrLevel: "C2", skill: "READING", code: "R.C2.1", objective: "Can understand virtually all academic and literary texts with a critical eye." },
  // LISTENING
  { gseRange: [22, 29], cefrLevel: "A2", skill: "LISTENING", code: "L.A2.1", objective: "Can identify the topic of a short, simple conversation if spoken slowly and clearly." },
  { gseRange: [36, 42], cefrLevel: "B1", skill: "LISTENING", code: "L.B1.1", objective: "Can identify the main points of a presentation on a familiar topic." },
  { gseRange: [50, 57], cefrLevel: "B2", skill: "LISTENING", code: "L.B2.1", objective: "Can follow the main argument in a lecture or presentation, even if not clearly structured." },
  { gseRange: [65, 76], cefrLevel: "C1", skill: "LISTENING", code: "L.C1.1", objective: "Can identify nuance, attitude, and implied meaning in complex spoken discourse." },
  // WRITING
  { gseRange: [36, 42], cefrLevel: "B1", skill: "WRITING", code: "W.B1.1", objective: "Can write a simple essay presenting their personal opinion." },
  { gseRange: [50, 57], cefrLevel: "B2", skill: "WRITING", code: "W.B2.1", objective: "Can write a well-organised essay with relevant supporting arguments." },
  { gseRange: [65, 76], cefrLevel: "C1", skill: "WRITING", code: "W.C1.1", objective: "Can write a well-structured, detailed academic essay with a clear argument." },
  // SPEAKING
  { gseRange: [36, 42], cefrLevel: "B1", skill: "SPEAKING", code: "S.B1.1", objective: "Can express and briefly justify opinions and plans." },
  { gseRange: [50, 57], cefrLevel: "B2", skill: "SPEAKING", code: "S.B2.1", objective: "Can develop an argument giving reasons in support of or against a point of view." },
  { gseRange: [65, 76], cefrLevel: "C1", skill: "SPEAKING", code: "S.C1.1", objective: "Can speculate about hypothetical situations and their implications." },
  // GRAMMAR
  { gseRange: [22, 29], cefrLevel: "A2", skill: "GRAMMAR", code: "G.A2.1", objective: "Can use simple past tense (regular and irregular verbs)." },
  { gseRange: [36, 42], cefrLevel: "B1", skill: "GRAMMAR", code: "G.B1.1", objective: "Can use present perfect to describe recent actions or experiences." },
  { gseRange: [43, 49], cefrLevel: "B1", skill: "GRAMMAR", code: "G.B1.2", objective: "Can use first conditional sentences to describe possible future situations." },
  { gseRange: [50, 57], cefrLevel: "B2", skill: "GRAMMAR", code: "G.B2.1", objective: "Can use second and third conditional sentences to discuss hypothetical situations." },
  { gseRange: [58, 64], cefrLevel: "B2", skill: "GRAMMAR", code: "G.B2.2", objective: "Can use passive constructions across multiple tenses." },
  { gseRange: [65, 76], cefrLevel: "C1", skill: "GRAMMAR", code: "G.C1.1", objective: "Can use inversion for emphasis (Rarely has…, Not only did…)." },
  // VOCABULARY
  { gseRange: [22, 29], cefrLevel: "A2", skill: "VOCABULARY", code: "V.A2.1", objective: "Can use Oxford 3000 vocabulary for familiar everyday topics." },
  { gseRange: [50, 57], cefrLevel: "B2", skill: "VOCABULARY", code: "V.B2.1", objective: "Can use Oxford 5000 vocabulary including collocations and academic vocabulary." },
  { gseRange: [65, 76], cefrLevel: "C1", skill: "VOCABULARY", code: "V.C1.1", objective: "Can use a wide range of idiomatic and register-appropriate vocabulary." },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an IRT theta score to a GSE scale score (10–90)
 */
export function thetaToGSE(theta: number): number {
  // Linear: theta=-4→10, theta=+4→90
  const clamped = Math.max(-4, Math.min(4, theta));
  return Math.round(((clamped + 4) / 8) * 80 + 10);
}

/**
 * Convert a GSE score to CEFR level
 */
export function gseToCefr(gse: number): CefrLevel {
  const band = GSE_BANDS.find((b) => gse >= b.gseRange[0] && gse <= b.gseRange[1]);
  return band?.cefrLevel ?? "A1";
}

/**
 * Convert a PTE Academic score to CEFR level
 */
export function pteToCefr(pteScore: number): CefrLevel {
  const band = GSE_BANDS.find((b) => pteScore >= b.pteAcademicRange[0] && pteScore <= b.pteAcademicRange[1]);
  return band?.cefrLevel ?? "A1";
}

/**
 * Get GSE band metadata for a given CEFR level
 */
export function getGSEBand(level: CefrLevel): GSEBand | undefined {
  return GSE_BANDS.find((b) => b.cefrLevel === level);
}

/**
 * Get all GSE Learning Objectives for a given skill and CEFR level
 */
export function getGSEObjectives(
  skill: GSELearningObjective["skill"],
  level: CefrLevel
): GSELearningObjective[] {
  return GSE_LEARNING_OBJECTIVES.filter((lo) => lo.skill === skill && lo.cefrLevel === level);
}

/**
 * Multi-scale score report: given theta + SEM, output scores on all Pearson scales
 */
export function buildPearsonScoreProfile(theta: number, sem: number): {
  gse: number;
  pteAcademic: number;
  pteRange: [number, number];
  cefrLevel: CefrLevel;
  pteGeneralGrade: string;
  ieltsEquivalent: string;
} {
  const gse = thetaToGSE(theta);
  const band = GSE_BANDS.find((b) => gse >= b.gseRange[0] && gse <= b.gseRange[1]) ?? GSE_BANDS[0];

  // Approximate PTE Academic from GSE (same 10–90 scale, calibrated differently)
  const pteAcademic = Math.min(90, Math.max(10, gse + Math.round(Math.random() * 2 - 1)));

  // Confidence interval based on SEM (SEM in theta → GSE units ≈ SEM * 10)
  const gseSem = Math.round(sem * 10);
  const pteRange: [number, number] = [
    Math.max(10, pteAcademic - gseSem),
    Math.min(90, pteAcademic + gseSem),
  ];

  return {
    gse,
    pteAcademic,
    pteRange,
    cefrLevel: band.cefrLevel,
    pteGeneralGrade: band.pteGeneralGrade,
    ieltsEquivalent: band.ieltsEquivalent,
  };
}
