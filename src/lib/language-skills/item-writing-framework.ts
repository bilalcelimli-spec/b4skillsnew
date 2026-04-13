/**
 * LinguAdapt Item Writing Framework
 *
 * Canonical reference for constructing valid, bias-free, CEFR-aligned assessment items.
 *
 * Theoretical basis:
 *  - Haladyna, Downing & Rodriguez (2002) — A Review of Multiple-Choice Item Writing Guidelines
 *  - Alderson, Clapham & Wall (1995) — Language Test Construction and Evaluation
 *  - Cambridge Assessment (n.d.) — Item Writer Guidelines for EFL/ESL Assessment
 *  - ALTE (2011) — Manual for Language Test Development and Examining
 *  - ETS (2009) — Guidelines for Best Test Development Practices to Ensure Validity and Fairness
 *  - IRT calibration norms: Hambleton & Swaminathan (1985), Baker & Kim (2004)
 *  - Bachman & Palmer (2010) — Language Assessment in Practice
 *
 * Exports:
 *  - ITEM_FORMATS: specification per item type
 *  - ITEM_WRITING_GUIDELINES: universal + skill-specific writing rules
 *  - IRT_PARAMETER_NORMS: expected a/b/c per CEFR level
 *  - DISTRACTOR_GUIDELINES: how to build effective distractors
 *  - BIAS_REVIEW_CHECKLIST: fairness criteria
 *  - buildItemWritingPrompt(): AI prompt generator for each format
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";
import type { MacroSkill, TextGenre } from "./language-skill-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ITEM FORMAT CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

export type ItemFormat =
  | "MULTIPLE_CHOICE_SINGLE"        // Standard 4-option MCQ, one correct answer
  | "MULTIPLE_CHOICE_MULTI"         // Select all that apply (2-3 correct)
  | "TRUE_FALSE_NOT_GIVEN"          // 3-way classifier
  | "MATCHING"                      // Match list A to list B
  | "ORDERING"                      // Arrange segments in correct order
  | "GAP_FILL_CLOSED"               // Choose from options to fill blank
  | "GAP_FILL_OPEN"                 // Type free-text into blank
  | "SENTENCE_INSERTION"            // Place a sentence into the correct gap in text
  | "HEADING_MATCHING"              // Assign headings to paragraphs
  | "SHORT_ANSWER"                  // 1-3 word answer from the text
  | "SUMMARY_COMPLETION"            // Complete a summary with words from the text
  | "SPEAKING_MONOLOGUE"            // Extended spoken response to a prompt
  | "SPEAKING_IMAGE"                // Describe a picture or visual
  | "SPEAKING_OPINION"              // Express and justify an opinion
  | "SPEAKING_ROLE_PLAY"            // Simulated conversation scenario
  | "WRITING_EMAIL"                 // Formal or informal email/letter
  | "WRITING_ESSAY"                 // Discursive, argumentative, or opinion essay
  | "WRITING_REPORT"                // Factual summary or analytical report
  | "WRITING_STORY"                 // Narrative creative task
  | "WRITING_SUMMARY"               // Summarise a source text
  | "DRAG_DROP"                     // Drag words/phrases into correct positions
  | "CLOZE_PASSAGE"                 // Passage with multiple gaps (grammar/vocabulary)
  | "WORD_FORMATION";               // Transform a base word to correct form

export interface ItemFormatSpec {
  format: ItemFormat;
  label: string;
  applicableSkills: MacroSkill[];
  applicableLevels: CefrLevel[];
  scoringType: "dichotomous" | "partial_credit" | "polytomous" | "holistic";
  cognitiveLoad: "low" | "medium" | "high";
  optionCount?: number;           // For MCQ variants
  constructsMeasured: string[];
  deliveryMode: "text" | "audio" | "visual" | "multimodal";
  administrativeNotes: string;
}

export const ITEM_FORMATS: ItemFormatSpec[] = [
  {
    format: "MULTIPLE_CHOICE_SINGLE",
    label: "Multiple Choice (Single Answer)",
    applicableSkills: ["READING", "LISTENING", "GRAMMAR", "VOCABULARY"],
    applicableLevels: ["A1", "A2", "B1", "B2", "C1", "C2"],
    scoringType: "dichotomous",
    cognitiveLoad: "medium",
    optionCount: 4,
    constructsMeasured: ["recall", "comprehension", "inference", "lexical knowledge", "grammatical knowledge"],
    deliveryMode: "text",
    administrativeNotes: "Each option must clearly differ from others. Avoid 'all/none of the above'. Stem must be complete before options.",
  },
  {
    format: "MULTIPLE_CHOICE_MULTI",
    label: "Multiple Choice (Multiple Answers)",
    applicableSkills: ["READING", "LISTENING", "VOCABULARY"],
    applicableLevels: ["B1", "B2", "C1", "C2"],
    scoringType: "partial_credit",
    cognitiveLoad: "high",
    optionCount: 5,
    constructsMeasured: ["comprehensive comprehension", "detail tracking"],
    deliveryMode: "text",
    administrativeNotes: "Typically 2-3 correct answers from 5 options. Instruct candidates to select all that apply.",
  },
  {
    format: "TRUE_FALSE_NOT_GIVEN",
    label: "True / False / Not Given",
    applicableSkills: ["READING"],
    applicableLevels: ["A2", "B1", "B2", "C1"],
    scoringType: "dichotomous",
    cognitiveLoad: "high",
    constructsMeasured: ["inference", "fact recall", "text-world discrimination"],
    deliveryMode: "text",
    administrativeNotes: "NOT GIVEN must be truly unanswerable from the text, not simply absent. Avoid 'not given' for negation-heavy stems.",
  },
  {
    format: "MATCHING",
    label: "Matching",
    applicableSkills: ["READING", "LISTENING", "VOCABULARY"],
    applicableLevels: ["A2", "B1", "B2", "C1"],
    scoringType: "partial_credit",
    cognitiveLoad: "medium",
    constructsMeasured: ["text navigation", "semantic matching", "paragraph main idea"],
    deliveryMode: "text",
    administrativeNotes: "Provide more options than required. Spread content across pages to require scanning.",
  },
  {
    format: "ORDERING",
    label: "Sequencing / Ordering",
    applicableSkills: ["READING", "LISTENING", "WRITING"],
    applicableLevels: ["A2", "B1", "B2"],
    scoringType: "partial_credit",
    cognitiveLoad: "medium",
    constructsMeasured: ["text structure", "cause-effect chain", "chronological tracking"],
    deliveryMode: "text",
    administrativeNotes: "Segments must be semantically independent enough to be reorderable. Fix one segment to reduce random guessing.",
  },
  {
    format: "GAP_FILL_CLOSED",
    label: "Gap Fill (Choose from Options)",
    applicableSkills: ["READING", "GRAMMAR", "VOCABULARY"],
    applicableLevels: ["A1", "A2", "B1", "B2", "C1"],
    scoringType: "dichotomous",
    cognitiveLoad: "medium",
    optionCount: 4,
    constructsMeasured: ["lexical knowledge", "collocational knowledge", "grammatical form"],
    deliveryMode: "text",
    administrativeNotes: "Options should be the same part of speech. Distractors must be plausible but clearly incorrect in context.",
  },
  {
    format: "GAP_FILL_OPEN",
    label: "Gap Fill (Free Text)",
    applicableSkills: ["GRAMMAR", "VOCABULARY", "READING"],
    applicableLevels: ["A2", "B1", "B2", "C1", "C2"],
    scoringType: "dichotomous",
    cognitiveLoad: "medium",
    constructsMeasured: ["grammar form recall", "spelling", "contextual word knowledge"],
    deliveryMode: "text",
    administrativeNotes: "Acceptable answer list must cover all plausible correct variants. Ellipsis in stem must be wide enough but not ambiguous.",
  },
  {
    format: "SENTENCE_INSERTION",
    label: "Sentence Insertion",
    applicableSkills: ["READING"],
    applicableLevels: ["B1", "B2", "C1", "C2"],
    scoringType: "partial_credit",
    cognitiveLoad: "high",
    constructsMeasured: ["text cohesion", "discourse tracking", "logical flow"],
    deliveryMode: "text",
    administrativeNotes: "Each gap must be necessary for discourse. Verbalcohesion signals (pronouns, connectors) should guide selection. One extra distractor sentence always provided.",
  },
  {
    format: "HEADING_MATCHING",
    label: "Matching Headings to Paragraphs",
    applicableSkills: ["READING"],
    applicableLevels: ["B1", "B2", "C1"],
    scoringType: "partial_credit",
    cognitiveLoad: "high",
    constructsMeasured: ["main idea identification", "text structure", "summarisation"],
    deliveryMode: "text",
    administrativeNotes: "Headings should paraphrase, not use verbatim text from paragraph. One extra heading always provided.",
  },
  {
    format: "SHORT_ANSWER",
    label: "Short Answer (Lifted from Text)",
    applicableSkills: ["READING", "LISTENING"],
    applicableLevels: ["A2", "B1", "B2", "C1"],
    scoringType: "dichotomous",
    cognitiveLoad: "medium",
    constructsMeasured: ["specific information retrieval", "key-word location"],
    deliveryMode: "text",
    administrativeNotes: "Wording limit (e.g. 'NO MORE THAN THREE WORDS') must be specified. Answer must be findable verbatim in text.",
  },
  {
    format: "SUMMARY_COMPLETION",
    label: "Summary Completion",
    applicableSkills: ["READING", "LISTENING"],
    applicableLevels: ["B1", "B2", "C1"],
    scoringType: "partial_credit",
    cognitiveLoad: "high",
    constructsMeasured: ["paraphrase recognition", "main idea", "detailed comprehension"],
    deliveryMode: "text",
    administrativeNotes: "Summary should paraphrase (not copy) original text. Test-takers use words from the text or a word bank.",
  },
  {
    format: "SPEAKING_MONOLOGUE",
    label: "Extended Spoken Response (Monologue)",
    applicableSkills: ["SPEAKING"],
    applicableLevels: ["B1", "B2", "C1", "C2"],
    scoringType: "holistic",
    cognitiveLoad: "high",
    constructsMeasured: ["fluency", "coherence", "grammar range", "vocabulary resource", "pronunciation"],
    deliveryMode: "audio",
    administrativeNotes: "Prompt should be open enough for extended development. Ensure topic is culturally inclusive and accessible.",
  },
  {
    format: "SPEAKING_IMAGE",
    label: "Image Description (Speaking)",
    applicableSkills: ["SPEAKING"],
    applicableLevels: ["A1", "A2", "B1", "B2"],
    scoringType: "holistic",
    cognitiveLoad: "medium",
    constructsMeasured: ["vocabulary", "present tense usage", "descriptive language", "pronunciation"],
    deliveryMode: "visual",
    administrativeNotes: "Images must be copyright-free, culturally neutral, and clearly labelled. Avoid images requiring specialist knowledge.",
  },
  {
    format: "SPEAKING_OPINION",
    label: "Opinion Response (Speaking)",
    applicableSkills: ["SPEAKING"],
    applicableLevels: ["B1", "B2", "C1", "C2"],
    scoringType: "holistic",
    cognitiveLoad: "high",
    constructsMeasured: ["opinion expression", "argumentation", "hedging", "fluency", "interaction"],
    deliveryMode: "audio",
    administrativeNotes: "Avoid politically divisive or culturally sensitive topics. Prompt must not presuppose specific background knowledge.",
  },
  {
    format: "WRITING_EMAIL",
    label: "Email / Letter Writing",
    applicableSkills: ["WRITING"],
    applicableLevels: ["A2", "B1", "B2", "C1"],
    scoringType: "holistic",
    cognitiveLoad: "medium",
    constructsMeasured: ["register", "task achievement", "cohesion", "grammar", "vocabulary"],
    deliveryMode: "text",
    administrativeNotes: "Specify formality (formal/informal/semi-formal). Bullet-point the required content points. State word count range.",
  },
  {
    format: "WRITING_ESSAY",
    label: "Discursive / Argumentative Essay",
    applicableSkills: ["WRITING"],
    applicableLevels: ["B1", "B2", "C1", "C2"],
    scoringType: "holistic",
    cognitiveLoad: "high",
    constructsMeasured: ["argumentation", "coherence/cohesion", "lexical resource", "grammatical range", "task achievement"],
    deliveryMode: "text",
    administrativeNotes: "Topic must be accessible across cultures. Avoid highly localised topics. State whether to present both sides or a single viewpoint.",
  },
  {
    format: "WRITING_REPORT",
    label: "Report / Proposal Writing",
    applicableSkills: ["WRITING"],
    applicableLevels: ["B2", "C1", "C2"],
    scoringType: "holistic",
    cognitiveLoad: "high",
    constructsMeasured: ["formal register", "structure and organisation", "data interpretation", "recommendations"],
    deliveryMode: "text",
    administrativeNotes: "Provide a stimulus (chart, data, scenario). Specify headings or structure if required. Formal register throughout.",
  },
  {
    format: "DRAG_DROP",
    label: "Drag and Drop",
    applicableSkills: ["GRAMMAR", "VOCABULARY", "READING"],
    applicableLevels: ["A1", "A2", "B1", "B2"],
    scoringType: "partial_credit",
    cognitiveLoad: "low",
    constructsMeasured: ["word order", "collocational knowledge", "sentence structure"],
    deliveryMode: "text",
    administrativeNotes: "Useful at lower levels to reduce writing demand. Ensure draggable items are sufficiently distinct.",
  },
  {
    format: "CLOZE_PASSAGE",
    label: "Cloze Passage (Multiple Gaps)",
    applicableSkills: ["GRAMMAR", "VOCABULARY"],
    applicableLevels: ["A2", "B1", "B2", "C1"],
    scoringType: "partial_credit",
    cognitiveLoad: "medium",
    constructsMeasured: ["reading-while-processing grammar", "vocabulary in context", "discourse coherence"],
    deliveryMode: "text",
    administrativeNotes: "Gap every 6th–8th word (rational cloze) or target specific grammar/vocab structures (rational deletion). Avoid deleting content words at A1/A2.",
  },
  {
    format: "WORD_FORMATION",
    label: "Word Formation",
    applicableSkills: ["VOCABULARY", "GRAMMAR"],
    applicableLevels: ["B1", "B2", "C1", "C2"],
    scoringType: "dichotomous",
    cognitiveLoad: "medium",
    constructsMeasured: ["morphological knowledge", "word formation rules", "register appropriacy"],
    deliveryMode: "text",
    administrativeNotes: "Base word provided must have a clear and commonly used derivation at the target level. Spelling must be accepted variant-inclusive.",
  },
];

export function getItemFormatSpec(format: ItemFormat): ItemFormatSpec | undefined {
  return ITEM_FORMATS.find(f => f.format === format);
}

export function getFormatsForSkill(skill: MacroSkill, level?: CefrLevel): ItemFormatSpec[] {
  return ITEM_FORMATS.filter(
    f => f.applicableSkills.includes(skill) && (!level || f.applicableLevels.includes(level))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UNIVERSAL ITEM WRITING GUIDELINES
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemWritingGuideline {
  id: string;
  category: "stem" | "options" | "distractors" | "stimulus" | "format" | "bias" | "scoring";
  rule: string;
  severity: "critical" | "major" | "minor";
  example?: { bad: string; good: string };
}

export const UNIVERSAL_ITEM_WRITING_GUIDELINES: ItemWritingGuideline[] = [
  // STEM guidelines
  { id: "STEM-01", category: "stem", severity: "critical", rule: "The stem must clearly present a single, complete problem or question.", example: { bad: "The text suggests that things have changed and…?", good: "According to the text, what has changed in the past decade?" } },
  { id: "STEM-02", category: "stem", severity: "critical", rule: "The stem must be stated positively. If negative, bold or capitalise the negation (e.g. NOT, EXCEPT).", example: { bad: "Which option is not true?", good: "Which of the following is NOT stated in the text?" } },
  { id: "STEM-03", category: "stem", severity: "major", rule: "Avoid window dressing — do not include irrelevant information in the stem.", example: { bad: "Mary, who is a doctor and was born in 1985, __ work on weekends.", good: "Mary __ work on weekends because she is on call." } },
  { id: "STEM-04", category: "stem", severity: "major", rule: "The stem should not be longer than needed to pose the problem.", example: { bad: "Given all the information in the paragraph that we just read, what did the author intend?", good: "What is the author's main purpose in this paragraph?" } },
  { id: "STEM-05", category: "stem", severity: "critical", rule: "Do not use 'always', 'never', 'all', or 'none' in the stem — these signal trick questions.", example: { bad: "Which word is always followed by …?", good: "Which word is typically followed by …?" } },
  // OPTION guidelines
  { id: "OPT-01", category: "options", severity: "critical", rule: "There must be only ONE clearly best answer. Ambiguity is a construct-irrelevant source of variance.", example: { bad: "Options A and B both correctly describe the author's purpose.", good: "Only option C accurately captures the author's main purpose." } },
  { id: "OPT-02", category: "options", severity: "major", rule: "All options must be grammatically consistent with the stem (same syntactic form, same part of speech at the joint)." },
  { id: "OPT-03", category: "options", severity: "major", rule: "Options must be approximately equal in length. A consistently longer correct answer is a test-wiseness cue." },
  { id: "OPT-04", category: "options", severity: "critical", rule: "Avoid 'All of the above' and 'None of the above' — they rarely measure the intended construct and introduce scoring complications." },
  { id: "OPT-05", category: "options", severity: "minor", rule: "Arrange options in a logical order (alphabetical, numerical, or conceptual) unless content requires otherwise." },
  // DISTRACTOR guidelines
  { id: "DIST-01", category: "distractors", severity: "critical", rule: "Each distractor must be plausible to a candidate who lacks the target knowledge.", example: { bad: "Distractor: 'The moon is made of cheese' (obviously incorrect).", good: "Distractor borrows vocabulary from the text but represents a common misconception." } },
  { id: "DIST-02", category: "distractors", severity: "major", rule: "Distractors should represent common error types or partial knowledge, not random impossibilities." },
  { id: "DIST-03", category: "distractors", severity: "major", rule: "Avoid distractors that share a specific word with the correct answer in a way that telegraphs it." },
  { id: "DIST-04", category: "distractors", severity: "major", rule: "Do not write 'trick' distractors that catch test-takers who know the material through misdirection irrelevant to the construct." },
  // STIMULUS guidelines
  { id: "STIM-01", category: "stimulus", severity: "critical", rule: "All answers to comprehension questions must be derivable from the stimulus text alone — no world knowledge required." },
  { id: "STIM-02", category: "stimulus", severity: "major", rule: "Stimulus texts must match the target CEFR level in vocabulary frequency, sentence length, and text complexity." },
  { id: "STIM-03", category: "stimulus", severity: "major", rule: "Authentic texts should be adapted, not fabricated, unless explicitly constructing a learning scenario. Adapted texts must retain original meaning." },
  { id: "STIM-04", category: "stimulus", severity: "major", rule: "Text must be grammatically correct and proofread. Typos or grammatical errors in the stimulus are a source of construct-irrelevant variance." },
  { id: "STIM-05", category: "stimulus", severity: "critical", rule: "Texts must not be culturally biased (e.g., requiring knowledge specific to one country's traditions, legal system, or pop culture)." },
  // FORMAT
  { id: "FMT-01", category: "format", severity: "major", rule: "Use consistent formatting: font size, option labelling (A/B/C/D or a/b/c/d), spacing. Inconsistency creates irrelevant difficulty." },
  { id: "FMT-02", category: "format", severity: "minor", rule: "Include clear instructions above each item type, even in automated delivery." },
  { id: "FMT-03", category: "format", severity: "major", rule: "Avoid splitting a question over a page/screen break. The full stem and options should be visible at once." },
  // BIAS
  { id: "BIAS-01", category: "bias", severity: "critical", rule: "Items must not advantage or disadvantage any group by gender, ethnicity, nationality, religion, disability, or socioeconomic status.", example: { bad: "A stimulus about golf presupposes familiarity with an elite sport.", good: "A neutral topic like technology or public transport is culturally inclusive." } },
  { id: "BIAS-02", category: "bias", severity: "critical", rule: "Avoid gendered pronouns unless the scenario requires it. Use 'they/their' for hypothetical referents or use proper names." },
  { id: "BIAS-03", category: "bias", severity: "major", rule: "Ensure equal representation of male and female characters across the item bank. Do not assign gendered stereotypes (e.g., female nurse, male engineer)." },
  { id: "BIAS-04", category: "bias", severity: "major", rule: "Avoid topics related to violence, trauma, illness, death, religion, or politics unless the test specification requires them." },
  { id: "BIAS-05", category: "bias", severity: "minor", rule: "Review item statistics post-administration for Differential Item Functioning (DIF) by population subgroup." },
  // SCORING
  { id: "SCORE-01", category: "scoring", severity: "critical", rule: "For open-response items, an answer key with all acceptable answers (and unacceptable ones) must be defined at item writing time." },
  { id: "SCORE-02", category: "scoring", severity: "major", rule: "For constructed-response tasks, a detailed analytic or holistic rubric must be written before piloting." },
  { id: "SCORE-03", category: "scoring", severity: "major", rule: "Inter-rater reliability targets (κ ≥ 0.70 for speaking/writing) must be established through rater training on calibration samples." },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. SKILL-SPECIFIC ITEM WRITING GUIDANCE
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillItemGuidance {
  skill: MacroSkill;
  principles: string[];
  commonPitfalls: string[];
  qualityIndicators: string[];
}

export const SKILL_ITEM_GUIDANCE: SkillItemGuidance[] = [
  {
    skill: "READING",
    principles: [
      "Each question must target a distinct and clearly identifiable sub-skill (global comprehension, detail, inference, vocabulary in context, etc.).",
      "Questions should follow the order of information in the text to reduce text-navigation load — unless the item specifically tests scanning.",
      "Inference questions must require the reader to go beyond literal text; the answer must be inferable but NOT stated verbatim.",
      "Vocabulary-in-context questions must have four options that are all plausible meanings of the target word outside the passage; only context disambiguates.",
    ],
    commonPitfalls: ["Verbatim lift: correct answer contains identical wording to the text, rewarding scanning over comprehension.", "Over-inference: 'not given' masquerading as 'false' because it requires cultural world knowledge.", "Trick stems with double negation that test grammar rather than reading."],
    qualityIndicators: ["P-value (classical difficulty) between 0.35–0.70", "Point-biserial discrimination r ≥ 0.25", "All distractors attracting ≥ 5% candidates in pre-test"],
  },
  {
    skill: "LISTENING",
    principles: [
      "The question must be answerable before the audio ends — candidates should know what to listen for before the recording begins.",
      "Audio texts must be genuine recordings or high-quality TTS at natural speed for the target level (slow/clear for A1-A2, natural pace for B1+).",
      "Avoid questions that require impossible memory load (more than 3 consecutive numbers or dates).",
      "Signal-to-noise ratio: ambient noise and accents may be used at B2+ to add authenticity, but quality must not impede construct measurement.",
    ],
    commonPitfalls: ["Testing memory rather than listening comprehension at higher difficulty.", "Answer options using verbatim audio vocabulary — candidates can match without comprehension.", "Audio speed too slow for target level (lowering construct validity)."],
    qualityIndicators: ["All items piloted with target population at correct delivery speed.", "Replay restrictions defined (typically no replay at C1/C2).", "Audio files are at 44kHz minimum, clearly mastered."],
  },
  {
    skill: "WRITING",
    principles: [
      "Prompts must be unambiguous about discourse function (describe, argue, narrate, explain) — use explicit genre markers.",
      "All required content points must be enumerable (e.g., bullet points in the rubric) so raters apply them consistently.",
      "The task must be achievable by a candidate at or just below the target level so it discriminates effectively.",
      "Time allocation: approximate 1 minute per 10 words for lower levels, 1.5 min/10 words for B2+.",
    ],
    commonPitfalls: ["Prompts that reward volume over quality (leaving word-count as the only differentiator).", "Rubrics that mix genre knowledge and language knowledge criteria, penalising creative non-native interpretations.", "Missing context — candidates cannot produce appropriate register without knowing the purpose/recipient."],
    qualityIndicators: ["Inter-rater reliability κ ≥ 0.70 on a calibration set of 20+ scripts.", "Rubric applied independently by two trained raters; score reconciliation defined.", "Band descriptors clearly distinguish adjacent CEFR levels."],
  },
  {
    skill: "SPEAKING",
    principles: [
      "Prompts must generate speech — avoid yes/no questions; use 'Tell me about…', 'Describe…', 'What do you think about…?'.",
      "Topics must be universally accessible. Do not require specialist knowledge, familiarity with local events, or specific cultural practices.",
      "Allow planning time (30–60 seconds for B1+) before recording to separate language from planning ability.",
      "Scoring rubrics must cover the five CEFR speaking criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation, and (for C1/C2) Interaction.",
    ],
    commonPitfalls: ["Prompts that generate only memorised phrases (avoid common travel/hobby themes at C1/C2).", "Recording cut-off too short — candidates don't have enough time to demonstrate their level.", "Scoring pronunciation too harshly for non-native accented speech that is still intelligible."],
    qualityIndicators: ["Rater training includes 10+ anchor samples per level.", "Pronunciation criterion focuses on intelligibility, not native-like accent.", "Long-turn tasks allow ≥90 seconds at B2+."],
  },
  {
    skill: "GRAMMAR",
    principles: [
      "Each item must target a single, identifiable grammatical structure (not 'general correctness').",
      "The target structure must appear in the English Profile curriculum for the target CEFR level.",
      "Distractors should represent common developmental errors for the target L1 background if known, or common L2 English errors generally.",
      "Context sentences must be semantically transparent so that vocabulary does not interfere with grammar measurement.",
    ],
    commonPitfalls: ["Items where multiple options are grammatically equivalent — the 'correct' answer is a style preference, not a grammar rule.", "Stems measuring spelling rather than grammar knowledge.", "Testing grammar not yet in scope at the target level (construct misspecification)."],
    qualityIndicators: ["Tagged against English Profile grammar scope sequence.", "Distractor etymology: each distractor represents a specific error category (morphological, syntactic, L1 transfer).", "P-values stable across L1 backgrounds (no DIF by first language)."],
  },
  {
    skill: "VOCABULARY",
    principles: [
      "Target word must be retrievable from context for vocabulary-in-context items; the question tests whether the candidate can use context to achieve meaning.",
      "For receptive items, the correct definition must be clearly more accurate than distractors in the given context.",
      "For productive items (gap-fill), the answer must be the most natural / colocationally appropriate choice.",
      "Tag every item to a frequency band (K1, K2, AWL, K3-K9) and CEFR level based on English Profile data.",
    ],
    commonPitfalls: ["Correct answer is the only word the test-taker knows — this tests frequency band membership, not contextual knowledge.", "Synonyms as distractors that are also correct (especially when context is too narrow to disambiguate).", "Items using words from a specialised domain that biases against candidates without that background."],
    qualityIndicators: ["Word tagged to corpus frequency band.", "All distractors plausible but clearly wrong in context.", "Items reviewed by a lexicographer or corpus linguist."],
  },
];

export function getSkillItemGuidance(skill: MacroSkill): SkillItemGuidance | undefined {
  return SKILL_ITEM_GUIDANCE.find(g => g.skill === skill);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. IRT PARAMETER NORMS PER CEFR LEVEL
// ─────────────────────────────────────────────────────────────────────────────

export interface IrtParameterNorm {
  level: CefrLevel;
  /** Item discrimination: higher = better separation. Acceptable: 0.3–2.5; Good: 0.8–1.8 */
  a: { min: number; target: number; max: number };
  /** Item difficulty in theta units. Should match level's theta midpoint. */
  b: { min: number; target: number; max: number };
  /** Guessing parameter (lower asymptote). Typically 0.0–0.33 for 3PM, 0.25 for 4-option MCQ */
  c: { min: number; target: number; max: number };
  /** Classical difficulty p-value (proportion correct in calibration sample) */
  pValue: { min: number; target: number; max: number };
  /** Point-biserial discrimination */
  pointBiserial: { min: number; target: number; max: number };
}

