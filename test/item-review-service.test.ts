import {beforeEach,expect,it,vi} from 'vitest';
import {submitItemReview} from '../src/lib/content-factory/item-review-service';
import {itemReviewHash} from '../src/lib/content-factory/item-review-snapshot';
import {ItemReviewBody} from '../src/lib/security/schemas/items';
let item:any,reviews:any[];
const update=vi.fn(),create=vi.fn(),lock=vi.fn();
const db={$transaction:async(fn:any)=>{const old=structuredClone(item),previous=[...reviews];try{return await fn({$queryRaw:lock,item:{findUnique:async()=>structuredClone(item),update},itemReview:{create}});}catch(error){item=old;reviews=previous;throw error;}}};
const actor={id:'reviewer',role:'LANGUAGE_REVIEWER'};
function body(){return ItemReviewBody.parse({reviewType:'LANGUAGE_REVIEW',verdict:'APPROVE',stageTarget:'CEFR_REVIEW',notes:null,
 expectedVersion:item.version,expectedContentHash:itemReviewHash(item),expectedStage:'LANGUAGE_REVIEW',constructClarity:70,ambiguityRisk:0,cefrFitLabel:'ABOVE_TARGET'});}
beforeEach(()=>{
 vi.clearAllMocks();item={id:'item',version:1,type:'MULTIPLE_CHOICE',skill:'GRAMMAR',cefrLevel:'B1',content:{prompt:'Choose.',options:['one','two'],correctAnswer:'A'},pipelineStage:'LANGUAGE_REVIEW'};reviews=[];
 create.mockImplementation(async({data})=>{const review={id:'review',...data};reviews.push(review);return review;});
 update.mockImplementation(async({data})=>{item={...item,...data};return item;});
});
it('accepts the UI 0–100 scores and null optional values, binding authenticated reviewer and snapshot atomically',async()=>{
 const result=await submitItemReview(db,'item',actor,body());
 expect(result).toMatchObject({reviewerId:'reviewer',itemVersion:1,contentHash:itemReviewHash(item),constructClarity:70,ambiguityRisk:0,notes:null});
 expect(item.pipelineStage).toBe('CEFR_REVIEW');expect(lock).toHaveBeenCalledOnce();
});
it.each(['version','content','stage'])('rejects a stale %s before writing the review',async change=>{
 const request=body();if(change==='version')item.version++;if(change==='content')item.content.prompt='Changed';if(change==='stage')item.pipelineStage='CEFR_REVIEW';
 await expect(submitItemReview(db,'item',actor,request)).rejects.toMatchObject({statusCode:409});
 expect(create).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();
});
it('cannot advance two stages on a duplicate submission',async()=>{
 const request=body();await submitItemReview(db,'item',actor,request);
 await expect(submitItemReview(db,'item',actor,request)).rejects.toMatchObject({statusCode:409});expect(reviews).toHaveLength(1);
});
it('rolls back the review if advancing the pipeline fails',async()=>{
 update.mockRejectedValueOnce(Error('DB failed'));
 await expect(submitItemReview(db,'item',actor,body())).rejects.toThrow('DB failed');
 expect(reviews).toHaveLength(0);expect(item.pipelineStage).toBe('LANGUAGE_REVIEW');
});
it('prevents specialist role escalation and arbitrary LIVE approval',async()=>{
 await expect(submitItemReview(db,'item',{id:'reviewer',role:'CEFR_REVIEWER'},body())).rejects.toMatchObject({statusCode:403});
 await expect(submitItemReview(db,'item',actor,{...body(),stageTarget:'LIVE'})).rejects.toMatchObject({statusCode:400});
 expect(reviews).toHaveLength(0);
});
it.each(['MINOR_REVISION','MAJOR_REVISION','REJECT'] as const)('records %s with null stage target and returns to the appropriate stage',async verdict=>{
 await submitItemReview(db,'item',actor,{...body(),verdict,stageTarget:null});
 expect(item.pipelineStage).toBe(verdict==='REJECT'?'FLAGGED':'EDITING');expect(reviews).toHaveLength(1);
});
it('hashes canonical keys while preserving option order and reviewed context',()=>{
 expect(itemReviewHash(item)).toBe(itemReviewHash({...item,content:{correctAnswer:'A',options:['one','two'],prompt:'Choose.'}}));
 for(const changed of [{content:{...item.content,options:['two','one']}},{cefrLevel:'B2'},{descriptorRef:'new descriptor'},{tags:['different product']},{provenance:'HUMAN_CREATED'}])expect(itemReviewHash({...item,...changed})).not.toBe(itemReviewHash(item));
});
it('rejects out-of-range, fractional dimensions and missing snapshot fields',()=>{
 for(const changes of [{constructClarity:-1},{constructClarity:101},{constructClarity:70.5},{expectedVersion:0},{expectedContentHash:undefined},{reviewerId:'injected'}])expect(ItemReviewBody.safeParse({...body(),...changes}).success).toBe(false);
});
