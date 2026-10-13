// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestPlayer } from "../TestPlayer";
import { writingDraftKey } from "../../lib/assessment-engine/writing-draft";
import { ProctoringEventBody } from '../../lib/security/schemas/proctoring';

vi.mock("../../lib/i18n/config", () => ({}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, options?: any) => options?.defaultValue?.replace(/{{(\w+)}}/g, (_: string, name: string) => String(options[name])) ?? key }) }));
vi.mock("../ProctoringMonitor", () => ({ ProctoringMonitor: ({ onEvent }: any) => <button onClick={() => onEvent('TAB_SWITCH', 'MEDIUM', { count: 1 })}>Emit proctoring event</button> }));
vi.mock("../LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("../FaceCapture", () => ({ FaceCapture: ({ onCaptureDone }: any) => <button onClick={onCaptureDone}>Verify</button> }));
vi.mock("../PracticeMode", () => ({ PracticeMode: ({ onComplete }: any) => <button onClick={onComplete}>Finish practice</button> }));
vi.mock("../CandidateFeedback", () => ({ CandidateFeedback: () => <p>Finished</p> }));
vi.mock("../ItemRenderer", () => ({ ItemRenderer: ({ item, onResponse, disabled }: any) => <><p>{item.id}</p><button disabled={disabled} onClick={() => onResponse("Saved essay")}>Send essay</button></> }));
vi.mock("motion/react", () => ({ motion: { div: ({ children }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => children }));

describe("TestPlayer response persistence", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });
  it('sends monitor events using the server validation contract', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/launch')) return { ok: true, json: async () => ({ sessionId: 'exam-cuid' }) };
      if (url.endsWith('/status')) return { ok: true, json: async () => ({ progress: 0 }) };
      if (url === '/api/proctoring/event') return { ok: true, status: 200 };
      return { ok: true, json: async () => ({ item: { id: 'listening-1', skill: 'LISTENING' } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<TestPlayer organizationId="org" candidateId="candidate" onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish practice' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Emit proctoring event' }));
    const eventCall = (fetchMock.mock.calls as unknown as [string, RequestInit][]).find(([url]) => url === '/api/proctoring/event')!;
    const payload = JSON.parse(String(eventCall[1].body));
    expect(ProctoringEventBody.parse(payload)).toEqual({ sessionId: 'exam-cuid', eventType: 'TAB_BLUR', severity: 'WARNING', metadata: { count: 1 } });
    expect(eventCall[1].credentials).toBe('include');
  });
  it('advances from the first listening item and displays the complete CUID exam ID', async () => {
    const sid = 'cmuodnduq0006qo1s8x1mv07x';
    let saved = false;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/launch')) return { ok: true, json: async () => ({ sessionId: sid, currentSection: 'LISTENING' }) };
      if (url.endsWith('/respond')) { saved = true; return { ok: true, json: async () => ({ success: true }) }; }
      if (url.endsWith('/status')) return { ok: true, json: async () => ({ progress: saved ? 1 : 0 }) };
      return { ok: true, json: async () => ({ currentSection: 'LISTENING', item: { id: saved ? 'listening-2' : 'listening-1', skill: 'LISTENING' } }) };
    }));
    render(<TestPlayer organizationId="org" candidateId="candidate" onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish practice' }));
    expect(await screen.findByText('listening-1')).toBeTruthy();
    expect(screen.getByLabelText('Exam ID').textContent).toContain(sid);
    fireEvent.click(screen.getByRole('button', { name: 'Send essay' }));
    expect(await screen.findByText('listening-2')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send essay' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('recovers a failed next request without resubmitting the saved listening answer', async () => {
    let nextCalls = 0, responses = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/launch')) return { ok: true, json: async () => ({ sessionId: 'cuid-exam' }) };
      if (url.endsWith('/respond')) { responses++; return { ok: true, json: async () => ({ success: true }) }; }
      if (url.endsWith('/status')) return { ok: true, json: async () => ({ progress: responses }) };
      nextCalls++;
      if (nextCalls === 2) return { ok: false, json: async () => ({ error: 'Next task temporarily unavailable' }) };
      return { ok: true, json: async () => ({ item: { id: responses ? 'listening-2' : 'listening-1', skill: 'LISTENING' } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<TestPlayer organizationId="org" candidateId="candidate" onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish practice' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Send essay' }));
    expect(await screen.findByText('Next task temporarily unavailable')).toBeTruthy();
    expect(screen.getByText('Exam ID: cuid-exam')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try Reconnecting' }));
    expect(await screen.findByText('listening-2')).toBeTruthy();
    expect(responses).toBe(1);
  });
  it("saves before scoring and clears the draft only after a successful retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let saved = false;
    let attempts = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/launch")) return { ok: true, json: async () => ({ sessionId: "session-1" }) };
      if (url.endsWith("/next")) return { ok: true, json: async () => saved ? { stop: true, finalTheta: 0 } : { item: { id: "item-1", skill: "WRITING", metadata: { prompt: "Write" } } } };
      if (url.endsWith("/status")) return { ok: true, json: async () => ({ progress: 0 }) };
      if (url.endsWith("/respond")) {
        attempts++;
        saved = attempts > 1;
        return { ok: saved, json: async () => saved ? { success: true } : { error: "Please retry" } };
      }
      throw new Error(`Unexpected endpoint ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const key = writingDraftKey("session-1", "item-1");
    sessionStorage.setItem(key, "Saved essay");
    render(<TestPlayer organizationId="org-1" candidateId="candidate-1" onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Verify" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finish practice" }));
    fireEvent.click(await screen.findByRole("button", { name: "Send essay" }));
    await screen.findByRole("alert");
    expect(sessionStorage.getItem(key)).toBe("Saved essay");
    fireEvent.click(screen.getByRole("button", { name: "Send essay" }));
    await waitFor(() => expect(sessionStorage.getItem(key)).toBeNull());
    expect(attempts).toBe(2);
    expect(fetchMock.mock.calls.every(([url]) => !url.startsWith("/api/ai/"))).toBe(true);
  });
  it('launches only one assessment when StrictMode replays effects', async () => {
    const started = vi.fn();
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/launch')
      ? { sessionId: 'one-session' } : url.endsWith('/status') ? { progress: 0 } : { item: { id: 'item', skill: 'READING' } } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<React.StrictMode><TestPlayer organizationId="org" candidateId="candidate" onComplete={vi.fn()} onSessionStarted={started} /></React.StrictMode>);
    await waitFor(() => expect(started).toHaveBeenCalledWith('one-session'));
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/launch'))).toHaveLength(1);
  });
  it('resumes the existing attempt without launching or repeating practice', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/status')
      ? { status: 'IN_PROGRESS', startedAt: new Date().toISOString(), progress: 4 }
      : { item: { id: 'resumed-reading', skill: 'READING' } } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="original-session" onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('resumed-reading')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Finish practice' })).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/launch'))).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/original-session/next', expect.anything());
  });

  it('loads analytics on opening, restores six skill counts, and reports a retryable error', async () => {
    let statusCalls = 0;
    const status = {status:'IN_PROGRESS',progress:8,scoredCount:7,cefrLevel:'B1',sectionOrder:['READING','LISTENING','WRITING','SPEAKING','GRAMMAR','VOCABULARY'],sectionCounts:{READING:5,WRITING:3},skillProgress:{READING:{answered:5,scored:5,pending:0,maxItems:5},WRITING:{answered:3,scored:2,pending:1,maxItems:5}}};
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
      if(url.endsWith('/status')) {statusCalls++;return {ok:statusCalls!==3,json:async()=>status};}
      return {ok:true,json:async()=>({item:{id:'reading-resume',skill:'READING'}})};
    }));
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="resume" onComplete={vi.fn()} onCancel={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Verify'}));
    await screen.findByText('reading-resume');
    const analytics=screen.getByRole('button',{name:'admin.analytics'});
    fireEvent.click(analytics);
    expect(await screen.findByText('Progress could not be loaded. Your exam can continue.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'common.retry'}));
    expect(await screen.findByText('8 answers submitted')).toBeTruthy();
    expect(screen.getByText('5 / 5')).toBeTruthy();expect(screen.getByText('3 / 5')).toBeTruthy();
    expect(screen.getByText('2 scored · 1 awaiting scoring')).toBeTruthy();
    expect(screen.getByText('Provisional level: B1')).toBeTruthy();
    expect(screen.getByRole('heading',{name:'Grammar'})).toBeTruthy();
    expect(screen.getByRole('heading',{name:'Vocabulary'})).toBeTruthy();
    expect(analytics.getAttribute('aria-expanded')).toBe('true');
  });
  it('confirms exit, supports cancellation and preserves the writing draft without finishing the exam', async () => {
    const onExit=vi.fn(),onComplete=vi.fn();
    const fetchMock=vi.fn(async(url:string)=>({ok:true,json:async()=>url.endsWith('/status')?{status:'IN_PROGRESS'}:{item:{id:'draft-item',skill:'WRITING'}}}));
    vi.stubGlobal('fetch',fetchMock);
    sessionStorage.setItem(writingDraftKey('existing','draft-item'),'Unsubmitted draft');
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={onComplete} onCancel={onExit}/>);
    await screen.findByRole('button',{name:'Verify'});
    fireEvent.click(screen.getByRole('button',{name:'Exit exam'}));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Stay in exam'}));
    expect(screen.queryByRole('dialog')).toBeNull();expect(onExit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Verify'}));
    fireEvent.click(screen.getByRole('button',{name:'Exit exam'}));
    fireEvent.click(screen.getAllByRole('button',{name:'Exit exam'})[1]);
    await waitFor(()=>expect(onExit).toHaveBeenCalledTimes(1));expect(onComplete).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(writingDraftKey('existing','draft-item'))).toBe('Unsubmitted draft');
    expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/complete')||url.endsWith('/launch'))).toBe(false);
  });

  it('ignores a late completion response after the user leaves', async()=>{
    let resolveNext: (value:any)=>void = () => {};
    const next = new Promise(resolve=>{resolveNext=resolve;});
    const onComplete=vi.fn(),onExit=vi.fn();
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/status')
      ? {ok:true,json:async()=>({status:'IN_PROGRESS'})} : url.endsWith('/pause') ? {ok:true,json:async()=>({status:'PAUSED'})} : next));
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={onComplete} onCancel={onExit}/>);
    await screen.findByRole('button',{name:'Verify'});
    fireEvent.click(screen.getByRole('button',{name:'Exit exam'}));
    fireEvent.click(screen.getAllByRole('button',{name:'Exit exam'})[1]);
    await waitFor(()=>expect(onExit).toHaveBeenCalledOnce());
    await act(async()=>{resolveNext({ok:true,json:async()=>({stop:true,finalTheta:1})});});
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('resumes a paused attempt before fetching a question and disables a second exit',async()=>{
    let resumed=false;
    const fetchMock=vi.fn(async(url:string)=>{
      if(url.endsWith('/resume')) {resumed=true;return {ok:true,json:async()=>({status:'IN_PROGRESS'})};}
      if(url.endsWith('/status')) return {ok:true,json:async()=>({status:resumed?'IN_PROGRESS':'PAUSED',pause:{used:true},startedAt:new Date().toISOString()})};
      expect(resumed).toBe(true);
      return {ok:true,json:async()=>({item:{id:'saved-question',skill:'READING'}})};
    });
    vi.stubGlobal('fetch',fetchMock);
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={vi.fn()} onCancel={vi.fn()}/>);
    await screen.findByRole('button',{name:'Verify'});
    expect(screen.getByRole('button',{name:'Exit allowance used'}).hasAttribute('disabled')).toBe(true);
    expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/launch'))).toBe(false);
  });

  it('detects a pause from another window even while analytics is closed',async()=>{
    let paused=false;const exit=vi.fn();
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.endsWith('/status')
      ? {status:paused?'PAUSED':'IN_PROGRESS',pause:{used:paused,resumeUntil:new Date(Date.now()+48*3600000).toISOString()}}
      : {item:{id:'saved-question',skill:'READING'}}})));
    vi.useFakeTimers();
    await act(async()=>{render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={vi.fn()} onCancel={exit}/>);});
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Verify'}));});
    expect(screen.getByText('saved-question')).toBeTruthy();paused=true;
    await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});vi.useRealTimers();
    expect(screen.getByRole('heading',{name:'Your exam is paused'})).toBeTruthy();
    expect(screen.queryByRole('button',{name:'Send essay'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Back to dashboard'}));expect(exit).toHaveBeenCalledOnce();
  });

  it.each(['network', 'conflict'])('recovers an already saved answer after a %s failure without submitting again',async failure=>{
    let saved=false;const complete=vi.fn();
    const fetchMock=vi.fn(async(url:string)=>{
      if(url.endsWith('/status'))return {ok:true,json:async()=>({status:'IN_PROGRESS',answeredItemIds:saved?['item-1']:[],sectionCounts:{WRITING:saved?1:0}})};
      if(url.endsWith('/respond')){
        saved=true;
        if(failure==='network')throw new TypeError('Connection lost after save');
        return {ok:false,status:409,json:async()=>({error:'Already answered'})};
      }
      return {ok:true,json:async()=>({currentSection:'WRITING',item:{id:saved?'item-2':'item-1',skill:'WRITING'}})};
    });
    vi.stubGlobal('fetch',fetchMock);sessionStorage.setItem(writingDraftKey('existing','item-1'),'Keep until saved');
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={complete}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Verify'}));
    fireEvent.click(await screen.findByRole('button',{name:'Send essay'}));
    expect(await screen.findByText('item-2')).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([url])=>url.endsWith('/respond'))).toHaveLength(1);
    expect(sessionStorage.getItem(writingDraftKey('existing','item-1'))).toBeNull();expect(complete).not.toHaveBeenCalled();
  });
  it('keeps the question and writing draft when the server cannot confirm a saved response',async()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
      if(url.endsWith('/status'))return {ok:true,json:async()=>({status:'IN_PROGRESS',answeredItemIds:[]})};
      if(url.endsWith('/respond'))throw new TypeError('Offline');
      return {ok:true,json:async()=>({item:{id:'item-1',skill:'WRITING'}})};
    }));
    sessionStorage.setItem(writingDraftKey('existing','item-1'),'Keep this draft');
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Verify'}));
    fireEvent.click(await screen.findByRole('button',{name:'Send essay'}));
    await screen.findByRole('alert');
    expect(screen.getByText('item-1')).toBeTruthy();
    expect(sessionStorage.getItem(writingDraftKey('existing','item-1'))).toBe('Keep this draft');
  });
  it('opens results if the lost response completed the attempt',async()=>{
    let saved=false;const complete=vi.fn();
    const fetchMock=vi.fn(async(url:string)=>{
      if(url.endsWith('/status'))return {ok:true,json:async()=>({status:saved?'SCORING':'IN_PROGRESS',answeredItemIds:saved?['item-1']:[]})};
      if(url.endsWith('/respond')){saved=true;throw new TypeError('Connection lost');}
      return {ok:true,json:async()=>({item:{id:'item-1',skill:'WRITING'}})};
    });
    vi.stubGlobal('fetch',fetchMock);
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={complete}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Verify'}));
    fireEvent.click(await screen.findByRole('button',{name:'Send essay'}));
    await waitFor(()=>expect(complete).toHaveBeenCalledExactlyOnceWith(null,'existing'));
    expect(fetchMock.mock.calls.filter(([url])=>url.endsWith('/next'))).toHaveLength(1);
  });
  it('retries an initial status failure in place without launching a new attempt',async()=>{
    let reads=0;
    const fetchMock=vi.fn(async(url:string)=>{
      if(url.endsWith('/status'))return ++reads===1 ? {ok:false,json:async()=>({error:'Temporary connection failure'})} : {ok:true,json:async()=>({status:'IN_PROGRESS'})};
      return {ok:true,json:async()=>({item:{id:'original-question',skill:'READING'}})};
    });
    vi.stubGlobal('fetch',fetchMock);
    render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="existing" onComplete={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Try Reconnecting'}));
    fireEvent.click(await screen.findByRole('button',{name:'Verify'}));
    expect(await screen.findByText('original-question')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/launch'))).toBe(false);
  });

});

it.each(['COMPLETED','SCORING','FLAGGED'])('opens the server report for a terminal %s attempt without restarting',async status=>{
 const onComplete=vi.fn();
 const fetchMock=vi.fn(async()=>({ok:true,json:async()=>({status,theta:3})}));
 vi.stubGlobal('fetch',fetchMock);
 render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="ended-exam" onComplete={onComplete}/>);
 await waitFor(()=>expect(onComplete).toHaveBeenCalledWith(null,'ended-exam'));
 expect(fetchMock.mock.calls).toHaveLength(1);
});
it('offers a dashboard return for an expired attempt even when its pause allowance was used',async()=>{
 const onCancel=vi.fn();
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({status:'EXPIRED',pause:{used:true}})})));
 render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="expired-exam" onComplete={vi.fn()} onCancel={onCancel}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Return to dashboard'}));
 expect(onCancel).toHaveBeenCalledOnce();
});

it('opens the report once if a background status check sees completion',async()=>{
 const onComplete=vi.fn();let statuses=0;
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.endsWith('/status')
  ? {status:++statuses===1?'IN_PROGRESS':'SCORING',pause:{used:false}}
  : {item:{id:'active-item',skill:'READING'}}})));
 render(<TestPlayer organizationId="org" candidateId="candidate" initialSessionId="background-exam" onComplete={onComplete}/>);
 await waitFor(()=>expect(onComplete).toHaveBeenCalledExactlyOnceWith(null,'background-exam'));
});
