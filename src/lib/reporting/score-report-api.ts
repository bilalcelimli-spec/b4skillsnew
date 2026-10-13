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
 * API key SHA-256 digests are stored in Organization.apiKeyDigest.
 * Scores are published only when the current common report model is final.
 */

import { buildAssessmentReport } from "./assessment-report-model.js";
import { prisma } from "../prisma.js";
import crypto from "crypto";


// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreReportMeta {
  generated_at:    string;
  schema_version:  string;
  validity_days?:  number;
  sample_size?: number;
  sample_limit?: number;
  aggregation_scope?: string;
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
  product_line: string;
  report_status: string;
  scoring_complete: boolean;
  overall_theta:   number | null;
  overall_cefr:    string | null;
  sem:             number | null;
  ci_95_lo:        number | null;
  ci_95_hi:        number | null;
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
    avg_theta:         number | null;
    median_theta:      number | null;
    cefr_distribution: Record<string, number>;
    skill_averages:    Record<string, number>;
  };
  meta:  ScoreReportMeta;
  links: { self: string };
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
  if (!/^[a-f0-9]{64}$/i.test(storedDigest)) return false;
  return crypto.timingSafeEqual(Buffer.from(digest,'hex'), Buffer.from(storedDigest,'hex'));
}

/** Resolve the organisation from an API key (Bearer token) */
export async function resolveOrgFromApiKey(rawKey: string): Promise<{ id: string; name: string } | null> {
  if (!rawKey.startsWith("la_")) return null;
  const digest = crypto.createHash('sha256').update(rawKey).digest('hex');
  const org = await prisma.organization.findFirst({where:{apiKeyDigest:digest},select:{id:true,name:true,apiKeyDigest:true}});
  return org?.apiKeyDigest && verifyApiKey(rawKey,org.apiKeyDigest) ? {id:org.id,name:org.name} : null;
}

// ── Score builder ─────────────────────────────────────────────────────────────

async function buildReport(
  session: Awaited<ReturnType<typeof prisma.session.findUnique>>,
  baseUrl: string,
): Promise<ScoreReportEnvelope | null> {
  if (!session) return null;

  const [candidate,report,responses] = await Promise.all([
    prisma.user.findUnique({where:{id:session.candidateId},select:{id:true,email:true}}),
    prisma.scoreReport.findUnique({where:{sessionId:session.id}}),
    prisma.response.findMany({where:{sessionId:session.id},select:{itemId:true,metadata:true,score:true,isPretest:true,item:{select:{skill:true}}}}),
  ]);
  const model = buildAssessmentReport({...session,scoreReport:report,responses},baseUrl);
  const final = model.status === 'Completed' && model.theta !== null && model.cefr !== null;
  const skills: SkillScore[] = final ? model.skills
    .filter(skill=>skill.theta!==null && skill.sem!==null && skill.cefr!==null)
    .map(skill=>({skill:skill.skill,theta:skill.theta!,cefr_band:skill.cefr!,sem:skill.sem!,responses:skill.count??0})) : [];
  const theta = final ? model.theta : null, sem = final ? model.sem : null;
  const z95 = 1.96;
  const validUntil = model.validUntil;

  return {
    data: {
      session_id:      session.id,
      candidate_id:    session.candidateId,
      candidate_email: candidate?.email ?? "",
      org_id:          session.organizationId,
      status:          session.status,
      product_line:model.productLine,report_status:model.status,scoring_complete:final,
      overall_theta:   theta,
      overall_cefr:    final ? model.cefr : null,
      sem,
      ci_95_lo:        theta !== null && sem !== null ? parseFloat((theta - z95 * sem).toFixed(3)) : null,
      ci_95_hi:        theta !== null && sem !== null ? parseFloat((theta + z95 * sem).toFixed(3)) : null,
      skills,
      started_at:      session.startedAt?.toISOString() ?? null,
      completed_at:    session.completedAt?.toISOString() ?? null,
      valid_until:     validUntil instanceof Date ? validUntil.toISOString() : validUntil,
    },
    meta:  { generated_at: new Date().toISOString(), schema_version: "2.0.0" },
    links: { self: `${baseUrl}/api/reports/scores/${session.id}` },
  };
}

// ── ScoreReportService ────────────────────────────────────────────────────────

export class ScoreReportService {

  static async getSessionReport(sessionId: string, orgId: string | null, baseUrl: string): Promise<ScoreReportEnvelope | null> {
    const session = await prisma.session.findFirst({ where: { id: sessionId, organizationId: orgId } });
    return buildReport(session, baseUrl);
  }

  static async getCandidateHistory(
    candidateId: string,
    orgId: string | null,
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
      meta:  { generated_at: new Date().toISOString(), schema_version: "2.0.0", total },
      links: { self: `${baseUrl}/api/reports/candidates/${candidateId}/history` },
    };
  }

  static async getOrgAggregate(orgId: string, baseUrl: string): Promise<OrgAggregateEnvelope> {
    const sessions = await prisma.session.findMany({
      where:{organizationId:orgId,status:'COMPLETED'},
      include:{scoreReport:true,responses:{select:{itemId:true,score:true,isPretest:true,metadata:true,item:{select:{skill:true}}}}},
      orderBy:{completedAt:'desc'},take:10_000,
    });
    const models = sessions.map(session=>buildAssessmentReport(session,baseUrl))
      .filter(model=>model.status==='Completed' && model.theta!==null && model.cefr!==null);
    const thetas=models.map(model=>model.theta!).sort((a,b)=>a-b);
    const avgTheta=thetas.length ? thetas.reduce((a,b)=>a+b,0)/thetas.length : null;
    const midIdx=Math.floor(thetas.length/2);
    const medTheta=thetas.length ? thetas.length%2 ? thetas[midIdx] : (thetas[midIdx-1]+thetas[midIdx])/2 : null;
    const cefrDist:Record<string,number>={},skillValues:Record<string,number[]>={};
    for(const model of models){
      cefrDist[model.cefr!]=(cefrDist[model.cefr!]??0)+1;
      for(const skill of model.skills)if(skill.theta!==null && skill.cefr!==null){
        (skillValues[skill.skill]??=[]).push(skill.theta);
      }
    }

    return {
      data: {
        org_id:            orgId,
        total_sessions:    await prisma.session.count({ where: { organizationId: orgId } }),
        completed:         models.length,
        avg_theta:         avgTheta===null ? null : parseFloat(avgTheta.toFixed(3)),
        median_theta:      medTheta===null ? null : parseFloat(medTheta.toFixed(3)),
        cefr_distribution: cefrDist,
        skill_averages: Object.fromEntries(Object.entries(skillValues).map(([skill,values])=>[skill,values.reduce((a,b)=>a+b,0)/values.length])),
      },
      meta: {generated_at:new Date().toISOString(),schema_version:"2.0.0",sample_size:sessions.length,sample_limit:10000,aggregation_scope:"latest completed sessions with final valid evidence only"},
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
