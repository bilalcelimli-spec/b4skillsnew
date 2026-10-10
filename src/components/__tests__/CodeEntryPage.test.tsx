// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {CodeEntryPage} from '../CodeEntryPage';
import {OZGUN_PRODUCT} from '../../lib/fixed-forms/ozgun-kids';
const response=(data:unknown,ok=true)=>({ok,json:async()=>data});
const validate=response({valid:true,productLine:OZGUN_PRODUCT});
afterEach(()=>vi.unstubAllGlobals());
function setup(fetcher=vi.fn().mockResolvedValue(validate)) {
 vi.stubGlobal('fetch',fetcher);
 const onSuccess=vi.fn(),onBack=vi.fn(),onAccountSignIn=vi.fn();
 render(<CodeEntryPage onSuccess={onSuccess} onBack={onBack} onAccountSignIn={onAccountSignIn}/>);
 return {fetcher,onSuccess,onBack,onAccountSignIn};
}
async function codeStep() {
 fireEvent.change(screen.getByLabelText('Exam code'),{target:{value:'  abc1234567  '}});
 fireEvent.click(screen.getByRole('button',{name:'Verify Code'}));
 await screen.findByRole('heading',{name:'Candidate Details'});
}
function details() {
 for(const [label,value] of [['First Name',' Ada '],['Last Name',' Yılmaz '],['Email Address',' Ada@Example.com '],['School / Organization',' School '],['Grade / Level',' 5 ']]) fireEvent.change(screen.getByLabelText(label),{target:{value}});
}
describe('candidate exam-code entry',()=>{
 it('normalizes pasted codes and displays the current name for a legacy product',async()=>{
  const {fetcher}=setup();await codeStep();
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({code:'ABC1234567'});
  expect(screen.getByText('Özgün Placement')).toBeTruthy();
  expect(screen.queryByText(/for the certificate/)).toBeNull();
 });
 it('lets the candidate correct the code without losing their details',async()=>{
  const {onBack}=setup();await codeStep();details();
  fireEvent.click(screen.getByRole('button',{name:'Change exam code'}));
  expect(onBack).not.toHaveBeenCalled();await codeStep();
  expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe(' Ada ');
 });
 it('submits normalized details and uses the server candidate identity',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(validate).mockResolvedValueOnce(response({success:true,productLine:OZGUN_PRODUCT,organizationId:'org',candidateId:'server-user'}));
  const {onSuccess}=setup(fetcher);await codeStep();details();
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  await waitFor(()=>expect(onSuccess).toHaveBeenCalledWith(OZGUN_PRODUCT,'org','ada@example.com','server-user','Ada','Yılmaz'));
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({code:'ABC1234567',school:'School',className:'5'});
 });
 it('blocks duplicate submissions and reuses the registration identity after a rejected request',async()=>{
  let rejectRequest:(error:Error)=>void=()=>{};
  const fetcher=vi.fn().mockResolvedValueOnce(validate).mockImplementationOnce(()=>new Promise((_,reject)=>{rejectRequest=reject;})).mockResolvedValueOnce(response({error:'Try later'},false));
  setup(fetcher);await codeStep();details();
  const form=screen.getByRole('button',{name:'Start Exam'}).closest('form')!;
  fireEvent.submit(form);fireEvent.submit(form);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect((screen.getByLabelText('First Name') as HTMLInputElement).disabled || screen.getByLabelText('First Name').closest('fieldset')?.disabled).toBe(true);
  rejectRequest(new Error('Offline'));
  await screen.findByRole('alert');fireEvent.submit(form);
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(3));
  expect(JSON.parse(fetcher.mock.calls[1][1].body).candidateId).toBe(JSON.parse(fetcher.mock.calls[2][1].body).candidateId);
 });
 it('explains existing-account login errors using the server message',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(validate).mockResolvedValueOnce(response({error:'account_login_required',message:'Sign in to the existing account before redeeming this code.'},false));
  const {onSuccess}=setup(fetcher);await codeStep();details();
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  expect((await screen.findByRole('alert')).textContent).toContain('Sign in to the existing account');
  expect(onSuccess).not.toHaveBeenCalled();
 });
 it('shows an actionable message for a non-JSON validation failure',async()=>{
  setup(vi.fn().mockResolvedValue({ok:false,json:async()=>{throw new Error('Unexpected token');}}));
  fireEvent.change(screen.getByLabelText('Exam code'),{target:{value:'ABC1234567'}});
  fireEvent.click(screen.getByRole('button',{name:'Verify Code'}));
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to verify your code');
 });
 it('does not redeem whitespace-only candidate details',async()=>{
  const {fetcher}=setup();await codeStep();details();
  fireEvent.change(screen.getByLabelText('First Name'),{target:{value:'  '}});
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  expect((await screen.findByRole('alert')).textContent).toContain('spaces alone');
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('signs in inline and returns to the same candidate details before redemption',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(validate)
   .mockResolvedValueOnce(response({error:'account_login_required',message:'Sign in to the existing account before redeeming this code.'},false))
   .mockResolvedValueOnce(response({user:{uid:'existing',email:'ada@example.com',role:'CANDIDATE'}}))
   .mockResolvedValueOnce(response({success:true,productLine:OZGUN_PRODUCT,organizationId:'org',candidateId:'existing'}));
  const {onSuccess,onAccountSignIn}=setup(fetcher);await codeStep();details();
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  fireEvent.click(await screen.findByRole('button',{name:'Sign in to continue'}));
  expect((screen.getByLabelText('Email Address') as HTMLInputElement).value).toBe('ada@example.com');
  expect(screen.queryByRole('button',{name:'Sign Up'})).toBeNull();
  fireEvent.change(screen.getByLabelText('Password',{exact:true}),{target:{value:'Password123'}});
  fireEvent.click(screen.getByRole('button',{name:'Sign In'}));
  await screen.findByRole('heading',{name:'Candidate Details'});
  expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe(' Ada ');
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(onAccountSignIn).toHaveBeenCalledWith({uid:'existing',email:'ada@example.com',role:'CANDIDATE'});
  expect(onSuccess).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  await waitFor(()=>expect(onSuccess).toHaveBeenCalledWith(OZGUN_PRODUCT,'org','ada@example.com','existing','Ada','Yılmaz'));
 });
 it('keeps failed sign-in attempts in the login form and never redeems another account',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(validate)
   .mockResolvedValueOnce(response({error:'account_login_required'},false))
   .mockResolvedValueOnce(response({user:{uid:'wrong',email:'other@example.com',role:'CANDIDATE'}}));
  const {onSuccess,onAccountSignIn}=setup(fetcher);await codeStep();details();
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  fireEvent.click(await screen.findByRole('button',{name:'Sign in to continue'}));
  fireEvent.change(screen.getByLabelText('Password',{exact:true}),{target:{value:'Password123'}});
  fireEvent.click(screen.getByRole('button',{name:'Sign In'}));
  expect((await screen.findByRole('alert')).textContent).toContain('matching your exam details');
  expect(onAccountSignIn).not.toHaveBeenCalled();
  expect(onSuccess).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Back to exam details'}));
  expect(screen.getByRole('heading',{name:'Candidate Details'})).toBeTruthy();
  expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe(' Ada ');
 });
 it('preserves registration details and explains uncertain network failures',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(validate).mockRejectedValueOnce(new TypeError('Failed to fetch'));
  setup(fetcher);await codeStep();details();
  fireEvent.click(screen.getByRole('button',{name:'Start Exam'}));
  expect((await screen.findByRole('alert')).textContent).toContain('Connection interrupted');
  expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe(' Ada ');
 });

});
