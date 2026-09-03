/**
 * Content Factory Blueprint
 * §132 Blueprint-aware generation — every item generated against a precise cell.
 *
 * A BlueprintCell is the atomic unit of content planning:
 *   CEFR × Skill × Subskill × Genre × Topic × ItemType × DistractorStrategy
 *
 * Cells are never "Give me 100 B2 questions."
 * They are always fully specified.
 */

// ── Cell spec ─────────────────────────────────────────────────────────────────

export interface BlueprintCell {
  // Required
  cefr: string;         // A1 | A2 | B1 | B2 | C1 | C2
  skill: string;        // READING | LISTENING | WRITING | SPEAKING | GRAMMAR | VOCABULARY
  subskill: string;     // from controlled taxonomy

  // Content targeting
  genre?: string;       // article | email | notice | interview | blog | review | report | conversation | presentation | lecture | discussion
  topic?: string;       // education | work | travel | technology | environment | health | culture | science | media | society | leisure | transport | innovation | personal_life | consumer
  register?: string;    // formal | informal | neutral | academic | colloquial

  // Construct specification (§11 Evidence Statement)
  construct?: string;   // e.g. "Reading for inference"
  evidenceStatement?: string; // e.g. "Candidate integrates two paragraphs to infer unstated consequence"
  descriptorRef?: string;     // e.g. "CEFR CV2020 B2 Reading p.67"

  // Item design
  itemType?: string;    // MULTIPLE_CHOICE | FILL_IN_BLANKS | WRITING_PROMPT | SPEAKING_PROMPT | DRAG_DROP
  distractorStrategy?: string; // What each distractor targets (free text spec)
  wordCountMin?: number;
  wordCountMax?: number;

  // Context constraints
  ageSuitability?: string;  // YOUNG_LEARNER | TEEN | ADULT | UNIVERSAL
  culturalLoad?: string;    // LOW | MEDIUM | HIGH
  englishVariant?: string;  // BRITISH | AMERICAN | INTERNATIONAL
}

// ── Phase 1 target (§120 Bank target matrix) ─────────────────────────────────

export const PHASE1_TARGET_PER_CELL = 50; // items per CEFR×Skill cell

// ── Subskill taxonomy (§12-18) ────────────────────────────────────────────────

export const READING_SUBSKILLS = [
  "GIST", "MAIN_IDEA", "OVERALL_PURPOSE", "TEXT_FUNCTION",
  "EXPLICIT_DETAIL", "SPECIFIC_INFORMATION", "REFERENCE_RESOLUTION",
  "IMPLIED_MEANING", "INFERENCE", "UNSTATED_CONCLUSION", "CAUSE_EFFECT_INFERENCE",
  "MEANING_FROM_CONTEXT", "PHRASE_INTERPRETATION",
  "COHESION", "PARAGRAPH_RELATIONSHIPS", "DISCOURSE_MARKERS", "SENTENCE_INSERTION",
  "WRITER_ATTITUDE", "TONE", "STANCE", "INTENTION",
  "ARGUMENT_STRUCTURE", "EVIDENCE_EVALUATION", "COMPETING_VIEWPOINTS", "SYNTHESIS",
] as const;

export const LISTENING_SUBSKILLS = [
  "GIST", "TOPIC", "PURPOSE",
  "FACTUAL_DETAIL", "SPECIFIC_INFORMATION", "SEQUENCE",
  "IMPLICATION", "INFERRED_INTENTION", "SPEAKER_ATTITUDE", "SPEAKER_RELATIONSHIP",
  "ORGANISATION", "ARGUMENT_DEVELOPMENT",
  "TONE", "AGREEMENT_DISAGREEMENT", "IMPLIED_MEANING",
  "SYNTHESISING_INFORMATION", "DISTINGUISHING_VIEWPOINTS",
] as const;

export const WRITING_SUBSKILLS = [
  "TASK_FULFILMENT", "ORGANISATION", "COHERENCE", "COHESION",
  "LEXICAL_RANGE", "LEXICAL_ACCURACY", "GRAMMATICAL_RANGE", "GRAMMATICAL_ACCURACY",
  "REGISTER", "GENRE_CONVENTIONS",
] as const;

export const SPEAKING_SUBSKILLS = [
  "TASK_FULFILMENT", "FLUENCY", "COHERENCE", "DISCOURSE_MANAGEMENT",
  "LEXICAL_RANGE", "LEXICAL_ACCURACY", "GRAMMATICAL_RANGE", "GRAMMATICAL_ACCURACY",
  "PRONUNCIATION", "INTELLIGIBILITY", "INTERACTION", "TURN_MANAGEMENT", "PRAGMATIC_APPROPRIACY",
] as const;

