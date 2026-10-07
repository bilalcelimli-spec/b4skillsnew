import type { SloMetric, SloReport } from "./slo-monitor.js";

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
      `| ${m.sloName} | ${m.sloName.endsWith("_qwk") ? m.target.toFixed(3) : fmtPct(m.target)} | ${m.sloName.endsWith("_qwk") && m.achieved !== null ? m.achieved.toFixed(3) : fmtPct(m.achieved)} | ${m.errorBudgetConsumedPct !== null ? `${m.errorBudgetConsumedPct.toFixed(1)}%` : "N/A"} | ${statusIcon(m)} | ${m.note ?? ""} |`
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
