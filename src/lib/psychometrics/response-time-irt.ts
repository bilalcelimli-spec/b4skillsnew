/**
 * Response Time IRT Model (van der Linden, 2006)
 * 
 * Implements the hierarchical framework for modeling response times
 * alongside response accuracy. Uses a log-normal model:
 * 
 *   log(T_ij) = β_j - τ_i + ε_ij
 * 
 * Where:
 *   T_ij = response time of person i on item j
 *   β_j  = item time intensity (how time-consuming the item is)
 *   τ_i  = person speed parameter (fast vs. slow test-taker)
 *   ε_ij ~ N(0, σ²_j) = residual
 * 
 * Key uses:
 * 1. Speed-accuracy tradeoff detection
 * 2. Aberrant response detection (too fast = rapid guessing)
 * 3. Item-level time calibration
 * 4. Joint scoring of ability + speed
 */

export interface ResponseTimeParams {
  /** Item time intensity (log-seconds): higher = more time consuming */
  beta: number;
  /** Item time discrimination: how consistently the item distinguishes speed */
  alpha: number;
  /** Residual variance */
  sigma2: number;
}

/** Defaults when item content has no time calibration (≈ 30s median in log space). */
export const DEFAULT_RESPONSE_TIME_PARAMS: ResponseTimeParams = {
  beta: Math.log(30),
  alpha: 1,
  sigma2: 0.5,
};

/**
 * Read optional RT parameters from `Item.metadata` / `Item.content` JSON.
 * Keys: `rtTimeBeta` | `timeIntensity`, `rtTimeAlpha` | `timeDiscrimination`, `rtTimeSigma2` | `timeResidualVar`
 */
export function responseTimeParamsFromItemContent(
  content: unknown
): ResponseTimeParams {
  const c = (content && typeof content === "object" ? content : {}) as Record<string, unknown>;
  const b = c.rtTimeBeta ?? c.timeIntensity;
  const a = c.rtTimeAlpha ?? c.timeDiscrimination;
  const s = c.rtTimeSigma2 ?? c.timeResidualVar;
  return {
    beta: typeof b === "number" && Number.isFinite(b) ? b : DEFAULT_RESPONSE_TIME_PARAMS.beta,
    alpha:
      typeof a === "number" && Number.isFinite(a) && a > 0
        ? a
        : DEFAULT_RESPONSE_TIME_PARAMS.alpha,
    sigma2:
      typeof s === "number" && Number.isFinite(s) && s > 0
        ? s
        : DEFAULT_RESPONSE_TIME_PARAMS.sigma2,
  };
}

export interface PersonSpeed {
  /** Speed parameter (tau): higher = faster test-taker */
  tau: number;
  /** Standard error of speed estimate */
  seTau: number;
}

export interface AberrantResponseFlag {
  itemId: string;
  responseTimeMs: number;
  expectedTimeMs: number;
  zScore: number;
  flag: "RAPID_GUESS" | "SOLUTION_BEHAVIOR" | "NORMAL";
  /** Probability this response time is legitimate */
  legitimacyProbability: number;
}

/**
 * Log-normal response time density
 * f(t | τ, β, α) = (α / (t√(2π))) * exp(-α²(ln(t) - (β - τ))² / 2)
 */
