import {describe,expect,it} from 'vitest';
import {sharedReportSummary} from '../src/lib/reporting/shared-report';
import {type ReportSession, REPORT_SKILLS} from '../src/lib/reporting/assessment-report-model';
const now=new Date('2026-10-13T12:00:00Z');
function fixture():ReportSession{return {id:'exam',status:'COMPLETED',candidate:{name:'Deniz',email:'private@example.test'},
 completedAt:new Date('2026-10-12T10:00:00Z'),validUntil:new Date('2027-10-12T10:00:00Z'),theta:-2,sem:.2,
 metadata:{sessionType:'DIAGNOSTIC',productLine:'15-Min Diagnostic'},
 scoreReport:{id:'report',isVerified:true,overallCefr:'A1',overallScore:0,readingScore:50,listeningScore:0,
  writingScore:null,speakingScore:100,grammarScore:NaN,vocabularyScore:101,diagnosticReport:{scoringComplete:true}},
 responses:REPORT_SKILLS.flatMap(skill=>Array.from({length:5},()=>({score:1,item:{skill}})))};}
describe('public report evidence and scale',()=>{
 it('publishes real completion, product and finite 0–100 scores without private evidence',()=>{
  const result=sharedReportSummary(fixture(),'https://example.test',now);
  expect(result).toMatchObject({candidateName:'Deniz',productLine:'Rapid Diagnostic (30–40 Min)',cefr:'A1',score:0,
   completedAt:'2026-10-12T10:00:00.000Z',skills:{reading:50,listening:0,writing:null,speaking:100,grammar:null,vocabulary:null}});
  expect(JSON.stringify(result)).not.toContain('private@example.test');
  expect(result).not.toHaveProperty('responses');
 });
 it.each(['SCORING','FLAGGED','PAUSED','IN_PROGRESS'])('rejects the current %s state even with a previously valid token',status=>{
  const session=fixture();session.status=status;
  expect(()=>sharedReportSummary(session,'',now)).toThrow('not available');
 });
 it('rejects metadata security holds and stale verification with missing response evidence',()=>{
  const held=fixture();held.metadata={sessionType:'DIAGNOSTIC',securityFlag:true};
  expect(()=>sharedReportSummary(held,'',now)).toThrow('not available');
  const incomplete=fixture();incomplete.responses!.pop();
  expect(()=>sharedReportSummary(incomplete,'',now)).toThrow('not available');
 });
 it('expires at the exact validity boundary',()=>{
  const source=fixture();source.validUntil=now;
  try{sharedReportSummary(source,'',now);throw Error('Expected expiry');}
  catch(error){expect(error).toMatchObject({statusCode:410});}
 });
});
