import {rubricReviewReasons} from './rubric-validation.js';
import {scoringTargetCefr} from './task-context.js';
const unit=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
/** Legacy consensus metadata is a declaration, not proof of expert independence. */
export function anchorEvidenceIssues(value:unknown):string[] {
 if(!value||typeof value!=='object')return ['INVALID_ANCHOR'];
 const item=value as Record<string,unknown>,issues:string[]=[];
 if(typeof item.id!=='string'||!item.id.trim()||!['WRITING','SPEAKING'].includes(String(item.skill))||
  typeof item.prompt!=='string'||!item.prompt.trim()||typeof item.content!=='string'||!item.content.trim())issues.push('INVALID_ANCHOR');
 if(!unit(item.expertScore))issues.push('INVALID_EXPERT_SCORE');
 if(!Number.isInteger(item.raterCount)||Number(item.raterCount)<2)issues.push('EXPERT_RATERS_INSUFFICIENT');
 if(typeof item.expertQwk!=='number'||!Number.isFinite(item.expertQwk)||item.expertQwk<.8||item.expertQwk>1)issues.push('EXPERT_AGREEMENT_UNVERIFIED');
 if(!scoringTargetCefr(item.cefrLevel))issues.push('TARGET_CEFR_MISSING');
 issues.push(...rubricReviewReasons(item.rubric));
 if(item.skill==='SPEAKING'&&(typeof item.mimeType!=='string'||!/^audio\/(webm|mp4|mpeg|wav|ogg|flac)(;.*)?$/.test(item.mimeType)||
  typeof item.content!=='string'||item.content.length<24||item.content.length>10_000_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(item.content)))issues.push('ACTUAL_AUDIO_REQUIRED');
 if(item.skill==='WRITING'&&typeof item.content==='string'&&item.content.length>100_000)issues.push('INVALID_ANCHOR');
 return [...new Set(issues)];
}
export function finalAnchorScore(result:{score:number;scoreSource?:string;requiresHumanReview?:boolean}):number|null {
 return result.scoreSource==='ai_auto'&&result.requiresHumanReview!==true&&unit(result.score)?result.score:null;
}
