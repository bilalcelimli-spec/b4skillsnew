import {test,expect} from '@playwright/test';
for(const width of [320,1280])test(`English casing stays English with Turkish locale at ${width}px`,async({browser})=>{
 const context=await browser.newContext({locale:'tr-TR',viewport:{width,height:900}});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4174/test/e2e/fixtures/content-language.html');
 await page.getByRole('button',{name:'Select Turkish'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','tr');
 await expect(page.locator('body')).toHaveAttribute('lang','en');
 await expect(page.locator('h1')).toHaveText('SIGN IN TO WRITING INSIGHTS',{useInnerText:true});
 await expect(page.locator('h2')).toHaveText('İNGİLİZCE SEVİYE TESTİ',{useInnerText:true});
 for(const word of ['Listening','Reading','Writing','Speaking'])
  await expect(page.getByText(word,{exact:true})).toHaveText(word.toUpperCase(),{useInnerText:true});
 if(width===1280)await expect(page.getByText('Real-time Psychometric Sync')).toHaveText('REAL-TIME PSYCHOMETRIC SYNC',{useInnerText:true});
 await expect(page.getByText('Özgün Placement · İTÜ · Türkçe')).toBeVisible();
 await page.getByRole('button',{name:'Select English'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('h2')).toHaveText('İNGİLİZCE SEVİYE TESTİ',{useInnerText:true});
 await context.close();
});
