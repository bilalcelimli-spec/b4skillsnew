import {expect,it} from 'vitest';
import {evaluateReferenceDataset,ordinalQuadraticKappa,type ReferenceDataset} from '../reference-evaluation';
function response(id='one'):ReferenceDataset['responses'][number] {
 return {id,learnerId:`learner-${id}`,promptId:`prompt-${id}`,rubricVersion:'fixture-rubric-v1',split:'holdout',skill:'WRITING',
  expertRatings:[{raterId:'expert-a',score:.3,band:2},{raterId:'expert-b',score:.3,band:2}],
  runs:Array.from({length:5},(_,index)=>({runId:`repeat-${index}`,status:'scored',score:.3,band:2}))};
}
function dataset(rows=[response()]):ReferenceDataset {
 return {version:1,datasetId:'synthetic-unit-fixture',modelVersion:'fixture-model',scoringPolicyVersion:'fixture-policy',
  expertProtocol:{independent:true,blindToAi:true,qualified:true},scoreBandCutoffs:[.1,.25,.4,.6,.8,.95],responses:rows};
}
it('does not manufacture perfect kappa for a constant single-band dataset',()=>{
 expect(ordinalQuadraticKappa([[2,2],[2,2]])).toBeNull();
 expect(ordinalQuadraticKappa([[0,0],[6,6]])).toBe(1);
 expect(ordinalQuadraticKappa([[0,6],[6,0]])).toBe(-1);
 const report=evaluateReferenceDataset(dataset());
 expect(report.overall.mae).toBe(0);expect(report.overall.qwk).toBeNull();
 expect(report.overall.mae95LearnerBootstrap).toBeNull();expect(report.releaseApproved).toBe(false);
});
it.each(['learnerId','promptId'] as const)('rejects %s leakage across development and holdout',key=>{
 const development={...response('development'),split:'development' as const};const holdout=response('holdout');holdout[key]=development[key];
 expect(()=>evaluateReferenceDataset(dataset([development,holdout]))).toThrow('leakage');
});
it('requires genuinely separate expert identifiers and a third adjudicator on disagreement',()=>{
 const row=response();row.expertRatings[1].band=3;
 expect(()=>evaluateReferenceDataset(dataset([row]))).toThrow('adjudication');
 row.adjudication={raterId:'expert-a',score:.4,band:3};
 expect(()=>evaluateReferenceDataset(dataset([row]))).toThrow('third rater');
 row.adjudication={raterId:'expert-c',score:.4,band:3};
 const report=evaluateReferenceDataset(dataset([row]));
 expect(report.humanAgreement.adjudicated).toBe(1);expect(report.overall.mae).toBeCloseTo(.1);
});
it('rejects two entries from the same expert',()=>{
 const row=response();row.expertRatings[1].raterId='expert-a';
 expect(()=>evaluateReferenceDataset(dataset([row]))).toThrow('distinct raters');
});
it('reports held and unavailable cases without treating them as scored zeros',()=>{
 const held=response('held');held.runs[0]={runId:'held-run',status:'review_required',score:0,band:0};
 const unavailable=response('unavailable');unavailable.runs[0]={runId:'failed-run',status:'unavailable',score:null,band:null};
 const report=evaluateReferenceDataset(dataset([response(),held,unavailable]));
 expect(report.holdout).toBe(3);expect(report.autoScored).toBe(1);expect(report.review).toBe(1);expect(report.unavailable).toBe(1);
 expect(report.autoCoverage).toBeCloseTo(1/3);expect(report.overall.mae).toBe(0);
});
it('rejects numeric outage placeholders and out-of-range scores',()=>{
 const row=response();row.runs[0]={runId:'bad',status:'unavailable',score:.5,band:3};
 expect(()=>evaluateReferenceDataset(dataset([row]))).toThrow('placeholder');
 row.runs[0]={runId:'bad',status:'scored',score:1.1,band:3};
 expect(()=>evaluateReferenceDataset(dataset([row]))).toThrow();
});
it('uses the predeclared first run, not the repeat with the smallest error',()=>{
 const row=response();row.runs[0].score=.5;row.runs[0].band=4;
 const report=evaluateReferenceDataset(dataset([row]));
 expect(report.overall.mae).toBeCloseTo(.2);expect(report.overall.placement.overplacementRate).toBe(1);
 expect(report.overall.placement.twoOrMoreBandErrorRate).toBe(1);
 expect(report.repeatability.withinFivePointsRate).toBe(0);
});
it('does not claim repeatability with fewer than five complete runs',()=>{
 const row=response();row.runs=row.runs.slice(0,4);
 const report=evaluateReferenceDataset(dataset([row]));
 expect(report.repeatability.eligible).toBe(0);expect(report.repeatability.withinFivePointsRate).toBeNull();
 expect(report.evidenceGaps.repeatabilityMissing).toBe(1);
});
it('reports direction of boundary errors separately',()=>{
 const row=response();row.expertRatings.forEach(rating=>{rating.score=.4;rating.band=3;});row.runs.forEach(run=>{run.score=.3;run.band=2;});
 const report=evaluateReferenceDataset(dataset([row]));
 expect(report.overall.boundaryPlacement.n).toBe(1);expect(report.overall.boundaryPlacement.underplacementRate).toBe(1);
});
it('returns reproducible learner-cluster confidence intervals',()=>{
 const first=response('first'),second=response('second');second.runs[0].score=.4;
 const one=evaluateReferenceDataset(dataset([first,second])),two=evaluateReferenceDataset(dataset([first,second]));
 expect(one.overall.mae95LearnerBootstrap).toEqual(two.overall.mae95LearnerBootstrap);
 expect(one.overall.mae95LearnerBootstrap?.[0]).toBeLessThanOrEqual(one.overall.mae!);
 expect(one.overall.mae95LearnerBootstrap?.[1]).toBeGreaterThanOrEqual(one.overall.mae!);
});
it('suppresses small subgroup metrics and excludes response and learner identifiers from reports',()=>{
 const row={...response(),groups:{age:'7-10'}};const report=evaluateReferenceDataset(dataset([row]));
 expect(report.subgroups['age/7-10']).toEqual({suppressed:true,n:1});
 expect(JSON.stringify(report)).not.toContain('learner-one');expect(JSON.stringify(report)).not.toContain('prompt-one');
});
it('rejects duplicate responses/runs, unsorted cutoffs and candidate text fields',()=>{
 const row=response();expect(()=>evaluateReferenceDataset(dataset([row,row]))).toThrow('Duplicate');
 const duplicate=response();duplicate.runs[1].runId=duplicate.runs[0].runId;
 expect(()=>evaluateReferenceDataset(dataset([duplicate]))).toThrow('Duplicate');
 expect(()=>evaluateReferenceDataset({...dataset(),scoreBandCutoffs:[.2,.1,.3,.4,.5,.6]})).toThrow('increasing');
 expect(()=>evaluateReferenceDataset(dataset([{...response(),answer:'candidate text'} as any]))).toThrow();
});
it('does not report success from empty holdout evidence',()=>{
 const report=evaluateReferenceDataset(dataset([]));expect(report.overall.mae).toBeNull();expect(report.autoCoverage).toBeNull();
 expect(report.evidenceGaps.cellsBelow30Learners).toHaveLength(14);expect(report.releaseApproved).toBe(false);
});
it('does not confuse many tasks from one learner with independent coverage or subgroup evidence',()=>{
 const rows=Array.from({length:30},(_,index)=>({...response(String(index)),learnerId:'one-learner',groups:{device:'phone'}}));
 const report=evaluateReferenceDataset(dataset(rows));
 expect(report.scoredCounts['WRITING/2']).toBe(30);expect(report.scoredLearnerCounts['WRITING/2']).toBe(1);
 expect(report.evidenceGaps.cellsBelow30Learners).toContain('WRITING/2');expect(report.subgroups['device/phone'].suppressed).toBe(true);
});
it('handles inclusive boundary and adjudication thresholds without floating-point artifacts',()=>{
 const row=response();row.expertRatings[0].score=.3;row.expertRatings[1].score=.45;
 expect(()=>evaluateReferenceDataset(dataset([row]))).not.toThrow();
 const edge=response('edge');edge.expertRatings.forEach(rating=>rating.score=.27);
 expect(evaluateReferenceDataset(dataset([edge])).overall.boundaryPlacement.n).toBe(1);
});
