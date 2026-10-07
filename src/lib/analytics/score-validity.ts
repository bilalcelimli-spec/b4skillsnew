import { CEFR_LEVELS } from '../cefr/cefr-framework.js';
import { shouldExcludeResponseFromAbility } from '../scoring/score-evidence.js';
import { marginalReliability } from '../psychometrics/reliability-metrics.js';

type EvidenceSession = {
  id: string; candidateId: string; theta: number; sem: number; cefrLevel: string | null;
  completedAt: Date | null; metadata?: unknown;
  responses: Array<{ score: number | null; isPretest?: boolean | null; metadata?: unknown }>;
  scoreReport: { overallCefr: string; diagnosticReport?: unknown;
    readingScore: number | null; listeningScore: number | null; writingScore: number | null;
    speakingScore: number | null; grammarScore: number | null; vocabularyScore: number | null } | null;
};
const mean = (xs: number[]) => xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : null;
const sd = (xs: number[]) => {
  if (xs.length < 2) return null;
  const average = mean(xs)!;
  return Math.sqrt(xs.reduce((sum, x) => sum + (x - average) ** 2, 0) / (xs.length - 1));
};
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Descriptive evidence only: no external criterion or common-item covariance is available here. */
export function summarizeScoreValidity(input: EvidenceSession[]) {
  const sessions = input.filter(s => {
    const meta = (s.metadata ?? {}) as Record<string, unknown>;
    const diagnostic = (s.scoreReport?.diagnosticReport ?? {}) as Record<string, unknown>;
    return s.completedAt && finite(s.theta) && finite(s.sem) && s.sem > 0 &&
      meta.scoringPending !== true && diagnostic.scoringComplete !== false && s.scoreReport &&
      s.responses.some(r => !r.isPretest) &&
      !s.responses.some(r => !r.isPretest && shouldExcludeResponseFromAbility(r));
  });
  const reliable = (ss: EvidenceSession[]) => ss.length >= 10 && (sd(ss.map(s => s.theta)) ?? 0) > 0
    ? marginalReliability(ss.map(s => s.theta), ss.map(s => s.sem)) : null;
  const reliability = CEFR_LEVELS.map(level => {
    const ss = sessions.filter(s => s.scoreReport!.overallCefr === level.level);
    return { cefrLevel: level.level, nSessions: ss.length, marginalReliability: reliable(ss),
      meanSEM: mean(ss.map(s => s.sem)), sdSEM: sd(ss.map(s => s.sem)),
      meanTheta: mean(ss.map(s => s.theta)), sdTheta: sd(ss.map(s => s.theta)) };
  }).filter(row => row.nSessions > 0);
  const keys = ['readingScore', 'listeningScore', 'writingScore', 'speakingScore', 'grammarScore', 'vocabularyScore'] as const;
  const correlations: Array<{skillA: string; skillB: string; pearsonR: number; nPairs: number}> = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const validScore = (x: unknown): x is number => finite(x) && x >= 0 && x <= 100;
    const pairs = sessions.map(s => [s.scoreReport![keys[i]], s.scoreReport![keys[j]]])
      .filter((p): p is [number, number] => validScore(p[0]) && validScore(p[1]));
    if (pairs.length < 5) continue;
    const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
    const sx = sd(xs)!, sy = sd(ys)!;
    if (!sx || !sy) continue;
    const mx = mean(xs)!, my = mean(ys)!;
    const r = xs.reduce((sum, x, k) => sum + (x - mx) * (ys[k] - my), 0) / ((pairs.length - 1) * sx * sy);
    correlations.push({ skillA: keys[i].replace('Score', '').toUpperCase(), skillB: keys[j].replace('Score', '').toUpperCase(),
      pearsonR: Math.max(-1, Math.min(1, r)), nPairs: pairs.length });
  }
  const groups = new Map<string, EvidenceSession[]>();
  for (const s of sessions) {
    const product = ((s.metadata ?? {}) as Record<string, unknown>).productLine;
    // Unknown product configurations cannot establish comparability.
    if (typeof product !== 'string' || !product) continue;
    const key = JSON.stringify([s.candidateId, product]);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const pairs: Array<[string, string]> = [];
  const levels = CEFR_LEVELS.map(l => l.level as string);
  for (const group of groups.values()) {
    group.sort((a, b) => +a.completedAt! - +b.completedAt!);
    const first = group[0], last = group[group.length - 1];
    const a = first.scoreReport!.overallCefr, b = last.scoreReport!.overallCefr;
    if (first.id !== last.id && +last.completedAt! > +first.completedAt! &&
      +last.completedAt! - +first.completedAt! <= 30 * 86400_000 && levels.includes(a) && levels.includes(b)) pairs.push([a, b]);
  }
  const n = pairs.length;
  const exact = n ? pairs.filter(([a, b]) => a === b).length / n : null;
  const adjacent = n ? pairs.filter(([a, b]) => Math.abs(levels.indexOf(a) - levels.indexOf(b)) <= 1).length / n : null;
  const chance = n ? levels.reduce((sum, level) => sum + pairs.filter(p => p[0] === level).length * pairs.filter(p => p[1] === level).length / (n * n), 0) : null;
  return { nSessions: sessions.length, excludedSessions: input.length - sessions.length,
    overallAlpha: null, overallOmega: null, marginalReliability: reliable(sessions), meanSEM: mean(sessions.map(s => s.sem)),
    reliability, correlations,
    repeatAgreement: { nPairs: n, exact, adjacent, kappa: chance !== null && chance < 1 ? (exact! - chance) / (1 - chance) : null, maxDays: 30 },
    validityStatement: 'Descriptive evidence from fully scored completed sessions in the latest 180-day sample (maximum 3000). IRT marginal reliability uses theta variance and mean squared SEM; it is not Cronbach alpha or McDonald omega. Skill correlations do not establish construct validity. Repeat agreement compares the first and last observed assessment per candidate and known product within 30 days; practice, learning and selection effects may affect it. No independent CEFR criterion or common-item covariance study is available in this endpoint.' };
}
