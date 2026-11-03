import type { PrismaClient } from '@prisma/client';
import { RETENTION, daysAgo, yearsAgo } from './retention-policy.js';

/** Inventory only (the data-retention job applies the policy). Uses RETENTION
 * from retention-policy.ts. No storage object or database record is changed here.
 */
export async function previewDataRetention(prisma: PrismaClient, now = new Date()) {
  const audioCutoff = daysAgo(now, RETENTION.audioDays);
  const sessionCutoff = yearsAgo(now, RETENTION.resultsYears);
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
      'Legal holds are not modelled; the data-retention job (npm run job -- data-retention) applies the policy.'],
  };
}
