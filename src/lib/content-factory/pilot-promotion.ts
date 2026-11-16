import { auditItemEvidence, type AuditItem } from '../quality/item-evidence-audit.js';
import { itemReviewHash } from './item-review-snapshot.js';
import { isAdaptiveEligible, type AdaptiveEligibilityItem } from '../assessment-engine/adaptive-policy.js';
import { PRODUCT_LINE_PROFILES, type ProductLineProfile } from '../product-lines/profiles.js';
import { profileLevels } from './bank-capacity.js';
import type { SkillType } from '../assessment-engine/types.js';

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

/**
 * Gap-cell activation (bank expansion Faz 1, decision b, 2026-11-14).
 *
 * An item that passes pilot admission normally becomes PRETEST and waits for
 * n ≥ 200 responses before it is scored. Where a product × skill × CEFR cell
 * is below `sectionConfig.minItems` that wait leaves the cell unmeasurable
 * (writing and speaking are never delivered as pretest at all). For those
 * cells only, reviewed items go straight to ACTIVE on their CEFR-derived
 * prior parameters, at most as many as the cell is short. They keep
 * collecting responses, and the calibration sweep publishes real estimates
 * under the unchanged `CALIBRATION_POLICY`; `metadata.provisionalActivation`
 * marks them until then. Every other admitted item still goes to PRETEST.
 */
export const GAP_CELL_ACTIVATION_POLICY = { policyVersion: '1.0', paramsSource: 'CEFR_PRIOR', calibrationPending: true } as const;

type GapCandidate = AdaptiveEligibilityItem & { id: string; iqScore?: number | null };

/** Which admitted candidates fill a below-minimum cell, and the cells each one fills. Pure; deterministic. */
export function planGapCellActivation(
  candidates: GapCandidate[], active: AdaptiveEligibilityItem[],
  profiles: ProductLineProfile[] = Object.values(PRODUCT_LINE_PROFILES),
): Map<string, string[]> {
  const order = [...candidates].sort((a, b) => (b.iqScore ?? -1) - (a.iqScore ?? -1) || a.id.localeCompare(b.id));
  const picked = new Map<string, string[]>();
  for (const profile of profiles) {
    for (const skill of profile.sectionOrder) {
      const need = profile.sectionConfig[skill]?.minItems ?? 1;
      for (const cefr of profileLevels(profile)) {
        const fits = (item: AdaptiveEligibilityItem) => item.cefrLevel === cefr && isAdaptiveEligible(item, profile, skill as SkillType);
        const asLive = (item: GapCandidate) => fits({ ...item, status: 'ACTIVE', isPretest: false });
        let count = active.filter(fits).length;
        if (count >= need) continue;
        const cell = `${profile.name} ${skill}/${cefr}`;
        count += order.filter(c => picked.has(c.id) && asLive(c)).length;
        for (const c of order) {
          if (count >= need) break;
          if (picked.has(c.id) || !asLive(c)) continue;
          picked.set(c.id, []);
          count++;
        }
        for (const c of order) if (picked.has(c.id) && asLive(c)) picked.get(c.id)!.push(cell);
      }
    }
  }
  return picked;
}

/** All writes and evidence checks share item locks; a failed write rolls back the batch. */
export async function promotePilotItems(db: any, actorId: string, dryRun: boolean, options: { gapCells?: boolean } = {}) {
  const run = async (tx: any) => {
    // Every supported content/review/pipeline edit takes this same item lock.
    const locked: { id: string }[] | null = dryRun ? null : await tx.$queryRaw`SELECT id FROM "Item" WHERE "pipelineStage" = 'APPROVED_FOR_PILOT' ORDER BY id FOR UPDATE`;
    const items = await tx.item.findMany({ where: { pipelineStage: 'APPROVED_FOR_PILOT', ...(locked ? { id: { in: locked.map(row => row.id) } } : {}) }, include: { itemReviews: true }, orderBy: { id: 'asc' } });
    const candidates: any[] = [], blocked: { id: string; itemCode: string | null; reasons: string[] }[] = [];
    const admitted = items.filter((item: any) => {
      const reasons = pilotAdmissionReasons(item);
      if (reasons.length) blocked.push({ id: item.id, itemCode: item.itemCode, reasons });
      return reasons.length === 0;
    });
    const gapPlan = options.gapCells && admitted.length
      ? planGapCellActivation(admitted, await tx.item.findMany({
        where: { status: 'ACTIVE', isPretest: false, isSuspended: false, isCompromised: false },
        select: { skill: true, status: true, isPretest: true, cefrLevel: true, discrimination: true, guessing: true, tags: true, content: true, ageSuitability: true },
      }))
      : new Map<string, string[]>();
    for (const item of admitted) {
      const cells = gapPlan.get(item.id);
      candidates.push({ id: item.id, itemCode: item.itemCode, skill: item.skill, cefrLevel: item.cefrLevel, subskill: item.subskill, iqScore: item.iqScore, version: item.version,
        target: cells ? 'ACTIVE' : 'PRETEST', ...(cells ? { gapCells: cells } : {}) });
      if (!dryRun) {
        const metadata = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {};
        const now = new Date().toISOString();
        const admission = { policyVersion: '1.0', itemVersion: item.version, contentHash: itemReviewHash(item) };
        await tx.item.update({ where: { id: item.id }, data: cells ? {
          status: 'ACTIVE', isPretest: false, pipelineStage: 'LIVE',
          metadata: { ...metadata, promotedBy: actorId, pilotAdmission: admission,
            provisionalActivation: { ...GAP_CELL_ACTIVATION_POLICY, activatedAt: now, activatedBy: actorId, cells } },
        } : {
          status: 'PRETEST', isPretest: true, pipelineStage: 'PILOT',
          metadata: { ...metadata, pilotStartedAt: now, promotedBy: actorId, pilotAdmission: admission },
        } });
      }
    }
    const activated = candidates.filter(c => c.target === 'ACTIVE').length;
    return dryRun ? { dryRun: true, candidates, count: candidates.length, activated, blocked } : {
      promoted: candidates.length, activated, ids: candidates.map(c => c.id), blocked,
      message: activated
        ? `${activated} item(s) filled below-minimum cells and are ACTIVE on prior parameters (calibration pending); the rest are PRETEST.`
        : 'Eligible items are now PRETEST. Pilot admission does not establish empirical calibration.',
    };
  };
  return dryRun ? run(db) : db.$transaction(run, { maxWait: 5000, timeout: 30000 });
}
