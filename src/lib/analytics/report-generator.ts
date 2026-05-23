/**
 * b4skills Report Generator
 * PDF, Excel (XLSX) and CSV export for candidate & cohort reports.
 *
 * Dependencies (already in node_modules or add to package.json):
 *   pdfkit      → PDF generation
 *   exceljs     → XLSX generation
 *   csv-stringify → CSV serialisation
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CandidateReportData {
  candidateId: string;
  name: string;
  email: string;
  assessmentDate: Date;
  cefrLevel: string;
  overallScore: number;
  skillScores: Record<string, number>;
  sessionCount: number;
  improvementTrend: "improving" | "stable" | "declining";
}

export interface CohortReportData {
  organizationId: string;
  organizationName: string;
  generatedAt: Date;
  totalCandidates: number;
  averageScore: number;
  cefrDistribution: Record<string, number>;
  skillBreakdown: Record<string, { mean: number; median: number; stdDev: number }>;
  topPerformers: Array<{ name: string; cefrLevel: string; score: number }>;
  atRiskCandidates: Array<{ name: string; score: number; issues: string[] }>;
}

export type ReportFormat = "pdf" | "excel" | "csv";

// ---------------------------------------------------------------------------
// Data builders
// ---------------------------------------------------------------------------

export async function buildCandidateReport(candidateId: string): Promise<CandidateReportData> {
  const user = await prisma.user.findUnique({
    where: { id: candidateId },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { responses: true },
      },
      candidateProfile: true,
    },
  });

  if (!user) throw new Error(`Candidate ${candidateId} not found`);

  const sessions = user.sessions ?? [];
  const completedSessions = sessions.filter((s: any) => s.status === "COMPLETED");

  const skillScores: Record<string, number> = {};
  const cefrVotes: string[] = [];

  for (const session of completedSessions) {
    if ((session as any).cefrLevel) cefrVotes.push((session as any).cefrLevel);
    // Use theta as a proxy for score (normalise to 0-100 range from -3..+3)
    const thetaScore = Math.round((((session as any).theta ?? 0) + 3) * (100 / 6));
    skillScores["OVERALL"] = (skillScores["OVERALL"] ?? 0) + thetaScore;
  }

  // Normalise averages
  if (completedSessions.length > 0) {
    for (const skill of Object.keys(skillScores)) {
      skillScores[skill] = Math.round(skillScores[skill] / completedSessions.length);
    }
  }

  const overallScore =
    Object.values(skillScores).length > 0
      ? Math.round(Object.values(skillScores).reduce((a, b) => a + b, 0) / Object.values(skillScores).length)
      : 0;

  // CEFR majority vote
  const cefrCounts: Record<string, number> = {};
  for (const l of cefrVotes) cefrCounts[l] = (cefrCounts[l] ?? 0) + 1;
  const cefrLevel =
    Object.entries(cefrCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "A1";

  // Trend: compare first half vs second half
  const mid = Math.floor(completedSessions.length / 2);
  const firstHalf = completedSessions.slice(mid);
  const secondHalf = completedSessions.slice(0, mid);
  const avgScore = (sessions: any[]) =>
    sessions.length === 0
      ? 0
      : sessions.reduce((acc, s) => acc + Math.round(((s.theta ?? 0) + 3) * (100 / 6)), 0) / sessions.length;

  const trend =
    avgScore(secondHalf) > avgScore(firstHalf) + 2
      ? "improving"
      : avgScore(secondHalf) < avgScore(firstHalf) - 2
        ? "declining"
        : "stable";

  return {
    candidateId,
    name: user.name ?? "Unknown",
    email: user.email,
    assessmentDate: completedSessions[0]?.completedAt ?? new Date(),
    cefrLevel,
    overallScore,
    skillScores,
    sessionCount: completedSessions.length,
    improvementTrend: trend,
  };
}

export async function buildCohortReport(organizationId: string): Promise<CohortReportData> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error(`Organization ${organizationId} not found`);

  const users = await prisma.user.findMany({
    where: { organizationId },
    include: {
      sessions: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const scores: number[] = [];
  const cefrDist: Record<string, number> = {};
  const skillAcc: Record<string, number[]> = {};
  const performers: Array<{ name: string; cefrLevel: string; score: number }> = [];
  const atRisk: Array<{ name: string; score: number; issues: string[] }> = [];

  for (const user of users) {
    const completed = user.sessions.filter((s: any) => s.status === "COMPLETED");
    if (completed.length === 0) continue;

    const latest = completed[0];
    const score: number = Math.round(((latest.theta ?? 0) + 3) * (100 / 6));
    const cefr: string = (latest as any).cefrLevel ?? "A1";

    scores.push(score);
    cefrDist[cefr] = (cefrDist[cefr] ?? 0) + 1;

    if (!skillAcc["OVERALL"]) skillAcc["OVERALL"] = [];
    skillAcc["OVERALL"].push(score);

    performers.push({ name: user.name ?? "Unknown", cefrLevel: cefr, score });

    if (score < 40) {
      const issues: string[] = [];
      if (completed.length < 2) issues.push("Insufficient assessment history");
      if (score < 30) issues.push("Score below A2 threshold");
      atRisk.push({ name: user.name ?? "Unknown", score, issues });
    }
  }

  // Stats helpers
  const mean = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length === 0 ? 0 : s.length % 2 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const stdDev = (arr: number[]) => {
    const m = mean(arr);
    return arr.length === 0 ? 0 : Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
  };

  const skillBreakdown: Record<string, { mean: number; median: number; stdDev: number }> = {};
  for (const [skill, vals] of Object.entries(skillAcc)) {
    skillBreakdown[skill] = {
      mean: Math.round(mean(vals)),
      median: Math.round(median(vals)),
      stdDev: Math.round(stdDev(vals) * 10) / 10,
    };
  }

  return {
    organizationId,
    organizationName: org.name,
    generatedAt: new Date(),
    totalCandidates: users.length,
    averageScore: Math.round(mean(scores)),
    cefrDistribution: cefrDist,
    skillBreakdown,
    topPerformers: performers.sort((a, b) => b.score - a.score).slice(0, 10),
    atRiskCandidates: atRisk.slice(0, 20),
  };
}

// ---------------------------------------------------------------------------
// PDF Generator (pure-JS, no native deps)
// ---------------------------------------------------------------------------

export async function generateCandidatePDF(data: CandidateReportData): Promise<Buffer> {
  try {
    // @ts-ignore — pdfkit optional dependency; install with: npm i pdfkit @types/pdfkit
    const PDFDocument = (await import("pdfkit")).default;
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc.fontSize(24).fillColor("#1e40af").text("b4skills Assessment Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#64748b").text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
      doc.moveDown();

      // Candidate info
      doc.fontSize(18).fillColor("#0f172a").text("Candidate Information");
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e2e8f0");
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor("#334155");
      doc.text(`Name: ${data.name}`);
      doc.text(`Email: ${data.email}`);
      doc.text(`Assessment Date: ${data.assessmentDate.toLocaleDateString()}`);
      doc.text(`Sessions Completed: ${data.sessionCount}`);
      doc.moveDown();

      // CEFR level
      const cefrColor =
        data.cefrLevel.startsWith("C") ? "#15803d" :
        data.cefrLevel.startsWith("B") ? "#1d4ed8" : "#dc2626";
      doc.fontSize(18).fillColor("#0f172a").text("Overall Result");
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e2e8f0");
      doc.moveDown(0.3);
      doc.fontSize(36).fillColor(cefrColor).text(data.cefrLevel, { align: "center" });
      doc.fontSize(14).fillColor("#64748b").text(`Score: ${data.overallScore}/100`, { align: "center" });
      doc.text(`Trend: ${data.improvementTrend}`, { align: "center" });
      doc.moveDown();

      // Skill breakdown
      if (Object.keys(data.skillScores).length > 0) {
        doc.fontSize(18).fillColor("#0f172a").text("Skill Breakdown");
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e2e8f0");
        doc.moveDown(0.3);
        for (const [skill, score] of Object.entries(data.skillScores)) {
          doc.fontSize(11).fillColor("#334155");
          doc.text(`${skill}: ${score}/100`, { continued: false });
          // Bar representation
          const barWidth = Math.round((score / 100) * 300);
          doc.rect(50, doc.y - 2, 300, 8).fill("#e2e8f0");
          doc.rect(50, doc.y - 2, barWidth, 8).fill("#3b82f6");
          doc.moveDown(0.3);
        }
      }

      doc.end();
    });
  } catch {
    // Fallback: return a simple text buffer if pdfkit not installed
    return Buffer.from(
      `b4skills Candidate Report\n\nName: ${data.name}\nCEFR: ${data.cefrLevel}\nScore: ${data.overallScore}\nDate: ${data.assessmentDate.toISOString()}`
    );
  }
}

export async function generateCohortPDF(data: CohortReportData): Promise<Buffer> {
  try {
    // @ts-ignore — pdfkit optional dependency
    const PDFDocument = (await import("pdfkit")).default;
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.fontSize(24).fillColor("#1e40af").text("b4skills Cohort Report", { align: "center" });
      doc.fontSize(14).fillColor("#64748b").text(data.organizationName, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${data.generatedAt.toLocaleDateString()}`, { align: "center" });
      doc.moveDown();

      // Summary
      doc.fontSize(16).fillColor("#0f172a").text("Summary");
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e2e8f0");
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor("#334155");
      doc.text(`Total Candidates: ${data.totalCandidates}`);
      doc.text(`Average Score: ${data.averageScore}/100`);
      doc.moveDown();

      // CEFR distribution
      doc.fontSize(16).fillColor("#0f172a").text("CEFR Distribution");
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e2e8f0");
      doc.moveDown(0.3);
      for (const [level, count] of Object.entries(data.cefrDistribution).sort()) {
        const pct = Math.round((count / data.totalCandidates) * 100);
        doc.text(`${level}: ${count} candidates (${pct}%)`);
      }
      doc.moveDown();

      // Top performers
      if (data.topPerformers.length > 0) {
        doc.fontSize(16).fillColor("#0f172a").text("Top Performers");
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e2e8f0");
        doc.moveDown(0.3);
        data.topPerformers.slice(0, 5).forEach((p, i) => {
          doc.text(`${i + 1}. ${p.name} — ${p.cefrLevel} (${p.score})`);
        });
      }

      doc.end();
    });
  } catch {
    return Buffer.from(
      `b4skills Cohort Report\n\nOrg: ${data.organizationName}\nCandidates: ${data.totalCandidates}\nAvg Score: ${data.averageScore}`
    );
  }
}

// ---------------------------------------------------------------------------
// Excel Generator
// ---------------------------------------------------------------------------

export async function generateCandidateExcel(data: CandidateReportData): Promise<Buffer> {
  try {
    // @ts-ignore — exceljs optional dependency; install with: npm i exceljs
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "b4skills";
    wb.created = new Date();

    const ws = wb.addWorksheet("Candidate Report");
    ws.columns = [
      { header: "Field", key: "field", width: 25 },
      { header: "Value", key: "value", width: 40 },
    ];

    // Style header
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };

    const rows = [
      ["Name", data.name],
      ["Email", data.email],
      ["CEFR Level", data.cefrLevel],
      ["Overall Score", data.overallScore],
      ["Sessions", data.sessionCount],
      ["Trend", data.improvementTrend],
      ["Assessment Date", data.assessmentDate.toLocaleDateString()],
      ...Object.entries(data.skillScores).map(([k, v]) => [`${k} Score`, v]),
    ];
    for (const [field, value] of rows) ws.addRow({ field, value });

    return Buffer.from(await wb.xlsx.writeBuffer());
  } catch {
    // Fallback CSV-like buffer
    const lines = [`Name,${data.name}`, `CEFR,${data.cefrLevel}`, `Score,${data.overallScore}`];
    return Buffer.from(lines.join("\n"));
  }
}

export async function generateCohortExcel(data: CohortReportData): Promise<Buffer> {
  try {
    // @ts-ignore — exceljs optional dependency
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "b4skills";

    // Summary sheet
    const summary = wb.addWorksheet("Summary");
    summary.addRow(["Organization", data.organizationName]);
    summary.addRow(["Generated", data.generatedAt.toLocaleDateString()]);
    summary.addRow(["Total Candidates", data.totalCandidates]);
    summary.addRow(["Average Score", data.averageScore]);

    // CEFR sheet
    const cefrWs = wb.addWorksheet("CEFR Distribution");
    cefrWs.addRow(["Level", "Count", "Percentage"]);
    for (const [level, count] of Object.entries(data.cefrDistribution).sort()) {
      cefrWs.addRow([level, count, `${Math.round((count / data.totalCandidates) * 100)}%`]);
    }

    // Skill sheet
    const skillWs = wb.addWorksheet("Skill Breakdown");
    skillWs.addRow(["Skill", "Mean", "Median", "StdDev"]);
    for (const [skill, stats] of Object.entries(data.skillBreakdown)) {
      skillWs.addRow([skill, stats.mean, stats.median, stats.stdDev]);
    }

    // Top performers
    const topWs = wb.addWorksheet("Top Performers");
    topWs.addRow(["Rank", "Name", "CEFR", "Score"]);
    data.topPerformers.forEach((p, i) => topWs.addRow([i + 1, p.name, p.cefrLevel, p.score]));

    // At-risk
    const riskWs = wb.addWorksheet("At-Risk Candidates");
    riskWs.addRow(["Name", "Score", "Issues"]);
    data.atRiskCandidates.forEach((c) => riskWs.addRow([c.name, c.score, c.issues.join("; ")]));

    return Buffer.from(await wb.xlsx.writeBuffer());
  } catch {
    return Buffer.from(`Organization,${data.organizationName}\nCandidates,${data.totalCandidates}`);
  }
}

// ---------------------------------------------------------------------------
// CSV Generator
// ---------------------------------------------------------------------------

function escapeCSV(val: unknown): string {
  const str = String(val ?? "");
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export function generateCandidateCSV(data: CandidateReportData): Buffer {
  const rows: string[][] = [
    ["Field", "Value"],
    ["Name", data.name],
    ["Email", data.email],
    ["CEFR Level", data.cefrLevel],
    ["Overall Score", String(data.overallScore)],
    ["Sessions", String(data.sessionCount)],
    ["Trend", data.improvementTrend],
    ["Assessment Date", data.assessmentDate.toISOString()],
    ...Object.entries(data.skillScores).map(([k, v]) => [`${k} Score`, String(v)]),
  ];
  return Buffer.from(rows.map((r) => r.map(escapeCSV).join(",")).join("\n"));
}

export function generateCohortCSV(data: CohortReportData): Buffer {
  const rows: string[][] = [
    ["Organization", data.organizationName],
    ["Generated At", data.generatedAt.toISOString()],
    ["Total Candidates", String(data.totalCandidates)],
    ["Average Score", String(data.averageScore)],
    [],
    ["CEFR Level", "Count"],
    ...Object.entries(data.cefrDistribution).sort().map(([l, c]) => [l, String(c)]),
    [],
    ["Skill", "Mean", "Median", "StdDev"],
    ...Object.entries(data.skillBreakdown).map(([s, st]) => [s, String(st.mean), String(st.median), String(st.stdDev)]),
    [],
    ["Top Performers"],
    ["Rank", "Name", "CEFR", "Score"],
    ...data.topPerformers.map((p, i) => [String(i + 1), p.name, p.cefrLevel, String(p.score)]),
  ];
  return Buffer.from(rows.map((r) => r.map(escapeCSV).join(",")).join("\n"));
}

// ---------------------------------------------------------------------------
// Unified export entry point
// ---------------------------------------------------------------------------

export class ReportGenerator {
  static async generateCandidateReport(candidateId: string, format: ReportFormat): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const data = await buildCandidateReport(candidateId);

    if (format === "pdf") {
      return {
        buffer: await generateCandidatePDF(data),
        mimeType: "application/pdf",
        filename: `candidate-report-${candidateId}.pdf`,
      };
    }
    if (format === "excel") {
      return {
        buffer: await generateCandidateExcel(data),
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `candidate-report-${candidateId}.xlsx`,
      };
    }
    return {
      buffer: generateCandidateCSV(data),
      mimeType: "text/csv",
      filename: `candidate-report-${candidateId}.csv`,
    };
  }

  static async generateCohortReport(organizationId: string, format: ReportFormat): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const data = await buildCohortReport(organizationId);

    if (format === "pdf") {
      return {
        buffer: await generateCohortPDF(data),
        mimeType: "application/pdf",
        filename: `cohort-report-${organizationId}.pdf`,
      };
    }
    if (format === "excel") {
      return {
        buffer: await generateCohortExcel(data),
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `cohort-report-${organizationId}.xlsx`,
      };
    }
    return {
      buffer: generateCohortCSV(data),
      mimeType: "text/csv",
      filename: `cohort-report-${organizationId}.csv`,
    };
  }
}
