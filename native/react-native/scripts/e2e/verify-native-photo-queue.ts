import path from 'node:path';
// Inspect only this run's synthetic native queue fixtures; never launch a session.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { downloadPrivateObject } from '../../../../src/lib/storage/private-storage';
if (process.env.B4SKILLS_API_VALIDATION_MODE !== 'true') throw Error('Private QA runtime required');
const platform = process.argv[2], phase = process.argv[3];
assert.ok(['macos', 'ipad'].includes(platform)); assert.ok(['before', 'after'].includes(phase));
const file = path.join(path.resolve(process.cwd(), 'build/realdb-validation'), `${platform}-native-photo-queue-proof.json`);
const p = JSON.parse(fs.readFileSync(file, 'utf8')), db = new PrismaClient();
async function main() { try {
  const session = await db.session.findUniqueOrThrow({ where: { id: p.sessionId }, select: { organizationId: true, candidateId: true } });
  assert.equal(session.organizationId, 'cmvlj3ynd0000uvuo9q6p5urh'); assert.equal(session.candidateId, p.uid);
  const id = `evidence_${p.evidenceId.toLowerCase()}`;
  if (phase === 'before') { assert.equal(await db.proctoringEvent.count({ where: { id } }), 0); p.noServerRowBeforeRestart = true; }
  else {
    const row = await db.proctoringEvent.findUniqueOrThrow({ where: { id } });
    assert.equal(row.type, 'SCREENSHOT'); assert.equal(row.sessionId, p.sessionId);
    assert.equal(await db.proctoringEvent.count({ where: { id } }), 1);
    const metadata = row.metadata as any;
    assert.equal(metadata.nativeCamera.platform, platform);
    assert.equal(metadata.reference.key, `native/${p.sessionId}/${p.evidenceId.toLowerCase()}.jpg`);
    const stored = await downloadPrivateObject(metadata.reference);
    assert.ok(stored.bytes.length > 0); assert.equal(stored.contentType, 'image/jpeg');
    p.oneServerEventAfterRestart = true; p.privateObjectVerified = true; p.type = row.type; p.deliveredAt = new Date().toISOString();
  }
  fs.writeFileSync(file, JSON.stringify(p, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ platform, phase, evidenceId: p.evidenceId, nativeCiphertextBytes: p.ciphertextBytes, noServerRowBeforeRestart: p.noServerRowBeforeRestart, oneServerEventAfterRestart: p.oneServerEventAfterRestart, privateObjectVerified: p.privateObjectVerified }));
} finally { await db.$disconnect(); } }
main().catch(error => { console.error(error.message); process.exitCode = 1; });
