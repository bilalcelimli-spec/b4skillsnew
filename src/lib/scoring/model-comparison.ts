import {ReferenceDatasetSchema,evaluateReferenceDataset,type ReferenceDataset} from './reference-evaluation.js';
import {learnerBootstrapInterval} from './learner-bootstrap.js';
export const MODEL_COMPARISON_VERSION='2026-10-14.1';
/** Internal research limits, not externally certified acceptance standards. */
export const COMPARISON_POLICY=Object.freeze({version:'2026-10-14.1',maxMaeIncrease:.01,maxCandidateMae:.08,minCandidateQwk:.8,
 maxSevereBandErrorIncrease:.01,maxCoverageDrop:.02,maxPreviouslyAutoLostRate:.02,minAutoCoverage:.9,
 minRepeatabilityRate:.95,maxRepeatabilityDrop:.02,minPairedLearnersPerSkill:30,minLearnersPerCell:30});
const mean=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
function canonical(value:unknown):string {
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,entry])=>`${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
 return JSON.stringify(value);
}
function reference(row:ReferenceDataset['responses'][number]) {
 const {runs,...rest}=row;
 return canonical({...rest,expertRatings:[...row.expertRatings].sort((a,b)=>a.raterId.localeCompare(b.raterId))});
}
type PairedRow={learnerId:string;skill:string;errorDelta:number;baselineError:number;candidateError:number;severeDelta:number};
function pairedMetrics(rows:PairedRow[]) {
 return {n:rows.length,learners:new Set(rows.map(row=>row.learnerId)).size,
 baselineMae:mean(rows.map(row=>row.baselineError)),candidateMae:mean(rows.map(row=>row.candidateError)),
 maeDelta:mean(rows.map(row=>row.errorDelta)),maeDelta95LearnerBootstrap:learnerBootstrapInterval(rows.map(row=>({learnerId:row.learnerId,value:row.errorDelta}))),
 severeBandErrorRateDelta:mean(rows.map(row=>row.severeDelta))};
}
export function compareScoringModels(baselineInput:unknown,candidateInput:unknown) {
 const baseline=ReferenceDatasetSchema.parse(baselineInput),candidate=ReferenceDatasetSchema.parse(candidateInput);
 const baselineReport=evaluateReferenceDataset(baseline),candidateReport=evaluateReferenceDataset(candidate);
 if(baseline.datasetId!==candidate.datasetId||canonical(baseline.scoreBandCutoffs)!==canonical(candidate.scoreBandCutoffs)||
  canonical(baseline.expertProtocol)!==canonical(candidate.expertProtocol))throw new Error('Reference dataset/configuration mismatch');
 if(baseline.modelVersion===candidate.modelVersion&&baseline.scoringPolicyVersion===candidate.scoringPolicyVersion)throw new Error('Comparison requires distinct model or scoring policy versions');
 const candidates=new Map(candidate.responses.map(row=>[row.id,row]));
 if(baseline.responses.length!==candidate.responses.length)throw new Error('Reference response set mismatch');
 const paired:PairedRow[]=[];let lost=0,gained=0;
 for(const row of baseline.responses){
  const next=candidates.get(row.id);if(!next||reference(row)!==reference(next))throw new Error('Frozen reference evidence mismatch');
  if(row.split!=='holdout')continue;
  const old=row.runs[0],current=next.runs[0];
  if(old.status==='scored'&&current.status!=='scored')lost++;
  if(old.status!=='scored'&&current.status==='scored')gained++;
  if(old.status!=='scored'||current.status!=='scored')continue;
  const truth=row.adjudication?.score??(row.expertRatings[0].score+row.expertRatings[1].score)/2;
  const truthBand=row.adjudication?.band??row.expertRatings[0].band;
  const oldError=Math.abs(old.score!-truth),newError=Math.abs(current.score!-truth);
  paired.push({learnerId:row.learnerId,skill:row.skill,baselineError:oldError,candidateError:newError,errorDelta:newError-oldError,
   severeDelta:Number(Math.abs(current.band!-truthBand)>=2)-Number(Math.abs(old.band!-truthBand)>=2)});
 }
 const repetition=(data:ReferenceDataset,skill:string)=>{
  const rows=data.responses.filter(row=>row.split==='holdout'&&row.skill===skill&&row.runs[0].status==='scored');
  const eligible=rows.filter(row=>row.runs.length>=5&&row.runs.every(run=>run.status==='scored'));
  return {missing:rows.length-eligible.length,rate:mean(eligible.map(row=>Number(Math.max(...row.runs.map(run=>run.score!))-Math.min(...row.runs.map(run=>run.score!))<=.05+1e-12)))};
 };
 const overall=pairedMetrics(paired),bySkill=Object.fromEntries(['WRITING','SPEAKING'].map(skill=>[skill,{...pairedMetrics(paired.filter(row=>row.skill===skill)),baselineRepeatability:repetition(baseline,skill),candidateRepeatability:repetition(candidate,skill)}]));
 const findings:Array<{kind:'evidence_gap'|'regression';code:string;scope:string}>=[];
 const add=(kind:'evidence_gap'|'regression',code:string,scope='overall')=>findings.push({kind,code,scope});
 for(const skill of ['WRITING','SPEAKING']){
  const comparison=bySkill[skill],quality=candidateReport.bySkill[skill];
  if(comparison.baselineRepeatability.missing||comparison.candidateRepeatability.missing)add('evidence_gap','REPEATS_INCOMPLETE',skill);
  if(comparison.candidateRepeatability.rate!==null&&comparison.candidateRepeatability.rate<COMPARISON_POLICY.minRepeatabilityRate)add('regression','CANDIDATE_REPEATABILITY_LIMIT',skill);
  if(comparison.baselineRepeatability.rate!==null&&comparison.candidateRepeatability.rate!==null&&comparison.candidateRepeatability.rate-comparison.baselineRepeatability.rate<-COMPARISON_POLICY.maxRepeatabilityDrop-1e-12)add('regression','REPEATABILITY_DROP',skill);
  if(comparison.learners<COMPARISON_POLICY.minPairedLearnersPerSkill)add('evidence_gap','PAIRED_LEARNERS_INSUFFICIENT',skill);
  if(comparison.maeDelta!==null&&comparison.maeDelta>COMPARISON_POLICY.maxMaeIncrease+1e-12)add('regression','MAE_INCREASE',skill);
  else if(!comparison.maeDelta95LearnerBootstrap||comparison.maeDelta95LearnerBootstrap[1]>COMPARISON_POLICY.maxMaeIncrease+1e-12)add('evidence_gap','MAE_NONINFERIORITY_UNRESOLVED',skill);
  if(comparison.severeBandErrorRateDelta!==null&&comparison.severeBandErrorRateDelta>COMPARISON_POLICY.maxSevereBandErrorIncrease+1e-12)add('regression','SEVERE_BAND_ERRORS_INCREASED',skill);
  if(quality.mae!==null&&quality.mae>COMPARISON_POLICY.maxCandidateMae+1e-12)add('regression','CANDIDATE_MAE_LIMIT',skill);
  if(quality.qwk===null)add('evidence_gap','QWK_UNDEFINED',skill);
  else if(quality.qwk<COMPARISON_POLICY.minCandidateQwk)add('regression','CANDIDATE_QWK_LIMIT',skill);
 }
 if(candidateReport.evidenceGaps.cellsBelow30Learners.length)add('evidence_gap','CANDIDATE_LEVEL_COVERAGE_INCOMPLETE');
 if(baselineReport.evidenceGaps.cellsBelow30Learners.length)add('evidence_gap','BASELINE_LEVEL_COVERAGE_INCOMPLETE');
 const coverageDelta=candidateReport.autoCoverage!==null&&baselineReport.autoCoverage!==null?candidateReport.autoCoverage-baselineReport.autoCoverage:null;
 if(coverageDelta!==null&&coverageDelta<-COMPARISON_POLICY.maxCoverageDrop-1e-12)add('regression','AUTO_COVERAGE_DROP');
 if(candidateReport.autoCoverage===null||candidateReport.autoCoverage<COMPARISON_POLICY.minAutoCoverage)add('evidence_gap','AUTO_COVERAGE_INSUFFICIENT');
 const lostRate=baselineReport.holdout?lost/baselineReport.holdout:null;
 if(lostRate!==null&&lostRate>COMPARISON_POLICY.maxPreviouslyAutoLostRate+1e-12)add('regression','PREVIOUSLY_AUTO_CASES_LOST');
 for(const [name,report] of [['baseline',baselineReport],['candidate',candidateReport]] as const){
  if(report.evidenceGaps.repeatabilityMissing||!report.repeatability.eligible)add('evidence_gap','REPEATS_INCOMPLETE',name);
 }
 const oldRepeat=baselineReport.repeatability.withinFivePointsRate,newRepeat=candidateReport.repeatability.withinFivePointsRate;
 const repeatabilityDelta=oldRepeat!==null&&newRepeat!==null?newRepeat-oldRepeat:null;
 if(newRepeat!==null&&newRepeat<COMPARISON_POLICY.minRepeatabilityRate)add('regression','CANDIDATE_REPEATABILITY_LIMIT');
 if(repeatabilityDelta!==null&&repeatabilityDelta<-COMPARISON_POLICY.maxRepeatabilityDrop-1e-12)add('regression','REPEATABILITY_DROP');
 return {comparisonVersion:MODEL_COMPARISON_VERSION,policy:COMPARISON_POLICY,datasetId:baseline.datasetId,
  baselineVersion:{model:baseline.modelVersion,policy:baseline.scoringPolicyVersion},candidateVersion:{model:candidate.modelVersion,policy:candidate.scoringPolicyVersion},
  releaseApproved:false,status:findings.some(finding=>finding.kind==='regression')?'observed_regression':findings.length?'insufficient_evidence':'within_provisional_limits',
  findings,paired:overall,bySkill,coverage:{baseline:baselineReport.autoCoverage,candidate:candidateReport.autoCoverage,delta:coverageDelta,lostPreviouslyAuto:lost,gainedAuto:gained,lostRate},
  repeatability:{baseline:oldRepeat,candidate:newRepeat,delta:repeatabilityDelta},
  baselineEvidence:baselineReport.evidenceGaps,candidateEvidence:candidateReport.evidenceGaps,
  limitations:['Comparison uses only jointly auto-scored cases for paired errors; routing losses and coverage are separately guarded.',
   'Observed regressions are descriptive, not significance claims. Limits are provisional internal research policy.',
   'Expert independence and dataset freeze are declared evidence. This report does not authorize release or prove subgroup fairness.']};
}
