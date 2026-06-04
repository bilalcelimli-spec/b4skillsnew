import { IrtParameters } from "./types";

/**
 * Item Response Theory (IRT) Functions
 * Implements the 3-Parameter Logistic (3PL) Model
 */

/**
 * Defensible floor for the discrimination (a) parameter.
 *
 * Why this exists: a sizeable slice of the seeded item bank was created with
 * synthetic/hand-assigned parameters where `a` was left at 0 (see
 * scripts/seed-grammar-300-sota.ts). With a=0 the logistic collapses to a flat
 * line and Fisher information I(θ)=a²·… is identically 0, which makes the
 * Maximum-Fisher-Information CAT selector blind to those items (selection
 * silently degrades to exposure/blueprint/random ordering).
 *
 * This floor is a *safety net* so no item is ever invisible to the engine.
 * The real fix is scripts/backfill-irt-priors.ts, which assigns proper
 * norm-based a/c priors; this guard only catches anything that slips through.
 *
 * 0.7 ≈ the low end of the empirical a-range across CEFR norms
 * (IRT_PARAMETER_NORMS in item-writing-framework.ts: a.target 0.9–1.3).
 */
export const DEFAULT_A = 0.7;

/** Clamp discrimination to a positive floor so an item always carries information. */
function effectiveA(a: number): number {
  return a > 0 ? a : DEFAULT_A;
}

/**
 * Probability of a correct response (P) given ability (theta) and item parameters (a, b, c)
 * P(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
 */
export function probability(theta: number, params: IrtParameters): number {
  const { b, c } = params;
  const a = effectiveA(params.a);
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
  const { c } = params;
  // Apply the same positive floor as probability() so a synthetic a=0 item
  // still contributes Fisher information instead of being invisible to the
  // MFI selector. See DEFAULT_A note above.
  const a = effectiveA(params.a);

  // Use epsilon margins instead of hard 0/1 to avoid masking numerical instability
  // and to correctly return 0 only when the item genuinely provides no discrimination
  const EPS = 1e-4;
  if (p <= EPS || p >= 1 - EPS || c >= 1 - EPS) return 0;

  const q = 1 - p;
  const pMinusC = p - c;
  const oneMinusC = 1 - c;

  // Fisher Information formula for 3PL model:
  // I(θ) = a² · (P−c)² · (1−P) / [P · (1−c)²]
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
    
    // Guard against log(0) with consistent epsilon
    const safeP = Math.max(1e-4, Math.min(1 - 1e-4, p));
    ll += u * Math.log(safeP) + (1 - u) * Math.log(1 - safeP);
  }
  return ll;
}
