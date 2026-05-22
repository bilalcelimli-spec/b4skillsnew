/**
 * Tests for Skill-to-MIRT Dimension Mapping
 *
 * Validates:
 * - Loading vector structure and constraints
 * - 1D→4D parameter transformation
 * - Response probability computation
 * - Skill characterization and diagnostics
 */

import { describe, it, expect } from 'vitest';
import {
  SKILL_LOADING_VECTORS,
  DIMENSION_LABELS,
  getLoadingVector,
  isValidLoadingVector,
  getPrimaryDimension,
  mirtResponseProbability,
  transform1dTo4d,
  conditionalInformation4d,
  computeInformationBalance,
  characterizeSkill,
  getSkillMappingSummary,
  validateSkillMapping,
} from '../skill-mirt-mapping.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Loading Vector Properties
// ─────────────────────────────────────────────────────────────────────────────

describe('Skill Loading Vectors', () => {
  it('should have valid loading vectors for all skills', () => {
    for (const [skill, loadings] of Object.entries(SKILL_LOADING_VECTORS)) {
      expect(
        isValidLoadingVector(loadings),
        `${skill} loading vector should sum to 1.0`
      ).toBe(true);
    }
  });

  it('should have primary loading ≥ 0.75 for all skills', () => {
    for (const [skill, loadings] of Object.entries(SKILL_LOADING_VECTORS)) {
      const primaryLoad = Math.max(...loadings);
      expect(
        primaryLoad,
        `${skill} should have specialized primary loading`
      ).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('should have each dimension covered by at least one skill', () => {
    const dimCoverage = [0, 0, 0, 0];
    for (const loadings of Object.values(SKILL_LOADING_VECTORS)) {
      for (let d = 0; d < 4; d++) {
        if (loadings[d] >= 0.05) dimCoverage[d]++;
      }
    }
    for (let d = 0; d < 4; d++) {
      expect(dimCoverage[d], `Dimension ${d} should be covered`).toBeGreaterThan(0);
    }
  });

  it('should map receptive skills (READING, LISTENING) to θ₁ primarily', () => {
    expect(SKILL_LOADING_VECTORS.READING[0]).toBe(0.80);
    expect(SKILL_LOADING_VECTORS.LISTENING[0]).toBe(0.80);
  });

  it('should map productive skills (WRITING, SPEAKING) to θ₂ primarily', () => {
    expect(SKILL_LOADING_VECTORS.WRITING[1]).toBe(0.80);
    expect(SKILL_LOADING_VECTORS.SPEAKING[1]).toBe(0.80);
  });

  it('should map grammatical skills (GRAMMAR, VOCABULARY) to θ₃ primarily', () => {
    expect(SKILL_LOADING_VECTORS.GRAMMAR[2]).toBe(0.85);
    expect(SKILL_LOADING_VECTORS.VOCABULARY[2]).toBeGreaterThan(0.70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

describe('getLoadingVector()', () => {
  it('should return correct loading vector for known skills', () => {
    const readingLoadings = getLoadingVector('READING');
    expect(readingLoadings).toEqual([0.80, 0.05, 0.10, 0.05]);
  });

  it('should return null for unknown skill', () => {
    const unknownLoadings = getLoadingVector('UNKNOWN' as any);
    expect(unknownLoadings).toBeNull();
  });
});

describe('isValidLoadingVector()', () => {
  it('should accept vectors that sum to 1.0', () => {
    expect(isValidLoadingVector([0.25, 0.25, 0.25, 0.25])).toBe(true);
    expect(isValidLoadingVector([0.80, 0.05, 0.10, 0.05])).toBe(true);
  });

  it('should reject vectors that do not sum to 1.0', () => {
    expect(isValidLoadingVector([0.25, 0.25, 0.25, 0.24])).toBe(false);
    expect(isValidLoadingVector([1.0, 0, 0, 0])).toBe(true);
  });

  it('should use tolerance parameter', () => {
    const vec: [number, number, number, number] = [0.25, 0.25, 0.25, 0.251];
    expect(isValidLoadingVector(vec, 0.01)).toBe(true);
    expect(isValidLoadingVector(vec, 0.0005)).toBe(false); // Sum is 1.001, diff is 0.001
  });
});

describe('getPrimaryDimension()', () => {
  it('should return 0 (receptive) for READING', () => {
    expect(getPrimaryDimension('READING')).toBe(0);
  });

  it('should return 1 (productive) for WRITING', () => {
    expect(getPrimaryDimension('WRITING')).toBe(1);
  });

  it('should return 2 (grammatical) for GRAMMAR', () => {
    expect(getPrimaryDimension('GRAMMAR')).toBe(2);
  });

  it('should return highest-loading dimension', () => {
    const dim = getPrimaryDimension('VOCABULARY');
    const vocabLoadings = SKILL_LOADING_VECTORS.VOCABULARY;
    expect(dim).toBe(vocabLoadings.indexOf(Math.max(...vocabLoadings)));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: MIRT Response Probability
// ─────────────────────────────────────────────────────────────────────────────

describe('mirtResponseProbability()', () => {
  it('should return probability in [0, 1]', () => {
    const theta = [0, 0, 0, 0] as [number, number, number, number];
    const a = [1, 1, 1, 1] as [number, number, number, number];
    const p = mirtResponseProbability(theta, a, 0, 0);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('should return 0.5 when eta=0 (logistic midpoint)', () => {
    const theta = [0, 0, 0, 0] as [number, number, number, number];
    const a = [1, 1, 1, 1] as [number, number, number, number];
    const p = mirtResponseProbability(theta, a, 0, 0);
    expect(p).toBeCloseTo(0.5, 5);
  });

  it('should increase probability with higher ability', () => {
    const a = [1, 1, 1, 1] as [number, number, number, number];
    const p1 = mirtResponseProbability([-2, -2, -2, -2] as any, a, 0, 0);
    const p2 = mirtResponseProbability([0, 0, 0, 0] as any, a, 0, 0);
    const p3 = mirtResponseProbability([2, 2, 2, 2] as any, a, 0, 0);
    expect(p1).toBeLessThan(p2);
    expect(p2).toBeLessThan(p3);
  });

  it('should apply guessing parameter correctly', () => {
    const theta = [-5, -5, -5, -5] as [number, number, number, number];
    const a = [1, 1, 1, 1] as [number, number, number, number];
    const p_no_guess = mirtResponseProbability(theta, a, 0, 0);
    const p_with_guess = mirtResponseProbability(theta, a, 0, 0.25);
    expect(p_with_guess).toBeGreaterThan(p_no_guess);
    expect(p_with_guess).toBeCloseTo(0.25, 3); // Should approach 0.25 at very low ability
  });

  it('should weight dimensions by discrimination values', () => {
    const theta = [2, 0, 0, 0] as [number, number, number, number];
    const a_strong = [2, 1, 1, 1] as [number, number, number, number];
    const a_weak = [0.5, 1, 1, 1] as [number, number, number, number];
    const p_strong = mirtResponseProbability(theta, a_strong, 0, 0);
    const p_weak = mirtResponseProbability(theta, a_weak, 0, 0);
    expect(p_strong).toBeGreaterThan(p_weak);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: 1D → 4D Transformation
// ─────────────────────────────────────────────────────────────────────────────

describe('transform1dTo4d()', () => {
  it('should produce valid 4D parameters from 1D input', () => {
    const reading_loadings = SKILL_LOADING_VECTORS.READING;
    const result = transform1dTo4d(1.5, 0.8, 0.2, reading_loadings);

    expect(result.a4d).toHaveLength(4);
    expect(result.c).toBe(0.2);
  });

  it('should distribute discrimination according to skill loadings', () => {
    const loadings = [0.80, 0.05, 0.10, 0.05] as [number, number, number, number];
    const result = transform1dTo4d(1.0, 0, 0, loadings);

    // a4d should be proportional to loadings
    expect(result.a4d[0]).toBeGreaterThan(result.a4d[1]);
    expect(result.a4d[0]).toBeGreaterThan(result.a4d[2]);
  });

  it('should approximate intercept from difficulty', () => {
    const loadings = [1, 0, 0, 0] as [number, number, number, number];
    const result = transform1dTo4d(1.0, 1.0, 0, loadings);

    // d ≈ −‖a4d‖ · b, so d should be negative when b is positive
    expect(result.d).toBeLessThan(0);
  });

  it('should preserve guessing parameter', () => {
    const loadings = [0.25, 0.25, 0.25, 0.25] as [number, number, number, number];
    const c = 0.15;
    const result = transform1dTo4d(1.5, 0.5, c, loadings);
    expect(result.c).toBe(c);
  });

  it('should handle edge cases (zero discrimination)', () => {
    const loadings = [0.25, 0.25, 0.25, 0.25] as [number, number, number, number];
    const result = transform1dTo4d(0, 0, 0, loadings);
    expect(result.a4d.every(a => a === 0)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Information Analysis
// ─────────────────────────────────────────────────────────────────────────────

describe('conditionalInformation4d()', () => {
  it('should return non-negative information values', () => {
    const theta = [0, 0, 0, 0] as [number, number, number, number];
    const a = [1, 1, 1, 1] as [number, number, number, number];
    const info = conditionalInformation4d(theta, a, 0);

    for (const i of info) {
      expect(i).toBeGreaterThanOrEqual(0);
    }
  });

  it('should maximize information at θ=0 (item difficulty point)', () => {
    const a = [1, 1, 1, 1] as [number, number, number, number];
    const info_center = conditionalInformation4d([0, 0, 0, 0] as any, a, 0);
    const info_extreme = conditionalInformation4d([3, 3, 3, 3] as any, a, 0);

    // At extreme ability, information decreases (p→0 or p→1)
    expect(info_center.reduce((a, b) => a + b, 0)).toBeGreaterThan(
      info_extreme.reduce((a, b) => a + b, 0)
    );
  });

  it('should allocate information according to discrimination', () => {
    const theta = [0, 0, 0, 0] as [number, number, number, number];
    const a = [2, 1, 1, 1] as [number, number, number, number];
    const info = conditionalInformation4d(theta, a, 0);

    // Higher discrimination → higher information
    expect(info[0]).toBeGreaterThan(info[1]);
    expect(info[0]).toBeGreaterThan(info[2]);
  });
});

describe('computeInformationBalance()', () => {
  it('should return value in [0, 1]', () => {
    const info: [number, number, number, number] = [1, 1, 1, 1];
    const balance = computeInformationBalance(info);
    expect(balance).toBeGreaterThanOrEqual(0);
    expect(balance).toBeLessThanOrEqual(1);
  });

  it('should return 1.0 for perfectly balanced information', () => {
    const info: [number, number, number, number] = [1, 1, 1, 1];
    const balance = computeInformationBalance(info);
    expect(balance).toBeCloseTo(1.0, 5);
  });

  it('should return lower values for specialized information', () => {
    const balanced: [number, number, number, number] = [1, 1, 1, 1];
    const specialized: [number, number, number, number] = [4, 0, 0, 0];

    const balanceB = computeInformationBalance(balanced);
    const balanceS = computeInformationBalance(specialized);

    expect(balanceS).toBeLessThan(balanceB);
  });

  it('should handle zero information gracefully', () => {
    const info: [number, number, number, number] = [0, 0, 0, 0];
    const balance = computeInformationBalance(info);
    expect(balance).toBe(0.25); // Default (specialized)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 6: Skill Characterization
// ─────────────────────────────────────────────────────────────────────────────

describe('characterizeSkill()', () => {
  it('should correctly characterize READING as receptive-focused', () => {
    const char = characterizeSkill('READING');
    expect(char.skill).toBe('READING');
    expect(char.primaryDimension).toBe('receptive');
    expect(char.specialization).toBe('highly_specialized');
  });

  it('should identify secondary dimensions', () => {
    const char = characterizeSkill('READING');
    expect(char.secondaryDimensions).toContain('grammatical');
    // Strategic has loading exactly 0.05, which doesn't qualify as secondary (> 0.05)
    expect(char.secondaryDimensions).not.toContain('strategic');
  });

  it('should characterize each skill correctly', () => {
    const chars = getSkillMappingSummary();

    expect(chars.READING.primaryDimension).toBe('receptive');
    expect(chars.LISTENING.primaryDimension).toBe('receptive');
    expect(chars.WRITING.primaryDimension).toBe('productive');
    expect(chars.SPEAKING.primaryDimension).toBe('productive');
    expect(chars.GRAMMAR.primaryDimension).toBe('grammatical');
    expect(chars.VOCABULARY.primaryDimension).toBe('grammatical');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 7: Mapping Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validateSkillMapping()', () => {
  it('should report valid mapping as valid', () => {
    const result = validateSkillMapping();
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should provide human-readable validation report', () => {
    const result = validateSkillMapping();
    if (!result.valid) {
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 8: Integration Scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('End-to-end skill mapping scenario', () => {
  it('should map a READING item response to 4D space correctly', () => {
    // Given a READING item calibrated at (a=1.5, b=0.8, c=0.2)
    const a1d = 1.5;
    const b1d = 0.8;
    const c1d = 0.2;
    const readingLoadings = SKILL_LOADING_VECTORS.READING;

    // Convert to 4D
    const { a4d, d, c } = transform1dTo4d(a1d, b1d, c1d, readingLoadings);

    // Simulate an examinee at θ₁=1.0, θ₂=0, θ₃=0.5, θ₄=0.2
    const theta4d = [1.0, 0, 0.5, 0.2] as [number, number, number, number];

    // Get response probability
    const p = mirtResponseProbability(theta4d, a4d, d, c);

    // Should be reasonable probability (not extreme)
    expect(p).toBeGreaterThan(0.1);
    expect(p).toBeLessThan(0.9);
  });

  it('should produce consistent results across multiple calls', () => {
    const theta = [1, 2, -1, 0.5] as [number, number, number, number];
    const a = [1.2, 0.9, 1.5, 0.8] as [number, number, number, number];
    const d = 0.6;
    const c = 0.1;

    const p1 = mirtResponseProbability(theta, a, d, c);
    const p2 = mirtResponseProbability(theta, a, d, c);
    const p3 = mirtResponseProbability(theta, a, d, c);

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
  });
});
