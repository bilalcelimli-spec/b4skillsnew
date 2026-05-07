import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const skills = await prisma.item.groupBy({ by: ['skill', 'cefrLevel'], _count: true });
  const total = await prisma.item.count();
  console.log('Total items:', total);
  skills.sort((a,b) => a.skill.localeCompare(b.skill));
  for (const s of skills) console.log(s.skill, s.cefrLevel, s._count);
  await prisma.$disconnect();
}
main().catch(console.error);
