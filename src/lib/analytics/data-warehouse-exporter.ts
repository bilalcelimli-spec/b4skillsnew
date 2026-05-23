/**
 * b4skills Data Warehouse Exporter
 *
 * Exports assessment data for BI tools (Tableau, Power BI, Looker).
 * Formats: JSON (REST API), CSV, Parquet (via parquetjs if available).
 * Supports S3 upload if AWS credentials are configured.
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssessmentExportRow {
  sessionId: string;
  candidateId: string;
  organizationId: string;
  skill: string;
  cefrLevel: string;
  overallScore: number;
  theta: number;
  completedAt: string;
  durationMinutes: number;
  itemCount: number;
  correctCount: number;
  accuracy: number;
}

export interface ExportOptions {
  organizationId?: string;
  from?: Date;
  to?: Date;
  skills?: string[];
  limit?: number;
  format: "json" | "csv" | "parquet";
}

export interface ExportResult {
  rowCount: number;
  format: string;
  data: Buffer | AssessmentExportRow[];
  filename: string;
  exportedAt: Date;
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchExportRows(options: ExportOptions): Promise<AssessmentExportRow[]> {
  const where: Record<string, unknown> = { status: "COMPLETED" };
  if (options.organizationId) where.organizationId = options.organizationId;
  if (options.from || options.to) {
    where.completedAt = {};
    if (options.from) (where.completedAt as any).gte = options.from;
    if (options.to)   (where.completedAt as any).lte = options.to;
  }

  const sessions = await prisma.session.findMany({
    where: where as any,
    orderBy: { completedAt: "desc" },
    take: options.limit ?? 10_000,
    include: {
      responses: { select: { isCorrect: true } },
    },
  });

  return sessions
    .filter((s) => s.completedAt !== null)
    .map((s) => {
      const durationMs = s.completedAt!.getTime() - s.createdAt.getTime();
      const correctCount = s.responses.filter((r: any) => r.isCorrect).length;
      const itemCount = s.responses.length;

      return {
        sessionId: s.id,
        candidateId: s.candidateId,
        organizationId: s.organizationId ?? "",
        skill: "OVERALL",
        cefrLevel: s.cefrLevel ?? "A1",
        overallScore: Math.round((s.theta ?? 0 + 3) * (100 / 6)), // convert theta to 0-100
        theta: s.theta ?? 0,
        completedAt: s.completedAt!.toISOString(),
        durationMinutes: Math.round(durationMs / 60_000),
        itemCount,
        correctCount,
        accuracy: itemCount > 0 ? Math.round((correctCount / itemCount) * 100) : 0,
      };
    });
}

// ---------------------------------------------------------------------------
// Format converters
// ---------------------------------------------------------------------------

function escapeCSV(v: unknown): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCSV(rows: AssessmentExportRow[]): Buffer {
  if (rows.length === 0) return Buffer.from("");
  const headers = Object.keys(rows[0]) as (keyof AssessmentExportRow)[];
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(",")),
  ];
  return Buffer.from(lines.join("\n"), "utf8");
}

async function rowsToParquet(rows: AssessmentExportRow[]): Promise<Buffer> {
  try {
    // @ts-ignore — parquetjs optional dependency; install with: npm i parquetjs
    const parquet = await import("parquetjs");
    const schema = new parquet.ParquetSchema({
      sessionId:      { type: "UTF8" },
      candidateId:    { type: "UTF8" },
      organizationId: { type: "UTF8" },
      skill:          { type: "UTF8" },
      cefrLevel:      { type: "UTF8" },
      overallScore:   { type: "DOUBLE" },
      theta:          { type: "DOUBLE" },
      completedAt:    { type: "UTF8" },
      durationMinutes:{ type: "INT32" },
      itemCount:      { type: "INT32" },
      correctCount:   { type: "INT32" },
      accuracy:       { type: "DOUBLE" },
    });

    // Write to in-memory buffer via temp path approach
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs/promises");
    const tmpPath = path.join(os.tmpdir(), `b4skills-export-${Date.now()}.parquet`);

    const writer = await parquet.ParquetWriter.openFile(schema, tmpPath);
    for (const row of rows) await writer.appendRow(row);
    await writer.close();

    const data = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath).catch(() => {});
    return data;
  } catch {
    // parquetjs not installed — fall back to JSON
    console.warn("[DataWarehouse] parquetjs not available, falling back to JSON");
    return Buffer.from(JSON.stringify(rows, null, 2), "utf8");
  }
}

// ---------------------------------------------------------------------------
// S3 Upload
// ---------------------------------------------------------------------------

async function uploadToS3(buffer: Buffer, key: string): Promise<string> {
  try {
    // @ts-ignore — @aws-sdk/client-s3 optional dependency; install with: npm i @aws-sdk/client-s3
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const bucket = process.env.DATA_WAREHOUSE_BUCKET ?? "b4skills-data-warehouse";
    const region = process.env.AWS_REGION ?? "eu-west-1";

    const client = new S3Client({ region });
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "application/octet-stream",
    }));

    return `s3://${bucket}/${key}`;
  } catch (err) {
    throw new Error(`S3 upload failed: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Main exporter
// ---------------------------------------------------------------------------

export class DataWarehouseExporter {
  async exportAssessments(options: ExportOptions): Promise<ExportResult> {
    const rows = await fetchExportRows(options);
    let data: Buffer;
    let filename: string;
    const ts = new Date().toISOString().split("T")[0];

    switch (options.format) {
      case "csv":
        data = rowsToCSV(rows);
        filename = `assessments-${ts}.csv`;
        break;
      case "parquet":
        data = await rowsToParquet(rows);
        filename = `assessments-${ts}.parquet`;
        break;
      default:
        data = Buffer.from(JSON.stringify(rows, null, 2), "utf8");
        filename = `assessments-${ts}.json`;
    }

    return {
      rowCount: rows.length,
      format: options.format,
      data,
      filename,
      exportedAt: new Date(),
      sizeBytes: data.length,
    };
  }

  async exportToS3(options: ExportOptions, s3KeyPrefix = "exports"): Promise<string> {
    const result = await this.exportAssessments({ ...options, format: "parquet" });
    const key = `${s3KeyPrefix}/${result.filename}`;
    return uploadToS3(result.data as Buffer, key);
  }

  /** Get aggregate stats for BI dashboards (lightweight JSON endpoint) */
  async getBIMetrics(organizationId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    averageTheta: number;
    cefrDistribution: Record<string, number>;
    skillDistribution: Record<string, number>;
    dailyCompletions: Array<{ date: string; count: number }>;
  }> {
    const [total, completed] = await Promise.all([
      prisma.session.count({ where: { organizationId } }),
      prisma.session.count({ where: { organizationId, status: "COMPLETED" } }),
    ]);

    const recentSessions = await prisma.session.findMany({
      where: { organizationId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 500,
      select: { cefrLevel: true, theta: true, completedAt: true },
    });

    const cefrDist: Record<string, number> = {};
    const skillDist: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};
    let totalScore = 0;
    let totalTheta = 0;

    for (const s of recentSessions) {
      if (s.cefrLevel) cefrDist[s.cefrLevel] = (cefrDist[s.cefrLevel] ?? 0) + 1;
      skillDist["OVERALL"] = (skillDist["OVERALL"] ?? 0) + 1;
      if (s.completedAt) {
        const day = s.completedAt.toISOString().split("T")[0];
        dailyMap[day] = (dailyMap[day] ?? 0) + 1;
      }
      totalScore += Math.round(((s.theta ?? 0) + 3) * (100 / 6));
      totalTheta += s.theta ?? 0;
    }

    const n = recentSessions.length || 1;
    const dailyCompletions = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    return {
      totalSessions: total,
      completedSessions: completed,
      averageScore: Math.round(totalScore / n),
      averageTheta: Math.round((totalTheta / n) * 100) / 100,
      cefrDistribution: cefrDist,
      skillDistribution: skillDist,
      dailyCompletions,
    };
  }
}

export const dataWarehouseExporter = new DataWarehouseExporter();
