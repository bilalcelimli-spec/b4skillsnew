import { prisma } from "../prisma";
import crypto from "crypto";
import { webhookManager } from "../webhooks/webhook-manager";

/**
 * Webhook Service
 * Dispatches assessment.completed events to all registered endpoints for the org,
 * plus any legacy single-URL configured in organization.settings.webhookUrl.
 */
export const WebhookService = {
  async dispatchTestCompleted(sessionId: string) {
    const session = await (prisma.session.findUnique as any)({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        organization: { select: { id: true, settings: true } },
        scoreReport: {
          select: {
            overallScore: true, overallCefr: true,
            readingScore: true, listeningScore: true,
            writingScore: true, speakingScore: true,
            certificateId: true,
          },
        },
      },
    }) as any;

    if (!session) return;

    const APP_BASE_URL = process.env.APP_BASE_URL ?? process.env.VITE_APP_URL ?? "https://b4skills.com";
    const certId = session.scoreReport?.certificateId;

    const payload = {
      event: "assessment.completed" as const,
      timestamp: new Date().toISOString(),
      data: {
        sessionId: session.id,
        candidate: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
        },
        score: {
          overall: session.scoreReport?.overallScore,
          cefr: session.scoreReport?.overallCefr,
          reading: session.scoreReport?.readingScore,
          listening: session.scoreReport?.listeningScore,
          writing: session.scoreReport?.writingScore,
          speaking: session.scoreReport?.speakingScore,
        },
        certificate_url: certId ? `${APP_BASE_URL}/verify/${certId}` : null,
        report_url: `${APP_BASE_URL}/dashboard`,
      },
    };

    const orgId = session.organization?.id ?? session.organizationId;

    // 1. Fire via webhookManager (handles retry, delivery log, all registered endpoints)
    if (orgId) {
      try {
        await webhookManager.triggerEvent("assessment.completed", orgId, payload);
      } catch (err) {
        console.error("[webhook] webhookManager.triggerEvent failed:", err);
      }
    }

    // 2. Legacy fallback: single webhookUrl in organization.settings
    const settings = session.organization?.settings as any;
    const legacyUrl = settings?.webhookUrl;
    if (legacyUrl) {
      const payloadString = JSON.stringify(payload);
      const secret = (settings.webhookSecret as string) ?? "";
      const sig = secret
        ? crypto.createHmac("sha256", secret).update(payloadString).digest("hex")
        : "";
      try {
        const r = await fetch(legacyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-b4skills-Signature": sig },
          body: payloadString,
        });
        if (!r.ok) console.error(`[webhook] Legacy delivery failed for ${legacyUrl}: ${r.statusText}`);
      } catch (err) {
        console.error(`[webhook] Legacy delivery error for ${legacyUrl}:`, err);
      }
    }
  },
};
