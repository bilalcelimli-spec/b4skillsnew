/**
 * b4skills Learning Trajectory Analyzer
 *
 * Measures candidate growth over time using IRT theta estimates,
 * calculates learning velocity, detects trend direction, and projects
 * CEFR milestone dates using linear regression.
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrendDirection = "improving" | "stable" | "declining" | "insufficient_data";

export interface ThetaDataPoint {
  date: Date;
  theta: number;
  skill: string;
  sessionId: string;
}

export interface LearningTrajectory {
  candidateId: string;
  dataPoints: ThetaDataPoint[];
  currentTheta: number;
  thetaGainPerWeek: number;
  trend: TrendDirection;
  velocityPercentile: number; // 0-100 vs cohort
  projectedMasteryDate: Record<string, Date | null>; // per CEFR level
  confidenceInterval: { lower: number; upper: number };
  weeklyActivity: number; // sessions/week average
  streakDays: number;
  plateauRisk: boolean;
}

export interface SkillTrajectory {
  skill: string;
  trajectory: LearningTrajectory;
}

// ---------------------------------------------------------------------------
// Linear regression helper
// ---------------------------------------------------------------------------

function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number; r2: number } {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// CEFR level → target theta mapping (IRT scale, mean=0, SD=1)
const CEFR_THETA_THRESHOLDS: Record<string, number> = {
  A1: -2.5,
  A2: -1.5,
  B1: -0.5,
  B2: 0.5,
  C1: 1.5,
  C2: 2.5,
};

// ---------------------------------------------------------------------------
// Analyzer
// ---------------------------------------------------------------------------

export class LearningTrajectoryAnalyzer {
  async analyzeTrajectory(
    candidateId: string,
    skill?: string
  ): Promise<LearningTrajectory> {
    const sessions = await prisma.session.findMany({
      where: {
        candidateId,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        completedAt: true,
        theta: true,
        cefrLevel: true,
        createdAt: true,
      },
    });

    const dataPoints: ThetaDataPoint[] = sessions
      .filter((s) => s.completedAt !== null)
      .map((s) => ({
        date: s.completedAt!,
        theta: s.theta ?? 0,
        skill: skill ?? "OVERALL",
        sessionId: s.id,
      }));

    if (dataPoints.length === 0) {
      return this.emptyTrajectory(candidateId);
    }

    const currentTheta = dataPoints[dataPoints.length - 1].theta;

    // Weekly gain via linear regression
    const first = dataPoints[0].date.getTime();
    const regressionPoints = dataPoints.map((dp) => ({
      x: (dp.date.getTime() - first) / (7 * 24 * 60 * 60 * 1000), // weeks
      y: dp.theta,
    }));
    const { slope, intercept, r2 } = linearRegression(regressionPoints);

    // Trend classification
    let trend: TrendDirection;
    if (dataPoints.length < 3) {
      trend = "insufficient_data";
    } else if (slope > 0.05) {
      trend = "improving";
    } else if (slope < -0.05) {
      trend = "declining";
    } else {
      trend = "stable";
    }

    // Project mastery dates for each CEFR level above current
    const projectedMasteryDate: Record<string, Date | null> = {};
    const weeksNow = regressionPoints[regressionPoints.length - 1].x;

    for (const [level, targetTheta] of Object.entries(CEFR_THETA_THRESHOLDS)) {
      if (targetTheta <= currentTheta) {
        projectedMasteryDate[level] = new Date(Date.now() - 1000); // already achieved
        continue;
      }
      if (slope <= 0) {
        projectedMasteryDate[level] = null; // no progress
        continue;
      }
      const weeksNeeded = (targetTheta - intercept) / slope - weeksNow;
      if (weeksNeeded < 0 || weeksNeeded > 520) {
        projectedMasteryDate[level] = null;
        continue;
      }
      const d = new Date();
      d.setDate(d.getDate() + Math.round(weeksNeeded * 7));
      projectedMasteryDate[level] = d;
    }

    // Confidence interval (±1 SD based on regression residuals)
    const residuals = regressionPoints.map((p) => Math.abs(p.y - (slope * p.x + intercept)));
    const sdResidual = residuals.length > 1
      ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length)
      : 0.2;

    // Weekly activity
    const totalWeeks = Math.max(
      1,
      (dataPoints[dataPoints.length - 1].date.getTime() - dataPoints[0].date.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const weeklyActivity = dataPoints.length / totalWeeks;

    // Streak (consecutive days with at least one session)
    const streakDays = this.calculateStreak(dataPoints);

    // Plateau risk: last 4 weeks slope < 0.01
    const recentPoints = regressionPoints.filter((p) => p.x >= weeksNow - 4);
    const recentReg = linearRegression(recentPoints);
    const plateauRisk = recentReg.slope < 0.01;

    return {
      candidateId,
      dataPoints,
      currentTheta,
      thetaGainPerWeek: slope,
      trend,
      velocityPercentile: 50, // would need cohort data for real percentile
      projectedMasteryDate,
      confidenceInterval: { lower: currentTheta - sdResidual, upper: currentTheta + sdResidual },
      weeklyActivity: Math.round(weeklyActivity * 10) / 10,
      streakDays,
      plateauRisk,
    };
  }

  async analyzeMultiSkillTrajectory(candidateId: string): Promise<SkillTrajectory[]> {
    const skills = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "SPEAKING", "WRITING"];
    const results = await Promise.all(
      skills.map(async (skill) => ({
        skill,
        trajectory: await this.analyzeTrajectory(candidateId, skill),
      }))
    );
    return results.filter((r) => r.trajectory.dataPoints.length > 0);
  }

  async compareCandidateVsCohort(candidateId: string, organizationId: string): Promise<{
    candidateTheta: number;
    cohortMean: number;
    cohortMedian: number;
    percentileRank: number;
  }> {
    const candidateTrajectory = await this.analyzeTrajectory(candidateId);
    const candidateTheta = candidateTrajectory.currentTheta;

    const cohortUsers = await prisma.user.findMany({
      where: { organizationId },
      select: {
        sessions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: { theta: true },
        },
      },
    });

    const cohortThetas = cohortUsers
      .map((u) => u.sessions[0]?.theta ?? null)
      .filter((t): t is number => t !== null);

    const cohortMean = cohortThetas.length > 0 ? cohortThetas.reduce((a, b) => a + b, 0) / cohortThetas.length : 0;
    const sorted = [...cohortThetas].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const cohortMedian = sorted.length === 0 ? 0 : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const below = cohortThetas.filter((t) => t < candidateTheta).length;
    const percentileRank = cohortThetas.length > 0 ? Math.round((below / cohortThetas.length) * 100) : 50;

    return { candidateTheta, cohortMean, cohortMedian, percentileRank };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private scoreToTheta(score: number): number {
    // Convert 0-100 score to IRT theta scale (-3 to +3)
    return (score / 100) * 6 - 3;
  }

  private calculateStreak(dataPoints: ThetaDataPoint[]): number {
    if (dataPoints.length === 0) return 0;
    const dates = [...new Set(dataPoints.map((d) => d.date.toDateString()))];
    let streak = 1;
    const sorted = dates.sort().reverse();
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  }

  private emptyTrajectory(candidateId: string): LearningTrajectory {
    return {
      candidateId,
      dataPoints: [],
      currentTheta: -2,
      thetaGainPerWeek: 0,
      trend: "insufficient_data",
      velocityPercentile: 0,
      projectedMasteryDate: {},
      confidenceInterval: { lower: -2.5, upper: -1.5 },
      weeklyActivity: 0,
      streakDays: 0,
      plateauRisk: false,
    };
  }
}

export const learningTrajectoryAnalyzer = new LearningTrajectoryAnalyzer();
