import { z } from 'zod';
const score = z.number().finite().min(0).max(1);
const band = z.number().int().min(0).max(6);
const rating = z.object({raterId:z.string().min(1),score,band}).strict();
const run = z.object({runId:z.string().min(1),status:z.enum(['scored','review_required','unavailable']),score:score.nullable(),band:band.nullable()}).strict();
export const ReferenceDatasetSchema = z.object({
 version:z.literal(1), datasetId:z.string().min(1),modelVersion:z.string().min(1),scoringPolicyVersion:z.string().min(1),
 expertProtocol:z.object({independent:z.literal(true),blindToAi:z.literal(true),qualified:z.literal(true)}).strict(),
 // These are declared evaluation cutoffs, not validated platform placement thresholds.
 scoreBandCutoffs:z.array(score).length(6),
 responses:z.array(z.object({id:z.string().min(1),learnerId:z.string().min(1),promptId:z.string().min(1),
  rubricVersion:z.string().min(1),split:z.enum(['development','holdout']),skill:z.enum(['WRITING','SPEAKING']),
  expertRatings:z.array(rating).length(2),adjudication:rating.optional(),runs:z.array(run).min(1),
  groups:z.record(z.string(),z.string()).optional(),
 }).strict()),
}).strict();
export type ReferenceDataset = z.infer<typeof ReferenceDatasetSchema>;
export const REFERENCE_EVALUATION_VERSION = '2026-10-14.1';
const mean=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
/** Uses explicitly rated ordinal bands; never rounds continuous scores into CEFR levels. */
export function ordinalQuadraticKappa(pairs:Array<[number,number]>):number|null {
 if(!pairs.length)return null;
 const left=Array(7).fill(0),right=Array(7).fill(0);let observed=0;
 for(const [a,b] of pairs){if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>6||b>6)throw new Error('Invalid ordinal pair');left[a]++;right[b]++;observed+=(a-b)**2;}
 let expected=0;for(let a=0;a<7;a++)for(let b=0;b<7;b++)expected+=(a-b)**2*left[a]*right[b]/pairs.length;
 return expected===0?null:1-observed/expected;
}
type Pair={learnerId:string;skill:string;reference:number;referenceBand:number;prediction:number;predictionBand:number;boundary:boolean;groups:Record<string,string>};
/** Learner-cluster bootstrap: repeated tasks from one learner are resampled together. */
function maeInterval(pairs:Pair[],iterations=1000):[number,number]|null {
 const clusters=new Map<string,Pair[]>();for(const pair of pairs)clusters.set(pair.learnerId,[...(clusters.get(pair.learnerId)??[]),pair]);
 const values=[...clusters.values()];if(values.length<2)return null;
 let seed=20261014;const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 const estimates:number[]=[];
 for(let iteration=0;iteration<iterations;iteration++){
  const sampled:Pair[]=[];for(let cluster=0;cluster<values.length;cluster++)sampled.push(...values[Math.floor(random()*values.length)]);
  estimates.push(mean(sampled.map(pair=>Math.abs(pair.prediction-pair.reference)))!);
 }
 estimates.sort((a,b)=>a-b);return [estimates[24],estimates[974]];
}
function metrics(pairs:Pair[]) {
 const delta=pairs.map(pair=>pair.prediction-pair.reference);
 const boundary=pairs.filter(pair=>pair.boundary);
 const errors=(rows:Pair[])=>({n:rows.length,overplacementRate:mean(rows.map(pair=>Number(pair.predictionBand>pair.referenceBand))),
  underplacementRate:mean(rows.map(pair=>Number(pair.predictionBand<pair.referenceBand))),
  twoOrMoreBandErrorRate:mean(rows.map(pair=>Number(Math.abs(pair.predictionBand-pair.referenceBand)>=2)))});
 return {n:pairs.length,learners:new Set(pairs.map(pair=>pair.learnerId)).size,
  mae:mean(delta.map(Math.abs)),rmse:delta.length?Math.sqrt(mean(delta.map(value=>value*value))!):null,
  signedBias:mean(delta),qwk:ordinalQuadraticKappa(pairs.map(pair=>[pair.predictionBand,pair.referenceBand])),
  mae95LearnerBootstrap:maeInterval(pairs),placement:errors(pairs),boundaryPlacement:errors(boundary)};
}
export function evaluateReferenceDataset(input:unknown) {
 const dataset=ReferenceDatasetSchema.parse(input);
 if(dataset.scoreBandCutoffs.some((cutoff,index)=>cutoff<=0||cutoff>=1||(index>0&&cutoff<=dataset.scoreBandCutoffs[index-1])))throw new Error('Evaluation cutoffs must be strictly increasing inside (0,1)');
 const ids=new Set<string>(),developmentLearners=new Set<string>(),developmentPrompts=new Set<string>();
 for(const response of dataset.responses){
  if(ids.has(response.id))throw new Error('Duplicate reference response');ids.add(response.id);
  if(response.split==='development'){developmentLearners.add(response.learnerId);developmentPrompts.add(response.promptId);}
 }
 const pairs:Pair[]=[],humanPairs:Array<[number,number]>=[],ranges:number[]=[];
 const referenceCounts:Record<string,number>={},scoredCounts:Record<string,number>={};
 const cellLearners=new Map<string,Set<string>>();
 let review=0,unavailable=0,adjudicated=0,holdout=0;
 for(const response of dataset.responses){
  const [first,second]=response.expertRatings;
  if(first.raterId===second.raterId)throw new Error('Expert ratings must use distinct raters');
  if(response.adjudication && [first.raterId,second.raterId].includes(response.adjudication.raterId))throw new Error('Adjudicator must be a third rater');
  const disagreement=first.band!==second.band||Math.abs(first.score-second.score)>.15+1e-12;
  if(disagreement&&!response.adjudication)throw new Error('Expert disagreement requires adjudication');
  const runIds=new Set<string>();
  for(const run of response.runs){
   if(runIds.has(run.runId))throw new Error('Duplicate scoring run');runIds.add(run.runId);
   if(run.status==='scored'&&(run.score===null||run.band===null))throw new Error('Scored runs require score and band');
   if(run.status==='unavailable'&&(run.score!==null||run.band!==null))throw new Error('Unavailable runs cannot contain placeholder grades');
  }
  if(response.split!=='holdout')continue;
  if(developmentLearners.has(response.learnerId)||developmentPrompts.has(response.promptId))throw new Error('Development/holdout learner or prompt leakage');
  holdout++;humanPairs.push([first.band,second.band]);if(response.adjudication)adjudicated++;
  const reference=response.adjudication?.score??(first.score+second.score)/2;
  const referenceBand=response.adjudication?.band??first.band;
  const cell=`${response.skill}/${referenceBand}`;referenceCounts[cell]=(referenceCounts[cell]??0)+1;
  // First predeclared run is the accuracy observation; never cherry-pick the best repeat.
  const prediction=response.runs[0];
  if(prediction.status==='review_required'){review++;continue;}
  if(prediction.status==='unavailable'){unavailable++;continue;}
  scoredCounts[cell]=(scoredCounts[cell]??0)+1;
  if(!cellLearners.has(cell))cellLearners.set(cell,new Set());cellLearners.get(cell)!.add(response.learnerId);
  pairs.push({learnerId:response.learnerId,skill:response.skill,reference,referenceBand,prediction:prediction.score!,predictionBand:prediction.band!,
   boundary:dataset.scoreBandCutoffs.some(cutoff=>Math.abs(reference-cutoff)<=.02+1e-12),groups:response.groups??{}});
  if(response.runs.length>=5&&response.runs.every(run=>run.status==='scored')){
   const scores=response.runs.map(run=>run.score!);ranges.push(Math.max(...scores)-Math.min(...scores));
  }
 }
 const missingCells:string[]=[];for(const skill of ['WRITING','SPEAKING'])for(let level=0;level<7;level++){
  const cell=`${skill}/${level}`;if((cellLearners.get(cell)?.size??0)<30)missingCells.push(cell);
 }
 const bySkill=Object.fromEntries(['WRITING','SPEAKING'].map(skill=>[skill,metrics(pairs.filter(pair=>pair.skill===skill))]));
 const groupPairs=new Map<string,Pair[]>();for(const pair of pairs)for(const [key,value] of Object.entries(pair.groups)){
  const group=`${key}/${value}`;groupPairs.set(group,[...(groupPairs.get(group)??[]),pair]);
 }
 return {evaluationVersion:REFERENCE_EVALUATION_VERSION,datasetId:dataset.datasetId,modelVersion:dataset.modelVersion,scoringPolicyVersion:dataset.scoringPolicyVersion,
  releaseApproved:false, // This offline report cannot authorize production or establish validity.
  limitations:['Expert independence/qualification is declared, not independently verified.','Metrics cover auto-scored holdout responses; review/unavailable cases are reported separately.','Cutoffs and sample-size targets are provisional evaluation configuration, not validated CEFR placement rules.','No causal subgroup fairness conclusion follows from these descriptive results.'],
  holdout,autoScored:pairs.length,review,unavailable,autoCoverage:holdout?pairs.length/holdout:null,
  humanAgreement:{qwk:ordinalQuadraticKappa(humanPairs),adjudicated},referenceCounts,scoredCounts,scoredLearnerCounts:Object.fromEntries([...cellLearners].map(([cell,learners])=>[cell,learners.size])),
  evidenceGaps:{cellsBelow30Learners:missingCells,repeatabilityMissing:pairs.length-ranges.length},
  overall:metrics(pairs),bySkill,
  repeatability:{eligible:ranges.length,totalAutoScored:pairs.length,withinFivePointsRate:mean(ranges.map(range=>Number(range<=.05+1e-12))),meanRange:mean(ranges)},
  subgroups:Object.fromEntries([...groupPairs].map(([group,rows])=>[group,new Set(rows.map(row=>row.learnerId)).size>=30?{suppressed:false,...metrics(rows)}:{suppressed:true,n:rows.length}])),
 };
}
