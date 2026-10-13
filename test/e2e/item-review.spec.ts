import {test,expect} from '@playwright/test';
for(const width of [320,1280])for(const decision of ['Approve','Minor Revision','stale','resubmit','resubmit-failed']){
 test(`expert review ${decision} at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const hash='a'.repeat(64),resubmit=decision.startsWith('resubmit');
  const item={id:'item',itemCode:'G1',version:3,reviewContentHash:hash,type:'MULTIPLE_CHOICE',skill:'GRAMMAR',cefrLevel:'B1',status:'DRAFT',pipelineStage:resubmit?'EDITING':'AI_DRAFT',
   content:{prompt:'Choose the correct answer.',options:['First','Second'],correctAnswer:'A'},tags:[],createdAt:'2026-10-13',
   itemReviews:[{id:'current',reviewType:'LANGUAGE_REVIEW',verdict:'APPROVE',itemVersion:3,contentHash:hash,createdAt:'2026-10-13'},
    {id:'legacy',reviewType:'LANGUAGE_REVIEW',verdict:'APPROVE',createdAt:'2026-10-01'}]};
  let saved=false;
  await page.route('**/api/items?*',route=>route.fulfill({json:saved?[]:[item]}));
  let submitted:any;
  await page.route('**/api/items/item/review',route=>{submitted=route.request().postDataJSON();saved=decision!=='stale';return route.fulfill(decision==='stale'?{status:409,json:{error:'Reload the changed item.'}}:{json:{review:{id:'saved',itemVersion:3,contentHash:hash}}});});
  await page.route('**/api/items/item/pipeline',route=>{submitted=route.request().postDataJSON();saved=decision!=='resubmit-failed';return route.fulfill(saved?{json:{pipelineStage:'LANGUAGE_REVIEW'}}:{status:409,json:{error:'Reload the changed item.'}});});
  await page.goto('/test/e2e/fixtures/item-review.html');
  if(resubmit)await page.getByRole('button',{name:'Needs Revision',exact:true}).click();
  await expect(page.getByText('Current v3',{exact:true})).toBeVisible();
  await expect(page.getByText('Legacy · version unverified',{exact:true})).toBeVisible();
  if(resubmit)await page.getByRole('button',{name:'Submit for Re-review →',exact:true}).click();
  else{
   await page.getByRole('button',{name:decision==='stale'?'Approve':decision,exact:true}).click();
   await page.getByRole('button',{name:'Submit Review',exact:true}).click();
  }
  if(decision==='stale'||decision==='resubmit-failed'){await expect(page.getByRole('alert')).toContainText('Reload the changed item');await expect(page.getByText('Submitted!',{exact:true})).toHaveCount(0);}
  else await expect(page.getByText(/No items in/)).toBeVisible();
  if(resubmit)expect(submitted).toEqual({stage:'LANGUAGE_REVIEW'});
  else{
   expect(submitted).toMatchObject({expectedVersion:3,expectedContentHash:hash,expectedStage:'AI_DRAFT',constructClarity:70,ambiguityRisk:10,notes:null});
   expect(submitted.stageTarget).toBe(decision==='Minor Revision'?null:'LANGUAGE_REVIEW');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
 });
}
