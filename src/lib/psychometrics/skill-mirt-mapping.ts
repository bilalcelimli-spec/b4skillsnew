/**
 * Skill-to-MIRT Dimension Mapping
 *
 * Q2.3: Maps each skill to the 4D MIRT latent trait space:
 * - θ₁ (Receptive): READING + LISTENING
 * - θ₂ (Productive): WRITING + SPEAKING
 * - θ₃ (Grammatical): GRAMMAR + VOCABULARY
 * - θ₄ (Strategic): Discourse, pragmatics, inference
 *
 * Each skill has a "loading vector" specifying how much it depends on each dimension.
 * For example, READING primarily loads on θ₁ (0.80) with secondary loads on θ₃ and θ₄.
 *
 * This module converts skill-level IRT parameters into 4D parameters that reflect
 * the skill's position in the multidimensional space.
 */

import type { SkillType } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Loading vector for a skill across the 4D space.
 * Sums to 1.0, with primary dimension dominant (0.75–0.85).
 */
export type LoadingVector = [number, number, number, number]; // [θ₁, θ₂, θ₃, θ₄]

/**
 * Canonical skill-to-dimension mappings.
 * Derived from linguistic theory and empirical factor analysis.
 */
export const SKILL_LOADING_VECTORS: Record<SkillType, LoadingVector> = {
  // ── Receptive (comprehension) ──
  READING: [0.80, 0.05, 0.10, 0.05],
  LISTENING: [0.80, 0.05, 0.10, 0.05],

  // ── Productive (expression) ──
  WRITING: [0.05, 0.80, 0.10, 0.05],
  SPEAKING: [0.05, 0.80, 0.10, 0.05],

  // ── Linguistic knowledge ──
  GRAMMAR: [0.05, 0.05, 0.85, 0.05],
  VOCABULARY: [0.10, 0.10, 0.75, 0.05],
};

/**
 * Dimension labels for clarity in reports and logs.
 */
export const DIMENSION_LABELS = [
  "receptive",    // θ₁: READING + LISTENING
  "productive",   // θ₂: WRITING + SPEAKING
  "grammatical",  // θ₃: GRAMMAR + VOCABULARY
  "strategic",    // θ₄: Discourse, pragmatics, inference
] as const;

export type DimensionName = typeof DIMENSION_LABELS[number];

/**
 * Mapping from dimension index to its semantic meaning.
 */
