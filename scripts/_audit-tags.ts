import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: { status: 'ACTIVE' },
    select: { skill: true, tags: true },
  });

  // Grammar tag distribution
  const grammarTags: Record<string, number> = {};
  for (const i of items.filter(i => i.skill === 'GRAMMAR')) {
    const key = i.tags.sort().join(',') || '(empty)';
    grammarTags[key] = (grammarTags[key] || 0) + 1;
  }
  console.log('\n=== GRAMMAR item tag distributions ===');
  for (const [tags, count] of Object.entries(grammarTags).sort((a,b) => b[1]-a[1]).slice(0,20)) {
    console.log(`  [${count}] ${tags}`);
  }

  // All unique tags across all skills
  const allTags = new Set<string>();
  for (const i of items) {
    i.tags.forEach((t: string) => allTags.add(t));
  }
  console.log('\n=== All unique tags in DB ===');
  console.log([...allTags].sort().join(', '));

  // Per skill: how many have "general" tag
  const SKILLS = ['LISTENING', 'READING', 'GRAMMAR', 'VOCABULARY', 'WRITING', 'SPEAKING'];
  console.log('\n=== Items tagged "general" per skill ===');
  for (const s of SKILLS) {
    const cnt = items.filter(i => i.skill === s && i.tags.includes('general')).length;
    const total = items.filter(i => i.skill === s).length;
    console.log(`  ${s.padEnd(12)} ${cnt}/${total}`);
  }

  // Items with empty tags
  const emptyTagItems = items.filter(i => i.tags.length === 0);
  console.log('\n=== Items with EMPTY tags:', emptyTagItems.length, '===');
  const emptyBySkill: Record<string, number> = {};
  for (const i of emptyTagItems) {
    emptyBySkill[i.skill] = (emptyBySkill[i.skill] || 0) + 1;
  }
  for (const [s, c] of Object.entries(emptyBySkill)) {
    console.log(`  ${s}: ${c}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
