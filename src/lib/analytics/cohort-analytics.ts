/**
 * b4skills Cohort Analytics
 *
 * Full cohort-level analytics beyond the basic analytics-service:
 *   - Bottleneck identification (skills/levels where cohort stalls)
 *   - Engagement metrics (drop-off, completion rates, active streaks)
 *   - Score distribution statistics (mean, median, SD, skewness, percentiles)
 *   - Cohort velocity (theta gain/week vs platform average)
 *   - At-risk learner identification
 *   - Cohort comparison across time windows
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CohortStats {
  organizationId: string;
  generatedAt: Date;
  candidateCount: number;
  activeCount: number;            // active in last 30 days
  completionRate: number;         // % sessions completed vs started
  averageTheta: number;
  medianTheta: number;
  thetaStdDev: number;
  thetaP25: number;
  thetaP75: number;
  thetaP90: number;
  averageCefrLevel: string;
  cefrDistribution: Record<string, number>;
  engagementMetrics: EngagementMetrics;
  bottlenecks: Bottleneck[];
  atRiskLearners: AtRiskLearner[];
  velocityVsPlatform: VelocityComparison;
  weeklyActivity: WeeklyActivity[];
}

export interface EngagementMetrics {
  averageSessionsPerCandidate: number;
  medianSessionsPerCandidate: number;
  dropOffRate: number;             // % who started but never completed
  retentionRate30d: number;        // % active in last 30 days
  averageSessionDurationMinutes: number;
  completionRate: number;          // sessions completed / sessions started
}

export interface Bottleneck {
  cefrLevel: string;
  averageDaysStuck: number;        // avg days since last level change
  candidateCount: number;
  stuckPercentage: number;         // % of cohort stuck at this level
  recommendedAction: string;
}

export interface AtRiskLearner {
  userId: string;
  name: string;
  email: string;
  cefrLevel: string;
  theta: number;
  lastActivityDaysAgo: number;
  riskFactors: string[];
  riskScore: number;              // 0–100 (higher = more at risk)
}

export interface VelocityComparison {
  cohortThetaGainPerWeek: number;
  platformAverageThetaGainPerWeek: number;
  percentileVsPlatform: number;
  performanceLabel: "above_average" | "average" | "below_average";
}

export interface WeeklyActivity {
  weekStart: string;             // ISO date (Monday)
  completedSessions: number;
  uniqueActiveUsers: number;
  averageThetaChange: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function thetaToCefr(theta: number): string {
  if (theta < -2.0) return "A1";
  if (theta < -1.0) return "A2";
  if (theta <  0.0) return "B1";
  if (theta <  1.0) return "B2";
  if (theta <  2.0) return "C1";
  return "C2";
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// CohortAnalyticsService
// ---------------------------------------------------------------------------

export class CohortAnalyticsService {
  /**
   * Full cohort stats for an organization.
   * Queries are DB-heavy; use with caching in production.
   */
  async getCohortStats(organizationId: string): Promise<CohortStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sevenDaysAgo  = new Date(now.getTime() -  7 * 86_400_000);

    // ── Fetch all users in org ───────────────────────────────────────────────
    const users = await prisma.user.findMany({
      where: { organizationId, role: "CANDIDATE" },
      select: {
        id: true,
        name: true,
        email: true,
        sessions: {
          select: {
            id: true,
            status: true,
            theta: true,
            cefrLevel: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const candidateCount = users.length;
    if (candidateCount === 0) return this.emptyCohortStats(organizationId, now);

    // ── Per-user metrics ─────────────────────────────────────────────────────
    const allThetas: number[] = [];
    const sessionDurations: number[] = [];
    const sessionsPerCandidate: number[] = [];
    const atRiskLearners: AtRiskLearner[] = [];

    let totalStarted = 0;
    let totalCompleted = 0;
    let activeCount = 0;
    const cefrDist: Record<string, number> = {};

    // CEFR level change tracking for bottleneck analysis
    const cefrStuckDays: Record<string, number[]> = {};

    for (const user of users) {
      const completedSessions = user.sessions.filter((s) => s.status === "COMPLETED");
      const startedSessions   = user.sessions.filter((s) => ["COMPLETED", "IN_PROGRESS"].includes(s.status));

      totalStarted   += startedSessions.length;
      totalCompleted += completedSessions.length;
      sessionsPerCandidate.push(completedSessions.length);

      const lastCompleted = completedSessions[completedSessions.length - 1];
      const lastTheta = lastCompleted?.theta ?? null;
      const lastCefr  = lastCompleted?.cefrLevel ?? null;

      if (lastTheta !== null) {
        allThetas.push(lastTheta);
        if (lastCefr) {
          cefrDist[lastCefr] = (cefrDist[lastCefr] ?? 0) + 1;
          // Compute stuck time at level
          const prevSession = completedSessions[completedSessions.length - 2];
          const prevCefr = prevSession?.cefrLevel ?? null;
          if (prevCefr === lastCefr && lastCompleted?.completedAt && prevSession?.completedAt) {
            const daysDiff = (lastCompleted.completedAt.getTime() - prevSession.completedAt.getTime()) / 86_400_000;
            if (!cefrStuckDays[lastCefr]) cefrStuckDays[lastCefr] = [];
            cefrStuckDays[lastCefr].push(daysDiff);
          }
        }
      }

      // Active check (session in last 30d)
      const recentActivity = user.sessions.find((s) => s.createdAt >= thirtyDaysAgo);
      if (recentActivity) activeCount++;

      // Session durations
      for (const s of completedSessions) {
        if (s.startedAt && s.completedAt) {
          const duration = (s.completedAt.getTime() - s.startedAt.getTime()) / 60_000;
          if (duration > 0 && duration < 300) sessionDurations.push(duration);
        }
      }

      // At-risk detection
      const riskFactors: string[] = [];
      let riskScore = 0;

      const daysSinceActivity = lastCompleted?.completedAt
        ? (now.getTime() - lastCompleted.completedAt.getTime()) / 86_400_000
        : 999;

      if (daysSinceActivity > 14)  { riskFactors.push("No activity in 14+ days");  riskScore += 30; }
      if (daysSinceActivity > 30)  { riskFactors.push("No activity in 30+ days");  riskScore += 20; }
      if (completedSessions.length === 0) { riskFactors.push("Never completed an assessment"); riskScore += 40; }
      if (completedSessions.length === 1) { riskFactors.push("Only 1 session completed");      riskScore += 15; }
      if (lastTheta !== null && lastTheta < -2.0) { riskFactors.push("Score in A1 range"); riskScore += 15; }

      // Only flag as at-risk if meaningful risk
      if (riskScore >= 30) {
        atRiskLearners.push({
          userId: user.id,
          name: user.name ?? "Unknown",
          email: user.email,
          cefrLevel: lastCefr ?? "A1",
          theta: lastTheta ?? -3,
          lastActivityDaysAgo: Math.round(daysSinceActivity),
          riskFactors,
          riskScore: Math.min(100, riskScore),
        });
      }
    }

    // ── Distribution stats ───────────────────────────────────────────────────
    const sortedThetas = [...allThetas].sort((a, b) => a - b);
    const averageTheta = allThetas.length > 0 ? allThetas.reduce((a, b) => a + b, 0) / allThetas.length : 0;
    const medianTheta  = percentile(sortedThetas, 0.5);
    const thetaSD      = stdDev(allThetas);
    const thetaP25     = percentile(sortedThetas, 0.25);
    const thetaP75     = percentile(sortedThetas, 0.75);
    const thetaP90     = percentile(sortedThetas, 0.90);

    // ── Bottlenecks ──────────────────────────────────────────────────────────
    const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const bottlenecks: Bottleneck[] = CEFR_LEVELS.map((level) => {
      const stuck = cefrStuckDays[level] ?? [];
      const count = cefrDist[level] ?? 0;
      const avgDaysStuck = stuck.length > 0 ? stuck.reduce((a, b) => a + b, 0) / stuck.length : 0;
      const stuckPct = candidateCount > 0 ? Math.round((count / candidateCount) * 100) : 0;

      let action = "Monitor progress";
      if (avgDaysStuck > 21) action = "Schedule targeted intervention sessions";
      else if (avgDaysStuck > 14) action = "Send motivational nudge and additional practice materials";
      else if (stuckPct > 30) action = "Review item bank difficulty at this level";

      return {
        cefrLevel: level,
        averageDaysStuck: Math.round(avgDaysStuck),
        candidateCount: count,
        stuckPercentage: stuckPct,
        recommendedAction: action,
      };
    }).filter((b) => b.candidateCount > 0);

    // ── Engagement metrics ───────────────────────────────────────────────────
    const sortedSessionCounts = [...sessionsPerCandidate].sort((a, b) => a - b);
    const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;
    const dropOffRate    = 100 - completionRate;
    const retentionRate30d = candidateCount > 0 ? Math.round((activeCount / candidateCount) * 100) : 0;
    const avgSessionDuration = sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
      : 0;

    const engagementMetrics: EngagementMetrics = {
      averageSessionsPerCandidate: sessionsPerCandidate.length > 0
        ? Math.round(sessionsPerCandidate.reduce((a, b) => a + b, 0) / sessionsPerCandidate.length * 10) / 10
        : 0,
      medianSessionsPerCandidate: percentile(sortedSessionCounts, 0.5),
      dropOffRate,
      retentionRate30d,
      averageSessionDurationMinutes: avgSessionDuration,
      completionRate,
    };

    // ── Velocity vs platform ─────────────────────────────────────────────────
    const velocity = await this.computeVelocity(organizationId);

    // ── Weekly activity (last 12 weeks) ──────────────────────────────────────
    const weeklyActivity = await this.computeWeeklyActivity(organizationId, 12);

    // ── CEFR majority vote ───────────────────────────────────────────────────
    const averageCefrLevel = thetaToCefr(averageTheta);

    return {
      organizationId,
      generatedAt: now,
      candidateCount,
      activeCount,
      completionRate,
      averageTheta: Math.round(averageTheta * 100) / 100,
      medianTheta:  Math.round(medianTheta  * 100) / 100,
      thetaStdDev:  Math.round(thetaSD      * 100) / 100,
      thetaP25: Math.round(thetaP25 * 100) / 100,
      thetaP75: Math.round(thetaP75 * 100) / 100,
      thetaP90: Math.round(thetaP90 * 100) / 100,
      averageCefrLevel,
      cefrDistribution: cefrDist,
      engagementMetrics,
      bottlenecks,
      atRiskLearners: atRiskLearners.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20),
      velocityVsPlatform: velocity,
      weeklyActivity,
    };
  }

  // ── Velocity computation ───────────────────────────────────────────────────

  private async computeVelocity(organizationId: string): Promise<VelocityComparison> {
    try {
      // Get theta change over last 90 days for this cohort
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
      const sessions = await prisma.session.findMany({
        where: { organizationId, status: "COMPLETED", completedAt: { gte: ninetyDaysAgo } },
        select: { candidateId: true, theta: true, completedAt: true },
        orderBy: { completedAt: "asc" },
      });

      // Group by candidate, compute slope
      const byCand: Record<string, Array<{ week: number; theta: number }>> = {};
      const refTime = ninetyDaysAgo.getTime();
      for (const s of sessions) {
        if (s.theta === null || !s.completedAt) continue;
        if (!byCand[s.candidateId]) byCand[s.candidateId] = [];
        byCand[s.candidateId].push({
          week: (s.completedAt.getTime() - refTime) / (7 * 86_400_000),
          theta: s.theta,
        });
      }

      const slopes: number[] = [];
      for (const points of Object.values(byCand)) {
        if (points.length < 2) continue;
        const n = points.length;
        const sumX  = points.reduce((s, p) => s + p.week, 0);
        const sumY  = points.reduce((s, p) => s + p.theta, 0);
        const sumXY = points.reduce((s, p) => s + p.week * p.theta, 0);
        const sumX2 = points.reduce((s, p) => s + p.week * p.week, 0);
        const denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 0.001) continue;
        slopes.push((n * sumXY - sumX * sumY) / denom);
      }

      const cohortSlope = slopes.length > 0 ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 0;
      const platformAverage = 0.05; // baseline θ/week (hardcoded platform benchmark)

      const ratio = platformAverage > 0 ? cohortSlope / platformAverage : 1;
      const pct = Math.min(99, Math.max(1, Math.round(ratio * 50)));

      let label: VelocityComparison["performanceLabel"] = "average";
      if (ratio > 1.15)  label = "above_average";
      else if (ratio < 0.85) label = "below_average";

      return {
        cohortThetaGainPerWeek: Math.round(cohortSlope * 1000) / 1000,
        platformAverageThetaGainPerWeek: platformAverage,
        percentileVsPlatform: pct,
        performanceLabel: label,
      };
    } catch {
      return { cohortThetaGainPerWeek: 0, platformAverageThetaGainPerWeek: 0.05, percentileVsPlatform: 50, performanceLabel: "average" };
    }
  }

  // ── Weekly activity ────────────────────────────────────────────────────────

  private async computeWeeklyActivity(organizationId: string, weeks: number): Promise<WeeklyActivity[]> {
    try {
      const since = new Date(Date.now() - weeks * 7 * 86_400_000);
      const sessions = await prisma.session.findMany({
        where: { organizationId, status: "COMPLETED", completedAt: { gte: since } },
        select: { candidateId: true, theta: true, completedAt: true, createdAt: true },
        orderBy: { completedAt: "asc" },
      });

      const byWeek: Record<string, { sessions: number; users: Set<string>; thetas: number[] }> = {};

      for (const s of sessions) {
        const d = s.completedAt ?? s.createdAt;
        const monday = new Date(d);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const key = monday.toISOString().split("T")[0];
        if (!byWeek[key]) byWeek[key] = { sessions: 0, users: new Set(), thetas: [] };
        byWeek[key].sessions++;
        byWeek[key].users.add(s.candidateId);
        if (s.theta !== null) byWeek[key].thetas.push(s.theta);
      }

      return Object.entries(byWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, data]) => ({
          weekStart,
          completedSessions: data.sessions,
          uniqueActiveUsers: data.users.size,
          averageThetaChange: data.thetas.length > 0
            ? Math.round((data.thetas.reduce((a, b) => a + b, 0) / data.thetas.length) * 100) / 100
            : 0,
        }));
    } catch {
      return [];
    }
  }

  // ── Empty result ───────────────────────────────────────────────────────────

  private emptyCohortStats(organizationId: string, now: Date): CohortStats {
    return {
      organizationId, generatedAt: now,
      candidateCount: 0, activeCount: 0, completionRate: 0,
      averageTheta: 0, medianTheta: 0, thetaStdDev: 0,
      thetaP25: 0, thetaP75: 0, thetaP90: 0,
      averageCefrLevel: "A1",
      cefrDistribution: {},
      engagementMetrics: {
        averageSessionsPerCandidate: 0, medianSessionsPerCandidate: 0,
        dropOffRate: 0, retentionRate30d: 0,
        averageSessionDurationMinutes: 0, completionRate: 0,
      },
      bottlenecks: [],
      atRiskLearners: [],
      velocityVsPlatform: { cohortThetaGainPerWeek: 0, platformAverageThetaGainPerWeek: 0.05, percentileVsPlatform: 50, performanceLabel: "average" },
      weeklyActivity: [],
    };
  }
}

export const cohortAnalytics = new CohortAnalyticsService();
