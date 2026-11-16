import { describe, expect, it } from 'vitest';
import { ADULT_SETTINGS, DIVERSE_NAMES, TEEN_SETTINGS, ageContextViolations, rotatePick, settingsFor, teenRules } from '../src/lib/content-factory/age-context';

describe('age-context gate', () => {
  it('flags university and workplace settings in TEEN drafts', () => {
    const content = { ttsScript: 'Kenji: My professor said the lecture moved.\nSofia: Ask your colleagues.', options: ['A', 'B'] };
    expect(ageContextViolations(content, 'TEEN')).toEqual(['professor', 'colleagues']);
  });
  it('reads options, matching pairs and extra items too', () => {
    expect(ageContextViolations({ pairs: [{ zone: 'Paragraph 1', answer: 'Paying back the loan' }], extraItems: ['A pub quiz'] }, 'TEEN'))
      .toEqual(['loan', 'pub']);
  });
  it('leaves teen-safe text and adult cells alone', () => {
    expect(ageContextViolations({ passage: 'The school team met at the post office before the match.' }, 'TEEN')).toEqual([]);
    expect(ageContextViolations({ passage: 'The university lecturer gave a talk.' }, 'ADULT')).toEqual([]);
    expect(ageContextViolations({ passage: 'The university lecturer gave a talk.' }, undefined)).toEqual([]);
  });
  it('is stricter for young learners', () => {
    const content = { passage: 'Mia posted it on social media after the accident.' };
    expect(ageContextViolations(content, 'TEEN')).toEqual([]);
    expect(ageContextViolations(content, 'YOUNG_LEARNER')).toEqual(['social media', 'accident']);
  });
});

describe('name and setting rotation', () => {
  it('starts different cells at different places and never repeats within the list length', () => {
    const a = rotatePick(DIVERSE_NAMES, 6, 'names|READING|B2|inference', 0);
    const b = rotatePick(DIVERSE_NAMES, 6, 'names|LISTENING|A1|detail', 0);
    expect(a).not.toEqual(b);
    const run = [0, 1, 2, 3].flatMap((i) => rotatePick(DIVERSE_NAMES, 6, 'names|READING|B2|inference', i));
    expect(new Set(run).size).toBe(24);
  });
  it('is deterministic for the same key and batch', () => {
    expect(rotatePick(TEEN_SETTINGS, 3, 'k', 2)).toEqual(rotatePick(TEEN_SETTINGS, 3, 'k', 2));
  });
  it('gives TEEN cells teen settings only', () => {
    expect(settingsFor('TEEN')).toBe(TEEN_SETTINGS);
    expect(settingsFor('ADULT')).toBe(ADULT_SETTINGS);
    for (const s of TEEN_SETTINGS) expect(ageContextViolations({ passage: s }, 'TEEN')).toEqual([]);
    expect(TEEN_SETTINGS.join(' ')).not.toMatch(/universit|research institute|start-up|coworking/);
  });
  it('teen rules carry the cell age range', () => {
    expect(teenRules([11, 14])).toContain('11-14 years old');
  });
});

import { PRODUCT_SETTINGS, UNIVERSAL_SETTINGS, unanchoredNames } from '../src/lib/content-factory/age-context';
describe('product settings and name anchoring', () => {
  it('keeps Corporate and Academia drafts in their own settings', () => {
    expect(settingsFor('ADULT', 'corporate')).toBe(PRODUCT_SETTINGS.corporate);
    expect(settingsFor('ADULT', 'academia')).toBe(PRODUCT_SETTINGS.academia);
    expect(settingsFor('UNIVERSAL', 'language-schools')).toBe(UNIVERSAL_SETTINGS);
    expect(settingsFor('TEEN', 'junior')).toBe(TEEN_SETTINGS);
  });
  it('flags a name the question relies on but the text never mentions', () => {
    expect(unanchoredNames({ ttsScript: 'Alright everyone, settle down.', question: 'According to Jonas, what is new?' })).toEqual(['Jonas']);
    expect(unanchoredNames({ passage: 'Hi Luca, see you at 3.', question: 'When will Ines meet Luca?', options: ['At 3'] })).toEqual(['Ines']);
    expect(unanchoredNames({ passage: 'Hi Luca, Ines here.', question: 'When will Ines meet Luca?' })).toEqual([]);
    expect(unanchoredNames({ question: 'Choose the correct form: Jonas ___ late.' })).toEqual([]);
  });
});

describe("NAME_GENDER", () => {
  it("covers every generator name", async () => {
    const { DIVERSE_NAMES, NAME_GENDER } = await import("../src/lib/content-factory/age-context");
    expect(DIVERSE_NAMES.filter((n) => !NAME_GENDER[n])).toEqual([]);
  });
});
