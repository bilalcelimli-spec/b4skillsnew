import {test,expect} from '@playwright/test';
import content from '../../src/lib/fixed-forms/ozgun-kids-form-a.json' with {type:'json'};
import {OZGUN_PRODUCT,OZGUN_SECTIONS,scoreFixedForm,type FixedAnswers} from '../../src/lib/fixed-forms/ozgun-kids';
import {OZGUN_ANSWER_KEY} from '../../src/lib/fixed-forms/ozgun-kids-key.server';

test('admin selects the fixed form, saves its key and generates the matching code',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/fixed-forms/ozgun-kids/config*',async route=>{
    if(route.request().method()==='PUT')expect(route.request().postDataJSON()).toEqual({organizationId:'fixture-org',answerKey:OZGUN_ANSWER_KEY,confirmed:true});
    await route.fulfill({json:{answerKey:OZGUN_ANSWER_KEY,confirmed:route.request().method()==='PUT'}});
  });
  await page.route('**/api/codes/generate',async route=>{
    expect(route.request().postDataJSON()).toEqual({organizationId:'fixture-org',productLine:OZGUN_PRODUCT,quantity:1});
    await route.fulfill({json:{codes:['OZGUN-FIXTURE-1']}});
  });
  await page.goto('/test/e2e/fixtures/ozgun-kids.html?mode=admin');
  await page.getByLabel('Product Line',{exact:true}).selectOption(OZGUN_PRODUCT);
  await expect(page.getByLabel('Cevap anahtarı (1–96, A/B/C/D)')).toHaveValue(OZGUN_ANSWER_KEY);
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button',{name:/Generate Codes/})).toBeDisabled();
  await page.getByRole('button',{name:'Cevap anahtarını kaydet'}).click();
  await page.getByRole('button',{name:/Generate Codes/}).click();
  await expect(page.getByText('OZGUN-FIXTURE-1',{exact:true})).toBeVisible();
  await page.screenshot({path:'/tmp/b4skills-ozgun-admin.png',fullPage:true});
  expect(errors).toEqual([]);
});

for(const width of [320,1280])test(`candidate completes four sections and sees raw scores at ${width}px`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:850});
  let sectionIndex=0,started=false,launches=0,listeningStartedAt:string|null=null;
  const answers:FixedAnswers={};
  function view(){const section=OZGUN_SECTIONS[sectionIndex];return {sessionId:'fixture-fixed',status:sectionIndex===4?'COMPLETED':started?'IN_PROGRESS':'SCHEDULED',serverNow:new Date().toISOString(),sectionIndex,section,sectionDeadline:started&&section?new Date(Date.now()+section.minutes*60000).toISOString():null,answers,listeningStartedAt,
    questions:started&&section?content.questions.filter(q=>q.skill===section.skill).map(q=>({...q,passage:'passageId' in q?content.passages[q.passageId as keyof typeof content.passages]:undefined})):[],report:sectionIndex===4?scoreFixedForm(answers,OZGUN_ANSWER_KEY,false):null};}
  await page.route('**/api/fixed-forms/ozgun-kids/launch',async route=>{launches++;await route.fulfill({json:{sessionId:'fixture-fixed'}});});
  await page.route('**/api/sessions/fixture-fixed/fixed-form**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/start'))started=true;
    if(url.endsWith('/answer')){const {number,answer}=route.request().postDataJSON();answers[String(number)]=answer;}
    if(url.endsWith('/advance')){expect(route.request().postDataJSON().sectionIndex).toBe(sectionIndex);sectionIndex++;}
    if(url.endsWith('/listen'))listeningStartedAt??=new Date().toISOString();
    await route.fulfill({json:view()});
  });
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('/test/e2e/fixtures/ozgun-kids.html');
  await page.getByRole('button',{name:'Sınavı başlat',exact:true}).click();
  expect(launches).toBe(1);
  for(let i=0;i<4;i++){
    const first=OZGUN_SECTIONS[i].first;
    await expect(page.getByRole('heading',{name:content.questions[first-1].prompt,exact:true})).toBeVisible();
    if(i===2)await expect(page.getByRole('article')).toBeVisible();
    if(i===3){
      await expect.poll(()=>page.locator('audio').evaluate((element:HTMLAudioElement)=>element.duration)).toBeGreaterThan(1773);
      await page.getByRole('button',{name:'Dinleme kaydını başlat'}).click();
      await expect(page.locator('audio')).toHaveAttribute('src',/Listening_Tam_Sinav.mp3$/);
      await expect(page.getByRole('button',{name:'Dinleme sürüyor'})).toBeDisabled();
      await page.screenshot({path:`/tmp/b4skills-ozgun-listening-${width}.png`,fullPage:true});
      expect(listeningStartedAt).toBeTruthy();
    }
    await page.locator(`input[value="${OZGUN_ANSWER_KEY[first-1]}"]`).check();
    await expect(page.getByRole('status')).toContainText('Gönderilen cevaplar kaydedildi.');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:i===3?'Sınavı bitir':'Bölümü bitir ve devam et',exact:true}).click();
  }
  await expect(page.getByRole('heading',{name:'Özgün Kids · Form A sonuçları'})).toBeVisible();
  await expect(page.getByText('4 / 96',{exact:true})).toBeVisible();
  await expect(page.getByText('0 yanlış · 92 boş · %4',{exact:true})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('anahtarı doğrulanmamış');
  await expect(page.getByRole('heading',{name:'Geçici kur önerisi'})).toBeVisible();
  await expect(page.getByText('Başlangıç / A1',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Hedef düzey kümeleri'})).toBeVisible();
  await expect(page.getByText('Otomatik yerleştirme yapılmaz.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:/certificate|sertifika/i})).toHaveCount(0);
  await page.screenshot({path:`/tmp/b4skills-ozgun-report-${width}.png`,fullPage:true});
  if(width===1280){
    await page.emulateMedia({media:'print'});
    await page.setViewportSize({width:794,height:1123});
    await expect(page.getByRole('button',{name:'Yazdır'})).toBeHidden();
    expect(await page.locator('table').evaluateAll(tables=>tables.every(table=>table.scrollWidth<=table.clientWidth))).toBe(true);
    await page.pdf({path:'/tmp/b4skills-ozgun-course-report.pdf',format:'A4',printBackground:true});
  }
  expect(errors).toEqual([]);
});
