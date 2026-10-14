import {describe,expect,it} from 'vitest';
import {buildScoringPrompt} from '../task-context';
describe('integrated task grading context',()=>{
 it.each(['passage','transcript','script'])('provides the %s to the grader without relying on candidate claims',key=>{
  expect(buildScoringPrompt({prompt:'Summarise the source.',[key]:'The meeting was postponed until Friday.'})).toContain('The meeting was postponed until Friday.');
 });
});

import { scoringTargetCefr, TASK_CONTEXT_VERSION } from '../task-context';
import { requiresArgumentStructure } from '../writing-task-policy';
it('includes authored rubric and task demands without leaking answer keys', () => {
 const prompt = buildScoringPrompt({prompt:'Write a thank-you note.',taskType:'personal_message',ageGroup:'7-10',minWords:15,
  rubric:{taskAchievement:{descriptor:'Thank the recipient and mention the gift.'}},correctAnswer:'SECRET_KEY',sampleAnswer:'PRIVATE_SAMPLE'});
 expect(prompt).toContain('Thank the recipient and mention the gift.');
 expect(prompt).toContain(TASK_CONTEXT_VERSION); expect(prompt).toContain('personal_message');
 expect(prompt).toContain('7-10'); expect(prompt).not.toContain('SECRET_KEY'); expect(prompt).not.toContain('PRIVATE_SAMPLE');
});
it('never invents a target CEFR level', () => {
 for (const value of [undefined,null,'B9','beginner',1]) expect(scoringTargetCefr(value)).toBeUndefined();
 expect(scoringTargetCefr('A1')).toBe('A1'); expect(scoringTargetCefr('PRE_A1')).toBe('PRE_A1');
});
it('does not let source or generic rubric text turn personal notes into argumentative tasks', () => {
 const prompt = buildScoringPrompt({prompt:'Write a thank-you note.',passage:'We discussed advantages and disadvantages.',rubric:'Do not require an argumentative essay.'});
 expect(requiresArgumentStructure(prompt)).toBe(false);
});
it('does not silently truncate oversized rubrics into different criteria', () => {
 const prompt = buildScoringPrompt({prompt:'Describe your room.',rubric:'X'.repeat(8001)});
 expect(prompt).not.toContain('Author-specified task rubric');
});

import { promptParrotRate } from '../response-integrity';
it('does not count hidden rubric language as candidate copying', () => {
 const answer = 'My favourite food is a fresh bowl of warm tomato soup with bread.';
 const prompt = buildScoringPrompt({prompt:'Describe a meal.',rubric:{example:answer}});
 expect(promptParrotRate(answer,prompt)).toBe(0);
 expect(promptParrotRate(answer,answer)).toBe(1);
});
it('delivers detailed criteria and explicit word range rather than only a generic note', () => {
 const prompt=buildScoringPrompt({prompt:'Write a note.',rubric:'General language use.',wordRange:{min:20,max:50},
  scoringRubric:[{name:'Task',maxScore:2,descriptor:'Thank the recipient.'}]});
 expect(prompt).toContain('Thank the recipient.');expect(prompt).toContain('General language use.');
 expect(prompt).toContain('minWords: 20');expect(prompt).toContain('maxWords: 50');
 expect(prompt).not.toContain('undefined');
});
