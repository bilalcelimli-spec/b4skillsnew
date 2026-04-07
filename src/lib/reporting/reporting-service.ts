import { prisma } from "../prisma";
import { CefrLevel, SessionStatus } from "@prisma/client";

/**
 * Advanced Reporting Service
 * Aggregates psychometric and operational data for institutional insights.
 */

export const ReportingService = {
  /**
   * Get comprehensive cohort analytics for an organization
   */
  async getCohortAnalytics(organizationId: string) {
    const [totalCandidates, completedSessions, sessions] = await Promise.all([
      prisma.user.count({ where: { organizationId, role: "CANDIDATE" } }),
      prisma.session.count({ where: { organizationId, status: SessionStatus.COMPLETED } }),
      prisma.session.findMany({
        where: { organizationId, status: SessionStatus.COMPLETED },
        include: { scoreReport: true },
        orderBy: { completedAt: "desc" }
      })
    ]);

    // Calculate CEFR Distribution
    const cefrDistribution: Record<string, number> = {
      "PRE_A1": 0, "A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0, "C2": 0
    };
    
    sessions.forEach(s => {
      if (s.scoreReport) {
        cefrDistribution[s.scoreReport.overallCefr]++;
      }
    });

    // Calculate Skill Averages
    const skillTotals = { reading: 0, listening: 0, speaking: 0, writing: 0, count: 0 };
    sessions.forEach(s => {
      if (s.scoreReport) {
        skillTotals.reading += s.scoreReport.readingScore || 0;
        skillTotals.listening += s.scoreReport.listeningScore || 0;
        skillTotals.speaking += s.scoreReport.speakingScore || 0;
        skillTotals.writing += s.scoreReport.writingScore || 0;
        skillTotals.count++;
      }
    });

    const skillPerformance = {
      Reading: skillTotals.count ? Math.round(skillTotals.reading / skillTotals.count) : 0,
      Listening: skillTotals.count ? Math.round(skillTotals.listening / skillTotals.count) : 0,
      Speaking: skillTotals.count ? Math.round(skillTotals.speaking / skillTotals.count) : 0,
      Writing: skillTotals.count ? Math.round(skillTotals.writing / skillTotals.count) : 0
    };

    // Time Series Data (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStats = await prisma.session.groupBy({
      by: ['completedAt'],
      where: {
        organizationId,
        status: SessionStatus.COMPLETED,
        completedAt: { gte: thirtyDaysAgo }
      },
      _avg: { theta: true },
      _count: { id: true }
    });

    const timeSeriesData = dailyStats.map(stat => ({
      date: stat.completedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgScore: Math.round(((stat._avg.theta || 0) + 3) * 16.6),
      count: stat._count.id
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalCandidates,
      completedSessions,
      averageAbility: sessions.length ? sessions.reduce((acc, s) => acc + s.theta, 0) / sessions.length : 0,
      cefrDistribution,
      skillPerformance,
      timeSeriesData
    };
  }
};
