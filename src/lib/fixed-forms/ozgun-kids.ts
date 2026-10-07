import {buildOzgunPlacement} from './ozgun-kids-placement';
export const OZGUN_PRODUCT = 'Özgün Kids — Form A (96 soru)';
export const OZGUN_FORM_ID = 'ozgun-kids-form-a-v1';
export const OZGUN_TITLE = 'Özgün Kids İngilizce Seviye Belirleme Sınavı — Form A';
export const OZGUN_MEDIA = '/assessments/ozgun-kids/form-a-v1';
export const OZGUN_SECTIONS = [
  {skill:'GRAMMAR',label:'Grammar',first:1,last:24,minutes:20},
  {skill:'VOCABULARY',label:'Vocabulary',first:25,last:48,minutes:15},
  {skill:'READING',label:'Reading',first:49,last:72,minutes:35},
  {skill:'LISTENING',label:'Listening',first:73,last:96,minutes:32},
] as const;
export type FixedAnswers = Record<string, 'A'|'B'|'C'|'D'|null>;
export interface FixedFormState {
  formId: string;
  keyId: string;
  sectionIndex: number;
  sectionStartedAt: string | null;
  answers: FixedAnswers;
  report?: ReturnType<typeof scoreFixedForm>;
  listeningStartedAt?: string;
}
export function scoreFixedForm(answers: FixedAnswers, key: string, keyConfirmed: boolean) {
  if (!/^[ABCD]{96}$/.test(key)) throw new Error('Cevap anahtarı 96 adet A/B/C/D içermelidir.');
  const sections=OZGUN_SECTIONS.map(section=>{
    let correct=0,wrong=0,blank=0;
    for(let n=section.first;n<=section.last;n++) {
      const answer=answers[String(n)];
      if(!answer) blank++; else if(answer===key[n-1]) correct++; else wrong++;
    }
    return {...section,correct,wrong,blank,total:24,percent:Math.round(correct/24*100)};
  });
  const correct=sections.reduce((sum,section)=>sum+section.correct,0);
  const wrong=sections.reduce((sum,section)=>sum+section.wrong,0);
  return {title:OZGUN_TITLE,total:96,correct,wrong,blank:96-correct-wrong,percent:Math.round(correct/96*100),
    sections,keyConfirmed,cefrLevel:null,certificateAvailable:false,
    placement:buildOzgunPlacement(answers,key,sections,correct,keyConfirmed)};
}
/** Advance overdue sections from their original deadlines; reconnecting never resets time. */
export function advanceExpiredSections(state: FixedFormState, now: Date) {
  const next=structuredClone(state);
  while(next.sectionStartedAt && next.sectionIndex<OZGUN_SECTIONS.length) {
    const deadline=new Date(next.sectionStartedAt).getTime()+OZGUN_SECTIONS[next.sectionIndex].minutes*60000;
    if(now.getTime()<deadline) break;
    next.sectionIndex++;
    next.sectionStartedAt=next.sectionIndex<OZGUN_SECTIONS.length ? new Date(deadline).toISOString() : null;
  }
  return next;
}
