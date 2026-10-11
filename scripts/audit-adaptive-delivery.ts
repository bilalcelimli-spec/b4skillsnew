/** Read-only bank audit; simulations record exposure in local memory only. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
import { PRODUCT_LINE_PROFILES } from '../src/lib/product-lines/profiles.js';
import { adaptiveItemWhere, sectionAbility } from '../src/lib/assessment-engine/adaptive-policy.js';
import { AssessmentEngine } from '../src/lib/assessment-engine/engine.js';
import type { Item, SessionState, SkillType } from '../src/lib/assessment-engine/types.js';

// Never connect to deployment exposure storage or modify live counters in an audit.
delete process.env.REDIS_URL;
const { CATSelector } = await import('../src/lib/selection/cat-selector.js');
const db = new PrismaClient();
async function main() {
  const comparisons: unknown[] = [], gaps: unknown[] = [], missingLevels: unknown[] = [];
  for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
    for (const skill of profile.sectionOrder) {
      const rows = await db.item.findMany({ where: adaptiveItemWhere(profile, skill) });
      const allowedLevels = (adaptiveItemWhere(profile, skill).cefrLevel as {in: string[]}).in;
      for (const level of allowedLevels) if (!rows.some(row => row.cefrLevel === level))
        missingLevels.push({ profile: profile.name, skill, level });
      const pool: Item[] = rows.map(row => ({ id: row.id, skill: row.skill as SkillType, type: row.type,
        status: 'ACTIVE', params: { a: row.discrimination, b: row.difficulty, c: row.guessing },
        metadata: row.content as Record<string, any>, iqScore: row.iqScore }));
      if (pool.length < profile.sectionConfig[skill].minItems) gaps.push({ profile: profile.name, skill,
        count: pool.length, required: profile.sectionConfig[skill].minItems });
      const items = Object.fromEntries(pool.map(item => [item.id, item]));
      const traces: { pattern: string; theta: number; sem: number; difficulties: number[] }[] = [];
      for (const correct of [true, false]) {
        const engine = new AssessmentEngine({ minItems: 1, maxItems: 20, semThreshold: .3,
          startingTheta: 0, startingSem: 1, pretestRatio: 0, useGrmProductive: true });
        let state: SessionState = engine.initializeSession();
        const administered: Item[] = [], difficulties: number[] = [];
        for (let n = 0; n < Math.min(8, profile.sectionConfig[skill].maxItems, pool.length); n++) {
          const next = await new CATSelector(profile).selectNext(pool.filter(item => !state.usedItemIds.has(item.id)),
            { ...state, ...sectionAbility(state, skill) },
            { administeredItems: administered, responses: state.responses, plannedTotal: profile.globalMaxItems, profile });
          if (!next) throw new Error(`Unexpected empty selection: ${profile.name}/${skill}`);
          if (state.usedItemIds.has(next.item.id)) throw new Error('Repeated question');
          administered.push(next.item); difficulties.push(next.item.params.b);
          state = engine.processResponse(state, { itemId: next.item.id, score: correct ? 1 : 0, latencyMs: 10000 }, items);
          if (!Number.isFinite(state.theta) || !Number.isFinite(state.sem)) throw new Error('Non-finite ability');
        }
        traces.push({ pattern: correct ? 'all_correct' : 'all_wrong', theta: state.theta, sem: state.sem, difficulties });
      }
      const meanLast = (values: number[]) => values.length ? values.slice(-3).reduce((sum, b) => sum + b, 0) / Math.min(3, values.length) : null;
      comparisons.push({ profile: profile.name, skill, eligibleItems: pool.length,
        correctFinalDifficulty: meanLast(traces[0].difficulties), wrongFinalDifficulty: meanLast(traces[1].difficulties), traces });
    }
  }
  const report = { generatedAt: new Date().toISOString(), mode: 'read_only_memory_simulation', gaps, missingLevels, comparisons,
    limitations: ['Response traces verify software behavior, not empirical item calibration or CEFR validity.',
      'All-correct/all-wrong productive scores are simulated completed grades, not AI grading tests.',
      'Fixed diagnostic and Özgün Placement intentionally use fixed forms.'] };
  const target = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length);
  if (target) writeFileSync(target, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
}
main().catch(() => { console.error('Adaptive bank audit failed; no database writes were attempted.'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
