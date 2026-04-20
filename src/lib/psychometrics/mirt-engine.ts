/**
 * Multidimensional Item Response Theory (MIRT) Engine
 * 
 * Implements a compensatory MIRT model where each item can load
 * on multiple skill dimensions (e.g., a reading item may also tap grammar).
 * 
 * Model: P(X=1 | θ) = c + (1-c) / (1 + exp(-(a₁θ₁ + a₂θ₂ + ... + aₖθₖ + d)))
 * 
 * Where:
 *   θ = [θ₁, θ₂, ..., θₖ] is the multidimensional ability vector
 *   a = [a₁, a₂, ..., aₖ] is the item discrimination vector (factor loadings)
 *   d = item intercept (related to difficulty)
 *   c = guessing parameter
 * 
 * Key advantages over unidimensional IRT:
 * - Models skill correlations (reading↔grammar correlation ~0.7)
 * - More accurate ability estimation with fewer items
 * - Proper skill-specific scoring
 */

import { SkillType } from "../assessment-engine/types";

export interface MirtItemParameters {
  /** Discrimination vector: one value per skill dimension */
  a: Partial<Record<SkillType, number>>;
  /** Item intercept (negative difficulty in 2PL terms) */
  d: number;
  /** Guessing lower asymptote */
  c: number;
}

export interface MirtAbilityVector {
  /** Ability estimate per skill */
  theta: Partial<Record<SkillType, number>>;
  /** Covariance matrix (flattened upper triangle) */
  covariance: number[][];
  /** Standard errors per skill */
  sem: Partial<Record<SkillType, number>>;
}

/** Default inter-skill correlation matrix (6x6) */
export const SKILL_ORDER: SkillType[] = [
  SkillType.READING, SkillType.LISTENING, SkillType.WRITING,
  SkillType.SPEAKING, SkillType.GRAMMAR, SkillType.VOCABULARY,
];

/**
 * Prior correlation matrix based on language testing research
 * (e.g., Ockey 2014, Sawaki 2007, In'nami & Koizumi 2012)
 */
const PRIOR_CORRELATION: number[][] = [
  // READ  LIST   WRIT   SPEAK  GRAM   VOCAB
  [1.00,  0.65,  0.60,  0.45,  0.72,  0.75],  // READING
  [0.65,  1.00,  0.50,  0.55,  0.58,  0.60],  // LISTENING
  [0.60,  0.50,  1.00,  0.65,  0.68,  0.55],  // WRITING
  [0.45,  0.55,  0.65,  1.00,  0.50,  0.48],  // SPEAKING
  [0.72,  0.58,  0.68,  0.50,  1.00,  0.78],  // GRAMMAR
  [0.75,  0.60,  0.55,  0.48,  0.78,  1.00],  // VOCABULARY
];

/**
 * MIRT probability function (compensatory model)
 * P(X=1 | θ) = c + (1-c) / (1 + exp(-(Σ aₖθₖ + d)))
 */
export function mirtProbability(
  theta: Partial<Record<SkillType, number>>,
  params: MirtItemParameters
): number {
  let linearPredictor = params.d;
  for (const skill of SKILL_ORDER) {
    const aK = params.a[skill] || 0;
    const thetaK = theta[skill] || 0;
    linearPredictor += aK * thetaK;
  }
  const logistic = 1 / (1 + Math.exp(-linearPredictor));
  return params.c + (1 - params.c) * logistic;
}

/**
 * MIRT Fisher Information Matrix for a single item at a given θ vector.
 * Returns a K×K matrix where K is the number of skill dimensions.
 * 
 * I_jk(θ) = a_j * a_k * P'(θ)² / (P(θ) * Q(θ))
 * where P'(θ) is the derivative of the logistic kernel
 */
