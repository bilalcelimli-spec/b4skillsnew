/**
 * Product Line Profiles
 *
 * Single source of truth for how each product line behaves:
 * - Which CEFR levels are in scope
 * - Section order and per-section stopping config
 * - Content blueprint (min/max per skill)
 * - Stopping rules (min items, max items, SEM threshold)
 * - Exposure control targets
 * - MST configuration (if applicable)
 *
 * Referenced by server-engine.ts on every session launch and item selection.
 */

import { SkillType, BlueprintConstraint } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductLineName =
  | "Primary (7-10)"
  | "Junior Suite (11-14)"
  | "15-Min Diagnostic"
  | "Academia"
  | "Corporate"
  | "Language Schools";

export interface SectionStoppingConfig {
  minItems: number;
  maxItems: number;
  /** CAT stops early for this section when per-skill SEM ≤ this value */
  semThreshold: number;
}

export interface MSTConfig {
  enabled: true;
  stages: number; // 2 or 3
  routingItemCount: number; // items in stage 0
  /** Theta cut-points to route into tracks (length = tracks - 1) */
  routingCuts: number[];
  trackLabels: string[]; // e.g. ["L", "M", "H"]
  trackCefrRanges: Array<[string, string]>; // CEFR range per track
}

export interface ProductLineProfile {
  name: ProductLineName;
  /** CEFR range [min, max] */
  cefrRange: [string, string];
  /** Target age group */
  ageRange: [number, number];
  /** Section order — skills are tested sequentially in this order */
  sectionOrder: SkillType[];
  /** Per-section stopping config; keys must cover all skills in sectionOrder */
  sectionConfig: Record<string, SectionStoppingConfig>;
  /** Global blueprint (used for shadow test assembly across all sections) */
  blueprint: BlueprintConstraint[];
  /** Global stopping rule (across all sections) */
  globalMaxItems: number;
  globalSemThreshold: number;
  /** Sympson-Hetter target: max fraction of tests any single item appears in */
  maxExposureRate: number;
  /** Exam sources for item filtering (matches item tags) */
  examSources: string[];
  /** MST configuration — undefined means pure CAT */
  mst?: MSTConfig;
  /** Score report template */
  reportTemplate: "yle" | "toefl_junior" | "cefr_band" | "corporate";
  /** Warm-up: first N items should have b ≤ startingTheta + warmupOffset */
  warmupItems: number;
  warmupDifficultyOffset: number;
}

// ─── Profile Definitions ──────────────────────────────────────────────────────

/**
 * Primary (7-10) — Cambridge YLE style
 * Listening always first, task-format aligned to Cambridge YLE structure.
 * No standalone Writing/Speaking (age-appropriate; embedded in tasks).
 */
const PRIMARY: ProductLineProfile = {
  name: "Primary (7-10)",
  cefrRange: ["PRE_A1", "A2"],
  ageRange: [7, 10],
  sectionOrder: [
    SkillType.LISTENING,
    SkillType.READING,
    SkillType.GRAMMAR,
    SkillType.VOCABULARY,
  ],
  sectionConfig: {
    LISTENING:  { minItems: 4, maxItems: 8,  semThreshold: 0.52 },
    READING:    { minItems: 4, maxItems: 8,  semThreshold: 0.52 },
    GRAMMAR:    { minItems: 3, maxItems: 6,  semThreshold: 0.52 },
    VOCABULARY: { minItems: 3, maxItems: 6,  semThreshold: 0.52 },
  },
  blueprint: [
    { skill: SkillType.LISTENING,  minCount: 4, maxCount: 8  },
    { skill: SkillType.READING,    minCount: 4, maxCount: 8  },
    { skill: SkillType.GRAMMAR,    minCount: 3, maxCount: 6  },
    { skill: SkillType.VOCABULARY, minCount: 3, maxCount: 6  },
  ],
  globalMaxItems: 28,
  globalSemThreshold: 0.50,
  maxExposureRate: 0.25,
  examSources: ["cambridge_yle", "cambridge_starters", "cambridge_movers", "cambridge_flyers"],
  reportTemplate: "yle",
  warmupItems: 3,
  warmupDifficultyOffset: 0.5,
};

/**
 * Junior Suite (11-14) — TOEFL Junior + Cambridge KET/PET style
 * MST 2-stage: routing module (8 items) → track module (L/M/H).
 * TOEFL Junior section order: L → LFM (Grammar+Vocab) → RC
 */
