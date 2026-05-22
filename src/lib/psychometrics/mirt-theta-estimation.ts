/**
 * MIRT 4D Theta Estimation — EAP (Expected A Posteriori)
 *
 * Q2.3 Phase 2: Estimates 4D ability vector from response pattern using
 * Expected A Posteriori (EAP) with 9-point Gauss-Hermite quadrature.
 *
 * The EAP approach integrates the posterior distribution over a discrete
 * grid of ability points (quadrature nodes), providing:
 * - Point estimate (posterior mean)
 * - Standard error (posterior SD)
 * - Posterior covariance matrix
 * - Log-likelihood for model fit assessment
 *
 * Quadrature: 9-point Gauss-Hermite on each of 4 dimensions
 *   → 9^4 = 6,561 integration nodes
 *   → Posterior computed via weighted sum at each node
 *   → EAP = Σ(θ_k · w_k) / Σ(w_k) where w_k = likelihood × prior
 *
 * References:
 *   Bock & Aitkin (1981). Marginal maximum likelihood estimation
 *   Mislevy & Bock (1989). Item response theory
 *   Reckase (2009). Multidimensional Item Response Theory
 */

import type { SkillType } from "../assessment-engine/types.js";
import { mirtResponseProbability } from "./skill-mirt-mapping.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 4D item parameters (from MIRT calibration or transformation).
 */
export interface Mirt4DItemParams {
  /** 4D discrimination vector [a1, a2, a3, a4] */
  a: [number, number, number, number];
  /** Intercept (d = −Σaᵢ·b in compensatory model) */
  d: number;
  /** Lower asymptote (guessing, typically 0–0.25) */
  c: number;
}

/**
 * Response record for a single item.
 */
export interface ItemResponse {
  itemId: string;
  score: 0 | 1; // Dichotomous: 0 = incorrect, 1 = correct
  params: Mirt4DItemParams;
}

/**
 * 4D ability estimate and associated statistics.
 */
export interface Mirt4DEstimate {
  /** Point estimate (posterior mean EAP) */
  theta: [number, number, number, number];
  /** Standard error of measurement per dimension */
  sem: [number, number, number, number];
  /** 90% credible interval per dimension [lower, upper] */
  credibleIntervals: [
    [number, number], // θ₁
    [number, number], // θ₂
    [number, number], // θ₃
    [number, number]  // θ₄
  ];
  /** Trace of posterior covariance (≈ total variance) */
  traceCovariance: number;
  /** Log-likelihood at posterior mean (model fit indicator) */
  logLikelihood: number;
  /** Number of items administered */
  itemCount: number;
  /** Number of quadrature nodes evaluated */
  nodesEvaluated: number;
  /** Processing time (milliseconds) */
  processingTime: number;
}

/**
 * Gauss-Hermite quadrature nodes and weights for 1D integration.
 * Standard normal distribution: μ=0, σ=1
 *
 * 9-point rule provides high accuracy for smooth integrands.
 * Nodes are roots of Hermite polynomial H_9(x).
 */
// Standard 9-point Gauss-Hermite quadrature rule
// Nodes: roots of Hermite polynomial H_9(x)
// Weights: for integrating f(x) * exp(-x²) from -∞ to +∞
export const GAUSS_HERMITE_NODES_9 = [
  -2.9162098854457225, -2.0238094747311503, -1.1577050769208050,
  -0.3814918612433376,  0.0,                 0.3814918612433376,
  1.1577050769208050,   2.0238094747311503, 2.9162098854457225,
];

export const GAUSS_HERMITE_WEIGHTS_9 = [
  0.0007640432855232, 0.0194617882297265, 0.1388008975505662,
  0.3486278307944308, 0.4612345682256756, 0.3486278307944308,
  0.1388008975505662, 0.0194617882297265, 0.0007640432855232,
];

