import { shouldExcludeResponseFromAbility } from './score-evidence.js';

export function buildScoringStatus(responses: Array<{
  id: string; score: number | null; isPretest?: boolean | null; metadata?: unknown;
}>) {
  const items = responses.filter(r => !r.isPretest).map(response => {
    const meta = (response.metadata ?? {}) as Record<string, unknown>;
    const status = !shouldExcludeResponseFromAbility(response) ? 'scored'
      : meta.scoreFailed === true || meta.scoreSource === 'ai_unavailable' ? 'unavailable'
      : meta.requiresHumanReview === true || meta.scoreSource === 'ai_flagged' ? 'review_required'
      : 'pending';
    return { responseId: response.id, status,
      ...(status === 'scored' ? { score: response.score, cefrLevel: meta.cefrLevel } : {}),
    };
  });
  return { items, complete: items.every(item => item.status === 'scored'),
    needsReview: items.some(item => item.status === 'review_required' || item.status === 'unavailable') };
}
