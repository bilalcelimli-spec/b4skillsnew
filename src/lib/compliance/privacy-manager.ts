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

import type { Prisma } from "@prisma/client";
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
// Consent storage: PrivacyConsent (current state) + PrivacyConsentEvent
// (append-only history). Both live in Postgres so every web instance sees the
// same consent and it survives restarts.
// ---------------------------------------------------------------------------

const CONSENT_TYPES = ["analyticsConsent", "marketingConsent", "thirdPartyConsent"] as const;
type ConsentType = typeof CONSENT_TYPES[number];

/** Keeps only known consent keys with boolean values; anything else is ignored. */
export function sanitizeConsentChanges(input: unknown): Partial<Record<ConsentType, boolean>> {
  const changes: Partial<Record<ConsentType, boolean>> = {};
  if (!input || typeof input !== "object") return changes;
  for (const type of CONSENT_TYPES) {
    const value = (input as Record<string, unknown>)[type];
    if (typeof value === "boolean") changes[type] = value;
  }
  return changes;
}

/** Erases a user's stored consents and their history (account erasure). */
export async function clearPrivacyCache(userId: string): Promise<void> {
  await prisma.privacyConsentEvent.deleteMany({ where: { userId } });
  await prisma.privacyConsent.deleteMany({ where: { userId } });
}

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
    const stored = await prisma.privacyConsent.findUnique({ where: { userId } });
    if (stored) {
      return {
        userId,
        analyticsConsent: stored.analyticsConsent,
        marketingConsent: stored.marketingConsent,
        thirdPartyConsent: stored.thirdPartyConsent,
        dataRetentionDays: stored.dataRetentionDays,
        consentVersion: stored.consentVersion,
        lastUpdated: stored.updatedAt,
      };
    }

    // No row yet: every optional processing is off until the user opts in.
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new Error(`User ${userId} not found`);
    return {
      userId,
      analyticsConsent: false,
      marketingConsent: false,
      thirdPartyConsent: false,
      dataRetentionDays: this.DATA_RETENTION_DAYS_DEFAULT,
      consentVersion: this.CONSENT_VERSION,
      lastUpdated: new Date(0),
    };
  }

  async updateConsent(
    userId: string,
    consents: unknown,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<PrivacySettings> {
    const changes = sanitizeConsentChanges(consents);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new Error(`User ${userId} not found`);

    // Current state and its history change together.
    await prisma.$transaction([
      prisma.privacyConsent.upsert({
        where: { userId },
        create: { userId, ...changes, dataRetentionDays: this.DATA_RETENTION_DAYS_DEFAULT, consentVersion: this.CONSENT_VERSION },
        update: { ...changes, consentVersion: this.CONSENT_VERSION },
      }),
      prisma.privacyConsentEvent.createMany({
        data: Object.entries(changes).map(([consentType, granted]) => ({
          userId,
          consentType,
          granted: granted as boolean,
          version: this.CONSENT_VERSION,
          ipAddress: meta?.ipAddress?.slice(0, 64) ?? null,
          userAgent: meta?.userAgent?.slice(0, 512) ?? null,
        })),
      }),
    ]);
    const updated = await this.getPrivacySettings(userId);

    await this.logComplianceEvent(userId, "CONSENT_UPDATED", {
      changes,
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

    const userConsents = await this.getAuditLog(userId, 1000);
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
    await this.requireDeletionAdmin(actorAdminId);
    const row = await prisma.privacyDeletionRequest.create({data:{userId,actorAdminId,
      reason:typeof reason==='string'?reason.slice(0,500):null}});
    return {...row,status:row.status as DeletionRequest['status'],reason:row.reason??undefined};
  }

  private async requireDeletionAdmin(actorAdminId: string) {
    const actor = await prisma.user.findUnique({where:{id:actorAdminId},select:{role:true}});
    if (!actor || !['SUPER_ADMIN','ASSESSMENT_DIRECTOR'].includes(actor.role)) throw new Error('Authorized privacy administrator required');
  }

  /** Compatibility entry point: performs erasure, not a misleading email-only anonymisation. */
  async anonymizeCandidate(userId: string, actorAdminId: string): Promise<void> {
    await this.requireDeletionAdmin(actorAdminId);
    const {eraseCandidateData}=await import('./account-deletion.js');
    const {deletePrivateObject,storageReference}=await import('../storage/private-storage.js');
    await eraseCandidateData(prisma,userId,{verifyPassword:async()=>false,deleteObject:deletePrivateObject,reference:storageReference});
  }

  async completeDelete(requestId: string, actorAdminId: string): Promise<void> {
    await this.requireDeletionAdmin(actorAdminId);
    const request=await prisma.privacyDeletionRequest.findUniqueOrThrow({where:{requestId}});
    if(!['pending','approved'].includes(request.status))throw new Error('Deletion request already closed');
    await this.anonymizeCandidate(request.userId,actorAdminId);
    await prisma.privacyDeletionRequest.update({where:{requestId},data:{status:'completed',reason:null}});
  }

  /** Legacy callers use the same release-gated policy as the scheduled worker. */
  async deleteExpiredData() {
    const {runRetentionSweep}=await import('./retention-sweep.js');
    return runRetentionSweep(prisma,{apply:process.env.RETENTION_APPLY_ENABLED==='true'});
  }

  // -------------------------------------------------------------------------
  // Audit log
  // -------------------------------------------------------------------------

  /** The user's consent history, oldest first (the most recent `limit` changes). */
  async getAuditLog(userId: string, limit = 100): Promise<ConsentRecord[]> {
    const take = Math.min(Math.max(1, Math.floor(limit) || 100), 1000);
    const rows = await prisma.privacyConsentEvent.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take,
    });
    return rows.reverse().map((row) => ({
      userId: row.userId,
      consentType: row.consentType,
      granted: row.granted,
      version: row.version,
      ipAddress: row.ipAddress ?? undefined,
      userAgent: row.userAgent ?? undefined,
      timestamp: row.createdAt,
    }));
  }

  async getDeletionRequests(userId?: string): Promise<DeletionRequest[]> {
    const rows=await prisma.privacyDeletionRequest.findMany({where:userId?{userId}:undefined,orderBy:{requestedAt:'desc'},take:200});
    return rows.map(row=>({...row,status:row.status as DeletionRequest['status'],reason:row.reason??undefined}));
  }

  private async logComplianceEvent(userId: string, action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: `PRIVACY:${action}`,
          entityType: "User",
          entityId: userId,
          details: details as Prisma.InputJsonValue,
        },
      });
    } catch {
      // AuditLog table optional — log to console as fallback
      console.log(`[COMPLIANCE] ${action} for user=${userId}:`, details);
    }
  }
}

export const privacyManager = new PrivacyManager();