const JUNIOR_SUITE: ProductLineProfile = {
  name: "Junior Suite (11-14)",
  cefrRange: ["A1", "B2"],
  ageRange: [11, 14],
  sectionOrder: [
    SkillType.LISTENING,
    SkillType.GRAMMAR,
    SkillType.VOCABULARY,
    SkillType.READING,
  ],
  sectionConfig: {
    LISTENING:  { minItems: 6, maxItems: 12, semThreshold: 0.42 },
    GRAMMAR:    { minItems: 5, maxItems: 10, semThreshold: 0.42 },
    VOCABULARY: { minItems: 5, maxItems: 10, semThreshold: 0.42 },
    READING:    { minItems: 6, maxItems: 12, semThreshold: 0.42 },
  },
  blueprint: [
    { skill: SkillType.LISTENING,  minCount: 6,  maxCount: 12 },
    { skill: SkillType.GRAMMAR,    minCount: 5,  maxCount: 10 },
    { skill: SkillType.VOCABULARY, minCount: 5,  maxCount: 10 },
    { skill: SkillType.READING,    minCount: 6,  maxCount: 12 },
  ],
  globalMaxItems: 40,
  globalSemThreshold: 0.38,
  maxExposureRate: 0.30,
  examSources: ["toefl_junior", "cambridge_ket", "cambridge_pet"],
  mst: {
    enabled: true,
    stages: 2,
    routingItemCount: 8,
    routingCuts: [-1.0, 0.8],      // θ < -1.0 → L, -1.0–0.8 → M, ≥ 0.8 → H
    trackLabels: ["L", "M", "H"],
    trackCefrRanges: [["A1", "A2"], ["A2", "B1"], ["B1", "B2"]],
  },
  reportTemplate: "toefl_junior",
  warmupItems: 3,
  warmupDifficultyOffset: 0.5,
};

/**
 * 15-Min Diagnostic — Quick CEFR placement
 * Full CAT, aggressive stopping (max 18 items).
 * Goal: estimate CEFR band quickly, not precision measurement.
 */
const DIAGNOSTIC_15: ProductLineProfile = {
  name: "15-Min Diagnostic",
  cefrRange: ["A1", "C1"],
  ageRange: [14, 99],
  sectionOrder: [
    SkillType.VOCABULARY,
    SkillType.GRAMMAR,
    SkillType.READING,
    SkillType.LISTENING,
  ],
  sectionConfig: {
    VOCABULARY: { minItems: 3, maxItems: 5, semThreshold: 0.40 },
    GRAMMAR:    { minItems: 3, maxItems: 5, semThreshold: 0.40 },
    READING:    { minItems: 2, maxItems: 4, semThreshold: 0.45 },
    LISTENING:  { minItems: 2, maxItems: 4, semThreshold: 0.45 },
  },
  blueprint: [
    { skill: SkillType.VOCABULARY, minCount: 3, maxCount: 5 },
    { skill: SkillType.GRAMMAR,    minCount: 3, maxCount: 5 },
    { skill: SkillType.READING,    minCount: 2, maxCount: 4 },
    { skill: SkillType.LISTENING,  minCount: 2, maxCount: 4 },
  ],
  globalMaxItems: 18,
  globalSemThreshold: 0.35,
  maxExposureRate: 0.35,
  examSources: ["general"],
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.3,
};

/**
 * Academia — Academic English, IELTS Academic style
 * MST 3-stage; all four macro skills including Writing and Speaking.
 */
const ACADEMIA: ProductLineProfile = {
  name: "Academia",
  cefrRange: ["B1", "C2"],
  ageRange: [16, 99],
  sectionOrder: [
    SkillType.READING,
    SkillType.LISTENING,
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    READING:   { minItems: 8,  maxItems: 14, semThreshold: 0.32 },
    LISTENING: { minItems: 8,  maxItems: 14, semThreshold: 0.32 },
    WRITING:   { minItems: 1,  maxItems: 2,  semThreshold: 0.50 },
    SPEAKING:  { minItems: 1,  maxItems: 2,  semThreshold: 0.50 },
  },
  blueprint: [
    { skill: SkillType.READING,   minCount: 8,  maxCount: 14 },
    { skill: SkillType.LISTENING, minCount: 8,  maxCount: 14 },
    { skill: SkillType.WRITING,   minCount: 1,  maxCount: 2  },
    { skill: SkillType.SPEAKING,  minCount: 1,  maxCount: 2  },
  ],
  globalMaxItems: 60,
  globalSemThreshold: 0.30,
  maxExposureRate: 0.20,
  examSources: ["ielts_academic", "general"],
  mst: {
    enabled: true,
    stages: 3,
    routingItemCount: 10,
    routingCuts: [-0.2, 1.2],    // θ < -0.2 → B1 track, -0.2–1.2 → B2 track, ≥ 1.2 → C1+ track
    trackLabels: ["B1", "B2", "C1+"],
    trackCefrRanges: [["B1", "B1"], ["B2", "B2"], ["C1", "C2"]],
  },
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.3,
};

