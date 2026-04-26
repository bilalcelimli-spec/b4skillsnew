import { probability, likelihood } from "./irt";
import { Response, Item, SkillType } from "./types";
import {
  categoryProbability,
  rubricToGrmParams,
  type GrmParameters,
} from "../psychometrics/graded-response-model.js";

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

function grmParamsForItem(item: Item): GrmParameters {
  const m = item.metadata as Record<string, unknown> | undefined;
  const g = m?.grm as GrmParameters | undefined;
  if (
    g &&
    typeof g === "object" &&
    Array.isArray((g as GrmParameters).b) &&
    typeof (g as GrmParameters).a === "number" &&
    typeof (g as GrmParameters).categories === "number"
  ) {
    return g;
  }
  return rubricToGrmParams(item.params.a, item.params.b, 11);
}

function isGrmProductiveItem(item: Item): boolean {
  return item.skill === SkillType.WRITING || item.skill === SkillType.SPEAKING;
}

/** Faz5: joint log-likelihood (3PL + GRM) on a common θ. */
function jointLogLikelihoodAt(
  theta: number,
  responses: Response[],
  items: Record<string, Item>
): number {
  let ll = 0;
  for (const r of responses) {
    if (r.isPretest) continue;
    const it = items[r.itemId];
    if (!it) continue;
    if (isGrmProductiveItem(it)) {
      const g = grmParamsForItem(it);
      const k = Math.max(
        0,
        Math.min(g.categories - 1, Math.round(r.score * (g.categories - 1)))
      );
      const p = categoryProbability(theta, g, k);
      ll += Math.log(Math.max(p, 1e-10));
    } else {
      const p0 = probability(theta, it.params);
      const u = r.score;
      const safeP = Math.max(1e-4, Math.min(1 - 1e-4, p0));
      ll += u * Math.log(safeP) + (1 - u) * Math.log(1 - safeP);
    }
  }
  return ll;
}

export type EstimateThetaOptions = {
  /** Faz5: Samejima GRM for writing/speaking with 3PL for other skills. */
  useGrmProductive?: boolean;
};

/**
 * Estimate Ability (theta) using EAP with optional hierarchical prior.
 *
 * @param responses   All responses in the session
 * @param items       Item parameter dictionary
 * @param priorMean   Org-level prior mean (default: 0)
 * @param priorSd     Org-level prior SD   (default: 1)
 * @param options     Faz5: `useGrmProductive` for joint GRM+3PL
 */
export function estimateTheta(
  responses: Response[],
  items: Record<string, Item>,
  priorMean = 0,
  priorSd = 1,
  options?: EstimateThetaOptions
): { theta: number; sem: number } {
  if (responses.length === 0) {
    return { theta: priorMean, sem: priorSd };
  }

  const op = responses.filter((r) => !r.isPretest);
  if (op.length === 0) {
    return { theta: priorMean, sem: priorSd };
  }

  const useGrm = options?.useGrmProductive === true;
  const responseData = op.map((r) => ({
    score: r.score,
    params: items[r.itemId]!.params,
  }));

  // Use cached default weights unless org prior differs from population default
  const priorWeights = (priorMean === 0 && priorSd === 1)
    ? DEFAULT_PRIOR_WEIGHTS
    : PRIOR_THETA_POINTS.map(t => normalDensity(t, priorMean, priorSd));

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < PRIOR_THETA_POINTS.length; i++) {
    const theta = PRIOR_THETA_POINTS[i]!;
    const weight = priorWeights[i]!;
    const l = useGrm
      ? Math.exp(jointLogLikelihoodAt(theta, op, items))
      : likelihood(theta, responseData);
    const term = l * weight;
    numerator += theta * term;
    denominator += term;
  }

  const thetaEap = numerator / denominator;

  let varianceNumerator = 0;
  for (let i = 0; i < PRIOR_THETA_POINTS.length; i++) {
    const theta = PRIOR_THETA_POINTS[i]!;
    const weight = priorWeights[i]!;
    const l = useGrm
      ? Math.exp(jointLogLikelihoodAt(theta, op, items))
      : likelihood(theta, responseData);
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
