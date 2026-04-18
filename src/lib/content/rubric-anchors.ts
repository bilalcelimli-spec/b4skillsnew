/**
 * Rubric Standardization & Anchor Response System
 * 
 * Provides benchmark responses at each CEFR level for consistent scoring.
 * Used to calibrate human raters and AI scoring models.
 */

import { SkillType } from "../assessment-engine/types";

export interface AnchorResponse {
  id: string;
  skill: SkillType;
  cefrLevel: string;
  /** The prompt/task that was given */
  prompt: string;
  /** The anchor response text */
  responseText: string;
  /** Expected score (0-100) */
  expectedScore: number;
  /** Detailed rubric annotations */
  annotations: RubricAnnotation[];
  /** Why this score was assigned */
  justification: string;
}

export interface RubricAnnotation {
  criterion: string;
  band: number;
  maxBand: number;
  evidence: string[];
  comment: string;
}

export interface ScoringRubric {
  skill: SkillType;
  criteria: RubricCriterion[];
  totalBands: number;
}

export interface RubricCriterion {
  name: string;
  weight: number;
  bands: RubricBand[];
}

export interface RubricBand {
  band: number;
  cefrRange: string;
  descriptor: string;
  examples: string[];
}

// ========== WRITING RUBRIC ==========

export const WRITING_RUBRIC: ScoringRubric = {
  skill: SkillType.WRITING,
  totalBands: 6,
  criteria: [
    {
      name: "Task Achievement",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "Barely addresses the task. Very limited content.", examples: ["I like cat. Cat is nice."] },
        { band: 2, cefrRange: "A2", descriptor: "Partially addresses the task with limited development.", examples: ["I think pets are good. Dogs are friendly. I have a dog."] },
        { band: 3, cefrRange: "B1", descriptor: "Addresses the task adequately with some development and support.", examples: ["Pets can improve people's lives because they provide companionship and help reduce stress."] },
        { band: 4, cefrRange: "B2", descriptor: "Addresses all parts of the task with clear development and relevant examples.", examples: ["Research has consistently shown that pet ownership correlates with lower blood pressure and reduced anxiety levels."] },
        { band: 5, cefrRange: "C1", descriptor: "Fully addresses the task with well-developed arguments and nuanced support.", examples: ["While the therapeutic benefits of animal-assisted interventions are well-documented, it is important to consider the ethical implications of commodifying animal companionship."] },
        { band: 6, cefrRange: "C2", descriptor: "Sophisticated, nuanced response that demonstrates mastery of the topic.", examples: [] },
      ],
    },
    {
      name: "Coherence & Cohesion",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "No logical organization. Isolated sentences.", examples: [] },
        { band: 2, cefrRange: "A2", descriptor: "Basic linking words (and, but, because). Simple sequencing.", examples: [] },
        { band: 3, cefrRange: "B1", descriptor: "Clear paragraph structure. Uses discourse markers appropriately.", examples: [] },
        { band: 4, cefrRange: "B2", descriptor: "Well-organized with effective use of cohesive devices. Clear progression of ideas.", examples: [] },
        { band: 5, cefrRange: "C1", descriptor: "Skillful paragraphing with sophisticated cohesion. Manages complex argumentation.", examples: [] },
        { band: 6, cefrRange: "C2", descriptor: "Effortless flow with masterful use of cohesive devices. Rhetorically effective.", examples: [] },
      ],
    },
    {
      name: "Lexical Resource",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "Very basic vocabulary. Frequent repetition.", examples: [] },
        { band: 2, cefrRange: "A2", descriptor: "Limited vocabulary adequate for familiar topics.", examples: [] },
        { band: 3, cefrRange: "B1", descriptor: "Sufficient vocabulary for the task. Some collocational awareness.", examples: [] },
        { band: 4, cefrRange: "B2", descriptor: "Wide vocabulary used precisely. Good use of less common items.", examples: [] },
        { band: 5, cefrRange: "C1", descriptor: "Sophisticated vocabulary with natural collocation and idiomatic usage.", examples: [] },
        { band: 6, cefrRange: "C2", descriptor: "Full, flexible command of a wide range of vocabulary with precision.", examples: [] },
      ],
    },
    {
      name: "Grammatical Range & Accuracy",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "Very basic structures with frequent errors.", examples: [] },
        { band: 2, cefrRange: "A2", descriptor: "Simple structures mostly accurate. Limited range.", examples: [] },
        { band: 3, cefrRange: "B1", descriptor: "Mix of simple and complex structures. Errors don't impede communication.", examples: [] },
        { band: 4, cefrRange: "B2", descriptor: "Good range of structures. Majority error-free. Complex sentences used effectively.", examples: [] },
        { band: 5, cefrRange: "C1", descriptor: "Wide range of structures used flexibly and accurately. Rare errors.", examples: [] },
        { band: 6, cefrRange: "C2", descriptor: "Full range of structures used naturally. Error-free or near error-free.", examples: [] },
      ],
    },
  ],
};

