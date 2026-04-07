import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany();
  let count = 0;
  for (const item of items) {
    if (item.tags.length > 0) continue; // Skip already tagged (from studioItems)

    let tag = "Primary (7-10)";
    if (item.id.includes("-gen-")) tag = "15-Min Diagnostic";
    if (item.id.includes("-corp-")) tag = "Corporate";
    if (item.id.includes("-lang-")) tag = "Language Schools";
    if (item.id.includes("-spec-") || item.id.includes("-integ-")) tag = "Specialized / Integrated Skills";
    if (item.id.includes("-aca-") || item.id.includes("-acad-")) tag = "Academia";
    if (item.id.includes("-jun-")) tag = "Junior Suite (11-14)";
    // Default to Primary for generic ones like item-read-a1-17 if they missed out.

    await prisma.item.update({
      where: { id: item.id },
      data: {
        tags: [tag],
        status: "ACTIVE"
      }
    });
    count++;
  }
  
  console.log(`Tagged ${count} items.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
