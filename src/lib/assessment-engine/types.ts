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

export interface SessionState {
  theta: number; // Ability estimate
  sem: number;   // Standard Error of Measurement
  responses: Response[];
  usedItemIds: Set<string>;
}

export interface EngineConfig {
  minItems: number;
  maxItems: number;
  semThreshold: number; // Stopping condition
  startingTheta: number;
  startingSem: number;
  pretestRatio?: number; // Ratio of items that should be pretest (e.g., 0.1 for 10%)
  cefrThresholds?: Partial<Record<CefrLevel, number>>;
}
