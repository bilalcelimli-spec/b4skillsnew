import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({find:vi.fn(), update:vi.fn(), groups:vi.fn(), refresh:vi.fn()}));
vi.mock('../../prisma',()=>({prisma:{response:{findMany:mocks.find,updateMany:mocks.update,groupBy:mocks.groups}}}));
vi.mock('../../assessment-engine/server-engine',()=>({AssessmentService:{refreshSessionScoring:mocks.refresh}}));
vi.mock('../../observability/index',()=>({logger:{error:vi.fn()}}));
import { refreshScoredSession, recoverPendingReportRefreshes } from '../score-report-refresh';
const metadata={reportRefreshPending:true,scoreSource:'human',originalEvidence:true};
beforeEach(()=>{
 vi.clearAllMocks();mocks.find.mockResolvedValue([{id:'response',metadata}]);
 mocks.update.mockResolvedValue({count:1});mocks.refresh.mockResolvedValue(undefined);mocks.groups.mockResolvedValue([]);
});
it('clears retry intent only after the report is successfully rebuilt, preserving evidence',async()=>{
 await refreshScoredSession('session');
 expect(mocks.update).toHaveBeenCalledWith({where:{id:'response',metadata:{equals:metadata}},
  data:{metadata:{...metadata,reportRefreshPending:false}}});
 expect(mocks.refresh.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
});
it('retains durable retry intent when report rebuilding fails',async()=>{
 mocks.refresh.mockRejectedValueOnce(new Error('Database outage'));
 await expect(refreshScoredSession('session')).rejects.toThrow('Database outage');
 expect(mocks.update).not.toHaveBeenCalled();
 await refreshScoredSession('session');
 expect(mocks.update).toHaveBeenCalledOnce();
});
it('does not clear retry intent for a newer grade committed during a refresh',async()=>{
 mocks.update.mockResolvedValue({count:0});
 await refreshScoredSession('session');
 expect(mocks.update.mock.calls[0][0].where.metadata.equals).toEqual(metadata);
});
it('retries after marker cleanup fails without regrading the answer',async()=>{
 mocks.update.mockRejectedValueOnce(new Error('Connection lost'));
 await expect(refreshScoredSession('session')).rejects.toThrow('Connection lost');
 await refreshScoredSession('session');expect(mocks.refresh).toHaveBeenCalledTimes(2);
});
it('serializes overlapping rebuilds of the same session',async()=>{
 let finish!:()=>void;
 mocks.refresh.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve}));
 const first=refreshScoredSession('same'),second=refreshScoredSession('same');
 await vi.waitFor(()=>expect(mocks.refresh).toHaveBeenCalledTimes(1));
 finish();await Promise.all([first,second]);expect(mocks.refresh).toHaveBeenCalledTimes(2);
});
it('recovers persisted retry intent and continues when one session fails',async()=>{
 mocks.groups.mockResolvedValue([{sessionId:'failed'},{sessionId:'good'}]);
 mocks.refresh.mockRejectedValueOnce(new Error('Bad report'));
 expect(await recoverPendingReportRefreshes()).toBe(1);
 expect(mocks.refresh.mock.calls.map(([id])=>id)).toEqual(['failed','good']);
 expect(mocks.update).toHaveBeenCalledOnce();
});
it('shares overlapping recovery scans and releases them after database errors',async()=>{
 mocks.groups.mockRejectedValueOnce(new Error('Offline'));
 const first=recoverPendingReportRefreshes(),second=recoverPendingReportRefreshes();expect(second).toBe(first);
 await expect(first).rejects.toThrow('Offline');
 expect(await recoverPendingReportRefreshes()).toBe(0);
});
it('moves past a failed full batch so later sessions cannot starve',async()=>{
 const rows=Array.from({length:25},(_,n)=>({sessionId:`session-${String(n).padStart(2,'0')}`}));
 mocks.groups.mockResolvedValueOnce(rows).mockResolvedValueOnce([{sessionId:'session-26'}]);
 mocks.refresh.mockRejectedValue(new Error('Failing batch'));
 expect(await recoverPendingReportRefreshes()).toBe(0);
 mocks.refresh.mockResolvedValue(undefined);
 expect(await recoverPendingReportRefreshes()).toBe(1);
 expect(mocks.groups.mock.calls[1][0].where.sessionId.gt).toBe('session-24');
});
