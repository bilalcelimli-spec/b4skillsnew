// @vitest-environment jsdom
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {OzgunKidsPlayer} from '../OzgunKidsPlayer';
import {OZGUN_QUESTIONS} from '../../lib/fixed-forms/ozgun-kids-content.server';
vi.mock('../FaceCapture',()=>({FaceCapture:({onCaptureDone}:any)=><button onClick={onCaptureDone}>Fotoğrafı tamamla</button>}));
vi.mock('../PracticeMode',()=>({PracticeMode:({onComplete,multipleChoiceOnly}:any)=><button data-fixed={multipleChoiceOnly} onClick={onComplete}>Sınavı başlat</button>}));
vi.mock('../ProctoringMonitor',()=>({ProctoringMonitor:()=>null}));
vi.mock('../LanguageSwitcher',()=>({LanguageSwitcher:()=>null}));
vi.mock('react-i18next' ,()=>({useTranslation:()=>({t:(key:string,options:any)=>options?.defaultValue??key})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
function harness(failures=0){
 const state:any={sessionId:'original',status:'SCHEDULED',sectionIndex:0,section:{first:1,last:24,label:'Grammar'},sectionDeadline:null,questions:OZGUN_QUESTIONS.slice(0,24),answers:{},serverNow:new Date().toISOString()};
 let answerCalls=0;
 const fetchMock=vi.fn(async(url:string,init:any={})=>{
  if(url.endsWith('/launch'))return{ok:true,json:async()=>({sessionId:'original'})};
  if(url.endsWith('/start')){state.status='IN_PROGRESS';state.sectionDeadline=new Date(Date.now()+20*60000).toISOString();}
  if(url.endsWith('/answer')){answerCalls++;if(answerCalls<=failures)return{ok:false,json:async()=>({error:'Save failed'})};const body=JSON.parse(init.body);state.answers[String(body.number)]=body.answer;}
  return {ok:true,json:async()=>structuredClone(state)};
 });
 vi.stubGlobal('fetch',fetchMock);return {state,fetchMock};
}
describe('Özgün Kids delivery',()=>{
 it('launches only once in StrictMode and prepares identity before starting the timer',async()=>{
  const {fetchMock}=harness(),started=vi.fn();
  render(<React.StrictMode><OzgunKidsPlayer organizationId="org" onSessionStarted={started} onComplete={vi.fn()}/></React.StrictMode>);
  expect(await screen.findByRole('button',{name:'Fotoğrafı tamamla'})).toBeTruthy();
  expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/start'))).toBe(false);
  expect(fetchMock.mock.calls.filter(([url])=>url.endsWith('/launch'))).toHaveLength(1);expect(started).toHaveBeenCalledTimes(1);
 });
 it('resumes an active attempt without repeating identity checks or restarting its timer',async()=>{
  const {state,fetchMock}=harness();state.status='IN_PROGRESS';state.answers={'1':'B'};
  render(<OzgunKidsPlayer organizationId="org" initialSessionId="original" onComplete={vi.fn()}/>);
  expect((await screen.findByRole('radio',{name:'Option B: She'})).getAttribute('aria-checked')).toBe('true');
  expect(screen.queryByRole('button',{name:'Fotoğrafı tamamla'})).toBeNull();
  expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/start')||url.endsWith('/launch'))).toBe(false);
 });
 it('persists a selected option and resumes the same answer without another launch',async()=>{
  const {fetchMock}=harness();const props={organizationId:'org',initialSessionId:'original',onComplete:vi.fn()};
  const view=render(<OzgunKidsPlayer {...props}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Fotoğrafı tamamla'}));
  fireEvent.click(await screen.findByRole('button',{name:'Sınavı başlat'}));
  fireEvent.click(await screen.findByRole('radio',{name:'Option B: She'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Bölümü bitir ve devam et'}).hasAttribute('disabled')).toBe(false));
  expect(fetchMock.mock.calls.find(([url])=>url.endsWith('/answer'))?.[1]).toMatchObject({credentials:'include',body:JSON.stringify({number:1,answer:'B'})});
  view.unmount();render(<OzgunKidsPlayer {...props}/>);
  expect((await screen.findByRole('radio',{name:'Option B: She'})).getAttribute('aria-checked')).toBe('true');
  expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/launch'))).toBe(false);
 });
 it('retains every failed answer for retry and blocks section completion until all saves succeed',async()=>{
  const {state}=harness(2);render(<OzgunKidsPlayer organizationId="org" initialSessionId="original" onComplete={vi.fn()}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Fotoğrafı tamamla'}));
  fireEvent.click(await screen.findByRole('button',{name:'Sınavı başlat'}));
  fireEvent.click(await screen.findByRole('radio',{name:'Option B: She'}));
  fireEvent.click(screen.getByRole('button',{name:'Soru 2'}));fireEvent.click(await screen.findByRole('radio',{name:'Option D: an'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Bölümü bitir ve devam et'}).hasAttribute('disabled')).toBe(true));
  await screen.findByText(/Cevap kaydedilemedi\. Tekrar deneyin\./);
  fireEvent.click(screen.getByRole('button',{name:'Tekrar dene'}));
  await waitFor(()=>expect(state.answers).toEqual({'1':'B','2':'D'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Bölümü bitir ve devam et'}).hasAttribute('disabled')).toBe(false));
  expect(screen.queryByRole('alert')).toBeNull();
 });
 it('ignores an older failed save when the same question already has a newer answer queued',async()=>{
  const {state,fetchMock}=harness();
  const original=fetchMock.getMockImplementation()!;
  let rejectOld:(error:Error)=>void=()=>{};
  fetchMock.mockImplementation(async(url,init)=>{
   if(url.endsWith('/answer')&&JSON.parse(init.body).answer==='B')return new Promise((_,reject)=>{rejectOld=reject;});
   return original(url,init);
  });
  render(<OzgunKidsPlayer organizationId="org" initialSessionId="original" onComplete={vi.fn()}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Fotoğrafı tamamla'}));
  fireEvent.click(await screen.findByRole('button',{name:'Sınavı başlat'}));
  fireEvent.click(await screen.findByRole('radio',{name:'Option B: She'}));
  await waitFor(()=>expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/answer'))).toBe(true));
  fireEvent.click(screen.getAllByRole('radio')[0]);
  rejectOld(new Error('Older save failed'));
  await waitFor(()=>expect(state.answers).toEqual({'1':'A'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Bölümü bitir ve devam et'}).hasAttribute('disabled')).toBe(false));
  expect(screen.queryByRole('alert')).toBeNull();
 });
 it('keeps failed-save retry available after a successful background refresh',async()=>{
  const {state}=harness(1);state.status='IN_PROGRESS';
  render(<OzgunKidsPlayer organizationId="org" initialSessionId="original" onComplete={vi.fn()}/>);
  fireEvent.click(await screen.findByRole('radio',{name:'Option B: She'}));
  await screen.findByRole('button',{name:'Tekrar dene'});
  vi.useFakeTimers();
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
  vi.useRealTimers();
  expect(screen.getByRole('button',{name:'Tekrar dene'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Bölümü bitir ve devam et'}).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Tekrar dene'}));
  await waitFor(()=>expect(state.answers).toEqual({'1':'B'}));
  await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
 });
 it('retries the same launched session when its initial read fails, without reloading or launching again',async()=>{
  const {fetchMock}=harness();const original=fetchMock.getMockImplementation()!;
  let reads=0;
  fetchMock.mockImplementation(async(url,init)=>{
   if(url.endsWith('/fixed-form') && ++reads===1)throw new TypeError('Temporary connection failure');
   return original(url,init);
  });
  const started=vi.fn();render(<OzgunKidsPlayer organizationId="org" onSessionStarted={started} onComplete={vi.fn()}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Tekrar dene'}));
  await screen.findByRole('button',{name:'Fotoğrafı tamamla'});
  expect(fetchMock.mock.calls.filter(([url])=>url.endsWith('/launch'))).toHaveLength(1);
  expect(started).toHaveBeenCalledExactlyOnceWith('original');
 });
 it('prevents clearing an answer after the section deadline',async()=>{
  const {state,fetchMock}=harness();state.status='IN_PROGRESS';state.sectionDeadline=new Date(Date.now()-1000).toISOString();state.answers={'1':'B'};
  render(<OzgunKidsPlayer organizationId="org" initialSessionId="original" onComplete={vi.fn()}/>);
  const clear=await screen.findByRole('button',{name:'Cevabı temizle'});
  expect(clear.hasAttribute('disabled')).toBe(true);fireEvent.click(clear);
  expect(fetchMock.mock.calls.filter(([url])=>url.endsWith('/answer'))).toHaveLength(0);
  expect(state.answers).toEqual({'1':'B'});
 });

 it('resumes a paused fixed form before displaying its questions',async()=>{
  const {state,fetchMock}=harness();state.status='PAUSED';state.pause={used:true};state.answers={'1':'B'};
  const original=fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async(url,init)=>{
   if(url.endsWith('/resume'))state.status='IN_PROGRESS';
   return original(url,init);
  });
  render(<OzgunKidsPlayer organizationId="org" initialSessionId="original" onComplete={vi.fn()} onCancel={vi.fn()}/>);
  expect((await screen.findByRole('radio',{name:'Option B: She'})).getAttribute('aria-checked')).toBe('true');
  expect(fetchMock.mock.calls.filter(([url])=>url.endsWith('/resume'))).toHaveLength(1);
  expect(screen.getByRole('button',{name:'Exit allowance used'}).hasAttribute('disabled')).toBe(true);
 });

 it('shows a pause notice when another window pauses the attempt, without exposing answer controls',async()=>{
  const {state}=harness();state.status='IN_PROGRESS';const exit=vi.fn();
  vi.useFakeTimers();
  await act(async()=>{render(<OzgunKidsPlayer organizationId="org" initialSessionId="original" onComplete={vi.fn()} onCancel={exit}/>);});
  expect(screen.getByRole('radio',{name:'Option B: She'})).toBeTruthy();
  state.status='PAUSED';state.pause={used:true,resumeUntil:new Date(Date.now()+48*3600000).toISOString()};
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});vi.useRealTimers();
  expect(screen.getByRole('heading',{name:'Your exam is paused'})).toBeTruthy();
  expect(screen.queryByRole('radio')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Back to dashboard'}));expect(exit).toHaveBeenCalledOnce();
 });

});
