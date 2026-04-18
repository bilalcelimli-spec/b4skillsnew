import { prisma } from "../prisma";

/**
 * Differential Item Functioning (DIF) Analysis Service
 * 
 * Detects item bias by comparing response patterns across demographic groups
 * (gender, native language, age group). Uses Mantel-Haenszel (MH) and
 * Logistic Regression methods.
 * 
 * ETS DIF Classification:
 *   A: Negligible (|MH-D| < 1.0)
 *   B: Moderate (1.0 ≤ |MH-D| < 1.5)
 *   C: Large (|MH-D| ≥ 1.5)
 */

export type DifGroupVariable = "gender" | "nativeLanguage" | "ageGroup";
export type DifClassification = "A" | "B" | "C";

export interface DifResult {
  itemId: string;
  groupVariable: DifGroupVariable;
  referenceGroup: string;
  focalGroup: string;
  /** Mantel-Haenszel odds ratio */
  mhOddsRatio: number;
  /** MH Delta (ETS delta metric) */
  mhDelta: number;
  /** Chi-squared statistic */
  chiSquared: number;
  /** P-value */
  pValue: number;
  /** ETS DIF classification */
  classification: DifClassification;
  /** Sample sizes */
  referenceN: number;
  focalN: number;
  /** Logistic regression: uniform DIF effect size */
  logisticUniformDif: number;
  /** Logistic regression: non-uniform DIF effect size */
  logisticNonUniformDif: number;
}

export interface DifReport {
  itemId: string;
  skill: string;
  cefrLevel: string;
  results: DifResult[];
  /** Whether any flagged DIF was found */
  hasDif: boolean;
  /** Worst classification across all comparisons */
  worstClassification: DifClassification;
}

/**
 * Mantel-Haenszel DIF procedure
 * Computes common odds ratio across ability strata
 */
function mantelHaenszel(
  referenceCorrect: number[],  // correct per stratum (reference)
  referenceTotal: number[],    // total per stratum (reference)
  focalCorrect: number[],      // correct per stratum (focal)
  focalTotal: number[]         // total per stratum (focal)
): { oddsRatio: number; delta: number; chiSq: number; pValue: number } {
  const K = referenceCorrect.length;
  let alphaNum = 0;
  let alphaDen = 0;
  let chiNum = 0;
  let chiDen = 0;

  for (let k = 0; k < K; k++) {
    const nR = referenceTotal[k];
    const nF = focalTotal[k];
    const N = nR + nF;
    if (N === 0) continue;

    const aR = referenceCorrect[k];
    const bR = nR - aR;
    const aF = focalCorrect[k];
    const bF = nF - aF;

    // MH odds ratio components
    alphaNum += (aR * bF) / N;
    alphaDen += (aF * bR) / N;

    // MH chi-squared components
    const expectedA_R = nR * (aR + aF) / N;
    chiNum += aR - expectedA_R;
    chiDen += (nR * nF * (aR + aF) * (bR + bF)) / (N * N * (N - 1 || 1));
  }

  const oddsRatio = alphaDen > 0 ? alphaNum / alphaDen : 1;
  const delta = -2.35 * Math.log(oddsRatio); // ETS delta scale
  const chiSq = chiDen > 0 ? Math.pow(Math.abs(chiNum) - 0.5, 2) / chiDen : 0;

  // Approximate p-value from chi-squared with df=1
  const pValue = 1 - chiSquaredCDF(chiSq, 1);

  return { oddsRatio, delta, chiSq, pValue };
}

/**
 * Chi-squared CDF approximation (Wilson-Hilferty)
 */
function chiSquaredCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const denom = Math.sqrt(2 / (9 * df));
  const standardNormal = z / denom;
  return normalCDF(standardNormal);
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327;
  const p = d * Math.exp(-x * x / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Simple logistic regression DIF detection
 * Model: logit(P) = b0 + b1*theta + b2*group + b3*theta*group
 * b2 = uniform DIF, b3 = non-uniform DIF
 */
function logisticRegressionDif(
  data: { theta: number; group: 0 | 1; correct: 0 | 1 }[]
): { uniformDif: number; nonUniformDif: number } {
  if (data.length < 20) return { uniformDif: 0, nonUniformDif: 0 };

  // Simple OLS approximation of logistic regression coefficients
  const n = data.length;
  const meanTheta = data.reduce((s, d) => s + d.theta, 0) / n;
  const meanGroup = data.reduce((s, d) => s + d.group, 0) / n;
  const meanY = data.reduce((s, d) => s + d.correct, 0) / n;

  // Uniform DIF: difference in proportion correct between groups, adjusting for theta
  const ref = data.filter(d => d.group === 0);
  const foc = data.filter(d => d.group === 1);

  if (ref.length < 5 || foc.length < 5) return { uniformDif: 0, nonUniformDif: 0 };

  // Stratify by theta quartiles
  const thetas = data.map(d => d.theta).sort((a, b) => a - b);
  const q1 = thetas[Math.floor(n * 0.25)];
  const q2 = thetas[Math.floor(n * 0.5)];
  const q3 = thetas[Math.floor(n * 0.75)];

  let sumDiff = 0;
  let sumInteraction = 0;
  let strata = 0;

  for (const [lo, hi] of [[Number.NEGATIVE_INFINITY, q1], [q1, q2], [q2, q3], [q3, Number.POSITIVE_INFINITY]]) {
    const refStr = ref.filter(d => d.theta >= lo && d.theta < hi);
    const focStr = foc.filter(d => d.theta >= lo && d.theta < hi);
    if (refStr.length < 2 || focStr.length < 2) continue;

    const pRef = refStr.reduce((s, d) => s + d.correct, 0) / refStr.length;
    const pFoc = focStr.reduce((s, d) => s + d.correct, 0) / focStr.length;
    const midTheta = (lo === Number.NEGATIVE_INFINITY ? q1 : lo + hi === Number.POSITIVE_INFINITY ? q3 : (lo + hi) / 2);

    sumDiff += pRef - pFoc;
    sumInteraction += (pRef - pFoc) * (midTheta > meanTheta ? 1 : -1);
    strata++;
  }

  return {
    uniformDif: strata > 0 ? Number((sumDiff / strata).toFixed(3)) : 0,
    nonUniformDif: strata > 0 ? Number((sumInteraction / strata).toFixed(3)) : 0,
  };
}

/**
 * Classify DIF using ETS criteria
 */
function classifyDif(mhDelta: number): DifClassification {
  const absDelta = Math.abs(mhDelta);
  if (absDelta < 1.0) return "A";
  if (absDelta < 1.5) return "B";
  return "C";
}

export const DifAnalysisService = {
  /**
   * Analyze DIF for a single item across a grouping variable
   */
  async analyzeItemDif(
    itemId: string,
    groupVariable: DifGroupVariable,
    referenceGroup: string,
    focalGroup: string,
    numStrata: number = 5
  ): Promise<DifResult> {
    // Fetch all responses for this item with candidate info
    const responses = await prisma.response.findMany({
      where: { itemId },
      include: {
        session: {
          include: { candidate: true },
        },
      },
    });

    // Group candidates by the grouping variable
    const getGroupValue = (candidate: any): string | null => {
      if (!candidate?.metadata) return null;
      const meta = typeof candidate.metadata === "object" ? candidate.metadata : {};
      switch (groupVariable) {
        case "gender": return (meta as any).gender;
        case "nativeLanguage": return (meta as any).nativeLanguage;
        case "ageGroup": return (meta as any).ageGroup;
        default: return null;
      }
    };

    const refResponses = responses.filter(r => getGroupValue(r.session?.candidate) === referenceGroup);
    const focResponses = responses.filter(r => getGroupValue(r.session?.candidate) === focalGroup);

    if (refResponses.length < 10 || focResponses.length < 10) {
      return {
        itemId,
        groupVariable,
        referenceGroup,
        focalGroup,
        mhOddsRatio: 1,
        mhDelta: 0,
        chiSquared: 0,
        pValue: 1,
        classification: "A",
        referenceN: refResponses.length,
        focalN: focResponses.length,
        logisticUniformDif: 0,
        logisticNonUniformDif: 0,
      };
    }

    // Create ability strata based on theta
    const allThetas = responses
      .map(r => r.session?.theta || 0)
      .sort((a, b) => a - b);
    
    const strataBreaks: number[] = [];
    for (let i = 1; i < numStrata; i++) {
      strataBreaks.push(allThetas[Math.floor(allThetas.length * i / numStrata)]);
    }

    // Calculate MH statistics per stratum
    const refCorrect: number[] = new Array(numStrata).fill(0);
    const refTotal: number[] = new Array(numStrata).fill(0);
    const focCorrect: number[] = new Array(numStrata).fill(0);
    const focTotal: number[] = new Array(numStrata).fill(0);

    const getStratum = (theta: number): number => {
      for (let i = 0; i < strataBreaks.length; i++) {
        if (theta < strataBreaks[i]) return i;
      }
      return numStrata - 1;
    };

    for (const r of refResponses) {
      const s = getStratum(r.session?.theta || 0);
      refTotal[s]++;
      if (r.isCorrect) refCorrect[s]++;
    }

    for (const r of focResponses) {
      const s = getStratum(r.session?.theta || 0);
      focTotal[s]++;
      if (r.isCorrect) focCorrect[s]++;
    }

    const mh = mantelHaenszel(refCorrect, refTotal, focCorrect, focTotal);

    // Logistic regression DIF
    const logData: { theta: number; group: 0 | 1; correct: 0 | 1 }[] = [
      ...refResponses.map(r => ({ theta: r.session?.theta || 0, group: 0 as const, correct: (r.isCorrect ? 1 : 0) as 0 | 1 })),
      ...focResponses.map(r => ({ theta: r.session?.theta || 0, group: 1 as const, correct: (r.isCorrect ? 1 : 0) as 0 | 1 })),
    ];
    const logistic = logisticRegressionDif(logData);

    return {
      itemId,
      groupVariable,
      referenceGroup,
      focalGroup,
      mhOddsRatio: Number(mh.oddsRatio.toFixed(3)),
      mhDelta: Number(mh.delta.toFixed(3)),
      chiSquared: Number(mh.chiSq.toFixed(3)),
      pValue: Number(mh.pValue.toFixed(4)),
      classification: classifyDif(mh.delta),
      referenceN: refResponses.length,
      focalN: focResponses.length,
      logisticUniformDif: logistic.uniformDif,
      logisticNonUniformDif: logistic.nonUniformDif,
    };
  },

  /**
   * Full DIF analysis for all active items
   */
  async analyzeAllItems(
    groupVariable: DifGroupVariable,
    referenceGroup: string,
    focalGroup: string
  ): Promise<DifReport[]> {
    const items = await prisma.item.findMany({
      where: { status: { in: ["ACTIVE"] } },
      select: { id: true, skill: true, cefrLevel: true },
    });

    const reports: DifReport[] = [];

    for (const item of items) {
      try {
        const result = await this.analyzeItemDif(item.id, groupVariable, referenceGroup, focalGroup);
        reports.push({
          itemId: item.id,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          results: [result],
          hasDif: result.classification !== "A",
          worstClassification: result.classification,
        });
      } catch (e) {
        console.warn(`DIF analysis failed for item ${item.id}:`, e);
      }
    }

    return reports;
  },

  /**
   * Get items with significant DIF
   */
  async getFlaggedItems(
    groupVariable: DifGroupVariable,
    referenceGroup: string,
    focalGroup: string
  ): Promise<DifReport[]> {
    const all = await this.analyzeAllItems(groupVariable, referenceGroup, focalGroup);
    return all.filter(r => r.hasDif);
  },
};
