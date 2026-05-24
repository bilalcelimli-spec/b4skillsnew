/**
 * Score Reporting API
 * ─────────────────────────────────────────────────────────────────────────────
 * Structured, machine-readable score reports for external systems.
 *
 *   • JSON:API-compatible response envelope (data / meta / links)
 *   • API key authentication (Authorization: Bearer <api-key>)
 *   • Organisation-scoped: a key can only read scores within its org
 *   • Per-session, per-candidate history, org aggregate, and batch modes
 *   • CEFR band + theta + SEM + 95% CI + per-skill breakdown
 *   • ISO 8601 dates, snake_case keys for interoperability
 *
 * API keys are stored in the Organisation.apiKey field (bcrypt-hashed header
 * value; plain-text prefix stored separately for lookup).
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreReportMeta {
  generated_at:    string;
  schema_version:  string;
  validity_days?:  number;
}

export interface SkillScore {
  skill:     string;
  theta:     number;
  cefr_band: string;
  sem:       number;
  responses: number;
}

export interface ScoreReportData {
  session_id:      string;
  candidate_id:    string;
  candidate_email: string;
  org_id:          string;
  status:          string;
  overall_theta:   number;
  overall_cefr:    string;
  sem:             number;
  ci_95_lo:        number;
  ci_95_hi:        number;
  skills:          SkillScore[];
  started_at:      string | null;
  completed_at:    string | null;
  valid_until?:    string | null;
}

export interface ScoreReportEnvelope {
  data:  ScoreReportData;
  meta:  ScoreReportMeta;
  links: { self: string };
}

export interface CandidateHistoryEnvelope {
  data:  ScoreReportData[];
  meta:  ScoreReportMeta & { total: number };
  links: { self: string };
}

export interface OrgAggregateEnvelope {
  data: {
    org_id:            string;
    total_sessions:    number;
    completed:         number;
    avg_theta:         number;
    median_theta:      number;
    cefr_distribution: Record<string, number>;
    skill_averages:    Record<string, number>;
  };
  meta:  ScoreReportMeta;
  links: { self: string };
}

// ── IRT helpers ───────────────────────────────────────────────────────────────

const CEFR_BANDS = [
  { band: "A1", lo: -4.0, hi: -2.5 },
  { band: "A2", lo: -2.5, hi: -1.0 },
  { band: "B1", lo: -1.0, hi:  0.5 },
  { band: "B2", lo:  0.5, hi:  1.5 },
  { band: "C1", lo:  1.5, hi:  2.5 },
  { band: "C2", lo:  2.5, hi:  4.0 },
];

function thetaToCefr(theta: number): string {
  for (const { band, lo, hi } of CEFR_BANDS) if (theta >= lo && theta < hi) return band;
  return theta < -4 ? "A1" : "C2";
}

// ── API key management ────────────────────────────────────────────────────────

/** Generate a new API key; returns the plain-text key and its SHA-256 digest for storage. */
export function generateApiKey(): { key: string; digest: string } {
  const raw    = `la_${crypto.randomBytes(32).toString("hex")}`;
  const digest = crypto.createHash("sha256").update(raw).digest("hex");
  return { key: raw, digest };
}

/** Verify an Authorization header value against a stored digest */
export function verifyApiKey(rawKey: string, storedDigest: string): boolean {
  const digest = crypto.createHash("sha256").update(rawKey).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(storedDigest));
}

/** Resolve the organisation from an API key (Bearer token) */
export async function resolveOrgFromApiKey(rawKey: string): Promise<{ id: string; name: string } | null> {
  if (!rawKey.startsWith("la_")) return null;
  // Retrieve all orgs that have an apiKeyDigest set (paginated if needed)
  const orgs = await prisma.organization.findMany({
    where:  { apiKeyDigest: { not: null } },
    select: { id: true, name: true, apiKeyDigest: true },
    take:   500,
  });
  for (const org of orgs) {
    if (org.apiKeyDigest && verifyApiKey(rawKey, org.apiKeyDigest)) {
      return { id: org.id, name: org.name };
    }
  }
  return null;
}

// ── Score builder ─────────────────────────────────────────────────────────────

