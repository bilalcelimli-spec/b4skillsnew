import { expect, it } from 'vitest';
import { buildQualityBlock, textBoundKeyRules } from '../src/lib/content-factory/generation-guidelines';

it('adds text-bound key rules to reading/listening MCQ prompts only', () => {
  expect(buildQualityBlock('LISTENING', 'C1', 'MULTIPLE_CHOICE')).toContain('TEXT-BOUND KEY RULES');
  expect(buildQualityBlock('READING', 'A1', 'MULTIPLE_CHOICE')).toContain('commonSenseOption');
  expect(buildQualityBlock('READING', 'B2', 'DRAG_DROP')).not.toContain('TEXT-BOUND KEY RULES');
  expect(buildQualityBlock('GRAMMAR', 'B2', 'MULTIPLE_CHOICE')).not.toContain('TEXT-BOUND KEY RULES');
});
it('asks for non-obvious stances at B2+ and concrete details below', () => {
  expect(textBoundKeyRules('LISTENING', 'C1')).toMatch(/non-obvious position/);
  expect(textBoundKeyRules('READING', 'A2')).toMatch(/concrete, arbitrary details/);
  expect(textBoundKeyRules('LISTENING', 'A1')).toContain('recording');
});
