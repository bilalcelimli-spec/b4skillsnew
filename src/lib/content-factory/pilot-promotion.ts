import { auditItemEvidence, type AuditItem } from '../quality/item-evidence-audit.js';
import { itemReviewHash } from './item-review-snapshot.js';

const requiredReviews = ['LANGUAGE_REVIEW', 'CEFR_REVIEW', 'FAIRNESS_REVIEW', 'MODERATION'];
/** Pilot admission is an editorial gate, not empirical calibration or CEFR validation. */
export function pilotAdmissionReasons(item: AuditItem & { pipelineStage: string; isSuspended?: boolean; isCompromised?: boolean }): string[] {
  const reasons: string[] = [];
  if (item.pipelineStage !== 'APPROVED_FOR_PILOT') reasons.push('STAGE_CHANGED');
  if (!['DRAFT', 'REVIEW'].includes(item.status)) reasons.push('STATUS_NOT_ELIGIBLE');
  if (item.isSuspended) reasons.push('ITEM_SUSPENDED');
  if (item.isCompromised) reasons.push('ITEM_COMPROMISED');
  const hash = itemReviewHash(item);
  const latest = new Map<string, NonNullable<AuditItem['itemReviews']>[number]>();
  for (const review of [...(item.itemReviews ?? [])].sort((a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0) || (a.id ?? '').localeCompare(b.id ?? ''))) {
    if (review.itemVersion === item.version && review.contentHash === hash && review.reviewerId?.trim())
      latest.set(JSON.stringify([review.reviewerId, review.reviewType]), review);
  }
  const decisions = [...latest.values()];
  for (const type of requiredReviews) {
    if (!decisions.some(r => r.reviewType === type && r.verdict === 'APPROVE')) reasons.push(`${type}_APPROVAL_MISSING`);
  }
  if (new Set(decisions.filter(r => r.verdict === 'APPROVE').map(r => r.reviewerId)).size < 2) reasons.push('INDEPENDENT_REVIEWERS_MISSING');
  if (decisions.some(r => r.verdict !== 'APPROVE')) reasons.push('UNRESOLVED_REVIEW_OBJECTION');
  reasons.push(...auditItemEvidence(item).filter(f => f.severity === 'BLOCKER').map(f => f.rule));
  return [...new Set(reasons)];
}

/** All writes and evidence checks share item locks; a failed write rolls back the batch. */
export async function promotePilotItems(db: any, actorId: string, dryRun: boolean) {
  const run = async (tx: any) => {
    // Every supported content/review/pipeline edit takes this same item lock.
    const locked: { id: string }[] | null = dryRun ? null : await tx.$queryRaw`SELECT id FROM "Item" WHERE "pipelineStage" = 'APPROVED_FOR_PILOT' ORDER BY id FOR UPDATE`;
    const items = await tx.item.findMany({ where: { pipelineStage: 'APPROVED_FOR_PILOT', ...(locked ? { id: { in: locked.map(row => row.id) } } : {}) }, include: { itemReviews: true }, orderBy: { id: 'asc' } });
    const candidates: any[] = [], blocked: { id: string; itemCode: string | null; reasons: string[] }[] = [];
    for (const item of items) {
      const reasons = pilotAdmissionReasons(item);
      if (reasons.length) { blocked.push({ id: item.id, itemCode: item.itemCode, reasons }); continue; }
      candidates.push({ id: item.id, itemCode: item.itemCode, skill: item.skill, cefrLevel: item.cefrLevel, subskill: item.subskill, iqScore: item.iqScore, version: item.version });
      if (!dryRun) {
        const metadata = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {};
        await tx.item.update({ where: { id: item.id }, data: {
          status: 'PRETEST', isPretest: true, pipelineStage: 'PILOT',
          metadata: { ...metadata, pilotStartedAt: new Date().toISOString(), promotedBy: actorId,
            pilotAdmission: { policyVersion: '1.0', itemVersion: item.version, contentHash: itemReviewHash(item) } },
        } });
      }
    }
    return dryRun ? { dryRun: true, candidates, count: candidates.length, blocked } : {
      promoted: candidates.length, ids: candidates.map(c => c.id), blocked,
      message: 'Eligible items are now PRETEST. Pilot admission does not establish empirical calibration.',
    };
  };
  return dryRun ? run(db) : db.$transaction(run, { maxWait: 5000, timeout: 30000 });
}
