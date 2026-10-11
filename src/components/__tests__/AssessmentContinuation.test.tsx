// @vitest-environment jsdom
import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {AssessmentResumeCard} from '../AssessmentContinuation';
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(_:string,options:any)=>options.defaultValue.replace(/{{(\w+)}}/g,(_:string,key:string)=>String(options[key]))})}));
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('exam resume window display',()=>{
 it('expires while the dashboard stays open and disables resume at the exact boundary',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));
  const resume=vi.fn();render(<AssessmentResumeCard title="Placement" status="PAUSED" pause={{used:true,resumeUntil:'2026-10-11T12:01:00Z'}} onResume={resume}/>);
  const button=screen.getByRole('button',{name:'Resume exam'});
  expect(button.hasAttribute('disabled')).toBe(false);expect(screen.getByText('0h 1m left to resume')).toBeTruthy();
  act(()=>vi.advanceTimersByTime(60000));
  expect(button.hasAttribute('disabled')).toBe(true);
  expect(screen.getByText(/48-hour resume window has expired/)).toBeTruthy();
  fireEvent.click(button);expect(resume).not.toHaveBeenCalled();
 });
 it('explains that a resumed student has no second pause',()=>{
  render(<AssessmentResumeCard title="Placement" status="IN_PROGRESS" pause={{used:true}} onResume={vi.fn()}/>);
  expect(screen.getByText(/exit allowance has been used/)).toBeTruthy();
  expect(screen.queryByText(/You may leave once/)).toBeNull();
 });
 it('handles an invalid deadline without showing an invalid date or allowing resume',()=>{
  render(<AssessmentResumeCard title="Placement" status="PAUSED" pause={{used:true,resumeUntil:'invalid'}} onResume={vi.fn()}/>);
  expect(screen.getByRole('button',{name:'Resume exam'}).hasAttribute('disabled')).toBe(true);
  expect(screen.queryByText(/Invalid Date/)).toBeNull();
 });
});
