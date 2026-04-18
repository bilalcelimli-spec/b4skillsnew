/**
 * Reliability & Classification Metrics
 * 
 * Implements psychometric reliability indices:
 * - Marginal reliability (IRT-based)
 * - Classification accuracy & consistency
 * - Decision consistency (Livingston-Lewis)
 * - Conditional SEM
 */

export interface ReliabilityReport {
  marginalReliability: number;
  classificationAccuracy: number;
  classificationConsistency: number;
  conditionalSem: { cefrLevel: string; theta: number; sem: number }[];
  cronbachAlpha: number;
  testLength: number;
  sampleSize: number;
}

/**
 * Marginal reliability (IRT-based)
 * ρ = 1 - (mean(SE²) / var(θ))
 */
export function marginalReliability(
  thetas: number[],
  standardErrors: number[]
): number {
  if (thetas.length < 2) return 0;

  const meanTheta = thetas.reduce((a, b) => a + b, 0) / thetas.length;
  const varTheta = thetas.reduce((s, t) => s + (t - meanTheta) ** 2, 0) / (thetas.length - 1);
  const meanSE2 = standardErrors.reduce((s, se) => s + se ** 2, 0) / standardErrors.length;

  if (varTheta <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - meanSE2 / varTheta));
}

/**
 * Classification accuracy: proportion of test-takers correctly classified
 * into their "true" CEFR level (using double-length test as proxy)
 */
export function classificationAccuracy(
  observed: string[],
  trueLabels: string[]
): number {
  if (observed.length !== trueLabels.length || observed.length === 0) return 0;
  const correct = observed.filter((o, i) => o === trueLabels[i]).length;
  return correct / observed.length;
}

/**
 * Classification consistency: proportion of test-takers who would receive
 * the same classification on two independent administrations.
 * 
 * Uses the Livingston-Lewis (1995) approach approximation.
 */
export function classificationConsistency(
  thetas: number[],
  sems: number[],
  cutScores: number[]
): number {
  if (thetas.length === 0) return 0;

  const sortedCuts = [...cutScores].sort((a, b) => a - b);
  let totalConsistency = 0;

  for (let i = 0; i < thetas.length; i++) {
    const theta = thetas[i];
    const sem = sems[i];

    // For each test-taker, compute probability of being in each category
    const categoryProbs: number[] = [];
    for (let c = 0; c <= sortedCuts.length; c++) {
      const lower = c === 0 ? -Infinity : sortedCuts[c - 1];
      const upper = c === sortedCuts.length ? Infinity : sortedCuts[c];

      const pLower = lower === -Infinity ? 0 : normalCDF((lower - theta) / sem);
      const pUpper = upper === Infinity ? 1 : normalCDF((upper - theta) / sem);
      categoryProbs.push(pUpper - pLower);
    }

    // Consistency = sum of squared category probabilities
    // (probability of same classification on two independent tests)
    const consistency = categoryProbs.reduce((s, p) => s + p * p, 0);
    totalConsistency += consistency;
  }

  return totalConsistency / thetas.length;
}

/**
 * Conditional SEM at each CEFR cut-score boundary
 */
export function conditionalSemAtCuts(
  thetas: number[],
  sems: number[],
  cefrCuts: { level: string; theta: number }[]
): { cefrLevel: string; theta: number; sem: number }[] {
  return cefrCuts.map(cut => {
    // Find test-takers near this cut-score (within ±0.5)
    const nearby = thetas
      .map((t, i) => ({ theta: t, sem: sems[i] }))
      .filter(x => Math.abs(x.theta - cut.theta) <= 0.5);

    const avgSem = nearby.length > 0
      ? nearby.reduce((s, x) => s + x.sem, 0) / nearby.length
      : 0;

    return {
      cefrLevel: cut.level,
      theta: cut.theta,
      sem: Number(avgSem.toFixed(3)),
    };
  });
}

/**
 * Cronbach's alpha (for polytomous items)
 */
export function cronbachAlpha(itemScores: number[][]): number {
  const n = itemScores.length; // number of examinees
  const k = itemScores[0]?.length || 0; // number of items
  if (n < 2 || k < 2) return 0;

  // Total scores
  const totals = itemScores.map(row => row.reduce((a, b) => a + b, 0));
  const meanTotal = totals.reduce((a, b) => a + b, 0) / n;
  const varTotal = totals.reduce((s, t) => s + (t - meanTotal) ** 2, 0) / (n - 1);

  if (varTotal <= 0) return 0;

  // Sum of item variances
  let sumItemVar = 0;
  for (let j = 0; j < k; j++) {
    const itemVals = itemScores.map(row => row[j]);
    const mean = itemVals.reduce((a, b) => a + b, 0) / n;
    const variance = itemVals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    sumItemVar += variance;
  }

  return (k / (k - 1)) * (1 - sumItemVar / varTotal);
}

/**
 * Generate full reliability report
 */
export function generateReliabilityReport(
  thetas: number[],
  sems: number[],
  cefrCuts: { level: string; theta: number }[],
  itemScores?: number[][]
): ReliabilityReport {
  const cutThetas = cefrCuts.map(c => c.theta);

  return {
    marginalReliability: Number(marginalReliability(thetas, sems).toFixed(3)),
    classificationAccuracy: 0, // Requires true labels; computed separately
    classificationConsistency: Number(classificationConsistency(thetas, sems, cutThetas).toFixed(3)),
    conditionalSem: conditionalSemAtCuts(thetas, sems, cefrCuts),
    cronbachAlpha: itemScores ? Number(cronbachAlpha(itemScores).toFixed(3)) : 0,
    testLength: itemScores?.[0]?.length || 0,
    sampleSize: thetas.length,
  };
}

function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}
