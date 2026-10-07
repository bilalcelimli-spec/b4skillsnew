import { OZGUN_QUESTIONS, OZGUN_PASSAGES } from './ozgun-kids-content.server';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { OZGUN_ANSWER_KEY } from './ozgun-kids-key.server';
import { advanceExpiredSections, scoreFixedForm, OZGUN_FORM_ID, OZGUN_PRODUCT, OZGUN_SECTIONS, type FixedFormState } from './ozgun-kids';

export class FixedFormError extends Error {
  constructor(message:string, public status=400) {super(message);}
}
export type FixedKeyConfig = {answerKey:string;confirmed:boolean};
export function validateFixedKey(config: FixedKeyConfig) {
  if(typeof config.answerKey!=='string' || !/^[ABCD]{96}$/.test(config.answerKey) || typeof config.confirmed!=='boolean')
    throw new FixedFormError('Cevap anahtarı tam 96 adet A/B/C/D ve doğrulama durumu içermelidir.');
  return config;
}
export function createOzgunKidsService(prisma: PrismaClient) {
  async function configFor(db:any, organizationId:string):Promise<FixedKeyConfig> {
    const config=await db.systemConfig.findUnique({where:{id:`ozgun-kids-config:${organizationId}`}});
    return validateFixedKey((config?.config ?? {answerKey:OZGUN_ANSWER_KEY,confirmed:true}) as FixedKeyConfig);
  }
  async function finish(db:any, session:any, state:FixedFormState) {
    if(state.sectionIndex<4 || state.report) return;
    const snapshot=await db.systemConfig.findUnique({where:{id:state.keyId}});
    if(!snapshot) throw new FixedFormError('Sınavın cevap anahtarı sürümü bulunamadı.',503);
    const config=validateFixedKey(snapshot.config as FixedKeyConfig);
    state.report=scoreFixedForm(state.answers,config.answerKey,config.confirmed);
    session.status=session.metadata?.securityFlag===true || session.status==='FLAGGED' ? 'FLAGGED' : 'COMPLETED';
    session.completedAt=new Date();
    session.cefrLevel=null;
  }
  function view(session:any,state:FixedFormState,now:Date) {
    const section=OZGUN_SECTIONS[state.sectionIndex];
    return {sessionType:'FIXED_FORM',formId:OZGUN_FORM_ID,sessionId:session.id,productLine:OZGUN_PRODUCT,
      organizationId:session.organizationId,status:session.status,startedAt:session.startedAt,completedAt:session.completedAt,
      serverNow:now.toISOString(),sectionIndex:state.sectionIndex,section:section ?? null,
      sectionDeadline:section && state.sectionStartedAt ? new Date(new Date(state.sectionStartedAt).getTime()+section.minutes*60000).toISOString():null,
      questions:section && session.status!=='SCHEDULED' ? OZGUN_QUESTIONS.filter(q=>q.skill===section.skill).map(q=>({...q,...('passageId' in q ? {passage:OZGUN_PASSAGES[q.passageId!]} : {})})):[],
      answers:state.answers,listeningStartedAt:state.listeningStartedAt ?? null,
      report:state.report ? {...state.report,securityHold:session.status==='FLAGGED'}:null};
  }
  async function mutate(sessionId:string, action:'read'|'start'|'answer'|'advance'|'listen', payload?:any) {
    return prisma.$transaction(async db=>{
      await db.$queryRaw`SELECT id FROM "Session" WHERE id = ${sessionId} FOR UPDATE`;
      const session:any=await db.session.findUnique({where:{id:sessionId}});
      if(!session || session.metadata?.sessionType!=='FIXED_FORM' || session.metadata?.fixedForm?.formId!==OZGUN_FORM_ID)
        throw new FixedFormError('Özgün Placement sınavı bulunamadı.',404);
      if(!['SCHEDULED','IN_PROGRESS','COMPLETED','FLAGGED'].includes(session.status)) throw new FixedFormError('Sınav bu durumda kullanılamaz.',409);
      const now=new Date(), original=structuredClone(session.metadata.fixedForm) as FixedFormState;
      const state=advanceExpiredSections(original,now);
      const moved=state.sectionIndex!==original.sectionIndex;
      if(action==='start' && session.status==='SCHEDULED') {
        session.status='IN_PROGRESS';session.startedAt=now;state.sectionStartedAt=now.toISOString();
      }
      if(action!=='read' && action!=='start' && !state.report && state.sectionIndex<4 && session.status!=='IN_PROGRESS')
        throw new FixedFormError('Önce sınavı başlatın.',409);
      if(action==='answer' && !moved && state.sectionIndex<4 && !state.report) {
        const section=OZGUN_SECTIONS[state.sectionIndex];
        if(!Number.isInteger(payload?.number) || payload.number<section.first || payload.number>section.last || ![null,'A','B','C','D'].includes(payload?.answer))
          throw new FixedFormError('Yalnızca açık bölümdeki sorular cevaplanabilir.');
        state.answers[String(payload.number)]=payload.answer;
      }
      if(action==='advance' && !moved && state.sectionIndex<4 && !state.report) {
        if(payload?.sectionIndex!==state.sectionIndex) throw new FixedFormError('Bölüm değişti; sınavı yenileyin.',409);
        state.sectionIndex++;state.sectionStartedAt=state.sectionIndex<4 ? now.toISOString():null;
      }
      if(action==='listen' && state.sectionIndex===3 && !state.listeningStartedAt) state.listeningStartedAt=now.toISOString();
      await finish(db,session,state);
      await db.session.update({where:{id:sessionId},data:{status:session.status,startedAt:session.startedAt,completedAt:session.completedAt,cefrLevel:session.cefrLevel,
        responsesCount:Object.values(state.answers).filter(Boolean).length,metadata:{...session.metadata,fixedForm:state}}});
      return view(session,state,now);
    });
  }
  return {
    config: (organizationId:string)=>configFor(prisma,organizationId),
    async saveConfig(organizationId:string,input:FixedKeyConfig) {
      const config=validateFixedKey(input);
      await prisma.systemConfig.upsert({where:{id:`ozgun-kids-config:${organizationId}`},create:{id:`ozgun-kids-config:${organizationId}`,config},update:{config}});
      return config;
    },
    async launch(candidateId:string,organizationId:string,role:string,email:string) {
      if(!['CANDIDATE','SUPER_ADMIN','ASSESSMENT_DIRECTOR','INST_ADMIN'].includes(role))
        throw new FixedFormError('Bu sınavı başlatma yetkiniz yok.',403);
      if(role==='CANDIDATE' && (typeof email!=='string'||!email.trim()))
        throw new FixedFormError('Adayın doğrulanmış e-posta bilgisi gerekir.',403);
      return prisma.$transaction(async db=>{
        let codeId:string|null=null;
        if(role==='CANDIDATE') {
          const code=await db.examCode.findFirst({where:{organizationId,usedByEmail:email,isUsed:true,productLine:OZGUN_PRODUCT},orderBy:{usedAt:'desc'}});
          if(!code) throw new FixedFormError('Bu sınav için Özgün Placement sınav kodu gerekir.',403);
          codeId=code.id;
          await db.$queryRaw`SELECT id FROM "ExamCode" WHERE id = ${code.id} FOR UPDATE`;
          const existing=await db.session.findFirst({where:{candidateId,organizationId,metadata:{path:['fixedFormCodeId'],equals:code.id}}});
          if(existing) return {sessionId:existing.id,sessionType:'FIXED_FORM',productLine:OZGUN_PRODUCT};
          if(code.expiresAt && code.expiresAt<new Date()) throw new FixedFormError('Sınav kodunun süresi doldu.',403);
        }
        const config=await configFor(db,organizationId);
        const keyId='ozgun-kids-key:'+createHash('sha256').update(JSON.stringify(config)).digest('hex');
        await db.systemConfig.upsert({where:{id:keyId},create:{id:keyId,config},update:{}});
        const state:FixedFormState={formId:OZGUN_FORM_ID,keyId,sectionIndex:0,sectionStartedAt:null,answers:{}};
        const session=await db.session.create({data:{candidateId,organizationId,status:'SCHEDULED',metadata:{sessionType:'FIXED_FORM',productLine:OZGUN_PRODUCT,fixedFormCodeId:codeId,fixedForm:state} as any}});
        return {sessionId:session.id,sessionType:'FIXED_FORM',productLine:OZGUN_PRODUCT};
      });
    },
    read:(id:string)=>mutate(id,'read'),start:(id:string)=>mutate(id,'start'),
    answer:(id:string,number:number,answer:string|null)=>mutate(id,'answer',{number,answer}),
    advance:(id:string,sectionIndex:number)=>mutate(id,'advance',{sectionIndex}),
    listen:(id:string)=>mutate(id,'listen'),
  };
}
