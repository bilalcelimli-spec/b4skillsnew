/**
 * Score & Certificate Validity Policy
 * ─────────────────────────────────────────────────────────────────────────────
 * Standard validity window: 2 years from the test completion date.
 *
 *   VALID         — more than 60 days remaining
 *   EXPIRING_SOON — 1–60 days remaining
 *   EXPIRED       — past the validity date
 *
 * Expiry dates are written to Session.validUntil (persisted in DB).
 * The background cron job (markExpiredCertificates) can be called from a
 * scheduler (node-cron, pg_cron, Fly.io scheduled task, etc.).
 *
 * Email notifications fire at 60 / 30 / 7 days before expiry.
 * Notification state is tracked in Session.metadata.validityNotifications.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Constants ─────────────────────────────────────────────────────────────────

export const VALIDITY_YEARS    = 2;
export const WARNING_DAYS      = [60, 30, 7] as const;
export const EXPIRING_SOON_DAYS = 60;

export type ValidityStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export interface ValidityResult {
  sessionId:     string;
  validUntil:    Date;
  status:        ValidityStatus;
  daysRemaining: number;
  isValid:       boolean;
}

// ── Core validity helpers ─────────────────────────────────────────────────────

/** Compute the validity end date for a completed session. */
export function computeValidUntil(completedAt: Date): Date {
  const d = new Date(completedAt);
  d.setFullYear(d.getFullYear() + VALIDITY_YEARS);
  return d;
}

/** Classify a validity date relative to now. */
export function classifyValidity(validUntil: Date, now = new Date()): { status: ValidityStatus; daysRemaining: number } {
  const msRemaining   = validUntil.getTime() - now.getTime();
  const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

  let status: ValidityStatus;
  if (daysRemaining < 0) {
    status = "EXPIRED";
  } else if (daysRemaining <= EXPIRING_SOON_DAYS) {
    status = "EXPIRING_SOON";
  } else {
    status = "VALID";
  }

  return { status, daysRemaining: Math.max(0, daysRemaining) };
}

// ── ValidityPolicyService ─────────────────────────────────────────────────────

export class ValidityPolicyService {

  /** Check validity for a single session. Writes validUntil to DB if missing. */
  static async checkValidity(sessionId: string): Promise<ValidityResult> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    if (session.status !== "COMPLETED" || !session.completedAt) {
      throw new Error("Session is not yet completed");
    }

    // Persist validUntil if not yet set
    let validUntil = (session as any).validUntil as Date | null;
    if (!validUntil) {
      validUntil = computeValidUntil(session.completedAt);
      await prisma.session.update({
        where: { id: sessionId },
        data:  { validUntil } as any,
      });
    }

    const { status, daysRemaining } = classifyValidity(validUntil);
    return { sessionId, validUntil, status, daysRemaining, isValid: status !== "EXPIRED" };
  }

  /**
   * Return sessions expiring within `withinDays` for a given organisation.
   * Useful for admin dashboards and proactive renewal campaigns.
   */
  static async getExpiringSessions(orgId: string, withinDays: number): Promise<ValidityResult[]> {
    const now    = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const sessions = await prisma.session.findMany({
      where: {
        organizationId: orgId,
        status:         "COMPLETED",
        validUntil:     { gt: now, lte: cutoff },
      } as any,
      select: { id: true, validUntil: true },
    });

    return sessions.map((s: any) => {
      const { status, daysRemaining } = classifyValidity(s.validUntil as Date);
      return { sessionId: s.id, validUntil: s.validUntil as Date, status, daysRemaining, isValid: true };
    });
  }

  /**
   * Background cron: mark expired sessions in bulk and return count.
   * Call daily via scheduler.
   */
  static async markExpiredSessions(): Promise<{ marked: number }> {
    const result = await (prisma.session as any).updateMany({
      where:  { status: "COMPLETED", validUntil: { lt: new Date() } },
      data:   { status: "EXPIRED" },
    });
    return { marked: result.count ?? 0 };
  }

  /**
   * Fire expiry warning notifications at 60 / 30 / 7 days before expiry.
   * Returns list of sessionIds that had notifications sent.
   */
  static async sendExpiryWarnings(
    emailFn: (to: string, subject: string, body: string) => Promise<void>,
  ): Promise<string[]> {
    const notified: string[] = [];

    for (const days of WARNING_DAYS) {
      const windowStart = new Date(Date.now() + days * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000);
      const windowEnd   = new Date(Date.now() + days * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);

      const sessions = await prisma.session.findMany({
        where:   { status: "COMPLETED", validUntil: { gte: windowStart, lte: windowEnd } } as any,
        include: { candidate: { select: { email: true, name: true } } },
      });

      for (const session of sessions) {
        const meta          = (session.metadata ?? {}) as any;
        const notifKey      = `warned_${days}d`;
        if (meta?.validityNotifications?.[notifKey]) continue; // already sent

        const candidate = (session as any).candidate;
        if (!candidate?.email) continue;

        await emailFn(
          candidate.email,
          `Your LinguAdapt certificate expires in ${days} days`,
          `Dear ${candidate.name ?? "Candidate"},\n\nYour assessment result (session ${session.id}) will expire on ${(session as any).validUntil?.toISOString().slice(0, 10)}.\n\nPlease re-take the assessment before then to maintain a valid certificate.\n\nBest regards,\nLinguAdapt Team`,
        );

        await prisma.session.update({
          where: { id: session.id },
          data:  {
            metadata: {
              ...(session.metadata as object),
              validityNotifications: { ...meta?.validityNotifications, [notifKey]: new Date().toISOString() },
            },
          },
        });
        notified.push(session.id);
      }
    }

    return notified;
  }

  /** Public-facing validity verification (no auth required — for certificate embeds). */
  static async publicVerify(sessionId: string): Promise<{
    valid:          boolean;
    status:         ValidityStatus;
    cefrLevel?:     string | null;
    daysRemaining?: number;
    validUntil?:    string;
  }> {
    try {
      const result = await ValidityPolicyService.checkValidity(sessionId);
      const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { cefrLevel: true } });
      return {
        valid:         result.isValid,
        status:        result.status,
        cefrLevel:     session?.cefrLevel,
        daysRemaining: result.daysRemaining,
        validUntil:    result.validUntil.toISOString(),
      };
    } catch {
      return { valid: false, status: "EXPIRED" };
    }
  }
}
