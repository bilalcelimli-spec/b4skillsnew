import { sharedReportSummary } from './shared-report';
import { randomBytes } from 'node:crypto';
import { prisma } from '../prisma';

/** Share tokens use the same Session -> ScoreReport lock order as scoring. */
export async function ensureReportShareToken(sessionId: string): Promise<string | null> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${sessionId} FOR UPDATE`;
    const report = await tx.scoreReport.findUnique({where:{sessionId}});
    if (!report) return null;
    const session = await tx.session.findUnique({where:{id:sessionId},include:{responses:{select:{itemId:true,score:true,isPretest:true,metadata:true,item:{select:{skill:true}}}}}});
    if (!session) return null;
    sharedReportSummary({...session,scoreReport:report}, '');
    const diagnostic = (report.diagnosticReport ?? {}) as Record<string, unknown>;
    if (typeof diagnostic.shareToken === 'string' && diagnostic.shareToken) return diagnostic.shareToken;
    const shareToken = randomBytes(16).toString('hex');
    await tx.scoreReport.update({where:{id:report.id},data:{diagnosticReport:{...diagnostic,shareToken}}});
    return shareToken;
  });
}
