import { prisma } from "../prisma";
import { hasCompleteScoringEvidence, scoringRequirements } from '../scoring/score-evidence.js';
import { computeValidUntil } from '../certificates/validity-policy.js';

export class CertificateNotReadyError extends Error {}

export function isCertificateReady(report: any, session: any, now = new Date()): boolean {
  if (report?.isVerified !== true || !session || session.status !== 'COMPLETED' || !session.completedAt ||
      !Number.isFinite(session.theta) || !Number.isFinite(session.sem) || session.sem <= 0 || !Number.isFinite(report.overallScore) || report.overallScore < 0 || report.overallScore > 100 ||
      report.diagnosticReport?.scoringComplete !== true || report.diagnosticReport?.securityFlag === true || session.metadata?.securityFlag === true) return false;
  const issuedAt = report.diagnosticReport?.certificateIssuedAt;
  if (issuedAt !== undefined && (typeof issuedAt !== 'string' || !Number.isFinite(new Date(issuedAt).getTime()) || new Date(issuedAt) > now)) return false;
  const expiry = session.validUntil ?? computeValidUntil(new Date(session.completedAt));
  if (!Number.isFinite(new Date(expiry).getTime()) || new Date(expiry) <= now) return false;
  const required = scoringRequirements(session.metadata);
  const scoreFields: Record<string,string> = {READING:'readingScore',LISTENING:'listeningScore',WRITING:'writingScore',SPEAKING:'speakingScore',GRAMMAR:'grammarScore',VOCABULARY:'vocabularyScore'};
  return hasCompleteScoringEvidence(session.responses ?? [], required) && Object.keys(required).every(skill => {
    const score = report[scoreFields[skill]];
    return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;
  });
}

/**
 * b4skills Certification Service
 * Generates secure, verifiable proficiency certificates using Prisma.
 */

export interface Certificate {
  id: string;
  sessionId: string;
  candidateId: string;
  candidateName: string;
  organizationId: string;
  organizationName: string;
  cefrLevel: string;
  theta: number;
  overallScore: number;
  skillScores: {
    reading: number | null;
    listening: number | null;
    speaking: number | null;
    writing: number | null;
    grammar: number | null;
    vocabulary: number | null;
  };
  issuedAt: Date;
  expiresAt: Date;
  verificationUrl: string;
  qrCodeUrl: string;
}

export const CertificateService = {
  /**
   * Generate a certificate upon session completion
   */
  async generateCertificate(sessionData: any, candidateProfile: any, orgBranding: any): Promise<Certificate> {
    if (typeof sessionData?.sessionId !== 'string') throw new CertificateNotReadyError('sessionId is required');
    return prisma.$transaction(async tx => {
      // Finalization uses the same Session -> ScoreReport lock order.
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${sessionData.sessionId} FOR UPDATE`;
      const session = await tx.session.findUnique({ where: { id: sessionData.sessionId }, include: {
        responses: { include: { item: { select: { skill: true } } } }, candidate: true, organization: true,
      } });
      const existing = await tx.scoreReport.findUnique({ where: { sessionId: sessionData.sessionId } });
      if (!isCertificateReady(existing, session)) throw new CertificateNotReadyError('Scoring and required skill evidence must be complete before certification');
      const diagnostic = (existing!.diagnosticReport ?? {}) as Record<string, unknown>;
      const certificateIssuedAt = typeof diagnostic.certificateIssuedAt === 'string' ? diagnostic.certificateIssuedAt : new Date().toISOString();
      const issued = existing!.certificateUrl && diagnostic.certificateIssuedAt ? existing! : await tx.scoreReport.update({
        where: { id: existing!.id }, data: { certificateUrl: `/verify/${existing!.id}`, diagnosticReport: { ...diagnostic, certificateIssuedAt } },
      });
      // Identity, scores and expiry all come from stored assessment data.
      return this.mapToCertificate(issued, session!.candidate, {organizationId:session!.organizationId,name:session!.organization.name}, session);
    });
  },

  /**
   * Map Prisma ScoreReport to Certificate interface
   */
  mapToCertificate(report: any, candidateProfile: any, orgBranding: any, session?: any): Certificate {
    const diagnosticReport = (report.diagnosticReport as Record<string, unknown> | null) ?? {};
    const issuedAtValue = diagnosticReport.certificateIssuedAt;
    const issuedAt = typeof issuedAtValue === "string" ? new Date(issuedAtValue) : report.createdAt;
    const expiresAt = session?.validUntil ? new Date(session.validUntil) : computeValidUntil(new Date(session?.completedAt ?? issuedAt));

    const appBase = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
    const verifyUrl = appBase
      ? `${appBase}/verify/${report.id}`
      : `/verify/${report.id}`;   // relative – client will prepend origin

    // Resolve candidate identity defensively
    const candidateName =
      candidateProfile?.displayName ||
      candidateProfile?.name ||
      (candidateProfile?.email ? candidateProfile.email.split("@")[0] : "Candidate");

    const candidateId =
      candidateProfile?.uid ||
      candidateProfile?.id ||
      candidateProfile?.candidateId ||
      "unknown";

    return {
      id: report.id,
      sessionId: report.sessionId,
      candidateId,
      candidateName,
      organizationId: orgBranding?.organizationId || "",
      organizationName: orgBranding?.name || "b4skills",
      cefrLevel: report.overallCefr,
      overallScore: report.overallScore,
      theta: session?.theta ?? report.diagnosticReport?.overallTheta ?? (report.overallScore / 100) * 8 - 4,
      skillScores: {
        reading: report.readingScore ?? null,
        listening: report.listeningScore ?? null,
        speaking: report.speakingScore ?? null,
        writing: report.writingScore ?? null,
        grammar: report.grammarScore ?? null,
        vocabulary: report.vocabularyScore ?? null
      },
      issuedAt,
      expiresAt,
      verificationUrl: verifyUrl,
      // qrCodeUrl kept for backwards-compat but CertificateView now generates it client-side
      qrCodeUrl: verifyUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`
        : ""
    };
  },

  /**
   * Verify a certificate
   */
  async verifyCertificate(id: string): Promise<Certificate | null> {
    const report = await prisma.scoreReport.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            candidate: true,
            organization: true,
            responses: { include: { item: { select: { skill: true } } } }
          }
        }
      }
    });

    // Public lookup must never issue a certificate as a side effect. Only
    // reports explicitly marked by generateCertificate are valid certificates.
    if (!report || !report.certificateUrl || !report.diagnosticReport || !(report.diagnosticReport as any).certificateIssuedAt || !isCertificateReady(report, report.session)) return null;

    return this.mapToCertificate(report, report.session.candidate, {
      organizationId: report.session.organizationId,
      name: report.session.organization.name
    }, report.session);
  }
};
