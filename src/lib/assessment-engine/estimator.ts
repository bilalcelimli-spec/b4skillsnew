import { probability, likelihood } from "./irt";
import { IrtParameters, Response, Item } from "./types";

/**
 * Ability Estimator (EAP - Expected A Posteriori)
 * EAP is a Bayesian estimation method that uses a prior distribution
 * to provide a stable estimate of ability (theta).
 *
 * Supports hierarchical (org-level) priors: pass priorMean/priorSd to shift the
 * prior from the population default N(0,1) to an organisation-specific distribution.
 * This reduces the number of items needed to reach precision targets for pools
 * whose ability distribution is known (e.g. corporate cohorts typically centred at B1).
 */

const PRIOR_THETA_RANGE = [-4, 4];
const PRIOR_THETA_STEP = 0.1;
const PRIOR_THETA_POINTS: number[] = [];
for (let t = PRIOR_THETA_RANGE[0]; t <= PRIOR_THETA_RANGE[1]; t += PRIOR_THETA_STEP) {
  PRIOR_THETA_POINTS.push(Number(t.toFixed(1)));
}

function normalDensity(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd;
  return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

/** Population-default weights (N(0,1)) — cached for performance */
const DEFAULT_PRIOR_WEIGHTS = PRIOR_THETA_POINTS.map(t => normalDensity(t, 0, 1));

/**
 * Estimate Ability (theta) using EAP with optional hierarchical prior.
 *
 * @param responses   All responses in the session
 * @param items       Item parameter dictionary
 * @param priorMean   Org-level prior mean (default: 0)
 * @param priorSd     Org-level prior SD   (default: 1)
 */
export function estimateTheta(
  responses: Response[],
  items: Record<string, Item>,
  priorMean = 0,
  priorSd = 1
): { theta: number; sem: number } {
  if (responses.length === 0) {
    return { theta: priorMean, sem: priorSd };
  }

  // Exclude pretest items from ability estimation
  const responseData = responses
    .filter(r => !r.isPretest)
    .map(r => ({
      score: r.score,
      params: items[r.itemId].params
    }));

  if (responseData.length === 0) {
    return { theta: priorMean, sem: priorSd };
  }

  // Use cached default weights unless org prior differs from population default
  const priorWeights = (priorMean === 0 && priorSd === 1)
    ? DEFAULT_PRIOR_WEIGHTS
    : PRIOR_THETA_POINTS.map(t => normalDensity(t, priorMean, priorSd));

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < PRIOR_THETA_POINTS.length; i++) {
    const theta = PRIOR_THETA_POINTS[i];
    const weight = priorWeights[i];
    const l = likelihood(theta, responseData);
    const term = l * weight;
    numerator += theta * term;
    denominator += term;
  }

  const thetaEap = numerator / denominator;

  let varianceNumerator = 0;
  for (let i = 0; i < PRIOR_THETA_POINTS.length; i++) {
    const theta = PRIOR_THETA_POINTS[i];
    const weight = priorWeights[i];
    const l = likelihood(theta, responseData);
    const term = l * weight;
    varianceNumerator += Math.pow(theta - thetaEap, 2) * term;
  }

  const variance = varianceNumerator / denominator;
  const sem = Math.sqrt(variance);

  return {
    theta: Number(thetaEap.toFixed(3)),
    sem: Number(sem.toFixed(3))
  };
}
