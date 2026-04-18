/**
 * Graded Response Model (GRM) - Samejima (1969)
 * 
 * Polytomous IRT model for ordered categorical responses.
 * Used for Writing and Speaking items scored on a rubric (0-10 scale).
 * 
 * In GRM, each item has:
 *   - a (discrimination): how well the item differentiates between ability levels
 *   - b_k (category boundaries): k-1 thresholds for k response categories
 * 
 * P*(theta, b_k) = 1 / (1 + exp(-a * (theta - b_k)))
 * P(X=k | theta) = P*(theta, b_k) - P*(theta, b_{k+1})
 */

export interface GrmParameters {
  a: number;          // Discrimination parameter
  b: number[];        // Category boundary parameters (K-1 thresholds for K categories)
  categories: number; // Number of categories (e.g., 11 for 0-10 scale)
}

/**
 * Cumulative probability: P*(theta, b_k) = 1 / (1 + exp(-a * (theta - b_k)))
 * This is the probability of scoring AT OR ABOVE category k.
 */
export function cumulativeProbability(theta: number, a: number, bk: number): number {
  const exp = Math.exp(-a * (theta - bk));
  return 1 / (1 + exp);
}

/**
 * Category response probability: P(X=k | theta)
 * = P*(theta, b_k) - P*(theta, b_{k+1})
 * 
 * By convention: P*(theta, b_0) = 1 and P*(theta, b_K) = 0
 */
export function categoryProbability(theta: number, params: GrmParameters, category: number): number {
  const { a, b, categories } = params;
  
  if (category < 0 || category >= categories) return 0;

  // P*(theta, b_k) for current category boundary
  const pStarLower = category === 0 ? 1.0 : cumulativeProbability(theta, a, b[category - 1]);
  
  // P*(theta, b_{k+1}) for next category boundary
  const pStarUpper = category === categories - 1 ? 0.0 : cumulativeProbability(theta, a, b[category]);
  
  return Math.max(0, pStarLower - pStarUpper);
}

/**
 * All category probabilities for a given theta
 */
export function allCategoryProbabilities(theta: number, params: GrmParameters): number[] {
  const probs: number[] = [];
  for (let k = 0; k < params.categories; k++) {
    probs.push(categoryProbability(theta, params, k));
  }
  // Normalize to handle floating point issues
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum > 0) return probs.map(p => p / sum);
  return probs;
}

/**
 * Expected score: E(X | theta) = Sum(k * P(X=k | theta))
 */
export function expectedScore(theta: number, params: GrmParameters): number {
  const probs = allCategoryProbabilities(theta, params);
  return probs.reduce((sum, p, k) => sum + k * p, 0);
}

/**
 * Fisher Information for GRM item at a given theta.
 * I(theta) = a^2 * Sum_k[ (P*'_k - P*'_{k+1})^2 / P_k ]
 * where P*'_k is the derivative of P*(theta, b_k)
 */
export function grmInformation(theta: number, params: GrmParameters): number {
  const { a, b, categories } = params;
  let info = 0;

  for (let k = 0; k < categories; k++) {
    const pk = categoryProbability(theta, params, k);
    if (pk <= 0.0001) continue;

    // Derivative of P*(theta, b_k): P*'_k = a * P*_k * (1 - P*_k)
    const pStarLower = k === 0 ? 1.0 : cumulativeProbability(theta, a, b[k - 1]);
    const pStarUpper = k === categories - 1 ? 0.0 : cumulativeProbability(theta, a, b[k]);

    const derivLower = k === 0 ? 0 : a * pStarLower * (1 - pStarLower);
    const derivUpper = k === categories - 1 ? 0 : a * pStarUpper * (1 - pStarUpper);

    info += Math.pow(derivLower - derivUpper, 2) / pk;
  }

  return info;
}

/**
 * Log-likelihood for a GRM response
 */
export function grmLogLikelihood(
  theta: number,
  responses: { score: number; params: GrmParameters }[]
): number {
  let ll = 0;
  for (const resp of responses) {
    const k = Math.round(resp.score * (resp.params.categories - 1)); // Normalize 0-1 to 0-(K-1)
    const p = categoryProbability(theta, resp.params, k);
    ll += Math.log(Math.max(p, 1e-10));
  }
  return ll;
}

/**
 * EAP estimation for GRM responses
 */
export function estimateGrmTheta(
  responses: { score: number; params: GrmParameters }[]
): { theta: number; sem: number } {
  if (responses.length === 0) return { theta: 0, sem: 1 };

  const THETA_POINTS: number[] = [];
  for (let t = -4; t <= 4; t += 0.1) {
    THETA_POINTS.push(Number(t.toFixed(1)));
  }

  const normalDensity = (x: number) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);

  let numerator = 0;
  let denominator = 0;

  for (const theta of THETA_POINTS) {
    const prior = normalDensity(theta);
    let logL = 0;
    for (const resp of responses) {
      const k = Math.round(resp.score * (resp.params.categories - 1));
      const p = categoryProbability(theta, resp.params, k);
      logL += Math.log(Math.max(p, 1e-10));
    }
    const posterior = Math.exp(logL) * prior;
    numerator += theta * posterior;
    denominator += posterior;
  }

  const thetaEap = denominator > 0 ? numerator / denominator : 0;

  // SEM
  let varNumer = 0;
  for (const theta of THETA_POINTS) {
    const prior = normalDensity(theta);
    let logL = 0;
    for (const resp of responses) {
      const k = Math.round(resp.score * (resp.params.categories - 1));
      const p = categoryProbability(theta, resp.params, k);
      logL += Math.log(Math.max(p, 1e-10));
    }
    const posterior = Math.exp(logL) * prior;
    varNumer += Math.pow(theta - thetaEap, 2) * posterior;
  }

  const variance = denominator > 0 ? varNumer / denominator : 1;
  const sem = Math.sqrt(variance);

  return {
    theta: Number(thetaEap.toFixed(3)),
    sem: Number(sem.toFixed(3)),
  };
}

/**
 * Convert a rubric-scored item (0-10 scale) to GRM parameters.
 * Uses item discrimination and CEFR-calibrated boundaries.
 */
export function rubricToGrmParams(
  discrimination: number,
  difficulty: number,
  scale: number = 11 // 0-10 = 11 categories
): GrmParameters {
  // Generate evenly-spaced boundaries centered around item difficulty
  const boundaries: number[] = [];
  const spread = 4.0; // Total spread of boundaries across theta scale
  const step = spread / (scale - 1);
  const start = difficulty - spread / 2;

  for (let i = 0; i < scale - 1; i++) {
    boundaries.push(Number((start + i * step).toFixed(2)));
  }

  return {
    a: discrimination,
    b: boundaries,
    categories: scale,
  };
}

/**
 * Default GRM parameters for CEFR levels (Writing/Speaking)
 */
export const CEFR_GRM_DEFAULTS: Record<string, GrmParameters> = {
  A1: rubricToGrmParams(0.8, -2.0, 11),
  A2: rubricToGrmParams(1.0, -1.0, 11),
  B1: rubricToGrmParams(1.2, 0.0, 11),
  B2: rubricToGrmParams(1.4, 1.0, 11),
  C1: rubricToGrmParams(1.6, 2.0, 11),
  C2: rubricToGrmParams(1.8, 3.0, 11),
};
