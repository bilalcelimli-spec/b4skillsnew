import 'dotenv/config';
import {readFileSync,writeFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {replayErasureLedger} from '../../src/lib/compliance/restore-erasure.js';
const [mode,file]=process.argv.slice(2);
if(!['--export','--replay'].includes(mode)||!file)throw Error('Usage: erasure-ledger.ts --export|--replay <private-file.json>');
if(mode==='--replay'&&process.env.RESTORE_ERASURE_REPLAY!=='true')throw Error('Confirm restored environment isolation with RESTORE_ERASURE_REPLAY=true');
const db=new PrismaClient();
try {
 if(mode==='--export') {
  const entries=await db.erasureLedger.findMany({select:{targetType:true,targetId:true,createdAt:true,reason:true}});
  writeFileSync(file,JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries}),{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({exported:entries.length}));
 } else {
  const source=JSON.parse(readFileSync(file,'utf8'));
  if(source.version!==1||!Array.isArray(source.entries))throw Error('Invalid erasure ledger file');
  const result=await replayErasureLedger(db,source.entries);
  console.log(JSON.stringify(result));if(result.storage.failed||result.storage.pending)process.exitCode=1;
 }
}finally{await db.$disconnect();}
