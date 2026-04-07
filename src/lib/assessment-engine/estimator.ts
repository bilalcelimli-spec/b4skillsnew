import { probability, likelihood } from "./irt";
import { IrtParameters, Response, Item } from "./types";

/**
 * Ability Estimator (EAP - Expected A Posteriori)
 * EAP is a Bayesian estimation method that uses a prior distribution
 * to provide a stable estimate of ability (theta).
 */

// Define a standard normal prior distribution (mean=0, sd=1)
const PRIOR_THETA_RANGE = [-4, 4];
const PRIOR_THETA_STEP = 0.1;
const PRIOR_THETA_POINTS: number[] = [];
for (let t = PRIOR_THETA_RANGE[0]; t <= PRIOR_THETA_RANGE[1]; t += PRIOR_THETA_STEP) {
  PRIOR_THETA_POINTS.push(Number(t.toFixed(1)));
}

// Normal density function (mean=0, sd=1)
function normalDensity(x: number): number {
  const exponent = -0.5 * Math.pow(x, 2);
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(exponent);
}

const PRIOR_WEIGHTS = PRIOR_THETA_POINTS.map(normalDensity);

/**
 * Estimate Ability (theta) using EAP
 * theta_eap = Sum(theta * L(theta) * W(theta)) / Sum(L(theta) * W(theta))
 */
export function estimateTheta(
  responses: Response[],
  items: Record<string, Item>
): { theta: number; sem: number } {
  if (responses.length === 0) {
    return { theta: 0.0, sem: 1.0 };
  }

  // Pre-calculate response data for IRT functions, excluding pretest items
  const responseData = responses
    .filter(r => !r.isPretest)
    .map(r => ({
      score: r.score,
      params: items[r.itemId].params
    }));

  if (responseData.length === 0) {
    return { theta: 0.0, sem: 1.0 };
  }

  let numerator = 0;
  let denominator = 0;
  
  // Numerical integration over the prior distribution
  for (let i = 0; i < PRIOR_THETA_POINTS.length; i++) {
    const theta = PRIOR_THETA_POINTS[i];
    const weight = PRIOR_WEIGHTS[i];
    const l = likelihood(theta, responseData);
    
    const term = l * weight;
    numerator += theta * term;
    denominator += term;
  }

  const thetaEap = numerator / denominator;

  // Estimate SEM (Standard Error of Measurement)
  // SEM = sqrt(Sum((theta - theta_eap)^2 * L(theta) * W(theta)) / Sum(L(theta) * W(theta)))
  let varianceNumerator = 0;
  for (let i = 0; i < PRIOR_THETA_POINTS.length; i++) {
    const theta = PRIOR_THETA_POINTS[i];
    const weight = PRIOR_WEIGHTS[i];
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
