// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RatingDashboard } from '../RatingDashboard';
vi.mock('../../hooks/useToast.js',()=>({useToast:()=>({toast:vi.fn()})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const task={id:'task',status:'CLAIMED',raterId:'first',secondRaterId:'second',needsSecondRater:true,createdAt:'2026-10-01',response:{id:'response',value:'Actual candidate text',metadata:{scoringMode:'WRITING'},item:{skill:'WRITING',cefrLevel:'A2',content:{prompt:'Write an email',passage:'Source passage'}},session:{id:'session',candidate:{name:'Candidate'}}}};
function setup(taskValue:any){
 const fetchMock=vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('/stats')?{pending:0,claimed:1,completed:0,flagged:0,avgQwk:null}:[taskValue]}));
 vi.stubGlobal('fetch',fetchMock);render(<RatingDashboard raterId="second"/>);return fetchMock;
}
it('resumes an assigned second rating without attempting to claim again',async()=>{
 const fetchMock=setup(task);await screen.findByText('Candidate',{exact:false});
 fireEvent.click(screen.getByRole('button',{name:'CLAIMED'}));
 fireEvent.click(await screen.findByRole('button',{name:/WRITING.*A2/}));
 expect(await screen.findByRole('button',{name:'Submit Second Rating'})).toBeTruthy();
 expect(screen.getByText('Actual candidate text')).toBeTruthy();expect(screen.getByText('Source passage')).toBeTruthy();
 expect(fetchMock.mock.calls.every(([url])=>!url.includes('/claim'))).toBe(true);
});
it('provides the actual speaking recording to the human rater',async()=>{
 setup({...task,response:{...task.response,value:JSON.stringify({audio:'YWJj',mimeType:'audio/webm;codecs=opus'}),metadata:{scoringMode:'SPEAKING'}}});
 fireEvent.click(await screen.findByRole('button',{name:/SPEAKING.*A2/}));
 expect(await screen.findByLabelText('Candidate recording')).toHaveProperty('src','data:audio/webm;codecs=opus;base64,YWJj');
});
it('prevents a speaking grade when the recording is missing',async()=>{
 setup({...task,response:{...task.response,value:'[recorded]',metadata:{scoringMode:'SPEAKING'}}});
 fireEvent.click(await screen.findByRole('button',{name:/SPEAKING.*A2/}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Candidate recording unavailable. A speaking grade cannot be submitted.');
 expect(screen.getByRole('button',{name:'Submit Second Rating'})).toHaveProperty('disabled',true);
});
it('reports API failure instead of claiming the rating queue is empty',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));render(<RatingDashboard raterId="second"/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Could not load rating queue');
 await waitFor(()=>expect(screen.queryByText('Queue is empty')).toBeNull());
});
it('claims an independent third review and submits to the arbitration endpoint',async()=>{
 const third={...task,status:'FLAGGED',raterId:null,secondRaterId:null,arbitratorId:null,needsSecondRater:false,needsArbitration:true};
 const fetchMock=vi.fn(async(url:string,options?:any)=>({ok:true,json:async()=>url.includes('/stats')?{pending:0,claimed:0,completed:0,flagged:1,avgQwk:null}:options?.method==='POST'?{id:'task'}:[third]}));
 vi.stubGlobal('fetch',fetchMock);render(<RatingDashboard raterId="third"/>);
 fireEvent.click(await screen.findByRole('button',{name:'FLAGGED (1)'}));
 fireEvent.click(await screen.findByRole('button',{name:/WRITING.*A2/}));
 expect(await screen.findByRole('button',{name:'Submit Third Rating'})).toBeTruthy();
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Independent third judgment'}});
 fireEvent.click(screen.getByRole('button',{name:'Submit Third Rating'}));
 await waitFor(()=>expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/submit-arbitration'))).toBe(true));
 expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/claim-arbitration'))).toBe(true);
});
it('resumes a claimed arbitration without exposing AI suggestions',async()=>{
 const third={...task,arbitratorId:'second',raterId:null,secondRaterId:null,needsSecondRater:false,needsArbitration:true,
  response:{...task.response,metadata:{scoringMode:'WRITING',reviewQueue:{aiResult:{cefrLevel:'C2',score:1,feedback:'AI suggestion'}}}}};
 const fetchMock=setup(third);
 fireEvent.click(await screen.findByRole('button',{name:/WRITING.*A2/}));
 expect(await screen.findByRole('button',{name:'Submit Third Rating'})).toBeTruthy();
 expect(screen.queryByText('AI suggestion')).toBeNull();
 expect(fetchMock.mock.calls.every(([url])=>!url.includes('/claim'))).toBe(true);
});
