import {test,expect} from '@playwright/test';
for(const width of [320,1280])for(const failure of ['expired','transient']){
 test(`quick check ${failure} recovery at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let starts=0;const answers:string[]=[];
  const item=(id:string)=>({id,skill:'WRITING',type:'WRITING_PROMPT',content:{prompt:`Write about your holiday (${id}).`,minWords:1}});
  await page.route('**/api/assessment/placement/start',route=>route.fulfill({json:{placementId:`session-${++starts}`,firstItem:item(`item-${starts}`),maxItems:36,sectionOrder:['WRITING']}}));
  await page.route('**/api/assessment/placement/*/respond',async route=>{
   answers.push(route.request().postDataJSON().selectedOption);
   if(answers.length===1)await route.fulfill({status:failure==='expired'?410:503,json:{code:failure==='expired'?'PLACEMENT_SESSION_EXPIRED':undefined,error:failure==='expired'?'Quick check expired':'Temporarily unavailable'}});
   else await route.fulfill({json:{complete:false,nextItem:item('next'),itemsAdministered:1}});
  });
  const begin=async()=>{
   await page.getByRole('button',{name:/Start as Guest/}).click();
   await page.getByRole('button',{name:/I'm Ready/}).click();
   await expect(page.getByRole('textbox')).toBeVisible();
  };
  await page.goto('/test/e2e/fixtures/freemium-recovery.html');
  await begin();await page.getByRole('textbox').fill('My original writing answer.');
  await page.getByRole('button',{name:/Submit Answer/}).click();
  if(failure==='expired'){
   await expect(page.getByRole('heading',{name:'Quick check ended'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Retry'})).toHaveCount(0);
   await page.getByRole('button',{name:'Start a new quick check'}).click();
   await expect(page.getByRole('button',{name:/Start as Guest/})).toBeVisible();
   expect(starts).toBe(1);await begin();expect(starts).toBe(2);
   await expect(page.getByRole('textbox')).toHaveValue('');
  }else{
   await expect(page.getByRole('textbox')).toHaveValue('My original writing answer.');
   await page.getByRole('button',{name:'Retry'}).click();
   await expect(page.getByRole('textbox')).toHaveValue('');
   expect(answers).toEqual(['My original writing answer.','My original writing answer.']);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
 });
}
