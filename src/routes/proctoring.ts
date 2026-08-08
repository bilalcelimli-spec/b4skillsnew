/**
 * src/routes/proctoring.ts
 *
 * Proctoring routes extracted from server.ts for maintainability.
 * Accepts shared dependencies (prisma, checkRole) via factory function.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";

export function createProctoringRouter(
  prisma: PrismaClient,
  checkRole: (roles: string[]) => express.RequestHandler,
) {
  const router = express.Router();

  // POST /api/proctoring/event — log a proctoring event
  router.post("/event", async (req, res) => {
    try {
      const { sessionId, type, severity, metadata } = req.body;
      const severityMap: Record<string, number> = { LOW: 1, MEDIUM: 3, HIGH: 5 };
      const severityInt =
        typeof severity === "number"
          ? severity
          : (severityMap[String(severity).toUpperCase()] ?? 1);
      const event = await (prisma as any).proctoringEvent.create({
        data: { sessionId, type, severity: severityInt, metadata: metadata ?? null },
      });
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to log proctoring event" });
    }
  });

  // POST /api/proctoring/audit
  router.post("/audit", async (req, res) => {
    const { sessionId } = req.body;
    try {
      const { AnomalyDetectionService } = await import(
        "../lib/proctoring/anomaly-detection-service.js"
      );
      const trustScore = await AnomalyDetectionService.auditSession(sessionId);
      res.json({ trustScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to audit session" });
    }
  });

  // POST /api/proctoring/anticheat — ML-based anti-cheat analysis
  router.post("/anticheat", async (req, res) => {
    try {
      const telemetry = req.body;
      if (!telemetry?.sessionId)
        return res.status(400).json({ error: "sessionId required" });
      const { computeAnticheatReport } = await import(
        "../lib/proctoring/anticheat-ml.js"
      );
      const report = computeAnticheatReport(telemetry);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "Anti-cheat analysis failed", details: String(err) });
    }
  });

  // GET /api/proctoring/anticheat/:sessionId
  router.get(
    "/anticheat/:sessionId",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]),
    async (req, res) => {
      try {
        const { sessionId } = req.params;
        res.json({
          sessionId,
          message:
            "Submit telemetry via POST /api/proctoring/anticheat to compute report",
        });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    },
  );

  // GET /api/proctoring/report/:sessionId
  router.get("/report/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { ProctoringService } = await import(
        "../lib/proctoring/proctoring-service.js"
      );
      const report = await ProctoringService.getTrustReport(sessionId);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trust report" });
    }
  });

  return router;
}
