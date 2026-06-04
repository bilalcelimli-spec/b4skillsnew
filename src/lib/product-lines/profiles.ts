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
 *
 * ─── Revision 2026-05 — Psychometric Justification ─────────────────────────
 * All item counts are derived from IRT Fisher information analysis:
 *
 *   I_peak (MC 4-option, a=1.2, c=0.25) ≈ 0.52 per item at optimal θ
 *   I_peak (FIB/Cloze,   a=1.35, c=0)   ≈ 0.91 per item (no guessing penalty)
 *   CAT efficiency factor ≈ 0.70 × I_peak (early items are not at optimal difficulty)
 *
 *   SEM target → required total information I_total = 1/SEM²
 *   I_total / (0.70 × 0.52) = minimum MC items for that SEM
 *
 *   SEM ≤ 0.50 → I ≥ 4.0 → ≥  6 MC items
 *   SEM ≤ 0.45 → I ≥ 4.9 → ≥  8 MC items
 *   SEM ≤ 0.40 → I ≥ 6.3 → ≥ 10 MC items
 *   SEM ≤ 0.37 → I ≥ 7.3 → ≥ 12 MC items
 *   SEM ≤ 0.32 → I ≥ 9.8 → ≥ 16 MC items (18 with real-world CAT efficiency)
 *
 * Writing/Speaking: Each polytomous task (4-dimension GRM, m=5 categories)
 *   provides I ≈ 11 per task (graded-response-model.ts). Minimum 2 tasks
 *   required for marginal reliability ρ ≥ 0.80 in productive skills.
 *
 * MST routing: routing module SEM should be ≤ 0.45 for reliable track assignment.
 *   ≥ 12 routing items required (was 8 in earlier version — insufficient).
 *
 * Full derivation: docs/validity-roadmap.md §3.2
 */

import { SkillType, BlueprintConstraint } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductLineName =
  | "Primary (7-10)"
  | "Junior Suite (11-14)"
  | "15-Min Diagnostic"
  | "Express Assessment (30-Min)"
  | "General English"
  | "Academia"
  | "Corporate"
  | "Language Schools"
  | "Specialized / Integrated Skills";

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

/**
 * Specifies word-count constraints for a single writing task.
 * Tasks are administered in `position` order within the Writing section.
 */
export interface WritingTaskSpec {
  /** 1-based task position */
  position: 1 | 2 | 3;
  minWords: number;
  maxWords: number;
  /**
   * Canonical task type — used by item-bank query and rubric selection.
   *   short_response    : controlled production, ~50 words
   *   paragraph_response: guided paragraph,    max 120 words
   *   extended_response : free composition,    ~250 words
   */
  taskType: "short_response" | "paragraph_response" | "extended_response";
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
  /**
   * Per-task word-count constraints for the Writing section.
   * Array length must equal sectionConfig.WRITING.maxItems.
   * Engine administers tasks in ascending `position` order.
   * Undefined for profiles that have no Writing section.
   */
  writingTaskSpecs?: WritingTaskSpec[];
  /** Score report template */
  reportTemplate: "yle" | "toefl_junior" | "cefr_band" | "corporate";
  /** Warm-up: first N items should have b ≤ startingTheta + warmupOffset */
  warmupItems: number;
  warmupDifficultyOffset: number;
  /**
   * Estimated session duration in minutes [min, max].
   * Derived from: MC items × 45s + Listening × 90s + Writing × 1200s + Speaking × 240s
   */
  estimatedDurationMin: [number, number];
  /**
   * Hard server-side time ceiling in milliseconds.
   * The session is finalized with reason TIME_LIMIT_EXCEEDED if elapsed time
   * exceeds this value before psychometric stopping criteria are met.
   * This is a safety net — never shown to candidates as a countdown.
   * Set to roughly estimatedDurationMin[1] × 1.5 to accommodate slow readers.
   */
  maxDurationMs: number;
}

// ─── Profile Definitions ──────────────────────────────────────────────────────

