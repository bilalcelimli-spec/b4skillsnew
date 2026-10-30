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
  /** Optional: explicit 2B MIRT loadings (receptive / productive) */
  aReceptive?: number;
  aProductive?: number;
}

export interface Asset {
  id: string;
  type: string; // IMAGE, AUDIO, VIDEO
  url: string;
  metadata?: Record<string, any>;
}

export interface Item {
  id: string;
  itemCode?: string | null; // Human-readable unique code e.g. VOC-B1-0042
  type?: string; // MULTIPLE_CHOICE | FILL_IN_BLANKS | DRAG_DROP | SPEAKING_PROMPT | WRITING_PROMPT | INTEGRATED_TASK
  skill: SkillType;
  params: IrtParameters;
  isPretest?: boolean; // If true, this item is for calibration and doesn't affect theta
  status?: "DRAFT" | "REVIEW" | "ACTIVE" | "PRETEST" | "RETIRED"; // Item status (Phase 3+)
  /** Item Quality Score (0–100). Used as a soft quality signal in CAT selection. */
  iqScore?: number | null;
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

/** Receptive (reading/listening) vs productive (writing/speaking) 2D θ + SEM. */
export interface Mirt2BProfile {
  thetaR: number;
  thetaP: number;
  semR: number;
  semP: number;
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
  /** 2D receptive / productive MIRT (when useMirt2B=true) */
  mirt2B?: Mirt2BProfile;
}

/** Defines the required content distribution for a test (content blueprint). */
export interface BlueprintConstraint {
  skill: SkillType;
  minCount: number;  // Minimum items required for this skill
  maxCount: number;  // Ceiling items allowed for this skill
}

/**
 * Global engine configuration (SystemConfig "global" row + defaults).
 *
 * Live adaptive sections take item counts and SEM targets from the product-line
 * profile (`profiles.ts`) and stop via `stop-rules.ts`; `minItems`, `maxItems`
 * and `semThreshold` here remain for standalone / legacy flows only.
 */
export interface EngineConfig {
  minItems: number;
  maxItems: number;
  semThreshold: number; // Legacy stopping condition (not read by live sections)
  startingTheta: number;
  startingSem: number;
  pretestRatio?: number; // Ratio of items that should be pretest (e.g., 0.1 for 10%)
  cefrThresholds?: Partial<Record<CefrLevel, number>>;
  /** Content blueprint constraints. If defined, enforced during item selection. */
  blueprint?: BlueprintConstraint[];
  /**
   * Expected-time scale for the rapid-guess *flag* (`isRapidGuess`) when RT-IRT is off.
   * Diagnostic only: the score is never altered (Faz 0 removed the legacy penalty).
   */
  speedThresholdMs?: number;
  /**
   * Faz 0: allow `CalibrationService.recalibrateItem` to run after every response.
   * Default false — live sessions must not rewrite operational item parameters;
   * calibration belongs to the batch pipeline (pretest-calibration-pipeline.ts).
   */
  useOnlineRecalibration?: boolean;
  /**
   * Enable Multidimensional IRT (MIRT) estimation alongside unidimensional EAP.
   * When true, each step computes a full 6D ability vector stored in
   * SessionState.mirtAbilityVector. Requires items to have cross-loading params.
   */
  useMirt?: boolean;
  /**
   * 2D bifactor (receptive vs productive) MIRT. When set, supersedes 6D `useMirt`
   * for the extra `mirt2B` state and 2B item selection. Unidimensional EAP is unchanged.
   */
  useMirt2B?: boolean;
  /**
   * Faz4: van der Linden log-normal response-time IRT (τ̂ from prior latencies, aberrant
   * RT flags, `responseTimeAdjustedScore`). When true, the legacy EAP `speedThresholdMs`
   * penalty in `processResponse` is skipped to avoid double counting.
   */
  useRtIrt?: boolean;
  /**
   * Faz5: Samejima GRM for WRITING/SPEAKING (rubric 0–1 as scaled categories) in joint EAP
   * with 3PL for other skills. GRM param from `Item.metadata.grm` or `rubricToGrmParams(a,b)`.
   */
  useGrmProductive?: boolean;
  /**
   * Organisational prior: mean theta for this org's candidate pool.
   * Used as EAP prior mean instead of population default (0).
   */
  priorMean?: number;
  /**
   * Organisational prior: SD of theta for this org's candidate pool. Default: 1.
   */
  priorSd?: number;
  /**
   * Use REINFORCE RL policy gradient item selector (rl-item-selection.ts) as the
   * primary selection strategy within the shadow-test candidate set.
   * Falls back to composite KL/MFI scorer when RL returns null.
   * Default: false (composite scorer).
   */
  useRlSelector?: boolean;
}
