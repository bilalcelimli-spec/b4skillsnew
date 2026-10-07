import {test,expect} from '@playwright/test';
for(const width of [320,1280])test(`certificate preserves stored scores, unknown skills and six-skill layout at ${width}px`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width,height:800});await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 await page.goto('/test/e2e/fixtures/certificate-renderer.html');
 const document=page.locator('#certificate-document');
 await expect(document.getByText('60',{exact:false}).filter({has:page.locator('span', {hasText:'/100'})})).toBeVisible();
 for(const [skill,score] of [['Reading','0'],['Listening','55'],['Writing','62'],['Speaking','N/A'],['Grammar','48'],['Vocabulary','67']]){
  const label=document.getByText(skill,{exact:true});await expect(label).toBeVisible();
  await expect(label.locator('..').getByText(score,{exact:true})).toBeVisible();
  const box=await label.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
 }
 await expect(document.getByText('Çağrı Çelimli Şen',{exact:true})).toBeVisible();
 await expect(document.getByText('01 October 2028',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