export const IRT_PARAMETER_NORMS: IrtParameterNorm[] = [
  { level: "A1", a: { min: 0.3, target: 1.0, max: 2.5 }, b: { min: -4.0, target: -2.5, max: -1.5 }, c: { min: 0.0, target: 0.20, max: 0.33 }, pValue: { min: 0.55, target: 0.72, max: 0.90 }, pointBiserial: { min: 0.25, target: 0.40, max: 0.70 } },
  { level: "A2", a: { min: 0.3, target: 1.0, max: 2.5 }, b: { min: -2.5, target: -1.25, max: -0.5 }, c: { min: 0.0, target: 0.20, max: 0.33 }, pValue: { min: 0.50, target: 0.65, max: 0.85 }, pointBiserial: { min: 0.25, target: 0.40, max: 0.70 } },
  { level: "B1", a: { min: 0.3, target: 1.1, max: 2.5 }, b: { min: -1.0, target: 0.0, max: 0.5 }, c: { min: 0.0, target: 0.20, max: 0.30 }, pValue: { min: 0.45, target: 0.58, max: 0.80 }, pointBiserial: { min: 0.25, target: 0.40, max: 0.70 } },
  { level: "B2", a: { min: 0.3, target: 1.1, max: 2.5 }, b: { min: 0.0, target: 1.0, max: 1.5 }, c: { min: 0.0, target: 0.15, max: 0.28 }, pValue: { min: 0.35, target: 0.50, max: 0.72 }, pointBiserial: { min: 0.25, target: 0.40, max: 0.70 } },
  { level: "C1", a: { min: 0.3, target: 1.2, max: 2.5 }, b: { min: 1.0, target: 2.0, max: 2.5 }, c: { min: 0.0, target: 0.10, max: 0.20 }, pValue: { min: 0.25, target: 0.42, max: 0.65 }, pointBiserial: { min: 0.25, target: 0.40, max: 0.70 } },
  { level: "C2", a: { min: 0.3, target: 1.3, max: 2.5 }, b: { min: 2.0, target: 3.0, max: 4.0 }, c: { min: 0.0, target: 0.05, max: 0.15 }, pValue: { min: 0.15, target: 0.32, max: 0.55 }, pointBiserial: { min: 0.25, target: 0.40, max: 0.70 } },
];

