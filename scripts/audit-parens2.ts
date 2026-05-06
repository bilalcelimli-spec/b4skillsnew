import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({ select: { itemCode: true, skill: true, content: true } });
  const bySkill: Record<string, {trailing: number, inline: number, samples: string[]}> = {};
  for (const item of items) {
    const c = item.content as any;
    const v = c.prompt ?? c.question ?? "";
    if (typeof v !== "string") continue;
    const skill = item.skill;
    if (!bySkill[skill]) bySkill[skill] = { trailing: 0, inline: 0, samples: [] };
    // trailing paren: ends with (...)
    if (/\s*\([^)]+\)\s*$/.test(v)) {
      bySkill[skill].trailing++;
      if (bySkill[skill].samples.length < 3)
        bySkill[skill].samples.push(`  TRAILING [${item.itemCode}]: "${v.slice(-80)}"`);
    } else if (/\(.*?\)/.test(v)) {
      bySkill[skill].inline++;
      if (bySkill[skill].samples.length < 3)
        bySkill[skill].samples.push(`  INLINE   [${item.itemCode}]: "${v.substring(0,120)}"`);
    }
  }
  for (const [skill, d] of Object.entries(bySkill)) {
    if (d.trailing + d.inline === 0) continue;
    console.log(`\n${skill}: trailing=${d.trailing}, inline=${d.inline}`);
    d.samples.forEach(s => console.log(s));
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
