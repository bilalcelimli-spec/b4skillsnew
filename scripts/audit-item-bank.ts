/**
 * audit-item-bank.ts — Production DB audit (read-only)
 * Verilen blueprint hedeflerine karşı gerçek item bank durumunu raporlar.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("\n📊 b4skills Item Bank Audit\n");

  const total = await prisma.item.count();
  const anchors = await prisma.item.count({ where: { isAnchor: true } });
  const integrated = await prisma.item.count({ where: { type: "INTEGRATED_TASK" } });
  const audioAssets = await prisma.asset.count({ where: { type: "AUDIO" } });

  console.log(`── Genel ────────────────────────────`);
  console.log(`Toplam item:              ${total}`);
  console.log(`Anchor items:             ${anchors}`);
  console.log(`Integrated tasks:         ${integrated}`);
  console.log(`Audio assets:             ${audioAssets}`);

  const byStatus = await prisma.$queryRaw<Array<{ status: string; count: number }>>`
    SELECT status::text, COUNT(*)::int as count FROM "Item" GROUP BY status ORDER BY count DESC
  `;
  console.log(`\n── Status Dağılımı ──────────────────`);
  for (const r of byStatus) console.log(`  ${r.status.padEnd(15)} ${r.count}`);

  const bySkillType = await prisma.$queryRaw<Array<{ skill: string; type: string; count: number }>>`
    SELECT skill::text, type::text, COUNT(*)::int as count
    FROM "Item" GROUP BY skill, type ORDER BY skill, count DESC
  `;
  console.log(`\n── Skill × Item Type ────────────────`);
  for (const r of bySkillType) {
    console.log(`  ${r.skill.padEnd(12)} ${r.type.padEnd(20)} ${r.count}`);
  }

  const bySkillCefr = await prisma.$queryRaw<Array<{ skill: string; cefr: string; count: number }>>`
    SELECT skill::text, "cefrLevel"::text as cefr, COUNT(*)::int as count
    FROM "Item" GROUP BY skill, "cefrLevel" ORDER BY skill, "cefrLevel"
  `;

  // Matrix print
  const skills = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
  const cefrs = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const matrix: Record<string, Record<string, number>> = {};
  for (const s of skills) {
    matrix[s] = {};
    for (const c of cefrs) matrix[s][c] = 0;
  }
  for (const r of bySkillCefr) {
    if (matrix[r.skill] && matrix[r.skill][r.cefr] !== undefined) {
      matrix[r.skill][r.cefr] = r.count;
    }
  }
  console.log(`\n── Skill × CEFR Matrix (Operational Items) ────`);
  console.log(`${"Skill".padEnd(12)} ${cefrs.map(c => c.padStart(7)).join(" ")} ${"TOTAL".padStart(7)}`);
  let grandTotal = 0;
  for (const s of skills) {
    const row = cefrs.map(c => matrix[s][c]);
    const sum = row.reduce((a, b) => a + b, 0);
    grandTotal += sum;
    console.log(`${s.padEnd(12)} ${row.map(n => String(n).padStart(7)).join(" ")} ${String(sum).padStart(7)}`);
  }
  console.log(`${"GRAND".padEnd(12)} ${cefrs.map(c => {
    const colSum = skills.reduce((s, sk) => s + matrix[sk][c], 0);
    return String(colSum).padStart(7);
  }).join(" ")} ${String(grandTotal).padStart(7)}`);

  // IQS coverage
  const iqs = await prisma.$queryRaw<Array<{ skill: string; rated: number; avg: number }>>`
    SELECT skill::text, COUNT("iqScore")::int as rated, AVG("iqScore")::float as avg
    FROM "Item" GROUP BY skill ORDER BY skill
  `;
  console.log(`\n── IQS Coverage ─────────────────────`);
  for (const r of iqs) {
    console.log(`  ${r.skill.padEnd(12)} rated: ${String(r.rated).padStart(5)}  avg: ${(r.avg ?? 0).toFixed(1)}`);
  }

  // Calibration coverage (items with non-default IRT params)
  const calibrated = await prisma.item.count({
    where: { OR: [{ NOT: { difficulty: 0 } }, { NOT: { discrimination: 1 } }] },
  });
  const exposed = await prisma.item.count({ where: { exposureCount: { gt: 0 } } });
  console.log(`\n── Calibration & Exposure ──────────`);
  console.log(`  Calibrated (b≠0 veya a≠1): ${calibrated}/${total} (${((calibrated / total) * 100).toFixed(1)}%)`);
  console.log(`  Exposed (exposure > 0):    ${exposed}/${total} (${((exposed / total) * 100).toFixed(1)}%)`);

  // Anchor coverage per skill × cefr
  const anchorMatrix = await prisma.$queryRaw<Array<{ skill: string; cefr: string; count: number }>>`
    SELECT skill::text, "cefrLevel"::text as cefr, COUNT(*)::int as count
    FROM "Item" WHERE "isAnchor" = true GROUP BY skill, "cefrLevel"
  `;
  console.log(`\n── Anchor Coverage (Hedef: her hücrede ≥10) ──`);
  if (anchorMatrix.length === 0) console.log("  (Anchor item havuzu BOŞ)");
  else for (const r of anchorMatrix) console.log(`  ${r.skill.padEnd(12)} ${r.cefr.padEnd(7)} ${r.count}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