export function rtDensity(
  timeSeconds: number,
  tau: number,
  params: ResponseTimeParams
): number {
  if (timeSeconds <= 0) return 0;
  const logT = Math.log(timeSeconds);
  const mu = params.beta - tau;
  const exponent = -0.5 * params.alpha ** 2 * (logT - mu) ** 2;
  return (params.alpha / (timeSeconds * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

/**
 * Expected response time for a person with speed τ on an item
 */
export function expectedResponseTime(
  tau: number,
  params: ResponseTimeParams
): number {
  const mu = params.beta - tau;
  const sigma2 = 1 / (params.alpha ** 2);
  return Math.exp(mu + sigma2 / 2);
}

/**
 * Estimate person speed parameter from response times
 * Uses MLE: τ = mean(β_j - log(t_ij))
 */
export function estimateSpeed(
  responses: { timeSeconds: number; params: ResponseTimeParams }[]
): PersonSpeed {
  if (responses.length === 0) {
    return { tau: 0, seTau: 1 };
  }

  const validResponses = responses.filter(r => r.timeSeconds > 0);
  if (validResponses.length === 0) {
    return { tau: 0, seTau: 1 };
  }

  // MLE for tau
  let sumResidual = 0;
  let sumWeight = 0;

  for (const r of validResponses) {
    const logT = Math.log(r.timeSeconds);
    const residual = r.params.beta - logT;
    const weight = r.params.alpha ** 2;
    sumResidual += residual * weight;
    sumWeight += weight;
  }

  const tau = sumWeight > 0 ? sumResidual / sumWeight : 0;
  const seTau = sumWeight > 0 ? 1 / Math.sqrt(sumWeight) : 1;

  return {
    tau: Number(tau.toFixed(3)),
    seTau: Number(seTau.toFixed(3)),
  };
}

/**
 * Detect aberrant response times
 * 
 * Flags:
 * - RAPID_GUESS: response time < 3 seconds or z < -2.5 (likely random)
 * - SOLUTION_BEHAVIOR: z > 3 (excessive time, may indicate cheating)
 * - NORMAL: within expected range
 */
export function detectAberrantResponseTime(
  timeMs: number,
  tau: number,
  params: ResponseTimeParams,
  itemId: string
): AberrantResponseFlag {
  const timeSeconds = timeMs / 1000;
  const expectedMs = expectedResponseTime(tau, params) * 1000;
  
  // Z-score for this response time
  const logT = timeSeconds > 0 ? Math.log(timeSeconds) : 0;
  const mu = params.beta - tau;
  const sigma = 1 / params.alpha;
  const zScore = sigma > 0 ? (logT - mu) / sigma : 0;

  // Rapid guessing threshold: absolute minimum 3 seconds OR z < -2.5
  const isRapidGuess = timeMs < 3000 || zScore < -2.5;
  
  // Solution behavior: z > 3 (very slow, possibly looking up answer)
  const isSolutionBehavior = zScore > 3;

  let flag: "RAPID_GUESS" | "SOLUTION_BEHAVIOR" | "NORMAL";
  let legitimacyProbability: number;

  if (isRapidGuess) {
    flag = "RAPID_GUESS";
    // Probability of this fast a time under the model
    legitimacyProbability = Math.max(0, normalCDF(zScore));
  } else if (isSolutionBehavior) {
    flag = "SOLUTION_BEHAVIOR";
    legitimacyProbability = Math.max(0, 1 - normalCDF(zScore));
  } else {
    flag = "NORMAL";
    legitimacyProbability = 1;
  }

  return {
    itemId,
    responseTimeMs: timeMs,
    expectedTimeMs: Math.round(expectedMs),
    zScore: Number(zScore.toFixed(2)),
    flag,
    legitimacyProbability: Number(legitimacyProbability.toFixed(3)),
  };
}

/**
 * Calibrate item time parameters from response data
 */
export function calibrateItemTimeParams(
  responseTimes: { timeSeconds: number; personTau: number }[]
): ResponseTimeParams {
  const valid = responseTimes.filter(r => r.timeSeconds > 0);
  if (valid.length < 5) {
    return { ...DEFAULT_RESPONSE_TIME_PARAMS };
  }

  const logTimes = valid.map(r => Math.log(r.timeSeconds));
  const residuals = valid.map((r, i) => logTimes[i] + r.personTau);

  // Beta = mean of (log(t) + tau)
  const beta = residuals.reduce((a, b) => a + b, 0) / residuals.length;

  // Sigma² = variance of residuals
  const sigma2 = residuals.reduce((sum, r) => sum + (r - beta) ** 2, 0) / (residuals.length - 1);

  // Alpha = 1 / sqrt(sigma²)
  const alpha = sigma2 > 0 ? 1 / Math.sqrt(sigma2) : 1;

  return {
    beta: Number(beta.toFixed(3)),
    alpha: Number(alpha.toFixed(3)),
    sigma2: Number(sigma2.toFixed(3)),
  };
}

/**
 * Adjust IRT ability estimate based on response times
 * If a correct answer was suspiciously fast, reduce its weight
 * If an incorrect answer was very slow, it's more informative
 */
export function responseTimeAdjustedScore(
  score: number,
  flag: AberrantResponseFlag
): number {
  if (flag.flag === "RAPID_GUESS" && score === 1) {
    // Correct but too fast: reduce credit
    return score * flag.legitimacyProbability;
  }
  if (flag.flag === "SOLUTION_BEHAVIOR" && score === 1) {
    // Correct but suspiciously slow: slight penalty
    return score * 0.85;
  }
  return score;
}

/** Normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const t2 = t * t;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * erf);
}
