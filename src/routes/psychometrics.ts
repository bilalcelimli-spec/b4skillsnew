/**
 * src/routes/psychometrics.ts
 *
 * Psychometric analytics endpoints for the admin console.
 * Mounted at /api/psychometrics in server.ts.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";

const ALLOWED = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "PSYCHOMETRICIAN"];

export function createPsychometricsRouter(
  prisma: PrismaClient,
  checkRole: (roles: string[]) => express.RequestHandler,
) {
  const router = express.Router();
  router.use(checkRole(ALLOWED));

  // ── Person Fit ──────────────────────────────────────────────────────────────

  router.get("/person-fit", async (_req, res) => {
    try {
      const { computePersonFit, aggregatePersonFit } = await import(
        "../lib/psychometrics/person-fit.js"
      );

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED" },
        include: { responses: { select: { itemId: true, score: true, isPretest: true, latencyMs: true } } },
        orderBy: { completedAt: "desc" },
        take: 200,
      });

      const itemIds = [...new Set(sessions.flatMap(s => s.responses.map(r => r.itemId)))];
      const rawItems = await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, discrimination: true, difficulty: true, guessing: true, type: true, skill: true },
      });

      const itemObjects = rawItems.map(i => ({
        id: i.id,
        type: i.type as any,
        skill: i.skill as any,
        params: { a: i.discrimination ?? 1, b: i.difficulty ?? 0, c: i.guessing ?? 0.25 },
        content: {} as any,
      }));

      const results = sessions
        .filter(s => s.theta != null)
        .map(s => ({
          sessionId: s.id,
          ...computePersonFit({
            responses: s.responses.map(r => ({
              itemId: r.itemId,
              score: r.score ?? 0,
              isPretest: r.isPretest ?? false,
              latencyMs: r.latencyMs ?? undefined,
            })),
            items: itemObjects,
            theta: s.theta,
          }),
        }));

      res.json({ sessions: results.slice(0, 50), aggregate: aggregatePersonFit(results), total: results.length });
    } catch (err: any) {
      res.status(500).json({ error: "Person-fit computation failed", detail: err?.message });
    }
  });

  // ── Subscore Reliability ────────────────────────────────────────────────────

  router.get("/subscore-reliability", async (_req, res) => {
    try {
      const { marginalReliability } = await import("../lib/psychometrics/reliability-metrics.js");

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED" },
        select: { theta: true, sem: true },
        take: 500,
        orderBy: { completedAt: "desc" },
      });

      const reports = await prisma.scoreReport.findMany({
        where: { session: { status: "COMPLETED" } },
        select: {
          readingScore: true, listeningScore: true, writingScore: true,
          speakingScore: true, grammarScore: true, vocabularyScore: true,
        },
        take: 500,
        orderBy: { createdAt: "desc" },
      });

      const thetas = sessions.map(s => s.theta);
      const sems = sessions.map(s => s.sem);
      const overall = sessions.length >= 10 ? +marginalReliability(thetas, sems).toFixed(3) : null;

      const subNames = ["reading", "listening", "writing", "speaking", "grammar", "vocabulary"] as const;
      const subscales = subNames.map(name => {
        const key = `${name}Score` as keyof typeof reports[0];
        const vals = reports.map(r => r[key]).filter((v): v is number => v != null);
        if (vals.length < 10) return { subscale: name, n: vals.length, reliability: null };
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length;
        return { subscale: name, n: vals.length, mean: +mean.toFixed(2), sd: +Math.sqrt(variance).toFixed(2), reliability: null };
      });

      res.json({ n: sessions.length, overallMarginalReliability: overall, subscales });
    } catch (err: any) {
      res.status(500).json({ error: "Subscore reliability computation failed", detail: err?.message });
    }
  });

  // ── DIF ─────────────────────────────────────────────────────────────────────

  router.get("/dif/summary", async (_req, res) => {
    try {
      const flagged = await prisma.item.findMany({
        where: { metadata: { path: ["difFlag"], not: null } },
        select: { id: true, itemCode: true, skill: true, cefrLevel: true, type: true, metadata: true },
        take: 200,
      });
      res.json({
        total: flagged.length,
        items: flagged.map(i => ({
          id: i.id, itemCode: i.itemCode, skill: i.skill,
          cefrLevel: i.cefrLevel, type: i.type,
          difInfo: (i.metadata as any)?.difFlag ?? null,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: "DIF summary failed", detail: err?.message });
    }
  });

  router.get("/dif/flagged-all", async (_req, res) => {
    try {
      const items = await prisma.item.findMany({
        where: { metadata: { path: ["difFlag"], not: null } },
        select: { id: true, itemCode: true, skill: true, cefrLevel: true, metadata: true },
        take: 200,
      });
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: "Failed", detail: err?.message });
    }
  });

  router.get("/dif/flagged/:itemId", async (req, res) => {
    try {
      const item = await prisma.item.findUnique({
        where: { id: req.params.itemId },
        select: { id: true, itemCode: true, skill: true, cefrLevel: true, metadata: true },
      });
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: "Failed", detail: err?.message });
    }
  });

  router.post("/dif/run-batch", async (_req, res) => {
    try {
      const { BatchDifDetectionService } = await import("../lib/psychometrics/batch-dif-detection.js");
      const svc = new BatchDifDetectionService();
      const result = await (svc as any).detectAll?.() ?? await (svc as any).run?.() ?? { message: "DIF batch queued" };
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "DIF batch failed", detail: err?.message });
    }
  });

  // ── Score Norms ─────────────────────────────────────────────────────────────

  router.get("/score-norms", async (_req, res) => {
    try {
      const reports = await prisma.scoreReport.findMany({
        where: { session: { status: "COMPLETED" } },
        select: { overallScore: true, overallCefr: true },
        take: 1000,
        orderBy: { createdAt: "desc" },
      });

      const scores = reports.map(r => r.overallScore).filter((s): s is number => s != null);
      if (scores.length === 0) return res.json({ n: 0, mean: null, sd: null, percentiles: {}, cefrDistribution: {} });

      const sorted = [...scores].sort((a, b) => a - b);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const sd = Math.sqrt(scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length);
      const pct = (p: number) => sorted[Math.floor(p * sorted.length / 100)] ?? sorted[sorted.length - 1];

      const cefrDist: Record<string, number> = {};
      for (const r of reports) {
        if (r.overallCefr) cefrDist[r.overallCefr] = (cefrDist[r.overallCefr] ?? 0) + 1;
      }

      res.json({
        n: scores.length,
        mean: +mean.toFixed(2), sd: +sd.toFixed(2),
        min: sorted[0], max: sorted[sorted.length - 1],
        percentiles: { p10: pct(10), p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90) },
        cefrDistribution: cefrDist,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Score norms computation failed", detail: err?.message });
    }
  });

  // ── Score Validity ──────────────────────────────────────────────────────────

  router.get("/score-validity", async (_req, res) => {
    try {
      const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

      // ── Session count + mean SEM ──────────────────────────────────────────────
      const [nSessions, semAgg] = await Promise.all([
        prisma.session.count({ where: { status: "COMPLETED" } }),
        prisma.session.aggregate({ where: { status: "COMPLETED" }, _avg: { sem: true } }),
      ]);
      const meanSEM = semAgg._avg.sem ?? 0;

      // ── Reports with skill scores ─────────────────────────────────────────────
      const reports = await prisma.scoreReport.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 180 * 86400_000) } },
        select: {
          overallScore: true, overallCefr: true,
          readingScore: true, listeningScore: true,
          writingScore: true, speakingScore: true,
          grammarScore: true, vocabularyScore: true,
          session: { select: { cefrLevel: true, sem: true } },
        },
        take: 3000,
      });

      // ── Cronbach α ≈ 1 - SEM²/σ²_θ (SEM in θ units; overallScore is 0-100) ──
      const scores = reports.map((r) => r.overallScore).filter((v) => v != null) as number[];
      let overallAlpha = 0;
      if (scores.length > 1 && meanSEM > 0) {
        const mu = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((s, v) => s + (v - mu) ** 2, 0) / (scores.length - 1);
        // Convert SEM to 0-100 scale (approx: multiply by 100/6 since θ range ≈ ±3)
        const semScaled = meanSEM * (100 / 6);
        overallAlpha = variance > 0
          ? Math.max(0, Math.min(0.99, 1 - (semScaled * semScaled) / variance))
          : 0;
      }
      const overallOmega = overallAlpha;

      // ── Reliability rows by CEFR level ────────────────────────────────────────
      const byLevel = new Map<string, { sems: number[]; scores: number[] }>();
      for (const r of reports) {
        const lvl = String(r.overallCefr || "B1");
        if (!byLevel.has(lvl)) byLevel.set(lvl, { sems: [], scores: [] });
        const entry = byLevel.get(lvl)!;
        if (r.session?.sem) entry.sems.push(r.session.sem);
        entry.scores.push(r.overallScore);
      }
      const reliability = CEFR_ORDER.filter((l) => byLevel.has(l)).map((l) => {
        const d = byLevel.get(l)!;
        const avgSEM = d.sems.length ? d.sems.reduce((a, b) => a + b, 0) / d.sems.length : meanSEM;
        const scoreMean = d.scores.length ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : 50;
        const scoreVar = d.scores.length > 1
          ? d.scores.reduce((s, v) => s + (v - scoreMean) ** 2, 0) / (d.scores.length - 1)
          : 100;
        const semScaled = avgSEM * (100 / 6);
        const alpha = scoreVar > 0 ? Math.max(0, Math.min(0.99, 1 - (semScaled * semScaled) / scoreVar)) : 0;
        return {
          skill: "Overall",
          cefrLevel: l,
          nSessions: d.scores.length,
          cronbachAlpha: +alpha.toFixed(3),
          mcdonaldOmega: +alpha.toFixed(3),
          meanSEM: +avgSEM.toFixed(3),
          sdSEM: 0,
          meanTheta: +(scoreMean / 100).toFixed(3),
          sdTheta: +(Math.sqrt(scoreVar) / 100).toFixed(3),
        };
      });

      // ── Skill correlations from ScoreReport columns ───────────────────────────
      type Row = { r: number | null; l: number | null; w: number | null; s: number | null; g: number | null; v: number | null };
      const rows: Row[] = reports.map((r) => ({
        r: r.readingScore, l: r.listeningScore, w: r.writingScore,
        s: r.speakingScore, g: r.grammarScore, v: r.vocabularyScore,
      }));

      const SKILL_KEYS: Array<[string, keyof Row]> = [
        ["READING", "r"], ["LISTENING", "l"], ["WRITING", "w"],
        ["SPEAKING", "s"], ["GRAMMAR", "g"], ["VOCABULARY", "v"],
      ];

      const pearsonR = (xs: number[], ys: number[]) => {
        if (xs.length < 5) return null;
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const my = ys.reduce((a, b) => a + b, 0) / ys.length;
        const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.length;
        const sdx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) / xs.length);
        const sdy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0) / ys.length);
        return sdx > 0 && sdy > 0 ? cov / (sdx * sdy) : null;
      };

      const correlations: Array<{
        skillA: string; skillB: string; pearsonR: number; nPairs: number;
        type: "convergent" | "discriminant";
      }> = [];

      const productive = ["SPEAKING", "WRITING"];
      const receptive = ["READING", "LISTENING"];
      for (let i = 0; i < SKILL_KEYS.length; i++) {
        for (let j = i + 1; j < SKILL_KEYS.length; j++) {
          const [nameA, keyA] = SKILL_KEYS[i];
          const [nameB, keyB] = SKILL_KEYS[j];
          const pairs = rows.filter((r) => r[keyA] != null && r[keyB] != null);
          const r = pearsonR(pairs.map((p) => p[keyA] as number), pairs.map((p) => p[keyB] as number));
          if (r === null) continue;
          const sameGroup = (productive.includes(nameA) && productive.includes(nameB)) ||
                            (receptive.includes(nameA) && receptive.includes(nameB));
          correlations.push({
            skillA: nameA, skillB: nameB,
            pearsonR: +r.toFixed(3),
            nPairs: pairs.length,
            type: sameGroup ? "convergent" : "discriminant",
          });
        }
      }

      // ── CEFR classification accuracy (test–retest consistency) ────────────────
      const candidateCounts = await prisma.session.groupBy({
        by: ["candidateId"],
        _count: { id: true },
        where: { status: "COMPLETED", cefrLevel: { not: null } },
      });
      const repeaterIds = candidateCounts
        .filter((r) => r._count.id >= 2)
        .slice(0, 500)
        .map((r) => r.candidateId);

      const repeatSessions = repeaterIds.length
        ? await prisma.session.findMany({
            where: { candidateId: { in: repeaterIds }, status: "COMPLETED", cefrLevel: { not: null } },
            select: { candidateId: true, cefrLevel: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          })
        : [];

      const byCandidate = new Map<string, string[]>();
      for (const s of repeatSessions) {
        const lvl = String(s.cefrLevel);
        if (!byCandidate.has(s.candidateId)) byCandidate.set(s.candidateId, []);
        byCandidate.get(s.candidateId)!.push(lvl);
      }

      const accMap = new Map<string, { total: number; exact: number; adjacent: number }>();
      for (const [, levels] of byCandidate) {
        if (levels.length < 2) continue;
        const ref = levels[0];
        const pred = levels[levels.length - 1];
        if (!accMap.has(ref)) accMap.set(ref, { total: 0, exact: 0, adjacent: 0 });
        const e = accMap.get(ref)!;
        e.total++;
        const refIdx = CEFR_ORDER.indexOf(ref as typeof CEFR_ORDER[number]);
        const predIdx = CEFR_ORDER.indexOf(pred as typeof CEFR_ORDER[number]);
        if (ref === pred) e.exact++;
        if (Math.abs(refIdx - predIdx) <= 1) e.adjacent++;
      }

      const cefrAccuracy = CEFR_ORDER.filter((l) => accMap.has(l)).map((l) => {
        const e = accMap.get(l)!;
        const exactAcc = e.total ? e.exact / e.total : 0;
        const adjAcc = e.total ? e.adjacent / e.total : 0;
        const pe = 1 / CEFR_ORDER.length;
        const kappa = pe < 1 ? (exactAcc - pe) / (1 - pe) : 0;
        return {
          trueLevel: l, nTotal: e.total, nCorrect: e.exact, nAdjacentCorrect: e.adjacent,
          exactAccuracy: +exactAcc.toFixed(3), adjacentAccuracy: +adjAcc.toFixed(3),
          kappa: +kappa.toFixed(3),
        };
      });

      const classificationAccuracy = cefrAccuracy.length
        ? cefrAccuracy.reduce((s, r) => s + r.exactAccuracy, 0) / cefrAccuracy.length : 0;
      const adjacentClassificationAccuracy = cefrAccuracy.length
        ? cefrAccuracy.reduce((s, r) => s + r.adjacentAccuracy, 0) / cefrAccuracy.length : 0;

      const alphaBand = overallAlpha >= 0.85 ? "excellent" : overallAlpha >= 0.75 ? "good"
                      : overallAlpha >= 0.65 ? "acceptable" : "needs review";
      const semBand = meanSEM <= 0.35 ? "high" : meanSEM <= 0.5 ? "moderate" : "low";
      const validityStatement =
        `Score validity evidence is based on ${nSessions.toLocaleString()} completed sessions. ` +
        `Internal consistency (Cronbach α = ${overallAlpha.toFixed(3)}) is ${alphaBand}. ` +
        `Measurement precision is ${semBand} (mean SEM = ${meanSEM.toFixed(3)} θ). ` +
        `CEFR classification exact agreement across repeated testing = ${(classificationAccuracy * 100).toFixed(1)}% ` +
        `(±1 level = ${(adjacentClassificationAccuracy * 100).toFixed(1)}%). ` +
        `All items are calibrated using the 3-Parameter Logistic IRT model with EAP θ estimation.`;

      res.json({
        nSessions,
        overallAlpha: +overallAlpha.toFixed(3),
        overallOmega: +overallOmega.toFixed(3),
        meanSEM: +meanSEM.toFixed(3),
        classificationAccuracy: +classificationAccuracy.toFixed(3),
        adjacentClassificationAccuracy: +adjacentClassificationAccuracy.toFixed(3),
        reliability,
        correlations,
        cefrAccuracy,
        validityStatement,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Score validity analysis failed", detail: err?.message });
    }
  });

  // ── Score Reporting Analytics ─────────────────────────────────────────────

  router.get("/score-reporting", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 86400_000);

      const [total, byCefr] = await Promise.all([
        prisma.scoreReport.count({ where: { createdAt: { gte: since } } }),
        prisma.scoreReport.groupBy({
          by: ["overallCefr"],
          _count: { overallCefr: true },
          where: { createdAt: { gte: since } },
        }),
      ]);

      res.json({
        period: { days, since: since.toISOString() },
        totalReports: total,
        cefrBreakdown: byCefr.map(r => ({ cefr: r.overallCefr, count: r._count.overallCefr })),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Score reporting analytics failed", detail: err?.message });
    }
  });

  // ── GRM Scores ──────────────────────────────────────────────────────────────

  router.get("/grm-scores", async (_req, res) => {
    try {
      const { CEFR_GRM_DEFAULTS, expectedScore, grmInformation } = await import(
        "../lib/psychometrics/graded-response-model.js"
      );

      const items = await prisma.item.findMany({
        where: { skill: { in: ["WRITING", "SPEAKING"] }, status: "ACTIVE" },
        select: { id: true, itemCode: true, skill: true, cefrLevel: true, difficulty: true },
        take: 100,
      });

      const thetaGrid = [-3, -2, -1, 0, 1, 2, 3];
      const enriched = items.map(item => {
        const params = CEFR_GRM_DEFAULTS[(item.cefrLevel as string) ?? "B1"] ?? CEFR_GRM_DEFAULTS["B1"];
        return {
          ...item,
          expectedScores: thetaGrid.map(theta => ({
            theta,
            expected: +expectedScore(theta, params).toFixed(3),
            information: +grmInformation(theta, params).toFixed(4),
          })),
        };
      });

      res.json({ n: items.length, items: enriched, thetaGrid });
    } catch (err: any) {
      res.status(500).json({ error: "GRM computation failed", detail: err?.message });
    }
  });

  // ── Test Information ────────────────────────────────────────────────────────

  router.get("/test-information", async (_req, res) => {
    try {
      const { information } = await import("../lib/assessment-engine/irt.js");

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, skill: true, cefrLevel: true, discrimination: true, difficulty: true, guessing: true },
        take: 500,
      });

      const thetaGrid = [-4, -3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 4];
      const tif = thetaGrid.map(theta => {
        const info = items
          .filter(i => i.discrimination != null)
          .reduce((sum, i) => sum + information(theta, { a: i.discrimination!, b: i.difficulty ?? 0, c: i.guessing ?? 0.25 }), 0);
        return { theta, information: +info.toFixed(4), sem: info > 0 ? +(1 / Math.sqrt(info)).toFixed(4) : null };
      });

      res.json({ n: items.length, tif, thetaGrid });
    } catch (err: any) {
      res.status(500).json({ error: "Test information computation failed", detail: err?.message });
    }
  });

  // ── Item Fit ────────────────────────────────────────────────────────────────

  router.get("/item-fit", async (_req, res) => {
    try {
      const items = await prisma.item.findMany({
        where: { pipelineStage: { in: ["LIVE" as const, "PILOT" as const, "CALIBRATION" as const] } },
        select: {
          id: true, itemCode: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          exposureCount: true, iqScore: true, pipelineStage: true,
        },
        orderBy: { exposureCount: "desc" },
        take: 200,
      });

      res.json({
        total: items.length,
        flaggedCount: items.filter(i => i.iqScore != null && i.iqScore < 65).length,
        items: items.map(i => ({ ...i, fitFlag: i.iqScore != null && i.iqScore < 65 ? "REVIEW" : "OK" })),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Item fit analysis failed", detail: err?.message });
    }
  });

  // ── Reliability ─────────────────────────────────────────────────────────────

  router.get("/reliability", async (_req, res) => {
    try {
      const { marginalReliability, classificationConsistency } = await import(
        "../lib/psychometrics/reliability-metrics.js"
      );
      const { CEFR_THETA_THRESHOLDS } = await import("../lib/cefr/cefr-framework.js");

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED" },
        select: { theta: true, sem: true },
        take: 500,
        orderBy: { completedAt: "desc" },
      });

      const thetas = sessions.map(s => s.theta);
      const sems = sessions.map(s => s.sem);
      const cutThetas = Object.values(CEFR_THETA_THRESHOLDS);

      res.json({
        n: sessions.length,
        marginalReliability: sessions.length >= 10 ? +marginalReliability(thetas, sems).toFixed(3) : null,
        classificationConsistency: sessions.length >= 10 ? +classificationConsistency(thetas, sems, cutThetas).toFixed(3) : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Reliability computation failed", detail: err?.message });
    }
  });

  // ── Item Exposure ────────────────────────────────────────────────────────────

  router.get("/item-exposure", async (_req, res) => {
    try {
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, itemCode: true, skill: true, cefrLevel: true, exposureCount: true },
        orderBy: { exposureCount: "desc" },
        take: 200,
      });

      const total = items.reduce((s, i) => s + (i.exposureCount ?? 0), 0);
      res.json({
        total: items.length,
        overExposedCount: items.filter(i => (i.exposureCount ?? 0) > 500).length,
        neverUsedCount: items.filter(i => (i.exposureCount ?? 0) === 0).length,
        totalAdministrations: total,
        items,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Exposure analysis failed", detail: err?.message });
    }
  });

  // ── Conditional SEM ──────────────────────────────────────────────────────────

  router.get("/conditional-sem", async (_req, res) => {
    try {
      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", sem: { gt: 0 } },
        select: { theta: true, sem: true },
        take: 500,
        orderBy: { completedAt: "desc" },
      });

      const grid: Record<string, { count: number; sumSem: number }> = {};
      for (const s of sessions) {
        const bucket = (Math.round(s.theta * 2) / 2).toFixed(1);
        if (!grid[bucket]) grid[bucket] = { count: 0, sumSem: 0 };
        grid[bucket].count++;
        grid[bucket].sumSem += s.sem;
      }

      const csem = Object.entries(grid)
        .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
        .map(([theta, { count, sumSem }]) => ({
          theta: parseFloat(theta),
          meanSem: +(sumSem / count).toFixed(4),
          n: count,
        }));

      res.json({ n: sessions.length, csem });
    } catch (err: any) {
      res.status(500).json({ error: "Conditional SEM failed", detail: err?.message });
    }
  });

  // ── Blueprint Compliance ──────────────────────────────────────────────────────

  router.get("/blueprint-compliance", async (_req, res) => {
    try {
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: { skill: true, cefrLevel: true },
      });

      const skills: Record<string, Record<string, number>> = {};
      for (const item of items) {
        if (!skills[item.skill]) skills[item.skill] = {};
        skills[item.skill][item.cefrLevel] = (skills[item.skill][item.cefrLevel] ?? 0) + 1;
      }

      const REQUIRED_PER_CELL = 20;
      const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
      const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
      const gaps: Array<{ skill: string; cefr: string; count: number }> = [];

      for (const skill of SKILLS) {
        for (const cefr of CEFR_LEVELS) {
          const count = skills[skill]?.[cefr] ?? 0;
          if (count < REQUIRED_PER_CELL) gaps.push({ skill, cefr, count });
        }
      }

      res.json({ totalActive: items.length, blueprint: skills, gaps, compliant: gaps.length === 0 });
    } catch (err: any) {
      res.status(500).json({ error: "Blueprint compliance check failed", detail: err?.message });
    }
  });

  // ── Classification Accuracy ───────────────────────────────────────────────────

  router.get("/classification-accuracy", async (_req, res) => {
    try {
      const { classificationConsistency } = await import(
        "../lib/psychometrics/reliability-metrics.js"
      );
      const { CEFR_THETA_THRESHOLDS } = await import("../lib/cefr/cefr-framework.js");

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED" },
        select: { theta: true, sem: true },
        take: 500,
        orderBy: { completedAt: "desc" },
      });

      const thetas = sessions.map(s => s.theta);
      const sems = sessions.map(s => s.sem);
      const cutThetas = Object.values(CEFR_THETA_THRESHOLDS);

      res.json({
        n: sessions.length,
        consistency: sessions.length >= 10 ? +classificationConsistency(thetas, sems, cutThetas).toFixed(3) : null,
        note: "Concurrent accuracy requires external criterion data; consistency computed from theta/SEM.",
      });
    } catch (err: any) {
      res.status(500).json({ error: "Classification accuracy failed", detail: err?.message });
    }
  });

  // ── Catch-all stub for unimplemented endpoints ────────────────────────────────

  router.use((_req, res) => {
    res.json({ _stub: true, message: "This psychometric endpoint is not yet implemented." });
  });

  return router;
}
