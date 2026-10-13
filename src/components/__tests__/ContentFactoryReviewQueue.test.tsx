// @vitest-environment jsdom
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ContentFactoryReviewQueue} from '../admin/ContentFactoryReviewQueue';
import {ItemReviewBody} from '../../lib/security/schemas/items';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const item={id:'item',itemCode:'G1',version:3,reviewContentHash:'a'.repeat(64),type:'MULTIPLE_CHOICE',skill:'GRAMMAR',cefrLevel:'B1',status:'DRAFT',
 pipelineStage:'AI_DRAFT',content:{prompt:'Choose.',options:['First','Second']},tags:[],itemReviews:[],createdAt:'2026-10-13'};
it.each(['Approve','Minor Revision','Reject'])('sends a valid version-bound %s with the actual UI scale and nullable fields',async verdict=>{
 const fetchMock=vi.fn(async(url:string,options?:any)=>({ok:true,json:async()=>options?.method==='POST'?{review:{id:'saved'}}:[item]}));
 vi.stubGlobal('fetch',fetchMock);render(<ContentFactoryReviewQueue/>);
 fireEvent.click(await screen.findByRole('button',{name:verdict}));fireEvent.click(screen.getByRole('button',{name:'Submit Review'}));
 await waitFor(()=>expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/review'))).toBe(true));
 const sent=JSON.parse(fetchMock.mock.calls.find(([url])=>url.endsWith('/review'))![1].body);
 expect(ItemReviewBody.safeParse(sent).success).toBe(true);
 expect(sent).toMatchObject({expectedVersion:3,expectedContentHash:'a'.repeat(64),expectedStage:'AI_DRAFT',constructClarity:70,ambiguityRisk:10,notes:null});
 expect(sent.stageTarget).toBe(verdict==='Approve'?'LANGUAGE_REVIEW':null);
});
it('keeps the form visible with a stale-snapshot error rather than claiming submission success',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:any)=>({ok:options?.method!=='POST',json:async()=>options?.method==='POST'?{error:'Reload the changed item.'}:[item]})));
 render(<ContentFactoryReviewQueue/>);fireEvent.click(await screen.findByRole('button',{name:'Approve'}));
 fireEvent.click(screen.getByRole('button',{name:'Submit Review'}));
 expect((await screen.findByRole('alert')).textContent).toContain('Reload the changed item');
 expect(screen.queryByText('Submitted!')).toBeNull();
});
it('ignores a late review response after switching to a different stage and item',async()=>{
 let resolvePost!:(value:any)=>void;
 const next={...item,content:{prompt:'Next prompt.',options:['First','Second']},id:'next',version:4,pipelineStage:'LANGUAGE_REVIEW',reviewContentHash:'b'.repeat(64)};
 vi.stubGlobal('fetch',vi.fn(async(url:string,options?:any)=>{
  if(options?.method==='POST')return new Promise(resolve=>{resolvePost=resolve});
  return {ok:true,json:async()=>url.includes('stage=LANGUAGE_REVIEW')?[next]:[item]};
 }));
 render(<ContentFactoryReviewQueue/>);fireEvent.click(await screen.findByRole('button',{name:'Approve'}));
 fireEvent.click(screen.getByRole('button',{name:'Submit Review'}));
 fireEvent.click(screen.getByRole('button',{name:'Language Review'}));
 await screen.findByText('Next prompt.');
 resolvePost({ok:true,json:async()=>({review:{id:'saved'}})});
 await waitFor(()=>expect(screen.queryByText('Submitting…')).toBeNull());
 expect(screen.queryByText('Submitted!')).toBeNull();
 expect(screen.getByRole('button',{name:'Submit Review'}).hasAttribute('disabled')).toBe(true);
});
it('shows revision requests to the author and reports a failed re-submission',async()=>{
 const revision={...item,pipelineStage:'EDITING',itemReviews:[{id:'request',reviewType:'LANGUAGE_REVIEW',verdict:'MINOR_REVISION',createdAt:'2026-10-13',revisionsReq:['Clarify the stem']} ]};
 vi.stubGlobal('fetch',vi.fn(async(url:string,options?:any)=>({ok:options?.method!=='POST',json:async()=>options?.method==='POST'?{error:'Re-submission unavailable.'}:url.includes('stage=EDITING')?[revision]:[]})));
 render(<ContentFactoryReviewQueue/>);fireEvent.click(screen.getByRole('button',{name:'Needs Revision'}));
 expect(await screen.findByText('Clarify the stem')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Submit for Re-review/}));
 expect((await screen.findByRole('alert')).textContent).toContain('Re-submission unavailable');
 expect(screen.queryByText('Re-submitted!')).toBeNull();
});
it('preserves successful re-submission feedback when the delayed list refresh fails',async()=>{
 let reads=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:any)=>options?.method==='POST'?{ok:true,json:async()=>({})}
  :++reads===1?{ok:true,json:async()=>[{...item,pipelineStage:'EDITING'}]}:{ok:false,json:async()=>({error:'Unavailable'})}));
 render(<ContentFactoryReviewQueue/>);
 fireEvent.click(await screen.findByRole('button',{name:/Submit for Re-review/}));
 expect((await screen.findByRole('alert',undefined,{timeout:3000})).textContent).toContain('Revision was sent, but');
 expect(screen.getByText('Re-submitted!')).toBeTruthy();
});

it('keeps the selected stage when an older list response arrives late',async()=>{
 let resolveOld!:(value:any)=>void;
 const next={...item,id:'next',pipelineStage:'LANGUAGE_REVIEW',content:{prompt:'New stage prompt.',options:['A','B']}};
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.includes('stage=LANGUAGE_REVIEW')?{ok:true,json:async()=>[next]}:new Promise(resolve=>{resolveOld=resolve})));
 render(<ContentFactoryReviewQueue/>);fireEvent.click(screen.getByRole('button',{name:'Language Review'}));
 await screen.findByText('New stage prompt.');
 await act(async()=>{resolveOld({ok:true,json:async()=>[item]});});
 expect(screen.getByText('New stage prompt.')).toBeTruthy();expect(screen.queryByText('Choose.')).toBeNull();
});
