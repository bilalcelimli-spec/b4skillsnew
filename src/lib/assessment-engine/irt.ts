import { IrtParameters } from "./types";

/**
 * Item Response Theory (IRT) Functions
 * Implements the 3-Parameter Logistic (3PL) Model
 */

/**
 * Probability of a correct response (P) given ability (theta) and item parameters (a, b, c)
 * P(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
 */
export function probability(theta: number, params: IrtParameters): number {
  const { a, b, c } = params;
  const exponent = -a * (theta - b);
  const logistic = 1 / (1 + Math.exp(exponent));
  return c + (1 - c) * logistic;
}

/**
 * Fisher Information (I) for a single item at a given ability (theta)
 * I(theta) = [a^2 * (1 - P(theta)) * (P(theta) - c)^2] / [P(theta) * (1 - c)^2]
 * 
 * This measures how much "information" an item provides about a candidate's ability
 * at a specific theta level. Higher information means more precision in estimation.
 */
export function information(theta: number, params: IrtParameters): number {
  const p = probability(theta, params);
  const { a, c } = params;
  
  // Handle edge cases to avoid division by zero or NaN
  // If p is 0 or 1, or c is 1, the item provides no information at this theta
  if (p <= 0 || p >= 1 || c >= 1) return 0;
  
  const q = 1 - p;
  const pMinusC = p - c;
  const oneMinusC = 1 - c;
  
  // Fisher Information formula for 3PL model
  const numerator = a * a * q * pMinusC * pMinusC;
  const denominator = p * oneMinusC * oneMinusC;
  
  return numerator / denominator;
}

/**
 * Likelihood of a response pattern given ability (theta)
 * L(theta) = Product of [P(theta)^u * (1 - P(theta))^(1-u)]
 * where u is the response (0 or 1)
 */
export function likelihood(
  theta: number, 
  responses: { score: number; params: IrtParameters }[]
): number {
  let l = 1.0;
  for (const resp of responses) {
    const p = probability(theta, resp.params);
    const u = resp.score;
    l *= Math.pow(p, u) * Math.pow(1 - p, 1 - u);
  }
  return l;
}

/**
 * Log-Likelihood (more stable for computation)
 * LL(theta) = Sum of [u * log(P(theta)) + (1-u) * log(1-P(theta))]
 */
export function logLikelihood(
  theta: number, 
  responses: { score: number; params: IrtParameters }[]
): number {
  let ll = 0;
  for (const resp of responses) {
    const p = probability(theta, resp.params);
    const u = resp.score;
    
    // Guard against log(0)
    const safeP = Math.max(0.0001, Math.min(0.9999, p));
    ll += u * Math.log(safeP) + (1 - u) * Math.log(1 - safeP);
  }
  return ll;
}
