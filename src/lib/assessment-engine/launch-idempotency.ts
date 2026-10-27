import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../errors/app-error';

export type LaunchIdentity = {
  candidateId: string;
  launchRequestId?: string;
  productLine?: string;
  organizationId?: string;
};

/** Receipts belong to the authenticated candidate, never to a client-supplied user. */
export async function findLaunchSession(db: Prisma.TransactionClient, input: LaunchIdentity) {
  if (!input.launchRequestId) return null;
  const session = await db.session.findFirst({ where: {
    candidateId: input.candidateId,
    metadata: { path: ['launchRequestId'], equals: input.launchRequestId },
  } });
  if (!session) return null;
  const metadata = session.metadata as Record<string, unknown>;
  if (metadata.launchProductLine !== (input.productLine ?? 'General English') ||
      (input.organizationId && session.organizationId !== input.organizationId)) {
    throw new AppError(409, 'LAUNCH_REQUEST_MISMATCH', 'This launch request belongs to a different assessment.');
  }
  return session;
}

/** The receipt, credit debit and session commit together, across processes and retries. */
export async function createSessionOnce(
  db: PrismaClient, input: LaunchIdentity,
  create: (tx: Prisma.TransactionClient) => Promise<Prisma.SessionGetPayload<{}>>,
) {
  return db.$transaction(async tx => {
    if (input.launchRequestId) {
      const lock = JSON.stringify([input.candidateId, input.launchRequestId]);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))::text`;
      const existing = await findLaunchSession(tx, input);
      if (existing) return existing;
    }
    return create(tx);
  });
}
