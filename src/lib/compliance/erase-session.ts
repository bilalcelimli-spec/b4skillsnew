import { Prisma } from '@prisma/client';
import { eventMediaReference, identityReference, scrubAudio, type AccountDeletionDeps } from './account-deletion.js';
import { erasureReceipt, legacyArtifactReference, queueObjectErasure, retentionHold } from './erasure-storage.js';

/** Caller runs this in a transaction. The Session row lock is shared with evidence/report writers. */
export async function eraseSessionData(tx: Prisma.TransactionClient, sessionId: string,
  deps: Pick<AccountDeletionDeps, 'reference'>, now: Date, reason: string) {
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${sessionId} FOR UPDATE`;
  const session = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
  if (retentionHold(session.metadata, now)) throw new Error('LEGAL_HOLD_REQUIRES_REVIEW');
  const responses = await tx.response.findMany({ where: { sessionId }, select: { id: true, value: true, artifactUrl: true } });
  const events = await tx.proctoringEvent.findMany({ where: { sessionId }, select: { metadata: true } });
  const refs = [identityReference(session.metadata, deps), ...events.map(e => eventMediaReference(e.metadata, deps)),
    ...responses.map(r => legacyArtifactReference(r.artifactUrl))].filter(r => r !== null);
  const objectIds: string[] = [];
  for (const ref of refs) objectIds.push(await queueObjectErasure(tx, ref));
  const reports = await tx.scoreReport.findMany({ where: { sessionId }, select: { certificateUrl: true, diagnosticReport: true } });
  const summary = { objectIds, erasedAudio: responses.filter(r => scrubAudio(r.value) !== null || r.artifactUrl).length,
    queuedMedia: refs.length, withdrawnCertificates: reports.filter(r => r.certificateUrl || (r.diagnosticReport as any)?.signedCertificate).length,
    closed: ['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'SCORING'].includes(session.status) };
  await tx.session.update({ where: { id: sessionId }, data: { privacyErasedAt: now, status: 'EXPIRED',
    metadata: { privacyErasedAt: now.toISOString(), reason }, assignmentId: null } });
  await tx.ratingTask.deleteMany({ where: { response: { sessionId } } });
  await tx.response.updateMany({ where: { sessionId }, data: { value: null, artifactUrl: null, contentErasedAt: now,
    metadata: { contentErased: true, reason, erasedAt: now.toISOString() } } });
  await tx.scoreReport.updateMany({ where: { sessionId }, data: { diagnosticReport: Prisma.DbNull, certificateUrl: null, isVerified: false } });
  await tx.proctoringEvent.deleteMany({ where: { sessionId } });
  await tx.feedback.deleteMany({ where: { sessionId } });
  // Administrative copies referring to the session or response also need redaction.
  await tx.auditLog.updateMany({ where: { OR: [{ entityType: 'Session', entityId: sessionId },
    { entityType: 'Response', entityId: { in: responses.map(r => r.id) } }] },
    data: { ipAddress: null, previousData: Prisma.DbNull, newData: Prisma.DbNull, details: { erased: true, reason } } });
  await erasureReceipt(tx, 'SESSION', sessionId, reason);
  await tx.response.deleteMany({ where: { sessionId } });
  await tx.scoreReport.deleteMany({ where: { sessionId } });
  await tx.session.delete({ where: { id: sessionId } });
  return summary;
}
