import { prisma } from "../prisma";

/**
 * Distractor Analysis Service
 * 
 * Provides classical test theory (CTT) item statistics and distractor-level analysis.
 * Used to identify weak items, non-functioning distractors, and items needing revision.
 */

export interface DistractorStats {
  optionIndex: number;
  optionText: string;
  selectionCount: number;
  selectionRate: number;
  /** Mean theta of candidates who selected this option */
  meanTheta: number;
  /** Whether this is the correct answer */
  isCorrect: boolean;
  /** Quality flag: 'good' | 'weak' | 'non-functioning' */
  quality: "good" | "weak" | "non-functioning";
}

export interface ItemAnalysisReport {
  itemId: string;
  skill: string;
  cefrLevel: string;
  /** Number of responses analyzed */
  sampleSize: number;
  /** Classical difficulty: proportion correct (0-1) */
  pValue: number;
  /** Point-biserial correlation (item-total correlation) */
  pointBiserial: number;
  /** IRT parameters */
  irtParams: { a: number; b: number; c: number };
  /** IRT fit statistics */
  irtFit: { infit: number; outfit: number };
  /** Item information at key theta points */
  informationCurve: { theta: number; info: number }[];
  /** Per-distractor analysis */
  distractorAnalysis: DistractorStats[];
  /** Automated quality flags */
  flags: string[];
  /** Overall quality grade: A/B/C/D/F */
  grade: "A" | "B" | "C" | "D" | "F";
}

/**
 * Calculate point-biserial correlation between item scores and total scores
 */
function pointBiserialCorrelation(
  itemScores: number[],
  totalScores: number[]
): number {
  const n = itemScores.length;
  if (n < 3) return 0;

  const meanTotal = totalScores.reduce((a, b) => a + b, 0) / n;
  const sdTotal = Math.sqrt(
    totalScores.reduce((sum, x) => sum + (x - meanTotal) ** 2, 0) / (n - 1)
  );
  if (sdTotal === 0) return 0;

  const correct = itemScores.reduce((count, s) => count + (s >= 0.5 ? 1 : 0), 0);
  const incorrect = n - correct;
  if (correct === 0 || incorrect === 0) return 0;

  const p = correct / n;
  const q = 1 - p;

  const meanTotalCorrect = totalScores
    .filter((_, i) => itemScores[i] >= 0.5)
    .reduce((a, b) => a + b, 0) / correct;

  const meanTotalIncorrect = totalScores
    .filter((_, i) => itemScores[i] < 0.5)
    .reduce((a, b) => a + b, 0) / incorrect;

  return ((meanTotalCorrect - meanTotalIncorrect) / sdTotal) * Math.sqrt(p * q);
}

/**
 * Calculate IRT item fit (infit and outfit MNSQ)
 * Based on the standardized residual approach
 */
function calculateItemFit(
  responses: { score: number; expectedP: number }[]
): { infit: number; outfit: number } {
  const n = responses.length;
  if (n < 2) return { infit: 1.0, outfit: 1.0 };

  let weightedSumResidSq = 0;
  let weightedSumVariance = 0;
  let sumStdResidSq = 0;

  for (const r of responses) {
    const p = Math.max(0.001, Math.min(0.999, r.expectedP));
    const variance = p * (1 - p);
    const residual = r.score - p;
    const stdResidSq = (residual ** 2) / variance;

    weightedSumResidSq += residual ** 2;
    weightedSumVariance += variance;
    sumStdResidSq += stdResidSq;
  }

  const infit = weightedSumResidSq / weightedSumVariance;
  const outfit = sumStdResidSq / n;

  return {
    infit: Number(infit.toFixed(3)),
    outfit: Number(outfit.toFixed(3)),
  };
}

/**
 * Calculate Fisher Information at a specific theta
 */
function fisherInfo(theta: number, a: number, b: number, c: number): number {
  const exp = Math.exp(-a * (theta - b));
  const p = c + (1 - c) / (1 + exp);
  if (p <= 0 || p >= 1 || c >= 1) return 0;
  const q = 1 - p;
  const pMinusC = p - c;
  const oneMinusC = 1 - c;
  return (a ** 2 * q * pMinusC ** 2) / (p * oneMinusC ** 2);
}

