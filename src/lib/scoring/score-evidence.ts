/** Central eligibility rule: placeholders and unresolved ratings are not evidence. */
export function shouldExcludeResponseFromAbility(response: {
  isPretest?: boolean | null;
  score?: number | null;
  metadata?: unknown;
}): boolean {
  const metadata = response.metadata && typeof response.metadata === 'object' && !Array.isArray(response.metadata)
    ? response.metadata as Record<string, unknown> : {};
  if (response.isPretest || response.score === null ||
      (response.score !== undefined && (!Number.isFinite(response.score) || response.score < 0 || response.score > 1))) return true;
  if (metadata.scoreSource === 'human') return false;
  return (metadata.pendingAsyncScore === true && metadata.asyncScored !== true) ||
    metadata.scoreFailed === true || metadata.requiresHumanReview === true ||
    metadata.scoreSource === 'ai_unavailable' || metadata.scoreSource === 'ai_flagged';
}

/** A completed lifecycle is not a complete assessment without scored skill coverage. */
export function hasCompleteScoringEvidence(
  responses: Array<{score?: number | null; isPretest?: boolean | null; metadata?: unknown; item?: {skill?: string} | null}>,
  required: Record<string, number>,
): boolean {
  if (!responses.length || responses.some(response => !response.isPretest && shouldExcludeResponseFromAbility(response))) return false;
  return Object.entries(required).every(([skill,min]) => responses.filter(response =>
    response.item?.skill === skill && !shouldExcludeResponseFromAbility(response)).length >= Math.max(1,min));
}
