import { hasCompleteScoringEvidence, scoringRequirements } from '../scoring/score-evidence.js';
import { resolveProfileName } from '../product-lines/profiles.js';

export interface ResearchSession {
  candidateId: string;
  theta: number;
  sem: number;
  completedAt: Date | null;
  metadata: unknown;
  scoreReport: { diagnosticReport: unknown } | null;
  responses: Parameters<typeof hasCompleteScoringEvidence>[0];
}

// A reporting threshold, not a claim that this sample establishes validity.
export const MIN_RELIABILITY_CANDIDATES = 30;

/** Keep products separate and use one fully scored observation per candidate. */
export function summarizePublicReliability(input: ResearchSession[]) {
  const groups = new Map<string, Map<string, ResearchSession>>();
  for (const session of [...input].sort((a, b) => +(b.completedAt ?? 0) - +(a.completedAt ?? 0))) {
    const meta = (session.metadata ?? {}) as Record<string, unknown>;
    const diagnostic = (session.scoreReport?.diagnosticReport ?? {}) as Record<string, unknown>;
    const product = resolveProfileName(typeof meta.productLine === 'string' ? meta.productLine : null);
    if (!product || !session.completedAt || !session.scoreReport || meta.scoringPending === true ||
        diagnostic.scoringComplete === false || !Number.isFinite(session.theta) ||
        !Number.isFinite(session.sem) || session.sem <= 0 ||
        !hasCompleteScoringEvidence(session.responses, scoringRequirements(meta))) continue;
    const key = `${product} / ${meta.sessionType === 'DIAGNOSTIC' ? 'Diagnostic' : 'Adaptive'}`;
    if (!groups.has(key)) groups.set(key, new Map());
    const candidates = groups.get(key)!;
    if (!candidates.has(session.candidateId)) candidates.set(session.candidateId, session);
  }
  return [...groups].map(([product, candidates]) => {
    const sessions = [...candidates.values()];
    const n = sessions.length;
    const meanTheta = sessions.reduce((sum, s) => sum + s.theta, 0) / n;
    const variance = n > 1 ? sessions.reduce((sum, s) => sum + (s.theta - meanTheta) ** 2, 0) / (n - 1) : 0;
    const meanSquaredSEM = sessions.reduce((sum, s) => sum + s.sem ** 2, 0) / n;
    const status = n < MIN_RELIABILITY_CANDIDATES ? 'insufficient_sample' : variance <= 0 ? 'no_variance' : 'estimated';
    return {
      product, nCandidates: n,
      meanSEM: sessions.reduce((sum, s) => sum + s.sem, 0) / n,
      // Negative estimates are retained: clipping would conceal inadequate precision.
      marginalReliability: status === 'estimated' ? 1 - meanSquaredSEM / variance : null,
      status,
    };
  }).sort((a, b) => a.product.localeCompare(b.product));
}
