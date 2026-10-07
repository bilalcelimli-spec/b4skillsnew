import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ session:vi.fn(),find:vi.fn(),update:vi.fn(),lock:vi.fn(),transaction:vi.fn() }));
vi.mock('../src/lib/prisma',()=>({prisma:{scoreReport:{findUnique:db.find},$transaction:db.transaction}}));
import { CertificateService, CertificateNotReadyError, isCertificateReady } from '../src/lib/certification/certificate-service';
const skills=['READING','LISTENING','WRITING','SPEAKING','GRAMMAR','VOCABULARY'];
let session:any, report:any;
beforeEach(()=>{
 vi.clearAllMocks();
 session={id:'exam',theta:.8,sem:.35,status:'COMPLETED',completedAt:new Date(),metadata:{sessionType:'DIAGNOSTIC'},
  candidate:{id:'real-candidate',name:'Actual Candidate'},organizationId:'org',organization:{name:'Actual Organization'},
  responses:skills.flatMap(skill=>Array.from({length:5},()=>({score:.7,item:{skill},isPretest:false,metadata:{}})))};
 report={id:'report',sessionId:'exam',createdAt:new Date(),isVerified:true,overallScore:60,overallCefr:'B2',diagnosticReport:{scoringComplete:true},
  ...Object.fromEntries(skills.map(skill=>[skill.toLowerCase()+'Score',50]))};
 db.session.mockImplementation(async()=>structuredClone(session));db.find.mockImplementation(async()=>structuredClone({...report,session}));
 db.update.mockImplementation(async({data})=>{report={...report,...data};return structuredClone(report)});
 db.transaction.mockImplementation(async fn=>fn({$queryRaw:db.lock,session:{findUnique:db.session},scoreReport:{findUnique:db.find,update:db.update}}));
});
describe('certificate issuance requires authoritative assessment evidence',()=>{
 it.each(['unverified','pending','missing skill','partial skill','missing report','missing analysis','missing skill score','flagged','session flagged','expired'])('rejects %s without changing the report',async condition=>{
  if(condition==='unverified')report.isVerified=false;
  if(condition==='pending')session.responses[0].metadata.requiresHumanReview=true;
  if(condition==='missing skill')session.responses=session.responses.filter((r:any)=>r.item.skill!=='SPEAKING');
  if(condition==='partial skill')session.responses.pop();
  if(condition==='missing report')db.find.mockResolvedValue(null);
  if(condition==='missing analysis')delete report.diagnosticReport.scoringComplete;
  if(condition==='missing skill score')report.speakingScore=null;
  if(condition==='flagged')report.diagnosticReport.securityFlag=true;
  if(condition==='session flagged')session.metadata.securityFlag=true;
  if(condition==='expired')session.completedAt=new Date('2020-01-01');
  await expect(CertificateService.generateCertificate({sessionId:'exam',theta:4,cefr:'C2'},{name:'Injected'},{})).rejects.toBeInstanceOf(CertificateNotReadyError);
  expect(db.update).not.toHaveBeenCalled();
 });
 it('uses stored identity, theta, score and completion-based expiry instead of caller payload',async()=>{
  const cert=await CertificateService.generateCertificate({sessionId:'exam',theta:4,cefr:'C2'},{name:'Injected'},{name:'Injected'});
  expect(cert).toMatchObject({candidateName:'Actual Candidate',candidateId:'real-candidate',organizationName:'Actual Organization',theta:.8,overallScore:60,cefrLevel:'B2'});
  const expiry=new Date(session.completedAt);expiry.setFullYear(expiry.getFullYear()+2);
  expect(cert.expiresAt).toEqual(expiry);
  expect(db.update.mock.calls[0][0].data).not.toHaveProperty('isVerified');
 });
 it('is idempotent without extending the certificate validity period',async()=>{
  const first=await CertificateService.generateCertificate({sessionId:'exam'},null,null);
  const second=await CertificateService.generateCertificate({sessionId:'exam'},null,null);
  expect(second.issuedAt).toEqual(first.issuedAt);expect(second.expiresAt).toEqual(first.expiresAt);expect(db.update).toHaveBeenCalledTimes(1);
 });
 it('verification never creates a certificate and rejects stale pending evidence',async()=>{
  expect(await CertificateService.verifyCertificate('report')).toBeNull();expect(db.update).not.toHaveBeenCalled();
  report.certificateUrl='/verify/report';report.diagnosticReport.certificateIssuedAt=new Date().toISOString();
  expect(await CertificateService.verifyCertificate('report')).not.toBeNull();
  session.responses[0].score=null;
  expect(await CertificateService.verifyCertificate('report')).toBeNull();
 });
 it('keeps unassessed skills null and measured zero distinct from missing data',()=>{
  report.readingScore=0;report.speakingScore=null;
  const cert=CertificateService.mapToCertificate(report,session.candidate,{},session);
  expect(cert.skillScores).toMatchObject({reading:0,speaking:null});expect(isCertificateReady(report,session)).toBe(false);
 });
});
