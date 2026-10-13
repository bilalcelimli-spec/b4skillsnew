import {beforeEach,describe,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({session:{findFirst:vi.fn(),findMany:vi.fn(),count:vi.fn()},user:{findUnique:vi.fn()},
 scoreReport:{findUnique:vi.fn()},response:{findMany:vi.fn()},organization:{findFirst:vi.fn()}}));
vi.mock('../src/lib/prisma',()=>({prisma:db}));
import {ScoreReportService,generateApiKey,verifyApiKey,resolveOrgFromApiKey} from '../src/lib/reporting/score-report-api';
import {REPORT_SKILLS} from '../src/lib/reporting/assessment-report-model';
let session:any,report:any,responses:any[];
beforeEach(()=>{
 vi.clearAllMocks();
 session={id:'exam',candidateId:'student',organizationId:'org',status:'COMPLETED',theta:3,sem:1,
  startedAt:new Date('2026-10-12T09:00:00Z'),completedAt:new Date('2026-10-12T10:00:00Z'),metadata:{sessionType:'DIAGNOSTIC'}};
 responses=REPORT_SKILLS.flatMap(skill=>Array.from({length:5},(_,n)=>({itemId:skill+n,score:1,item:{skill}})));
 report={isVerified:true,overallCefr:'A1',diagnosticReport:{scoringComplete:true,overallTheta:-2,overallSem:.2,
  skillProfiles:Object.fromEntries(REPORT_SKILLS.map(skill=>[skill.toLowerCase(),{theta:-2,sem:.2}]))}};
 db.session.findFirst.mockImplementation(async()=>session);db.user.findUnique.mockResolvedValue({email:'student@example.test'});
 db.scoreReport.findUnique.mockImplementation(async()=>report);db.response.findMany.mockImplementation(async()=>responses);
 db.session.count.mockResolvedValue(2);
});
describe('external reporting uses canonical evidence and CEFR',()=>{
 it('uses the authoritative report estimate, canonical thresholds and normalized skill counts',async()=>{
  const result=await ScoreReportService.getSessionReport('exam','org','https://example.test');
  expect(result!.data).toMatchObject({overall_theta:-2,overall_cefr:'A1',sem:.2,ci_95_lo:-2.392,ci_95_hi:-1.608,
   scoring_complete:true,report_status:'Completed'});
  expect(result!.data.skills).toHaveLength(6);
  expect(result!.data.skills.every(skill=>skill.cefr_band==='A1'&&skill.responses===5)).toBe(true);
  expect(result!.meta.schema_version).toBe('2.0.0');
 });
 it.each(['SCORING','FLAGGED','EXPIRED','PAUSED'])('withholds final values for %s',async status=>{
  session.status=status;
  const result=await ScoreReportService.getSessionReport('exam','org','');
  expect(result!.data).toMatchObject({scoring_complete:false,overall_theta:null,overall_cefr:null,sem:null,ci_95_lo:null,ci_95_hi:null,skills:[]});
 });
 it('does not publish a pretest-only or incomplete scored record',async()=>{
  responses=responses.map(response=>({...response,isPretest:true}));
  expect((await ScoreReportService.getSessionReport('exam','org',''))!.data.scoring_complete).toBe(false);
 });
 it('computes the middle pair median only from eligible completed results',async()=>{
  const first={...session,scoreReport:report,responses},second={...session,id:'second',scoreReport:{...report,diagnosticReport:{...report.diagnosticReport,overallTheta:0}},responses};
  const pending={...session,id:'pending',scoreReport:{...report,isVerified:false},responses};
  db.session.findMany.mockResolvedValue([first,second,pending]);
  const result=await ScoreReportService.getOrgAggregate('org','');
  expect(result.data).toMatchObject({completed:2,avg_theta:-1,median_theta:-1});
  expect(result.meta).toMatchObject({sample_size:3,sample_limit:10000});
 });
 it('uses null instead of a fabricated zero for an empty aggregate',async()=>{
  db.session.findMany.mockResolvedValue([]);
  expect((await ScoreReportService.getOrgAggregate('org','')).data).toMatchObject({completed:0,avg_theta:null,median_theta:null});
 });
 it('handles malformed stored API key digests without throwing and queries the exact digest',async()=>{
  const {key,digest}=generateApiKey();
  expect(verifyApiKey(key,digest)).toBe(true);expect(verifyApiKey(key,'broken')).toBe(false);
  db.organization.findFirst.mockResolvedValue({id:'org',name:'Org',apiKeyDigest:digest});
  expect(await resolveOrgFromApiKey(key)).toMatchObject({id:'org'});
  expect(db.organization.findFirst.mock.calls[0][0].where.apiKeyDigest).toBe(digest);
 });
});
