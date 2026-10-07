import { getProfile } from '../product-lines/profiles.js';
import { SKILLS, DIAGNOSTIC_ITEMS_PER_SKILL } from '../assessment-engine/diagnostic-config.js';

/** Scored coverage comes from the administered assessment configuration. */
export function scoringRequirements(metadata: unknown): Record<string, number> {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  if (meta.sessionType === 'DIAGNOSTIC') return Object.fromEntries(SKILLS.map(skill => [skill, DIAGNOSTIC_ITEMS_PER_SKILL]));
  const profile = getProfile(typeof meta.productLine === 'string' ? meta.productLine : null);
  return Object.fromEntries(profile.sectionOrder.map(skill => [skill, profile.sectionConfig[skill]?.minItems ?? 1]));
}

/** Central eligibility rule: placeholders and unresolved ratings are not evidence. */
export function shouldExcludeResponseFromAbility(response: {
  isPretest?: boolean | null;
  score?: number | null;
  metadata?: unknown;
}): boolean {
  const metadata = response.metadata && typeof response.metadata === 'object' && !Array.isArray(response.metadata)
    ? response.metadata as Record<string, unknown> : {};
  if (response.isPretest || typeof response.score !== "number" || !Number.isFinite(response.score) || response.score < 0 || response.score > 1) return true;
  if (metadata.scoreSource === 'human') return false;
  return (metadata.pendingAsyncScore === true && metadata.asyncScored !== true) ||
    metadata.scoreFailed === true || metadata.requiresHumanReview === true ||
    metadata.scoreSource === 'ai_unavailable' || metadata.scoreSource === 'ai_flagged';
}

/** A completed lifecycle is not a complete assessment without scored skill coverage. */
export function hasCompleteScoringEvidence(
  responses: Array<{itemId?: string; score?: number | null; isPretest?: boolean | null; metadata?: unknown; item?: {skill?: string} | null}>,
  required: Record<string, number>,
): boolean {
  if (!responses.length || !Object.keys(required).length || responses.some(response => !response.isPretest && shouldExcludeResponseFromAbility(response))) return false;
  return Object.entries(required).every(([skill,min]) => {
    const items = responses.filter(response => response.item?.skill === skill && !shouldExcludeResponseFromAbility(response));
    return new Set(items.map((response,index)=>response.itemId ?? `unidentified-row-${index}`)).size >= Math.max(1,min);
  });
}
