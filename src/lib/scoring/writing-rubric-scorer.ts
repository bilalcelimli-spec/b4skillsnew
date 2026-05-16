/**
 * Writing Rubric Dimension Scorer
 *
 * Breaks holistic writing scores into four Cambridge-aligned CEFR rubric
 * dimensions, each scored independently on a 0–5 scale:
 *
 *   1. Content          — task achievement, relevance, development of ideas
 *   2. Communicative Achievement — register, format, effect on target reader
 *   3. Organisation     — coherence, cohesion, paragraph structure, sequencing
 *   4. Language         — grammar range & accuracy, vocabulary range & precision
 *
 * These dimensions map to the Cambridge B1 Preliminary, B2 First, C1 Advanced,
 * and C2 Proficiency writing mark schemes (Cambridge Assessment 2022).
 *
 * Scoring approach
 * ----------------
 * Input is the Gemini scoring response (structured JSON prompt output) plus
 * the raw essay text for feature extraction. Dimensions are computed via:
 *   - Linguistic feature extraction (lexical density, sentence complexity,
 *     cohesive device count, error flag counts) for Content/Organisation/Language
 *   - Gemini's holistic score + discourse/register features for Communicative Achievement
 *
 * Each dimension score is accompanied by:
 *   - A CEFR descriptor string ("Presents clear ideas with good development")
 *   - Specific improvement suggestions
 *   - A comparison to the benchmark for the predicted CEFR band
 *
 * References
 * ----------
 * Cambridge Assessment English (2022). Cambridge English: B2 First Examiner's
 *   Handbook. Cambridge University Press.
 * Weir, C. J. (2005). Language Testing and Validation: An Evidence-Based Approach.
 *   Palgrave Macmillan.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WritingDimensionScore {
  /** Raw score 0.0–5.0 */
  score: number;
  /** CEFR-aligned descriptor for the achieved level */
  descriptor: string;
  /** Actionable improvement suggestion */
  suggestion: string;
  /** Normalised to 0–1 for display */
  normalised: number;
}

export interface WritingRubricResult {
  content: WritingDimensionScore;
  communicativeAchievement: WritingDimensionScore;
  organisation: WritingDimensionScore;
  language: WritingDimensionScore;
  /** Weighted composite 0–5 (Content 0.25, CA 0.25, Org 0.25, Lang 0.25) */
  compositeScore: number;
  /** Predicted CEFR band from composite */
  predictedCefr: string;
  /** Total word count of the essay */
  wordCount: number;
}

export interface GeminiWritingFeatures {
  /** Holistic score from Gemini (0–10) */
  holisticScore: number;
  /** Register appropriateness (0–10) */
  registerScore: number;
  /** Task completion (0–10) */
  taskCompletionScore: number;
  /** Grammar accuracy (0–10) */
  grammarScore: number;
  /** Vocabulary range (0–10) */
  vocabularyScore: number;
  /** Coherence / discourse structure (0–10) */
  coherenceScore: number;
}

// ─── Linguistic feature extractors ───────────────────────────────────────────

const COHESIVE_DEVICES = [
  "furthermore", "moreover", "however", "nevertheless", "consequently",
  "therefore", "in addition", "in contrast", "on the other hand",
  "as a result", "firstly", "secondly", "finally", "in conclusion",
  "to summarise", "for instance", "for example", "in particular",
  "although", "despite", "whereas", "meanwhile", "subsequently",
];

const DISCOURSE_MARKERS = [
  "this", "these", "those", "such", "the former", "the latter",
  "the above", "accordingly", "hence", "thus", "owing to",
];

const ERROR_PATTERNS = [
  /\bi (is|are|was|were)\b/gi,           // subject-verb agreement error
  /\b(they|we|i) has\b/gi,               // agreement error
  /\ba [aeiou]/gi,                       // "a apple" vs "an apple"
  /\bvery very\b/gi,                     // redundancy
  /\b(\w+)\s+\1\b/gi,                   // word repetition
];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(w => w.length > 1);
}

function sentenceCount(text: string): number {
  return Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
}

function lexicalDensity(tokens: string[]): number {
  const contentWords = tokens.filter(t => t.length > 3);
  return tokens.length > 0 ? contentWords.length / tokens.length : 0;
}

