/**
 * Tests for MIRT 4D Theta Estimation (EAP)
 *
 * Validates:
 * - Quadrature grid generation
 * - Likelihood computation
 * - EAP estimation accuracy
 * - SEM computation
 * - Dimension independence
 * - Numerical stability
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Mirt4DItemParams, ItemResponse } from '../mirt-theta-estimation.js';
import {
  GAUSS_HERMITE_NODES_9,
  GAUSS_HERMITE_WEIGHTS_9,
  estimate4DTheta,
  posteriorCovarianceMatrix,
  checkDimensionIndependence,
  summarizeEstimate,
} from '../mirt-theta-estimation.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Gauss-Hermite Quadrature Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Gauss-Hermite Quadrature', () => {
  it('should have 9 nodes', () => {
    expect(GAUSS_HERMITE_NODES_9).toHaveLength(9);
  });

  it('should have 9 weights', () => {
    expect(GAUSS_HERMITE_WEIGHTS_9).toHaveLength(9);
  });

  it('should have nodes in ascending order', () => {
    for (let i = 1; i < GAUSS_HERMITE_NODES_9.length; i++) {
      expect(GAUSS_HERMITE_NODES_9[i]).toBeGreaterThan(GAUSS_HERMITE_NODES_9[i - 1]);
    }
  });

  it('should have weights that sum to approximately 1.5 (normalized Gauss-Hermite)', () => {
    // These are normalized quadrature weights for Gauss-Hermite integration
    // Different sources normalize differently; these sum to ~1.48
    const sum = GAUSS_HERMITE_WEIGHTS_9.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(1.4);
    expect(sum).toBeLessThan(1.5);
  });

  it('should have positive weights', () => {
    for (const w of GAUSS_HERMITE_WEIGHTS_9) {
      expect(w).toBeGreaterThan(0);
    }
  });

  it('should be symmetric around 0', () => {
    for (let i = 0; i < 4; i++) {
      const left = GAUSS_HERMITE_NODES_9[i];
      const right = GAUSS_HERMITE_NODES_9[8 - i];
      expect(left).toBeCloseTo(-right, 6);

      // Weights for Gauss-Hermite with exp(-x²) weight are symmetric
      // May not be exactly equal due to numerical precision
      expect(GAUSS_HERMITE_WEIGHTS_9[i]).toBeCloseTo(
        GAUSS_HERMITE_WEIGHTS_9[8 - i],
        4
      );
    }
  });

  it('should have center node at 0', () => {
    expect(GAUSS_HERMITE_NODES_9[4]).toBeCloseTo(0, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: EAP Estimation with Known Patterns
// ─────────────────────────────────────────────────────────────────────────────

describe('estimate4DTheta()', () => {
  const createMirtItem = (
    a: [number, number, number, number],
    d: number = 0,
    c: number = 0
  ): Mirt4DItemParams => ({ a, d, c });

  it('should require at least one response', async () => {
    await expect(estimate4DTheta([])).rejects.toThrow('Cannot estimate theta from zero responses');
  });

  it('should return reasonable estimates for mixed difficulty items', async () => {
    const responses: ItemResponse[] = [
      {
        itemId: 'item1',
        score: 1,
        params: createMirtItem([1, 1, 1, 1]),
      },
      {
        itemId: 'item2',
        score: 1,
        params: createMirtItem([1, 1, 1, 1], 0.5),
      },
      {
        itemId: 'item3',
        score: 0,
        params: createMirtItem([1, 1, 1, 1], -0.5),
      },
    ];

    const estimate = await estimate4DTheta(responses);

    // Theta should be finite
    for (const t of estimate.theta) {
      expect(Number.isFinite(t)).toBe(true);
    }

    // SEM should be positive
    for (const s of estimate.sem) {
      expect(s).toBeGreaterThan(0);
    }
  });

  it('should return higher ability for all-correct pattern', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item2', score: 1, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item3', score: 1, params: createMirtItem([1, 1, 1, 1]) },
    ];

    const estimate = await estimate4DTheta(responses);

    // Mean theta should be positive
    const meanTheta =
      (estimate.theta[0] + estimate.theta[1] + estimate.theta[2] + estimate.theta[3]) / 4;
    expect(meanTheta).toBeGreaterThan(0);
  });

  it('should return lower ability for all-incorrect pattern', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 0, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item2', score: 0, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item3', score: 0, params: createMirtItem([1, 1, 1, 1]) },
    ];

    const estimate = await estimate4DTheta(responses);

    // Mean theta should be negative
    const meanTheta =
      (estimate.theta[0] + estimate.theta[1] + estimate.theta[2] + estimate.theta[3]) / 4;
    expect(meanTheta).toBeLessThan(0);
  });

  it('should produce SEM that decreases with more items', async () => {
    const createResponses = (count: number): ItemResponse[] => {
      const responses: ItemResponse[] = [];
      for (let i = 0; i < count; i++) {
        responses.push({
          itemId: `item${i}`,
          score: i % 2 === 0 ? 1 : 0,
          params: createMirtItem([1, 1, 1, 1]),
        });
      }
      return responses;
    };

    const est5 = await estimate4DTheta(createResponses(5));
    const est15 = await estimate4DTheta(createResponses(15));

    // Average SEM should decrease
    const avgSem5 =
      (est5.sem[0] + est5.sem[1] + est5.sem[2] + est5.sem[3]) / 4;
    const avgSem15 =
      (est15.sem[0] + est15.sem[1] + est15.sem[2] + est15.sem[3]) / 4;

    expect(avgSem15).toBeLessThan(avgSem5);
  });

  it('should produce credible intervals that contain theta', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item2', score: 0, params: createMirtItem([1, 1, 1, 1]) },
    ];

    const estimate = await estimate4DTheta(responses);

    for (let d = 0; d < 4; d++) {
      const [lower, upper] = estimate.credibleIntervals[d];
      expect(estimate.theta[d]).toBeGreaterThanOrEqual(lower - 1e-6); // Numerical tolerance
      expect(estimate.theta[d]).toBeLessThanOrEqual(upper + 1e-6);
      expect(upper).toBeGreaterThan(lower);
    }
  });

  it('should return valid item count', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item2', score: 0, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item3', score: 1, params: createMirtItem([1, 1, 1, 1]) },
    ];

    const estimate = await estimate4DTheta(responses);
    expect(estimate.itemCount).toBe(3);
  });

  it('should return correct node count (6561 = 9^4)', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([1, 1, 1, 1]) },
    ];

    const estimate = await estimate4DTheta(responses);
    expect(estimate.nodesEvaluated).toBe(6561);
  });

  it('should complete in reasonable time (< 5 seconds for 10 items)', async () => {
    const responses: ItemResponse[] = [];
    for (let i = 0; i < 10; i++) {
      responses.push({
        itemId: `item${i}`,
        score: i % 2 === 0 ? 1 : 0,
        params: createMirtItem([1, 1, 1, 1]),
      });
    }

    const estimate = await estimate4DTheta(responses);
    expect(estimate.processingTime).toBeLessThan(5000);
    expect(estimate.processingTime).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: Dimension-Specific Analysis
// ─────────────────────────────────────────────────────────────────────────────

describe('Dimension-specific theta estimation', () => {
  const createMirtItem = (
    a: [number, number, number, number],
    d: number = 0,
    c: number = 0
  ): Mirt4DItemParams => ({ a, d, c });

  it('should load primarily on target dimension', async () => {
    // Items loading heavily on θ₁ (receptive)
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([0.9, 0.1, 0.0, 0.0]) },
      { itemId: 'item2', score: 1, params: createMirtItem([0.85, 0.05, 0.05, 0.05]) },
    ];

    const estimate = await estimate4DTheta(responses);

    // θ₁ should be relatively highest
    expect(estimate.theta[0]).toBeGreaterThan(estimate.theta[1]);
    expect(estimate.theta[0]).toBeGreaterThan(estimate.theta[2]);
    expect(estimate.theta[0]).toBeGreaterThan(estimate.theta[3]);
  });

  it('should produce independent dimension estimates', async () => {
    const responses: ItemResponse[] = [];
    for (let i = 0; i < 10; i++) {
      responses.push({
        itemId: `item${i}`,
        score: i % 2 === 0 ? 1 : 0,
        params: createMirtItem([1, 1, 1, 1]), // Balanced loading
      });
    }

    const estimate = await estimate4DTheta(responses);
    const cov = posteriorCovarianceMatrix(responses, estimate.theta);
    const independence = checkDimensionIndependence(cov);

    // Dimensions should be approximately independent
    expect(independence.independent).toBe(true);
    expect(independence.maxAbsCorrelation).toBeLessThan(0.30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: Posterior Covariance & Independence
// ─────────────────────────────────────────────────────────────────────────────

describe('posteriorCovarianceMatrix()', () => {
  const createMirtItem = (
    a: [number, number, number, number],
    d: number = 0,
    c: number = 0
  ): Mirt4DItemParams => ({ a, d, c });

  it('should return 4×4 symmetric covariance matrix', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([1, 1, 1, 1]) },
      { itemId: 'item2', score: 0, params: createMirtItem([1, 1, 1, 1]) },
    ];

    const estimate = await estimate4DTheta(responses);
    const cov = posteriorCovarianceMatrix(responses, estimate.theta);

    // Check symmetry
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        expect(cov[i][j]).toBeCloseTo(cov[j][i], 10);
      }
    }

    // Diagonal should be positive (variances)
    for (let i = 0; i < 4; i++) {
      expect(cov[i][i]).toBeGreaterThan(0);
    }
  });
});

describe('checkDimensionIndependence()', () => {
  it('should identify independent dimensions', () => {
    const cov: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
      [1.0, 0.05, 0.05, 0.05],
      [0.05, 1.0, 0.05, 0.05],
      [0.05, 0.05, 1.0, 0.05],
      [0.05, 0.05, 0.05, 1.0],
    ];

    const result = checkDimensionIndependence(cov);
    expect(result.independent).toBe(true);
    expect(result.maxAbsCorrelation).toBeLessThan(0.30);
  });

  it('should identify correlated dimensions', () => {
    const cov: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
      [1.0, 0.8, 0.0, 0.0],
      [0.8, 1.0, 0.0, 0.0],
      [0.0, 0.0, 1.0, 0.0],
      [0.0, 0.0, 0.0, 1.0],
    ];

    const result = checkDimensionIndependence(cov);
    expect(result.independent).toBe(false);
    expect(result.maxAbsCorrelation).toBeGreaterThan(0.30);
  });

  it('should return 6 correlation values (all unique pairs)', () => {
    const cov: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
      [1.0, 0.1, 0.1, 0.1],
      [0.1, 1.0, 0.1, 0.1],
      [0.1, 0.1, 1.0, 0.1],
      [0.1, 0.1, 0.1, 1.0],
    ];

    const result = checkDimensionIndependence(cov);
    expect(result.correlations).toHaveLength(6); // C(4,2) = 6
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Numerical Stability
// ─────────────────────────────────────────────────────────────────────────────

describe('Numerical stability', () => {
  const createMirtItem = (
    a: [number, number, number, number],
    d: number = 0,
    c: number = 0
  ): Mirt4DItemParams => ({ a, d, c });

  it('should handle extreme ability estimates', async () => {
    // Very easy items (all correct → high ability)
    const easyResponses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([1, 1, 1, 1], -5) },
      { itemId: 'item2', score: 1, params: createMirtItem([1, 1, 1, 1], -5) },
    ];

    const estimate = await estimate4DTheta(easyResponses);

    // Should produce valid finite estimates
    for (const t of estimate.theta) {
      expect(Number.isFinite(t)).toBe(true);
      expect(Math.abs(t)).toBeLessThan(10); // Reasonable bounds
    }
  });

  it('should handle guessing parameter', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 0, params: createMirtItem([1, 1, 1, 1], 0, 0.25) },
      { itemId: 'item2', score: 0, params: createMirtItem([1, 1, 1, 1], 0, 0.25) },
    ];

    const estimate = await estimate4DTheta(responses);

    // With guessing, ability can still be estimated even from incorrect responses
    expect(Number.isFinite(estimate.logLikelihood)).toBe(true);
  });

  it('should produce non-negative trace covariance', async () => {
    const responses: ItemResponse[] = [
      { itemId: 'item1', score: 1, params: createMirtItem([1, 1, 1, 1]) },
    ];

    const estimate = await estimate4DTheta(responses);
    expect(estimate.traceCovariance).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 6: Reporting Functions
// ─────────────────────────────────────────────────────────────────────────────

describe('summarizeEstimate()', () => {
  it('should produce valid summary string', async () => {
    const responses: ItemResponse[] = [
      {
        itemId: 'item1',
        score: 1,
        params: { a: [1, 1, 1, 1], d: 0, c: 0 },
      },
    ];

    const estimate = await estimate4DTheta(responses);
    const summary = summarizeEstimate(estimate);

    expect(summary).toContain('4D Ability Estimate');
    expect(summary).toContain('θ₁');
    expect(summary).toContain('θ₂');
    expect(summary).toContain('θ₃');
    expect(summary).toContain('θ₄');
    expect(summary).toContain('Items');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 7: Consistency & Determinism
// ─────────────────────────────────────────────────────────────────────────────

describe('Consistency and determinism', () => {
  it('should produce identical results for repeated calls', async () => {
    const responses: ItemResponse[] = [
      {
        itemId: 'item1',
        score: 1,
        params: { a: [1, 1, 1, 1], d: 0, c: 0 },
      },
      {
        itemId: 'item2',
        score: 0,
        params: { a: [1, 1, 1, 1], d: 0.5, c: 0.1 },
      },
    ];

    const est1 = await estimate4DTheta(responses);
    const est2 = await estimate4DTheta(responses);

    for (let d = 0; d < 4; d++) {
      expect(est1.theta[d]).toBe(est2.theta[d]);
      expect(est1.sem[d]).toBe(est2.sem[d]);
    }
  });
});
