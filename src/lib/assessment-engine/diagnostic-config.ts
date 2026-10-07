export const SKILLS = ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY'] as const;
export type Skill = typeof SKILLS[number];
export const DIAGNOSTIC_ITEMS_PER_SKILL = 5;
export const DIAGNOSTIC_TOTAL_ITEMS = SKILLS.length * DIAGNOSTIC_ITEMS_PER_SKILL;
export const DIAGNOSTIC_WALL_CLOCK_MS = 45 * 60 * 1000;
