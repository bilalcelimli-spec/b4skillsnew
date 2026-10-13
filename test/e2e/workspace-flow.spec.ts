import {test,expect,type Page} from '@playwright/test';
async function setup(page:Page,state='IN_PROGRESS'){
 let current=state,launches=0,logouts=0,certificateBody:any=null;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let data:any={};
  if(path==='/api/auth/me')data={user:{uid:'candidate',email:'candidate@example.test',role:'CANDIDATE',organizationId:'org',allowedProductLine:'15-Min Diagnostic'}};
  else if(path.endsWith('/history'))data=[{id:'flow-exam',organizationId:'org',status:current,metadata:{productLine:'15-Min Diagnostic',examPause:current==='PAUSED'?{pausedAt:new Date().toISOString(),resumeUntil:new Date(Date.now()+48*3600000).toISOString()}:undefined}}];
  else if(path.endsWith('/status'))data={status:current,progress:0,sectionOrder:['GRAMMAR'],maxDurationMs:3600000,pause:{used:false}};
  else if(path.endsWith('/pause')){current='PAUSED';data={status:current};}
  else if(path.endsWith('/next'))data=state==='FINAL'?{stop:true,finalTheta:.2}:{item:{id:'item',skill:'GRAMMAR',type:'MULTIPLE_CHOICE',metadata:{prompt:'Original question',options:['A','B'],correctAnswer:'A'}}};
  else if(path.endsWith('/adaptive-report'))data={sessionId:'flow-exam',candidateName:'Deniz',productLine:'15-Min Diagnostic',completedAt:new Date().toISOString(),finalTheta:0,finalSem:.4,cefrLevel:'B1',
   totalItems:30,responses:[],skillScores:[],stopReason:'ALL_SECTIONS_COMPLETE',hasScoredEvidence:state==='FINAL',scoringComplete:state==='FINAL',reportStatus:state==='FINAL'?'Completed':'Provisional',hasPendingAI:false};
  else if(path==='/api/sessions/launch'){launches++;data={sessionId:'flow-exam',sectionOrder:['GRAMMAR']};}
  else if(path==='/api/auth/logout'){logouts++;data={ok:true};}
  else if(path==='/api/certificates/generate'){certificateBody=route.request().postDataJSON();data={id:'certificate'};}
  return route.fulfill({json:data});
 });
 return {launches:()=>launches,logouts:()=>logouts,certificateBody:()=>certificateBody};
}
for(const width of [320,1280]){
 test(`exit returns to the code-assigned dashboard and permits logout at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const calls=await setup(page);
  await page.goto('/test/e2e/fixtures/workspace-flow.html');
  await page.getByRole('button',{name:/Exit exam|Sınavdan çık/i}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:/Exit exam|Sınavdan çık/i}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button',{name:/Resume exam|Sınava devam et/})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(calls.launches()).toBe(0);
  await page.getByRole('button',{name:/Sign out/i}).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  expect(calls.logouts()).toBe(1);
 });
}
test('a pending finished exam opens its report and closes to the dashboard',async({page})=>{
 const calls=await setup(page,'SCORING');
 await page.goto('/test/e2e/fixtures/workspace-flow.html');
 await expect(page).toHaveURL(/\/report\/flow-exam$/);
 await expect(page.getByTestId('score-report')).toBeVisible();
 await expect(page.getByRole('button',{name:'Can-Do',exact:true})).toBeDisabled();
 expect(calls.launches()).toBe(0);expect(calls.certificateBody()).toBeNull();
 await page.getByRole('button',{name:'Close report'}).click();
 await expect(page).toHaveURL(/\/dashboard$/);
 await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('a scored finish uses the persisted result and the correct certificate request',async({page})=>{
 const calls=await setup(page,'FINAL');
 // The player sees an active exam; the next-item endpoint signals final completion.
 await page.route('**/api/sessions/flow-exam/status',route=>route.fulfill({json:{status:'IN_PROGRESS',pause:{used:false}}}));
 await page.goto('/test/e2e/fixtures/workspace-flow.html');
 await expect(page).toHaveURL(/\/report\/flow-exam$/);
 await expect(page.getByTestId('score-report')).toBeVisible();
 await expect.poll(()=>calls.certificateBody()).toEqual({sessionId:'flow-exam'});
 expect(calls.launches()).toBe(0);
});

test('preparation can be cancelled or signed out without launching an exam',async({page})=>{
 const calls=await setup(page);
 await page.goto('/test/e2e/fixtures/workspace-flow.html?path=/dashboard');
 await page.getByTestId('test-card').click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).last().click();
 await expect(page).toHaveURL(/\/dashboard$/);
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByTestId('test-card').click();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page).toHaveURL(/\/login$/);
 expect(calls.launches()).toBe(0);
});
