import { Prisma, type PrismaClient } from '@prisma/client';
import { eraseCandidateData, eventMediaReference, identityReference } from './account-deletion.js';
import { eraseSessionData } from './erase-session.js';
import { drainErasureObjects, erasureReceipt, legacyArtifactReference, queueObjectErasure } from './erasure-storage.js';
import { deletePrivateObject, storageReference } from '../storage/private-storage.js';

/** Run on an isolated restored database before enabling user traffic or scoring workers. */
export async function replayErasureLedger(db: PrismaClient, entries: {targetType:string;targetId:string}[]) {
  let replayed=0;
  const deps={reference:storageReference,deleteObject:deletePrivateObject,verifyPassword:async()=>false};
  for(const entry of entries) {
    if (!['USER','SESSION','RESPONSE','IDENTITY','MEDIA_EVENT'].includes(entry.targetType) || !entry.targetId || entry.targetId.length>200) throw Error('Invalid erasure ledger entry');
    if(entry.targetType==='USER') {
      if(await db.user.findUnique({where:{id:entry.targetId}})) await eraseCandidateData(db,entry.targetId,deps);
    } else if(entry.targetType==='SESSION') {
      if(await db.session.findUnique({where:{id:entry.targetId}})) await db.$transaction(tx=>eraseSessionData(tx,entry.targetId,deps,new Date(),'restore-replay'),{timeout:60000});
    } else if(entry.targetType==='RESPONSE') {
      await db.$transaction(async tx=>{
        const row=await tx.response.findUnique({where:{id:entry.targetId}});if(!row)return;
        const ref=legacyArtifactReference(row.artifactUrl);if(ref)await queueObjectErasure(tx,ref);
        await tx.ratingTask.deleteMany({where:{responseId:row.id}});
        await tx.response.update({where:{id:row.id},data:{value:null,artifactUrl:null,contentErasedAt:new Date(),metadata:{contentErased:true,reason:'restore-replay'}}});
        await tx.scoreReport.updateMany({where:{sessionId:row.sessionId},data:{diagnosticReport:Prisma.DbNull,certificateUrl:null,isVerified:false}});
      });
    } else if(entry.targetType==='MEDIA_EVENT') {
      await db.$transaction(async tx=>{
        const row=await tx.proctoringEvent.findUnique({where:{id:entry.targetId}});if(!row)return;
        const ref=eventMediaReference(row.metadata,deps);if(ref)await queueObjectErasure(tx,ref);
        await tx.proctoringEvent.delete({where:{id:row.id}});
      });
    } else {
      await db.$transaction(async tx=>{
        const row=await tx.session.findUnique({where:{id:entry.targetId}});if(!row)return;
        const ref=identityReference(row.metadata,deps);if(ref)await queueObjectErasure(tx,ref);
        const metadata={...((row.metadata as any)??{})};
        for(const key of ['identitySnapshotKey','identitySnapshotProvider','identitySnapshotBucket','identitySnapshotUrl','identitySnapshotAt'])delete metadata[key];
        await tx.session.update({where:{id:row.id},data:{metadata}});
      });
    }
    await erasureReceipt(db, entry.targetType, entry.targetId, 'restore-replay');
    replayed++;
  }
  return {replayed,storage:await drainErasureObjects(db)};
}
