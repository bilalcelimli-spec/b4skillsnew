import type { PrismaClient } from '@prisma/client';

/** Inventory only. The legacy two-year hard-delete policy conflicts with the
 * workflow's five-year anonymisation policy; neither is silently applied here.
 * No storage object or database record is changed by this service.
 */
export async function previewDataRetention(prisma: PrismaClient, now = new Date()) {
  const audioCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sessionCutoff = new Date(now);
  sessionCutoff.setUTCFullYear(sessionCutoff.getUTCFullYear() - 2);
  const terminal = { status: { in: ['COMPLETED', 'EXPIRED'] as ('COMPLETED' | 'EXPIRED')[] } };
  const [expiredSessions, expiredAudioReferences, openReviews] = await Promise.all([
    prisma.session.count({ where: { ...terminal, createdAt: { lt: sessionCutoff } } }),
    prisma.response.count({ where: { createdAt: { lt: audioCutoff }, item: { skill: 'SPEAKING' },
      artifactUrl: { not: null }, session: terminal } }),
    prisma.ratingTask.count({ where: { status: { in: ['PENDING', 'CLAIMED', 'FLAGGED'] },
      response: { createdAt: { lt: audioCutoff } } } }),
  ]);
  return {
    dryRun: true, enforced: false, generatedAt: now.toISOString(),
    cutoffs: { audio: audioCutoff.toISOString(), sessions: sessionCutoff.toISOString() },
    inventory: { expiredSessions, expiredAudioReferences, openReviews },
    limitations: ['Inventory counts are not deletion eligibility decisions.',
      'Audio embedded in answer JSON, integrated tasks and storage-only objects are not included in the reference count.',
      'Legal holds, storage ownership and complete anonymisation across related records must be defined before applying retention.',
      'Use the paginated retention sweep for complete eligibility and enforcement.'],
  };
}
