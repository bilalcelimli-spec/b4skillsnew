import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.item.findMany({ select: { itemCode: true, skill: true, content: true } });
  console.log("=== GRAMMAR inline parens ===");
  for (const item of items.filter(i => i.skill === "GRAMMAR")) {
    const c = item.content as any;
    const v = c.prompt ?? "";
    if (/\(.*?\)/.test(v) && !/\s*\([^)]+\)\s*$/.test(v))
      console.log(`[${item.itemCode}]: "${v}"`);
  }
  console.log("\n=== VOCABULARY inline parens ===");
  for (const item of items.filter(i => i.skill === "VOCABULARY")) {
    const c = item.content as any;
    const v = c.prompt ?? "";
    if (/\(.*?\)/.test(v) && !/\s*\([^)]+\)\s*$/.test(v))
      console.log(`[${item.itemCode}]: "${v}"`);
  }
  console.log("\n=== WRITING trailing parens ===");
  for (const item of items.filter(i => i.skill === "WRITING")) {
    const c = item.content as any;
    const v = c.prompt ?? "";
    if (/\s*\([^)]+\)\s*$/.test(v))
      console.log(`[${item.itemCode}]: "...${v.slice(-120)}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
