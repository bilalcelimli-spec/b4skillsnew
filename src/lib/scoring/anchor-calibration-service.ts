import {anchorEvidenceIssues,finalAnchorScore} from './anchor-evidence.js';
import {buildScoringPrompt,scoringTargetCefr} from './task-context.js';
import {SCORING_MODEL,SCORING_POLICY_VERSION} from './ai-scoring-policy.js';
/**
 * Legacy recurring drift diagnostic for declared expert-rated reference responses.
 * Validates rubric/consensus metadata and requires finalized audio/text AI grades.
 * Internal per-skill targets: MAE <= 0.08, RMSE <= 0.12, Pearson r >= 0.85.
 * Missing evidence, held grades and constant corpora cannot pass. These targets
 * and declared consensus metadata are not independent model release approval.
 */

import { prisma } from "../prisma";
import { ScoringOrchestrator } from "../scoring/scoring-orchestrator";
import { logger } from "../observability/index.js";

export interface AnchorItem {
  id: string;
  skill: "WRITING" | "SPEAKING";
  cefrLevel: string;
  /** The response text (or base64-encoded audio for speaking) */
  content: string;
  rubric?: unknown;
  mimeType?: string; // For speaking audio
  /** Normalised human expert score [0,1] — declared expert consensus (qualification and independence are not verified here) */
  expertScore: number;
  /** Number of expert raters who agreed on this score */
  raterCount: number;
  /** Inter-rater agreement (QWK) among the expert raters */
  expertQwk: number;
  prompt: string;
  addedAt: string;
}

export interface AnchorCalibrationResult {
  totalItems: number;
  scoredItems: number;
  mae: number | null;
  rmse: number | null;
  pearsonR: number | null;
  biasDirection: "overscoring" | "underscoring" | "neutral";
  meetsThreshold: boolean;
  details: { id: string; expertScore: number; aiScore: number; delta: number }[];
  runAt: string;
  excludedItems?: {id:string;reasons:string[]}[];
  evidenceGaps?: string[];
  bySkill?: Record<string,{n:number;mae:number|null;rmse:number|null;pearsonR:number|null}>;
  releaseApproved?: false;
  modelVersion?: string;
  scoringPolicyVersion?: string;
}

const DRIFT_ALARM_THRESHOLD_MAE  = 0.08;
const DRIFT_ALARM_THRESHOLD_RMSE = 0.12;

function pearsonR(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b) / n;
  const my = ys.reduce((a, b) => a + b) / n;
  const num   = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const denX  = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const denY  = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return denX * denY === 0 ? null : Math.max(-1,Math.min(1,num / (denX * denY)));
}

