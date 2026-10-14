import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({config:vi.fn(),upsert:vi.fn(),grade:vi.fn(),speak:vi.fn(),text:vi.fn()}));
vi.mock('../../prisma',()=>({prisma:{systemConfig:{findUnique:mocks.config,upsert:mocks.upsert}}}));
vi.mock('../scoring-orchestrator',()=>({ScoringOrchestrator:{scoreWriting:mocks.grade,scoreSpeaking:mocks.speak,scoreSpeakingFromText:mocks.text}}));
vi.mock('../../observability/index',()=>({logger:{info:vi.fn(),error:vi.fn()}}));
import {AnchorCalibrationService} from '../anchor-calibration-service';
const anchors=['a','b'].map(id=>({id,skill:'WRITING',content:'Synthetic independent essay',prompt:'Describe your room.',expertScore:.5,cefrLevel:'A1',raterCount:2,expertQwk:.9,rubric:'Task achievement and language control'}));
beforeEach(()=>{vi.clearAllMocks();mocks.upsert.mockResolvedValue({});});
describe('anchor validation evidence',()=>{
 it('does not report that calibration passed without an anchor corpus',async()=>{
  mocks.config.mockResolvedValue({config:{anchorSet:[]}});
  expect((await AnchorCalibrationService.runCalibration()).meetsThreshold).toBe(false);
 });
 it('excludes outage placeholders and refuses a partial validation pass',async()=>{
  mocks.config.mockResolvedValue({config:{anchorSet:anchors}});
  mocks.grade.mockResolvedValueOnce({score:.5,scoreSource:'ai_auto'}).mockResolvedValueOnce({score:.5,scoreSource:'ai_unavailable'});
  const result=await AnchorCalibrationService.runCalibration();
  expect(result.scoredItems).toBe(1);expect(result.mae).toBe(0);expect(result.meetsThreshold).toBe(false);
 });
});

