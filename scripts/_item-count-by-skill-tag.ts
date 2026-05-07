import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, skill: true, type: true, tags: true, cefrLevel: true },
  });

  const PRODUCT_LINES = [
    { name: 'Primary (7-10)',      sources: ['primary', 'general'] },
    { name: 'Junior Suite (11-14)', sources: ['junior', 'general'] },
    { name: '15-Min Diagnostic',   sources: ['general'] },
    { name: 'Academia',            sources: ['academia', 'general'] },
    { name: 'Corporate',           sources: ['corporate', 'general'] },
    { name: 'Language Schools',    sources: ['language-schools', 'general'] },
  ];

  const SKILLS = ['LISTENING', 'READING', 'GRAMMAR', 'VOCABULARY', 'WRITING', 'SPEAKING'];

  console.log('\nItem counts per product line per skill:\n');
  for (const pl of PRODUCT_LINES) {
    console.log(`=== ${pl.name} ===`);
    for (const skill of SKILLS) {
      const count = items.filter(i =>
        i.skill === skill &&
        i.tags.some((t: string) => pl.sources.includes(t))
      ).length;
      const flag = count === 0 ? ' ← ❌ NO ITEMS' : count < 3 ? ' ← ⚠️  FEW' : '';
      console.log(`  ${skill.padEnd(12)} ${String(count).padStart(4)}${flag}`);
    }
    console.log();
  }

  // Also show item types per skill
  console.log('\nItem types in DB:');
  const typeMap: Record<string, Record<string, number>> = {};
  for (const i of items) {
    typeMap[i.skill] = typeMap[i.skill] || {};
    typeMap[i.skill][i.type] = (typeMap[i.skill][i.type] || 0) + 1;
  }
  for (const [skill, types] of Object.entries(typeMap)) {
    console.log(`  ${skill}: ${Object.entries(types).map(([t,c]) => `${t}=${c}`).join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