function uniqueTokenRatio(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

function countCohesiveDevices(text: string): number {
  const lower = text.toLowerCase();
  return COHESIVE_DEVICES.filter(d => lower.includes(d)).length;
}

function countDiscourseMarkers(text: string): number {
  const lower = text.toLowerCase();
  return DISCOURSE_MARKERS.filter(d => lower.includes(d)).length;
}

function estimateErrorCount(text: string): number {
  let count = 0;
  for (const pattern of ERROR_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

function avgSentenceLength(tokens: string[], text: string): number {
  const sentences = sentenceCount(text);
  return tokens.length / sentences;
}

function paragraphCount(text: string): number {
  return Math.max(1, text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length);
}

// ─── Band descriptors ─────────────────────────────────────────────────────────

const CONTENT_DESCRIPTORS: Record<number, string> = {
  5: "Fully achieves the task with well-developed, highly relevant ideas throughout.",
  4: "Achieves the task with clearly developed, relevant ideas and minor omissions.",
  3: "Generally achieves the task; most points covered though some ideas underdeveloped.",
  2: "Partially achieves the task; limited development of ideas with some irrelevance.",
  1: "Attempts the task but with minimal relevant content or significant gaps.",
  0: "Does not achieve the task; content is irrelevant or absent.",
};

const CA_DESCRIPTORS: Record<number, string> = {
  5: "Consistent and effective use of register; engages target reader throughout.",
  4: "Mostly appropriate register with clear communicative effect.",
  3: "Generally appropriate register; some inconsistency or limited effect.",
  2: "Some attempt at appropriate register but limited communicative effect.",
  1: "Mostly inappropriate register; reader impact is minimal.",
  0: "No evidence of awareness of register or communicative purpose.",
};

const ORG_DESCRIPTORS: Record<number, string> = {
  5: "Well-organised with effective use of cohesive devices; clear development.",
  4: "Generally well-organised; good use of cohesive devices with minor lapses.",
  3: "Some organisation evident; cohesive devices present but not always effective.",
  2: "Limited organisation; cohesive devices used, often repetitively or incorrectly.",
  1: "Minimal organisation; few cohesive devices; reader may struggle to follow.",
  0: "No discernible organisation or use of cohesive devices.",
};

const LANG_DESCRIPTORS: Record<number, string> = {
  5: "Wide range of structures and vocabulary used accurately and appropriately.",
  4: "Good range of structures and vocabulary; minor errors that do not impede.",
  3: "Adequate range with some errors; communication maintained throughout.",
  2: "Limited range; errors present but message is generally clear.",
  1: "Very limited range; frequent errors impede communication.",
  0: "Inadequate language control; communication severely impeded.",
};

function descriptorForScore(score: number, table: Record<number, string>): string {
  const band = Math.max(0, Math.min(5, Math.round(score)));
  return table[band] ?? table[0]!;
}

// ─── Dimension scoring ────────────────────────────────────────────────────────

function scoreContent(
  features: GeminiWritingFeatures,
  tokens: string[],
  text: string
): WritingDimensionScore {
  // Task completion from Gemini (primary signal) + idea development proxy
  const taskBase = features.taskCompletionScore / 10 * 4.5;
  const devBonus = tokens.length >= 150 ? 0.5 : tokens.length >= 100 ? 0.25 : 0;
  const score = Math.min(5, Number((taskBase + devBonus).toFixed(1)));

  const suggestion = score >= 4
    ? "Maintain your current level of task coverage and idea development."
    : score >= 3
    ? "Develop each point more fully — aim for at least 2 supporting details per idea."
    : "Ensure all bullet points / requirements from the task are addressed. Add specific examples.";

  return { score, descriptor: descriptorForScore(score, CONTENT_DESCRIPTORS), suggestion, normalised: score / 5 };
}

function scoreCommunicativeAchievement(
  features: GeminiWritingFeatures,
  tokens: string[],
  text: string
): WritingDimensionScore {
  const registerBase = features.registerScore / 10 * 3.5;
  // Lexical density as proxy for appropriate academic register
  const density = lexicalDensity(tokens);
  const densityBonus = density >= 0.60 ? 1.0 : density >= 0.50 ? 0.75 : density >= 0.40 ? 0.50 : 0.25;
  const score = Math.min(5, Number((registerBase + densityBonus * 0.5 + (features.holisticScore / 10) * 1.0).toFixed(1)));

  const suggestion = score >= 4
    ? "Your register is well-calibrated to the task type. Continue adapting tone to context."
    : score >= 3
    ? "Ensure your tone is consistent — avoid mixing formal and informal language within the same piece."
    : "Study the expected register for the task type (formal letter, essay, report) and maintain it throughout.";

  return { score, descriptor: descriptorForScore(score, CA_DESCRIPTORS), suggestion, normalised: score / 5 };
}

function scoreOrganisation(
  features: GeminiWritingFeatures,
  tokens: string[],
  text: string
): WritingDimensionScore {
  const cohesionBase = features.coherenceScore / 10 * 3.0;
  const deviceCount = countCohesiveDevices(text);
  const markerCount = countDiscourseMarkers(text);
  const paraCount = paragraphCount(text);

  const deviceBonus = Math.min(1.0, deviceCount / 6);
  const paraBonus = paraCount >= 3 ? 0.5 : paraCount >= 2 ? 0.25 : 0;
  const markerBonus = Math.min(0.5, markerCount / 4 * 0.5);

  const score = Math.min(5, Number((cohesionBase + deviceBonus + paraBonus + markerBonus).toFixed(1)));

  const suggestion = score >= 4
    ? "Organisation is strong. For top-band performance, ensure every paragraph has a clear topic sentence."
    : score >= 3
    ? `Use more variety in cohesive devices. Currently detected ${deviceCount} — aim for 8+ across the essay.`
    : "Structure your response clearly: introduction → main body (2–3 paragraphs) → conclusion. Use a new paragraph for each main idea.";

  return { score, descriptor: descriptorForScore(score, ORG_DESCRIPTORS), suggestion, normalised: score / 5 };
}

function scoreLanguage(
  features: GeminiWritingFeatures,
  tokens: string[],
  text: string
): WritingDimensionScore {
  const grammarBase = features.grammarScore / 10 * 2.5;
  const vocabBase = features.vocabularyScore / 10 * 2.0;
  const errorCount = estimateErrorCount(text);
  const errorPenalty = Math.min(1.0, errorCount * 0.2);
  const diversityBonus = Math.min(0.5, uniqueTokenRatio(tokens) * 0.8);

  const score = Math.min(5, Math.max(0, Number((grammarBase + vocabBase + diversityBonus - errorPenalty).toFixed(1))));

  const suggestion = score >= 4
    ? "Language control is good. Extend your grammatical range with complex structures (conditionals, passive, reduced relatives)."
    : score >= 3
    ? "Focus on accuracy in subject-verb agreement and article use. Expand vocabulary by avoiding repetition."
    : "Prioritise basic grammar accuracy: check your verb tenses and sentence structure before submitting.";

  return { score, descriptor: descriptorForScore(score, LANG_DESCRIPTORS), suggestion, normalised: score / 5 };
}

// ─── CEFR band prediction ─────────────────────────────────────────────────────

function predictCefrFromComposite(composite: number): string {
  if (composite >= 4.5) return "C2";
  if (composite >= 3.5) return "C1";
  if (composite >= 2.5) return "B2";
  if (composite >= 1.5) return "B1";
  if (composite >= 0.75) return "A2";
  if (composite >= 0.25) return "A1";
  return "PRE_A1";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Score a writing response across all four Cambridge rubric dimensions.
 *
 * @param features  Structured scoring features from Gemini
 * @param text      Raw essay text (for linguistic feature extraction)
 */
export function scoreWritingRubric(
  features: GeminiWritingFeatures,
  text: string
): WritingRubricResult {
  const tokens = tokenize(text);
  const wordCount = tokens.length;

  const content = scoreContent(features, tokens, text);
  const communicativeAchievement = scoreCommunicativeAchievement(features, tokens, text);
  const organisation = scoreOrganisation(features, tokens, text);
  const language = scoreLanguage(features, tokens, text);

  // Equal weights (0.25 each) — can be adjusted per product line
  const compositeScore = Number(
    ((content.score + communicativeAchievement.score + organisation.score + language.score) / 4)
      .toFixed(2)
  );

  return {
    content,
    communicativeAchievement,
    organisation,
    language,
    compositeScore,
    predictedCefr: predictCefrFromComposite(compositeScore),
    wordCount,
  };
}
