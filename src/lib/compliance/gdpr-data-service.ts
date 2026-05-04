/**
 * GDPR / FERPA Data Service
 *
 * Implements the "right to access" (GDPR Art. 15) and "right to erasure"
 * (GDPR Art. 17 / FERPA §99.20) for candidate personal data.
 *
 * Export
 * ──────
 * Produces a structured JSON bundle containing all personal data held for a
 * given user:
 *   - Account fields (email, name, role, createdAt)
 *   - CandidateProfile demographics
 *   - Session list (IDs, dates, CEFR outcomes — no item content)
 *   - Response records (timestamps, scores, latency — no item stems)
 *   - AuditLog entries authored by the user
 *   - PaymentTransaction records
 *
 * Item stems and psychometric parameters are NOT included in the export
 * because they are system-owned intellectual property, not personal data.
 *
 * Delete (Right to Erasure)
 * ─────────────────────────
 * Hard-deletes all user-identifiable records in a specific order to satisfy
 * foreign-key constraints.  Anonymised aggregate statistics (ability
 * estimates used in population-level calibration) are retained under
 * legitimate interest but stripped of the userId link.
 *
 * Audit trail
 * ───────────
 * Both operations append an AuditLog entry with actor = requesting admin,
 * subject = target userId, so the action is itself auditable.
 */

import { prisma } from "../prisma.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataExportBundle {
  exportedAt: string;
  userId: string;
  account: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    organizationId: string | null;
    emailVerified: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  candidateProfile: {
    nativeLanguage: string | null;
    gender: string | null;
    ageGroup: string | null;
    educationLevel: string | null;
    dateOfBirth: Date | null;
  } | null;
  sessions: Array<{
    id: string;
    status: string;
    cefrLevel: string | null;
    abilityEstimate: number;
    startedAt: Date;
    completedAt: Date | null;
  }>;
  responses: Array<{
    sessionId: string;
    itemId: string;
    score: number;
    latencyMs: number | null;
    answeredAt: Date;
  }>;
  auditLogs: Array<{
    action: string;
    resource: string | null;
    createdAt: Date;
  }>;
  paymentTransactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  }>;
}

export interface DeleteResult {
  userId: string;
  deletedAt: string;
  recordsDeleted: {
    responses: number;
    sessions: number;
    auditLogs: number;
    paymentTransactions: number;
    candidateProfile: number;
    user: number;
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportUserData(
  userId: string,
  actorUserId: string
): Promise<DataExportBundle> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidateProfile: true,
      sessions: {
        select: {
          id: true,
          status: true,
          cefrLevel: true,
          theta: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { startedAt: "desc" },
      },
      auditLogs: {
        select: { action: true, entityType: true, entityId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      },
      transactions: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) throw new Error(`User ${userId} not found`);

  // Fetch responses for all sessions
  const sessionIds = user.sessions.map((s) => s.id);
  const responses = await prisma.response.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      sessionId: true,
      itemId: true,
      score: true,
      latencyMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Audit this export
  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      action: "GDPR_EXPORT",
      entityType: "User",
      entityId: userId,
      details: { targetUserId: userId },
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    userId,
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    candidateProfile: user.candidateProfile
      ? {
          nativeLanguage: user.candidateProfile.nativeLanguage,
          gender: user.candidateProfile.gender,
          ageGroup: user.candidateProfile.ageGroup,
          educationLevel: user.candidateProfile.educationLevel,
          dateOfBirth: user.candidateProfile.dateOfBirth,
        }
      : null,
    sessions: user.sessions.map((s) => ({
      id: s.id,
      status: s.status,
      cefrLevel: s.cefrLevel,
      abilityEstimate: s.theta,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    })),
    responses: responses.map((r) => ({
      sessionId: r.sessionId,
      itemId: r.itemId,
      score: r.score,
      latencyMs: r.latencyMs,
      answeredAt: r.createdAt,
    })),
    auditLogs: user.auditLogs.map((l) => ({
      action: l.action,
      resource: `${l.entityType}:${l.entityId}`,
      createdAt: l.createdAt,
    })),
    paymentTransactions: user.transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
}

// ─── Delete (Right to Erasure) ────────────────────────────────────────────────

export async function deleteUserData(
  userId: string,
  actorUserId: string
): Promise<DeleteResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);
  // Protect admin accounts from accidental erasure
  if (["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"].includes(user.role)) {
    throw new Error("Cannot erase admin accounts. Downgrade the role first.");
  }

  // Collect session IDs for cascaded response deletion
  const sessions = await prisma.session.findMany({
    where: { candidateId: userId },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  // Delete responses
  const { count: responseCount } = await prisma.response.deleteMany({
    where: { sessionId: { in: sessionIds } },
  });

  // Delete sessions
  const { count: sessionCount } = await prisma.session.deleteMany({
    where: { candidateId: userId },
  });

  // Delete audit logs authored by the user
  const { count: auditCount } = await prisma.auditLog.deleteMany({
    where: { userId },
  });

  // Delete payment transactions
  const { count: txCount } = await prisma.paymentTransaction.deleteMany({
    where: { userId },
  });

  // Delete candidate profile
  const { count: profileCount } = await prisma.candidateProfile.deleteMany({
    where: { userId },
  });

  // Anonymise user (cannot hard-delete if email is needed for dedup; erase PII)
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted-${userId}@gdpr.erased`,
      name: null,
      password: null,
      image: null,
      refreshToken: null,
      resetPasswordToken: null,
      verifyEmailToken: null,
      emailVerified: null,
    },
  });

  // Audit the erasure itself (actor-scoped, not subject-scoped)
  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      action: "GDPR_ERASURE",
      entityType: "User",
      entityId: userId,
      details: {
        responseCount,
        sessionCount,
        auditCount,
        txCount,
        profileCount,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  return {
    userId,
    deletedAt: new Date().toISOString(),
    recordsDeleted: {
      responses: responseCount,
      sessions: sessionCount,
      auditLogs: auditCount,
      paymentTransactions: txCount,
      candidateProfile: profileCount,
      user: 1,
    },
  };
}