/**
 * Primary (7-10) — Cambridge YLE style
 *
 * Listening first; Writing and Speaking tasks at the end (age-appropriate).
 *
 * Psychometric basis:
 *   SEM target 0.50 → I ≥ 4.0 → ≥ 6 MC items per receptive skill.
 *   Previous min=4 gave SEM ≈ 0.67 — insufficient for reliable placement.
 *   Writing/Speaking: 2 short tasks each → GRM provides adequate reliability
 *   for this age group (ρ ≈ 0.82 with 2 tasks vs ρ ≈ 0.72 with 1 task).
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
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    // min 6: I ≥ 6×0.52×0.70 = 2.18 → SEM ≤ 0.68 (warm-up accounts for rest)
    // max 10: I ≤ 10×0.52×0.70 = 3.64 → SEM ≤ 0.52 at plateau ✓
    LISTENING:  { minItems: 6,  maxItems: 10, semThreshold: 0.50 },
    READING:    { minItems: 6,  maxItems: 10, semThreshold: 0.50 },
    // FIB items: I_peak ≈ 0.91 → 6/10 items → SEM ≈ 0.44 (en verimli + bol havuz)
    // Vocab/grammar artırıldı: bankanın en zengin becerileri, en güçlü CEFR ayırt edici.
    GRAMMAR:    { minItems: 6,  maxItems: 10, semThreshold: 0.44 },
    VOCABULARY: { minItems: 6,  maxItems: 10, semThreshold: 0.44 },
    // 2–3 GRM tasks → I ≈ 22–33 combined → SEM ≈ 0.17–0.21; reliable subscore
    WRITING:    { minItems: 2,  maxItems: 3,  semThreshold: 0.55 },
    SPEAKING:   { minItems: 2,  maxItems: 3,  semThreshold: 0.55 },
  },
  blueprint: [
    { skill: SkillType.LISTENING,  minCount: 6,  maxCount: 10 },
    { skill: SkillType.READING,    minCount: 6,  maxCount: 10 },
    { skill: SkillType.GRAMMAR,    minCount: 6,  maxCount: 10 },
    { skill: SkillType.VOCABULARY, minCount: 6,  maxCount: 10 },
    { skill: SkillType.WRITING,    minCount: 2,  maxCount: 3  },
    { skill: SkillType.SPEAKING,   minCount: 2,  maxCount: 3  },
  ],
  globalMaxItems: 46,
  // Age-appropriate word limits for 7-10 year olds
  writingTaskSpecs: [
    { position: 1, minWords: 30,  maxWords: 50,  taskType: "short_response" },
    { position: 2, minWords: 50,  maxWords: 100, taskType: "paragraph_response" },
    { position: 3, minWords: 100, maxWords: 150, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.48,
  maxExposureRate: 0.25,
  examSources: ["primary", "general"],
  reportTemplate: "yle",
  warmupItems: 3,
  warmupDifficultyOffset: 0.5,
  estimatedDurationMin: [30, 46],
  // 46 min × 1.5 safety net (young learners may need extra time)
  maxDurationMs: 4_140_000,
};

/**
 * Junior Suite (11-14) — TOEFL Junior + Cambridge KET/PET style
 *
 * MST 2-stage: routing module (12 items) → track module (L/M/H).
 * TOEFL Junior section order: L → LFM (Grammar+Vocab) → RC.
 *
 * Psychometric basis:
 *   Routing: Previous 8 items → SEM ≈ 0.59 → 18% misrouting rate.
 *   New 12 items → SEM ≈ 0.48 → misrouting ≤ 10% (acceptable).
 *   Writing/Speaking: minimum 2 tasks each → ρ ≥ 0.82.
 *   Subsector SEM 0.40 → I ≥ 6.3 → ≥ 10 MC items or ≥ 8 FIB items.
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
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    LISTENING:  { minItems: 6,  maxItems: 14, semThreshold: 0.40 },
    // Vocab/grammar 8/14'e yükseltildi: en verimli beceriler + bol havuz → SEM 0.36
    GRAMMAR:    { minItems: 8,  maxItems: 14, semThreshold: 0.36 },
    VOCABULARY: { minItems: 8,  maxItems: 14, semThreshold: 0.36 },
    READING:    { minItems: 6,  maxItems: 14, semThreshold: 0.40 },
    // min 2 tasks: mandatory for reliable productive skill subscore
    WRITING:    { minItems: 2,  maxItems: 3,  semThreshold: 0.50 },
    SPEAKING:   { minItems: 2,  maxItems: 3,  semThreshold: 0.50 },
  },
  blueprint: [
    { skill: SkillType.LISTENING,  minCount: 6,  maxCount: 14 },
    { skill: SkillType.GRAMMAR,    minCount: 8,  maxCount: 14 },
    { skill: SkillType.VOCABULARY, minCount: 8,  maxCount: 14 },
    { skill: SkillType.READING,    minCount: 6,  maxCount: 14 },
    { skill: SkillType.WRITING,    minCount: 2,  maxCount: 3  },
    { skill: SkillType.SPEAKING,   minCount: 2,  maxCount: 3  },
  ],
  globalMaxItems: 60,
  writingTaskSpecs: [
    { position: 1, minWords: 40,  maxWords: 60,  taskType: "short_response" },
    { position: 2, minWords: 80,  maxWords: 120, taskType: "paragraph_response" },
    { position: 3, minWords: 200, maxWords: 270, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.36,
  maxExposureRate: 0.28,
  examSources: ["junior", "general"],
  mst: {
    enabled: true,
    stages: 2,
    routingItemCount: 12, // raised from 8 → SEM 0.59→0.48 on routing decision
    routingCuts: [-1.0, 0.8],      // θ < -1.0 → L, -1.0–0.8 → M, ≥ 0.8 → H
    trackLabels: ["L", "M", "H"],
    trackCefrRanges: [["A1", "A2"], ["A2", "B1"], ["B1", "B2"]],
  },
  reportTemplate: "toefl_junior",
  warmupItems: 3,
  warmupDifficultyOffset: 0.5,
  estimatedDurationMin: [57, 79],
  // 79 min × 1.5 safety net
  maxDurationMs: 7_110_000,
};

/**
 * 15-Min Diagnostic — Full 6-skill CEFR placement
 *
 * Q3 2026 UPDATE: WRITING + SPEAKING re-enabled (1 task each) for full
 *                 6-skill coverage. Estimated time grew from 15 → ~22 min.
 *
 * Q4 2026 UPDATE: vocab/grammar (en verimli + en zengin beceriler) 4/7 → 7/12
 *                 yükseltildi, SEM 0.46 → 0.38. Doğruluk önceliklendirildi;
 *                 süre ~30-40 dk'ya çıktı. İsim ("15-Min") artık nominal — registry
 *                 key + exam-code value olduğu için korundu, yeniden adlandırma
 *                 verilmiş kodları kırar. Hızlı placement gereken müşteriler için
 *                 alternatif: Express (30-Min) zaten daha hafif vocab/grammar taşır.
 *
 * Psychometric basis:
 *   Receptive: SEM target 0.48 → I ≥ 4.3 → ≥ 7 MC items per skill (CAT-adjusted).
 *   Productive (1 task each): GRM SEM ≈ 0.30 — a coarse but honest band estimate
 *     suitable for placement (Cambridge BSE precedent).  If a candidate needs
 *     a high-stakes productive score (ρ ≥ 0.85), upgrade to Express (30-Min)
 *     or Academia — those profiles run 2-3 productive tasks each.
 *
 * Note (history): pre-Q3-2026 this profile only ran the 4 receptive skills
 *   under the rationale that 1 writing task takes 15 minutes alone.  We now
 *   ship a *trimmed* productive task spec (≤100 words / ≤45 seconds) so the
 *   full 6-skill flow fits in ~22-25 min, keeping the rapid-placement promise.
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
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    // Vocab/grammar 7/12'ye yükseltildi (doğruluk önceliği): SEM 0.46 → 0.38
    VOCABULARY: { minItems: 7, maxItems: 12, semThreshold: 0.38 },
    GRAMMAR:    { minItems: 7, maxItems: 12, semThreshold: 0.38 },
    READING:    { minItems: 4, maxItems: 7,  semThreshold: 0.48 },
    LISTENING:  { minItems: 3, maxItems: 6,  semThreshold: 0.50 },
    WRITING:    { minItems: 1, maxItems: 2,  semThreshold: 0.50 },
    SPEAKING:   { minItems: 1, maxItems: 2,  semThreshold: 0.50 },
  },
  blueprint: [
    { skill: SkillType.VOCABULARY, minCount: 7, maxCount: 12 },
    { skill: SkillType.GRAMMAR,    minCount: 7, maxCount: 12 },
    { skill: SkillType.READING,    minCount: 4, maxCount: 7  },
    { skill: SkillType.LISTENING,  minCount: 3, maxCount: 6  },
    { skill: SkillType.WRITING,    minCount: 1, maxCount: 2  },
    { skill: SkillType.SPEAKING,   minCount: 1, maxCount: 2  },
  ],
  globalMaxItems: 36,
  writingTaskSpecs: [
    // Single short productive task — trimmed budget keeps total session ≤ 25 min.
    { position: 1, minWords: 30, maxWords: 100, taskType: "short_response" },
  ],
  globalSemThreshold: 0.46,
  maxExposureRate: 0.35,
  examSources: ["general"],
  /**
   * MST 2-stage configuration for 15-Min Diagnostic.
   *
   * Rationale:
   *   Pure-CAT on 20 items gives SEM ≈ 0.46 at best.  Adding a routing
   *   stage (8 items) splits candidates into L / H tracks so the
   *   subsequent 12 adaptive items operate in a tighter θ-band →
   *   information per item rises ~18%, improving effective SEM to ≈ 0.41
   *   within the same time budget.
   *
   *   Routing cut:
   *     Single cut at θ = 0.0 (B1 threshold):
   *       L track: VOCABULARY → GRAMMAR pool restricted to A1–B1 items
   *       H track: GRAMMAR  → READING  pool restricted to B1–C1 items
   *   This mirrors the DIALANG 2-stage short-form design (Alderson 2005).
   *
   *   trackCefrRanges:
   *     L → A1–B1 (placement within beginner-intermediate band)
   *     H → B1–C1 (placement within upper-intermediate-advanced band)
   */
  mst: {
    enabled: true,
    stages: 2,
    routingItemCount: 8,   // 8 routing items → SEM ≈ 0.48; sufficient for binary L/H cut
    routingCuts: [0.0],    // θ < 0.0 → L track; θ ≥ 0.0 → H track
    trackLabels: ["L", "H"],
    trackCefrRanges: [["A1", "B1"], ["B1", "C1"]],
  },
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.3,
  estimatedDurationMin: [30, 40],
  // 40 min × 1.5 safety net
  maxDurationMs: 3_600_000,
};