export function getIrtNorm(level: CefrLevel): IrtParameterNorm | undefined {
  return IRT_PARAMETER_NORMS.find(n => n.level === level);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DISTRACTOR CONSTRUCTION TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────

export type DistractorType =
  | "PLAUSIBLE_SYNONYM"          // Correct semantic area, wrong in context
  | "WORD_FORM_ERROR"            // Wrong morphological form
  | "COLLOCATION_ERROR"          // Wrong collocate partner
  | "TENSE_ASPECT_ERROR"         // Wrong tense/aspect for context
  | "PRAGMATIC_ERROR"            // Grammatically correct but pragmatically wrong register
  | "FALSE_COGNATE"              // L1 false friend (if L1 is known)
  | "PARTIAL_INFO"               // Correct but incomplete/imprecise answer
  | "OPPOSITE"                   // Semantically reversed
  | "OUT_OF_SCOPE"               // True but not relevant to the question asked
  | "OVER_SPECIFIC"              // Too narrow an interpretation
  | "OVER_GENERAL"               // Too broad an interpretation
  | "MISCONCEPTION";             // Common learner misconception about the topic

export interface DistractorGuideline {
  type: DistractorType;
  description: string;
  useWhen: string;
  examplePattern: string;
}

export const DISTRACTOR_GUIDELINES: DistractorGuideline[] = [
  { type: "PLAUSIBLE_SYNONYM", description: "A word/phrase in the same semantic field but wrong in this specific context", useWhen: "Vocabulary or reading comprehension items", examplePattern: "e.g. 'happy' vs 'content' in a context distinguishing sustained vs momentary satisfaction" },
  { type: "WORD_FORM_ERROR", description: "Correct root, wrong part of speech or inflection", useWhen: "Grammar and vocabulary items", examplePattern: "e.g. 'decide' vs 'decision' in a sentence requiring a noun" },
  { type: "COLLOCATION_ERROR", description: "Word that commonly appears near the target but is not collocated here", useWhen: "Advanced vocabulary items (B2+)", examplePattern: "e.g. 'make a trip' vs 'do a trip' (correct: 'make a trip' in standard BrE/AmE)" },
  { type: "TENSE_ASPECT_ERROR", description: "Wrong temporal reference or aspect for the context", useWhen: "Grammar items targeting tense/aspect", examplePattern: "e.g. 'has gone' vs 'went' in a context specifying yesterday" },
  { type: "PRAGMATIC_ERROR", description: "Grammatically correct but inappropriate register, formality level, or social function", useWhen: "Writing/speaking feedback items, register items", examplePattern: "e.g. 'Yo!' as a greeting in a formal business letter opening" },
  { type: "PARTIAL_INFO", description: "True statement, but does not fully or correctly address the question", useWhen: "Comprehension detail and inference items", examplePattern: "e.g. 'The author mentions cost' when the question asks about the main argument (cost is mentioned but is not the main argument)" },
  { type: "OPPOSITE", description: "Semantically reversed distractor — what the test-taker might choose if they misread", useWhen: "At most one per item — powerful but easily spotted by test-wise candidates", examplePattern: "e.g. 'increased' when the text says 'decreased'" },
  { type: "OVER_SPECIFIC", description: "Too narrow — correct for a subset but not for the item as posed", useWhen: "Global or main-idea items", examplePattern: "e.g. 'The article argues nuclear energy is safe for France' when it argues it is safe for developed countries generally" },
  { type: "OVER_GENERAL", description: "Too broad — captures more than the text supports", useWhen: "Detail and inference items at B2+", examplePattern: "e.g. 'The author criticises all technology' when only social media is criticised" },
  { type: "MISCONCEPTION", description: "Represents a common, documented learner misconception about the topic or structure", useWhen: "Grammar items and domain-specific reading/listening", examplePattern: "e.g. Using present continuous for a state verb ('I am knowing him' instead of 'I know him')" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. BIAS AND FAIRNESS REVIEW CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

export interface BiasCheckItem {
  id: string;
  category: "gender" | "culture" | "religion" | "race_ethnicity" | "disability" | "socioeconomic" | "age" | "language_background";
  question: string;
  action: string;
}

export const BIAS_REVIEW_CHECKLIST: BiasCheckItem[] = [
  { id: "B-G01", category: "gender", question: "Does the item use gendered language unnecessarily?", action: "Replace he/she with they/their or use a proper name. Avoid professions associated with stereotyped genders." },
  { id: "B-G02", category: "gender", question: "Does the item portray women or men in stereotypical roles?", action: "Rephrase or choose a different scenario. Ensure equal distribution of gender roles in item bank." },
  { id: "B-C01", category: "culture", question: "Does the item require knowledge of a specific country's culture, laws, traditions, or history?", action: "Replace with globally neutral context or explicitly provide all necessary cultural context within the stimulus." },
  { id: "B-C02", category: "culture", question: "Does the item use idioms or cultural references that are not universally known?", action: "Replace with a more globally understood expression or include an explanation in the stimulus." },
  { id: "B-C03", category: "culture", question: "Does the topic privilege test-takers from particular geographic regions (e.g., US sports, UK royalty)?", action: "Use universally accessible topics (nature, technology, general science, global issues)." },
  { id: "B-R01", category: "religion", question: "Does the item reference religious practices, beliefs, or holidays?", action: "Avoid unless the test specifically assesses intercultural awareness and all religions are treated equitably." },
  { id: "B-RE01", category: "race_ethnicity", question: "Does the item use names that could identify a specific ethnic group in a way that may cause bias?", action: "Use a diverse range of names across the item bank. Avoid names strongly associated with stereotypes." },
  { id: "B-D01", category: "disability", question: "Does the item assume physical or cognitive abilities not measured by the construct being assessed?", action: "Ensure accessibility: do not assume colour vision (charts), fine motor skills, or specific sensory abilities." },
  { id: "B-SE01", category: "socioeconomic", question: "Does the item topic or vocabulary assume wealth, travel experience, or access to higher education?", action: "Avoid scenarios involving private yachts, exclusive clubs, or luxury goods not relevant to the construct." },
  { id: "B-A01", category: "age", question: "Does the item use references to pop culture, music, or technology that strongly favours a specific age group?", action: "Use timeless or broadly familiar cultural references. Check that dates are not time-sensitive in 5+ years." },
  { id: "B-L01", category: "language_background", question: "Does the item strongly advantage test-takers from a particular L1 background (e.g. through false cognates)?", action: "Pilot with multiple L1 groups. Run DIF analysis by L1 category post-administration." },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. AI ITEM GENERATION PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemGenerationSpec {
  skill: MacroSkill;
  level: CefrLevel;
  format: ItemFormat;
  genre?: TextGenre;
  topic?: string;
  targetSubSkill?: string;
  language?: "en-GB" | "en-US";
  quantity?: number;
}

/**
 * Builds a detailed Gemini / GPT-4 prompt for CEFR-aligned item generation.
 * Integrates: writing guidelines, IRT norms, bias checklist, skill-specific principles.
 */
export function buildItemGenerationPrompt(spec: ItemGenerationSpec): string {
  const { skill, level, format, genre, topic, targetSubSkill, language = "en-GB", quantity = 1 } = spec;
  const irtNorm = getIrtNorm(level);
  const formatSpec = getItemFormatSpec(format);
  const skillGuidance = getSkillItemGuidance(skill);

  return `
You are a senior language test development specialist with 20+ years experience writing CEFR-aligned EFL/ESL items for Cambridge Assessment, IELTS, and B4Skills.
Your task: generate ${quantity} high-quality assessment item(s) meeting ALL specifications below.

═══════════════════════════════════════════════
ITEM SPECIFICATION
═══════════════════════════════════════════════
• Skill:        ${skill}
• CEFR Level:   ${level}
• Item Format:  ${format} (${formatSpec?.label ?? format})
• Text Genre:   ${genre ?? "Appropriate for skill/level"}
• Topic Domain: ${topic ?? "Neutral, universally accessible topic"}
• Sub-Skill:    ${targetSubSkill ?? "General " + skill.toLowerCase() + " proficiency"}
• Variety:      ${language}

═══════════════════════════════════════════════
IRT PARAMETER TARGETS (for calibration tagging)
═══════════════════════════════════════════════
${irtNorm ? `
• Discrimination (a): target ${irtNorm.a.target} [acceptable: ${irtNorm.a.min}–${irtNorm.a.max}]
• Difficulty (b):     target ${irtNorm.b.target} logits [acceptable: ${irtNorm.b.min}–${irtNorm.b.max}]
• Guessing (c):       target ${irtNorm.c.target} [maximum: ${irtNorm.c.max}]
• Classical p-value:  target ${irtNorm.pValue.target} [acceptable: ${irtNorm.pValue.min}–${irtNorm.pValue.max}]
Note: A well-written item at this level should have a p-value around ${irtNorm.pValue.target}.
` : "• Use standard IRT targets for the specified level."}

═══════════════════════════════════════════════
ITEM WRITING RULES (MUST FOLLOW)
═══════════════════════════════════════════════
Universal rules:
${UNIVERSAL_ITEM_WRITING_GUIDELINES.filter(g => g.severity === "critical").map(g => `• [CRITICAL] ${g.rule}`).join("\n")}

Skill-specific rules for ${skill}:
${skillGuidance?.principles.map(p => `• ${p}`).join("\n") ?? "• Follow standard good item-writing practice."}

Common pitfalls to AVOID:
${skillGuidance?.commonPitfalls.map(p => `• AVOID: ${p}`).join("\n") ?? ""}

═══════════════════════════════════════════════
BIAS & FAIRNESS (MANDATORY)
═══════════════════════════════════════════════
• No gendered language. Use 'they/their' or a name.
• Topic must be globally accessible — no country-specific culture, religion, or local laws.
• No references to disability, illness, violence, or trauma unless the test spec requires it.
• Represent diverse names and settings.

═══════════════════════════════════════════════
FORMAT SPECIFICATION
═══════════════════════════════════════════════
${formatSpec ? `
• Scoring:           ${formatSpec.scoringType}
• Cognitive load:    ${formatSpec.cognitiveLoad}
• Options (if MCQ):  ${formatSpec.optionCount ?? "N/A"}
• Notes:             ${formatSpec.administrativeNotes}
` : "• Follow standard format for the item type."}

═══════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════
Return an ARRAY of ${quantity} item object(s) with EXACTLY these fields:
[
  {
    "type": "${format}",
    "skill": "${skill}",
    "cefrLevel": "${level}",
    "subSkill": "one of the recognised sub-skills for ${skill}",
    "stimulus": "The reading/listening text or writing/speaking prompt",
    "question": "The question stem (if applicable — null for writing/speaking tasks)",
    "options": ["A", "B", "C", "D"],       // null for constructed-response
    "correctAnswer": "A",                  // null for holistic scoring tasks
    "acceptableAnswers": ["A", "a"],        // for open gap-fill variants
    "answerKey": "Explanation of why the correct answer is correct",
    "distractorRationale": {
      "B": "Why this is plausible but incorrect — which error type it exploits",
      "C": "...",
      "D": "..."
    },
    "irtParams": {
      "a": ${irtNorm?.a.target ?? 1.0},
      "b": ${irtNorm?.b.target ?? 0.0},
      "c": ${irtNorm?.c.target ?? 0.20}
    },
    "biasReview": "Brief note confirming bias checklist compliance",
    "writingNotes": "Any item-writer notes about difficulty, adaptation source, or calibration guidance"
  }
]

IMPORTANT: Return ONLY the JSON array. No preamble, no explanation, no markdown code fences.
`.trim();
}
