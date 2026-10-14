import {expect,it} from 'vitest';
import {compareScoringModels} from '../model-comparison';
import type {ReferenceDataset} from '../reference-evaluation';
function dataset(size=1):ReferenceDataset {
 const values=[0,.15,.3,.45,.65,.82,1];
 return {version:1,datasetId:'SYNTHETIC_COMPARISON_TEST',modelVersion:'baseline',scoringPolicyVersion:'policy',expertProtocol:{independent:true,blindToAi:true,qualified:true},
 scoreBandCutoffs:[.08,.23,.38,.55,.74,.91],responses:Array.from({length:size},(_,index)=>{
  const band=index%7,skill=index%2?'SPEAKING':'WRITING',value=values[band];
  return {id:`response-${index}`,learnerId:`learner-${index}`,promptId:`prompt-${index}`,rubricVersion:'rubric-v1',split:'holdout',skill,
   expertRatings:[{raterId:'expert-a',score:value,band},{raterId:'expert-b',score:value,band}],
   runs:Array.from({length:5},(_,run)=>({runId:`repeat-${run}`,status:'scored',score:value,band}))};})};
}
const candidate=(base:ReferenceDataset):ReferenceDataset=>({...structuredClone(base),modelVersion:'candidate'});
it('does not approve release from perfect but sparse reference evidence',()=>{
 const base=dataset(),report=compareScoringModels(base,candidate(base));
 expect(report.status).toBe('insufficient_evidence');expect(report.releaseApproved).toBe(false);
 expect(report.findings.some(finding=>finding.code==='QWK_UNDEFINED')).toBe(true);
});
it('accepts equivalent results within provisional limits only with complete evidence',()=>{
 const base=dataset(420),report=compareScoringModels(base,candidate(base));
 expect(report.status).toBe('within_provisional_limits');expect(report.findings).toEqual([]);
 expect(report.paired.maeDelta).toBe(0);expect(report.releaseApproved).toBe(false);
});
it.each(['rubricVersion','learnerId','promptId','skill','split'] as const)('rejects changed frozen reference %s',key=>{
 const base=dataset(),next=candidate(base);(next.responses[0] as any)[key]=key==='skill'?'SPEAKING':key==='split'?'development':'changed';
 expect(()=>compareScoringModels(base,next)).toThrow('evidence mismatch');
});
it('rejects replaced expert evidence and changed cutoffs',()=>{
 const base=dataset(),next=candidate(base);next.responses[0].expertRatings.forEach(rating=>rating.score=.1);
 expect(()=>compareScoringModels(base,next)).toThrow('evidence mismatch');
 const thresholds=candidate(base);thresholds.scoreBandCutoffs[0]=.09;
 expect(()=>compareScoringModels(base,thresholds)).toThrow('configuration mismatch');
});
it('requires matching reference response sets and distinct version identifiers',()=>{
 const base=dataset(2),next=candidate(base);next.responses.pop();expect(()=>compareScoringModels(base,next)).toThrow('set mismatch');
 expect(()=>compareScoringModels(base,base)).toThrow('distinct');
});
it('does not depend on response order or expert entry order',()=>{
 const base=dataset(14),next=candidate(base);next.responses.reverse();next.responses.forEach(row=>row.expertRatings.reverse());
 expect(compareScoringModels(base,next).paired.maeDelta).toBe(0);
});
it('detects paired score error increases and severe band mistakes',()=>{
 const base=dataset(14),next=candidate(base);
 for(const row of next.responses){row.runs.forEach(run=>{run.score=1-run.score!;run.band=6-run.band!;});}
 const report=compareScoringModels(base,next);expect(report.status).toBe('observed_regression');
 expect(report.findings.some(finding=>finding.code==='MAE_INCREASE')).toBe(true);
 expect(report.findings.some(finding=>finding.code==='SEVERE_BAND_ERRORS_INCREASED')).toBe(true);
});
it('detects hidden degradation in one skill despite improvement in the other',()=>{
 const base=dataset(14),next=candidate(base);
 base.responses.filter(row=>row.skill==='WRITING').forEach(row=>row.runs.forEach(run=>run.score=Math.min(1,run.score!+.3)));
 next.responses.filter(row=>row.skill==='SPEAKING').forEach(row=>row.runs.forEach(run=>run.score=Math.min(1,run.score!+.1)));
 const report=compareScoringModels(base,next);
 expect(report.paired.maeDelta!).toBeLessThan(0);
 expect(report.findings.some(finding=>finding.code==='MAE_INCREASE'&&finding.scope==='SPEAKING')).toBe(true);
});
it('guards previously auto-scored cases even when gained cases cancel net coverage loss',()=>{
 const base=dataset(4);base.responses[0].runs.forEach(run=>{run.status='review_required';});
 const next=candidate(base);next.responses[0].runs.forEach(run=>run.status='scored');next.responses[1].runs.forEach(run=>run.status='review_required');
 const report=compareScoringModels(base,next);expect(report.coverage.delta).toBe(0);
 expect(report.coverage.lostPreviouslyAuto).toBe(1);expect(report.coverage.gainedAuto).toBe(1);
 expect(report.findings.some(finding=>finding.code==='PREVIOUSLY_AUTO_CASES_LOST')).toBe(true);
});
it('requires complete repetitions and detects per-skill instability',()=>{
 const base=dataset(14),next=candidate(base);next.responses[0].runs.pop();next.responses[1].runs[4].score=.8;
 const report=compareScoringModels(base,next);expect(report.findings.some(finding=>finding.code==='REPEATS_INCOMPLETE')).toBe(true);
 expect(report.findings.some(finding=>finding.code==='REPEATABILITY_DROP'&&finding.scope==='SPEAKING')).toBe(true);
});
it('returns reproducible paired learner confidence intervals without exposing row identifiers',()=>{
 const base=dataset(14),next=candidate(base);next.responses[1].runs[0].score=.16;
 const first=compareScoringModels(base,next),second=compareScoringModels(base,next);
 expect(first.paired.maeDelta95LearnerBootstrap).toEqual(second.paired.maeDelta95LearnerBootstrap);
 expect(JSON.stringify(first)).not.toContain('learner-0');expect(JSON.stringify(first)).not.toContain('response-0');
});
