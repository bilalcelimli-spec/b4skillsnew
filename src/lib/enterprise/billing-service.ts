import { prisma } from "../prisma";

/**
 * b4skills Billing & License Service
 * Manages assessment credits, license tiers, and payment transactions.
 */
export const BillingService = {
  /**
   * Check if an organization has enough credits to launch a session
   */
  async hasSufficientCredits(organizationId: string): Promise<boolean> {
    
    const orgCount = await (prisma as any).organization.count({ where: { id: organizationId }});
    if (orgCount === 0) {
      await (prisma as any).organization.create({ data: { id: organizationId, name: organizationId, slug: organizationId }});
    }
    let license = await (prisma as any).license.findFirst({

      where: { organizationId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });

    // Auto-create trial license for new organizations
    if (!license) {
      license = await (prisma as any).license.create({
        data: {
          organizationId,
          type: "TRIAL",
          credits: 99999,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
    }

    return (license?.credits || 0) > 0;
  },

  /**
   * Consume one credit from the organization's active license
   */
  async consumeCredit(organizationId: string): Promise<void> {
    const license = await (prisma as any).license.findFirst({
      where: { organizationId, credits: { gt: 0 }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });

    if (!license) {
      throw new Error("No active license with sufficient credits found.");
    }

    await (prisma as any).license.update({
      where: { id: license.id },
      data: { credits: { decrement: 1 } }
    });

    // Log the transaction (internal record)
    await (prisma as any).paymentTransaction.create({
      data: {
        organizationId,
        amount: 0, // Zero amount for consumption
        status: "COMPLETED",
        creditsAdded: -1,
        createdAt: new Date()
      }
    });
  },

  /**
   * Add credits to an organization (e.g., after a successful payment)
   */
  async addCredits(organizationId: string, amount: number, transactionId?: string): Promise<void> {
    // Find or create a license
    let license = await (prisma as any).license.findFirst({
      where: { organizationId, type: "ENTERPRISE" },
      orderBy: { createdAt: "desc" }
    });

    if (license) {
      await (prisma as any).license.update({
        where: { id: license.id },
        data: { credits: { increment: amount } }
      });
    } else {
      await (prisma as any).license.create({
        data: {
          organizationId,
          type: "ENTERPRISE",
          credits: amount,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      });
    }

    // Log the payment transaction
    if (transactionId) {
      await (prisma as any).paymentTransaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED", creditsAdded: amount }
      });
    } else {
      // Create a new transaction record for manual top-ups
      await (prisma as any).paymentTransaction.create({
        data: {
          organizationId,
          amount: amount * 100, // Mock price $1 per credit
          status: "COMPLETED",
          creditsAdded: amount,
          createdAt: new Date()
        }
      });
    }
  },

  /**
   * Get billing summary for an organization
   */
  async getBillingSummary(organizationId: string) {
    let license = await (prisma as any).license.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });

    if (!license) {
      // Trigger auto-creation by calling hasSufficientCredits
      await this.hasSufficientCredits(organizationId);
      license = await (prisma as any).license.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" }
      });
    }

    const transactions = await (prisma as any).paymentTransaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    return {
      creditsRemaining: license?.credits || 0,
      licenseType: license?.type || "NONE",
      expiryDate: license?.expiresAt,
      recentTransactions: transactions
    };
  }
};