/**
 * Corporate — Business English
 * CAT + fixed productive tasks (Writing/Speaking at end).
 */
const CORPORATE: ProductLineProfile = {
  name: "Corporate",
  cefrRange: ["A2", "C1"],
  ageRange: [18, 99],
  sectionOrder: [
    SkillType.READING,
    SkillType.LISTENING,
    SkillType.GRAMMAR,
    SkillType.VOCABULARY,
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    READING:    { minItems: 5, maxItems: 8,  semThreshold: 0.38 },
    LISTENING:  { minItems: 5, maxItems: 8,  semThreshold: 0.38 },
    GRAMMAR:    { minItems: 4, maxItems: 7,  semThreshold: 0.40 },
    VOCABULARY: { minItems: 4, maxItems: 7,  semThreshold: 0.40 },
    WRITING:    { minItems: 1, maxItems: 2,  semThreshold: 0.60 },
    SPEAKING:   { minItems: 1, maxItems: 2,  semThreshold: 0.60 },
  },
  blueprint: [
    { skill: SkillType.READING,    minCount: 5, maxCount: 8 },
    { skill: SkillType.LISTENING,  minCount: 5, maxCount: 8 },
    { skill: SkillType.GRAMMAR,    minCount: 4, maxCount: 7 },
    { skill: SkillType.VOCABULARY, minCount: 4, maxCount: 7 },
    { skill: SkillType.WRITING,    minCount: 1, maxCount: 2 },
    { skill: SkillType.SPEAKING,   minCount: 1, maxCount: 2 },
  ],
  globalMaxItems: 35,
  globalSemThreshold: 0.35,
  maxExposureRate: 0.30,
  examSources: ["bec", "bulats", "general"],
  reportTemplate: "corporate",
  warmupItems: 2,
  warmupDifficultyOffset: 0.4,
};

/**
 * Language Schools — General English
 * Standard CAT, CEFR band output, A1–C1 range.
 */
const LANGUAGE_SCHOOLS: ProductLineProfile = {
  name: "Language Schools",
  cefrRange: ["A1", "C1"],
  ageRange: [12, 99],
  sectionOrder: [
    SkillType.VOCABULARY,
    SkillType.GRAMMAR,
    SkillType.READING,
    SkillType.LISTENING,
  ],
  sectionConfig: {
    VOCABULARY: { minItems: 6, maxItems: 10, semThreshold: 0.43 },
    GRAMMAR:    { minItems: 5, maxItems: 8,  semThreshold: 0.43 },
    READING:    { minItems: 4, maxItems: 8,  semThreshold: 0.45 },
    LISTENING:  { minItems: 3, maxItems: 6,  semThreshold: 0.48 },
  },
  blueprint: [
    { skill: SkillType.VOCABULARY, minCount: 6, maxCount: 10 },
    { skill: SkillType.GRAMMAR,    minCount: 5, maxCount: 8  },
    { skill: SkillType.READING,    minCount: 4, maxCount: 8  },
    { skill: SkillType.LISTENING,  minCount: 3, maxCount: 6  },
  ],
  globalMaxItems: 30,
  globalSemThreshold: 0.38,
  maxExposureRate: 0.30,
  examSources: ["general", "cambridge_ket", "cambridge_pet"],
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.4,
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PRODUCT_LINE_PROFILES: Record<ProductLineName, ProductLineProfile> = {
  "Primary (7-10)":       PRIMARY,
  "Junior Suite (11-14)": JUNIOR_SUITE,
  "15-Min Diagnostic":    DIAGNOSTIC_15,
  "Academia":             ACADEMIA,
  "Corporate":            CORPORATE,
  "Language Schools":     LANGUAGE_SCHOOLS,
};

/**
 * Resolve the profile for a session.
 * Falls back to "15-Min Diagnostic" when productLine is unknown or missing.
 */
export function getProfile(productLine?: string | null): ProductLineProfile {
  if (productLine && productLine in PRODUCT_LINE_PROFILES) {
    return PRODUCT_LINE_PROFILES[productLine as ProductLineName];
  }
  return PRODUCT_LINE_PROFILES["15-Min Diagnostic"];
}
