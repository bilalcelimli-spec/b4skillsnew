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
    },
    response: {
      count: vi.fn(),
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

      const mockItems = [
        {
          id: "item-1",
          cefrLevel: "B1",
          status: "ACTIVE",
          difficulty: 0.5,
          discrimination: 0.8,
        },
        {
          id: "item-2",
          cefrLevel: "B1",
          status: "PRETEST",
          difficulty: 0.4,
          discrimination: 0.6,
        },
        {
          id: "item-3",
          cefrLevel: "B2",
          status: "RETIRED",
          difficulty: 0.7,
          discrimination: 0.2,
        },
      ];

      const mockPretestItems = [
        { id: "pretest-1", createdAt: new Date() },
        { id: "pretest-2", createdAt: new Date() },
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
      (prisma.item.findMany as any).mockResolvedValue(mockItems);
      (prisma.item.count as any).mockResolvedValue(mockItems.length);
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
      // Mock returns items for B1 when queried
      const b1Items = [
        {
          id: "item-1",
          cefrLevel: "B1",
          status: "ACTIVE",
          difficulty: 0.5,
          discrimination: 0.8,
        },
        {
          id: "item-2",
          cefrLevel: "B1",
          status: "PRETEST",
          difficulty: 0.4,
          discrimination: 0.6,
        },
        {
          id: "item-3",
          cefrLevel: "B1",
          status: "RETIRED",
          difficulty: 0.3,
          discrimination: 0.4,
        },
      ];

      // Mock returns empty for other CEFRs
      (prisma.item.findMany as any).mockImplementation((args: any) => {
        if (args.where?.cefrLevel === "B1") {
          return Promise.resolve(b1Items);
        }
        return Promise.resolve([]);
      });

      const distribution = await (LiveMetricsEngine as any).computeItemDifficultyDistribution(testOrgId);

      expect(distribution).toBeDefined();
      const b1Dist = distribution.find((d: any) => d.cefr === "B1");

      expect(b1Dist.count).toBe(3);
      expect(b1Dist.retiredCount).toBe(1);
      expect(b1Dist.pretestCount).toBe(1);
      expect(b1Dist.avgDifficulty).toBeCloseTo(0.5, 5); // avg of active only
    });

    it("should handle CEFR levels with no items", async () => {
      const mockItems = [
        {
          id: "item-1",
          cefrLevel: "A1",
          status: "ACTIVE",
          difficulty: 0.2,
          discrimination: 0.7,
        },
      ];

      (prisma.item.findMany as any).mockResolvedValue(mockItems as any);

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
      const mockPretestItems = [
        { id: "pretest-1", createdAt: new Date() },
        { id: "pretest-2", createdAt: new Date() },
        { id: "pretest-3", createdAt: new Date() },
      ];

      (prisma.item.findMany as any).mockResolvedValue(mockPretestItems as any);
      (prisma.response.count as any)
        // readyForCalibration checks (first loop)
        .mockResolvedValueOnce(25) // pretest-1: < 30, not ready
        .mockResolvedValueOnce(45) // pretest-2: >= 30, ready
        .mockResolvedValueOnce(55) // pretest-3: >= 30, ready
        // readyForPromotion checks (second loop)
        .mockResolvedValueOnce(25) // pretest-1: < 50, not ready
        .mockResolvedValueOnce(45) // pretest-2: < 50, not ready
        .mockResolvedValueOnce(55); // pretest-3: >= 50, ready
      (prisma.item.count as any).mockResolvedValue(0); // promotedThisWeek

      const metrics = await (LiveMetricsEngine as any).computePretestPipelineMetrics(testOrgId);

      expect(metrics.totalPretestItems).toBe(3);
      expect(metrics.readyForCalibration).toBe(2); // 45 >= 30 and 55 >= 30
      expect(metrics.readyForPromotion).toBe(1); // only 55 >= 50
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

      const mockItems = [
        {
          id: "item-1",
          cefrLevel: "B1",
          status: "ACTIVE",
          difficulty: 0.5,
          discrimination: 0.8,
        },
      ];

      (prisma.session.findMany as any).mockResolvedValue(mockSessions as any);
      (prisma.item.findMany as any).mockResolvedValue(mockItems as any);
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