export function mirtInformationMatrix(
  theta: Partial<Record<SkillType, number>>,
  params: MirtItemParameters
): number[][] {
  const K = SKILL_ORDER.length;
  const p = mirtProbability(theta, params);
  const q = 1 - p;

  if (p <= 0 || p >= 1 || q <= 0) {
    return Array.from({ length: K }, () => new Array(K).fill(0));
  }

  // Derivative of logistic kernel
  let linearPredictor = params.d;
  for (const skill of SKILL_ORDER) {
    linearPredictor += (params.a[skill] || 0) * (theta[skill] || 0);
  }
  const logistic = 1 / (1 + Math.exp(-linearPredictor));
  const pStar = logistic; // P without guessing
  const pPrime = (1 - params.c) * pStar * (1 - pStar);

  const matrix: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));

  for (let j = 0; j < K; j++) {
    for (let k = j; k < K; k++) {
      const aJ = params.a[SKILL_ORDER[j]] || 0;
      const aK = params.a[SKILL_ORDER[k]] || 0;
      const info = (aJ * aK * pPrime * pPrime) / (p * q);
      matrix[j][k] = info;
      matrix[k][j] = info; // Symmetric
    }
  }

  return matrix;
}

/**
 * EAP estimation for MIRT (multidimensional ability vector)
 * 
 * Uses Gauss-Hermite quadrature over the multidimensional space.
 * For computational efficiency, uses a simplified grid approach
 * with marginal integration per dimension.
 */
export function estimateMirtTheta(
  responses: { score: number; params: MirtItemParameters }[],
  priorCorrelation: number[][] = PRIOR_CORRELATION
): MirtAbilityVector {
  const K = SKILL_ORDER.length;
  
  if (responses.length === 0) {
    const theta: Partial<Record<SkillType, number>> = {};
    const sem: Partial<Record<SkillType, number>> = {};
    for (const skill of SKILL_ORDER) {
      theta[skill] = 0;
      sem[skill] = 1;
    }
    return {
      theta,
      covariance: priorCorrelation.map(row => [...row]),
      sem,
    };
  }

  // Grid points per dimension (reduced for computational feasibility)
  const GRID_POINTS = [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3];
  
  const normalDensity = (x: number) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);

  // Marginal EAP per dimension (simplified: integrate each dimension marginally)
  // This is an approximation. Full MIRT EAP requires multidimensional integration.
  const thetaEstimates: Partial<Record<SkillType, number>> = {};
  const semEstimates: Partial<Record<SkillType, number>> = {};

  for (let dim = 0; dim < K; dim++) {
    const skill = SKILL_ORDER[dim];
    
    // Filter responses that have non-zero loading on this dimension
    const relevantResponses = responses.filter(r => (r.params.a[skill] || 0) > 0.01);
    
    if (relevantResponses.length === 0) {
      thetaEstimates[skill] = 0;
      semEstimates[skill] = 1;
      continue;
    }

    let numerator = 0;
    let denominator = 0;

    for (const t of GRID_POINTS) {
      const prior = normalDensity(t);
      
      // Approximate: set this dimension to t, others to their current estimates or 0
      const thetaPoint: Partial<Record<SkillType, number>> = {};
      for (const s of SKILL_ORDER) {
        thetaPoint[s] = s === skill ? t : (thetaEstimates[s] || 0);
      }

      let logL = 0;
      for (const resp of relevantResponses) {
        const p = mirtProbability(thetaPoint, resp.params);
        const safeP = Math.max(0.0001, Math.min(0.9999, p));
        logL += resp.score * Math.log(safeP) + (1 - resp.score) * Math.log(1 - safeP);
      }

      // Use correlation prior: adjust prior based on already-estimated dimensions
      let adjustedPrior = prior;
      for (let otherDim = 0; otherDim < dim; otherDim++) {
        const otherSkill = SKILL_ORDER[otherDim];
        const rho = priorCorrelation[dim][otherDim];
        const otherTheta = thetaEstimates[otherSkill] || 0;
        // Conditional prior: N(rho * otherTheta, sqrt(1 - rho²))
        const condMean = rho * otherTheta;
        const condSD = Math.sqrt(1 - rho * rho);
        adjustedPrior = (1 / (condSD * Math.sqrt(2 * Math.PI))) * 
          Math.exp(-0.5 * ((t - condMean) / condSD) ** 2);
      }

      const posterior = Math.exp(logL) * adjustedPrior;
      numerator += t * posterior;
      denominator += posterior;
    }

    thetaEstimates[skill] = denominator > 0 ? Number((numerator / denominator).toFixed(3)) : 0;

    // SEM
    let varNum = 0;
    for (const t of GRID_POINTS) {
      const prior = normalDensity(t);
      const thetaPoint: Partial<Record<SkillType, number>> = {};
      for (const s of SKILL_ORDER) {
        thetaPoint[s] = s === skill ? t : (thetaEstimates[s] || 0);
      }
      let logL = 0;
      for (const resp of relevantResponses) {
        const p = mirtProbability(thetaPoint, resp.params);
        const safeP = Math.max(0.0001, Math.min(0.9999, p));
        logL += resp.score * Math.log(safeP) + (1 - resp.score) * Math.log(1 - safeP);
      }
      const posterior = Math.exp(logL) * prior;
      varNum += (t - (thetaEstimates[skill] || 0)) ** 2 * posterior;
    }
    
    const variance = denominator > 0 ? varNum / denominator : 1;
    semEstimates[skill] = Number(Math.sqrt(variance).toFixed(3));
  }

  return {
    theta: thetaEstimates,
    covariance: priorCorrelation, // In practice, this would be updated via posterior
    sem: semEstimates,
  };
}

