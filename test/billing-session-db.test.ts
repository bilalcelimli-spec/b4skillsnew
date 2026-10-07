/** Explicit opt-in disposable localhost DB; never uses DATABASE_URL. */
import {randomUUID} from 'node:crypto';
import {afterAll,describe,expect,it,vi} from 'vitest';
const state=await vi.hoisted(async()=>{const {PrismaClient}=await import('@prisma/client');return{db:new PrismaClient({datasources:{db:{url:'postgresql://b4skills_test@127.0.0.1:59473/arbitration_test?connection_limit=3'}}})};});
vi.mock('../src/lib/prisma',()=>({prisma:state.db}));
import {BillingService} from '../src/lib/enterprise/billing-service';
const db=state.db;
describe.runIf(process.env.B4SKILLS_ARBITRATION_DB_TEST==='1')('PostgreSQL license and session credit atomicity',()=>{
 afterAll(async()=>{await db.$disconnect();});
 async function org(){const id=randomUUID();await db.organization.create({data:{id,name:'Disposable billing',slug:id}});return id;}
 it('uses a non-expiring license without creating another trial',async()=>{
  const id=await org(),license=await db.license.create({data:{organizationId:id,type:'ENTERPRISE',credits:2}});
  expect(await BillingService.hasSufficientCredits(id)).toBe(true);await BillingService.consumeCredit(id);
  expect((await db.license.findUniqueOrThrow({where:{id:license.id}})).credits).toBe(1);expect(await db.license.count({where:{organizationId:id}})).toBe(1);
 });
 it('does not replace an expired or exhausted license with free credits',async()=>{
  for(const expired of [true,false]){const id=await org();await db.license.create({data:{organizationId:id,type:'ENTERPRISE',credits:expired?100:0,expiresAt:new Date(Date.now()+(expired?-60000:60000))}});
   expect(await BillingService.hasSufficientCredits(id)).toBe(false);expect(await db.license.count({where:{organizationId:id}})).toBe(1);}
 });
 it('lets only one of two concurrent consumers use the last credit',async()=>{
  const id=await org(),license=await db.license.create({data:{organizationId:id,type:'ENTERPRISE',credits:1}});
  const results=await Promise.allSettled([BillingService.consumeCredit(id),BillingService.consumeCredit(id)]);
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect((await db.license.findUniqueOrThrow({where:{id:license.id}})).credits).toBe(0);
  expect(await db.paymentTransaction.count({where:{organizationId:id,creditsAdded:-1}})).toBe(1);
 });
 it('rolls back the credit when creating a session fails',async()=>{
  const id=await org(),license=await db.license.create({data:{organizationId:id,type:'ENTERPRISE',credits:1}});
  await expect(db.$transaction(async tx=>{await BillingService.consumeCredit(id,tx);await tx.session.create({data:{organizationId:id,candidateId:'missing-user',status:'IN_PROGRESS'}});})).rejects.toThrow();
  expect((await db.license.findUniqueOrThrow({where:{id:license.id}})).credits).toBe(1);expect(await db.paymentTransaction.count({where:{organizationId:id}})).toBe(0);
 });
});
