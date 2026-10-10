import {test,expect} from '@playwright/test';
import {OZGUN_PRODUCT} from '../../src/lib/fixed-forms/ozgun-kids';
for(const width of [320,1280])test(`candidate verifies and redeems their code at ${width}px`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:850});
 await page.route('**/api/codes/validate',async route=>{
  expect(route.request().postDataJSON()).toEqual({code:'ABC1234567'});
  await route.fulfill({json:{valid:true,productLine:OZGUN_PRODUCT}});
 });
 await page.route('**/api/codes/redeem',async route=>{
  expect(route.request().postDataJSON()).toMatchObject({code:'ABC1234567',email:'ada@example.com',name:'Ada',surname:'Yılmaz',school:'School',className:'5'});
  await route.fulfill({json:{success:true,productLine:OZGUN_PRODUCT,organizationId:'org',candidateId:'server-id'}});
 });
 await page.goto('/test/e2e/fixtures/code-entry.html');
 await page.getByLabel('Exam code').fill('  abc1234567  ');
 await page.getByRole('button',{name:'Verify Code'}).click();
 await expect(page.getByText('Özgün Placement',{exact:true})).toBeVisible();
 await page.getByLabel('First Name').fill(' Ada ');
 await page.getByLabel('Last Name').fill(' Yılmaz ');
 await page.getByLabel('Email Address').fill('ada@example.com');
 await page.getByLabel('School / Organization').fill(' School ');
 await page.getByLabel('Grade / Level').fill(' 5 ');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`/tmp/b4skills-code-entry-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Start Exam'}).click();
 await expect(page.getByRole('heading',{name:'Preparation'})).toBeVisible();
 expect(errors).toEqual([]);
});
for(const width of [320,1280])test(`existing candidate signs in without losing code details at ${width}px`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:850});
 let signedIn=false,attempts=0;
 await page.route('**/api/codes/validate',route=>route.fulfill({json:{valid:true,productLine:OZGUN_PRODUCT}}));
 await page.route('**/api/codes/redeem',async route=>{
  const details=route.request().postDataJSON();
  expect(details).toMatchObject({code:'ABC1234567',email:'ada@example.com',name:'Ada',surname:'Yılmaz',school:'School',className:'5'});
  await route.fulfill(signedIn ? {json:{success:true,productLine:OZGUN_PRODUCT,organizationId:'org',candidateId:'existing'}} : {status:409,json:{error:'account_login_required',message:'Sign in to the existing account before redeeming this code.'}});
 });
 await page.route('**/api/auth/login',async route=>{
  expect(route.request().postDataJSON().email).toBe('ada@example.com');
  attempts++;
  if(attempts===1)return route.fulfill({status:401,json:{error:'Invalid email or password'}});
  signedIn=true;
  await route.fulfill({json:{user:{uid:'existing',email:'ada@example.com',role:'CANDIDATE'}}});
 });
 await page.goto('/test/e2e/fixtures/code-entry.html');
 await page.getByLabel('Exam code').fill('ABC1234567');
 await page.getByRole('button',{name:'Verify Code'}).click();
 for(const [label,value] of [['First Name','Ada'],['Last Name','Yılmaz'],['Email Address','ada@example.com'],['School / Organization','School'],['Grade / Level','5']])await page.getByLabel(label).fill(value);
 await page.getByRole('button',{name:'Start Exam'}).click();
 await page.getByRole('button',{name:'Sign in to continue'}).click();
 await expect(page.getByLabel('Email Address')).toHaveValue('ada@example.com');
 await expect(page.getByRole('button',{name:'Sign Up',exact:true})).toHaveCount(0);
 await page.getByLabel('Password',{exact:true}).fill('Password123');
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Invalid email or password');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`/tmp/b4skills-code-login-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Candidate Details'})).toBeVisible();
 await expect(page.getByLabel('First Name')).toHaveValue('Ada');
 await expect(page.getByText('Özgün Placement',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Start Exam'}).click();
 await expect(page.getByRole('heading',{name:'Preparation'})).toBeVisible();
 expect(errors).toEqual([]);
});
