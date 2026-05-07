import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: { status: 'ACTIVE' },
    select: { skill: true, tags: true },
  });

  // Check which PRODUCT-LINE tags are used (capital vs lower)
  const plTags = ['Corporate', 'Language Schools', 'Academia', 'Primary (7-10)', 'Junior Suite (11-14)', '15-Min Diagnostic',
                  'corporate', 'language-schools', 'academia', 'primary', 'junior', 'general'];
  
  console.log('\n=== Product-line tag usage ===');
  for (const tag of plTags) {
    const cnt = items.filter(i => i.tags.includes(tag)).length;
    if (cnt > 0) console.log(`  "${tag}" → ${cnt} items`);
  }

  // Per-skill counts for each PL tag
  const SKILLS = ['GRAMMAR', 'VOCABULARY', 'WRITING', 'SPEAKING', 'READING', 'LISTENING'];
  const TAGS = ['Corporate', 'corporate', 'Language Schools', 'language-schools', 'Academia', 'academia', 'diagnostic', 'general'];
  
  console.log('\n=== Skill × Tag matrix ===');
  for (const tag of TAGS) {
    const row = SKILLS.map(s => {
      const c = items.filter(i => i.skill === s && i.tags.includes(tag)).length;
      return `${s.slice(0,4)}=${c}`;
    }).join(' ');
    const total = items.filter(i => i.tags.includes(tag)).length;
    if (total > 0) console.log(`  "${tag}" (${total}): ${row}`);
  }

  // Items tagged "general" (lowercase)
  const genItems = items.filter(i => i.tags.includes('general'));
  console.log('\n=== "general" tagged items:', genItems.length);
  
  // Items with NO product-line tags at all
  const plTagSet = new Set(['Corporate', 'Language Schools', 'Academia', 'Primary (7-10)', 'Junior Suite (11-14)', '15-Min Diagnostic',
    'corporate', 'language-schools', 'academia', 'primary', 'junior', 'general', 'diagnostic']);
  const noPlTag = items.filter(i => !i.tags.some((t: string) => plTagSet.has(t)));
  console.log('\n=== Items with NO product-line tag:', noPlTag.length);
  const noPlBySkill: Record<string, number> = {};
  for (const i of noPlTag) noPlBySkill[i.skill] = (noPlBySkill[i.skill] || 0) + 1;
  for (const [s, c] of Object.entries(noPlBySkill)) console.log(`  ${s}: ${c}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
