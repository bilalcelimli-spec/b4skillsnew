/**
 * SLO Monitor — b4skills Platform
 *
 * Computes Service Level Objective metrics from operational data and returns
 * a structured report that can be:
 *   - Served at GET /api/admin/slo/report
 *   - Posted to GitHub Actions step summary (weekly workflow)
 *   - Displayed on an internal ops dashboard
 *
 * METRICS COMPUTED
 * ─────────────────
 * 1. Session success rate  — DB-derived (failed sessions / total)
 * 2. AI scoring availability — DB-derived (ai_unavailable responses / total)
 * 3. Error budget consumed  — calculated from SLO targets
 * 4. QWK compliance         — from ai_human_agreement data (if available)
 *
 * METRICS NOT YET COMPUTED (require APM / structured access log)
 * ────────────────────────────────────────────────────────────────
 * - API p95/p99 latency  → needs Pino log aggregation or APM (e.g. Datadog)
 * - HTTP 5xx rate        → needs structured access log table
 * - Database availability → /readyz endpoint history
 *
 * These are marked "apm_required: true" in the report.
 *
 * See docs/slo-definitions.md for full SLO targets and error budget rules.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SloTarget {
  name: string;
  description: string;
  target: number;        // 0–1 fraction (e.g. 0.995 for 99.5%)
  windowDays: number;    // rolling window in days
}

export interface SloMetric {
  sloName: string;
  target: number;
  achieved: number | null;   // null = not measurable yet (APM required)
  compliant: boolean | null; // null = unknown
  errorBudgetConsumedPct: number | null; // 0–100
  windowDays: number;
  apmRequired?: boolean;
  note?: string;
}

export interface SloReport {
  generatedAt: string;
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  metrics: SloMetric[];
  summary: {
    totalSlos: number;
    compliantSlos: number;
    nonCompliantSlos: number;
    unknownSlos: number;
    overallHealthy: boolean;
  };
  recommendations: string[];
}

// ─── SLO definitions ──────────────────────────────────────────────────────────

export const SLO_TARGETS: SloTarget[] = [
  {
    name: "api_availability",
    description: "API availability ≥99.5% (healthz)",
    target: 0.995,
    windowDays: 30,
  },
  {
    name: "session_success_rate",
    description: "Exam session completion rate ≥99.0%",
    target: 0.990,
    windowDays: 30,
  },
  {
    name: "ai_scoring_availability",
    description: "AI scoring success rate ≥95.0%",
    target: 0.950,
    windowDays: 30,
  },
  {
    name: "db_availability",
    description: "Database availability ≥99.9% (readyz)",
    target: 0.999,
    windowDays: 30,
  },
  {
    name: "ai_writing_qwk",
    description: "AI–human writing QWK ≥0.80",
    target: 0.80,
    windowDays: 30,
  },
  {
    name: "ai_speaking_qwk",
    description: "AI–human speaking QWK ≥0.80",
    target: 0.80,
    windowDays: 30,
  },
  {
    name: "next_item_p95",
    description: "next-item latency p95 <300ms",
    target: 0.95,   // 95th percentile must be <300ms
    windowDays: 30,
  },
];

// ─── Error budget calculation ─────────────────────────────────────────────────

/** Minutes of downtime / SLO violation allowed in a given window. */
export function errorBudgetMinutes(target: number, windowDays: number): number {
  return (1 - target) * windowDays * 24 * 60;
}

/** Percentage of error budget consumed given current achieved rate. */
export function errorBudgetConsumedPct(
  target: number,
  achieved: number,
  windowDays: number
): number {
  if (achieved >= target) return 0;
  const budget = errorBudgetMinutes(target, windowDays);
  const consumed = (target - achieved) * windowDays * 24 * 60;
  return Math.min(100, (consumed / budget) * 100);
}

// ─── DB-derived metrics ───────────────────────────────────────────────────────

/** Exam session completion rate over the last N days. */
async function computeSessionSuccessRate(windowDays: number): Promise<{
  achieved: number;
  totalSessions: number;
  completedSessions: number;
}> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [total, completed] = await Promise.all([
    prisma.session.count({
      where: { createdAt: { gte: windowStart } },
    }),
    prisma.session.count({
      where: {
        createdAt: { gte: windowStart },
        status: "COMPLETED",
      },
    }),
  ]);

  const achieved = total === 0 ? 1.0 : completed / total;
  return { achieved, totalSessions: total, completedSessions: completed };
}

