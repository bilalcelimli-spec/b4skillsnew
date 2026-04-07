import { prisma } from "../prisma";

/**
 * Webhook Service
 * Dispatches events to institutional partner endpoints.
 */
export const WebhookService = {
  /**
   * Dispatch a test completion event
   */
  async dispatchTestCompleted(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        organization: true,
        candidate: true,
        scoreReport: true,
      },
    });

    if (!session || !session.organization.settings) return;

    const settings = session.organization.settings as any;
    const webhookUrl = settings.webhookUrl;

    if (!webhookUrl) return;

    const payload = {
      event: "test.completed",
      timestamp: new Date().toISOString(),
      data: {
        sessionId: session.id,
        candidate: {
          id: session.candidate.id,
          email: session.candidate.email,
          name: session.candidate.name,
        },
        score: {
          overall: session.scoreReport?.overallScore,
          cefr: session.scoreReport?.overallCefr,
          reading: session.scoreReport?.readingScore,
          listening: session.scoreReport?.listeningScore,
          writing: session.scoreReport?.writingScore,
          speaking: session.scoreReport?.speakingScore,
        },
        metadata: session.metadata,
      },
    };

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-b4skills-Signature": "TODO_HMAC_SIGNATURE", // For security
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(`Webhook dispatch failed for ${webhookUrl}: ${res.statusText}`);
      }
    } catch (err) {
      console.error(`Webhook dispatch error for ${webhookUrl}:`, err);
    }
  },
};
