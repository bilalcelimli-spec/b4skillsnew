import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({ select: { itemCode: true, skill: true, content: true } });
  const samples: string[] = [];
  let total = 0;
  for (const item of items) {
    const c = item.content as any;
    const fields = ["prompt", "question"];
    for (const f of fields) {
      const v = c[f];
      if (typeof v === "string" && /\(.*?\)/.test(v)) {
        total++;
        if (samples.length < 30) samples.push(`[${item.itemCode}/${f}] "${v.substring(0,160)}"`);
      }
    }
  }
  console.log(`Items with parens in prompt/question: ${total}`);
  samples.forEach(s => console.log(s));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
