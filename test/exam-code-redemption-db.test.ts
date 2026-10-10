/** Explicit opt-in; hard-coded disposable localhost DB, never the deployment database. */
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {redeemExamCode} from '../src/lib/security/exam-code-redemption';
import {ValidateCodeBody,RedeemCodeBody} from '../src/lib/security/schemas/codes';
const db=new PrismaClient({datasources:{db:{url:'postgresql://b4skills_test@127.0.0.1:59473/arbitration_test?connection_limit=5'}}});
const org=randomUUID();
const tokens=(id:string)=>({accessToken:`access-${id}`,refreshToken:`refresh-${id}`});
const input=(code:string,email=`${randomUUID()}@disposable.test`)=>({code,email,name:'Ada',surname:'Yılmaz',school:'School',className:'5',authenticatedUserId:null as string|null});
async function code(expiresAt:Date|null=null){return db.examCode.create({data:{code:randomUUID().toUpperCase(),organizationId:org,productLine:'General English',expiresAt}});}
describe('exam-code normalization',()=>{
 it('accepts pasted lower-case codes consistently on both routes',()=>{
  expect(ValidateCodeBody.parse({code:' abc-1234 '})).toEqual({code:'ABC-1234'});
  expect(RedeemCodeBody.parse({code:' abc-1234 ',email:' Ada@Example.com '})).toMatchObject({code:'ABC-1234',email:'ada@example.com'});
 });
 it('rejects malformed validation codes before database access',()=>{
  for(const value of ['',{},null,'A'.repeat(65),'A B C','<script>'])expect(ValidateCodeBody.safeParse({code:value}).success).toBe(false);
 });
});
describe.runIf(process.env.B4SKILLS_ARBITRATION_DB_TEST==='1')('atomic code redemption in PostgreSQL',()=>{
 beforeAll(async()=>{await db.organization.create({data:{id:org,name:'Disposable code test',slug:org}});});
 afterAll(async()=>{await db.$disconnect();});
 it('registers the candidate, profile, code claim and refresh token together',async()=>{
  const c=await code(),data=input(` ${c.code.toLowerCase()} `);
  const result=await redeemExamCode(db,data,tokens);
  expect(result).toMatchObject({success:true,organizationId:org,productLine:'General English',displayName:'Ada Yılmaz'});
  expect(await db.examCode.findUnique({where:{id:c.id}})).toMatchObject({isUsed:true,usedByEmail:data.email});
  expect(await db.user.findUnique({where:{id:result.candidateId}})).toMatchObject({refreshToken:result.refreshToken,role:'CANDIDATE'});
  expect(await db.candidateProfile.findUnique({where:{userId:result.candidateId}})).toMatchObject({metadata:{school:'School',className:'5'}});
 });
 it('rolls back a failure after registration, leaving the code usable',async()=>{
  const c=await code(),data=input(c.code);
  await expect(redeemExamCode(db,data,()=>{throw new Error('token failure');})).rejects.toThrow('token failure');
  expect(await db.examCode.findUnique({where:{id:c.id}})).toMatchObject({isUsed:false,usedAt:null,usedByEmail:null});
  expect(await db.user.findUnique({where:{email:data.email}})).toBeNull();
  expect((await redeemExamCode(db,data,tokens)).success).toBe(true);
 });
 it('rolls back when profile persistence fails',async()=>{
  const c=await code(),data=input(c.code);
  const broken=db.$extends({query:{candidateProfile:{upsert:async()=>{throw new Error('profile unavailable');}}}});
  await expect(redeemExamCode(broken as unknown as PrismaClient,data,tokens)).rejects.toThrow('profile unavailable');
  expect(await db.examCode.findUnique({where:{id:c.id}})).toMatchObject({isUsed:false});
  expect(await db.user.findUnique({where:{email:data.email}})).toBeNull();
 });
 it('rolls back a refresh-token storage failure',async()=>{
  const c=await code(),data=input(c.code);
  const broken=db.$extends({query:{user:{update:async({args,query})=>{if(args.data.refreshToken)throw new Error('token storage unavailable');return query(args);}}}});
  await expect(redeemExamCode(broken as unknown as PrismaClient,data,tokens)).rejects.toThrow('token storage unavailable');
  expect(await db.examCode.findUnique({where:{id:c.id}})).toMatchObject({isUsed:false});
  expect(await db.user.findUnique({where:{email:data.email}})).toBeNull();
 });
 it('allows exactly one concurrent claimant for the same code',async()=>{
  const c=await code();
  const results=await Promise.allSettled([redeemExamCode(db,input(c.code),tokens),redeemExamCode(db,input(c.code),tokens)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect((results.find(r=>r.status==='rejected') as PromiseRejectedResult).reason).toMatchObject({status:400});
 });
 it('prevents concurrent new-account redemption from bypassing account ownership',async()=>{
  const a=await code(),b=await code(),email=`${randomUUID()}@disposable.test`;
  const results=await Promise.allSettled([redeemExamCode(db,input(a.code,email),tokens),redeemExamCode(db,input(b.code,email),tokens)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect((results.find(r=>r.status==='rejected') as PromiseRejectedResult).reason).toMatchObject({status:409,errorCode:'account_login_required'});
  expect(await db.examCode.count({where:{id:{in:[a.id,b.id]},isUsed:true}})).toBe(1);
 });
 it('requires matching login for existing candidates and never grants privileged account access',async()=>{
  for(const role of ['CANDIDATE','SUPER_ADMIN'] as const){
   const email=`${randomUUID()}@disposable.test`,user=await db.user.create({data:{email,role}}),c=await code();
   const issuer=vi.fn(tokens);
   await expect(redeemExamCode(db,input(c.code,email),issuer)).rejects.toMatchObject({status:role==='CANDIDATE'?409:403});
   expect(issuer).not.toHaveBeenCalled();
   expect(await db.examCode.findUnique({where:{id:c.id}})).toMatchObject({isUsed:false});
   if(role==='CANDIDATE')expect((await redeemExamCode(db,{...input(c.code,email),authenticatedUserId:user.id},tokens)).candidateId).toBe(user.id);
  }
 });
 it('rejects expired and previously used codes without registering a candidate',async()=>{
  const expired=await code(new Date(Date.now()-1000));
  await expect(redeemExamCode(db,input(expired.code),tokens)).rejects.toMatchObject({status:400,message:'Code has expired'});
  const used=await code();await redeemExamCode(db,input(used.code),tokens);
  const next=input(used.code);await expect(redeemExamCode(db,next,tokens)).rejects.toMatchObject({status:400,message:'Code already used'});
  expect(await db.user.findUnique({where:{email:next.email}})).toBeNull();
 });
});