// Verify sum of weights ≈ √π (normalization for exp(-x²) integrals)
// When converting to N(0,1) density (multiply by 1/√(2π)), weights for N(0,1) would be different
const GAUSS_HERMITE_NORM = Math.sqrt(Math.PI);
const weightsSum = GAUSS_HERMITE_WEIGHTS_9.reduce((a, b) => a + b, 0);
if (Math.abs(weightsSum - GAUSS_HERMITE_NORM) > 0.01) {
  console.warn(
    `[MIRT] Gauss-Hermite weights sum to ${weightsSum.toFixed(4)}, expected ${GAUSS_HERMITE_NORM.toFixed(4)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUADRATURE GRID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a single quadrature node in 4D space with its weight.
 */
interface QuadratureNode {
  /** 4D ability coordinates */
  theta: [number, number, number, number];
  /** Prior density (standard normal product) */
  weight: number;
}

/**
 * Generate all 9^4 = 6,561 quadrature nodes for 4D integration.
 * Each dimension uses 9-point Gauss-Hermite rule independently.
 *
 * Weight = product of 1D weights (independence assumption):
 *   w(θ₁, θ₂, θ₃, θ₄) = w₁(θ₁) × w₂(θ₂) × w₃(θ₃) × w₄(θ₄) / π²
 */
function generateQuadratureGrid(): QuadratureNode[] {
  const nodes: QuadratureNode[] = [];

  for (let i1 = 0; i1 < 9; i1++) {
    for (let i2 = 0; i2 < 9; i2++) {
      for (let i3 = 0; i3 < 9; i3++) {
        for (let i4 = 0; i4 < 9; i4++) {
          const theta: [number, number, number, number] = [
            GAUSS_HERMITE_NODES_9[i1],
            GAUSS_HERMITE_NODES_9[i2],
            GAUSS_HERMITE_NODES_9[i3],
            GAUSS_HERMITE_NODES_9[i4],
          ];

          const weight =
            (GAUSS_HERMITE_WEIGHTS_9[i1] *
              GAUSS_HERMITE_WEIGHTS_9[i2] *
              GAUSS_HERMITE_WEIGHTS_9[i3] *
              GAUSS_HERMITE_WEIGHTS_9[i4]) /
            (Math.PI * Math.PI);

          nodes.push({ theta, weight });
        }
      }
    }
  }

  return nodes;
}

// Precomputed grid (generated once, reused across all estimations)
let QUADRATURE_GRID: QuadratureNode[] | null = null;

function getQuadratureGrid(): QuadratureNode[] {
  if (!QUADRATURE_GRID) {
    QUADRATURE_GRID = generateQuadratureGrid();
  }
  return QUADRATURE_GRID;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIKELIHOOD COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute likelihood of observing a response pattern given ability and item params.
 *
 * L(y | θ) = ∏ᵢ P(yᵢ | θ, aᵢ, dᵢ, cᵢ)
 *
 * where P(yᵢ=1|θ) = mirtResponseProbability()
 *
 * Returns log-likelihood for numerical stability.
 */
function computeLogLikelihood(
  responses: ItemResponse[],
  theta: [number, number, number, number]
): number {
  let logLik = 0;

  for (const resp of responses) {
    const p = mirtResponseProbability(theta, resp.params.a, resp.params.d, resp.params.c);

    // Clamp to avoid log(0)
    const p_clamped = Math.max(1e-10, Math.min(1 - 1e-10, p));

    if (resp.score === 1) {
      logLik += Math.log(p_clamped);
    } else {
      logLik += Math.log(1 - p_clamped);
    }
  }

  return logLik;
}

/**
 * Compute posterior density at a quadrature node.
 *
 * Posterior ∝ Likelihood × Prior
 *
 * We work with log-scale for numerical stability:
 *   log(posterior) = log(likelihood) + log(prior)
 *
 * Prior is standard 4D normal (N(0,I)), so:
 *   log(prior) = −0.5 × (θ₁² + θ₂² + θ₃² + θ₄²) + const
 */
function posteriorDensity(
  logLik: number,
  theta: [number, number, number, number]
): number {
  const logPrior = -0.5 * (theta[0] ** 2 + theta[1] ** 2 + theta[2] ** 2 + theta[3] ** 2);
  return logLik + logPrior;
}

// ─────────────────────────────────────────────────────────────────────────────
// EAP ESTIMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate 4D ability using Expected A Posteriori (EAP).
 *
 * Steps:
 * 1. Evaluate likelihood at each quadrature node
 * 2. Compute posterior density (likelihood × prior)
 * 3. Calculate posterior weights (exp(log-posterior))
 * 4. Compute EAP: Σ(θ_k × weight_k) / Σ(weight_k)
 * 5. Compute posterior variance and SEM
 * 6. Calculate credible intervals (90%)
 *
 * @param responses Array of dichotomous responses (0 or 1) with item parameters
 * @returns Mirt4DEstimate with theta, SEM, credible intervals, and diagnostics
 */
export async function estimate4DTheta(responses: ItemResponse[]): Promise<Mirt4DEstimate> {
  const startTime = Date.now();

  if (responses.length === 0) {
    throw new Error("Cannot estimate theta from zero responses");
  }

  const grid = getQuadratureGrid();
  const nodesEvaluated = grid.length; // 6561

  // ── Step 1-3: Evaluate posterior at each node ──────────────────────────────
  const posteriorWeights: number[] = [];
  let maxLogPosterior = -Infinity;

  for (const node of grid) {
    const logLik = computeLogLikelihood(responses, node.theta);
    const logPost = posteriorDensity(logLik, node.theta);
    posteriorWeights.push(logPost);
    maxLogPosterior = Math.max(maxLogPosterior, logPost);
  }

  // ── Convert to normalized weights via softmax (numerical stability) ────────
  const normalizedWeights: number[] = [];
  let sumWeights = 0;

  for (const logPost of posteriorWeights) {
    // Subtract max for numerical stability
    const w = Math.exp(logPost - maxLogPosterior);
    normalizedWeights.push(w);
    sumWeights += w;
  }

  // ── Step 4: Compute EAP (posterior mean) ────────────────────────────────────
  const eap: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < grid.length; i++) {
    const w = normalizedWeights[i] / sumWeights;
    for (let d = 0; d < 4; d++) {
      eap[d] += grid[i].theta[d] * w;
    }
  }

  // ── Step 5: Compute posterior variance and SEM ───────────────────────────
  const variance: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < grid.length; i++) {
    const w = normalizedWeights[i] / sumWeights;
    for (let d = 0; d < 4; d++) {
      const diff = grid[i].theta[d] - eap[d];
      variance[d] += w * diff * diff;
    }
  }

  const sem: [number, number, number, number] = [
    Math.sqrt(variance[0]),
    Math.sqrt(variance[1]),
    Math.sqrt(variance[2]),
    Math.sqrt(variance[3]),
  ];

  // ── Step 6: Compute 90% credible intervals via quantiles ─────────────────
  // For normal posterior (approximate), CI = EAP ± 1.645×SEM
  const z90 = 1.645;
  const credibleIntervals: [[number, number], [number, number], [number, number], [number, number]] =
    [
      [eap[0] - z90 * sem[0], eap[0] + z90 * sem[0]],
      [eap[1] - z90 * sem[1], eap[1] + z90 * sem[1]],
      [eap[2] - z90 * sem[2], eap[2] + z90 * sem[2]],
      [eap[3] - z90 * sem[3], eap[3] + z90 * sem[3]],
    ];

  // ── Posterior covariance trace (total variance) ───────────────────────────
  const traceCovariance = variance[0] + variance[1] + variance[2] + variance[3];

  // ── Log-likelihood at posterior mean ──────────────────────────────────────
  const logLikAtEap = computeLogLikelihood(responses, eap);

  return {
    theta: eap,
    sem,
    credibleIntervals,
    traceCovariance,
    logLikelihood: logLikAtEap,
    itemCount: responses.length,
    nodesEvaluated,
    processingTime: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTERIOR COVARIANCE MATRIX (Advanced)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute full 4×4 posterior covariance matrix.
 * More detailed than just individual SEM values.
 *
 * Cov[θᵢ, θⱼ] = E[(θᵢ − EAP_i)(θⱼ − EAP_j)]
 *
 * Useful for:
 * - Detecting dimension correlations
 * - Multivariate confidence regions
 * - Information matrix for item calibration
 */
export function posteriorCovarianceMatrix(
  responses: ItemResponse[],
  eap: [number, number, number, number]
): [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] {
  const grid = getQuadratureGrid();

  // Compute posterior weights (same as in estimate4DTheta)
  const posteriorWeights: number[] = [];
  let maxLogPosterior = -Infinity;

  for (const node of grid) {
    const logLik = computeLogLikelihood(responses, node.theta);
    const logPost = posteriorDensity(logLik, node.theta);
    posteriorWeights.push(logPost);
    maxLogPosterior = Math.max(maxLogPosterior, logPost);
  }

  const normalizedWeights: number[] = [];
  let sumWeights = 0;
  for (const logPost of posteriorWeights) {
    const w = Math.exp(logPost - maxLogPosterior);
    normalizedWeights.push(w);
    sumWeights += w;
  }

  // Compute covariance matrix
  const cov: [number, number, number, number][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let i = 0; i < grid.length; i++) {
    const w = normalizedWeights[i] / sumWeights;
    for (let d1 = 0; d1 < 4; d1++) {
      for (let d2 = 0; d2 < 4; d2++) {
        const diff1 = grid[i].theta[d1] - eap[d1];
        const diff2 = grid[i].theta[d2] - eap[d2];
        cov[d1][d2] += w * diff1 * diff2;
      }
    }
  }

  return cov as [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]];
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check dimension correlations for independence.
 * Dimensions should be approximately uncorrelated (|r| < 0.30).
 */
export function checkDimensionIndependence(
  covarianceMatrix: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]]
): {
  correlations: [number, number, number, number, number, number]; // 6 unique pairs
  independent: boolean; // All |r| < 0.30?
  maxAbsCorrelation: number;
} {
  // Extract variances (diagonal)
  const vars = [
    covarianceMatrix[0][0],
    covarianceMatrix[1][1],
    covarianceMatrix[2][2],
    covarianceMatrix[3][3],
  ];

  // Compute correlations for all pairs
  const correlations: number[] = [];
  let maxAbsCorr = 0;

  for (let d1 = 0; d1 < 4; d1++) {
    for (let d2 = d1 + 1; d2 < 4; d2++) {
      const cov = covarianceMatrix[d1][d2];
      const r = cov / Math.sqrt(vars[d1] * vars[d2]);
      correlations.push(r);
      maxAbsCorr = Math.max(maxAbsCorr, Math.abs(r));
    }
  }

  return {
    correlations: correlations as [number, number, number, number, number, number],
    independent: maxAbsCorr < 0.30,
    maxAbsCorrelation: maxAbsCorr,
  };
}

/**
 * Summary of 4D ability estimate for reporting.
 */
export function summarizeEstimate(estimate: Mirt4DEstimate): string {
  const θ = estimate.theta;
  const sem = estimate.sem;
  return (
    `4D Ability Estimate\n` +
    `  θ₁ (Receptive):   ${θ[0].toFixed(2)} ± ${sem[0].toFixed(2)}\n` +
    `  θ₂ (Productive):  ${θ[1].toFixed(2)} ± ${sem[1].toFixed(2)}\n` +
    `  θ₃ (Grammatical): ${θ[2].toFixed(2)} ± ${sem[2].toFixed(2)}\n` +
    `  θ₄ (Strategic):   ${θ[3].toFixed(2)} ± ${sem[3].toFixed(2)}\n` +
    `  Trace Cov:        ${estimate.traceCovariance.toFixed(3)}\n` +
    `  Log-Lik:          ${estimate.logLikelihood.toFixed(1)}\n` +
    `  Items:            ${estimate.itemCount}\n` +
    `  Time:             ${estimate.processingTime}ms`
  );
}
