// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ScoringQueuePanel } from '../admin/UnifiedAdminConsole';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const data={items:[{sessionId:'s',candidateName:'Candidate',candidateEmail:'candidate@example.test',skill:'WRITING',pendingCount:2,reviewCount:1,failedCount:1,retryableCount:1,submittedAt:'2026-10-01',hoursElapsed:1,overdue:false}],stats:{totalPending:2,overdueCount:0,soonCount:0}};
it('shows a load failure instead of a misleading all-clear state',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));render(<ScoringQueuePanel/>);
 expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('No unresolved productive responses.')).toBeNull();
});
it('surfaces failed requeue actions',async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>data}).mockResolvedValueOnce({ok:false});
 vi.stubGlobal('fetch',fetchMock);render(<ScoringQueuePanel/>);
 fireEvent.click(await screen.findByRole('button',{name:'Requeue'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Could not requeue scoring');
 expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('disables automatic retries when only human review remains',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({...data,items:[{...data.items[0],retryableCount:0}]})})));
 render(<ScoringQueuePanel/>);expect(await screen.findByRole('button',{name:'Requeue'})).toHaveProperty('disabled',true);
});
