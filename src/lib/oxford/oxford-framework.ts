/**
 * Oxford Test of English (OTE) & Oxford Placement Test (OPT) Framework
 *
 * Single source of truth for Oxford University Press assessment standards.
 *
 * Covers:
 *   - Oxford Test of English (OTE) — A2 to C1, CEFR-aligned, adaptive
 *   - Oxford Test of English B (OTE-B) — B1 to B2 (Academic/General)
 *   - Oxford Online Placement Test (OOPT) — A1 to C2 adaptive
 *   - Oxford Brookes English Language Requirements
 *
 * Sources:
 *   - OTE Handbook for Test Takers (Oxford University Press, 2023)
 *   - OTE Score Interpretation Guide (Oxford University Press, 2024)
 *   - Oxford Placement Test 2 Technical Manual (OUP, 2022)
 *   - CEFR Companion Volume (Council of Europe, 2020)
 *   - Oxford 3000™ and Oxford 5000™ word lists
 *   - Academic Word List (Coxhead, 2000) — used in OTE-B Academic
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. TEST IDENTIFIERS
// ─────────────────────────────────────────────────────────────────────────────

export type OxfordTest =
  | "OTE"       // Oxford Test of English (A2–C1)
  | "OTE_B"     // Oxford Test of English B (B1–B2, academic focus)
  | "OOPT"      // Oxford Online Placement Test (A1–C2, adaptive)
  | "OPT2";     // Oxford Placement Test 2 (A1–C1, paper-based)

export type OxfordSkill = "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "USE_OF_ENGLISH";

// ─────────────────────────────────────────────────────────────────────────────
// 2. OXFORD SCALE — OTE uses 0–160 points mapped to CEFR
// ─────────────────────────────────────────────────────────────────────────────

export interface OxfordScoreBand {
  cefrLevel: CefrLevel;
  label: string;
  oteScoreRange: [number, number];  // OTE 0–160 scale
  ooptScoreRange: [number, number]; // OOPT 0–120 scale
  /** Oxford 3000 words required at this level */
  vocabularyTarget: number;
  /** Minimum skill score to receive a certificate at this level */
  minimumSkillScore: number;
  /** Can-Do summary from Oxford OTE descriptors */
  canDoSummary: string;
}

