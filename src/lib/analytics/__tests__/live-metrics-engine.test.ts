import { describe, it, expect, beforeEach, vi } from "vitest";
import { LiveMetricsEngine } from "../live-metrics-engine.js";
import { prisma } from "../../prisma.js";

vi.mock("../../prisma.js", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    item: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    response: {
      count: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    retirementAuditLog: {
      count: vi.fn(),
    },
  },
}));

describe("LiveMetricsEngine", () => {
  const testOrgId = "test-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeSnapshot", () => {
    it("should return a complete analytics snapshot for an organization", async () => {
      // Mock Prisma responses
      const mockSessions = [
        {
          id: "session-1",
          theta: 0.5,
          cefrLevel: "B1",
          responsesCount: 15,
          metadata: {
            skillProfiles: {
              READING: 0.6,
              LISTENING: 0.4,
              WRITING: 0.5,
              SPEAKING: 0.3,
              GRAMMAR: 0.7,
              VOCABULARY: 0.55,
            },
            mirtAbilityVector: [0.5, 0.4, 0.45, 0.35, 0.6, 0.5],
          },
        },
        {
          id: "session-2",
          theta: 0.8,
          cefrLevel: "B2",
          responsesCount: 20,
          metadata: {
            skillProfiles: {
              READING: 0.85,
              LISTENING: 0.75,
              WRITING: 0.8,
              SPEAKING: 0.7,
              GRAMMAR: 0.9,
              VOCABULARY: 0.8,
            },
            mirtAbilityVector: [0.8, 0.75, 0.78, 0.7, 0.85, 0.8],
          },
        },
      ];

      const _now = new Date();
      const mockItems = [
        {
          id: "item-1",
          cefrLevel: "B1",
          status: "ACTIVE",
          difficulty: 0.5,
          discrimination: 0.8,
          createdAt: _now,
          updatedAt: _now,
        },
        {
          id: "item-2",
          cefrLevel: "B1",
          status: "PRETEST",
          difficulty: 0.4,
          discrimination: 0.6,
          createdAt: _now,
          updatedAt: _now,
        },
        {
          id: "item-3",
          cefrLevel: "B2",
          status: "RETIRED",
          difficulty: 0.7,
          discrimination: 0.2,
          createdAt: _now,
          updatedAt: _now,
        },
      ];

      const mockResponses = [
        { count: 40, itemId: "pretest-1" },
        { count: 55, itemId: "pretest-2" },
      ];

      const mockAuditLogs = {
        flagged: 3,
        autoRetired: 1,
        pending: 2,
        total: 5,
      };

      (prisma.session.findMany as any).mockResolvedValue(mockSessions);
      // item.findMany is now only used for pretest items + recentlyPromoted
      (prisma.item.findMany as any).mockResolvedValue(
        mockItems.filter((i) => i.status === "PRETEST")
      );
      // item.groupBy drives computeItemDifficultyDistribution
      (prisma.item.groupBy as any).mockResolvedValue([
        { cefrLevel: "B1", status: "ACTIVE",   _count: { id: 1 }, _avg: { difficulty: 0.5, discrimination: 0.8 } },
        { cefrLevel: "B1", status: "PRETEST",  _count: { id: 1 }, _avg: { difficulty: 0.4, discrimination: 0.6 } },
        { cefrLevel: "B2", status: "RETIRED",  _count: { id: 1 }, _avg: { difficulty: 0.7, discrimination: 0.2 } },
      ]);
      // response.groupBy drives pretest pipeline response counts
      (prisma.response.groupBy as any).mockResolvedValue([
        { itemId: "item-2", _count: { id: 35 } },
      ]);
      (prisma.item.count as any).mockResolvedValue(0);
      (prisma.response.count as any).mockResolvedValue(0);
      (prisma.retirementAuditLog.count as any).mockResolvedValue(0);

      const snapshot = await LiveMetricsEngine.computeSnapshot(testOrgId);

      // Verify snapshot structure
      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(snapshot.skills)).toBe(true);
      expect(Array.isArray(snapshot.itemDifficulty)).toBe(true);
      expect(snapshot.sessions).toBeDefined();
      expect(snapshot.pretestPipeline).toBeDefined();
      expect(snapshot.retirementStatus).toBeDefined();
      expect(snapshot.mirt).toBeDefined();
    });

    it("should handle empty organization data gracefully", async () => {
      (prisma.session.findMany as any).mockResolvedValue([]);
      (prisma.item.findMany as any).mockResolvedValue([]);
      (prisma.item.groupBy as any).mockResolvedValue([]);
      (prisma.response.groupBy as any).mockResolvedValue([]);
      (prisma.item.count as any).mockResolvedValue(0);
      (prisma.response.count as any).mockResolvedValue(0);
      (prisma.retirementAuditLog.count as any).mockResolvedValue(0);

      const snapshot = await LiveMetricsEngine.computeSnapshot(testOrgId);

      expect(snapshot.skills.length).toBe(6);
      expect(snapshot.skills.every((s) => s.candidates === 0)).toBe(true);
      expect(snapshot.sessions.totalSessions).toBe(0);
      expect(snapshot.pretestPipeline.totalPretestItems).toBe(0);
      expect(snapshot.retirementStatus.totalRetired).toBe(0);
    });
  });

  describe("computeSkillMetrics", () => {
    it("should calculate per-skill ability distribution with CEFR breakdown", async () => {
      const mockSessions = [
        {
          id: "s1",
          theta: 0.5,
          cefrLevel: "B1",
          responsesCount: 10,
          metadata: {
            skillProfiles: {
              READING: 0.6,
              LISTENING: 0.4,
              WRITING: 0.5,
              SPEAKING: 0.3,
              GRAMMAR: 0.7,
              VOCABULARY: 0.55,
            },
          },
        },
        {
          id: "s2",
          theta: 0.7,
          cefrLevel: "B1",
          responsesCount: 15,
          metadata: {
            skillProfiles: {
              READING: 0.8,
              LISTENING: 0.6,
              WRITING: 0.7,
              SPEAKING: 0.5,
              GRAMMAR: 0.9,
              VOCABULARY: 0.75,
            },
          },
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);

      // Call the private method via direct instantiation (testing pattern)
      const skills = await (LiveMetricsEngine as any).computeSkillMetrics(testOrgId);

      expect(skills).toHaveLength(6);
      expect(skills[0].skill).toBe("READING");
      expect(skills[0].candidates).toBe(2);
      expect(skills[0].avgTheta).toBeGreaterThan(0);
      expect(skills[0].stdTheta).toBeGreaterThanOrEqual(0);
      expect(skills[0].avgResponses).toBeGreaterThan(0);
    });

    it("should compute standard deviation correctly for skill metrics", async () => {
      const mockSessions = [
        {
          id: "s1",
          theta: 0.0,
          cefrLevel: "A1",
          responsesCount: 5,
          metadata: {
            skillProfiles: {
              READING: 0.0,
              LISTENING: 0.0,
              WRITING: 0.0,
              SPEAKING: 0.0,
              GRAMMAR: 0.0,
              VOCABULARY: 0.0,
            },
          },
        },
        {
          id: "s2",
          theta: 2.0,
          cefrLevel: "C2",
          responsesCount: 20,
          metadata: {
            skillProfiles: {
              READING: 2.0,
              LISTENING: 2.0,
              WRITING: 2.0,
              SPEAKING: 2.0,
              GRAMMAR: 2.0,
              VOCABULARY: 2.0,
            },
          },
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);

      const skills = await (LiveMetricsEngine as any).computeSkillMetrics(testOrgId);

      // Expected: mean = 1.0, variance = 1.0, stdev = 1.0 for each skill
      expect(skills[0].avgTheta).toBe(1.0);
      expect(skills[0].stdTheta).toBeCloseTo(1.0, 5);
    });
  });

  describe("computeItemDifficultyDistribution", () => {
    it("should calculate item difficulty distribution by CEFR", async () => {
      // Sprint 2 refactor: uses item.groupBy({ by: ['cefrLevel', 'status'] })
      // instead of 7 individual findMany calls.
      (prisma.item.groupBy as any).mockResolvedValue([
        { cefrLevel: "B1", status: "ACTIVE",  _count: { id: 1 }, _avg: { difficulty: 0.5, discrimination: 0.8 } },
        { cefrLevel: "B1", status: "PRETEST", _count: { id: 1 }, _avg: { difficulty: 0.4, discrimination: 0.6 } },
        { cefrLevel: "B1", status: "RETIRED", _count: { id: 1 }, _avg: { difficulty: 0.3, discrimination: 0.4 } },
      ]);

      const distribution = await (LiveMetricsEngine as any).computeItemDifficultyDistribution(testOrgId);

      expect(distribution).toBeDefined();
      const b1Dist = distribution.find((d: any) => d.cefr === "B1");

      expect(b1Dist.count).toBe(3);        // 1 ACTIVE + 1 PRETEST + 1 RETIRED
      expect(b1Dist.retiredCount).toBe(1);
      expect(b1Dist.pretestCount).toBe(1);
      expect(b1Dist.avgDifficulty).toBeCloseTo(0.5, 5); // avg of ACTIVE only
    });

    it("should handle CEFR levels with no items", async () => {
      // Only A1 returned → distribution has exactly 1 entry
      (prisma.item.groupBy as any).mockResolvedValue([
        { cefrLevel: "A1", status: "ACTIVE", _count: { id: 1 }, _avg: { difficulty: 0.2, discrimination: 0.7 } },
      ]);

      const distribution = await (LiveMetricsEngine as any).computeItemDifficultyDistribution(testOrgId);

      // Should only include CEFR levels with items
      expect(distribution.some((d: any) => d.cefr === "A1")).toBe(true);
      expect(distribution.length).toBeGreaterThan(0);
      expect(distribution.length).toBeLessThanOrEqual(7); // max 7 CEFR levels
    });
  });

  describe("computeSessionMetrics", () => {
    it("should calculate session-level metrics correctly", async () => {
      const now = Date.now();
      const oneHourAgo = new Date(now - 60 * 60 * 1000);

      const mockSessions = [
        {
          id: "s1",
          theta: 0.5,
          responsesCount: 12,
          createdAt: oneHourAgo,
          status: "COMPLETED",
        },
        {
          id: "s2",
          theta: 0.8,
          responsesCount: 15,
          createdAt: oneHourAgo,
          status: "COMPLETED",
        },
        {
          id: "s3",
          theta: 0.3,
          responsesCount: 8,
          createdAt: new Date(now - 5 * 60 * 1000),
          status: "IN_PROGRESS",
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);

      const metrics = await (LiveMetricsEngine as any).computeSessionMetrics(testOrgId);

      expect(metrics.totalSessions).toBe(3);
      expect(metrics.completionRate).toBeCloseTo(2 / 3, 5);
      expect(metrics.avgItemsToCompletion).toBeCloseTo((12 + 15 + 8) / 3, 5);
      expect(metrics.avgTheta).toBeCloseTo((0.5 + 0.8 + 0.3) / 3, 5);
      expect(metrics.avgDuration).toBeGreaterThan(0); // Should be around 60 minutes
    });

    it("should return zeros for organization with no sessions", async () => {
      (prisma.session.findMany as any).mockResolvedValue([]);

      const metrics = await (LiveMetricsEngine as any).computeSessionMetrics(testOrgId);

      expect(metrics.totalSessions).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.avgItemsToCompletion).toBe(0);
      expect(metrics.avgDuration).toBe(0);
      expect(metrics.avgTheta).toBe(0);
    });
  });

  describe("computePretestPipelineMetrics", () => {
    it("should identify items ready for calibration and promotion", async () => {
      const now = new Date();
      const mockPretestItems = [
        { id: "pretest-1", createdAt: now, updatedAt: now },
        { id: "pretest-2", createdAt: now, updatedAt: now },
        { id: "pretest-3", createdAt: now, updatedAt: now },
      ];

      // Sprint 2 refactor: N+N response.count() loops → 1 response.groupBy() call.
      // item.findMany is called twice: pretest items, then recentlyPromoted.
      (prisma.item.findMany as any)
        .mockResolvedValueOnce(mockPretestItems as any) // pretest items
        .mockResolvedValueOnce([]);                     // recentlyPromoted → avgPromotionTime = 0
      (prisma.response.groupBy as any).mockResolvedValue([
        { itemId: "pretest-1", _count: { id: 25 } }, // < 30 → not ready for cal
        { itemId: "pretest-2", _count: { id: 45 } }, // >= 30 → ready for cal; < 50 → not prom
        { itemId: "pretest-3", _count: { id: 55 } }, // >= 30 → ready for cal; >= 50 → ready prom
      ]);
      (prisma.item.count as any).mockResolvedValue(0); // promotedThisWeek

      const metrics = await (LiveMetricsEngine as any).computePretestPipelineMetrics(testOrgId);

      expect(metrics.totalPretestItems).toBe(3);
      expect(metrics.readyForCalibration).toBe(2); // pretest-2 and pretest-3
      expect(metrics.readyForPromotion).toBe(1);   // only pretest-3
      expect(metrics.promotedThisWeek).toBe(0);
    });
  });

  describe("computeRetirementMetrics", () => {
    it("should count retired items and recent retirement actions", async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      (prisma.retirementAuditLog.count as any)
        .mockResolvedValueOnce(5) // flagged this week
        .mockResolvedValueOnce(2) // auto-retired this week
        .mockResolvedValueOnce(3); // pending approval
      (prisma.item.count as any).mockResolvedValue(25); // total retired

      const metrics = await (LiveMetricsEngine as any).computeRetirementMetrics(testOrgId);

      expect(metrics.flaggedThisWeek).toBe(5);
      expect(metrics.autoRetiredThisWeek).toBe(2);
      expect(metrics.pendingApproval).toBe(3);
      expect(metrics.totalRetired).toBe(25);
    });
  });

  describe("computeMirtMetrics", () => {
    it("should calculate mean and standard deviation for each MIRT dimension", async () => {
      const mockSessions = [
        {
          id: "s1",
          metadata: {
            mirtAbilityVector: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
          },
        },
        {
          id: "s2",
          metadata: {
            mirtAbilityVector: [2.0, 2.0, 2.0, 2.0, 2.0, 2.0],
          },
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);

      const metrics = await (LiveMetricsEngine as any).computeMirtMetrics(testOrgId);

      // Expected: mean = 1.0, stdev = 1.0 for each dimension
      expect(metrics.dim0Avg).toBeCloseTo(1.0, 5);
      expect(metrics.dim0Std).toBeCloseTo(1.0, 5);
      expect(metrics.dim1Avg).toBeCloseTo(1.0, 5);
      expect(metrics.dim2Avg).toBeCloseTo(1.0, 5);
      expect(metrics.dim3Avg).toBeCloseTo(1.0, 5);
      expect(metrics.dim4Avg).toBeCloseTo(1.0, 5);
      expect(metrics.dim5Avg).toBeCloseTo(1.0, 5);
    });

    it("should return zeros for organization with no MIRT data", async () => {
      const mockSessions = [
        {
          id: "s1",
          metadata: {},
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);

      const metrics = await (LiveMetricsEngine as any).computeMirtMetrics(testOrgId);

      expect(metrics.dim0Avg).toBe(0);
      expect(metrics.dim1Avg).toBe(0);
      expect(metrics.dim0Std).toBe(0);
      expect(metrics.dim1Std).toBe(0);
    });

    it("should handle mixed MIRT and non-MIRT sessions", async () => {
      const mockSessions = [
        {
          id: "s1",
          metadata: {
            mirtAbilityVector: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
          },
        },
        {
          id: "s2",
          metadata: {}, // No MIRT vector
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);

      const metrics = await (LiveMetricsEngine as any).computeMirtMetrics(testOrgId);

      // Sessions without MIRT vector default to [0, 0, 0, 0, 0, 0]
      // So average = (1.0 + 0) / 2 = 0.5
      expect(metrics.dim0Avg).toBeCloseTo(0.5, 5);
    });
  });

  describe("integration test", () => {
    it("should parallelize all metric computations and return consistent snapshot", async () => {
      const mockSessions = [
        {
          id: "s1",
          theta: 0.5,
          cefrLevel: "B1",
          responsesCount: 10,
          createdAt: new Date(),
          status: "COMPLETED",
          metadata: {
            skillProfiles: {
              READING: 0.6,
              LISTENING: 0.4,
              WRITING: 0.5,
              SPEAKING: 0.3,
              GRAMMAR: 0.7,
              VOCABULARY: 0.55,
            },
            mirtAbilityVector: [0.5, 0.4, 0.45, 0.35, 0.6, 0.5],
          },
        },
      ];

      const _integNow = new Date();
      const mockItems = [
        {
          id: "item-1",
          cefrLevel: "B1",
          status: "ACTIVE",
          difficulty: 0.5,
          discrimination: 0.8,
          createdAt: _integNow,
          updatedAt: _integNow,
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);
      // item.findMany: only called for pretest items + recentlyPromoted (no pretest items)
      (prisma.item.findMany as any).mockResolvedValue([]);
      // item.groupBy: drives computeItemDifficultyDistribution
      (prisma.item.groupBy as any).mockResolvedValue([
        { cefrLevel: "B1", status: "ACTIVE", _count: { id: 1 }, _avg: { difficulty: 0.5, discrimination: 0.8 } },
      ]);
      // response.groupBy: pretest pipeline (no pretest items → not called, but mock available)
      (prisma.response.groupBy as any).mockResolvedValue([]);
      (prisma.item.count as any).mockResolvedValue(1);
      (prisma.response.count as any).mockResolvedValue(0);
      (prisma.retirementAuditLog.count as any).mockResolvedValue(0);

      const startTime = Date.now();
      const snapshot = await LiveMetricsEngine.computeSnapshot(testOrgId);
      const duration = Date.now() - startTime;

      // All components should be present
      expect(snapshot.skills.length).toBe(6);
      expect(snapshot.itemDifficulty.length).toBeGreaterThan(0);
      expect(snapshot.sessions).toBeDefined();
      expect(snapshot.pretestPipeline).toBeDefined();
      expect(snapshot.retirementStatus).toBeDefined();
      expect(snapshot.mirt).toBeDefined();

      // Timestamp should be reasonable
      const timeDiff = Math.abs(Date.now() - snapshot.timestamp.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second

      // Performance expectation: should complete in < 5 seconds
      // (This is a reasonable SLA for a comprehensive analytics query)
      expect(duration).toBeLessThan(5000);
    });
  });
});
