import { describe, expect, it } from 'vitest';
import { AssessmentEngine } from '../engine';
import { shuffleMcqOptions } from '../mcq-options';
import { scoreFreemiumResponse } from '../../product-lines/freemium-response-scoring';
import { estimateTheta } from '../estimator';
import { SkillType, type Item } from '../types';
const item: Item = {id:'w',skill:SkillType.WRITING,type:'OPEN_RESPONSE',params:{a:1,b:0,c:0},isPretest:false,status:'ACTIVE'};
describe('ability estimation evidence boundaries', () => {
  it('matches displayed shuffled option labels to the server answer key for every session', () => {
    const options = ['A','B','C','D'].map((id,n) => ({id,text:n===1?'correct':'wrong '+id}));
    for(let n=0;n<20;n++) {
      const shuffled = shuffleMcqOptions(options,'B',String(n),'item')!;
      const index = shuffled.shuffledOptions.findIndex(option => option.text === 'correct');
      expect(shuffled.newCorrectAnswer).toBe(String.fromCharCode(65+index));
      const item = {skill:'READING',type:'MULTIPLE_CHOICE',content:{options:shuffled.shuffledOptions.map(option=>option.text),correctAnswer:shuffled.newCorrectAnswer}};
      expect(scoreFreemiumResponse(item,index)).toBe(true);
      expect(scoreFreemiumResponse(item,(index+1)%4)).toBe(false);
    }
  });
  it('keeps an operational but pending response outside all ability estimates', () => {
    const engine = new AssessmentEngine({minItems:2,maxItems:20,semThreshold:.3,startingTheta:0,startingSem:1});
    const result = engine.processResponse(engine.initializeSession(),{itemId:'w',score:0,isPretest:true},{w:item});
    expect(result.theta).toBe(0); expect(result.sem).toBe(1);
    expect(result.responses[0].isPretest).toBe(true);
    expect(result.skillProfiles?.WRITING).toBeUndefined();
  });
  it('does not underflow during a long mixed session', () => {
    const responses = Array.from({length:2000},(_,n) => ({itemId:'w',score:n%2}));
    const result = estimateTheta(responses,{w:item});
    expect(Number.isFinite(result.theta)).toBe(true);
    expect(Number.isFinite(result.sem)).toBe(true);
    expect(result.theta).toBeCloseTo(0,2);
  });
  it('rejects invalid priors and scores rather than reporting a NaN level', () => {
    expect(() => estimateTheta([],{w:item},0,0)).toThrow();
    expect(() => estimateTheta([{itemId:'w',score:NaN}],{w:item})).toThrow();
    expect(() => estimateTheta([{itemId:'missing',score:1}],{})).toThrow();
  });
  it('retains partial-credit productive evidence through GRM estimation', () => {
    const estimate = (score:number) => estimateTheta([{itemId:'w',score}],{w:item},0,1,{useGrmProductive:true}).theta;
    expect(estimate(.8)).toBeGreaterThan(estimate(.2));
  });
});