export const OXFORD_SCORE_BANDS: OxfordScoreBand[] = [
  {
    cefrLevel: "A1",
    label: "Beginner",
    oteScoreRange: [0, 20],
    ooptScoreRange: [0, 15],
    vocabularyTarget: 500,
    minimumSkillScore: 0,
    canDoSummary: "Can understand and use familiar everyday expressions. Can introduce themselves and ask/answer basic personal questions.",
  },
  {
    cefrLevel: "A2",
    label: "Elementary",
    oteScoreRange: [21, 40],
    ooptScoreRange: [16, 35],
    vocabularyTarget: 1500,
    minimumSkillScore: 20,
    canDoSummary: "Can understand sentences about familiar topics. Can communicate in simple, routine tasks requiring direct exchange of information.",
  },
  {
    cefrLevel: "B1",
    label: "Pre-Intermediate / Intermediate",
    oteScoreRange: [41, 80],
    ooptScoreRange: [36, 60],
    vocabularyTarget: 3000,
    minimumSkillScore: 41,
    canDoSummary: "Can understand main points of clear standard input on familiar topics. Can deal with most situations likely to arise while travelling.",
  },
  {
    cefrLevel: "B2",
    label: "Upper-Intermediate",
    oteScoreRange: [81, 110],
    ooptScoreRange: [61, 85],
    vocabularyTarget: 5000,
    minimumSkillScore: 81,
    canDoSummary: "Can understand the main ideas of complex text on concrete and abstract topics. Can produce clear, detailed text on a wide range of subjects.",
  },
  {
    cefrLevel: "C1",
    label: "Advanced",
    oteScoreRange: [111, 140],
    ooptScoreRange: [86, 105],
    vocabularyTarget: 7500,
    minimumSkillScore: 111,
    canDoSummary: "Can understand a wide range of demanding, longer texts. Can express ideas fluently and spontaneously without much obvious searching for expressions.",
  },
  {
    cefrLevel: "C2",
    label: "Proficiency",
    oteScoreRange: [141, 160],
    ooptScoreRange: [106, 120],
    vocabularyTarget: 10000,
    minimumSkillScore: 141,
    canDoSummary: "Can understand with ease virtually everything heard or read. Can express themselves very fluently, precisely, and spontaneously.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. OTE TASK TYPE CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

export type OxfordItemFormat =
  | "OTE_READING_MCQ"              // 4-option reading comprehension
  | "OTE_READING_GAP_FILL"         // Open gap-fill in a passage
  | "OTE_READING_MATCHING"         // Match sentences/headings
  | "OTE_LISTENING_MCQ"            // 3-option listening MCQ
  | "OTE_LISTENING_GAP"            // Dictation/note-taking gap fill
  | "OTE_WRITING_EMAIL"            // Formal/informal email (B1+)
  | "OTE_WRITING_ESSAY"            // Opinion/discursive essay (B2+)
  | "OTE_SPEAKING_MONOLOGUE"       // Photo description + question (A2+)
  | "OTE_SPEAKING_INTERVIEW"       // Answer personal/opinion questions
  | "OTE_UOE_MCQ"                  // Use of English MCQ (grammar/vocab)
  | "OTE_UOE_WORD_FORM"            // Word formation
  | "OTE_UOE_ERROR_CORRECTION"     // Identify and correct errors
  | "OOPT_ADAPTIVE_GRAMMAR"        // OOPT adaptive grammar item
  | "OOPT_ADAPTIVE_READING";       // OOPT adaptive reading item

export interface OxfordTask {
  id: string;
  test: OxfordTest;
  skill: OxfordSkill;
  format: OxfordItemFormat;
  cefrLevels: CefrLevel[];          // Range of levels tested
  itemCount: number;
  timeMinutes: number;
  scoring: "dichotomous" | "partial" | "holistic_4_criteria" | "holistic_5_criteria";
  candidateTask: string;
  stimulusDescription: string;
  assessmentFocus: string;
}

export const OXFORD_TASKS: OxfordTask[] = [
  // ── OTE READING ──────────────────────────────────────────────────────────
  {
    id: "OTE_R_PART1",
    test: "OTE",
    skill: "READING",
    format: "OTE_READING_MCQ",
    cefrLevels: ["A2", "B1"],
    itemCount: 5,
    timeMinutes: 10,
    scoring: "dichotomous",
    candidateTask: "Read the text and choose the best answer (A, B, C or D) for each question.",
    stimulusDescription: "Short informational or descriptive text (200–300 words). 5 four-option comprehension questions.",
    assessmentFocus: "Global comprehension, specific detail retrieval, lexical inference.",
  },
  {
    id: "OTE_R_PART2",
    test: "OTE",
    skill: "READING",
    format: "OTE_READING_GAP_FILL",
    cefrLevels: ["B1", "B2"],
    itemCount: 6,
    timeMinutes: 10,
    scoring: "dichotomous",
    candidateTask: "Read the article. Choose the correct word or phrase to fill each gap.",
    stimulusDescription: "Magazine-style article (300–400 words) with 6 lexical/grammatical gaps (3 options each).",
    assessmentFocus: "Vocabulary in context, grammatical cohesion, collocation.",
  },
  {
    id: "OTE_R_PART3",
    test: "OTE",
    skill: "READING",
    format: "OTE_READING_MATCHING",
    cefrLevels: ["B2", "C1"],
    itemCount: 7,
    timeMinutes: 12,
    scoring: "dichotomous",
    candidateTask: "Match each paragraph heading to the correct section of the text.",
    stimulusDescription: "Long journalistic or academic text (600–800 words) divided into 7 sections. 8 heading options (1 extra).",
    assessmentFocus: "Paragraph gist, text organisation, inference of main point per section.",
  },
  // ── OTE LISTENING ─────────────────────────────────────────────────────────
  {
    id: "OTE_L_PART1",
    test: "OTE",
    skill: "LISTENING",
    format: "OTE_LISTENING_MCQ",
    cefrLevels: ["A2", "B1"],
    itemCount: 5,
    timeMinutes: 8,
    scoring: "dichotomous",
    candidateTask: "Listen and choose the best answer (A, B or C).",
    stimulusDescription: "Five short monologues or dialogues (30–60 seconds each). One 3-option question per extract.",
    assessmentFocus: "Specific information, speaker purpose, attitude in everyday spoken English.",
  },
  {
    id: "OTE_L_PART2",
    test: "OTE",
    skill: "LISTENING",
    format: "OTE_LISTENING_GAP",
    cefrLevels: ["B1", "B2"],
    itemCount: 6,
    timeMinutes: 10,
    scoring: "dichotomous",
    candidateTask: "Listen to the recording and write the missing words to complete the notes.",
    stimulusDescription: "Monologue (lecture, announcement, or interview) 2–3 minutes. 6 single-word or short phrase gaps.",
    assessmentFocus: "Detailed listening comprehension, note-taking, factual retrieval.",
  },
  {
    id: "OTE_L_PART3",
    test: "OTE",
    skill: "LISTENING",
    format: "OTE_LISTENING_MCQ",
    cefrLevels: ["B2", "C1"],
    itemCount: 6,
    timeMinutes: 12,
    scoring: "dichotomous",
    candidateTask: "Listen to the discussion and answer the questions (A, B, C or D).",
    stimulusDescription: "Longer discussion or interview (4–5 minutes). 6 four-option questions on opinion and implication.",
    assessmentFocus: "Opinion, attitude, implied meaning in extended spoken discourse.",
  },
  // ── OTE WRITING ───────────────────────────────────────────────────────────
  {
    id: "OTE_W_PART1",
    test: "OTE",
    skill: "WRITING",
    format: "OTE_WRITING_EMAIL",
    cefrLevels: ["A2", "B1"],
    itemCount: 1,
    timeMinutes: 20,
    scoring: "holistic_4_criteria",
    candidateTask: "Write an email of 100–150 words responding to the given situation.",
    stimulusDescription: "A context card describing a situation requiring a formal or informal email response.",
    assessmentFocus: "Task completion, register appropriacy, basic organisation, language range at A2–B1.",
  },
  {
    id: "OTE_W_PART2",
    test: "OTE",
    skill: "WRITING",
    format: "OTE_WRITING_ESSAY",
    cefrLevels: ["B2", "C1"],
    itemCount: 1,
    timeMinutes: 35,
    scoring: "holistic_4_criteria",
    candidateTask: "Write an essay of 200–250 words expressing and justifying your opinion on the given statement.",
    stimulusDescription: "A debatable statement on a contemporary issue. Two supporting ideas provided as prompts.",
    assessmentFocus: "Argumentation, coherence, B2+ language range, discursive essay conventions.",
  },
  // ── OTE SPEAKING ──────────────────────────────────────────────────────────
  {
    id: "OTE_S_PART1",
    test: "OTE",
    skill: "SPEAKING",
    format: "OTE_SPEAKING_INTERVIEW",
    cefrLevels: ["A2", "B1", "B2", "C1"],
    itemCount: 3,
    timeMinutes: 5,
    scoring: "holistic_5_criteria",
    candidateTask: "Answer questions about yourself, your interests, and general topics.",
    stimulusDescription: "Examiner-led interview. 3 questions with follow-up prompts.",
    assessmentFocus: "Fluency, grammar/vocabulary range, pronunciation at target CEFR level.",
  },
  {
    id: "OTE_S_PART2",
    test: "OTE",
    skill: "SPEAKING",
    format: "OTE_SPEAKING_MONOLOGUE",
    cefrLevels: ["B1", "B2", "C1"],
    itemCount: 1,
    timeMinutes: 4,
    scoring: "holistic_5_criteria",
    candidateTask: "Describe the photograph and then answer the examiner's question about it.",
    stimulusDescription: "A colour photograph of a scene (people, place, activity). Candidate speaks for 1–2 minutes.",
    assessmentFocus: "Extended monologue, descriptive language, speculative language at B1–C1.",
  },
  {
    id: "OTE_S_PART3",
    test: "OTE",
    skill: "SPEAKING",
    format: "OTE_SPEAKING_MONOLOGUE",
    cefrLevels: ["B2", "C1"],
    itemCount: 1,
    timeMinutes: 5,
    scoring: "holistic_5_criteria",
    candidateTask: "Talk about the topic on the card. Give reasons and examples to support your views.",
    stimulusDescription: "An abstract topic card with a question and 3 bullet points as prompts. 2-minute monologue.",
    assessmentFocus: "Opinion, argumentation, discourse management, C1 language at B2–C1.",
  },
  // ── OTE USE OF ENGLISH ────────────────────────────────────────────────────
  {
    id: "OTE_UOE_PART1",
    test: "OTE",
    skill: "USE_OF_ENGLISH",
    format: "OTE_UOE_MCQ",
    cefrLevels: ["B1", "B2"],
    itemCount: 10,
    timeMinutes: 15,
    scoring: "dichotomous",
    candidateTask: "Choose the correct word (A, B, C or D) to complete each sentence.",
    stimulusDescription: "10 standalone sentences, each with one grammatical or lexical gap and 4 options.",
    assessmentFocus: "Lexico-grammatical knowledge: collocations, phrasal verbs, prepositions, vocabulary precision.",
  },
  {
    id: "OTE_UOE_PART2",
    test: "OTE",
    skill: "USE_OF_ENGLISH",
    format: "OTE_UOE_WORD_FORM",
    cefrLevels: ["B2", "C1"],
    itemCount: 8,
    timeMinutes: 12,
    scoring: "dichotomous",
    candidateTask: "Use the word in brackets in the correct form to fill each gap.",
    stimulusDescription: "Text with 8 gaps. Base word given for each; candidates apply word formation rules.",
    assessmentFocus: "Word formation: affixation, compounding, conversion. Oxford 5000 word list focus.",
  },
  // ── OOPT ADAPTIVE ─────────────────────────────────────────────────────────
  {
    id: "OOPT_ADAPTIVE",
    test: "OOPT",
    skill: "USE_OF_ENGLISH",
    format: "OOPT_ADAPTIVE_GRAMMAR",
    cefrLevels: ["A1", "A2", "B1", "B2", "C1", "C2"],
    itemCount: 60,
    timeMinutes: 60,
    scoring: "dichotomous",
    candidateTask: "Read the sentence and choose the correct answer to complete it.",
    stimulusDescription: "Adaptive CAT engine. Items range A1–C2. Grammar focus: tense, aspect, modality, clause structure. Oxford Grammar Profile aligned.",
    assessmentFocus: "Adaptive placement across full CEFR range. Oxford Grammar Profile (OGP) construct-map aligned.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. OXFORD GRAMMAR PROFILE (OGP) — Key grammar constructs per CEFR level
// Source: English Grammar Profile (O'Keeffe & Mark, 2017) — Cambridge University Press
// ─────────────────────────────────────────────────────────────────────────────

export interface OxfordGrammarProfile {
  level: CefrLevel;
  keyConstructs: string[];
  sampleSentences: string[];
}

export const OXFORD_GRAMMAR_PROFILE: OxfordGrammarProfile[] = [
  {
    level: "A1",
    keyConstructs: [
      "Simple present (I am, she is, they have)",
      "Simple past of 'be' (was/were)",
      "Imperatives (Stop! Listen!)",
      "Basic pronouns (I, you, he, she, it, we, they)",
      "Articles: a/an, the",
      "Basic prepositions: in, on, at, to, from",
      "Simple declarative sentences (S+V+O)",
    ],
    sampleSentences: [
      "I am a student.", "She has a dog.", "Stop!", "Where is the bank?"
    ],
  },
  {
    level: "A2",
    keyConstructs: [
      "Simple past regular and irregular verbs",
      "Present continuous for present actions",
      "Going to + infinitive (future plans)",
      "Can/can't for ability and permission",
      "Comparative and superlative adjectives",
      "Some/any/a lot of/much/many",
      "Prepositional phrases of time (in the morning, on Mondays)",
    ],
    sampleSentences: [
      "We went to the park yesterday.", "She is watching TV right now.", "He can't swim.",
      "This is the most expensive hotel."
    ],
  },
  {
    level: "B1",
    keyConstructs: [
      "Present perfect with ever/never/already/just/yet",
      "Past continuous for interrupted actions",
      "Will/won't for predictions and offers",
      "First conditional (If + present, will + infinitive)",
      "Modal verbs: should, might, must, have to",
      "Passive voice: simple present and past",
      "Relative clauses with who/which/that",
      "Reported speech: say, tell, ask",
    ],
    sampleSentences: [
      "I've never been to Paris.", "She was reading when he called.", "You should see a doctor.",
      "The report was written by our team.", "This is the film that everyone talks about."
    ],
  },
  {
    level: "B2",
    keyConstructs: [
      "Present perfect continuous for ongoing actions",
      "Past perfect for sequencing past events",
      "Second conditional (If + past, would + infinitive)",
      "Third conditional (If + past perfect, would have + pp)",
      "Passive voice: continuous, perfect, modals",
      "Reporting verbs: claim, suggest, warn, admit",
      "Gerund vs infinitive distinction (complex patterns)",
      "Cleft sentences: It is/was… who/that…",
      "Non-defining relative clauses",
    ],
    sampleSentences: [
      "She's been working here for five years.", "If I had studied more, I would have passed.",
      "It was announced that the merger had failed.", "My boss, who joined last year, is very supportive."
    ],
  },
  {
    level: "C1",
    keyConstructs: [
      "Inversion for emphasis: Rarely had… / Not only did…",
      "Mixed conditionals",
      "Subjunctive in formal contexts: It is essential that he be…",
      "Advanced passive constructions: He is reported to have…",
      "Nominalisation: The implementation of the policy…",
      "Participial clauses: Having been told… / Walking into the room…",
      "Advanced modal meanings: must/should/may/might/could + perfect",
      "Ellipsis and substitution in discourse",
    ],
    sampleSentences: [
      "Not only did she win, but she broke the record.", "It is vital that the report be submitted by Friday.",
      "The president is said to have known about the decision.", "Having reviewed the evidence, we concluded that…"
    ],
  },
  {
    level: "C2",
    keyConstructs: [
      "Full command of all grammatical structures",
      "Stylistic variation: formal, informal, literary, archaic",
      "Complex multi-clause sentences with multiple embedding",
      "Advanced inversion: Sooner would I resign than… / Were it not for…",
      "Emphatic structures: Do/Did + infinitive (I do believe…)",
      "Absolute participial clauses: The problem solved, we moved on.",
      "Subjunctive in all contexts including literary: Would that it were…",
      "Near error-free across all registers",
    ],
    sampleSentences: [
      "Were it not for the committee's intervention, the project would have been abandoned.",
      "The task completed, she turned to the next challenge.",
      "I do believe that the situation warrants immediate attention."
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. OXFORD 3000™ / 5000™ VOCABULARY LEVEL INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

export interface OxfordVocabularyProfile {
  level: CefrLevel;
  listName: string;
  approximateSize: number;
  description: string;
  sampleWords: string[];
}

export const OXFORD_VOCABULARY_PROFILES: OxfordVocabularyProfile[] = [
  {
    level: "A1",
    listName: "Oxford 3000™ — A1 band",
    approximateSize: 500,
    description: "Basic, high-frequency words essential for everyday survival communication.",
    sampleWords: ["cat", "house", "eat", "big", "happy", "go", "today", "because"],
  },
  {
    level: "A2",
    listName: "Oxford 3000™ — A2 band",
    approximateSize: 1000,
    description: "Common everyday vocabulary for familiar topics and situations.",
    sampleWords: ["airport", "appointment", "comfortable", "describe", "explain", "popular", "surprised", "tradition"],
  },
  {
    level: "B1",
    listName: "Oxford 3000™ — B1 band",
    approximateSize: 1500,
    description: "Vocabulary for a wide range of everyday and some specialised contexts.",
    sampleWords: ["achievement", "apparent", "attitude", "consequence", "distribute", "emerge", "influence", "participate"],
  },
  {
    level: "B2",
    listName: "Oxford 5000™ — B2 band",
    approximateSize: 2000,
    description: "Vocabulary to handle complex topics and abstract ideas. Includes Academic Word List overlap.",
    sampleWords: ["acknowledge", "ambiguous", "coherent", "contradict", "elaborate", "hypothesis", "inevitable", "undermine"],
  },
  {
    level: "C1",
    listName: "Oxford 5000™ — C1 band",
    approximateSize: 2000,
    description: "Advanced vocabulary for nuanced expression in academic and professional contexts.",
    sampleWords: ["alleviate", "corroborate", "ephemeral", "meticulous", "nuanced", "paradox", "pragmatic", "substantiate"],
  },
  {
    level: "C2",
    listName: "Beyond Oxford 5000™",
    approximateSize: 5000,
    description: "Full native-speaker range including low-frequency, literary, and domain-specific vocabulary.",
    sampleWords: ["laconic", "obfuscate", "perspicacious", "sycophantic", "tendentious", "verisimilitude", "abstruse", "didactic"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. OTE REPORTING — Score calculation and certificate generation
// ─────────────────────────────────────────────────────────────────────────────

export interface OTEScoreReport {
  candidateId: string;
  testDate: string;
  overallScore: number;           // 0–160 OTE scale
  cefrLevel: CefrLevel;
  passedCertificate: boolean;
  skillScores: {
    reading: number;              // 0–40
    listening: number;            // 0–40
    writing: number;              // 0–40
    speaking: number;             // 0–40
  };
  /** Oxford Can-Do statement for the awarded level */
  canDoStatement: string;
  /** Detailed level descriptor */
  levelDescriptor: string;
  /** Next steps recommendation */
  nextLevel?: CefrLevel;
  nextSteps: string;
}

export function computeOTEOverallScore(skillScores: {
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
}): { overallScore: number; cefrLevel: CefrLevel; passedCertificate: boolean } {
  const overall = Math.round(
    (skillScores.reading + skillScores.listening + skillScores.writing + skillScores.speaking) / 4
  );

  // Map 0–40 per skill to 0–160 overall
  const oteScale = overall;  // Already 0–40, multiply by 4 for full scale
  const scaledScore = Math.min(160, Math.max(0, overall * 4));

  const band = OXFORD_SCORE_BANDS.find(
    (b) => scaledScore >= b.oteScoreRange[0] && scaledScore <= b.oteScoreRange[1]
  ) ?? OXFORD_SCORE_BANDS[0];

  // Certificate awarded if all skills meet minimum (A2 threshold = 20 per skill)
  const allSkillsMeetMinimum = Object.values(skillScores).every((s) => s >= band.minimumSkillScore / 4);

  return {
    overallScore: scaledScore,
    cefrLevel: band.cefrLevel,
    passedCertificate: allSkillsMeetMinimum && scaledScore >= band.oteScoreRange[0],
  };
}

/**
 * Map an IRT theta score to an OTE scale score (0–160)
 * Theta range -4 to +4 mapped linearly to OTE scale
 */
export function thetaToOTEScore(theta: number): number {
  // Linear mapping: theta=-4→0, theta=+4→160
  const clamped = Math.max(-4, Math.min(4, theta));
  return Math.round(((clamped + 4) / 8) * 160);
}

/**
 * Map an OTE score to a CEFR level
 */
export function oteScoreToCefr(oteScore: number): CefrLevel {
  const band = OXFORD_SCORE_BANDS.find(
    (b) => oteScore >= b.oteScoreRange[0] && oteScore <= b.oteScoreRange[1]
  );
  return band?.cefrLevel ?? "A1";
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. GRAMMAR CONSTRUCT LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get grammar constructs appropriate for items at a given CEFR level.
 * Used by AI item generator to constrain grammar syllabus.
 */
export function getGrammarConstructs(level: CefrLevel): string[] {
  const profile = OXFORD_GRAMMAR_PROFILE.find((p) => p.level === level);
  return profile?.keyConstructs ?? [];
}

/**
 * Get all grammar constructs up to and including the given level (cumulative).
 */
export function getGrammarConstructsUpTo(level: CefrLevel): string[] {
  const order: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const idx = order.indexOf(level);
  const result: string[] = [];
  for (let i = 0; i <= idx; i++) {
    const profile = OXFORD_GRAMMAR_PROFILE.find((p) => p.level === order[i]);
    if (profile) result.push(...profile.keyConstructs);
  }
  return result;
}

/**
 * Get vocabulary profile for a given CEFR level.
 */
export function getVocabularyProfile(level: CefrLevel): OxfordVocabularyProfile | undefined {
  return OXFORD_VOCABULARY_PROFILES.find((p) => p.level === level);
}