/** AI scoring availability: fraction of scored responses NOT from "ai_unavailable". */
async function computeAiScoringAvailability(windowDays: number): Promise<{
  achieved: number;
  totalScored: number;
  aiUnavailableCount: number;
}> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Count responses where AI was attempted (writing/speaking items)
  // scoreSource field stored in Response.metadata.scoreSource
  const allScored = await prisma.response.findMany({
    where: {
      createdAt: { gte: windowStart },
      score: { not: undefined },
    },
    select: { metadata: true },
  });

  const totalScored = allScored.length;
  const aiUnavailableCount = allScored.filter((r) => {
    const meta = r.metadata as Record<string, unknown> | null;
    return meta?.scoreSource === "ai_unavailable";
  }).length;

  const achieved =
    totalScored === 0 ? 1.0 : (totalScored - aiUnavailableCount) / totalScored;

  return { achieved, totalScored, aiUnavailableCount };
}

/** AI-human QWK from the agreement monitor (rolling 30-day). */
export async function computeQwkSlo(
  skill: "WRITING" | "SPEAKING",
  windowDays: number
): Promise<{ achieved: number | null; sampleSize: number }> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Look for responses with both AI score and human review override
  const responses = await prisma.response.findMany({
    where: {
      createdAt: { gte: windowStart },
      score: { not: undefined },
    },
    select: { score: true, metadata: true },
  });

  // Filter to responses with human review scores
  const pairs: Array<{ ai: number; human: number }> = [];
  for (const r of responses) {
    const meta = r.metadata as Record<string, unknown> | null;
    if (!meta) continue;
    const humanScore = meta.humanScore as number | undefined;
    const aiScore = meta.aiScore as number | undefined;
    if (typeof humanScore === "number" && typeof aiScore === "number") {
      pairs.push({ ai: aiScore, human: humanScore });
    }
  }

  if (pairs.length < 10) {
    return { achieved: null, sampleSize: pairs.length };
  }

  // Compute QWK (quadratic weighted kappa, approximated as Pearson r for continuous)
  // For ordinal QWK, scores are assumed 0.0–1.0 in 0.1 increments
  const n = pairs.length;
  const meanAi = pairs.reduce((s, p) => s + p.ai, 0) / n;
  const meanHuman = pairs.reduce((s, p) => s + p.human, 0) / n;
  const num = pairs.reduce((s, p) => s + (p.ai - meanAi) * (p.human - meanHuman), 0);
  const denAi = Math.sqrt(pairs.reduce((s, p) => s + (p.ai - meanAi) ** 2, 0));
  const denHuman = Math.sqrt(pairs.reduce((s, p) => s + (p.human - meanHuman) ** 2, 0));
  const pearsonR =
    denAi === 0 || denHuman === 0 ? 0 : num / (denAi * denHuman);

  return { achieved: pearsonR, sampleSize: n };
}

// ─── Main report generator ────────────────────────────────────────────────────