export const AnchorCalibrationService = {
  /**
   * Add a human-scored anchor item to the SystemConfig anchor corpus.
   * The anchor corpus is stored in SystemConfig.config.anchorSet as a JSON array.
   */
  async addAnchorItem(item: Omit<AnchorItem, "id" | "addedAt">): Promise<AnchorItem> {
    const admissionIssues=anchorEvidenceIssues({...item,id:'new-anchor'});
    if(admissionIssues.length)throw new Error(`Invalid anchor evidence: ${admissionIssues.join(',')}`);
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    const cfg = (config?.config as any) || {};
    const anchorSet: AnchorItem[] = cfg.anchorSet || [];

    const newItem: AnchorItem = {
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    };

    anchorSet.push(newItem);

    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: { id: "global", config: { ...cfg, anchorSet } as any },
      update: { config: { ...cfg, anchorSet } as any },
    });

    logger.info({ anchorItemId: newItem.id, skill: item.skill, cefr: item.cefrLevel },
      "Anchor item added");
    return newItem;
  },

  /**
   * Retrieve the full anchor corpus.
   */
  async getAnchorSet(): Promise<AnchorItem[]> {
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    return ((config?.config as any)?.anchorSet as AnchorItem[]) || [];
  },

  /**
   * Run the AI scoring pipeline against all anchor items and compute drift metrics.
   * Results are persisted in SystemConfig.config.anchorCalibrationHistory (last 30 runs).
   *
   * @param concurrency Number of parallel AI scoring calls (default: 3)
   */
  async runCalibration(concurrency = 3): Promise<AnchorCalibrationResult> {
    if(!Number.isInteger(concurrency)||concurrency<1||concurrency>8)throw new RangeError('Anchor concurrency must be an integer between 1 and 8');
    const stored=await this.getAnchorSet();
    if(!Array.isArray(stored))throw new Error('Invalid anchor corpus storage');
    const anchorSet=structuredClone(stored);
    const excludedItems:{id:string;reasons:string[]}[]=[];
    const idCounts=new Map<string,number>();
    for(const item of anchorSet)if(typeof item?.id==='string')idCounts.set(item.id,(idCounts.get(item.id)??0)+1);
    const admitted:AnchorItem[]=[];
    for(const item of anchorSet){
      const reasons=anchorEvidenceIssues(item);
      const id=typeof item?.id==='string'?item.id:'unknown';
      if((idCounts.get(id)??0)>1)reasons.push('DUPLICATE_ANCHOR_ID');
      if(reasons.length)excludedItems.push({id,reasons});else admitted.push(item);
    }
    const details:{id:string;expertScore:number;aiScore:number;delta:number}[]=[];
    for(let index=0;index<admitted.length;index+=concurrency){
      await Promise.all(admitted.slice(index,index+concurrency).map(async item=>{
        try{
          const prompt=buildScoringPrompt({prompt:item.prompt,rubric:item.rubric});
          const target=scoringTargetCefr(item.cefrLevel);
          const result=item.skill==='WRITING'
            ?await ScoringOrchestrator.scoreWriting(item.content,prompt,target)
            :await ScoringOrchestrator.scoreSpeaking(item.content,item.mimeType!,prompt,undefined,target);
          const score=finalAnchorScore(result);
          if(score===null){excludedItems.push({id:item.id,reasons:[result.scoreSource==='ai_unavailable'?'AI_UNAVAILABLE':'UNFINALIZED_AI_SCORE']});return;}
          details.push({id:item.id,expertScore:item.expertScore,aiScore:score,delta:score-item.expertScore});
        }catch{excludedItems.push({id:item.id,reasons:['AI_SCORING_FAILED']});}
      }));
    }
    const metrics=(rows:typeof details)=>({n:rows.length,
      mae:rows.length?rows.reduce((sum,row)=>sum+Math.abs(row.delta),0)/rows.length:null,
      rmse:rows.length?Math.sqrt(rows.reduce((sum,row)=>sum+row.delta**2,0)/rows.length):null,
      pearsonR:pearsonR(rows.map(row=>row.expertScore),rows.map(row=>row.aiScore))});
    const aggregate=metrics(details);
    const bySkill:NonNullable<AnchorCalibrationResult['bySkill']>={};
    const evidenceGaps:string[]=[];
    if(!anchorSet.length)evidenceGaps.push('EMPTY_ANCHOR_CORPUS');
    if(details.length!==anchorSet.length)evidenceGaps.push('INCOMPLETE_SCORING');
    for(const skill of ['WRITING','SPEAKING']){
      const ids=new Set(admitted.filter(item=>item.skill===skill).map(item=>item.id));
      bySkill[skill]=metrics(details.filter(row=>ids.has(row.id)));
      if(bySkill[skill].n<30)evidenceGaps.push(`${skill}_ANCHORS_BELOW_30`);
      if(bySkill[skill].pearsonR===null)evidenceGaps.push(`${skill}_VARIATION_INSUFFICIENT`);
    }
    const meanDelta=details.length?details.reduce((sum,row)=>sum+row.delta,0)/details.length:0;
    const biasDirection:AnchorCalibrationResult['biasDirection']=Math.abs(meanDelta)<.02?'neutral':meanDelta>0?'overscoring':'underscoring';
    const meetsThreshold=!evidenceGaps.length&&Object.values(bySkill).every(metric=>metric.mae!==null&&metric.mae<=DRIFT_ALARM_THRESHOLD_MAE&&
      metric.rmse!==null&&metric.rmse<=DRIFT_ALARM_THRESHOLD_RMSE&&metric.pearsonR!==null&&metric.pearsonR>=.85);
    details.sort((a,b)=>a.id.localeCompare(b.id));excludedItems.sort((a,b)=>a.id.localeCompare(b.id));
    const result:AnchorCalibrationResult={totalItems:anchorSet.length,scoredItems:details.length,
      mae:aggregate.mae,rmse:aggregate.rmse,pearsonR:aggregate.pearsonR,biasDirection,meetsThreshold,
      details,excludedItems,evidenceGaps,bySkill,releaseApproved:false,modelVersion:SCORING_MODEL,scoringPolicyVersion:SCORING_POLICY_VERSION,runAt:new Date().toISOString()};
    logger.info({totalItems:result.totalItems,scoredItems:result.scoredItems,meetsThreshold,evidenceGaps},'Anchor drift evaluation completed; not release approval');
    if(!anchorSet.length)return result;

    // Persist the last 30 runs in SystemConfig for trending
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    const cfg = (config?.config as any) || {};
    const history: AnchorCalibrationResult[] = cfg.anchorCalibrationHistory || [];
    history.unshift(result);
    if (history.length > 30) history.length = 30;

    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: { id: "global", config: { ...cfg, anchorCalibrationHistory: history } as any },
      update: { config: { ...cfg, anchorCalibrationHistory: history } as any },
    });

    return result;
  },

  /**
   * Get historical calibration runs (for trend monitoring).
   */
  async getCalibrationHistory(): Promise<AnchorCalibrationResult[]> {
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    return ((config?.config as any)?.anchorCalibrationHistory as AnchorCalibrationResult[]) || [];
  },

  /**
   * Legacy diagnostic drift check only. Independent frozen reference comparison
   * and assessment review are required for release approval.
   */
  async validateModelVersion(): Promise<{ passed: boolean; releaseApproved:false; result: AnchorCalibrationResult }> {
    const result = await this.runCalibration();
    return { passed: result.meetsThreshold, releaseApproved:false, result };
  },
};
