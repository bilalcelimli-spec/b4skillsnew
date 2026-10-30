/** Dedicated synthetic tenant only; no seed/migration, no customer account updates. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
if(process.env.B4SKILLS_API_VALIDATION_MODE!=='true') throw new Error('Load the private validation runtime before provisioning.');
const root=path.resolve(process.cwd(), 'build/realdb-validation');
const file=path.join(root,'candidates.json');
const db=new PrismaClient();
try {
  let existing=false;
  try { fs.accessSync(file); existing=true; } catch (error) { if (error.code!=='ENOENT') throw error; }
  if(existing) {console.log('Existing private candidates retained; no passwords or credits reset.');}
  else {
    const accounts=await db.$transaction(async tx=>{
      // Unique slug prevents a repeat from silently replenishing credits or resetting identities.
      const org=await tx.organization.create({data:{slug:'apple-native-realdb-validation',name:'Apple Native QA — synthetic test candidates',settings:{purpose:'native-real-database-validation',synthetic:true}}});
      await tx.license.create({data:{organizationId:org.id,type:'APPLE_NATIVE_QA',credits:10,expiresAt:new Date(Date.now()+7*86400000)}});
      const accounts=[];
      for(const platform of ['client','ipad','mac']) {
        const password=crypto.randomBytes(18).toString('base64url');
        const email=`native.qa.${platform}.${crypto.randomBytes(4).toString('hex')}@example.test`;
        const user=await tx.user.create({data:{email,password:await bcrypt.hash(password,10),name:`Native QA ${platform} (synthetic)`,role:'CANDIDATE',emailVerified:new Date(),organizationId:org.id}});
        accounts.push({platform,email,password,userId:user.id,organizationId:org.id});
      }
      return accounts;
    },{timeout:20000});
    fs.mkdirSync(root,{recursive:true,mode:0o700});fs.chmodSync(root,0o700);
    // 'wx': never overwrite a candidates file created concurrently by another run.
    fs.writeFileSync(file,JSON.stringify(accounts,null,2),{mode:0o600,flag:'wx'});
    console.log('Three synthetic candidates and ten QA credits created in the dedicated QA organization.');
  }
} finally {await db.$disconnect();}
