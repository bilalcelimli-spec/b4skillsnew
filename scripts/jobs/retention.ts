import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { runRetentionSweep, type RetentionCursors } from '../../src/lib/compliance/retention-sweep.js';
const apply = process.argv.includes('--apply');
if (apply && process.env.RETENTION_APPLY_ENABLED !== 'true') throw Error('RETENTION_APPLY_ENABLED must be true for application');
const db = new PrismaClient();
try {
  let cursors: RetentionCursors = {}, finished = false;
  for (let page = 0; page < 100; page++) {
    const result = await runRetentionSweep(db, { apply, cursors });
    console.log(JSON.stringify(result));
    if (result.errors || result.storage.failed) process.exitCode = 1;
    if (Object.values(result.next).every(value => value === '__done__')) { finished = true; if (apply && result.storage.pending) process.exitCode = 1; break; }
    // A finished category stays past its last cursor on later pages (handled in the service).
    cursors = { ...cursors, ...result.next };
  }
  if (!finished) { console.error('Retention page budget exceeded; resume with reported cursors'); process.exitCode = 1; }
} finally { await db.$disconnect(); }
