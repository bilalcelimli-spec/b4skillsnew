// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../../App';
vi.mock('../../hooks/useScoringStatus',()=>({useScoringStatus:()=>({state:'complete'})}));
vi.mock('../CandidateAdaptiveReport',()=>({CandidateAdaptiveReport:({sessionId}:any)=><h1>Report {sessionId}</h1>}));
vi.mock('../TestPlayer',()=>({TestPlayer:({initialSessionId,candidateId,onCancel}:any)=><><h1>Resume {initialSessionId}</h1><p>Candidate {candidateId}</p><button onClick={onCancel}>Exit fixture exam</button></>}));
vi.mock('../admin/ContentFactoryReviewQueue',()=>({ContentFactoryReviewQueue:()=><h1>Content review queue</h1>}));
vi.mock('../RatingDashboard',()=>({RatingDashboard:({raterId}:any)=><h1>Rater workspace {raterId}</h1>}));
vi.mock('../CandidateProfile',()=>({CandidateProfile:()=><h1>Account settings</h1>}));
vi.mock('../SharedReportPage',()=>({SharedReportPage:({token}:any)=><h1>Shared {token}</h1>}));
function LocationProbe(){return <output data-testid="path">{useLocation().pathname}</output>;}
function open(path:string,role='CANDIDATE'){
  window.history.replaceState({},'',path);
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url==='/api/auth/me'
    ? {user:{uid:'candidate',email:'user@example.test',role,organizationId:'org'}}:[]})));
  render(<MemoryRouter initialEntries={[path]}><App/><LocationProbe/></MemoryRouter>);
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();window.history.replaceState({},'','/');});
it('opens a report deep link after authentication instead of showing history',async()=>{
  open('/report/existing-session');
  expect(await screen.findByRole('heading',{name:'Report existing-session'})).toBeTruthy();
  expect(screen.getByTestId('path').textContent).toBe('/report/existing-session');
});
it('resumes an exam deep link with the same session ID',async()=>{
  open('/exam/existing-session');
  expect(await screen.findByRole('heading',{name:'Resume existing-session'})).toBeTruthy();
  expect(screen.getByTestId('path').textContent).toBe('/exam/existing-session');
});
it('preserves the content workspace URL for content reviewers',async()=>{
  open('/content','ITEM_WRITER');
  expect(await screen.findByRole('heading',{name:'Content review queue'})).toBeTruthy();
  await waitFor(()=>expect(screen.getByTestId('path').textContent).toBe('/content'));
});
it('opens settings instead of silently falling back to the dashboard',async()=>{
  open('/settings');
  expect(await screen.findByRole('heading',{name:'Account settings'})).toBeTruthy();
});
it('preserves a public shared report when an authenticated session resolves',async()=>{
  const token='a'.repeat(32);open('/share/'+token,'SUPER_ADMIN');
  expect(await screen.findByRole('heading',{name:'Shared '+token})).toBeTruthy();
  await waitFor(()=>expect(screen.getByTestId('path').textContent).toBe('/share/'+token));
});

it('connects the authenticated rater identity to task actions',async()=>{
  open('/rating','RATER');
  expect(await screen.findByRole('heading',{name:'Rater workspace candidate'})).toBeTruthy();
});

it('returns to the dashboard after exit and resumes the same stored attempt', async()=>{
  window.history.replaceState({},'', '/exam/existing-session');
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url==='/api/auth/me'
    ? {user:{uid:'candidate',email:'user@example.test',role:'CANDIDATE',organizationId:'org'}}
    : url.endsWith('/history') ? [{id:'existing-session',status:'IN_PROGRESS',organizationId:'org',metadata:{productLine:'15-Min Diagnostic'}}] : []})));
  render(<MemoryRouter initialEntries={['/exam/existing-session']}><App/><LocationProbe/></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'Exit fixture exam'}));
  await waitFor(()=>expect(screen.getByTestId('path').textContent).toBe('/dashboard'));
  fireEvent.click(await screen.findByRole('button',{name:/Resume exam|Sınava devam et/}));
  expect(await screen.findByRole('heading',{name:'Resume existing-session'})).toBeTruthy();
  await waitFor(()=>expect(screen.getByTestId('path').textContent).toBe('/exam/existing-session'));
});

it('starts with the server candidate identity after code redemption switches accounts',async()=>{
  window.history.replaceState({},'', '/dashboard');
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url==='/api/auth/me'
    ? {user:{uid:'old-candidate',email:'old@example.test',role:'CANDIDATE',organizationId:null}}
    : url==='/api/codes/validate' ? {valid:true,productLine:'General English'}
    : url==='/api/codes/redeem' ? {success:true,candidateId:'new-candidate',organizationId:'new-org',productLine:'General English'} : []})));
  render(<MemoryRouter initialEntries={['/dashboard']}><App/><LocationProbe/></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'Enter Exam Code'}));
  fireEvent.change(screen.getByLabelText('Exam code'),{target:{value:'ABC1234567'}});
  fireEvent.click(screen.getByRole('button',{name:'Verify Code'}));
  await screen.findByRole('heading',{name:'Candidate Details'});
  for(const [label,value] of [['First Name','Ada'],['Last Name','Yılmaz'],['Email Address','ada@example.test'],['School / Organization','School'],['Grade / Level','5']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  fireEvent.click(await screen.findByRole('button',{name:/Start Test/}));
  expect(await screen.findByText('Candidate new-candidate')).toBeTruthy();
  expect(screen.queryByText('Candidate old-candidate')).toBeNull();
});