/**
 * MIRT-based item selection: maximize composite test information
 * 
 * Selects the item that provides the most information across all
 * dimensions, weighted by current SEM (prioritize less precise estimates).
 */
export function mirtSelectItem(
  pool: { id: string; params: MirtItemParameters }[],
  currentTheta: Partial<Record<SkillType, number>>,
  currentSem: Partial<Record<SkillType, number>>,
  usedItemIds: Set<string>
): { id: string; params: MirtItemParameters } | null {
  const available = pool.filter(item => !usedItemIds.has(item.id));
  if (available.length === 0) return null;

  let bestItem = available[0];
  let bestScore = -Infinity;

  for (const item of available) {
    const infoMatrix = mirtInformationMatrix(currentTheta, item.params);
    
    // Weighted composite: sum diagonal info weighted by current SEM²
    // (prioritize dimensions with less precision)
    let compositeInfo = 0;
    for (let d = 0; d < SKILL_ORDER.length; d++) {
      const skill = SKILL_ORDER[d];
      const sem = currentSem[skill] || 1;
      compositeInfo += infoMatrix[d][d] * sem * sem; // Weight by SEM²
    }

    if (compositeInfo > bestScore) {
      bestScore = compositeInfo;
      bestItem = item;
    }
  }

  return bestItem;
}

/**
 * Convert unidimensional IRT params to MIRT params
 * An item with skill=READING and a=1.5, b=0.5, c=0.2 becomes:
 *   a = { READING: 1.5 }, d = -1.5*0.5 = -0.75, c = 0.2
 */
export function uniToMirtParams(
  skill: SkillType,
  a: number,
  b: number,
  c: number,
  crossLoadings?: Partial<Record<SkillType, number>>
): MirtItemParameters {
  const mirtA: Partial<Record<SkillType, number>> = {
    [skill]: a,
    ...crossLoadings,
  };
  
  return {
    a: mirtA,
    d: -a * b, // Convert difficulty to intercept
    c,
  };
}

/**
 * Calculate overall composite theta from MIRT ability vector
 */
export function compositeTheta(
  theta: Partial<Record<SkillType, number>>,
  weights?: Partial<Record<SkillType, number>>
): number {
  const defaultWeights: Record<SkillType, number> = {
    [SkillType.READING]: 0.2,
    [SkillType.LISTENING]: 0.2,
    [SkillType.WRITING]: 0.2,
    [SkillType.SPEAKING]: 0.2,
    [SkillType.GRAMMAR]: 0.1,
    [SkillType.VOCABULARY]: 0.1,
  };

  const w = weights || defaultWeights;
  let sum = 0;
  let totalWeight = 0;

  for (const skill of SKILL_ORDER) {
    const t = theta[skill] ?? 0;
    const wt = w[skill] ?? 0;
    sum += t * wt;
    totalWeight += wt;
  }

  return totalWeight > 0 ? sum / totalWeight : 0;
}
