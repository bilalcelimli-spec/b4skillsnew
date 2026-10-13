// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FreemiumTestWidget } from '../FreemiumTestWidget';
const item=(id='first')=>({id,skill:'WRITING',type:'WRITING_PROMPT',content:{prompt:`Write about your holiday (${id}).`,minWords:1}});
const response=(status:number,data:unknown)=>({ok:status>=200&&status<300,status,json:async()=>data});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function begin(){
 fireEvent.click(await screen.findByRole('button',{name:/Start as Guest/}));
 fireEvent.click(await screen.findByRole('button',{name:/I'm Ready/}));
 await screen.findByRole('textbox');
}
async function submit(){
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'My original writing answer.'}});
 fireEvent.click(screen.getByRole('button',{name:/Submit Answer/}));
}
it.each([410,404])('offers an explicit fresh start when the quick check is lost (%s)',async status=>{
 let starts=0;
 const fetchMock=vi.fn(async(url:string)=>url.endsWith('/start')
  ?response(200,{placementId:`session-${++starts}`,firstItem:item(`item-${starts}`),maxItems:36,sectionOrder:['WRITING']})
  :response(status,{code:'PLACEMENT_SESSION_EXPIRED',error:'Quick check expired'}));
 vi.stubGlobal('fetch',fetchMock);
 render(<FreemiumTestWidget onClose={vi.fn()} onSignup={vi.fn()}/>);
 await begin();await submit();
 expect(await screen.findByRole('heading',{name:'Quick check ended'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Retry'})).toBeNull();
 expect(screen.queryByRole('textbox')).toBeNull();
 expect(screen.getByRole('alert').textContent).toContain('cannot be resumed');
 fireEvent.click(screen.getByRole('button',{name:'Start a new quick check'}));
 await screen.findByRole('button',{name:/Start as Guest/});
 expect(starts).toBe(1); // Returning to registration never creates an attempt.
 await begin();expect(starts).toBe(2);
 expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
 expect(fetchMock.mock.calls.filter(([url])=>url.includes('/respond'))).toHaveLength(1);
});
it.each(['service','network'])('keeps the answer available for retry after a transient %s failure',async failure=>{
 let submissions=0;
 const fetchMock=vi.fn(async(url:string)=>{
  if(url.endsWith('/start'))return response(200,{placementId:'session',firstItem:item()});
  if(++submissions===1){if(failure==='network')throw Error('Network interrupted');return response(503,{error:'Temporarily unavailable'});}
  return response(200,{complete:false,nextItem:item('next'),itemsAdministered:1});
 });
 vi.stubGlobal('fetch',fetchMock);
 render(<FreemiumTestWidget onClose={vi.fn()} onSignup={vi.fn()}/>);
 await begin();await submit();
 fireEvent.click(await screen.findByRole('button',{name:'Retry'}));
 await waitFor(()=>expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(''));
 expect(screen.queryByRole('heading',{name:'Quick check ended'})).toBeNull();
 const calls=fetchMock.mock.calls.filter(([url])=>url.endsWith('/respond'));
 expect(calls).toHaveLength(2);
 expect(JSON.parse((calls[0] as any)[1].body).selectedOption).toBe('My original writing answer.');
 expect(JSON.parse((calls[1] as any)[1].body).selectedOption).toBe('My original writing answer.');
});
it('allows closing an expired quick check without starting another attempt',async()=>{
 const onClose=vi.fn();
 const fetchMock=vi.fn(async(url:string)=>url.endsWith('/start')?response(200,{placementId:'session',firstItem:item()}):response(410,{}));
 vi.stubGlobal('fetch',fetchMock);
 render(<FreemiumTestWidget onClose={onClose} onSignup={vi.fn()}/>);
 await begin();await submit();
 fireEvent.click(await screen.findByRole('button',{name:'Close quick check'}));
 expect(onClose).toHaveBeenCalledOnce();expect(fetchMock).toHaveBeenCalledTimes(2);
});
