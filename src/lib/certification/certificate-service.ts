import { prisma } from "../prisma";
import { CefrLevel } from "@prisma/client";

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
  skillScores: {
    reading: number;
    listening: number;
    speaking: number;
    writing: number;
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
    // Check if certificate already exists
    const existing = await prisma.scoreReport.findUnique({
      where: { sessionId: sessionData.sessionId }
    });

    if (existing) {
      // Certificate issuance is explicit. A score report is not publicly
      // verifiable until this operation records the issuance marker.
      const diagnosticReport = (existing.diagnosticReport as Record<string, unknown> | null) ?? {};
      const certificateIssuedAt = typeof diagnosticReport.certificateIssuedAt === "string"
        ? diagnosticReport.certificateIssuedAt
        : new Date().toISOString();
      const issued = existing.isVerified && existing.certificateUrl && diagnosticReport.certificateIssuedAt
        ? existing
        : await prisma.scoreReport.update({
            where: { id: existing.id },
            data: {
              isVerified: true,
              certificateUrl: `/verify/${existing.id}`,
              diagnosticReport: {
                ...diagnosticReport,
                certificateIssuedAt,
              },
            },
          });
      return this.mapToCertificate(issued, candidateProfile, orgBranding);
    }

    // Create new score report (certificate)
    const overallScore = Math.round((sessionData.theta + 3) * 16.6);
    const report = await prisma.scoreReport.create({
      data: {
        sessionId: sessionData.sessionId,
        overallCefr: sessionData.cefr as CefrLevel,
        overallScore, // Map -3..3 to 0..100
        readingScore: null,
        listeningScore: null,
        speakingScore: null,
        writingScore: null,
        isVerified: true
      }
    });
    const issued = await prisma.scoreReport.update({
      where: { id: report.id },
      data: {
        certificateUrl: `/verify/${report.id}`,
        diagnosticReport: { certificateIssuedAt: new Date().toISOString() },
      },
    });

    return this.mapToCertificate(issued, candidateProfile, orgBranding);
  },

  /**
   * Map Prisma ScoreReport to Certificate interface
   */
  mapToCertificate(report: any, candidateProfile: any, orgBranding: any): Certificate {
    const diagnosticReport = (report.diagnosticReport as Record<string, unknown> | null) ?? {};
    const issuedAtValue = diagnosticReport.certificateIssuedAt;
    const issuedAt = typeof issuedAtValue === "string" ? new Date(issuedAtValue) : report.createdAt;
    const expiresAt = new Date(issuedAt);
    expiresAt.setFullYear(issuedAt.getFullYear() + 2);

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
      theta: (report.overallScore / 16.6) - 3,
      skillScores: {
        reading: report.readingScore || 0,
        listening: report.listeningScore || 0,
        speaking: report.speakingScore || 0,
        writing: report.writingScore || 0
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
            organization: true
          }
        }
      }
    });

    // Public lookup must never issue a certificate as a side effect. Only
    // reports explicitly marked by generateCertificate are valid certificates.
    if (!report || !report.isVerified || !report.certificateUrl) return null;

    return this.mapToCertificate(report, report.session.candidate, {
      organizationId: report.session.organizationId,
      name: report.session.organization.name
    });
  }
};