export const DistractorAnalysisService = {
  /**
   * Analyze a single item with all response data
   */
  async analyzeItem(itemId: string): Promise<ItemAnalysisReport> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error(`Item ${itemId} not found`);

    const responses = await prisma.response.findMany({
      where: { itemId },
      include: { session: true },
    });

    const content = item.content as any;
    const options = content?.options || [];
    const sampleSize = responses.length;

    // Calculate p-value (proportion correct)
    const correctCount = responses.filter((r) => r.isCorrect).length;
    const pValue = sampleSize > 0 ? correctCount / sampleSize : 0;

    // Collect total scores per session for point-biserial
    const sessionIds = [...new Set(responses.map((r) => r.sessionId))];
    const sessionTotals: Record<string, number> = {};
    if (sessionIds.length > 0) {
      const allResponses = await prisma.response.findMany({
        where: { sessionId: { in: sessionIds } },
      });
      for (const r of allResponses) {
        sessionTotals[r.sessionId] = (sessionTotals[r.sessionId] || 0) + (r.score || 0);
      }
    }

    const itemScores = responses.map((r) => r.score || 0);
    const totalScores = responses.map((r) => sessionTotals[r.sessionId] || 0);
    const pbis = pointBiserialCorrelation(itemScores, totalScores);

    // IRT parameters
    const irtParams = {
      a: item.discrimination,
      b: item.difficulty,
      c: item.guessing,
    };

    // IRT fit
    const expectedPs = responses.map((r) => {
      const theta = r.session?.theta || 0;
      const exp = Math.exp(-irtParams.a * (theta - irtParams.b));
      return irtParams.c + (1 - irtParams.c) / (1 + exp);
    });
    const irtFit = calculateItemFit(
      responses.map((r, i) => ({ score: r.score || 0, expectedP: expectedPs[i] }))
    );

    // Information curve
    const informationCurve = [];
    for (let t = -3; t <= 3; t += 0.5) {
      informationCurve.push({
        theta: t,
        info: fisherInfo(t, irtParams.a, irtParams.b, irtParams.c),
      });
    }

    // Distractor analysis
    const distractorAnalysis: DistractorStats[] = [];
    if (options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const opt = typeof options[i] === "string" ? options[i] : options[i].text;
        const isCorrect =
          typeof options[i] === "object" ? !!options[i].isCorrect : i === content?.correctIndex;

        // Find responses that selected this option
        const selectorsForOption = responses.filter((r) => {
          const val = r.value;
          if (typeof val === "string") {
            try {
              return JSON.parse(val) === i;
            } catch {
              return val === String(i);
            }
          }
          return false;
        });

        const selectionCount = selectorsForOption.length;
        const selectionRate = sampleSize > 0 ? selectionCount / sampleSize : 0;
        const meanTheta =
          selectionCount > 0
            ? selectorsForOption.reduce((sum, r) => sum + (r.session?.theta || 0), 0) / selectionCount
            : 0;

        let quality: "good" | "weak" | "non-functioning" = "good";
        if (!isCorrect) {
          if (selectionRate < 0.02) quality = "non-functioning";
          else if (meanTheta >= 0) quality = "weak"; // High-ability selecting wrong answer = weak distractor
        }

        distractorAnalysis.push({
          optionIndex: i,
          optionText: opt,
          selectionCount,
          selectionRate: Number(selectionRate.toFixed(3)),
          meanTheta: Number(meanTheta.toFixed(2)),
          isCorrect,
          quality,
        });
      }
    }

    // Quality flags
    const flags: string[] = [];
    if (pValue < 0.1) flags.push("TOO_DIFFICULT");
    if (pValue > 0.95) flags.push("TOO_EASY");
    if (pbis < 0.15) flags.push("LOW_DISCRIMINATION");
    if (pbis < 0) flags.push("NEGATIVE_DISCRIMINATION");
    if (irtFit.outfit > 2.0) flags.push("POOR_FIT_OUTFIT");
    if (irtFit.infit > 1.5) flags.push("POOR_FIT_INFIT");
    const nonFunctioning = distractorAnalysis.filter((d) => !d.isCorrect && d.quality === "non-functioning");
    if (nonFunctioning.length > 0) flags.push(`NON_FUNCTIONING_DISTRACTORS:${nonFunctioning.length}`);

    // Overall grade
    let grade: "A" | "B" | "C" | "D" | "F" = "A";
    if (flags.length === 0 && pbis >= 0.3 && pValue >= 0.2 && pValue <= 0.8) grade = "A";
    else if (flags.length <= 1 && pbis >= 0.2) grade = "B";
    else if (flags.length <= 2 && pbis >= 0.1) grade = "C";
    else if (pbis >= 0) grade = "D";
    else grade = "F";

    return {
      itemId,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      sampleSize,
      pValue: Number(pValue.toFixed(3)),
      pointBiserial: Number(pbis.toFixed(3)),
      irtParams,
      irtFit,
      informationCurve,
      distractorAnalysis,
      flags,
      grade,
    };
  },

  /**
   * Batch analyze all active items
   */
  async analyzeAllItems(): Promise<ItemAnalysisReport[]> {
    const items = await prisma.item.findMany({
      where: { status: { in: ["ACTIVE", "PRETEST"] } },
      select: { id: true },
    });

    const reports: ItemAnalysisReport[] = [];
    for (const item of items) {
      try {
        const report = await this.analyzeItem(item.id);
        if (report.sampleSize >= 10) {
          reports.push(report);
        }
      } catch (e) {
        console.warn(`Skipping item ${item.id}:`, e);
      }
    }
    return reports;
  },

  /**
   * Get items that need review based on quality flags
   */
  async getFlaggedItems(): Promise<ItemAnalysisReport[]> {
    const all = await this.analyzeAllItems();
    return all.filter((r) => r.flags.length > 0 || r.grade === "D" || r.grade === "F");
  },

  /**
   * Get summary statistics for the entire item bank
   */
  async getItemBankSummary() {
    const reports = await this.analyzeAllItems();
    const total = reports.length;
    if (total === 0) return { total: 0, gradeDistribution: {}, avgPBis: 0, avgPValue: 0, flaggedCount: 0 };

    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let sumPBis = 0;
    let sumPValue = 0;
    let flaggedCount = 0;

    for (const r of reports) {
      gradeDistribution[r.grade]++;
      sumPBis += r.pointBiserial;
      sumPValue += r.pValue;
      if (r.flags.length > 0) flaggedCount++;
    }

    return {
      total,
      gradeDistribution,
      avgPBis: Number((sumPBis / total).toFixed(3)),
      avgPValue: Number((sumPValue / total).toFixed(3)),
      flaggedCount,
    };
  },
};
