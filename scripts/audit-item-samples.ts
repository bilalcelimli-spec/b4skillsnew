/**
 * Deep audit: sample every affected item to catalogue exact fix patterns
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const LEGIT = new Set(["A","B","C","D","I","OK","ID","UK","US","USA","UN","EU","NASA","BBC","CNN","FBI","CIA","MIT","AI","CEO","CFO","HR","IT","PR","GDP","DNA","HIV","COVID","PC","TV","NYC","LA","DC","AM","PM","IELTS","TOEFL","CEFR","IRT","CAT","RSA","PQC","NIST","HTTP","HTTPS","URL","API","WWII","WW2","LGBTQ","NO","DO","AN","IN","OF","TO","OR","BY","AS","AT","ON","UP","SO","IF","IS","BE","MY","WE","HE","SHE","THE","AND","FOR","NOT","BUT","ARE","WAS","HAS","HAD","HIS","HER","ITS","OUR","YOU","CAN","MAY","WILL","SHALL","MUST","THAT","THIS","THAN","FROM","HAVE","BEEN","THEY","WERE","DOES","WHAT","WHEN","WHOM","WHOM","WHOSE","TRUE","FALSE","BOTH"]);

async function main() {
  // 1. Listening passage with role markers
  const lstSamples = await prisma.item.findMany({
    where: { skill: "LISTENING" },
    take: 5,
    select: { id: true, content: true, itemCode: true, cefrLevel: true },
  });
  console.log("=== LISTENING PASSAGES ===");
  for (const item of lstSamples) {
    const c = item.content as any;
    console.log(`\n[${item.itemCode}] ${item.cefrLevel}`);
    console.log("passage:", JSON.stringify((c.passage ?? "").substring(0, 300)));
    console.log("ttsScript:", JSON.stringify((c.ttsScript ?? "").substring(0, 200)));
    console.log("prompt:", JSON.stringify((c.prompt ?? "").substring(0, 200)));
  }

  // 2. Grammar items
  const grmSamples = await prisma.item.findMany({
    where: { skill: "GRAMMAR" },
    take: 5,
    select: { id: true, content: true, itemCode: true, cefrLevel: true },
  });
  console.log("\n=== GRAMMAR ITEMS ===");
  for (const item of grmSamples) {
    const c = item.content as any;
    console.log(`\n[${item.itemCode}]`);
    console.log("prompt:", JSON.stringify((c.prompt ?? "").substring(0, 200)));
    console.log("options:", JSON.stringify((c.options ?? []).slice(0,4)));
  }

  // 3. Reading items with ALL_CAPS passage
  const rdgCaps = await prisma.item.findMany({
    where: { skill: "READING", itemCode: { startsWith: "RDG-A2" } },
    take: 3,
    select: { id: true, content: true, itemCode: true },
  });
  console.log("\n=== READING A2 PASSAGES ===");
  for (const item of rdgCaps) {
    const c = item.content as any;
    console.log(`\n[${item.itemCode}]`);
    console.log("passage:", JSON.stringify((c.passage ?? "").substring(0, 400)));
    console.log("prompt:", JSON.stringify((c.prompt ?? "")));
  }

  // 4. Grammar items flagged - let me look at ones with all-caps
  const grmFlagged = await prisma.item.findMany({
    where: { skill: "GRAMMAR" },
    take: 40,
    select: { id: true, content: true, itemCode: true, cefrLevel: true },
  });
  console.log("\n=== GRAMMAR FULL CONTENT SAMPLE ===");
  for (const item of grmFlagged) {
    const c = item.content as any;
    const prompt = c.prompt ?? "";
    const caps = (prompt.match(/\b[A-Z]{2,}\b/g) || []).filter((w: string) => !["UK","US","USA","UN","EU","AI","CEO","GDP","DNA","HIV","COVID","PC","TV"].includes(w));
    if (caps.length > 0) {
      console.log(`\n[${item.itemCode}] caps=${caps.join(",")}`);
      console.log("prompt:", JSON.stringify(prompt.substring(0, 200)));
      console.log("options:", JSON.stringify((c.options ?? []).slice(0,4)));
    }
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
