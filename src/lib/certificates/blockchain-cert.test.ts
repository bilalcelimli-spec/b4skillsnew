import {describe,expect,it} from 'vitest';
import {buildCertificatePayload,issueCertificate,verifyCertificate} from './blockchain-cert';
const payload=()=>buildCertificatePayload({candidateId:'candidate',candidateName:'Candidate',organizationId:'org',organizationName:'Org',sessionId:'exam',cefrLevel:'B2',overallScore:60,skillScores:{READING:70,WRITING:55,SPEAKING:65}});
describe('signed certificate content integrity',()=>{
 it('detects tampering inside nested skill scores',()=>{
  const cert=issueCertificate(payload());expect(verifyCertificate(cert).valid).toBe(true);
  const tampered=structuredClone(cert);tampered.payload.skillScores.WRITING=100;
  const result=verifyCertificate(tampered);expect(result.valid).toBe(false);expect(result.errors).toContain('CONTENT_HASH_MISMATCH');
 });
 it('does not declare an unverified blockchain transaction valid',()=>{
  const cert=issueCertificate(payload());cert.onChain={network:'polygon',txHash:'fake',blockNumber:0,anchoredAt:new Date().toISOString(),contractAddress:'fake'};
  expect(verifyCertificate(cert).onChainValid).toBeNull();
 });
 it('keeps signatures valid when object key order changes',()=>{
  const cert=issueCertificate(payload());cert.payload.skillScores={SPEAKING:65,WRITING:55,READING:70};
  expect(verifyCertificate(cert).valid).toBe(true);
 });
});
