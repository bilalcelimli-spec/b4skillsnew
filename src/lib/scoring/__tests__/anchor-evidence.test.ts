import {expect,it} from 'vitest';
import {anchorEvidenceIssues,finalAnchorScore} from '../anchor-evidence';
const item={id:'fixture',skill:'WRITING',content:'Synthetic response',prompt:'Synthetic task',cefrLevel:'A1',rubric:'Task achievement',expertScore:.2,raterCount:2,expertQwk:.9};
it('accepts structurally valid declared references without asserting independent expert proof',()=>expect(anchorEvidenceIssues(item)).toEqual([]));
it.each([NaN,Infinity,-.1,1.1])('rejects invalid expert grade %s',expertScore=>expect(anchorEvidenceIssues({...item,expertScore})).toContain('INVALID_EXPERT_SCORE'));
it.each([NaN,Infinity,-.1,1.1])('does not accept invalid normalized AI grades %s',score=>expect(finalAnchorScore({score,scoreSource:'ai_auto'})).toBeNull());
it('preserves genuine final zero grades and excludes human-review or provider placeholders',()=>{
 expect(finalAnchorScore({score:0,scoreSource:'ai_auto'})).toBe(0);
 expect(finalAnchorScore({score:.5,scoreSource:'ai_unavailable'})).toBeNull();
 expect(finalAnchorScore({score:.5,scoreSource:'ai_auto',requiresHumanReview:true})).toBeNull();
});
it('requires recording format evidence and never treats transcript text as audio',()=>{
 expect(anchorEvidenceIssues({...item,skill:'SPEAKING',mimeType:'audio/wav'})).toContain('ACTUAL_AUDIO_REQUIRED');
 expect(anchorEvidenceIssues({...item,skill:'SPEAKING',mimeType:'text/plain',content:'YWJj'.repeat(10)})).toContain('ACTUAL_AUDIO_REQUIRED');
});
