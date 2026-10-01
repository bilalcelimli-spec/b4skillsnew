import { describe, expect, it } from 'vitest';
import { REPORT_SKILLS } from '../src/lib/reporting/assessment-report-model';
import { skillLevelGuide } from '../src/lib/reporting/skill-level-guide';
import type { CefrLevel } from '../src/lib/cefr/cefr-framework';

describe('CEFR skill interpretation', () => {
  it.each(['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CefrLevel[])('covers all six constructs at %s without borrowing the overall level', level => {
    for (const skill of REPORT_SKILLS) {
      const guide = skillLevelGuide(skill, level);
      expect(guide.capabilities.length).toBeGreaterThan(0);
      expect(guide.capabilities.join(' ')).not.toContain('undefined');
      expect(guide.capabilities.join(' ')).not.toContain('native');
      expect(guide.nextFocus.length).toBeGreaterThan(20);
      expect(guide.nextLevel === null).toBe(level === 'C2');
    }
  });
  it('describes the actual skill band, not just the overall CEFR band', () => {
    expect(skillLevelGuide('LISTENING', 'A2').capabilities.join(' ')).toContain('short, clear messages');
    expect(skillLevelGuide('READING', 'B1').capabilities.join(' ')).toContain('job-related language');
    expect(skillLevelGuide('GRAMMAR', 'B2').capabilities.join(' ')).toContain('good grammatical control');
  });
  it('does not assign A1 descriptors to Pre-A1', () => {
    expect(skillLevelGuide('READING', 'PRE_A1').capabilities).not.toEqual(skillLevelGuide('READING', 'A1').capabilities);
  });
  it('leaves unmeasured skills without capability claims or a target band', () => {
    expect(skillLevelGuide('SPEAKING', null)).toMatchObject({ capabilities: [], nextLevel: null });
  });
});