async function buildReport(
  session: Awaited<ReturnType<typeof prisma.session.findUnique>>,
  baseUrl: string,
): Promise<ScoreReportEnvelope | null> {
  if (!session) return null;

  const candidate = await prisma.user.findUnique({ where: { id: session.candidateId }, select: { id: true, email: true } });
  const report    = await prisma.scoreReport.findUnique({ where: { sessionId: session.id } });
  const responses = await prisma.response.findMany({ where: { sessionId: session.id }, select: { metadata: true, score: true, isCorrect: true } });

  // Aggregate per-skill from response metadata
  const skillMap: Record<string, { sumTheta: number; count: number; sumScore: number }> = {};
  for (const r of responses) {
    const meta  = (r.metadata ?? {}) as any;
    const skill = meta?.skill ?? meta?.diagnosticSkill;
    if (!skill) continue;
    if (!skillMap[skill]) skillMap[skill] = { sumTheta: 0, count: 0, sumScore: 0 };
    skillMap[skill].count++;
    skillMap[skill].sumScore += r.score ?? (r.isCorrect ? 1 : 0);
  }

  // Pull per-skill theta from ScoreReport if available
  const skillBreakdown = (report?.skillBreakdown ?? {}) as Record<string, any>;
  const skills: SkillScore[] = Object.keys(skillBreakdown).map((sk) => {
    const s = skillBreakdown[sk];
    return {
      skill:     sk,
      theta:     s.theta ?? 0,
      cefr_band: s.cefrBand ?? thetaToCefr(s.theta ?? 0),
      sem:       s.sem ?? 0.5,
      responses: skillMap[sk]?.count ?? 0,
    };
  });

  const theta    = session.theta ?? 0;
  const sem      = session.sem ?? 0.5;
  const z95      = 1.96;
  const validUntil = (session as any).validUntil ?? null;

  return {
    data: {
      session_id:      session.id,
      candidate_id:    session.candidateId,
      candidate_email: candidate?.email ?? "",
      org_id:          session.organizationId,
      status:          session.status,
      overall_theta:   theta,
      overall_cefr:    session.cefrLevel ?? thetaToCefr(theta),
      sem,
      ci_95_lo:        parseFloat((theta - z95 * sem).toFixed(3)),
      ci_95_hi:        parseFloat((theta + z95 * sem).toFixed(3)),
      skills,
      started_at:      session.startedAt?.toISOString() ?? null,
      completed_at:    session.completedAt?.toISOString() ?? null,
      valid_until:     validUntil instanceof Date ? validUntil.toISOString() : validUntil,
    },
    meta:  { generated_at: new Date().toISOString(), schema_version: "1.0.0" },
    links: { self: `${baseUrl}/api/reports/scores/${session.id}` },
  };
}

// ── ScoreReportService ────────────────────────────────────────────────────────

export class ScoreReportService {

  static async getSessionReport(sessionId: string, orgId: string, baseUrl: string): Promise<ScoreReportEnvelope | null> {
    const session = await prisma.session.findFirst({ where: { id: sessionId, organizationId: orgId } });
    return buildReport(session, baseUrl);
  }

  static async getCandidateHistory(
    candidateId: string,
    orgId: string,
    baseUrl: string,
    limit = 20,
    offset = 0,
  ): Promise<CandidateHistoryEnvelope> {
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where:   { candidateId, organizationId: orgId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take:    limit,
        skip:    offset,
      }),
      prisma.session.count({ where: { candidateId, organizationId: orgId, status: "COMPLETED" } }),
    ]);

    const reports = (await Promise.all(sessions.map((s) => buildReport(s, baseUrl)))).filter(Boolean) as ScoreReportEnvelope[];
    return {
      data:  reports.map((r) => r.data),
      meta:  { generated_at: new Date().toISOString(), schema_version: "1.0.0", total },
      links: { self: `${baseUrl}/api/reports/candidates/${candidateId}/history` },
    };
  }

  static async getOrgAggregate(orgId: string, baseUrl: string): Promise<OrgAggregateEnvelope> {
    const sessions = await prisma.session.findMany({
      where:  { organizationId: orgId, status: "COMPLETED" },
      select: { theta: true, cefrLevel: true, metadata: true },
      take:   10_000,
    });

    const thetas    = sessions.map((s) => s.theta ?? 0).sort((a, b) => a - b);
    const avgTheta  = thetas.length ? thetas.reduce((a, b) => a + b, 0) / thetas.length : 0;
    const midIdx    = Math.floor(thetas.length / 2);
    const medTheta  = thetas.length ? thetas[midIdx] : 0;

    const cefrDist: Record<string, number> = {};
    for (const s of sessions) {
      const band = s.cefrLevel ?? thetaToCefr(s.theta ?? 0);
      cefrDist[band] = (cefrDist[band] ?? 0) + 1;
    }

    return {
      data: {
        org_id:            orgId,
        total_sessions:    await prisma.session.count({ where: { organizationId: orgId } }),
        completed:         sessions.length,
        avg_theta:         parseFloat(avgTheta.toFixed(3)),
        median_theta:      parseFloat(medTheta.toFixed(3)),
        cefr_distribution: cefrDist,
        skill_averages:    {},
      },
      meta:  { generated_at: new Date().toISOString(), schema_version: "1.0.0" },
      links: { self: `${baseUrl}/api/reports/organisations/${orgId}/aggregate` },
    };
  }

  static async batchReports(sessionIds: string[], orgId: string, baseUrl: string): Promise<ScoreReportData[]> {
    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds }, organizationId: orgId },
    });
    const reports = await Promise.all(sessions.map((s) => buildReport(s, baseUrl)));
    return reports.filter(Boolean).map((r) => (r as ScoreReportEnvelope).data);
  }
}
