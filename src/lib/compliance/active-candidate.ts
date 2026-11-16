import type {Prisma} from '@prisma/client';
import {AppError} from '../errors/app-error.js';
/** Shares the user lock with account erasure, so an in-flight launch cannot revive an account. */
export async function lockActiveCandidate(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({where:{id:userId},select:{email:true}});
  if (!user || user.email.endsWith('@deleted.invalid')) throw new AppError(410,'ACCOUNT_ERASED','Account unavailable');
}