// ========== SPEAKING RUBRIC ==========

export const SPEAKING_RUBRIC: ScoringRubric = {
  skill: SkillType.SPEAKING,
  totalBands: 6,
  criteria: [
    {
      name: "Fluency & Coherence",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "Very slow, hesitant. Isolated words/phrases.", examples: [] },
        { band: 2, cefrRange: "A2", descriptor: "Noticeable pauses. Simple linking. Limited ability to elaborate.", examples: [] },
        { band: 3, cefrRange: "B1", descriptor: "Maintains flow with some hesitation. Can develop responses with prompting.", examples: [] },
        { band: 4, cefrRange: "B2", descriptor: "Speaks fluently with occasional hesitation. Develops topics coherently.", examples: [] },
        { band: 5, cefrRange: "C1", descriptor: "Speaks fluently and spontaneously with rare hesitation. Well-structured discourse.", examples: [] },
        { band: 6, cefrRange: "C2", descriptor: "Effortless fluency. Natural discourse management. Restructures spontaneously.", examples: [] },
      ],
    },
    {
      name: "Lexical Resource",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "Very limited vocabulary for basic personal information.", examples: [] },
        { band: 2, cefrRange: "A2", descriptor: "Sufficient vocabulary for familiar topics. Some paraphrasing.", examples: [] },
        { band: 3, cefrRange: "B1", descriptor: "Adequate vocabulary for discussion. Some less common items.", examples: [] },
        { band: 4, cefrRange: "B2", descriptor: "Flexible vocabulary including idiomatic language and collocation.", examples: [] },
        { band: 5, cefrRange: "C1", descriptor: "Wide vocabulary used precisely and naturally. Paraphrases effectively.", examples: [] },
        { band: 6, cefrRange: "C2", descriptor: "Full, flexible command across all topics. Precise, nuanced usage.", examples: [] },
      ],
    },
    {
      name: "Grammatical Range & Accuracy",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "Basic memorized phrases. Frequent errors.", examples: [] },
        { band: 2, cefrRange: "A2", descriptor: "Simple structures. Errors frequent but meaning clear.", examples: [] },
        { band: 3, cefrRange: "B1", descriptor: "Reasonable accuracy in familiar contexts. Some complex forms attempted.", examples: [] },
        { band: 4, cefrRange: "B2", descriptor: "Good control of complex structures. Errors rare and self-corrected.", examples: [] },
        { band: 5, cefrRange: "C1", descriptor: "Consistent accuracy with complex structures. Occasional slips only.", examples: [] },
        { band: 6, cefrRange: "C2", descriptor: "Maintains full accuracy consistently. Natural use of all structures.", examples: [] },
      ],
    },
    {
      name: "Pronunciation",
      weight: 0.25,
      bands: [
        { band: 1, cefrRange: "A1", descriptor: "Very limited control. Frequent mispronunciation causes strain.", examples: [] },
        { band: 2, cefrRange: "A2", descriptor: "Generally intelligible. L1 influence noticeable.", examples: [] },
        { band: 3, cefrRange: "B1", descriptor: "Generally clear. Some phonological features used effectively.", examples: [] },
        { band: 4, cefrRange: "B2", descriptor: "Clear pronunciation with effective use of stress and intonation.", examples: [] },
        { band: 5, cefrRange: "C1", descriptor: "Natural pronunciation with accurate stress, rhythm and intonation.", examples: [] },
        { band: 6, cefrRange: "C2", descriptor: "Precise, subtle use of phonological features for emphasis and nuance.", examples: [] },
      ],
    },
  ],
};

/**
 * Score a response against a rubric
 */
