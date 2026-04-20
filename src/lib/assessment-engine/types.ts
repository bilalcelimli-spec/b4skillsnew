/**
 * Psychometric Types for b4skills
 */

export enum SkillType {
  READING = "READING",
  LISTENING = "LISTENING",
  WRITING = "WRITING",
  SPEAKING = "SPEAKING",
  GRAMMAR = "GRAMMAR",
  VOCABULARY = "VOCABULARY"
}

export type ItemType = 
  | "MULTIPLE_CHOICE" 
  | "FILL_IN_BLANKS" 
  | "DRAG_DROP" 
  | "SPEAKING_PROMPT" 
  | "WRITING_PROMPT" 
  | "INTEGRATED_TASK";

export type CefrLevel = "PRE_A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface IrtParameters {
  a: number; // Discrimination
  b: number; // Difficulty
  c: number; // Guessing
}

export interface Asset {
  id: string;
  type: string; // IMAGE, AUDIO, VIDEO
  url: string;
  metadata?: Record<string, any>;
}

export interface Item {
  id: string;
  skill: SkillType;
  params: IrtParameters;
  isPretest?: boolean; // If true, this item is for calibration and doesn't affect theta
  metadata?: Record<string, any>;
  assets?: Asset[];
}

export interface Response {
  itemId: string;
  score: number; // 0.0 to 1.0 (usually 0 or 1 for dichotomous items)
  isPretest?: boolean; // Track if this was a pretest response
  latencyMs?: number;
}

/** Per-skill theta/SEM pair for multidimensional profiling. */
export interface SkillProfile {
  theta: number;
  sem: number;
}

/** Full MIRT ability vector (6-dimensional). */
export interface MirtAbilityVector {
  theta: Partial<Record<SkillType, number>>;
  sem: Partial<Record<SkillType, number>>;
  covariance: number[][];
}

export interface SessionState {
  theta: number; // Overall composite ability estimate
  sem: number;   // Overall Standard Error of Measurement
  responses: Response[];
  usedItemIds: Set<string>;
  /** Multidimensional per-skill ability profiles (unidimensional, per-skill EAP) */
  skillProfiles?: Partial<Record<SkillType, SkillProfile>>;
  /** Full MIRT ability vector (when useMirt=true) */
  mirtAbilityVector?: MirtAbilityVector;
}

/** Defines the required content distribution for a test (content blueprint). */
export interface BlueprintConstraint {
  skill: SkillType;
  minCount: number;  // Minimum items required for this skill
  maxCount: number;  // Ceiling items allowed for this skill
}

export interface EngineConfig {
  minItems: number;
  maxItems: number;
  semThreshold: number; // Stopping condition
  startingTheta: number;
  startingSem: number;
  pretestRatio?: number; // Ratio of items that should be pretest (e.g., 0.1 for 10%)
  cefrThresholds?: Partial<Record<CefrLevel, number>>;
  /** Content blueprint constraints. If defined, enforced during item selection. */
  blueprint?: BlueprintConstraint[];
  /** Speed penalty: if response < speedThresholdMs it may indicate automated guessing. */
  speedThresholdMs?: number;
  /**
   * Enable Multidimensional IRT (MIRT) estimation alongside unidimensional EAP.
   * When true, each step computes a full 6D ability vector stored in
   * SessionState.mirtAbilityVector. Requires items to have cross-loading params.
   */
  useMirt?: boolean;
  /**
   * Enable shadow-test item selection (van der Linden 2005).
   * Guarantees blueprint adherence at every step without greedy look-ahead failures.
   * Requires a blueprint to be set.
   */
  useShadowTest?: boolean;
  /**
   * Posterior CEFR classification confidence threshold for stopping.
   * Stop when P(current CEFR level | data) >= this value. Default: 0.90.
   */
  classificationConfidenceThreshold?: number;
  /**
   * Organisational prior: mean theta for this org's candidate pool.
   * Used as EAP prior mean instead of population default (0).
   */
  priorMean?: number;
  /**
   * Organisational prior: SD of theta for this org's candidate pool. Default: 1.
   */
  priorSd?: number;
}
