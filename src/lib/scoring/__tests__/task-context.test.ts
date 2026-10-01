import {describe,expect,it} from 'vitest';
import {buildScoringPrompt} from '../task-context';
describe('integrated task grading context',()=>{
 it.each(['passage','transcript','script'])('provides the %s to the grader without relying on candidate claims',key=>{
  expect(buildScoringPrompt({prompt:'Summarise the source.',[key]:'The meeting was postponed until Friday.'})).toContain('The meeting was postponed until Friday.');
 });
});
