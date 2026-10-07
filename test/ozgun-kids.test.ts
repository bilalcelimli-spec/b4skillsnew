import {describe,expect,it} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OZGUN_SECTIONS,OZGUN_FORM_ID,advanceExpiredSections,scoreFixedForm,type FixedFormState} from '../src/lib/fixed-forms/ozgun-kids';
import {OZGUN_QUESTIONS,OZGUN_PASSAGES} from '../src/lib/fixed-forms/ozgun-kids-content.server';
import {OZGUN_ANSWER_KEY} from '../src/lib/fixed-forms/ozgun-kids-key.server';
import provenance from '../src/lib/fixed-forms/ozgun-kids-provenance.json';
const state=():FixedFormState=>({formId:OZGUN_FORM_ID,keyId:'test',sectionIndex:0,sectionStartedAt:'2026-10-07T12:00:00Z',answers:{}});
describe('Özgün Kids source and fixed form rules',()=>{
 it('preserves all 96 ordered questions, four choices, six passages and six recording groups',()=>{
  expect(OZGUN_QUESTIONS.map(q=>q.number)).toEqual(Array.from({length:96},(_,i)=>i+1));
  for(const section of OZGUN_SECTIONS)expect(OZGUN_QUESTIONS.filter(q=>q.skill===section.skill)).toHaveLength(24);
  for(const question of OZGUN_QUESTIONS){expect(Object.keys(question.options)).toEqual(['A','B','C','D']);expect(question.prompt.length).toBeGreaterThan(10);for(const value of Object.values(question.options))expect(value).not.toMatch(/ÖĞRENCİ|Cevaplarınızı|bölümünün sonu/);}
  expect(Object.keys(OZGUN_PASSAGES)).toHaveLength(6);
  for(let n=1;n<=6;n++){expect(OZGUN_QUESTIONS.filter(q=>q.recording===n)).toHaveLength(4);expect(OZGUN_PASSAGES[String(n)].length).toBeGreaterThan(300);}
 });
 it('preserves exact source assets, including the 29:33 compiled listening file',()=>{
  for(const asset of provenance.assets){const path=`public/assessments/ozgun-kids/form-a-v1/${asset.file}`;expect(existsSync(path)).toBe(true);expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(asset.sha256);}
  const full=provenance.assets.find(a=>a.file==='Listening_Tam_Sinav.mp3')!;expect(full.durationSeconds).toBeGreaterThan(1773);expect(full.durationSeconds).toBeLessThan(32*60);
 });
 it('scores one point per correct answer, no negative marking, and no invented CEFR or productive scores',()=>{
  const report=scoreFixedForm({'1':'B','2':'A','25':'D','73':'C'},OZGUN_ANSWER_KEY,false);
  expect(report).toMatchObject({correct:3,wrong:1,blank:92,percent:3,cefrLevel:null,certificateAvailable:false,keyConfirmed:false});
  expect(report.sections[0]).toMatchObject({correct:1,wrong:1,blank:22});
  expect(report.sections.map(s=>s.skill)).not.toContain('WRITING');
  const all=Object.fromEntries([...OZGUN_ANSWER_KEY].map((answer,i)=>[String(i+1),answer]));
  expect(scoreFixedForm(all as any,OZGUN_ANSWER_KEY,true)).toMatchObject({correct:96,wrong:0,blank:0,percent:100,keyConfirmed:true});
 });
 it('does not reset deadlines on reconnect and advances over all elapsed sections',()=>{
  expect(advanceExpiredSections(state(),new Date('2026-10-07T12:19:59Z'))).toEqual(state());
  expect(advanceExpiredSections(state(),new Date('2026-10-07T12:20:00Z'))).toMatchObject({sectionIndex:1,sectionStartedAt:'2026-10-07T12:20:00.000Z'});
  expect(advanceExpiredSections(state(),new Date('2026-10-07T12:40:00Z'))).toMatchObject({sectionIndex:2,sectionStartedAt:'2026-10-07T12:35:00.000Z'});
  expect(advanceExpiredSections(state(),new Date('2026-10-07T13:42:00Z'))).toMatchObject({sectionIndex:4,sectionStartedAt:null});
 });
});
