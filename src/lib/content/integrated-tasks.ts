/**
 * Integrated Task Framework
 * 
 * Supports multi-skill assessment tasks that simulate real-world language use:
 * - READ_THEN_WRITE: Read a passage, then write a summary/response
 * - LISTEN_THEN_SPEAK: Listen to audio, then provide spoken response
 * - READ_THEN_SPEAK: Read a passage, then discuss it orally
 * - MULTI_SOURCE: Compare two sources and write analysis
 * 
 * These tasks are scored as composite items with sub-scores for each skill dimension.
 */

export type IntegratedTaskType = 
  | "READ_THEN_WRITE"
  | "LISTEN_THEN_SPEAK"
  | "READ_THEN_SPEAK"
  | "MULTI_SOURCE";

export interface IntegratedTaskSpec {
  type: IntegratedTaskType;
  cefrLevel: string;
  /** Receptive phase (reading/listening) */
  receptivePhase: {
    skill: "READING" | "LISTENING";
    passage?: string;
    audioUrl?: string;
    comprehensionQuestions?: Array<{
      prompt: string;
      options?: string[];
      correctIndex?: number;
    }>;
    timeLimit?: number; // seconds for receptive phase
  };
  /** Productive phase (writing/speaking) */
  productivePhase: {
    skill: "WRITING" | "SPEAKING";
    prompt: string;
    rubric: string;
    minWords?: number;
    maxTime?: number;
  };
  /** Scoring weights for composite score */
  weights: {
    comprehension: number; // 0-1
    production: number;    // 0-1
  };
}

export interface IntegratedTaskResponse {
  comprehensionAnswers?: number[];
  productiveResponse: string | { audio: string; mimeType: string };
}

export interface IntegratedTaskScore {
  comprehensionScore: number;  // 0-1
  productionScore: number;     // 0-1
  compositeScore: number;      // weighted average
  subScores: {
    comprehension?: {
      correct: number;
      total: number;
      accuracy: number;
    };
    production?: {
      grammar: number;
      vocabulary: number;
      coherence: number;
      taskAchievement: number;
      fluency?: number;
    };
  };
}

/**
 * Template integrated tasks by CEFR level
 */
export const INTEGRATED_TASK_TEMPLATES: Record<string, IntegratedTaskSpec[]> = {
  B1: [
    {
      type: "READ_THEN_WRITE",
      cefrLevel: "B1",
      receptivePhase: {
        skill: "READING",
        passage: "",  // Populated from stimulus bank
        comprehensionQuestions: [],
        timeLimit: 300,
      },
      productivePhase: {
        skill: "WRITING",
        prompt: "Based on the passage you read, write a summary of the main ideas in 100-150 words.",
        rubric: "Assess: accurate comprehension of main ideas, clear paraphrasing (not copying), appropriate vocabulary for B1 level, basic coherence and organization.",
        minWords: 80,
      },
      weights: { comprehension: 0.3, production: 0.7 },
    },
    {
      type: "LISTEN_THEN_SPEAK",
      cefrLevel: "B1",
      receptivePhase: {
        skill: "LISTENING",
        audioUrl: "",
        comprehensionQuestions: [],
        timeLimit: 180,
      },
      productivePhase: {
        skill: "SPEAKING",
        prompt: "Summarize the main points of what you heard and give your opinion.",
        rubric: "Assess: accurate recall of key information, clear expression of opinion, appropriate B1-level grammar and vocabulary, reasonable fluency.",
        maxTime: 90,
      },
      weights: { comprehension: 0.3, production: 0.7 },
    },
  ],
  B2: [
    {
      type: "MULTI_SOURCE",
      cefrLevel: "B2",
      receptivePhase: {
        skill: "READING",
        passage: "",
        comprehensionQuestions: [],
        timeLimit: 480,
      },
      productivePhase: {
        skill: "WRITING",
        prompt: "Compare and contrast the two perspectives presented. Which do you find more convincing and why? Write 200-250 words.",
        rubric: "Assess: clear comparison of both sources, evidence-based argumentation, B2-level academic vocabulary, complex sentence structures, coherent essay structure with introduction and conclusion.",
        minWords: 180,
      },
      weights: { comprehension: 0.25, production: 0.75 },
    },
    {
      type: "READ_THEN_SPEAK",
      cefrLevel: "B2",
      receptivePhase: {
        skill: "READING",
        passage: "",
        comprehensionQuestions: [],
        timeLimit: 300,
      },
      productivePhase: {
        skill: "SPEAKING",
        prompt: "Discuss the implications of the argument presented in the passage. Do you agree or disagree? Support your answer with examples.",
        rubric: "Assess: clear position with supporting arguments, accurate reference to passage, B2-level vocabulary and grammar, reasonable fluency and pronunciation.",
        maxTime: 120,
      },
      weights: { comprehension: 0.3, production: 0.7 },
    },
  ],
  C1: [
    {
      type: "MULTI_SOURCE",
      cefrLevel: "C1",
      receptivePhase: {
        skill: "READING",
        passage: "",
        timeLimit: 600,
      },
      productivePhase: {
        skill: "WRITING",
        prompt: "Critically evaluate the arguments presented in both texts. Synthesize the information and present a nuanced analysis of the issue. Write 250-350 words.",
        rubric: "Assess: sophisticated synthesis of multiple sources, critical evaluation with nuanced argumentation, C1-level academic register, complex grammatical structures used accurately, well-organized with clear thesis and supporting evidence.",
        minWords: 250,
      },
      weights: { comprehension: 0.2, production: 0.8 },
    },
  ],
};

/**
 * Score comprehension portion of integrated task
 */
export function scoreComprehension(
  answers: number[],
  correctAnswers: number[]
): { correct: number; total: number; accuracy: number } {
  const total = correctAnswers.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (answers[i] === correctAnswers[i]) correct++;
  }
  return {
    correct,
    total,
    accuracy: total > 0 ? correct / total : 0,
  };
}

/**
 * Calculate composite score from sub-scores
 */
export function calculateCompositeScore(
  comprehensionScore: number,
  productionScore: number,
  weights: { comprehension: number; production: number }
): number {
  return comprehensionScore * weights.comprehension + productionScore * weights.production;
}
