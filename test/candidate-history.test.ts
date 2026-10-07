import {describe,it,expect} from 'vitest';
import {hasFinalResult,historySkills,historyStatus} from '../src/lib/reporting/candidate-history';
const session = () => ({status:'COMPLETED',scoreReport:{isVerified:true,diagnosticReport:{scoringComplete:true,skillProfiles:{READING:{cefr:'B1'}}},grammarScore:40,vocabularyScore:50,readingScore:60,listeningScore:0,writingScore:null,speakingScore:NaN}});
describe('candidate history score evidence',()=>{
 it('keeps stored 0–100 scores and zero, omits missing scores, and includes grammar/vocabulary',()=>{
  expect(historySkills(session())).toEqual([{label:'Grammar',value:40,level:'—'},{label:'Vocabulary',value:50,level:'—'},{label:'Reading',value:60,level:'B1'},{label:'Listening',value:0,level:'—'}]);
 });
 it('does not show unverified or pending grades as final results',()=>{
  const s=session();s.scoreReport.isVerified=false;
  expect(hasFinalResult(s)).toBe(false);expect(historyStatus(s)).toBe('Scoring Pending');expect(historySkills(s)).toEqual([]);
  s.status='SCORING';expect(historyStatus(s)).toBe('Scoring Pending');
 });
 it('withholds grades under security review even if a stale report is verified',()=>{
  const s={...session(),metadata:{securityFlag:true}};
  expect(hasFinalResult(s)).toBe(false);expect(historyStatus(s)).toBe('Under Review');expect(historySkills(s)).toEqual([]);
 });
 it('requires explicitly complete scoring evidence',()=>{
  const s=session();s.scoreReport.diagnosticReport.scoringComplete=false;
  expect(hasFinalResult(s)).toBe(false);expect(historySkills(s)).toEqual([]);
 });
});