/** Generate a full SLO report for the given rolling window. */
export async function generateSloReport(windowDays = 30): Promise<SloReport> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [sessionData, aiData, writingQwk, speakingQwk] = await Promise.all([
    computeSessionSuccessRate(windowDays).catch(() => null),
    computeAiScoringAvailability(windowDays).catch(() => null),
    computeQwkSlo("WRITING", windowDays).catch(() => null),
    computeQwkSlo("SPEAKING", windowDays).catch(() => null),
  ]);

  const metrics: SloMetric[] = [
    // API availability — not measurable without external uptime monitor data
    {
      sloName: "api_availability",
      target: 0.995,
      achieved: null,
      compliant: null,
      errorBudgetConsumedPct: null,
      windowDays,
      apmRequired: true,
      note: "Requires Betterstack/UptimeRobot data export — see docs/slo-definitions.md §5",
    },

    // Session success rate — DB-derived
    (() => {
      const achieved = sessionData?.achieved ?? null;
      const compliant = achieved !== null ? achieved >= 0.990 : null;
      return {
        sloName: "session_success_rate",
        target: 0.990,
        achieved,
        compliant,
        errorBudgetConsumedPct:
          achieved !== null
            ? errorBudgetConsumedPct(0.990, achieved, windowDays)
            : null,
        windowDays,
        note: sessionData
          ? `${sessionData.completedSessions}/${sessionData.totalSessions} sessions completed`
          : undefined,
      };
    })(),

    // AI scoring availability — DB-derived
    (() => {
      const achieved = aiData?.achieved ?? null;
      const compliant = achieved !== null ? achieved >= 0.950 : null;
      return {
        sloName: "ai_scoring_availability",
        target: 0.950,
        achieved,
        compliant,
        errorBudgetConsumedPct:
          achieved !== null
            ? errorBudgetConsumedPct(0.950, achieved, windowDays)
            : null,
        windowDays,
        note: aiData
          ? `${aiData.aiUnavailableCount} ai_unavailable out of ${aiData.totalScored} scored`
          : undefined,
      };
    })(),

    // DB availability — not measurable without /readyz history
    {
      sloName: "db_availability",
      target: 0.999,
      achieved: null,
      compliant: null,
      errorBudgetConsumedPct: null,
      windowDays,
      apmRequired: true,
      note: "Requires /readyz response history — log to DB or APM",
    },

    // Writing QWK
    (() => {
      const achieved = writingQwk?.achieved ?? null;
      const compliant = achieved !== null ? achieved >= 0.80 : null;
      return {
        sloName: "ai_writing_qwk",
        target: 0.80,
        achieved,
        compliant,
        errorBudgetConsumedPct:
          achieved !== null
            ? errorBudgetConsumedPct(0.80, achieved, windowDays)
            : null,
        windowDays,
        note: writingQwk
          ? `n=${writingQwk.sampleSize} human-reviewed responses`
          : "Insufficient human-reviewed responses (<10) for QWK computation",
      };
    })(),

    // Speaking QWK
    (() => {
      const achieved = speakingQwk?.achieved ?? null;
      const compliant = achieved !== null ? achieved >= 0.80 : null;
      return {
        sloName: "ai_speaking_qwk",
        target: 0.80,
        achieved,
        compliant,
        errorBudgetConsumedPct:
          achieved !== null
            ? errorBudgetConsumedPct(0.80, achieved, windowDays)
            : null,
        windowDays,
        note: speakingQwk
          ? `n=${speakingQwk.sampleSize} human-reviewed responses`
          : "Insufficient human-reviewed responses (<10) for QWK computation",
      };
    })(),

    // Latency p95 — APM required
    {
      sloName: "next_item_p95",
      target: 0.95,
      achieved: null,
      compliant: null,
      errorBudgetConsumedPct: null,
      windowDays,
      apmRequired: true,
      note: "Requires Pino log aggregation to Grafana/Loki — not yet configured",
    },
  ];

  // Summary
  const known = metrics.filter((m) => m.compliant !== null);
  const compliantSlos = known.filter((m) => m.compliant === true).length;
  const nonCompliantSlos = known.filter((m) => m.compliant === false).length;
  const unknownSlos = metrics.filter((m) => m.compliant === null).length;

  const recommendations: string[] = [];
  if (unknownSlos > 0) {
    recommendations.push(
      `${unknownSlos} SLOs require APM tooling (Betterstack/Grafana) — configure uptime monitoring as per docs/slo-definitions.md §5.`
    );
  }
  for (const m of metrics) {
    if (m.compliant === false) {
      recommendations.push(
        `SLO "${m.sloName}" is non-compliant (achieved=${m.achieved?.toFixed(3)}, target=${m.target}). Check error budget.`
      );
    }
    if (m.errorBudgetConsumedPct !== null && m.errorBudgetConsumedPct > 75) {
      recommendations.push(
        `SLO "${m.sloName}" error budget > 75% consumed — freeze non-critical deploys.`
      );
    }
  }

  return {
    generatedAt: now.toISOString(),
    windowDays,
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    metrics,
    summary: {
      totalSlos: metrics.length,
      compliantSlos,
      nonCompliantSlos,
      unknownSlos,
      overallHealthy: nonCompliantSlos === 0,
    },
    recommendations,
  };
}

/** Markdown-formatted SLO report for GitHub Actions step summary. */
export function sloReportToMarkdown(report: SloReport): string {
  const statusIcon = (m: SloMetric) =>
    m.compliant === true ? "✅" :
    m.compliant === false ? "❌" : "⚠️";

  const fmtPct = (n: number | null) =>
    n === null ? "N/A" : `${(n * 100).toFixed(2)}%`;

  const lines: string[] = [
    `## SLO Report — ${report.windowDays}-day window`,
    `**Generated:** ${report.generatedAt}  |  **Window:** ${report.windowStart.slice(0, 10)} → ${report.windowEnd.slice(0, 10)}`,
    "",
    "### Summary",
    `| Total SLOs | Compliant | Non-compliant | Unknown |`,
    `|---|---|---|---|`,
    `| ${report.summary.totalSlos} | ${report.summary.compliantSlos} ✅ | ${report.summary.nonCompliantSlos} ❌ | ${report.summary.unknownSlos} ⚠️ |`,
    "",
    "### SLO Table",
    "| SLO | Target | Achieved | Budget Consumed | Status | Note |",
    "|---|---|---|---|---|---|",
    ...report.metrics.map((m) =>
      `| ${m.sloName} | ${fmtPct(m.target)} | ${fmtPct(m.achieved)} | ${m.errorBudgetConsumedPct !== null ? `${m.errorBudgetConsumedPct.toFixed(1)}%` : "N/A"} | ${statusIcon(m)} | ${m.note ?? ""} |`
    ),
    "",
  ];

  if (report.recommendations.length > 0) {
    lines.push("### Recommendations");
    for (const r of report.recommendations) {
      lines.push(`- ${r}`);
    }
  }

  return lines.join("\n");
}
