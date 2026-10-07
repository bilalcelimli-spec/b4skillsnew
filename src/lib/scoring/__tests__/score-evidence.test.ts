import { describe, expect, it } from 'vitest';
import { shouldExcludeResponseFromAbility, hasCompleteScoringEvidence } from '../score-evidence';
import { validateAIScore } from '../validate-ai-score';

const valid = { score: .7, confidence: .9, cefrLevel: 'B2', feedback: 'Clear response', rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 }, corrections: [] };
describe('score evidence contract', () => {
  it('requires real scored coverage before a report can be verified', () => {
    const reading = {score:1,item:{skill:'READING'}};
    const writing = {score:.7,item:{skill:'WRITING'}};
    expect(hasCompleteScoringEvidence([],{READING:1})).toBe(false);
    expect(hasCompleteScoringEvidence([reading],{READING:1,WRITING:1})).toBe(false);
    expect(hasCompleteScoringEvidence([reading,writing],{READING:1,WRITING:1})).toBe(true);
    expect(hasCompleteScoringEvidence([reading,{...writing,isPretest:true}],{READING:1,WRITING:1})).toBe(false);
    expect(hasCompleteScoringEvidence([reading,{...writing,metadata:{requiresHumanReview:true}}],{READING:1,WRITING:1})).toBe(false);
  });
  it('does not let duplicate responses substitute for independently administered items', () => {
    const repeated = Array.from({length:5},()=>({itemId:'one-reading-item',score:1,item:{skill:'READING'}}));
    expect(hasCompleteScoringEvidence(repeated,{READING:5})).toBe(false);
    expect(hasCompleteScoringEvidence(repeated,{})).toBe(false);
  });
  it.each([
    {}, {score: undefined}, {score: null}, {score: NaN}, {score: Infinity}, {score: 1.2}, {isPretest:true,score:1},
    {score:.5,metadata:{scoreSource:'ai_unavailable'}},
    {score:.9,metadata:{scoreSource:'ai_flagged'}},
    {score:0,metadata:{pendingAsyncScore:true}},
    {score:0,metadata:{scoreFailed:true}},
    {score:.8,metadata:{requiresHumanReview:true}},
  ])('excludes unresolved or invalid evidence: %j', response => expect(shouldExcludeResponseFromAbility(response)).toBe(true));
  it('accepts an async grade after completion and a finalized human rating', () => {
    expect(shouldExcludeResponseFromAbility({score:.8,metadata:{pendingAsyncScore:true,asyncScored:true,scoreSource:'ai_auto'}})).toBe(false);
    expect(shouldExcludeResponseFromAbility({score:.8,metadata:{scoreSource:'human',scoreFailed:true}})).toBe(false);
    expect(shouldExcludeResponseFromAbility({score:0})).toBe(false);
  });
  it('validates provider grades without inventing missing rubric scores', () => {
    expect(validateAIScore(valid)).toEqual(valid);
    for(const invalid of [{...valid,score:NaN},{...valid,score:'0.9'},{...valid,score:5},{...valid,confidence:-1},{...valid,cefrLevel:'UNKNOWN'},{...valid,rubricScores:{}},{...valid,rubricScores:{...valid.rubricScores,grammar:11}}]) {
      expect(() => validateAIScore(invalid)).toThrow();
    }
  });
});
