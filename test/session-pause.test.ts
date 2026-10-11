import {describe, expect, it, vi} from 'vitest';
import {createSessionPauseService} from '../src/lib/assessment-engine/session-pause-service';
import {effectiveSessionStart, pauseInfo, RESUME_WINDOW_MS} from '../src/lib/assessment-engine/session-pause';
const now = new Date('2026-10-11T12:00:00Z');
function fixture(metadata: any = {}) {
  let session: any = {id: 'exam', candidateId: 'student', status: 'IN_PROGRESS', startedAt: new Date(now.getTime()-60000), metadata: {currentItemId: 'question-3', ...metadata}};
  const update = vi.fn(async ({data}: any) => {session = {...session, ...structuredClone(data)}; return session;});
  const db: any = {$queryRaw: vi.fn(), session: {findUnique: vi.fn(async()=>structuredClone(session)), update}};
  const prisma: any = {$transaction: async (fn: any) => fn(db)};
  return {service: createSessionPauseService(prisma), read: ()=>session, update};
}
describe('one-time exam exit and 48-hour resume policy', () => {
  it('saves one server-owned deadline and preserves remaining adaptive time and question', async () => {
    const {service,read} = fixture();
    await service.change('exam','student','pause', now);
    expect(read().status).toBe('PAUSED');
    expect(read().metadata.examPause.resumeUntil).toBe('2026-10-13T12:00:00.000Z');
    const resumed = new Date(now.getTime()+24*3600000);
    await service.change('exam','student','resume',resumed);
    expect(read().status).toBe('IN_PROGRESS');
    expect(read().metadata.currentItemId).toBe('question-3');
    expect(resumed.getTime()-effectiveSessionStart(read())!.getTime()).toBe(60000);
    expect(read().startedAt.getTime()).toBe(now.getTime()-60000);
    await expect(service.change('exam','student','pause',resumed)).rejects.toMatchObject({statusCode:409});
  });
  it('does not extend either deadline on repeated pause or resume requests', async () => {
    const {service,read,update} = fixture();
    await service.change('exam','student','pause',now);
    await service.change('exam','student','pause',new Date(now.getTime()+10000));
    expect(read().metadata.examPause.resumeUntil).toBe('2026-10-13T12:00:00.000Z');
    await service.change('exam','student','resume',new Date(now.getTime()+20000));
    await service.change('exam','student','resume',new Date(now.getTime()+40000));
    expect(read().metadata.examPause.totalPausedMs).toBe(20000);
    expect(update).toHaveBeenCalledTimes(2);
  });
  it.each([RESUME_WINDOW_MS, RESUME_WINDOW_MS+1])('rejects resume at or after 48 hours (%s) and persists expiry', async offset => {
    const {service,read} = fixture();
    await service.change('exam','student','pause',now);
    await expect(service.change('exam','student','resume',new Date(now.getTime()+offset))).rejects.toMatchObject({statusCode:410});
    expect(read().status).toBe('EXPIRED');
  });
  it('permits resume immediately before 48 hours', async () => {
    const {service,read} = fixture();
    await service.change('exam','student','pause',now);
    await service.change('exam','student','resume',new Date(now.getTime()+RESUME_WINDOW_MS-1));
    expect(read().status).toBe('IN_PROGRESS');
  });
  it('only lets the owning student consume the right', async () => {
    const {service,update} = fixture();
    await expect(service.change('exam','staff','pause',now)).rejects.toMatchObject({statusCode:403});
    expect(update).not.toHaveBeenCalled();
  });
  it.each(['SCHEDULED','COMPLETED','SCORING','FLAGGED','EXPIRED'])('does not pause a %s attempt', async status => {
    const {service,read,update} = fixture(); read().status=status;
    await expect(service.change('exam','student','pause',now)).rejects.toMatchObject({statusCode:409});
    expect(update).not.toHaveBeenCalled();
  });
  it('does not resurrect an elapsed adaptive test', async () => {
    const {service,read} = fixture(); read().startedAt = new Date(now.getTime()-86400000);
    await expect(service.change('exam','student','pause',now)).rejects.toMatchObject({statusCode:409});
  });
  it('preserves fixed-form section, answers and listening position while shifting only its active clock', async () => {
    const fixedForm = {sectionIndex:3, sectionStartedAt:new Date(now.getTime()-60000).toISOString(), listeningStartedAt:new Date(now.getTime()-30000).toISOString(),answers:{'73':'C'}};
    const {service,read} = fixture({sessionType:'FIXED_FORM',fixedForm});
    await service.change('exam','student','pause',now);
    const resumed = new Date(now.getTime()+3600000);
    await service.change('exam','student','resume',resumed);
    expect(read().metadata.fixedForm).toMatchObject({sectionIndex:3,answers:{'73':'C'}});
    expect(resumed.getTime()-Date.parse(read().metadata.fixedForm.sectionStartedAt)).toBe(60000);
    expect(resumed.getTime()-Date.parse(read().metadata.fixedForm.listeningStartedAt)).toBe(30000);
  });
  it('preserves the diagnostic clock and blueprint', async () => {
    const diagnosticState = {startedAt:new Date(now.getTime()-60000).toISOString(), expiresAt:new Date(now.getTime()+120000).toISOString(),skills:{READING:{answered:3}}, complete:false};
    const {service,read} = fixture({sessionType:'DIAGNOSTIC',diagnosticState});
    await service.change('exam','student','pause',now);
    const resumed = new Date(now.getTime()+3600000);
    await service.change('exam','student','resume',resumed);
    expect(Date.parse(read().metadata.diagnosticState.expiresAt)-resumed.getTime()).toBe(120000);
    expect(read().metadata.diagnosticState.skills.READING.answered).toBe(3);
  });
  it('does not pause an elapsed fixed-form section or diagnostic', async () => {
    for (const metadata of [
      {sessionType:'FIXED_FORM',fixedForm:{sectionIndex:0,sectionStartedAt:new Date(now.getTime()-86400000).toISOString()}},
      {sessionType:'DIAGNOSTIC',diagnosticState:{expiresAt:now.toISOString()}}
    ]) await expect(fixture(metadata).service.change('exam','student','pause',now)).rejects.toMatchObject({statusCode:409});
  });
  it('reports pause availability without trusting browser time for enforcement', () => {
    expect(pauseInfo({status:'IN_PROGRESS',metadata:{}})).toMatchObject({used:false,canPause:true,canResume:false});
    expect(pauseInfo({status:'PAUSED',metadata:{examPause:{pausedAt:now.toISOString(),resumeUntil:new Date(now.getTime()+1000).toISOString()}}},now.getTime())).toMatchObject({used:true,canPause:false,canResume:true});
  });
});