export function scoreAgainstRubric(
  rubric: ScoringRubric,
  criterionScores: { criterion: string; band: number }[]
): {
  totalScore: number;
  weightedScore: number;
  cefrEstimate: string;
  breakdown: { criterion: string; band: number; weight: number; contribution: number }[];
} {
  const breakdown: { criterion: string; band: number; weight: number; contribution: number }[] = [];
  let weightedSum = 0;

  for (const cs of criterionScores) {
    const criterion = rubric.criteria.find(c => c.name === cs.criterion);
    if (!criterion) continue;
    const contribution = cs.band * criterion.weight;
    weightedSum += contribution;
    breakdown.push({
      criterion: cs.criterion,
      band: cs.band,
      weight: criterion.weight,
      contribution,
    });
  }

  const maxScore = rubric.totalBands;
  const totalScore = weightedSum;
  const normalized = (totalScore / maxScore) * 100;

  // Map to CEFR
  let cefrEstimate = "A1";
  if (totalScore >= 5.5) cefrEstimate = "C2";
  else if (totalScore >= 4.5) cefrEstimate = "C1";
  else if (totalScore >= 3.5) cefrEstimate = "B2";
  else if (totalScore >= 2.5) cefrEstimate = "B1";
  else if (totalScore >= 1.5) cefrEstimate = "A2";

  return {
    totalScore: Number(totalScore.toFixed(2)),
    weightedScore: Number(normalized.toFixed(1)),
    cefrEstimate,
    breakdown,
  };
}

/**
 * Get anchor responses for rater training/calibration
 */
export function getAnchorResponses(skill: SkillType, cefrLevel?: string): AnchorResponse[] {
  const anchors = ANCHOR_RESPONSES.filter(a => a.skill === skill);
  if (cefrLevel) return anchors.filter(a => a.cefrLevel === cefrLevel);
  return anchors;
}

// Sample anchor responses (abbreviated; in production, these would be in the DB)
const ANCHOR_RESPONSES: AnchorResponse[] = [
  {
    id: "anchor_w_a2_1",
    skill: SkillType.WRITING,
    cefrLevel: "A2",
    prompt: "Write about your favorite hobby. (50-80 words)",
    responseText: "My favorite hobby is play football. I play every weekend with my friends. We go to park near my house. Football is very exciting and fun. I like score goals. Sometimes we win, sometimes we lose but always we happy. I want play football more.",
    expectedScore: 33,
    annotations: [
      { criterion: "Task Achievement", band: 2, maxBand: 6, evidence: ["addresses topic", "limited development"], comment: "Basic description with minimal elaboration" },
      { criterion: "Coherence & Cohesion", band: 2, maxBand: 6, evidence: ["simple sequencing"], comment: "Connected but basic structure" },
      { criterion: "Lexical Resource", band: 2, maxBand: 6, evidence: ["basic vocabulary", "repetition of 'play'"], comment: "Limited range" },
      { criterion: "Grammatical Range & Accuracy", band: 2, maxBand: 6, evidence: ["missing articles", "verb form errors ('is play')"], comment: "Simple structures with frequent errors" },
    ],
    justification: "Consistent A2 performance across all criteria. Basic communication achieved but limited range and accuracy.",
  },
  {
    id: "anchor_w_b2_1",
    skill: SkillType.WRITING,
    cefrLevel: "B2",
    prompt: "Some people believe that technology has made our lives easier. Others argue it has created new problems. Discuss both views. (200-250 words)",
    responseText: "Technology has undoubtedly transformed the way we live, and while many people celebrate the convenience it brings, others raise valid concerns about its impact on society.\n\nOn the one hand, technology has made daily tasks significantly easier. For instance, online banking allows us to manage our finances without visiting a branch, and communication apps enable us to stay connected with people across the world instantly. Moreover, advances in medical technology have led to improved treatments and higher life expectancy.\n\nOn the other hand, our increasing dependence on technology has created several problems. Many people find themselves addicted to their smartphones, which can lead to reduced face-to-face interaction and mental health issues such as anxiety. Furthermore, the rise of automation threatens jobs in various industries, creating economic uncertainty for many workers.\n\nIn my opinion, while technology certainly brings challenges, the benefits outweigh the drawbacks provided we use it responsibly. Education about digital well-being and appropriate regulation can help us maximise the advantages while minimising the negative effects.",
    expectedScore: 67,
    annotations: [
      { criterion: "Task Achievement", band: 4, maxBand: 6, evidence: ["both views discussed", "clear position", "relevant examples"], comment: "Addresses all parts with clear development" },
      { criterion: "Coherence & Cohesion", band: 4, maxBand: 6, evidence: ["clear paragraphing", "discourse markers: 'On the one hand', 'Moreover', 'Furthermore'"], comment: "Well-organized with effective cohesion" },
      { criterion: "Lexical Resource", band: 4, maxBand: 6, evidence: ["'undoubtedly', 'automation', 'digital well-being'"], comment: "Good range with less common items" },
      { criterion: "Grammatical Range & Accuracy", band: 4, maxBand: 6, evidence: ["complex sentences", "passive voice", "conditionals"], comment: "Good range, mostly accurate" },
    ],
    justification: "Solid B2 performance. Clear argumentation with good vocabulary range and grammatical accuracy.",
  },
];
