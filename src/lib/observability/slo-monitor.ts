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

import { prisma } from "../prisma.js";
import { quadraticWeightedKappa } from "../scoring/ai-human-agreement.js";


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
  // Consumed budget is observed failures / allowed failures, including when
  // the target is still met. At the target the entire budget has been spent.
  const budget = errorBudgetMinutes(target, windowDays);
  if (budget <= 0) return achieved >= 1 ? 0 : 100;
  return Math.max(0, Math.min(100, ((1 - achieved) * windowDays * 24 * 60) / budget * 100));
}

// ─── DB-derived metrics ───────────────────────────────────────────────────────

/** Completion among finished, started attempts; exclude scheduled/live attempts. */
async function computeSessionSuccessRate(windowDays: number) {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const terminal = { startedAt: { not: null }, OR: [
    { status: "COMPLETED" as const, completedAt: { gte: windowStart } },
    { status: "EXPIRED" as const, updatedAt: { gte: windowStart } },
  ] };
  const [total, completed] = await Promise.all([
    prisma.session.count({ where: terminal }),
    prisma.session.count({ where: { ...terminal, status: "COMPLETED" } }),
  ]);
  return { achieved: total === 0 ? null : completed / total, totalSessions: total, completedSessions: completed };
}

const validScore = (score: unknown): score is number => typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 1;

/** Actual productive-skill AI attempts; objective answers never inflate availability. */
async function computeAiScoringAvailability(windowDays: number) {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const responses = await prisma.response.findMany({
    where: { createdAt: { gte: windowStart }, isPretest: false, item: { OR: [{ skill: { in: ["WRITING", "SPEAKING"] } }, { type: "INTEGRATED_TASK" }] } },
    select: { aiScore: true, metadata: true },
  });
  let totalScored = 0, aiUnavailableCount = 0, unclassifiedAiResponses = 0;
  for (const response of responses) {
    const meta = response.metadata as Record<string, unknown> | null;
    if (meta?.scoreSource === "rejected_integrity" || meta?.pendingAsyncScore === true) continue;
    // Preserve a failed attempt after a human override clears scoreFailed/scoreSource.
    const failed = meta?.scoreSource === "ai_unavailable" || meta?.scoreFailed === true || meta?.aiUnavailable === true;
    const success = !failed && validScore(response.aiScore);
    if (!success && !failed) {
      if (meta?.scoreSource === "ai_auto" || meta?.scoreSource === "ai_flagged") unclassifiedAiResponses++;
      continue; // Legacy incomplete AI evidence or human-only response.
    }
    totalScored++;
    if (!success) aiUnavailableCount++;
  }
  return { achieved: totalScored === 0 || unclassifiedAiResponses > 0 ? null : (totalScored - aiUnavailableCount) / totalScored, totalScored, aiUnavailableCount, unclassifiedAiResponses };
}

/** QWK on the same seven ordinal score bands used by the agreement monitor. */
export async function computeQwkSlo(skill: "WRITING" | "SPEAKING", windowDays: number): Promise<{ achieved: number | null; sampleSize: number }> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const responses = await prisma.response.findMany({
    where: { createdAt: { gte: windowStart }, isPretest: false, OR: [{ item: { skill } }, { item: { type: "INTEGRATED_TASK" }, metadata: { path: ["scoringMode"], equals: skill } }], aiScore: { not: null }, humanScore: { not: null } },
    select: { aiScore: true, humanScore: true, metadata: true },
  });
  const pairs = responses.filter(response => {
    const meta = response.metadata as Record<string, unknown> | null;
    return validScore(response.aiScore) && validScore(response.humanScore) && meta?.aiUnavailable !== true && meta?.scoreSource !== "ai_unavailable" && meta?.scoreFailed !== true;
  });
  if (pairs.length < 10) return { achieved: null, sampleSize: pairs.length };
  // Kappa is undefined when both marginals occupy the same single band.
  // A repeated identical score cannot establish population-level agreement.
  const bands = new Set(pairs.flatMap(response => [Math.round(response.aiScore! * 6), Math.round(response.humanScore! * 6)]));
  if (bands.size < 2) return { achieved: null, sampleSize: pairs.length };
  return { achieved: quadraticWeightedKappa(pairs.map(response => response.aiScore!), pairs.map(response => response.humanScore!)), sampleSize: pairs.length };
}

// ─── Main report generator ────────────────────────────────────────────────────

/** Generate a full SLO report for the given rolling window. */
export interface LatencySnapshot {
  /** 95th-percentile latency in ms (from in-process ring buffer) */
  p95Ms: number;
  /** 99th-percentile latency in ms */
  p99Ms: number;
  /** Proportion of /api/* requests where latency ≤ 300ms (for next_item_p95 SLO) */
  fractionBelow300Ms: number;
  /** 5xx error rate (0–1) */
  errorRate5xx: number;
  /** Ring buffer sample size */
  sampleSize: number;
}

export async function generateSloReport(windowDays = 30, latency?: LatencySnapshot): Promise<SloReport> {
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) throw new Error("windowDays must be an integer from 1 to 365");
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
          ? `${aiData.aiUnavailableCount} unavailable out of ${aiData.totalScored} classified AI attempts; ${aiData.unclassifiedAiResponses} legacy responses have incomplete AI evidence`
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
      note: "Requires /api/healthz/ready response history — log to DB or APM",
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
        errorBudgetConsumedPct: null, // Agreement coefficients have no time-based error budget.
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
        errorBudgetConsumedPct: null, // Agreement coefficients have no time-based error budget.
        windowDays,
        note: speakingQwk
          ? `n=${speakingQwk.sampleSize} human-reviewed responses`
          : "Insufficient human-reviewed responses (<10) for QWK computation",
      };
    })(),

    // Latency p95 — filled from in-process ring buffer if available, else APM required
    (() => {
      if (latency && latency.sampleSize >= 10) {
        const achieved = latency.fractionBelow300Ms;
        const compliant = achieved >= 0.95;
        return {
          sloName: "next_item_p95",
          target: 0.95,
          achieved: Number(achieved.toFixed(4)),
          compliant,
          errorBudgetConsumedPct: errorBudgetConsumedPct(0.95, achieved, windowDays),
          windowDays,
          note: `In-process ring buffer: p95=${latency.p95Ms}ms, p99=${latency.p99Ms}ms, n=${latency.sampleSize}; 5xx rate=${(latency.errorRate5xx * 100).toFixed(2)}%`,
        };
      }
      return {
        sloName: "next_item_p95",
        target: 0.95,
        achieved: null,
        compliant: null,
        errorBudgetConsumedPct: null,
        windowDays,
        apmRequired: true,
        note: "Requires Pino log aggregation to Grafana/Loki — not yet configured",
      };
    })(),
  ];

  // Summary
  const known = metrics.filter((m) => m.compliant !== null);
  const compliantSlos = known.filter((m) => m.compliant === true).length;
  const nonCompliantSlos = known.filter((m) => m.compliant === false).length;
  const unknownSlos = metrics.filter((m) => m.compliant === null).length;

  const recommendations: string[] = [];
  if (unknownSlos > 0) {
    recommendations.push(
      `${unknownSlos} SLOs lack sufficient evidence. Check APM history, sample sizes and persisted scoring evidence — see docs/slo-definitions.md §5.`
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
      overallHealthy: nonCompliantSlos === 0 && unknownSlos === 0,
    },
    recommendations,
  };
}

export { sloReportToMarkdown } from "./slo-format.js";
