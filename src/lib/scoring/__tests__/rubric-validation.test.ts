import { expect, it } from 'vitest';
import { rubricReviewReasons } from '../rubric-validation';
it.each([undefined,null,'  '])('holds missing rubrics: %s', rubric => expect(rubricReviewReasons(rubric)).toEqual(['RUBRIC_MISSING']));
it.each([false,42,[],{}, {criteria:[]}, {criteria:['Task', '']}, {grammar:25}, {minWords:10,scale:'0-4'}])('holds malformed criteria: %j', rubric => expect(rubricReviewReasons(rubric)).toEqual(['RUBRIC_INVALID']));
it.each(['Task achievement and language control', {criteria:['Task achievement','Grammar'],scale:'0-4'},
 {taskAchievement:{name:'Task',descriptor:'Addresses the prompt.'},languageControl:{descriptor:'Uses appropriate language.'}},
 {task:'Thank the recipient.'}, {grammar:{descriptor:'Language control',weight:1},task:{descriptor:'Task achievement',weight:1}}])('supports existing rubric formats: %j', rubric => expect(rubricReviewReasons(rubric)).toEqual([]));
it.each([{grammar:{descriptor:'Grammar',weight:-1}}, {grammar:{descriptor:'Grammar',weight:0}},
 {grammar:{descriptor:'Grammar',weight:'100'}}, {grammar:{descriptor:'Grammar',weight:Infinity}},
 {grammar:{descriptor:'Grammar',weight:1},task:{descriptor:'Task'}}, {criteria:['Task'],weights:[]},
 {criteria:['Task'],weights:{Task:NaN}}])('holds invalid criterion weights: %j', rubric => expect(rubricReviewReasons(rubric)).toEqual(['RUBRIC_INVALID_WEIGHT']));
it('rejects oversized and nonserializable criteria without truncating', () => {
 expect(rubricReviewReasons('X'.repeat(8001))).toEqual(['RUBRIC_TOO_LARGE']);
 const rubric:any = {};rubric.task=rubric;
 expect(rubricReviewReasons(rubric)).toEqual(['RUBRIC_INVALID']);
});
it('requires named weights to match criterion names and allows positive relative weights', () => {
 expect(rubricReviewReasons({grammar:'Accuracy',task:'Task achievement',weights:{spelling:1,task:1}})).toEqual(['RUBRIC_INVALID_WEIGHT']);
 expect(rubricReviewReasons({grammar:'Accuracy',task:'Task achievement',weights:{grammar:1,task:2}})).toEqual([]);
});

import { resolveTaskRubric } from '../rubric-validation';
it('uses detailed authored criteria instead of a generic rubric note without mutating content', () => {
 const content={rubric:'General language use.',scoringRubric:[{name:'Task achievement',maxScore:2,descriptor:'Thank the recipient.'}]};
 expect(resolveTaskRubric(content)).toEqual({criteria:content.scoringRubric});
 expect(rubricReviewReasons(resolveTaskRubric(content))).toEqual([]);
 expect(content.rubric).toBe('General language use.');
});
it('does not mask broken detailed rubrics behind a valid generic note', () => {
 expect(rubricReviewReasons(resolveTaskRubric({rubric:'Generic note.',scoringRubric:[]}))).toEqual(['RUBRIC_INVALID']);
 expect(rubricReviewReasons(resolveTaskRubric({rubric:'Generic note.',scoringRubric:[{name:'Task',maxScore:-2}]}))).toEqual(['RUBRIC_INVALID']);
});
