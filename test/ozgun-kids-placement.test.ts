import {describe,expect,it} from 'vitest';
import {scoreFixedForm,type FixedAnswers} from '../src/lib/fixed-forms/ozgun-kids';
import {OZGUN_ANSWER_KEY} from '../src/lib/fixed-forms/ozgun-kids-key.server';

function answerCounts(counts:number[][]) {
  const answers:FixedAnswers={};
  counts.forEach((skills,level)=>skills.forEach((correct,skill)=>{
    for(let offset=0;offset<correct;offset++){
      const number=skill*24+level*4+offset+1;
      answers[String(number)]=OZGUN_ANSWER_KEY[number-1] as 'A'|'B'|'C'|'D';
    }
  }));
  return scoreFixedForm(answers,OZGUN_ANSWER_KEY,true);
}
function totalScore(total:number) {
  return scoreFixedForm(Object.fromEntries([...OZGUN_ANSWER_KEY].slice(0,total).map((answer,index)=>[String(index+1),answer])) as FixedAnswers,OZGUN_ANSWER_KEY,true);
}
describe('user-supplied provisional Özgün course and evidence rules',()=>{
  it('matches all 96 answers supplied in the four-column key',()=>{
    expect(OZGUN_ANSWER_KEY).toBe([
      'BDACACDBCABDBDCADBACCADB',
      'DACBBDACACDBCBADADBCDCBA',
      'BCADDBCACADBADBCDCABBACD',
      'CADBADBCDBCABCADCDBAABDC',
    ].join(''));
  });
  it.each([[0,'A1'],[23,'A1'],[24,'A2'],[39,'A2'],[40,'B1'],[55,'B1'],[56,'B2'],[71,'B2'],[72,'C1'],[85,'C1'],[86,'C2'],[96,'C2']] as const)('suggests only a provisional course at %i/96', (score,target)=>{
    const report=totalScore(score);
    expect(report.placement.recommendation.target).toBe(target);
    expect(report.placement).toMatchObject({provisional:true,validatedCefr:false,automaticPlacement:false,humanReviewRequired:true});
    expect(report).toMatchObject({cefrLevel:null,certificateAvailable:false});
  });
  it('implements the supplied 60/96 example with strong A1–B1 and partial B2 evidence',()=>{
    const report=answerCounts([[4,4,4,4],[4,4,4,4],[4,4,4,4],[2,2,2,2],[1,1,1,1],[0,0,0,0]]);
    expect(report.correct).toBe(60);
    expect(report.placement.recommendation.label).toBe('B2 kur adayı');
    expect(report.placement.clusters.map(cluster=>cluster.status)).toEqual(['strong','strong','strong','partial','insufficient','insufficient']);
    expect(report.placement.missingPrerequisites).toEqual([]);
    expect(report.placement.checks.map(check=>check.code)).toEqual(['two-week-follow-up']);
  });
  it('uses exactly four questions per skill per target cluster, and detects 12/16 imbalance',()=>{
    const report=answerCounts([[4,4,4,0],[2,2,2,2],[1,1,1,1],[3,3,3,3],[4,3,3,2],[4,4,4,4]]);
    const clusters=report.placement.clusters;
    expect(clusters.map(cluster=>cluster.status)).toEqual(['unbalanced','partial','insufficient','strong','strong','strong']);
    expect(clusters[0].skills.map(skill=>[skill.first,skill.last])).toEqual([[1,4],[25,28],[49,52],[73,76]]);
    expect(clusters[5].skills.map(skill=>[skill.first,skill.last])).toEqual([[21,24],[45,48],[69,72],[93,96]]);
    expect(clusters.every(cluster=>cluster.total===16)).toBe(true);
    expect(report.placement.checks.map(check=>check.code)).toContain('unbalanced-clusters');
  });
  it('requires additional evidence when the total and prerequisite clusters disagree',()=>{
    const report=answerCounts([[2,2,2,2],[4,4,4,4],[4,4,4,4],[4,4,4,4],[1,1,1,1],[0,0,0,0]]);
    expect(report.correct).toBe(60);
    expect(report.placement.missingPrerequisites).toEqual(['A1']);
    expect(report.placement.checks.map(check=>check.code)).toEqual(expect.arrayContaining(['cluster-mismatch','a1-review']));
    expect(report.placement.checks.find(check=>check.code==='a1-review')?.message).toContain('“A1 altı” kararı vermeyin');
  });
  it.each([24,40,56,72,86])('flags the four integer scores around the %i boundary',boundary=>{
    for(const score of [boundary-2,boundary-1,boundary,boundary+1])expect(totalScore(score).placement.checks.map(check=>check.code)).toContain('near-boundary');
    for(const score of [boundary-3,boundary+2])expect(totalScore(score).placement.checks.map(check=>check.code)).not.toContain('near-boundary');
  });
  it('flags a six-point section gap, but not a five-point gap',()=>{
    const six=answerCounts([[4,0,0,0],[2,0,0,0]]),five=answerCounts([[4,0,0,0],[1,0,0,0]]);
    expect(six.placement.checks.map(check=>check.code)).toContain('section-gap');
    expect(five.placement.checks.map(check=>check.code)).not.toContain('section-gap');
  });
  it.each([72,86,96])('requires productive and comprehensive assessment at %i/96',score=>{
    expect(totalScore(score).placement.checks.find(check=>check.code==='advanced-assessment')?.message).toContain('yazma');
    expect(totalScore(score).placement.checks.map(check=>check.code)).toContain('two-week-follow-up');
  });
  it('retains an explicit review hold for attempts with an unconfirmed key',()=>{
    expect(scoreFixedForm({},OZGUN_ANSWER_KEY,false).placement.checks[0].code).toBe('unconfirmed-key');
  });
});
