import { prisma } from "../prisma";
import crypto from "crypto";

/**
 * Enterprise Service
 * Handles Audit Logging, Webhook Dispatching, and API Key Management.
 */
export class EnterpriseService {
  /**
   * Log an administrative action.
   */
  static async logAction(params: {
    organizationId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    previousData?: any;
    newData?: any;
    ipAddress?: string;
  }) {
    try {
      return await (prisma as any).auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: params.details || {},
          previousData: params.previousData,
          newData: params.newData,
          ipAddress: params.ipAddress,
        },
      });
    } catch (err) {
      console.error("Audit Log Error:", err);
    }
  }

  /**
   * Dispatch a webhook event.
   */
  static async dispatchWebhook(orgId: string, event: string, payload: any) {
    const webhooks = await (prisma as any).webhook.findMany({
      where: { organizationId: orgId, isActive: true, events: { has: event } },
    });

    for (const webhook of webhooks) {
      try {
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(JSON.stringify(payload))
          .digest("hex");

        fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-b4skills-Signature": signature,
            "X-b4skills-Event": event,
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            payload,
          }),
        }).catch((err) => console.error(`Webhook Dispatch Failed (${webhook.url}):`, err));
      } catch (err) {
        console.error("Webhook Error:", err);
      }
    }
  }

  /**
   * Generate a new API Key.
   */
  static async generateApiKey(orgId: string, name: string) {
    const rawKey = `la_${crypto.randomBytes(24).toString("hex")}`;
    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    await (prisma as any).apiKey.create({
      data: {
        organizationId: orgId,
        name,
        key: hashedKey,
      },
    });

    return rawKey; // Return raw key only once
  }

  /**
   * Validate an API Key.
   */
  static async validateApiKey(rawKey: string) {
    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await (prisma as any).apiKey.findUnique({
      where: { key: hashedKey, isActive: true },
      include: { organization: true },
    });

    if (apiKey) {
      await (prisma as any).apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() },
      });
      return apiKey.organization;
    }

    return null;
  }
}
