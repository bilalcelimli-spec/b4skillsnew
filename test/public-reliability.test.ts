import { describe, expect, it } from 'vitest';
import { summarizePublicReliability, type ResearchSession } from '../src/lib/research/public-reliability';
import { scoringRequirements } from '../src/lib/scoring/score-evidence';

function session(i: number, productLine = 'Corporate'): ResearchSession {
  const metadata = { productLine };
  return {
    candidateId: `candidate-${i}`, theta: i / 10, sem: 0.2,
    completedAt: new Date(2026, 9, i + 1), metadata, scoreReport: { diagnosticReport: {} },
    responses: Object.entries(scoringRequirements(metadata)).flatMap(([skill, min]) =>
      Array.from({ length: min }, (_, j) => ({ itemId: `${skill}-${j}`, item: { skill }, score: 0, isPretest: false, metadata: {} }))),
  };
}
describe('public reliability evidence', () => {
  it('does not manufacture reliability for an empty or small sample', () => {
    expect(summarizePublicReliability([])).toEqual([]);
    expect(summarizePublicReliability([session(0)])[0]).toMatchObject({ nCandidates: 1, marginalReliability: null, status: 'insufficient_sample' });
  });
  it('uses actual ability variance and squared SEM without inventing alpha', () => {
    const rows = Array.from({ length: 30 }, (_, i) => session(i));
    const result = summarizePublicReliability(rows)[0];
    const variance = rows.reduce((sum, s) => sum + (s.theta - 1.45) ** 2, 0) / 29;
    expect(result).toMatchObject({ nCandidates: 30, status: 'estimated' });
    expect(result.marginalReliability).toBeCloseTo(1 - 0.04 / variance);
    expect(result).not.toHaveProperty('cronbachAlpha');
  });
  it('rejects incomplete coverage, pending scores, invalid estimates and unknown products', () => {
    const incomplete = session(1); incomplete.responses = incomplete.responses.slice(0, 1);
    const pending = session(2); pending.responses[0].metadata = { pendingAsyncScore: true };
    const invalid = { ...session(3), theta: NaN };
    const unknown = { ...session(4), metadata: { productLine: 'unrecognized' } };
    const report = { ...session(5), scoreReport: { diagnosticReport: { scoringComplete: false } } };
    expect(summarizePublicReliability([incomplete, pending, invalid, unknown, report])).toEqual([]);
  });
  it('does not pool products or count repeated attempts as independent candidates', () => {
    const first = session(0), latest = { ...session(0), theta: 2, completedAt: new Date(2026, 11, 1) };
    const result = summarizePublicReliability([first, latest, ...Array.from({ length: 29 }, (_, i) => session(i + 1)), session(1, 'General English')]);
    expect(result).toHaveLength(2);
    expect(result.find(r => r.product.startsWith('Corporate'))?.nCandidates).toBe(30);
    expect(result.find(r => r.product.startsWith('General English'))).toMatchObject({ nCandidates: 1, marginalReliability: null });
  });
  it('does not report reliability for zero variance or conceal negative estimates', () => {
    const constant = Array.from({ length: 30 }, (_, i) => ({ ...session(i), theta: 0 }));
    expect(summarizePublicReliability(constant)[0]).toMatchObject({ status: 'no_variance', marginalReliability: null });
    expect(summarizePublicReliability(constant.map((s, i) => ({ ...s, theta: i / 1000 })))[0].marginalReliability).toBeLessThan(0);
  });
});
