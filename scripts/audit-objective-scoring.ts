/** Read-only: verifies real server scoring keys against every objective bank item. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { scoreObjectiveResponse } from '../src/lib/assessment-engine/objective-response.js';
import { shuffleMcqOptions } from '../src/lib/assessment-engine/mcq-options.js';
import { productiveModes } from '../src/lib/assessment-engine/productive-response.js';
import type { Item, SkillType } from '../src/lib/assessment-engine/types.js';
const db = new PrismaClient();
async function main() {
  let cursor: string | undefined, checked = 0, productive = 0;
  const failures: { itemId: string; status: string; itemCode: string | null; type: string; error: string }[] = [];
  for (;;) {
    const rows = await db.item.findMany({ where: { status: { in: ['ACTIVE', 'PRETEST'] } },
      orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!rows.length) break;
    for (const row of rows) {
      const content = row.content as Record<string, any>;
      if (productiveModes(row.skill, row.type, content).length) { productive++; continue; }
      const item: Item = { id: row.id, type: row.type, skill: row.skill as SkillType,
        params: { a: row.discrimination, b: row.difficulty, c: row.guessing }, metadata: content };
      try {
        for (const sessionId of ['audit-one', 'audit-two', 'audit-three']) {
          if (Array.isArray(content.options) && content.options.length) {
            const options = shuffleMcqOptions(content.options, content.correctAnswer, sessionId, row.id)?.shuffledOptions ?? content.options;
            const expected = options.findIndex((option: any) => option?.isCorrect === true);
            if (expected < 0) throw new Error('No independently marked answer for comparison');
            for (let n = 0; n < options.length; n++) {
              if (scoreObjectiveResponse(item, sessionId, String.fromCharCode(65 + n)) !== (n === expected ? 1 : 0))
                throw new Error('Rendered option and scored key disagree');
            }
          } else if (row.type === 'FILL_IN_BLANKS' && Array.isArray(content.blanks)) {
            const answer = content.blanks.map((blank: any) => blank.acceptableAnswers?.[0] ?? '').join('|');
            if (scoreObjectiveResponse(item, sessionId, answer) !== 1) throw new Error('Accepted blank answers rejected');
            const wrong = content.blanks.map(() => '__invalid_answer__').join('|');
            if (scoreObjectiveResponse(item, sessionId, wrong) !== 0) throw new Error('Invalid blank answers accepted');
          } else if (row.type === 'FILL_IN_BLANKS' && typeof content.correctAnswer === 'string') {
            const answer = content.correctAnswer;
            if (scoreObjectiveResponse(item, sessionId, answer) !== 1) throw new Error('Legacy blank answer rejected');
            const wrong = answer.split('|').map(() => '__invalid_answer__').join('|');
            if (scoreObjectiveResponse(item, sessionId, wrong) !== 0) throw new Error('Invalid legacy blanks accepted');
          } else if (row.type === 'DRAG_DROP') {
            const answer = content.correctMapping ? { kind: 'matching', mapping: content.correctMapping }
              : content.correctOrder ? { kind: 'ordering', order: content.correctOrder }
              : content.correctAnswers ? { kind: 'selection', selected: content.correctAnswers }
              : { kind: 'placement', placements: content.correctSequence.map((word: string) => (content.draggableItems ?? content.wordBank).indexOf(word)) };
            if (scoreObjectiveResponse(item, sessionId, answer) !== 1) throw new Error('Correct structured answer rejected');
          } else throw new Error('Objective format not covered by audit');
        }
        checked++;
      } catch (error) { failures.push({ itemId: row.id, status: row.status, itemCode: row.itemCode, type: row.type, error: (error as Error).message }); }
    }
    cursor = rows.at(-1)!.id;
    if (rows.length < 100) break;
  }
  console.log(JSON.stringify({ checkedObjectiveItems: checked, productiveItemsRequiringRubricScoring: productive, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}
main().catch(() => { console.error('Scoring audit failed; no database writes were attempted.'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
