import { describe, it, expect, beforeEach, vi } from "vitest";
import { ColdStartAnalyzer } from "../cold-start-analyzer.js";
import { prisma } from "../../prisma.js";

vi.mock("../../prisma.js", () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("../exposure-store.js");

describe("ColdStartAnalyzer", () => {
  const testOrgId = "test-org";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeCoverageGaps", () => {
    it("should identify under-tested skill-CEFR-topic combinations", async () => {
      const mockItems = [
        {
          id: "item-1",
          skill: "READING",
          cefrLevel: "B1",
          tags: ["Grammar"],
        },
        {
          id: "item-2",
          skill: "READING",
          cefrLevel: "B1",
          tags: ["Vocabulary"],
        },
        {
          id: "item-3",
          skill: "LISTENING",
          cefrLevel: "A1",
          tags: ["Grammar"],
        },
      ];

      (prisma.item.findMany as any).mockResolvedValue(mockItems);

      const gaps = await ColdStartAnalyzer.computeCoverageGaps(testOrgId);

      expect(gaps.has("B1:READING:Grammar")).toBe(true);
      expect(gaps.get("B1:READING:Grammar")).toBe(1);
      expect(gaps.has("B1:READING:Vocabulary")).toBe(true);
      expect(gaps.get("B1:READING:Vocabulary")).toBe(1);
      expect(gaps.has("A1:LISTENING:Grammar")).toBe(true);
      expect(gaps.get("A1:LISTENING:Grammar")).toBe(1);
    });

    it("should handle items with missing tags", async () => {
      const mockItems = [
        {
          id: "item-1",
          skill: "READING",
          cefrLevel: "B1",
          tags: [],
        },
      ];

      (prisma.item.findMany as any).mockResolvedValue(mockItems);

      const gaps = await ColdStartAnalyzer.computeCoverageGaps(testOrgId);

      expect(gaps.has("B1:READING:uncategorized")).toBe(true);
      expect(gaps.get("B1:READING:uncategorized")).toBe(1);
    });

    it("should return empty map for organization with no pretest items", async () => {
      (prisma.item.findMany as any).mockResolvedValue([]);

      const gaps = await ColdStartAnalyzer.computeCoverageGaps(testOrgId);

      expect(gaps.size).toBe(0);
    });
  });

  describe("getHighestPriorityGaps", () => {
    it("should prioritize under-tested combinations", async () => {
      const mockPretestItems = [
        {
          id: "p1",
          skill: "READING",
          cefrLevel: "A1",
          tags: ["Grammar"],
        },
        {
          id: "p2",
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        },
        {
          id: "p3",
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        },
        {
          id: "p4",
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        },
        // More items for B2:LISTENING:Vocabulary
        ...Array.from({ length: 17 }, (_, i) => ({
          id: `p${5 + i}`,
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        })),
      ];

      const mockActiveItems = [
        {
          id: "a1",
          skill: "READING",
          cefrLevel: "A1",
          tags: ["Grammar"],
        },
        {
          id: "a2",
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        },
      ];

      (prisma.item.findMany as any)
        .mockResolvedValueOnce(mockPretestItems)
        .mockResolvedValueOnce(mockActiveItems);

      const gaps = await ColdStartAnalyzer.getHighestPriorityGaps(testOrgId, 5);

      expect(gaps.length).toBeGreaterThan(0);
      // A1:READING:Grammar should have highest priority (only 1 pretest item)
      expect(gaps[0].cohortKey).toBe("A1:READING:Grammar");
      expect(gaps[0].priority).toBeGreaterThan(0.9);
    });

    it("should calculate priority scores correctly", async () => {
      const mockPretestItems = [
        {
          id: "p1",
          skill: "READING",
          cefrLevel: "B1",
          tags: ["Grammar"],
        },
      ];

      (prisma.item.findMany as any)
        .mockResolvedValueOnce(mockPretestItems)
        .mockResolvedValueOnce([]);

      const gaps = await ColdStartAnalyzer.getHighestPriorityGaps(testOrgId, 10);

      expect(gaps.length).toBeGreaterThan(0);
      // Single item should have high priority
      const gap = gaps.find((g) => g.cohortKey === "B1:READING:Grammar");
      expect(gap?.priority).toBeGreaterThan(0.9);
    });
  });

  describe("computeMetrics", () => {
    it("should compute coverage metrics correctly", async () => {
      const mockPretestItems = [
        {
          id: "p1",
          skill: "READING",
          cefrLevel: "A1",
          tags: ["Grammar"],
        },
        {
          id: "p2",
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        },
        ...Array.from({ length: 25 }, (_, i) => ({
          id: `p${3 + i}`,
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        })),
      ];

      (prisma.item.findMany as any)
        .mockResolvedValueOnce(mockPretestItems) // computeCoverageGaps
        .mockResolvedValueOnce(mockPretestItems) // getHighestPriorityGaps pretest
        .mockResolvedValueOnce([]); // getHighestPriorityGaps active

      const metrics = await ColdStartAnalyzer.computeMetrics(testOrgId);

      expect(metrics.totalCohorts).toBeGreaterThan(0);
      expect(metrics.coveredCohorts).toBeGreaterThan(0);
      expect(metrics.coverageRate).toBeGreaterThan(0);
      expect(metrics.priorityGaps.length).toBeGreaterThan(0);
    });
  });

  describe("getPrioritizedPretestItems", () => {
    it("should return items sorted by priority", async () => {
      const mockPretestItems = [
        {
          id: "p1",
          skill: "READING",
          cefrLevel: "A1",
          tags: ["Grammar"],
        },
        {
          id: "p2",
          skill: "LISTENING",
          cefrLevel: "B2",
          tags: ["Vocabulary"],
        },
      ];

      (prisma.item.findMany as any)
        .mockResolvedValueOnce(mockPretestItems) // getHighestPriorityGaps pretest
        .mockResolvedValueOnce([]) // getHighestPriorityGaps active
        .mockResolvedValueOnce(mockPretestItems); // getPrioritizedPretestItems

      const items = await ColdStartAnalyzer.getPrioritizedPretestItems(testOrgId, 5);

      expect(items.length).toBeGreaterThan(0);
      // Items should be sorted by priority
      for (let i = 1; i < items.length; i++) {
        expect(items[i - 1].priority).toBeGreaterThanOrEqual(items[i].priority);
      }
    });

    it("should respect the limit parameter", async () => {
      const mockPretestItems = Array.from({ length: 50 }, (_, i) => ({
        id: `p${i}`,
        skill: "READING",
        cefrLevel: "B1",
        tags: ["Grammar"],
      }));

      (prisma.item.findMany as any)
        .mockResolvedValueOnce(mockPretestItems) // getHighestPriorityGaps pretest
        .mockResolvedValueOnce([]) // getHighestPriorityGaps active
        .mockResolvedValueOnce(mockPretestItems.slice(0, 10)); // getPrioritizedPretestItems

      const items = await ColdStartAnalyzer.getPrioritizedPretestItems(testOrgId, 10);

      expect(items.length).toBeLessThanOrEqual(10);
    });
  });
});
