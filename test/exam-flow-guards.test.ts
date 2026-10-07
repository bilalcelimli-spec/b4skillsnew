import {describe,expect,it} from 'vitest';
import {sessionDeadlineReached} from '../src/lib/assessment-engine/session-deadline';
import {productForRedeemedCode} from '../src/lib/security/exam-code-product';
describe('assessment access and deadline rules',()=>{
 it('rejects an answer at the exact deadline, with the same rule after reconnect',()=>{
  const start='2026-10-07T12:00:00Z',deadline=Date.parse(start)+60000;
  expect(sessionDeadlineReached(start,60000,deadline-1)).toBe(false);
  expect(sessionDeadlineReached(start,60000,deadline)).toBe(true);
  expect(sessionDeadlineReached(new Date(start),60000,deadline+1)).toBe(true);
  expect(sessionDeadlineReached(null,60000,deadline)).toBe(false);
 });
 it('requires the assigned product, including when no product was sent',()=>{
  expect(productForRedeemedCode(undefined,{productLine:'Primary (7-10)'})).toBe('Primary (7-10)');
  expect(productForRedeemedCode('primary (7-10)',{productLine:'Primary (7-10)'})).toBe('Primary (7-10)');
  expect(()=>productForRedeemedCode('Academia',{productLine:'Primary (7-10)'})).toThrow('different assessment');
 });
 it('preserves General aliases, license-only launches and explicit code expiry',()=>{
  expect(productForRedeemedCode('General English',{productLine:'General'})).toBe('General English');
  expect(productForRedeemedCode('Academia',null)).toBe('Academia');
  expect(()=>productForRedeemedCode(undefined,{productLine:'General',expiresAt:new Date(100)},101)).toThrow('expired');
 });
});