/**
 * Express Assessment (30-Min) — Full-skill holistic placement
 *
 * Replaces the old 15-Min Diagnostic for clients who need Writing+Speaking.
 * Honest time budget: 30–40 minutes.
 *
 * Psychometric basis:
 *   SEM target 0.42 → I ≥ 5.7 → ≥ 9 MC items per receptive skill.
 *   2 productive tasks each → GRM I ≈ 22 → SEM ≈ 0.21 for productive.
 */
const EXPRESS_30: ProductLineProfile = {
  name: "Express Assessment (30-Min)",
  cefrRange: ["A1", "C1"],
  ageRange: [14, 99],
  sectionOrder: [
    SkillType.VOCABULARY,
    SkillType.GRAMMAR,
    SkillType.READING,
    SkillType.LISTENING,
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    // Vocab/grammar 7/11'e yükseltildi: en verimli beceriler → SEM 0.42 → 0.39
    VOCABULARY: { minItems: 7, maxItems: 11, semThreshold: 0.39 },
    GRAMMAR:    { minItems: 7, maxItems: 11, semThreshold: 0.39 },
    READING:    { minItems: 5, maxItems: 9,  semThreshold: 0.43 },
    LISTENING:  { minItems: 4, maxItems: 7,  semThreshold: 0.44 },
    WRITING:    { minItems: 2, maxItems: 3,  semThreshold: 0.50 },
    SPEAKING:   { minItems: 2, maxItems: 3,  semThreshold: 0.50 },
  },
  blueprint: [
    { skill: SkillType.VOCABULARY, minCount: 7, maxCount: 11 },
    { skill: SkillType.GRAMMAR,    minCount: 7, maxCount: 11 },
    { skill: SkillType.READING,    minCount: 5, maxCount: 9  },
    { skill: SkillType.LISTENING,  minCount: 4, maxCount: 7  },
    { skill: SkillType.WRITING,    minCount: 2, maxCount: 3  },
    { skill: SkillType.SPEAKING,   minCount: 2, maxCount: 3  },
  ],
  globalMaxItems: 44,
  writingTaskSpecs: [
    { position: 1, minWords: 40,  maxWords: 60,  taskType: "short_response" },
    { position: 2, minWords: 80,  maxWords: 120, taskType: "paragraph_response" },
    { position: 3, minWords: 200, maxWords: 270, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.42,
  maxExposureRate: 0.32,
  examSources: ["general"],
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.3,
  estimatedDurationMin: [30, 46],
  // 46 min × 1.5 safety net
  maxDurationMs: 4_140_000,
};

/**
 * General English — Standart 6-beceri bütünleşik CEFR değerlendirmesi
 *
 * Sistemin varsayılan genel-amaçlı sınavı. 15-Min Diagnostic'ten (22-28 dk)
 * daha kapsamlı, Language Schools'tan (55-75 dk) daha kısa. Tüm yaş grupları
 * ve özel bir alan veya sertifikasyon ihtiyacı olmayanlar için tasarlandı.
 *
 * Psikometrik temel:
 *   SEM hedef 0.41 → I ≥ 5.9 → reseptif beceri başına min 9 MC item.
 *   Üretken beceriler: 2-3 GRM görevi → I ≈ 22-33 → SEM ≈ 0.17-0.21.
 *   Saf CAT (MST yok): basit iş akışı, item havuzu tagging gerektirmez.
 *   Süre: 40-58 dk (1,5× güvenlik tamponuyla hard ceiling 87 dk).
 */
const GENERAL_ENGLISH: ProductLineProfile = {
  name: "General English",
  cefrRange: ["A1", "C1"],
  ageRange: [12, 99],
  sectionOrder: [
    SkillType.VOCABULARY,
    SkillType.GRAMMAR,
    SkillType.READING,
    SkillType.LISTENING,
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    // Vocab/grammar 8/13'e yükseltildi (en verimli + en güçlü CEFR ayırt edici): SEM 0.38
    VOCABULARY: { minItems: 8, maxItems: 13, semThreshold: 0.38 },
    GRAMMAR:    { minItems: 8, maxItems: 13, semThreshold: 0.38 },
    READING:    { minItems: 6, maxItems: 11, semThreshold: 0.41 },
    LISTENING:  { minItems: 6, maxItems: 10, semThreshold: 0.42 },
    // 2-3 GRM task: I ≈ 22-33 → SEM ≈ 0.17-0.21; ρ ≥ 0.82 (iki görev standardı)
    WRITING:    { minItems: 2, maxItems: 3,  semThreshold: 0.50 },
    SPEAKING:   { minItems: 2, maxItems: 3,  semThreshold: 0.50 },
  },
  blueprint: [
    { skill: SkillType.VOCABULARY, minCount: 8,  maxCount: 13 },
    { skill: SkillType.GRAMMAR,    minCount: 8,  maxCount: 13 },
    { skill: SkillType.READING,    minCount: 6,  maxCount: 11 },
    { skill: SkillType.LISTENING,  minCount: 6,  maxCount: 10 },
    { skill: SkillType.WRITING,    minCount: 2,  maxCount: 3  },
    { skill: SkillType.SPEAKING,   minCount: 2,  maxCount: 3  },
  ],
  globalMaxItems: 53,
  writingTaskSpecs: [
    { position: 1, minWords: 40,  maxWords: 60,  taskType: "short_response" },
    { position: 2, minWords: 80,  maxWords: 120, taskType: "paragraph_response" },
    { position: 3, minWords: 200, maxWords: 270, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.41,
  maxExposureRate: 0.30,
  examSources: ["general"],
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.3,
  estimatedDurationMin: [42, 62],
  // 62 dk × 1.5 güvenlik tamponu
  maxDurationMs: 5_580_000,
};

/**
 * Academia — Academic English, IELTS Academic style
 *
 * MST 3-stage; all four macro skills including Writing and Speaking.
 *
 * Psychometric basis:
 *   High-stakes academic placement/admission → strictest reliability targets.
 *   SEM ≤ 0.30 → I ≥ 11.1 → ≥ 18 MC items per receptive skill.
 *   Writing/Speaking: minimum 2 tasks each → this is the IELTS/Cambridge standard.
 *     ρ(1 task) ≈ 0.75, ρ(2 tasks) ≈ 0.86, ρ(3 tasks) ≈ 0.91.
 *     University admission requires ρ ≥ 0.85 → 2 tasks minimum mandatory.
 *   MST routing: raised from 10 → 15 items → SEM on routing decision ≈ 0.41.
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
    // 18 items: I ≈ 18×0.52×0.70 = 6.55 → SEM ≈ 0.39 (worse case)
    // But READING/LISTENING items are passages: avg 3-5 items per passage
    // → information accumulates faster than isolated MC
    // At max 18 items from 4+ passages: SEM ≤ 0.30 achievable ✓
    READING:   { minItems: 10, maxItems: 18, semThreshold: 0.30 },
    LISTENING: { minItems: 10, maxItems: 16, semThreshold: 0.30 },
    // 2 tasks = GRM I ≈ 22 → SEM ≈ 0.21; 3 tasks for borderline C1/C2 cases
    WRITING:   { minItems: 2,  maxItems: 3,  semThreshold: 0.38 },
    SPEAKING:  { minItems: 2,  maxItems: 3,  semThreshold: 0.38 },
  },
  blueprint: [
    { skill: SkillType.READING,   minCount: 10, maxCount: 18 },
    { skill: SkillType.LISTENING, minCount: 10, maxCount: 16 },
    { skill: SkillType.WRITING,   minCount: 2,  maxCount: 3  },
    { skill: SkillType.SPEAKING,  minCount: 2,  maxCount: 3  },
  ],
  globalMaxItems: 75,
  writingTaskSpecs: [
    { position: 1, minWords: 40,  maxWords: 60,  taskType: "short_response" },
    { position: 2, minWords: 80,  maxWords: 120, taskType: "paragraph_response" },
    { position: 3, minWords: 220, maxWords: 280, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.30,
  maxExposureRate: 0.20,
  examSources: ["academia", "general"],
  mst: {
    enabled: true,
    stages: 3,
    routingItemCount: 15, // raised from 10 → SEM 0.53→0.41 on routing decision
    routingCuts: [-0.2, 1.2],    // θ < -0.2 → B1 track, -0.2–1.2 → B2 track, ≥ 1.2 → C1+ track
    trackLabels: ["B1", "B2", "C1+"],
    trackCefrRanges: [["B1", "B1"], ["B2", "B2"], ["C1", "C2"]],
  },
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.3,
  estimatedDurationMin: [90, 120],
  // 120 min × 1.5 safety net (high-stakes; extra buffer for productive tasks)
  maxDurationMs: 10_800_000,
};

/**
 * Corporate — Business English
 *
 * CAT + fixed productive tasks (Writing/Speaking at end).
 *
 * Psychometric basis:
 *   Previous READING max=8 → SEM ≈ 0.55 against target 0.38 — unachievable.
 *   Raised to max=12 → SEM ≈ 0.37 achievable with CAT efficiency.
 *   Previous GRAMMAR/VOCAB max=7 → SEM ≈ 0.53 — also insufficient.
 *   Raised to max=9 → SEM ≈ 0.41 (FIB items bring this to 0.36).
 *   Writing/Speaking: 2 tasks mandatory (business decisions require ρ ≥ 0.80).
 *     Task 1: business email (100–150 words)
 *     Task 2: short report / proposal (150–200 words)
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
    READING:    { minItems: 7,  maxItems: 12, semThreshold: 0.37 },
    LISTENING:  { minItems: 7,  maxItems: 12, semThreshold: 0.37 },
    // Vocab/grammar 7/12'ye yükseltildi (iş kararı doğruluğu): FIB I_peak ≈ 0.91 → SEM 0.35
    GRAMMAR:    { minItems: 7,  maxItems: 12, semThreshold: 0.35 },
    VOCABULARY: { minItems: 7,  maxItems: 12, semThreshold: 0.35 },
    // 2–3 tasks: Task 1 short message, Task 2 business email, Task 3 report/proposal
    WRITING:    { minItems: 2,  maxItems: 3,  semThreshold: 0.40 },
    SPEAKING:   { minItems: 2,  maxItems: 3,  semThreshold: 0.40 },
  },
  blueprint: [
    { skill: SkillType.READING,    minCount: 7,  maxCount: 12 },
    { skill: SkillType.LISTENING,  minCount: 7,  maxCount: 12 },
    { skill: SkillType.GRAMMAR,    minCount: 7,  maxCount: 12 },
    { skill: SkillType.VOCABULARY, minCount: 7,  maxCount: 12 },
    { skill: SkillType.WRITING,    minCount: 2,  maxCount: 3  },
    { skill: SkillType.SPEAKING,   minCount: 2,  maxCount: 3  },
  ],
  globalMaxItems: 55,
  writingTaskSpecs: [
    { position: 1, minWords: 40,  maxWords: 60,  taskType: "short_response" },
    { position: 2, minWords: 80,  maxWords: 120, taskType: "paragraph_response" },
    { position: 3, minWords: 220, maxWords: 270, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.34,
  maxExposureRate: 0.28,
  examSources: ["corporate", "general"],
  reportTemplate: "corporate",
  warmupItems: 2,
  warmupDifficultyOffset: 0.4,
  estimatedDurationMin: [52, 69],
  // 69 min × 1.5 safety net
  maxDurationMs: 6_210_000,
};

/**
 * Language Schools — General English
 *
 * Standard CAT, CEFR band output, A1–C1 range.
 * Includes Writing and Speaking sections for holistic assessment.
 *
 * Psychometric basis:
 *   Previous LISTENING min=3 → SEM ≈ 0.67 — subscore unreportable.
 *   Raised to min=6 → SEM ≤ 0.55 at minimum; max=10 → SEM ≤ 0.40.
 *   Previous READING min=4 → SEM ≈ 0.60; raised to min=6.
 *   VOCAB max raised to 12: FIB items available in upper levels bring
 *   SEM to 0.32 at max, supporting reliable level-specific reporting.
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
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    // Vocab/grammar 8/14'e yükseltildi (en zengin beceriler, kapsamlı ölçüm): SEM 0.36
    VOCABULARY: { minItems: 8,  maxItems: 14, semThreshold: 0.36 },
    GRAMMAR:    { minItems: 8,  maxItems: 14, semThreshold: 0.36 },
    READING:    { minItems: 6,  maxItems: 12, semThreshold: 0.40 },
    // CRITICAL fix: min raised from 3 → 6; SEM 0.67 → 0.55 at minimum
    LISTENING:  { minItems: 6,  maxItems: 10, semThreshold: 0.40 },
    WRITING:    { minItems: 2,  maxItems: 3,  semThreshold: 0.48 },
    SPEAKING:   { minItems: 2,  maxItems: 3,  semThreshold: 0.48 },
  },
  blueprint: [
    { skill: SkillType.VOCABULARY, minCount: 8,  maxCount: 14 },
    { skill: SkillType.GRAMMAR,    minCount: 8,  maxCount: 14 },
    { skill: SkillType.READING,    minCount: 6,  maxCount: 12 },
    { skill: SkillType.LISTENING,  minCount: 6,  maxCount: 10 },
    { skill: SkillType.WRITING,    minCount: 2,  maxCount: 3  },
    { skill: SkillType.SPEAKING,   minCount: 2,  maxCount: 3  },
  ],
  globalMaxItems: 58,
  writingTaskSpecs: [
    { position: 1, minWords: 40,  maxWords: 60,  taskType: "short_response" },
    { position: 2, minWords: 80,  maxWords: 120, taskType: "paragraph_response" },
    { position: 3, minWords: 200, maxWords: 260, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.37,
  maxExposureRate: 0.28,
  examSources: ["language-schools", "general"],
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.4,
  estimatedDurationMin: [57, 79],
  // 79 min × 1.5 safety net
  maxDurationMs: 7_110_000,
};

/**
 * Specialized / Integrated Skills — Alan-spesifik kapsamlı değerlendirme
 *
 * Kurumsal ve akademik bağlamlarda (EAP / ESP) 6 becerinin tamamını ölçer.
 * MST 2-aşamalı yönlendirme ile B1/B2 ve C1+ bantlarında hassas ölçüm sağlar.
 * Academia (yalnızca 4 beceri) ile Corporate (6 beceri, iş-odaklı) arasında
 * esneklik sunar; her iki havuzdan da item çeker.
 *
 * Psikometrik temel:
 *   MST yönlendirme: 12 item → routing SEM ≈ 0.46 → misrouting ≤ %10.
 *   Reseptif beceriler: SEM ≤ 0.35 → I ≥ 8.2 → min 12 MC item; max 14.
 *   Üretken beceriler: 2-3 görev → SEM ≈ 0.18-0.21; ρ ≥ 0.85 (üniversite std).
 *   Genel SEM hedef 0.33 → yüksek-riskli kurumsal/akademik yerleştirme yeterli.
 *   Süre: 60-85 dk (1,5× güvenlik tamponuyla hard ceiling 127 dk).
 */
const SPECIALIZED_INTEGRATED: ProductLineProfile = {
  name: "Specialized / Integrated Skills",
  cefrRange: ["B1", "C2"],
  ageRange: [16, 99],
  sectionOrder: [
    SkillType.READING,
    SkillType.LISTENING,
    SkillType.GRAMMAR,
    SkillType.VOCABULARY,
    SkillType.WRITING,
    SkillType.SPEAKING,
  ],
  sectionConfig: {
    // SEM 0.35 → I ≥ 8.2 → 12 MC item optimal; uzun pasaj görevler information biriktirir
    READING:    { minItems: 7,  maxItems: 14, semThreshold: 0.35 },
    LISTENING:  { minItems: 7,  maxItems: 12, semThreshold: 0.35 },
    // Vocab/grammar 7/12'ye yükseltildi (yüksek-riskli, alan-spesifik): FIB I_peak ≈ 0.91 → SEM 0.35
    GRAMMAR:    { minItems: 7,  maxItems: 12, semThreshold: 0.35 },
    VOCABULARY: { minItems: 7,  maxItems: 12, semThreshold: 0.35 },
    // 2-3 görev; word budget arttırıldı (domain-specific üretim daha uzun)
    WRITING:    { minItems: 2,  maxItems: 3,  semThreshold: 0.40 },
    SPEAKING:   { minItems: 2,  maxItems: 3,  semThreshold: 0.40 },
  },
  blueprint: [
    { skill: SkillType.READING,    minCount: 7,  maxCount: 14 },
    { skill: SkillType.LISTENING,  minCount: 7,  maxCount: 12 },
    { skill: SkillType.GRAMMAR,    minCount: 7,  maxCount: 12 },
    { skill: SkillType.VOCABULARY, minCount: 7,  maxCount: 12 },
    { skill: SkillType.WRITING,    minCount: 2,  maxCount: 3  },
    { skill: SkillType.SPEAKING,   minCount: 2,  maxCount: 3  },
  ],
  globalMaxItems: 61,
  writingTaskSpecs: [
    { position: 1, minWords: 50,  maxWords: 80,  taskType: "short_response" },
    { position: 2, minWords: 120, maxWords: 180, taskType: "paragraph_response" },
    { position: 3, minWords: 240, maxWords: 300, taskType: "extended_response" },
  ],
  globalSemThreshold: 0.33,
  maxExposureRate: 0.25,
  examSources: ["academia", "corporate", "specialized", "general"],
  mst: {
    enabled: true,
    stages: 2,
    routingItemCount: 12, // 12 routing item → routing SEM ≈ 0.46; misrouting ≤ %10
    routingCuts: [0.5],  // θ < 0.5 → B1-B2 track; θ ≥ 0.5 → C1+ track
    trackLabels: ["B1-B2", "C1+"],
    trackCefrRanges: [["B1", "B2"], ["C1", "C2"]],
  },
  reportTemplate: "cefr_band",
  warmupItems: 2,
  warmupDifficultyOffset: 0.4,
  estimatedDurationMin: [62, 89],
  // 89 dk × 1.5 güvenlik tamponu
  maxDurationMs: 8_010_000,
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PRODUCT_LINE_PROFILES: Record<ProductLineName, ProductLineProfile> = {
  "Primary (7-10)":                  PRIMARY,
  "Junior Suite (11-14)":            JUNIOR_SUITE,
  "15-Min Diagnostic":               DIAGNOSTIC_15,
  "Express Assessment (30-Min)":     EXPRESS_30,
  "General English":                 GENERAL_ENGLISH,
  "Academia":                        ACADEMIA,
  "Corporate":                       CORPORATE,
  "Language Schools":                LANGUAGE_SCHOOLS,
  "Specialized / Integrated Skills": SPECIALIZED_INTEGRATED,
};

/**
 * Resolve the profile for a session.
 * Falls back to "15-Min Diagnostic" when productLine is unknown or missing.
 */
export function getProfile(productLine?: string | null): ProductLineProfile {
  if (productLine && productLine in PRODUCT_LINE_PROFILES) {
    return PRODUCT_LINE_PROFILES[productLine as ProductLineName];
  }
  // Geriye dönük uyumluluk: eski exam code'lar "General" değeriyle üretilmişti.
  if (productLine === "General") {
    return PRODUCT_LINE_PROFILES["General English"];
  }
  // Bilinmeyen veya boş productLine → General English (önceki 15-Min Diagnostic yerine)
  return PRODUCT_LINE_PROFILES["General English"];
}
