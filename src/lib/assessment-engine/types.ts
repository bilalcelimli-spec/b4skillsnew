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
  skill: SkillType;
  params: IrtParameters;
  isPretest?: boolean; // If true, this item is for calibration and doesn't affect theta
  status?: "DRAFT" | "REVIEW" | "ACTIVE" | "PRETEST" | "RETIRED"; // Item status (Phase 3+)
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
  /** Theta-routed MST bucket after module 0 (persist in `Session.metadata` server-side). */
  mstRouteKey?: MstRouteKey;
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
 * Multi-stage testing (MST) — panel routing on top of within-module adaptive selection.
 * Example: moduleSizes [1,2,3] = three stages with one, then two, then three operational items.
 * Items can optionally set `Item.metadata.mstModule` to 0-based module index to pin content to a stage.
 */
/**
 * Theta bucket for stage-2+ panels. Items may set `metadata.mstRoute` to match.
 * Assigned automatically after the first module completes when `routing` is set.
 */
export type MstRouteKey = "low" | "mid" | "high";

export interface MstEngineConfig {
  /** When true, the first sum(moduleSizes) operational responses follow the MST module structure. */
  enabled: boolean;
  /** Item counts per module (e.g. [1, 2, 3]). */
  moduleSizes: number[];
  /**
   * After the last MST module, continue with standard CAT (MFI/blueprint) until stopping rules.
   * If false, the session may stop with reason `MST_STRUCTURE_COMPLETE` once modules are done.
   * @default true
   */
  continueWithCatAfterMst?: boolean;
  /**
   * Optional: after the first `moduleSizes[0]` operational items, lock a route from θ
   * (e.g. low &lt; `lowMaxTheta`, else mid if θ &lt; `midMaxTheta`, else high).
   * Stages 2+ filter by `Item.metadata.mstModule` and `Item.metadata.mstRoute`.
   */
  routing?: {
    lowMaxTheta: number;
    midMaxTheta: number;
  };
}

export interface EngineConfig {
  minItems: number;
  maxItems: number;
  semThreshold: number; // Stopping condition
  startingTheta: number;
  startingSem: number;
  pretestRatio?: number; // Ratio of items that should be pretest (e.g., 0.1 for 10%)
  /** Optional MST panel routing (1-2-3, etc.); when omitted, engine behaves as pure CAT. */
  mst?: MstEngineConfig;
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
   * 2D bifactor (receptive vs productive) MIRT. When set, supersedes 6D `useMirt`
   * for the extra `mirt2B` state and 2B item selection. Unidimensional EAP is unchanged.
   */
  useMirt2B?: boolean;
  /**
   * SPRT/GLR-style stopping on 3PL likelihoods at a CEFR cut (two simple θ points).
   * Requires `items` context when `engine.shouldStop` is called from the server.
   */
  sprt?: {
    enabled: boolean;
    alpha?: number;
    beta?: number;
    halfWidth?: number;
    minItems?: number;
  };
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
