#!/usr/bin/env tsx
/**
 * Weekly exam-health report (roadmap Faz 5) — what the adaptive engine actually
 * did in production over the last window. Read only.
 *
 *   npm run report:exam-health [-- --days 7 --output scripts/jobs/.out/exam-health.json]
 *
 * Sections:
 *   sessions        completed / flagged / expired, stop-reason distribution
 *   precision       final SEM distribution (overall and per skill), share meeting the profile target
 *   pretest         responses per PRETEST item, items at the estimate / publish thresholds
 *   calibration     draft parameter versions pending / eligible, published coverage
 *   exposure        most-served operational items (share of sessions), items over the profile ceiling
 *   behaviour       rapid-guess flag rate, person-fit flags, security flags
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { getProfile } from "../../src/lib/product-lines/profiles.js";
import { CALIBRATION_POLICY } from "../../src/lib/psychometrics/calibration-policy.js";
import { calibratedShare } from "../../src/lib/psychometrics/item-parameter-versions.js";

const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
};
const days = Number(arg("days", "7"));
const output = arg("output", "");

function quantiles(values: number[]): { n: number; p50: number | null; p90: number | null; mean: number | null } {
  if (values.length === 0) return { n: 0, p50: null, p90: null, mean: null };
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))]!;
  return { n: sorted.length, p50: Number(q(0.5).toFixed(3)), p90: Number(q(0.9).toFixed(3)), mean: Number((sorted.reduce((s, v) => s + v, 0) / sorted.length).toFixed(3)) };
}

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const since = new Date(Date.now() - days * 86_400_000);
    const sessions = await db.session.findMany({
      where: { completedAt: { gte: since }, status: { in: ["COMPLETED", "FLAGGED", "EXPIRED"] } },
      select: { id: true, status: true, sem: true, metadata: true,
        responses: { select: { itemId: true, isPretest: true, rtFlag: true } },
        scoreReport: { select: { diagnosticReport: true } } },
    });
    const completed = sessions.filter((s) => s.status === "COMPLETED");
    const stopReasons: Record<string, number> = {};
    const perProfileSem: Record<string, number[]> = {};
    const perSkillSem: Record<string, number[]> = {};
    const semTargetMet: Record<string, { met: number; total: number }> = {};
    const itemSessions = new Map<string, number>();
    let rapid = 0, responses = 0, personFitFlags = 0, securityFlags = 0, uneven = 0, withComposite = 0;
    for (const s of completed) {
      const meta = (s.metadata ?? {}) as Record<string, any>;
      const profile = getProfile(meta.productLine);
      stopReasons[meta.stopReason ?? "UNSPECIFIED"] = (stopReasons[meta.stopReason ?? "UNSPECIFIED"] ?? 0) + 1;
      (perProfileSem[profile.name] ??= []).push(s.sem);
      for (const [skill, p] of Object.entries((meta.skillProfiles ?? {}) as Record<string, { sem: number }>)) {
        (perSkillSem[skill] ??= []).push(p.sem);
        const target = profile.sectionConfig[skill]?.semThreshold;
        if (target !== undefined) {
          const bucket = (semTargetMet[`${profile.name}/${skill}`] ??= { met: 0, total: 0 });
          bucket.total++;
          if (p.sem <= target) bucket.met++;
        }
      }
      for (const itemId of new Set(s.responses.filter((r) => !r.isPretest).map((r) => r.itemId))) {
        itemSessions.set(itemId, (itemSessions.get(itemId) ?? 0) + 1);
      }
      for (const r of s.responses) { responses++; if (r.rtFlag === "RAPID_GUESS") rapid++; }
      const report = (s.scoreReport?.diagnosticReport ?? {}) as Record<string, any>;
      if (report.personFit?.flag && report.personFit.flag !== "NORMAL") personFitFlags++;
      if (report.securityFlag?.flagged || report.securityFlag === true) securityFlags++;
      if (report.compositeProfile) { withComposite++; if (report.compositeProfile.uneven) uneven++; }
    }
    const exposure = [...itemSessions.entries()].map(([itemId, count]) => ({ itemId, share: Number((count / Math.max(1, completed.length)).toFixed(3)) }))
      .sort((a, b) => b.share - a.share);

    const pretestCounts = await db.response.groupBy({
      by: ["itemId"], where: { isPretest: true, session: { status: "COMPLETED" } }, _count: { _all: true },
    });
    const pretestItems = await db.item.count({ where: { status: "PRETEST" } });
    const counts = pretestCounts.map((r) => r._count._all);

    const share = await calibratedShare(db);

    const report = {
      generatedAt: new Date().toISOString(),
      windowDays: days,
      sessions: {
        completed: completed.length,
        flagged: sessions.filter((s) => s.status === "FLAGGED").length,
        expired: sessions.filter((s) => s.status === "EXPIRED").length,
        stopReasons,
      },
      precision: {
        overallSem: Object.fromEntries(Object.entries(perProfileSem).map(([k, v]) => [k, quantiles(v)])),
        skillSem: Object.fromEntries(Object.entries(perSkillSem).map(([k, v]) => [k, quantiles(v)])),
        sectionTargetMet: Object.fromEntries(Object.entries(semTargetMet).map(([k, v]) => [k, { ...v, share: v.total ? Number((v.met / v.total).toFixed(2)) : null }])),
      },
      pretest: {
        pretestItems,
        itemsWithResponses: counts.length,
        responsesPerItem: quantiles(counts),
        atEstimateMinN: counts.filter((c) => c >= CALIBRATION_POLICY.estimateMinN).length,
        atPublishMinN: counts.filter((c) => c >= CALIBRATION_POLICY.publishMinN).length,
      },
      calibration: share,
      exposure: {
        itemsServed: exposure.length,
        top: exposure.slice(0, 10),
        maxShare: exposure[0]?.share ?? 0,
        overCeiling: exposure.filter((e) => e.share > 0.35).length, // ψ ceiling used by the auto-retire scan
      },
      behaviour: {
        responses,
        rapidGuessRate: responses ? Number((rapid / responses).toFixed(4)) : null,
        personFitFlags, securityFlags,
        compositeUnevenRate: withComposite ? Number((uneven / withComposite).toFixed(3)) : null,
      },
    };
    console.log(JSON.stringify(report, null, 2));
    if (output) { mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2)); console.log(`written: ${output}`); }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => { console.error("exam-health-report failed:", error); process.exitCode = 1; });
