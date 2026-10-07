import { describe, expect, it } from 'vitest';
import { summarizeScoreValidity } from '../src/lib/analytics/score-validity';
const session = (i: number, level = 'A2', candidateId = `candidate-${i}`) => ({
  id: `session-${i}`, candidateId, theta: i / 10, sem: 0.2, cefrLevel: level,
  completedAt: new Date(2026, 8, i + 1), metadata: { productLine: 'Corporate' },
  responses: [{ score: 0, isPretest: false, metadata: {} }],
  scoreReport: { overallCefr: level, diagnosticReport: {}, readingScore: i * 5, listeningScore: i * 4,
    writingScore: null, speakingScore: null, grammarScore: null, vocabularyScore: null },
});
describe('descriptive score evidence', () => {
  it('does not invent internal consistency or perfect precision for an empty sample', () => {
    expect(summarizeScoreValidity([])).toMatchObject({nSessions:0,meanSEM:null,marginalReliability:null,
      overallAlpha:null,overallOmega:null,repeatAgreement:{nPairs:0,exact:null,adjacent:null,kappa:null}});
  });
  it('uses actual theta units and mean squared SEM; retains legitimate zero scores', () => {
    const data=summarizeScoreValidity(Array.from({length:10},(_,i)=>session(i)));
    expect(data.nSessions).toBe(10);expect(data.reliability[0].meanTheta).toBeCloseTo(0.45);
    expect(data.marginalReliability).toBeCloseTo(1-0.04/(0.825/9));
    expect(data.correlations).toEqual([{skillA:'READING',skillB:'LISTENING',nPairs:10,pearsonR:expect.closeTo(1)}]);
    expect(data.overallAlpha).toBeNull();expect(data.overallOmega).toBeNull();
  });
  it('excludes pending, failed, reviewed and pretest-only sessions', () => {
    const pending=session(1);pending.responses[0].metadata={pendingAsyncScore:true} as any;
    const failed=session(2);failed.responses[0].metadata={scoreSource:'ai_unavailable'} as any;
    const review=session(3);review.responses[0].metadata={requiresHumanReview:true} as any;
    const pretest=session(4);pretest.responses[0].isPretest=true;
    const report=session(5);report.scoreReport.diagnosticReport={scoringComplete:false};
    expect(summarizeScoreValidity([session(0),pending,failed,review,pretest,report])).toMatchObject({nSessions:1,excludedSessions:5});
  });
  it('uses observed marginal frequencies for Cohen kappa rather than a uniform chance assumption', () => {
    const data=summarizeScoreValidity([session(1,'A2','a'),session(2,'A2','a'),
      session(3,'A2','b'),session(4,'B1','b'),session(5,'B1','c'),session(6,'B1','c')]);
    expect(data.repeatAgreement).toMatchObject({nPairs:3,exact:2/3,adjacent:1,kappa:expect.closeTo(0.4)});
  });
  it('requires known matching products and a bounded chronological comparison', () => {
    const a=session(1,'A2','a'),b=session(2,'A2','a');b.metadata.productLine='Primary';
    expect(summarizeScoreValidity([a,b]).repeatAgreement.nPairs).toBe(0);
    b.metadata.productLine='Corporate';b.completedAt=new Date(2026,10,1);
    expect(summarizeScoreValidity([a,b]).repeatAgreement.nPairs).toBe(0);
    const c=session(3,'A2','a');c.metadata={} as any;a.metadata={} as any;
    expect(summarizeScoreValidity([a,c]).repeatAgreement.nPairs).toBe(0);
  });
  it('does not manufacture kappa for a constant classification or reliability for constant theta', () => {
    const ss=Array.from({length:10},(_,i)=>({...session(i,'A2','a'),theta:0}));
    const data=summarizeScoreValidity(ss);expect(data.marginalReliability).toBeNull();
    expect(data.repeatAgreement.exact).toBe(1);expect(data.repeatAgreement.kappa).toBeNull();
  });
});
