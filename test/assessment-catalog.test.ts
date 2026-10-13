import {describe, expect, it} from 'vitest';
import {ASSESSMENT_OPTIONS, resolveAssessmentProduct} from '../src/lib/product-lines/assessment-catalog';
import {getProfile} from '../src/lib/product-lines/profiles';
import {OZGUN_PRODUCT, assessmentDisplayName} from '../src/lib/fixed-forms/ozgun-kids';
import {productForRedeemedCode} from '../src/lib/security/exam-code-product';
import {GenerateCodesBody, SendExamInviteBody, CreateAssignmentBody} from '../src/lib/security/schemas/codes';

describe('assessment assignment contracts',()=>{
 it.each(ASSESSMENT_OPTIONS)('accepts the canonical code product $value',option=>{
  expect(GenerateCodesBody.parse({productLine:option.value,quantity:1}).productLine).toBe(option.value);
  expect(SendExamInviteBody.parse({email:' Student@Example.test ',productLine:option.value}).email).toBe('student@example.test');
 });
 it.each([['Primary','Primary (7-10)'],['Junior','Junior Suite (11-14)'],['General','General English']])('resolves legacy %s consistently from profile through redeemed code', (alias,canonical)=>{
  expect(resolveAssessmentProduct(alias)).toBe(canonical);
  expect(getProfile(alias).name).toBe(canonical);
  expect(assessmentDisplayName(alias)).toBe(canonical);
  expect(GenerateCodesBody.parse({quantity:1,productLine:alias}).productLine).toBe(canonical);
  expect(productForRedeemedCode(canonical,{productLine:alias})).toBe(canonical);
  expect(()=>productForRedeemedCode('Academia',{productLine:alias})).toThrow('different assessment');
 });
 it.each(['missing exam','toString','__proto__',''])('rejects invalid product %s before creating an assignment, code or invitation',productLine=>{
  expect(resolveAssessmentProduct(productLine)).toBeNull();
  expect(GenerateCodesBody.safeParse({productLine,quantity:1}).success).toBe(false);
  expect(SendExamInviteBody.safeParse({productLine,email:'student@example.test'}).success).toBe(false);
  expect(CreateAssignmentBody.safeParse({productLine}).success).toBe(false);
 });
 it('keeps fixed forms in the code catalog but out of adaptive assignments',()=>{
  expect(ASSESSMENT_OPTIONS).toHaveLength(10);
  expect(new Set(ASSESSMENT_OPTIONS.map(option=>option.value)).size).toBe(10);
  expect(CreateAssignmentBody.safeParse({productLine:OZGUN_PRODUCT}).success).toBe(false);
 });
 it('validates assignment dates and attempts while accepting datetime-local input',()=>{
  const input={productLine:'Primary',openAt:'2026-10-13T10:00',dueAt:'2026-10-14T10:00',maxAttempts:2};
  expect(CreateAssignmentBody.parse(input).productLine).toBe('Primary (7-10)');
  for(const patch of [{dueAt:'2026-10-13T09:00'},{dueAt:'invalid'},{maxAttempts:0},{maxAttempts:1.5}])
   expect(CreateAssignmentBody.safeParse({...input,...patch}).success).toBe(false);
 });
 it('rejects invalid invitation identity and expiration',()=>{
  for(const patch of [{email:'invalid'},{expiresInDays:-1},{expiresInDays:1.5},{expiresInDays:'30'}])
   expect(SendExamInviteBody.safeParse({email:'student@example.test',productLine:'General English',...patch}).success).toBe(false);
 });
});
