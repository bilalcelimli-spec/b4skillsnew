import {beforeEach,describe,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({find:vi.fn(),update:vi.fn(),report:vi.fn(),lock:vi.fn()}));
vi.mock('../src/lib/prisma',()=>({prisma:{session:{findUnique:db.find},$transaction:async(fn:any)=>fn({$queryRaw:db.lock,session:{findUnique:db.find,update:db.update},scoreReport:{upsert:db.report}})}}));
import {DiagnosticService,DiagnosticReportNotReadyError,SKILLS} from '../src/lib/assessment-engine/diagnostic-service';
import {diagnosticStateFromResponses,recalculateDiagnosticState} from '../src/lib/assessment-engine/diagnostic-evidence';
import {thetaToCefr} from '../src/lib/cefr/cefr-framework';
let session:any;
beforeEach(()=>{
 vi.clearAllMocks();
 const skills=Object.fromEntries(SKILLS.map(skill=>[skill,{theta:0,sem:1,answered:5,items:Array.from({length:5},(_,n)=>({itemId:skill+n,skill,type:['WRITING','SPEAKING'].includes(skill)?'WRITING_PROMPT':'MULTIPLE_CHOICE',irtA:1,irtB:0,irtC:0,cefrLevel:'B1',answered:true,score:null}))}]));
 session={id:'exam',theta:-3,status:'SCORING',completedAt:new Date(),metadata:{sessionType:'DIAGNOSTIC',diagnosticState:{sessionId:'exam',candidateId:'candidate',complete:true,skills}},
  responses:SKILLS.flatMap(skill=>Array.from({length:5},(_,n)=>({itemId:skill+n,score:.9,isPretest:false,item:{skill},metadata:{scoreSource:'human'}})))};
 db.find.mockImplementation(async()=>structuredClone(session));
 db.update.mockImplementation(async({data})=>{session={...session,...data};return structuredClone(session)});
 db.report.mockResolvedValue({});
});
describe('diagnostic report after human review',()=>{
 it('recomputes both skill and overall results from final grades, and never invents population percentiles',async()=>{
  const report=await DiagnosticService.getReport('exam');
  const state=diagnosticStateFromResponses(session.metadata.diagnosticState,session.responses);
  const estimate=recalculateDiagnosticState(state);
  expect(report.overallTheta).toBeCloseTo(estimate.theta);expect(report.overallTheta).not.toBe(-3);
  expect(report.overallBand).toBe(thetaToCefr(estimate.theta));
  expect(report.skills.every(skill=>skill.percentile===null)).toBe(true);
 });
 it('requires the full administered skill coverage, not one answered item per skill',async()=>{
  session.responses=session.responses.filter((r:any)=>!r.itemId.endsWith('4'));
  await expect(DiagnosticService.getReport('exam')).rejects.toBeInstanceOf(DiagnosticReportNotReadyError);
 });
 it('keeps unresolved response evidence out of published results',async()=>{
  session.responses[0].score=null;
  await expect(DiagnosticService.getReport('exam')).rejects.toBeInstanceOf(DiagnosticReportNotReadyError);
 });
 it('updates serialized state, overall ability and the persisted report with the diagnostic blueprint',async()=>{
  await DiagnosticService.refreshScoring('exam');
  expect(session.status).toBe('COMPLETED');expect(session.theta).toBeGreaterThan(0);
  expect(session.metadata.diagnosticState.skills.WRITING.items[0].score).toBe(.9);
  expect(db.report.mock.calls[0][0].update).toMatchObject({isVerified:true,diagnosticReport:{scoringComplete:true,overallTheta:session.theta}});
  expect(db.report.mock.calls[0][0].update.writingScore).toBeGreaterThan(50);
 });
 it('keeps pending grades in SCORING and cannot release a security hold',async()=>{
  session.responses[0].score=null;await DiagnosticService.refreshScoring('exam');expect(session.status).toBe('SCORING');
  expect(db.report.mock.calls.at(-1)![0].update.isVerified).toBe(false);
  session.responses[0].score=.9;session.status='FLAGGED';await DiagnosticService.refreshScoring('exam');
  expect(session.status).toBe('FLAGGED');expect(db.report.mock.calls.at(-1)![0].update.isVerified).toBe(false);
  await expect(DiagnosticService.getReport('exam')).rejects.toThrow('under review');
 });
});
