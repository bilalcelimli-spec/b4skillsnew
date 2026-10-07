import { describe, expect, it } from 'vitest';
import { buildSessionProgress } from '../src/lib/assessment-engine/session-progress';
const response = (skill: string, score: number | null, metadata={}) => ({item:{skill},score,metadata});
describe('authoritative in-exam progress',()=>{
  it('restores submitted counts and distinguishes zero from pending grades in all six diagnostic skills',()=>{
    const progress=buildSessionProgress({status:'IN_PROGRESS',theta:.8,sem:.4,metadata:{sessionType:'DIAGNOSTIC'},responses:[response('READING',0),response('WRITING',null),response('SPEAKING',.8,{requiresHumanReview:true}),{...response('GRAMMAR',1),isPretest:true}]});
    expect(progress).toMatchObject({progress:3,scoredCount:1,pendingCount:2,maxItems:30,maxDurationMs:2700000,cefrLevel:'B2',skills:{reading:0,writing:null,speaking:null,grammar:null,vocabulary:null},skillProgress:{READING:{answered:1,scored:1,pending:0,maxItems:5},WRITING:{answered:1,scored:0,pending:1,maxItems:5}}});
    expect(progress.sectionOrder).toHaveLength(6);
  });
  it('does not invent an initial CEFR level or precision when no grades exist',()=>{
    expect(buildSessionProgress({theta:0,sem:1,metadata:{sessionType:'DIAGNOSTIC'},responses:[]})).toMatchObject({theta:null,sem:null,cefrLevel:null,progress:0});
  });
  it('uses adaptive product section limits rather than a fixed ten questions per skill',()=>{
    const progress=buildSessionProgress({metadata:{productLine:'15-Min Diagnostic'},responses:[]});
    expect(progress.maxItems).toBe(Object.values(progress.sectionLimits).reduce((a,b)=>a+b,0));
    expect(progress.provisional).toBe(true);
  });
});