it.each(['ai_flagged','rejected_integrity','human'])('excludes %s results rather than treating them as automatic reference evidence',async scoreSource=>{
 mocks.config.mockResolvedValue({config:{anchorSet:anchors}});mocks.grade.mockResolvedValue({score:.5,scoreSource});
 const result=await AnchorCalibrationService.runCalibration();
 expect(result.scoredItems).toBe(0);expect(result.mae).toBeNull();expect(result.meetsThreshold).toBe(false);
 expect(result.excludedItems?.every(item=>item.reasons.includes('UNFINALIZED_AI_SCORE'))).toBe(true);
});
it('rejects human-review holds even if the result source says ai_auto',async()=>{
 mocks.config.mockResolvedValue({config:{anchorSet:anchors}});mocks.grade.mockResolvedValue({score:.5,scoreSource:'ai_auto',requiresHumanReview:true});
 expect((await AnchorCalibrationService.runCalibration()).scoredItems).toBe(0);
});
it('never substitutes a transcript for a missing speaking recording',async()=>{
 mocks.config.mockResolvedValue({config:{anchorSet:[{...anchors[0],skill:'SPEAKING',content:'A synthetic transcript, not audio.'}]}});
 const result=await AnchorCalibrationService.runCalibration();
 expect(result.scoredItems).toBe(0);expect(result.excludedItems?.[0].reasons).toContain('ACTUAL_AUDIO_REQUIRED');
 expect(mocks.text).not.toHaveBeenCalled();expect(mocks.speak).not.toHaveBeenCalled();
});
it('checks rubric and declared expert evidence before spending a model call',async()=>{
 mocks.config.mockResolvedValue({config:{anchorSet:[{...anchors[0],rubric:undefined,raterCount:1,expertQwk:NaN}]}});
 const result=await AnchorCalibrationService.runCalibration();
 expect(result.excludedItems?.[0].reasons).toEqual(expect.arrayContaining(['RUBRIC_MISSING','EXPERT_RATERS_INSUFFICIENT','EXPERT_AGREEMENT_UNVERIFIED']));
 expect(mocks.grade).not.toHaveBeenCalled();
});
it.each([0,-1,1.5,NaN,Infinity,9])('rejects invalid concurrency %s before loading the corpus',async concurrency=>{
 await expect(AnchorCalibrationService.runCalibration(concurrency)).rejects.toThrow('concurrency');expect(mocks.config).not.toHaveBeenCalled();
});
it('does not bless a tiny constant-score corpus and forwards target/rubric',async()=>{
 mocks.config.mockResolvedValue({config:{anchorSet:anchors}});mocks.grade.mockResolvedValue({score:.5,scoreSource:'ai_auto'});
 const result=await AnchorCalibrationService.runCalibration();
 expect(result.mae).toBe(0);expect(result.pearsonR).toBeNull();expect(result.meetsThreshold).toBe(false);
 expect(result.evidenceGaps).toContain('WRITING_ANCHORS_BELOW_30');expect(result.releaseApproved).toBe(false);
 expect(mocks.grade).toHaveBeenCalledWith(anchors[0].content,expect.stringContaining(anchors[0].rubric),'A1');
});
it('rejects all copies of duplicated anchor identities',async()=>{
 mocks.config.mockResolvedValue({config:{anchorSet:[anchors[0],anchors[0]]}});
 const result=await AnchorCalibrationService.runCalibration();expect(result.scoredItems).toBe(0);
 expect(mocks.grade).not.toHaveBeenCalled();expect(result.excludedItems).toHaveLength(2);
});
it('requires valid evidence when adding an anchor before any database mutation',async()=>{
 await expect(AnchorCalibrationService.addAnchorItem({...anchors[0],expertScore:1.5} as any)).rejects.toThrow('INVALID_EXPERT_SCORE');
 expect(mocks.config).not.toHaveBeenCalled();expect(mocks.upsert).not.toHaveBeenCalled();
});
function completeCorpus(){return ['WRITING','SPEAKING'].flatMap(skill=>Array.from({length:30},(_,index)=>({...anchors[0],id:`${skill}-${index}`,skill,
 content:skill==='WRITING'?'Synthetic response':'UklGRmAAAAAAAAAAZm10IAAAAA==',mimeType:skill==='SPEAKING'?'audio/wav':undefined,
 prompt:index%2?'Synthetic high task.':'Synthetic low task.',expertScore:index%2?.8:.2})));}
it('allows a complete varied corpus to meet provisional drift limits without granting release approval',async()=>{
 mocks.config.mockResolvedValue({config:{anchorSet:completeCorpus()}});
 const grade=async(_content:string,...args:any[])=>({score:String(args.find(value=>typeof value==='string'&&value.includes('Synthetic'))).includes('high')?.8:.2,scoreSource:'ai_auto'});
 mocks.grade.mockImplementation(grade);mocks.speak.mockImplementation(grade);
 const result=await AnchorCalibrationService.runCalibration();
 expect(result.scoredItems).toBe(60);expect(result.bySkill?.SPEAKING.n).toBe(30);expect(result.meetsThreshold).toBe(true);
 expect(result.releaseApproved).toBe(false);expect(mocks.text).not.toHaveBeenCalled();
});
it('detects a speaking regression even when pooled error stays below the MAE limit',async()=>{
 mocks.config.mockResolvedValue({config:{anchorSet:completeCorpus()}});
 mocks.grade.mockImplementation(async(_content,prompt)=>({score:prompt.includes('high')?.8:.2,scoreSource:'ai_auto'}));
 mocks.speak.mockImplementation(async(_content,_mime,prompt)=>({score:(prompt.includes('high')?.8:.2)+.1,scoreSource:'ai_auto'}));
 const result=await AnchorCalibrationService.runCalibration();
 expect(result.mae!).toBeLessThan(.08);expect(result.bySkill?.SPEAKING.mae!).toBeGreaterThan(.08);expect(result.meetsThreshold).toBe(false);
});