export const GRAMMAR_SUBSKILLS = [
  "TENSE_ASPECT", "MODALITY", "CONDITIONALS", "COMPARISON",
  "DETERMINERS", "QUANTIFICATION", "AGREEMENT", "COMPLEMENTATION",
  "SUBORDINATION", "RELATIVE_CLAUSES", "PASSIVE", "REPORTED_LANGUAGE",
  "INVERSION", "DISCOURSE_GRAMMAR",
] as const;

export const VOCABULARY_SUBSKILLS = [
  "RECEPTIVE_VOCABULARY", "PRODUCTIVE_VOCABULARY", "LEXICAL_RANGE", "LEXICAL_PRECISION",
  "COLLOCATION", "WORD_FORMATION", "MULTI_WORD_EXPRESSIONS", "PHRASAL_VERBS",
  "REGISTER", "CONTEXTUAL_MEANING",
] as const;

export const SUBSKILLS_BY_SKILL: Record<string, readonly string[]> = {
  READING: READING_SUBSKILLS,
  LISTENING: LISTENING_SUBSKILLS,
  WRITING: WRITING_SUBSKILLS,
  SPEAKING: SPEAKING_SUBSKILLS,
  GRAMMAR: GRAMMAR_SUBSKILLS,
  VOCABULARY: VOCABULARY_SUBSKILLS,
};

// ── Genre × Skill defaults ────────────────────────────────────────────────────

export const GENRES_BY_SKILL: Record<string, string[]> = {
  READING:   ["article", "email", "notice", "advertisement", "blog", "review", "interview", "report", "opinion_column", "narrative", "instructions"],
  LISTENING: ["conversation", "announcement", "interview", "discussion", "presentation", "short_talk", "lecture", "service_interaction"],
  WRITING:   ["email", "essay", "report", "review", "letter", "story", "proposal"],
  SPEAKING:  ["personal_questions", "situational", "picture_description", "comparison", "opinion", "problem_solving"],
  GRAMMAR:   ["gap_fill", "error_correction", "transformation", "multiple_choice_context"],
  VOCABULARY: ["gap_fill", "matching", "multiple_choice_context", "word_formation"],
};

// ── Topic bank (§56) ─────────────────────────────────────────────────────────

export const TOPICS = [
  "personal_life", "family", "education", "work", "travel", "technology",
  "environment", "health", "culture", "science", "media", "society",
  "leisure", "consumer", "transport", "communication", "innovation",
] as const;

// ── CEFR word count guidance (§27) ───────────────────────────────────────────

export const WORD_COUNT_GUIDANCE: Record<string, { min: number; max: number; label: string }> = {
  A1:  { min: 50,  max: 150, label: "micro-text (50-150 words)" },
  A2:  { min: 80,  max: 250, label: "short text (80-250 words)" },
  B1:  { min: 150, max: 350, label: "medium text (150-350 words)" },
  B2:  { min: 200, max: 450, label: "medium-extended text (200-450 words)" },
  C1:  { min: 250, max: 600, label: "extended text (250-600 words)" },
  C2:  { min: 300, max: 800, label: "dense extended text (300-800 words)" },
};

// ── Default item type per skill ───────────────────────────────────────────────

export const DEFAULT_ITEM_TYPE: Record<string, string> = {
  READING:    "MULTIPLE_CHOICE",
  LISTENING:  "MULTIPLE_CHOICE",
  GRAMMAR:    "MULTIPLE_CHOICE",
  VOCABULARY: "MULTIPLE_CHOICE",
  WRITING:    "WRITING_PROMPT",
  SPEAKING:   "SPEAKING_PROMPT",
};

// ── IRT difficulty seed per CEFR ─────────────────────────────────────────────

export const CEFR_THETA_SEED: Record<string, number> = {
  PRE_A1: -4.0, A1: -2.5, A2: -1.2, B1: 0.0, B2: 1.0, C1: 2.2, C2: 3.2,
};

// ── Priority gaps helper ──────────────────────────────────────────────────────

export interface CellGap {
  cefr: string;
  skill: string;
  subskill: string | null;
  have: number;
  need: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export function priorityFromCount(have: number): "HIGH" | "MEDIUM" | "LOW" {
  if (have === 0) return "HIGH";
  if (have < 20)  return "MEDIUM";
  return "LOW";
}
