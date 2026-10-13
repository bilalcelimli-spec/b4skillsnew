import {test,expect} from '@playwright/test';
for(const width of [320,1280])for(const state of ['complete','pending','held','expired']){
 test(`shared report ${state} at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/share/**',route=>route.fulfill(state==='complete'?{json:{candidateName:'Deniz Çelik',productLine:'Rapid Diagnostic (30–40 Min)',
   cefr:'A1',score:50,completedAt:'2026-10-12T10:00:00Z',skills:{reading:50,listening:0,writing:null,speaking:100,grammar:75,vocabulary:null}}}
   :{status:state==='expired'?410:409,json:{error:state==='expired'?'This result has expired.':'This result is not available for public sharing.'}}));
  await page.goto('/test/e2e/fixtures/shared-report.html');
  if(state==='complete'){
   await expect(page.getByText('Deniz Çelik',{exact:true})).toBeVisible();
   await expect(page.getByRole('meter',{name:'Reading score'})).toHaveAttribute('aria-valuenow','50');
   expect(await page.getByRole('meter',{name:'Reading score'}).evaluate(element=>element.style.width)).toBe('50%');
   await expect(page.getByRole('meter',{name:'Listening score'})).toHaveAttribute('aria-valuenow','0');
   await expect(page.getByRole('meter',{name:'Writing score'})).toHaveCount(0);
  }else{await expect(page.getByRole('heading',{name:'Link not found'})).toBeVisible();await expect(page.getByRole('meter')).toHaveCount(0);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
 });
}
