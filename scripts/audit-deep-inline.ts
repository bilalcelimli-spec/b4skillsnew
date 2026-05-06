import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const LEGIT = new Set(["A","B","C","D","I","OK","ID","UK","US","USA","UN","EU","NASA","BBC","CNN","FBI","CIA","MIT","AI","CEO","CFO","HR","IT","PR","GDP","DNA","HIV","COVID","PC","TV","NYC","LA","DC","AM","PM","IELTS","TOEFL","CEFR","IRT","CAT","RSA","PQC","NIST","HTTP","HTTPS","URL","API","WWII","WW2","LGBTQ","NO","DO","AN","IN","OF","TO","OR","BY","AS","AT","ON","UP","SO","IF","IS","BE","MY","WE","HE","SHE","THE","AND","FOR","NOT","BUT","ARE","WAS","HAS","HAD","HIS","HER","ITS","OUR","YOU","CAN","MAY","WILL","SHALL","MUST","THAT","THIS","THAN","FROM","HAVE","BEEN","THEY","WERE","DOES","WHAT","WHEN","WHOM","WHOSE","TRUE","FALSE","BOTH"]);

async function main() {
  const items = await prisma.item.findMany({ select: { id: true, skill: true, cefrLevel: true, content: true, itemCode: true } });

  const allCapsWords: Record<string, number> = {};
  let roleMarkerCount = 0;
  let whichOfFollowingCount = 0;
  const grammarCapsSamples: string[] = [];
  const readingCapsSamples: string[] = [];

  for (const item of items) {
    const c = item.content as any;
    const texts = [c.prompt, c.passage, c.question, c.ttsScript, ...(Array.isArray(c.options) ? c.options.map((o: any) => typeof o === "string" ? o : o?.text) : [])].filter(Boolean);
    
    for (const t of texts) {
      const caps = (String(t).match(/\b[A-Z]{2,}\b/g) || []).filter((w: string) => !LEGIT.has(w));
      for (const w of caps) { allCapsWords[w] = (allCapsWords[w] || 0) + 1; }
    }
    
    if (/^\[.*?(?:—|--).*?\]/.test(c.passage ?? "")) roleMarkerCount++;
    if (/which of the following/i.test(c.prompt ?? "")) whichOfFollowingCount++;
    
    if (item.skill === "GRAMMAR") {
      const prompt = c.prompt ?? "";
      const caps = (prompt.match(/\b[A-Z]{2,}\b/g) || []).filter((w: string) => !LEGIT.has(w));
      if (caps.length > 0 && grammarCapsSamples.length < 20) {
        grammarCapsSamples.push(`[${item.itemCode}] caps=[${caps.join(",")}] "${prompt.substring(0,120)}"`);
      }
    }
    if (item.skill === "READING") {
      const passage = c.passage ?? "";
      const caps = (passage.match(/\b[A-Z]{2,}\b/g) || []).filter((w: string) => !LEGIT.has(w));
      if (caps.length > 0 && readingCapsSamples.length < 5) {
        readingCapsSamples.push(`[${item.itemCode}] caps=[${caps.slice(0,6).join(",")}] passage="${passage.substring(0,200)}"`);
      }
    }
  }

  const sorted = Object.entries(allCapsWords).sort((a,b)=>b[1]-a[1]).slice(0,40);
  console.log(`\nroleMarkerCount: ${roleMarkerCount}`);
  console.log(`whichOfFollowingCount: ${whichOfFollowingCount}`);
  console.log("\nTop ALL_CAPS words (non-legit):");
  sorted.forEach(([w,n]) => console.log(`  ${w}: ${n}`));
  console.log("\nGRAMMAR caps samples:");
  grammarCapsSamples.forEach(s => console.log(" ", s));
  console.log("\nREADING caps samples:");
  readingCapsSamples.forEach(s => console.log(" ", s));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
