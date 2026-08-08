/**
 * src/routes/items.ts
 *
 * Item bank routes extracted from server.ts for maintainability.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";

export function createItemsRouter(
  prisma: PrismaClient,
  checkRole: (roles: string[]) => express.RequestHandler,
  AssessmentService: any,
) {
  const router = express.Router();

  // GET /api/items/exposure-report
  router.get(
    "/exposure-report",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (_req, res) => {
      try {
        const items = await prisma.item.findMany({
          select: { id: true, skill: true, cefrLevel: true, discrimination: true, status: true },
        });
        const responses = await prisma.response.groupBy({
          by: ["itemId"],
          _count: { itemId: true },
        });
        const usageMap: Record<string, number> = {};
        for (const r of responses) usageMap[r.itemId] = r._count.itemId;

        const totalActive = items.filter((i) => i.status === "ACTIVE").length;
        const neverUsed = items.filter((i) => !usageMap[i.id]).length;
        const overExposureThreshold = 0.3;
        const totalResponses =
          Object.values(usageMap).reduce((a, b) => a + b, 0) || 1;
        const overExposed = items.filter(
          (i) => (usageMap[i.id] ?? 0) / totalResponses > overExposureThreshold,
        ).length;

        const sorted = [...items].sort(
          (a, b) => (a.discrimination ?? 0) - (b.discrimination ?? 0),
        );
        const chunkSize = Math.ceil(sorted.length / 3);
        const strata = [0, 1, 2].map((si) => {
          const chunk = sorted.slice(si * chunkSize, (si + 1) * chunkSize);
          const usedInChunk = chunk.filter((i) => usageMap[i.id]).length;
          const aVals = chunk.map((i) => i.discrimination ?? 0);
          return {
            stratumIndex: si + 1,
            label: `Stratum ${si + 1} (${["Low", "Mid", "High"][si]} α)`,
            totalItems: chunk.length,
            usedItems: usedInChunk,
            usageRate: chunk.length > 0 ? usedInChunk / chunk.length : 0,
            minA: Math.min(...aVals, 0),
            maxA: Math.max(...aVals, 0),
          };
        });

        const bySkill: Record<
          string,
          { total: number; active: number; pretest: number; retired: number }
        > = {};
        for (const i of items) {
          if (!bySkill[i.skill])
            bySkill[i.skill] = { total: 0, active: 0, pretest: 0, retired: 0 };
          bySkill[i.skill].total++;
          if (i.status === "ACTIVE") bySkill[i.skill].active++;
          if (i.status === "PRETEST") bySkill[i.skill].pretest++;
          if (i.status === "RETIRED") bySkill[i.skill].retired++;
        }

        const byCefrLevel: Record<string, { total: number; active: number }> = {};
        for (const i of items) {
          if (!byCefrLevel[i.cefrLevel])
            byCefrLevel[i.cefrLevel] = { total: 0, active: 0 };
          byCefrLevel[i.cefrLevel].total++;
          if (i.status === "ACTIVE") byCefrLevel[i.cefrLevel].active++;
        }

        res.json({
          totalActive,
          neverUsed,
          overExposed,
          overExposureThreshold,
          strata,
          bySkill,
          byCefrLevel,
        });
      } catch (err) {
        res.status(500).json({
          error: "Failed to compute exposure report",
          details: String(err),
        });
      }
    },
  );

  // GET /api/items
  router.get("/", async (_req, res) => {
    try {
      const items = await AssessmentService.getAllItems();
      res.json(items);
    } catch {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // POST /api/items
  router.post("/", async (req, res) => {
    try {
      const item = await AssessmentService.createItem(req.body);
      res.json(item);
    } catch {
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // PUT /api/items/:id
  router.put("/:id", async (req, res) => {
    try {
      const item = await AssessmentService.updateItem(req.params.id, req.body);
      res.json(item);
    } catch {
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // DELETE /api/items/:id
  router.delete("/:id", async (req, res) => {
    try {
      await AssessmentService.deleteItem(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  return router;
}
