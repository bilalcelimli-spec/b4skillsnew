/** Read-only rubric inventory. Output contains item references/structure, never candidate answers. */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { productiveModes } from '../src/lib/assessment-engine/productive-response.js';
import { rubricReviewReasons, resolveTaskRubric, RUBRIC_VALIDATION_VERSION } from '../src/lib/scoring/rubric-validation.js';
config({path:'.env.local',quiet:true});config({quiet:true});
const prisma = new PrismaClient();
const shape = (value:unknown):string => {
 if(value == null) return 'missing';
 if(typeof value !== 'object') return typeof value;
 if(Array.isArray(value)) return `array:${value.length}`;
 const entries=Object.entries(value as Record<string,unknown>);
 return entries.slice(0,20).map(([key,entry])=>`${key.replace(/[^A-Za-z0-9_]/g,'').slice(0,40)}:${Array.isArray(entry)?'array':entry==null?'null':typeof entry}`).join(',');
};
async function main(){
 const report=await prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  let cursor:string|undefined;
  let scanned=0,productive=0,held=0;
  const byEditorialIssue:Record<string,number>={},bySource:Record<string,number>={};
  const byIssue:Record<string,number>={},byCell:Record<string,{total:number;held:number}>={},byShape:Record<string,number>={};
  const findings:Array<{itemId:string;itemCode:string|null;version:number;cell:string;issues:string[];editorialIssues:string[];shape:string}>=[];
  for(;;){
   const page=await tx.item.findMany({where:{status:{in:['ACTIVE','PRETEST']}},orderBy:{id:'asc'},take:50,
    ...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,itemCode:true,version:true,status:true,skill:true,type:true,cefrLevel:true,content:true}});
   if(!page.length)break;
   for(const item of page){
    scanned++;
    const content=(item.content??{}) as Record<string,unknown>;
    if(!productiveModes(item.skill,item.type,content).length)continue;
    productive++;
    const rubric=resolveTaskRubric(content);
    const source=content.scoringRubric!=null?'scoringRubric':'rubric';bySource[source]=(bySource[source]??0)+1;
    const editorialIssues:string[]=[];
    if(typeof rubric==='string')editorialIssues.push('TEXT_ONLY_RUBRIC');
    if(typeof content.rubric==='string' && /\bAssess near-native mastery\b/i.test(content.rubric))editorialIssues.push('NATIVE_LIKENESS_EXPECTATION');
    for(const code of editorialIssues)byEditorialIssue[code]=(byEditorialIssue[code]??0)+1;
    const issues=rubricReviewReasons(rubric),cell=`${item.status}/${item.skill}/${item.cefrLevel}/${item.type}`;
    const key=shape(rubric);byShape[key]=(byShape[key]??0)+1;
    byCell[cell]??={total:0,held:0};byCell[cell].total++;
    if(issues.length){held++;byCell[cell].held++;for(const issue of issues)byIssue[issue]=(byIssue[issue]??0)+1;}
    if(issues.length||editorialIssues.length)findings.push({itemId:item.id,itemCode:item.itemCode,version:item.version,cell,issues,editorialIssues,shape:key});
   }
   cursor=page.at(-1)!.id;if(page.length<50)break;
  }
  return {summary:{scanned,productive,held,structurallyValid:productive-held,byIssue,byEditorialIssue,bySource,byShape,byCell},findings};
 },{isolationLevel:'RepeatableRead',timeout:60_000,maxWait:10_000});
 const directory=path.resolve('reports/item-evidence');mkdirSync(directory,{recursive:true,mode:0o700});
 const reportPath=path.join(directory,`productive-rubrics-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
 writeFileSync(reportPath,JSON.stringify({generatedAt:new Date().toISOString(),policyVersion:RUBRIC_VALIDATION_VERSION,
 limitations:['Structural checks do not establish expert approval or descriptor validity.','Database transaction is read-only. No items or responses were modified.'],...report},null,2),{mode:0o600});
 console.log(JSON.stringify({...report.summary,reportPath},null,2));
 if(process.argv.includes('--strict')&&report.summary.held)process.exitCode=2;
}
main().catch(()=>{console.error('Read-only rubric audit failed; verify database access. No changes attempted.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
