import { PrismaClient } from "@prisma/client";
import { studioItems } from "./src/data/studioItems";

const prisma = new PrismaClient();

async function main() {
  for (const item of studioItems) {
    let typeStr = "MULTIPLE_CHOICE";
    if (item.content.options) {
      typeStr = "MULTIPLE_CHOICE";
    } else if (item.skill === "Speaking") {
      typeStr = "SPEAKING_PROMPT";
    } else if (item.skill === "Writing") {
      typeStr = "WRITING_PROMPT";
    } else if ((item.skill as string) === "Integrated") {
      typeStr = "INTEGRATED_TASK";
    } else {
      typeStr = "FILL_IN_BLANKS"; // Fallback
    }

    let dbSkill = item.skill.toUpperCase();
    if (dbSkill === "INTEGRATED") {
      typeStr = "INTEGRATED_TASK";
      dbSkill = "READING"; // closest approximation
    }

    // If CEFR is like A1/A2, map it well
    let dbCefr = item.cefrLevel;
    if (dbCefr.includes('-')) dbCefr = dbCefr.split('-')[0];

    try {
      await prisma.item.upsert({
        where: { id: item.id },
        update: {
          tags: [item.productLine],
          status: "ACTIVE",
          type: typeStr as any,
          skill: dbSkill as any,
          cefrLevel: dbCefr as any,
          difficulty: item.irt.diff,
          discrimination: item.irt.disc,
          guessing: item.irt.guess,
          content: item.content as any,
        },
        create: {
          id: item.id,
          type: typeStr as any,
          skill: dbSkill as any,
          cefrLevel: dbCefr as any,
          difficulty: item.irt.diff,
          discrimination: item.irt.disc,
          guessing: item.irt.guess,
          content: item.content as any,
          tags: [item.productLine],
          status: "ACTIVE",
        }
      });
    } catch(e: any) {
      console.log(`Failed for item ${item.id}`, e.message);
    }
  }
  
  const count = await prisma.item.count();
  console.log(`Total active items in DB: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
