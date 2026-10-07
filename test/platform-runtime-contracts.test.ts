import { expect, it, vi } from 'vitest';
import { buildScoringStatus } from '../src/lib/scoring/scoring-status.js';
import { compareSessionGrowth } from '../src/lib/analytics/session-growth.js';
import { summarizeOrganizationSkills } from '../src/lib/analytics/organization-summary.js';
import { buildTrustReport } from '../src/lib/proctoring/trust-report.js';
import { createAuthenticatedFetch } from '../src/lib/http/api-fetch.js';

it('withholds failed and review scores while accepting zero as a completed grade', () => {
  expect(buildScoringStatus([{id:'a',score:0,metadata:{asyncScored:true}}])).toMatchObject({complete:true,items:[{status:'scored',score:0}]});
  expect(buildScoringStatus([{id:'a',score:0.5,metadata:{scoreSource:'ai_unavailable'}}])).toMatchObject({complete:false,needsReview:true,items:[{status:'unavailable'}]});
  expect(buildScoringStatus([{id:'a',score:null,metadata:{pendingAsyncScore:true}}])).toMatchObject({complete:false,items:[{status:'pending'}]});
  expect(buildScoringStatus([{id:'a',score:0.8,metadata:{requiresHumanReview:true}}])).toMatchObject({complete:false,needsReview:true});
  expect(buildScoringStatus([{id:'a',score:null,isPretest:true}])).toMatchObject({complete:false,items:[]});
});

const session = (id:string, theta:number, date:string) => ({id,candidateId:'candidate',status:'COMPLETED',theta,sem:0.3,
  completedAt:new Date(date),responses:[{score:1}],metadata:{productLine:'General English'}});
it('compares actual assessments using the error of their difference', () => {
  const from=session('one',0,'2026-09-01');const to=session('two',1,'2026-10-01');
  expect(compareSessionGrowth(from,to)).toMatchObject({thetaDelta:1,significantGrowth:true});
  expect(compareSessionGrowth(from,{...to,theta:0.2})).toMatchObject({significantGrowth:false});
  expect(() => compareSessionGrowth(to,from)).toThrow('earlier');
  expect(() => compareSessionGrowth(from,{...to,responses:[{score:null as any}]})).toThrow('completed scoring');
  expect(() => compareSessionGrowth(from,{...to,metadata:{productLine:'Primary'}})).toThrow('same product');
});

it('returns real percentages and the radar chart fields, without inventing absent scores', () => {
  const skills=summarizeOrganizationSkills([{readingScore:80,writingScore:null},{readingScore:60}]);
  expect(skills[0]).toMatchObject({avg:70,subject:'Reading',A:70,count:2});
  expect(skills.find(s=>s.skill==='Writing')).toMatchObject({avg:null,A:null,count:0});
});

it('computes a trust report from canonical event names without invoking a recursive API', () => {
  expect(buildTrustReport('session',[{id:'e',type:'FACE_NOT_DETECTED',severity:3,timestamp:new Date()}])).toMatchObject({trustScore:55,status:'FLAGGED'});
  expect(buildTrustReport('session',[]).summary).toContain('does not establish');
});

it('shares one refresh between concurrent expired requests, then retries both', async () => {
  let refreshDone!: (value:Response)=>void;
  let refreshed=false;
  const fetcher=vi.fn(async (input:RequestInfo|URL) => {
    if(input==='/api/auth/refresh')return new Promise<Response>(resolve => { refreshDone=resolve; });
    return new Response('{}',{status:refreshed?200:401});
  });
  const expired=vi.fn();const apiFetch=createAuthenticatedFetch(fetcher,expired);
  const one=apiFetch('/api/one');const two=apiFetch('/api/two');
  await vi.waitFor(()=>expect(fetcher.mock.calls.filter(([input])=>input==='/api/auth/refresh')).toHaveLength(1));
  refreshed=true;refreshDone(new Response('{}'));
  expect((await one).status).toBe(200);expect((await two).status).toBe(200);
  expect(expired).not.toHaveBeenCalled();
});

it('does not refresh or redirect on external 401 and returns auth failures directly', async () => {
  const fetcher=vi.fn(async()=>new Response('{}',{status:401}));const expired=vi.fn();
  const apiFetch=createAuthenticatedFetch(fetcher,expired);
  await apiFetch('https://external.example/unauthorized');await apiFetch('/api/auth/login');
  expect(fetcher).toHaveBeenCalledTimes(2);expect(expired).not.toHaveBeenCalled();
});
