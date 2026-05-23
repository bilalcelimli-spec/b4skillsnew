/**
 * b4skills Privacy Manager — GDPR / LGPD / CCPA / PIPEDA
 *
 * Implements:
 *  - Data export (Right of Access — GDPR Art. 15)
 *  - Deletion request + anonymisation (Right to Erasure — Art. 17)
 *  - Consent management (Art. 6 lawful basis)
 *  - Audit trail for all compliance events
 *  - Automated retention policy enforcement
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrivacySettings {
  userId: string;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  thirdPartyConsent: boolean;
  dataRetentionDays: number;
  consentVersion: string;
  lastUpdated: Date;
}

export interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface DataExportBundle {
  generatedAt: string;
  format: "json";
  subject: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  };
  profile: Record<string, unknown> | null;
  sessions: Array<{
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    cefrLevel: string | null;
    score: number | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
  consents: ConsentRecord[];
  retentionPolicy: {
    dataRetainedUntil: string;
    basis: string;
  };
}

export interface DeletionRequest {
  requestId: string;
  userId: string;
  requestedAt: Date;
  scheduledFor: Date;
  status: "pending" | "approved" | "completed" | "rejected";
  actorAdminId: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// In-memory consent store (replace with DB table in production)
// ---------------------------------------------------------------------------

const consentStore = new Map<string, PrivacySettings>();
const consentHistory: ConsentRecord[] = [];
const deletionRequests = new Map<string, DeletionRequest>();

// ---------------------------------------------------------------------------
// Privacy Manager
// ---------------------------------------------------------------------------

export class PrivacyManager {
  private readonly DATA_RETENTION_DAYS_DEFAULT = 730; // 2 years
  private readonly CONSENT_VERSION = "2.0";

  // -------------------------------------------------------------------------
  // Consent management
  // -------------------------------------------------------------------------

  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    if (consentStore.has(userId)) {
      return consentStore.get(userId)!;
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User ${userId} not found`);

    const defaults: PrivacySettings = {
      userId,
      analyticsConsent: false,
      marketingConsent: false,
      thirdPartyConsent: false,
      dataRetentionDays: this.DATA_RETENTION_DAYS_DEFAULT,
      consentVersion: this.CONSENT_VERSION,
      lastUpdated: new Date(),
    };
    consentStore.set(userId, defaults);
    return defaults;
  }

  async updateConsent(
    userId: string,
    consents: {
      analyticsConsent?: boolean;
      marketingConsent?: boolean;
      thirdPartyConsent?: boolean;
    },
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<PrivacySettings> {
    const current = await this.getPrivacySettings(userId);
    const updated: PrivacySettings = {
      ...current,
      ...consents,
      consentVersion: this.CONSENT_VERSION,
      lastUpdated: new Date(),
    };
    consentStore.set(userId, updated);

    // Record consent history
    for (const [type, granted] of Object.entries(consents)) {
      consentHistory.push({
        userId,
        consentType: type,
        granted: granted as boolean,
        version: this.CONSENT_VERSION,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        timestamp: new Date(),
      });
    }

    await this.logComplianceEvent(userId, "CONSENT_UPDATED", {
      changes: consents,
      version: this.CONSENT_VERSION,
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // Data export (GDPR Art. 15 — Right of Access)
  // -------------------------------------------------------------------------

  async requestDataExport(userId: string, actorAdminId: string): Promise<{ requestId: string; message: string }> {
    const requestId = `export-${userId}-${Date.now()}`;
    await this.logComplianceEvent(userId, "DATA_EXPORT_REQUESTED", { requestId, requestedBy: actorAdminId });
    return { requestId, message: "Export will be available within 24 hours." };
  }

  async completeDataExport(userId: string): Promise<DataExportBundle> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            cefrLevel: true,
            theta: true,
          },
        },
      },
    });

    if (!user) throw new Error(`User ${userId} not found`);

    // Fetch candidate profile safely
    const candidateProfile = await (prisma as any).candidateProfile?.findUnique?.({ where: { userId } }).catch(() => null) ?? null;

    // Fetch audit logs safely (table may not exist in all migrations)
    let auditLogs: Array<{ id: string; action: string; createdAt: Date }> = [];
    try {
      auditLogs = await (prisma as any).auditLog.findMany({
        where: { userId },
        select: { id: true, action: true, createdAt: true },
        take: 200,
      });
    } catch {
      // AuditLog table may not exist — silently skip
    }

    const userConsents = consentHistory.filter((c) => c.userId === userId);
    const settings = await this.getPrivacySettings(userId);

    const retainUntil = new Date();
    retainUntil.setDate(retainUntil.getDate() + settings.dataRetentionDays);

    const bundle: DataExportBundle = {
      generatedAt: new Date().toISOString(),
      format: "json",
      subject: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      profile: candidateProfile ? (candidateProfile as Record<string, unknown>) : null,
      sessions: user.sessions.map((s) => ({
        id: s.id,
        status: s.status,
        startedAt: s.createdAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        cefrLevel: s.cefrLevel ?? null,
        score: s.theta !== null ? Math.round((s.theta + 3) * (100 / 6)) : null,
      })),
      auditLogs: auditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        createdAt: l.createdAt.toISOString(),
      })),
      consents: userConsents,
      retentionPolicy: {
        dataRetainedUntil: retainUntil.toISOString(),
        basis: "Legitimate interest in assessment integrity and certification validity",
      },
    };

    await this.logComplianceEvent(userId, "DATA_EXPORT_COMPLETED", {
      sessionCount: bundle.sessions.length,
    });

    return bundle;
  }

  // -------------------------------------------------------------------------
  // Deletion / Anonymisation (GDPR Art. 17 — Right to Erasure)
  // -------------------------------------------------------------------------

  async requestDeletion(
    userId: string,
    actorAdminId: string,
    reason?: string
  ): Promise<DeletionRequest> {
    const requestId = `del-${userId}-${Date.now()}`;
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30); // 30-day grace period

    const req: DeletionRequest = {
      requestId,
      userId,
      requestedAt: new Date(),
      scheduledFor,
      status: "pending",
      actorAdminId,
      reason,
    };
    deletionRequests.set(requestId, req);

    await this.logComplianceEvent(userId, "DELETION_REQUESTED", {
      requestId,
      requestedBy: actorAdminId,
      scheduledFor: scheduledFor.toISOString(),
      reason,
    });

    return req;
  }

  async anonymizeCandidate(userId: string, actorAdminId: string): Promise<void> {
    const anonEmail = `anonymised-${userId}@gdpr.erased`;
    const anonName = "ANONYMISED";

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonEmail,
        name: anonName,
        password: null,
      },
    });

    await this.logComplianceEvent(userId, "CANDIDATE_ANONYMISED", { anonymisedBy: actorAdminId });
  }

  async completeDelete(requestId: string, actorAdminId: string): Promise<void> {
    const request = deletionRequests.get(requestId);
    if (!request) throw new Error(`Deletion request ${requestId} not found`);
    if (request.status !== "pending") throw new Error(`Request is already ${request.status}`);

    const { userId } = request;

    // Delete in FK-safe order
    await prisma.response.deleteMany({ where: { session: { candidateId: userId } } });
    await prisma.session.deleteMany({ where: { candidateId: userId } });

    // Anonymise user record instead of hard-delete to preserve audit trail
    await this.anonymizeCandidate(userId, actorAdminId);

    // Clear consent records
    consentStore.delete(userId);

    request.status = "completed";
    deletionRequests.set(requestId, request);

    await this.logComplianceEvent(userId, "DELETION_COMPLETED", {
      requestId,
      completedBy: actorAdminId,
    });
  }

  // -------------------------------------------------------------------------
  // Retention policy enforcement
  // -------------------------------------------------------------------------

  async deleteExpiredData(): Promise<{ deletedSessions: number; deletedResponses: number }> {
    const results = { deletedSessions: 0, deletedResponses: 0 };

    // Default: delete sessions older than 2 years
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);

    const expiredSessions = await prisma.session.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
    });

    if (expiredSessions.length > 0) {
      const sessionIds = expiredSessions.map((s) => s.id);
      const { count: responseCount } = await prisma.response.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      const { count: sessionCount } = await prisma.session.deleteMany({
        where: { id: { in: sessionIds } },
      });
      results.deletedSessions = sessionCount;
      results.deletedResponses = responseCount;
    }

    console.log(`♻️  Retention sweep: ${results.deletedSessions} sessions, ${results.deletedResponses} responses removed`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Audit log
  // -------------------------------------------------------------------------

  async getAuditLog(userId: string, limit = 100): Promise<ConsentRecord[]> {
    return consentHistory.filter((c) => c.userId === userId).slice(-limit);
  }

  async getDeletionRequests(userId?: string): Promise<DeletionRequest[]> {
    const all = [...deletionRequests.values()];
    return userId ? all.filter((r) => r.userId === userId) : all;
  }

  private async logComplianceEvent(userId: string, action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await (prisma as any).auditLog.create({
        data: {
          userId,
          action: `PRIVACY:${action}`,
          details: JSON.stringify(details),
          createdAt: new Date(),
        },
      });
    } catch {
      // AuditLog table optional — log to console as fallback
      console.log(`[COMPLIANCE] ${action} for user=${userId}:`, details);
    }
  }
}

export const privacyManager = new PrivacyManager();
