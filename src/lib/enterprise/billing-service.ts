import { prisma } from "../prisma";
import { AppError } from '../errors/app-error';
import type { Prisma } from "@prisma/client";

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
    return prisma.$transaction(async db=>{
      await db.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
      let license=await db.license.findFirst({where:{organizationId,credits:{gt:0},OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},orderBy:{createdAt:'desc'}});
      // Preserve initial-trial behavior, but never renew an expired/exhausted license for free.
      if(!license && await db.license.count({where:{organizationId}})===0) {
        license=await db.license.create({data:{organizationId,type:'TRIAL',credits:99999,expiresAt:new Date(Date.now()+30*24*60*60*1000)}});
      }
      return !!license;
    });
  },

  /** Consume atomically; callers creating a session pass the same transaction. */
  async consumeCredit(organizationId:string,transaction?:Prisma.TransactionClient):Promise<void> {
    if(!transaction)return prisma.$transaction(db=>this.consumeCredit(organizationId,db));
    await transaction.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
    const license=await transaction.license.findFirst({where:{organizationId,credits:{gt:0},OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},orderBy:{createdAt:'desc'}});
    if(!license)throw new AppError(402, 'INSUFFICIENT_CREDITS', 'No active license with sufficient credits found.');
    const claimed=await transaction.license.updateMany({where:{id:license.id,credits:{gt:0}},data:{credits:{decrement:1}}});
    if(claimed.count!==1)throw new AppError(402, 'INSUFFICIENT_CREDITS', 'No active license with sufficient credits found.');
    await transaction.paymentTransaction.create({data:{organizationId,amount:0,status:'COMPLETED',creditsAdded:-1,createdAt:new Date()}});
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
