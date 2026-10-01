import { getCanDo, type CefrLevel, type SkillDomain } from '../cefr/cefr-framework.js';
import type { ReportSkill } from './assessment-report-model.js';

export const CEFR_GUIDE_SOURCE = 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions';
const levels: CefrLevel[] = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
// Brief platform paraphrases of linguistic competence, not separate CEFR
// communication scales or an inference about errors in this candidate's answers.
const grammar: Record<CefrLevel, string> = {
  PRE_A1: 'Recognises a few rehearsed sentence patterns; wider control is not established.',
  A1: 'Uses a small set of learned structures with limited control.',
  A2: 'Uses basic patterns; systematic errors remain common.',
  B1: 'Controls familiar patterns reasonably well; errors remain in more complex expression.',
  B2: 'Shows good grammatical control; occasional slips usually preserve meaning.',
  C1: 'Maintains high accuracy across varied, complex expression.',
  C2: 'Sustains control of complex language even while managing demanding communication.',
};
const vocabulary: Record<CefrLevel, string> = {
  PRE_A1: 'Recognises a few personally relevant words; wider range is not established.',
  A1: 'Uses basic words and phrases for concrete needs.',
  A2: 'Has sufficient everyday vocabulary for routine exchanges.',
  B1: 'Handles familiar topics, sometimes explaining around missing words.',
  B2: 'Has broad vocabulary for general topics; occasional word-choice errors remain.',
  C1: 'Uses a wide repertoire with flexible phrasing and generally accurate choice.',
  C2: 'Uses nuanced, idiomatic vocabulary with strong precision.',
};
const introductory: Partial<Record<ReportSkill, string>> = {
  READING: 'Start with familiar labels, names and words supported by pictures.',
  LISTENING: 'Start with familiar words spoken slowly with repetition and visual support.',
  WRITING: 'Start with copying familiar words and entering basic personal details.',
  SPEAKING: 'Start with rehearsed words and short phrases about personal details.',
};

function capabilities(skill: ReportSkill, level: CefrLevel): string[] {
  if (skill === 'GRAMMAR') return [grammar[level]];
  if (skill === 'VOCABULARY') return [vocabulary[level]];
  if (level === 'PRE_A1') return [introductory[skill]!];
  // Keep written production distinct from oral fluency, and avoid using
  // native-speaker identity as the criterion for communicative proficiency.
  if (skill === 'WRITING' && level === 'C1') return [
    'Can write clear, well-organised texts on complex topics, developing a position with reasons and examples.',
    'Can choose an appropriate style for the reader and connect ideas into a coherent, structured text.',
  ];
  if (skill === 'SPEAKING' && level === 'B2') return [
    'Can sustain spontaneous, fluent interaction without undue effort for either participant.',
    'Can give clear, detailed descriptions and explain viewpoints on familiar areas of interest.',
  ];
  if (skill === 'LISTENING' && level === 'C2') return [
    'Can follow highly proficient speakers at natural speed, allowing time to adjust to unfamiliar accents.',
    'Can understand complex spoken material and distinguish subtle implications and attitudes.',
  ];
  if (skill === 'READING' && level === 'C2') return [
    'Can understand virtually every form of written language, including abstract and structurally complex texts.',
    'Can interpret dense, conceptually demanding writing, including subtle style and meaning.',
  ];
  return getCanDo(level, skill.toLowerCase() as SkillDomain).flatMap(d => d.descriptors).slice(0, 2);
}

export function skillLevelGuide(skill: ReportSkill, level: CefrLevel | null) {
  if (!level) return { capabilities: [], nextLevel: null, nextFocus: 'A scored skill result is needed before giving level-specific guidance.' };
  const next = levels[levels.indexOf(level) + 1] ?? null;
  return {
    capabilities: capabilities(skill, level), nextLevel: next,
    nextFocus: next ? capabilities(skill, next)[0] : 'Maintain precision and flexibility across unfamiliar, demanding contexts.',
  };
}
