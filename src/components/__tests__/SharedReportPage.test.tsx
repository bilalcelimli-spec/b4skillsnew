// @vitest-environment jsdom
import React from 'react';
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SharedReportPage} from '../SharedReportPage';
const report={candidateName:'Deniz',cefr:'A1',score:50,productLine:'Rapid Diagnostic (30–40 Min)',completedAt:'2026-10-12T10:00:00Z',
 skills:{reading:50,listening:0,writing:null,speaking:100,grammar:NaN,vocabulary:101}};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('renders zero and midscale scores on the actual 0–100 scale',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>report})));
 render(<SharedReportPage token="valid"/>);
 expect(await screen.findByText('Deniz')).toBeTruthy();
 expect(screen.getByRole('meter',{name:'Reading score'}).getAttribute('style')).toContain('width: 50%');
 expect(screen.getByRole('meter',{name:'Listening score'}).getAttribute('aria-valuenow')).toBe('0');
 expect(screen.queryByRole('meter',{name:'Writing score'})).toBeNull();
 expect(screen.queryByRole('meter',{name:'Vocabulary score'})).toBeNull();
 expect(screen.getByText('Rapid Diagnostic (30–40 Min)')).toBeTruthy();
 expect(screen.queryByText(/Verified by/)).toBeNull();
});
it('ignores late data from the previous link',async()=>{
 let resolveOld!:(value:unknown)=>void;
 vi.stubGlobal('fetch',vi.fn((url:string)=>url.endsWith('/old')?new Promise(resolve=>{resolveOld=resolve;}):Promise.resolve({ok:true,json:async()=>report})));
 const view=render(<SharedReportPage token="old"/>);
 view.rerender(<SharedReportPage token="new"/>);
 expect(await screen.findByText('Deniz')).toBeTruthy();
 resolveOld({ok:true,json:async()=>({...report,candidateName:'Previous student'})});
 await new Promise(resolve=>setTimeout(resolve,0));
 expect(screen.queryByText('Previous student')).toBeNull();
});
it('clears a previous error when opening a new valid link',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/old')?{ok:false,json:async()=>({error:'Result under review'})}:{ok:true,json:async()=>report}));
 const view=render(<SharedReportPage token="old"/>);
 expect(await screen.findByText('Result under review')).toBeTruthy();
 view.rerender(<SharedReportPage token="new"/>);
 expect(await screen.findByText('Deniz')).toBeTruthy();
 expect(screen.queryByText('Result under review')).toBeNull();
});
