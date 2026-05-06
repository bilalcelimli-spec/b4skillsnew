/**
 * Audit item quality issues:
 * 1. ALL-CAPS words in prompts/passages/options
 * 2. Instruction leakage in question stem
 * 3. Stray meta-text patterns
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Words that are legitimately uppercase (acronyms, proper nouns in testing context)
const ALLOWED_CAPS = new Set([
  "A", "B", "C", "D", "I", "UK", "US", "USA", "UN", "EU", "NASA", "BBC", "CNN",
  "AI", "CEO", "GDP", "DNA", "HIV", "COVID", "PC", "TV", "NYC", "LA", "DC",
  "IELTS", "TOEFL", "CEFR", "IRT", "CAT",
]);

// Patterns that indicate instruction leakage (meta-text that should not be in a question)
const INSTRUCTION_PATTERNS = [
  /choose the (best|correct|right|most appropriate)/i,
  /select the (best|correct|right|most appropriate)/i,
  /\bfill in the blank\b/i,
  /\bfill in the gap\b/i,
  /\bwrite the correct\b/i,
  /\bcomplete the sentence\b/i,
  /\bcomplete the following\b/i,
  /\banswer the following\b/i,
  /\bread the (following|passage|text)/i,
  /\blisten to the (following|audio|recording)/i,
  /\bwhich (of the following|option|answer)/i,
  /\btype your answer\b/i,
  /\benter your answer\b/i,
  /\bone word only\b/i,
  /\bno more than \d+ words?\b/i,
  /^\s*instruction[s]?\s*:/i,
  /^\s*note\s*:/i,
  /\[.*?\]/,  // anything in brackets like [BLANK] [ANSWER]
];

// Detects all-caps words that should be mixed case
function findAllCapsWords(text: string): string[] {
  if (!text) return [];
  // Match words of 2+ letters that are ALL CAPS and not in allowed list
  const matches = text.match(/\b[A-Z]{2,}\b/g) || [];
  return matches.filter(w => !ALLOWED_CAPS.has(w));
}

function checkContent(content: any, itemId: string, skill: string, cefr: string) {
  const issues: string[] = [];
  const fields = [
    { name: "prompt", val: content?.prompt },
    { name: "passage", val: content?.passage },
    { name: "question", val: content?.question },
    { name: "ttsScript", val: content?.ttsScript },
    { name: "stem", val: content?.stem },
  ];

  for (const { name, val } of fields) {
    if (!val || typeof val !== "string") continue;
    for (const pat of INSTRUCTION_PATTERNS) {
      if (pat.test(val)) {
        issues.push(`[INSTRUCTION_LEAK] ${name}: "${val.substring(0, 80)}"`);
        break;
      }
    }
    const caps = findAllCapsWords(val);
    if (caps.length > 0) {
      issues.push(`[ALL_CAPS] ${name}: ${caps.slice(0,5).join(", ")} in "${val.substring(0, 80)}"`);
    }
  }

  // Check options
  if (Array.isArray(content?.options)) {
    content.options.forEach((opt: any, i: number) => {
      const text = typeof opt === "string" ? opt : opt?.text;
      if (!text) return;
      const caps = findAllCapsWords(text);
      if (caps.length > 0) {
        issues.push(`[ALL_CAPS] option[${i}]: ${caps.slice(0,3).join(", ")} in "${text.substring(0, 60)}"`);
      }
    });
  }

  return issues;
}

async function main() {
  const items = await prisma.item.findMany({
    select: { id: true, skill: true, cefrLevel: true, content: true, itemCode: true },
    orderBy: { skill: "asc" },
  });

  let totalIssues = 0;
  const bySkill: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const sampleIssues: Array<{ id: string; skill: string; cefr: string; code: string | null; issues: string[] }> = [];

  for (const item of items) {
    const content = item.content as any;
    const issues = checkContent(content, item.id, item.skill, item.cefrLevel);
    if (issues.length > 0) {
      totalIssues += issues.length;
      bySkill[item.skill] = (bySkill[item.skill] || 0) + 1;
      for (const iss of issues) {
        const type = iss.split("]")[0].replace("[", "");
        byType[type] = (byType[type] || 0) + 1;
      }
      if (sampleIssues.length < 30) {
        sampleIssues.push({ id: item.id, skill: item.skill, cefr: item.cefrLevel, code: item.itemCode ?? null, issues });
      }
    }
  }

  console.log(`\nTotal items scanned: ${items.length}`);
  console.log(`Items with issues: ${Object.values(bySkill).reduce((a, b) => a + b, 0)}`);
  console.log(`\nIssues by skill:`);
  console.table(bySkill);
  console.log(`\nIssues by type:`);
  console.table(byType);
  console.log(`\n--- SAMPLE ISSUES (first 30 affected items) ---`);
  for (const s of sampleIssues) {
    console.log(`\n[${s.code ?? s.id}] ${s.skill} ${s.cefr}`);
    for (const iss of s.issues) {
      console.log(`  ${iss}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
