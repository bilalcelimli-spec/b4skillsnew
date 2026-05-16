import { prisma } from "../src/lib/prisma.js";

const TARGETS: Record<string, Record<string, number>> = {
  READING:    { PRE_A1: 25,  A1: 65,  A2: 105 },
  LISTENING:  { PRE_A1: 45,  A1: 55,  A2: 115 },
  GRAMMAR:    { PRE_A1: 100, A1: 200, A2: 210 },
  VOCABULARY: { PRE_A1: 65,  A1: 185, A2: 200 },
  WRITING:    { PRE_A1: 40,  A1: 50,  A2: 50  },
  SPEAKING:   { PRE_A1: 40,  A1: 50,  A2: 50  },
};

const rows = await prisma.item.groupBy({
  by: ["cefrLevel", "skill"],
  _count: { id: true },
  where: { cefrLevel: { in: ["PRE_A1", "A1", "A2"] }, status: { in: ["ACTIVE", "PRETEST"] } },
});

const have: Record<string, Record<string, number>> = {};
for (const r of rows) {
  if (!have[r.skill]) have[r.skill] = {};
  have[r.skill][r.cefrLevel] = r._count.id;
}

let totalGap = 0;
console.log("SKILL        LEVEL     HAVE   TARGET   GAP  PRIORITY");
for (const [skill, levels] of Object.entries(TARGETS)) {
  for (const [level, target] of Object.entries(levels)) {
    const current = have[skill]?.[level] ?? 0;
    const gap = Math.max(0, target - current);
    totalGap += gap;
    const pct = current / target;
    const priority = pct < 0.4 ? "🔴 CRITICAL" : pct < 0.7 ? "🟡 HIGH" : pct < 1.0 ? "🟢 LOW" : "✅ OK";
    console.log(`${skill.padEnd(12)} ${level.padEnd(9)} ${String(current).padStart(4)}   ${String(target).padStart(5)}  ${String(gap).padStart(4)}  ${priority}`);
  }
}
console.log(`\nTotal gap: ${totalGap} items needed`);
await prisma.$disconnect();
