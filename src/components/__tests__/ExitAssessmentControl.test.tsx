// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ExitAssessmentControl} from '../ExitAssessmentControl';
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(_:string,options:any)=>options.defaultValue})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('server-confirmed exam exit',()=>{
 it('waits for the pause to be saved and prevents duplicate requests',async()=>{
  let resolve!: (value:any)=>void;
  const fetchMock=vi.fn(()=>new Promise(value=>{resolve=value;}));vi.stubGlobal('fetch',fetchMock);
  const exit=vi.fn();render(<ExitAssessmentControl sessionId="exam" onExit={exit}/>);
  fireEvent.click(screen.getByRole('button',{name:'Exit exam'}));
  const confirm=screen.getAllByRole('button',{name:'Exit exam'})[1];
  fireEvent.click(confirm);fireEvent.click(confirm);
  expect(fetchMock).toHaveBeenCalledTimes(1);expect(exit).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledWith('/api/sessions/exam/pause',expect.objectContaining({method:'POST',credentials:'include'}));
  resolve({ok:true,json:async()=>({status:'PAUSED'})});
  await waitFor(()=>expect(exit).toHaveBeenCalledOnce());
 });
 it('keeps the student in the exam on failure and permits retry',async()=>{
  const fetchMock=vi.fn().mockResolvedValueOnce({ok:false,json:async()=>({error:'Connection failed'})}).mockResolvedValueOnce({ok:true,json:async()=>({status:'PAUSED'})});
  vi.stubGlobal('fetch',fetchMock);const exit=vi.fn();render(<ExitAssessmentControl sessionId="exam" onExit={exit}/>);
  fireEvent.click(screen.getByRole('button',{name:'Exit exam'}));fireEvent.click(screen.getAllByRole('button',{name:'Exit exam'})[1]);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Connection failed');expect(exit).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button',{name:'Exit exam'})[1]);
  await waitFor(()=>expect(exit).toHaveBeenCalledOnce());
 });
 it('disables a second exit',()=>{
  const exit=vi.fn();render(<ExitAssessmentControl sessionId="exam" pauseUsed onExit={exit}/>);
  const button=screen.getByRole('button',{name:'Exit allowance used'});
  expect(button.hasAttribute('disabled')).toBe(true);fireEvent.click(button);
  expect(screen.queryByRole('dialog')).toBeNull();expect(exit).not.toHaveBeenCalled();
 });
});
