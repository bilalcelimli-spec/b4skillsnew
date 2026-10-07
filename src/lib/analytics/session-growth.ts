import { thetaToCefr } from '../cefr/cefr-framework.js';
import { shouldExcludeResponseFromAbility } from '../scoring/score-evidence.js';

type GrowthSession = {
  id: string; candidateId: string; status: string; theta: number; sem: number;
  completedAt: Date | null; metadata?: unknown;
  scoreReport?: { overallCefr?: string; diagnosticReport?: unknown } | null;
  responses: Array<{ score: number | null; isPretest?: boolean | null; metadata?: unknown }>;
};

export function compareSessionGrowth(from: GrowthSession, to: GrowthSession) {
  for (const session of [from, to]) {
    const meta = (session.metadata ?? {}) as Record<string, unknown>;
    const diagnostic = (session.scoreReport?.diagnosticReport ?? {}) as Record<string, unknown>;
    if (session.status !== 'COMPLETED' || !session.completedAt || !Number.isFinite(session.theta) ||
      !Number.isFinite(session.sem) || session.sem <= 0 || meta.scoringPending === true ||
      diagnostic.scoringComplete === false || !session.responses.some(r => !r.isPretest) ||
      session.responses.some(r => !r.isPretest && shouldExcludeResponseFromAbility(r))) {
      throw new Error('Both assessments must have completed scoring before comparison');
    }
  }
  if (from.id === to.id || from.candidateId !== to.candidateId || from.completedAt! >= to.completedAt!) {
    throw new Error('Select an earlier assessment from the same candidate');
  }
  const fromProduct = ((from.metadata ?? {}) as Record<string, unknown>).productLine;
  const toProduct = ((to.metadata ?? {}) as Record<string, unknown>).productLine;
  if (fromProduct !== toProduct) throw new Error('Assessments must use the same product line');
  const thetaDelta = to.theta - from.theta;
  const standardError = Math.hypot(from.sem, to.sem);
  const rci = thetaDelta / standardError;
  const cefrFrom = from.scoreReport?.overallCefr ?? thetaToCefr(from.theta);
  const cefrTo = to.scoreReport?.overallCefr ?? thetaToCefr(to.theta);
  return { fromSession: from.id, toSession: to.id, fromDate: from.completedAt, toDate: to.completedAt,
    thetaDelta, rci, standardError, significantGrowth: rci > 1.96,
    significantDecline: rci < -1.96,
    ciOverlap: from.theta + 1.96 * from.sem >= to.theta - 1.96 * to.sem &&
      to.theta + 1.96 * to.sem >= from.theta - 1.96 * from.sem,
    cefrFrom, cefrTo, cefrChange: thetaToCefr(to.theta) !== thetaToCefr(from.theta),
  };
}
