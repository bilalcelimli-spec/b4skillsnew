import 'dotenv/config';
import {PrismaClient, Prisma} from '@prisma/client';
import {writeFileSync, readFileSync} from 'node:fs';
import {legacyScreenshotNotice} from '../../src/lib/compliance/legacy-screenshot-notice.js';

const apply=process.argv.includes('--apply');
const restore=process.argv.includes('--restore');
if(apply && restore) throw Error('Choose apply or restore');
const backup=process.env.B4_NOTICE_BACKUP_PATH;
if((apply || restore) && !backup) throw Error('Private B4_NOTICE_BACKUP_PATH required');
const db=new PrismaClient();
try {
 if(restore){
  const saved=JSON.parse(readFileSync(backup!,'utf8'));
  if(saved.schema!==1 || !Array.isArray(saved.rows)) throw Error('Invalid backup');
  await db.$transaction(async tx=>{
   for(const row of saved.rows){
    if(!legacyScreenshotNotice(row.metadata,new Date(row.timestamp))) throw Error('Unrecognized backup row');
    const changed=await tx.proctoringEvent.updateMany({where:{id:row.id,type:'OTHER',metadata:{equals:row.metadata}},data:{type:'SCREENSHOT'}});
    if(changed.count!==1) throw Error('Restore conflict; transaction rolled back');
   }
  },{timeout:60000});
  console.log(JSON.stringify({restored:saved.rows.length,mediaDeleted:false}));
 }else{
  const rows=await db.proctoringEvent.findMany({where:{type:'SCREENSHOT',timestamp:{lt:new Date('2026-09-29T00:00:00Z')}},select:{id:true,timestamp:true,metadata:true}});
  const classified=rows.filter(row=>legacyScreenshotNotice(row.metadata,row.timestamp));
  if(apply){
   // Exclusive file creation prevents overwriting the rollback record. No media or metadata erased.
   writeFileSync(backup!,JSON.stringify({schema:1,createdAt:new Date().toISOString(),rows:classified}),{mode:0o600,flag:'wx'});
   await db.$transaction(async tx=>{
    for(const row of classified){
     const changed=await tx.proctoringEvent.updateMany({where:{id:row.id,type:'SCREENSHOT',metadata:{equals:row.metadata as Prisma.InputJsonValue}},data:{type:'OTHER'}});
     if(changed.count!==1) throw Error('Classification conflict; transaction rolled back');
    }
   },{timeout:60000});
  }
  console.log(JSON.stringify({dryRun:!apply,classified:classified.length,counts:classified.reduce<Record<string,number>>((counts,row)=>{const kind=legacyScreenshotNotice(row.metadata,row.timestamp)!;counts[kind]=(counts[kind]||0)+1;return counts;},{}),mediaDeleted:false,metadataPreserved:true}));
 }
}finally{await db.$disconnect();}
