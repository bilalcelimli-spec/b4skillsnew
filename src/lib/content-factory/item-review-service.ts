import type { z } from 'zod';
import type { ItemReviewBody } from '../security/schemas/items.js';
import { AppError } from '../errors/app-error.js';
import { itemReviewHash } from './item-review-snapshot.js';
type Body=z.infer<typeof ItemReviewBody>;
const roles:Record<string,string[]>={LANGUAGE_REVIEW:['LANGUAGE_REVIEWER'],CEFR_REVIEW:['CEFR_REVIEWER'],FAIRNESS_REVIEW:['MODERATOR'],MODERATION:['MODERATOR']};
const stages:Record<string,{type:string;next:string|null}>={
 AI_DRAFT:{type:'LANGUAGE_REVIEW',next:'LANGUAGE_REVIEW'},HUMAN_DRAFT:{type:'LANGUAGE_REVIEW',next:'LANGUAGE_REVIEW'},EDITING:{type:'LANGUAGE_REVIEW',next:'LANGUAGE_REVIEW'},
 LANGUAGE_REVIEW:{type:'LANGUAGE_REVIEW',next:'CEFR_REVIEW'},CEFR_REVIEW:{type:'CEFR_REVIEW',next:'FAIRNESS_REVIEW'},
 FAIRNESS_REVIEW:{type:'FAIRNESS_REVIEW',next:'MODERATION'},MODERATION:{type:'MODERATION',next:'APPROVED_FOR_PILOT'},FLAGGED:{type:'MODERATION',next:null},
};
export async function submitItemReview(db:any,itemId:string,actor:{id:string;role:string},body:Body){
 if(!actor.id)throw AppError.unauthorized();
 if(!['SUPER_ADMIN','ASSESSMENT_DIRECTOR','CONTENT_ADMIN'].includes(actor.role)&&!roles[body.reviewType]?.includes(actor.role))throw AppError.forbidden('This review requires the assigned specialist role.');
 return db.$transaction(async(tx:any)=>{
  await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${itemId} FOR UPDATE`;
  const item=await tx.item.findUnique({where:{id:itemId}});
  if(!item)throw AppError.notFound('Item not found');
  const hash=itemReviewHash(item);
  if(item.version!==body.expectedVersion||hash!==body.expectedContentHash||item.pipelineStage!==body.expectedStage)
   throw AppError.conflict('This item changed after it was opened. Reload it before submitting the review.');
  const stage=stages[item.pipelineStage];
  if(!stage||stage.type!==body.reviewType)throw AppError.conflict('This review type does not match the current workflow stage.');
  const target=body.verdict==='APPROVE'?stage.next:body.verdict==='REJECT'?'FLAGGED':'EDITING';
  if(body.verdict==='APPROVE'?(body.stageTarget??null)!==stage.next:body.stageTarget!=null)
   throw AppError.badRequest('The requested stage does not match this review decision.');
  const {expectedVersion,expectedContentHash,expectedStage,...fields}=body;
  const review=await tx.itemReview.create({data:{...fields,itemId,reviewerId:actor.id,itemVersion:item.version,contentHash:hash,
   stageTarget:body.stageTarget??null,notes:body.notes??null,revisionsReq:body.revisionsReq??[]}});
  if(target)await tx.item.update({where:{id:itemId},data:{pipelineStage:target}});
  return review;
 });
}