export const DIMENSION_DESCRIPTIONS: Record<0 | 1 | 2 | 3, string> = {
  0: "Receptive ability (comprehension of spoken & written language)",
  1: "Productive ability (expression in speech & writing)",
  2: "Grammatical & lexical knowledge (accuracy & range)",
  3: "Strategic competence (discourse, pragmatics, inference)",
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the loading vector for a given skill.
 * Returns null if the skill is not recognized.
 */
export function getLoadingVector(skill: SkillType): LoadingVector | null {
  return SKILL_LOADING_VECTORS[skill] ?? null;
}

/**
 * Validate that a loading vector sums to 1.0 (within tolerance).
 * Returns true if valid, false otherwise.
 */
export function isValidLoadingVector(vec: LoadingVector, tolerance = 0.01): boolean {
  const sum = vec[0] + vec[1] + vec[2] + vec[3];
  return Math.abs(sum - 1.0) < tolerance;
}

/**
 * Get primary dimension index for a skill (highest loading).
 * Returns 0, 1, 2, or 3.
 */
export function getPrimaryDimension(skill: SkillType): 0 | 1 | 2 | 3 {
  const vec = SKILL_LOADING_VECTORS[skill];
  if (!vec) return 0; // Default to receptive
  let maxIdx = 0;
  for (let i = 1; i < 4; i++) {
    if (vec[i] > vec[maxIdx]) maxIdx = i;
  }
  return maxIdx as 0 | 1 | 2 | 3;
}

/**
 * Compute the expected 4D response probability given 4D ability and
 * a skill's 4D item parameters.
 *
 * Uses the compensatory MIRT model:
 *   P(u=1|θ₁,θ₂,θ₃,θ₄) = c + (1-c) · σ(a₁θ₁ + a₂θ₂ + a₃θ₃ + a₄θ₄ + d)
 *
 * where σ is the logistic function.
 *
 * @param theta4d  Examinee's 4D ability vector
 * @param a4d      4D discrimination vector
 * @param d        Intercept parameter
 * @param c        Guessing parameter (0 for most dichotomous items)
 * @returns        Probability ∈ [0, 1]
 */
export function mirtResponseProbability(
  theta4d: [number, number, number, number],
  a4d: [number, number, number, number],
  d: number,
  c: number = 0
): number {
  // Compute linear predictor: a·θ + d
  const eta = a4d[0] * theta4d[0] +
              a4d[1] * theta4d[1] +
              a4d[2] * theta4d[2] +
              a4d[3] * theta4d[3] +
              d;

  // Logistic function: 1 / (1 + exp(-eta))
  const logisticTerm = 1 / (1 + Math.exp(-eta));

  // 3PL: c + (1-c) · logistic
  return c + (1 - c) * logisticTerm;
}

/**
 * Convert a skill's 1D IRT parameters to 4D by distributing the
 * discrimination across dimensions according to the skill's loading vector.
 *
 * This is a heuristic transformation used during calibration to initialize
 * 4D item parameters from skill-specific 1D parameters.
 *
 * @param a1d           1D discrimination (skill-specific)
 * @param b1d           1D difficulty (skill-specific)
 * @param c1d           1D guessing parameter
 * @param skillLoadings Loading vector for this skill
 * @returns             4D parameters [a₁, a₂, a₃, a₄, d, c]
 */
export function transform1dTo4d(
  a1d: number,
  b1d: number,
  c1d: number,
  skillLoadings: LoadingVector
): {
  a4d: [number, number, number, number];
  d: number;
  c: number;
} {
  // Scale discrimination vector by skill loadings
  // Higher loading → higher discrimination on that dimension
  const a4d: [number, number, number, number] = [
    a1d * skillLoadings[0],
    a1d * skillLoadings[1],
    a1d * skillLoadings[2],
    a1d * skillLoadings[3],
  ];

  // Difficulty → intercept (approximate mapping)
  // d ≈ −‖a4d‖ · b1d (common approximation in MIRT)
  const normA4d = Math.sqrt(a4d[0] ** 2 + a4d[1] ** 2 + a4d[2] ** 2 + a4d[3] ** 2);
  const d = -normA4d * b1d;

  return { a4d, d, c: c1d };
}

/**
 * Compute the conditional information for a skill's contribution to each dimension.
 * Higher information on a dimension means that skill better discriminates on that dimension.
 *
 * @param theta4d  Examinee ability
 * @param a4d      4D discrimination
 * @param d        Intercept
 * @returns        Information values [I₁, I₂, I₃, I₄] (≥ 0)
 */
export function conditionalInformation4d(
  theta4d: [number, number, number, number],
  a4d: [number, number, number, number],
  d: number
): [number, number, number, number] {
  const p = mirtResponseProbability(theta4d, a4d, d);
  const pq = p * (1 - p);

  // Fisher information: I_k = (a_k)² · p(1-p)
  const info: [number, number, number, number] = [
    a4d[0] ** 2 * pq,
    a4d[1] ** 2 * pq,
    a4d[2] ** 2 * pq,
    a4d[3] ** 2 * pq,
  ];

  return info;
}

/**
 * Analyze how balanced a skill's information is across dimensions.
 * A perfectly balanced skill contributes equally to all 4 dimensions.
 * A specialized skill (e.g., GRAMMAR) concentrates information on one dimension.
 *
 * @returns  Balance index ∈ [0, 1]
 *           1.0 = perfectly balanced
 *           0.25 = highly specialized (all info on one dimension)
 */
export function computeInformationBalance(
  info: [number, number, number, number]
): number {
  const total = info[0] + info[1] + info[2] + info[3];
  if (total === 0) return 0.25; // Default to specialized

  // Compute entropy as balance metric
  // H = -Σ(p_k · log(p_k)) where p_k = I_k / total
  // H_max = log(4) ≈ 1.386 for uniform distribution
  // Balance = H / H_max ∈ [0, 1]
  let entropy = 0;
  for (let k = 0; k < 4; k++) {
    const p_k = info[k] / total;
    if (p_k > 0) {
      entropy -= p_k * Math.log(p_k);
    }
  }
  const maxEntropy = Math.log(4);
  return entropy / maxEntropy;
}

/**
 * Skill characterization for diagnostic reports.
 * Shows which dimensions each skill targets and how effectively.
 */
export interface SkillCharacterization {
  skill: SkillType;
  loadings: LoadingVector;
  primaryDimension: DimensionName;
  secondaryDimensions: DimensionName[];
  specialization: "broad" | "focused" | "highly_specialized";
}

/**
 * Characterize a skill based on its loading vector.
 */
export function characterizeSkill(skill: SkillType): SkillCharacterization {
  const loadings = SKILL_LOADING_VECTORS[skill];
  if (!loadings) {
    throw new Error(`Unknown skill: ${skill}`);
  }

  const primaryIdx = getPrimaryDimension(skill);
  const primaryDimension = DIMENSION_LABELS[primaryIdx];

  // Secondary dimensions: any with loading > 0.05
  const secondaryDimensions: DimensionName[] = [];
  for (let i = 0; i < 4; i++) {
    if (i !== primaryIdx && loadings[i] > 0.05) {
      secondaryDimensions.push(DIMENSION_LABELS[i]);
    }
  }

  // Specialization level
  let specialization: "broad" | "focused" | "highly_specialized";
  if (loadings[primaryIdx] >= 0.80) {
    specialization = "highly_specialized";
  } else if (loadings[primaryIdx] >= 0.65) {
    specialization = "focused";
  } else {
    specialization = "broad";
  }

  return {
    skill,
    loadings,
    primaryDimension,
    secondaryDimensions,
    specialization,
  };
}

/**
 * Summary of the skill mapping structure for logging and validation.
 */
export function getSkillMappingSummary(): Record<SkillType, SkillCharacterization> {
  const summary: Partial<Record<SkillType, SkillCharacterization>> = {};
  for (const skill of Object.keys(SKILL_LOADING_VECTORS) as SkillType[]) {
    summary[skill] = characterizeSkill(skill);
  }
  return summary as Record<SkillType, SkillCharacterization>;
}

/**
 * Validate that the entire skill mapping is consistent and well-formed.
 * Checks:
 * - All skills have valid loading vectors (sum to 1.0)
 * - Primary loadings are all ≥ 0.75 (skills are specialized enough)
 * - Each dimension is covered by at least one skill
 *
 * @returns { valid: boolean; issues: string[] }
 */
export function validateSkillMapping(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check each skill
  for (const [skill, loadings] of Object.entries(SKILL_LOADING_VECTORS) as [SkillType, LoadingVector][]) {
    if (!isValidLoadingVector(loadings)) {
      issues.push(`${skill}: Loading vector does not sum to 1.0`);
    }

    const primaryLoad = Math.max(...loadings);
    if (primaryLoad < 0.75) {
      issues.push(`${skill}: Primary loading (${primaryLoad.toFixed(2)}) < 0.75 (not specialized enough)`);
    }
  }

  // Check that each dimension is covered
  const dimensionCoverage = [0, 0, 0, 0]; // One entry per dimension
  for (const loadings of Object.values(SKILL_LOADING_VECTORS)) {
    for (let d = 0; d < 4; d++) {
      if (loadings[d] >= 0.05) dimensionCoverage[d]++;
    }
  }

  for (let d = 0; d < 4; d++) {
    if (dimensionCoverage[d] === 0) {
      issues.push(`${DIMENSION_LABELS[d]}: No skill loads significantly on this dimension`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
