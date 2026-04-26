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
      return this.mapToCertificate(existing, candidateProfile, orgBranding);
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

    return this.mapToCertificate(report, candidateProfile, orgBranding);
  },

  /**
   * Map Prisma ScoreReport to Certificate interface
   */
  mapToCertificate(report: any, candidateProfile: any, orgBranding: any): Certificate {
    const issuedAt = report.createdAt;
    const expiresAt = new Date(issuedAt);
    expiresAt.setFullYear(issuedAt.getFullYear() + 2);

    const appBase = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
    const verifyUrl = `${appBase}/verify/${report.id}`;
    return {
      id: report.id,
      sessionId: report.sessionId,
      candidateId: candidateProfile.uid,
      candidateName: candidateProfile.displayName,
      organizationId: orgBranding.organizationId,
      organizationName: orgBranding.name,
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
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`
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

    if (!report) return null;

    return this.mapToCertificate(report, report.session.candidate, {
      organizationId: report.session.organizationId,
      name: report.session.organization.name
    });
  }
};
