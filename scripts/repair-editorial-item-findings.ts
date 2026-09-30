/**
 * Applies the manually reviewed editorial decisions from the active-item audit.
 * Dry-run by default. Use APPLY=1 to write changes.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === "1";
const REPORT_DIR = path.join(process.cwd(), "reports");

const quarantine: Record<string, string> = {
  "cmor7bagk00004ydn55pfour1": "Three-speaker listening audio requires editorial voice production",
  "cmor7bann00014ydnyir5ijbs": "Three-speaker listening audio requires editorial voice production",
  "cmor7baxo00044ydnvcaqs3pp": "Three-speaker listening audio requires editorial voice production",
  "cmor7bb1k00054ydns51wlef7": "Three-speaker listening audio requires editorial voice production",
  "cmor7bh6200004yhh1uqmo9nr": "Four-speaker listening audio requires editorial voice production",
  "cmor7bhae00014yhhjzk99qrl": "Four-speaker listening audio requires editorial voice production",
  "cmor7bhcy00024yhhns7bseee": "Four-speaker listening audio requires editorial voice production",
  "cmos6ds6i000gnu1fvqfbc5qw": "Three-speaker listening audio requires editorial voice production",
  "cmox3qguo001cnuqn72ylb05v": "Three-speaker listening audio requires editorial voice production",
  "cmpirgazk0010nufa9tji8j8y": "Three-speaker listening audio is missing and requires editorial voice production",
  "cmoukelbo000bnu8bybm60pn8": "Visual stimulus is referenced but no renderable image is attached",
};

const promptReplacements: Record<string, string> = {
  "cmp07rbxd000fnuc6b203hp2q": "Tell me about a local event or festival in your town. Say what it is called, when it happens, and one thing people do there. Finish by saying whether you like it and give one reason.",
  "cmp07t6pw000inuc6yit6ryyn": "Tell me about a book or film you liked. Say its name, what it is about, and one reason you liked it.",
  "cmp07t6rm000jnuc6ytwd3iqb": "Look at the picture, then tell me about a book or film you liked. Say its name, what it is about, and one reason you liked it.",
  "cmp07v9sl000mnuc69popvkau": "You are speaking to the organiser of a technology club. Greet the organiser, explain one way you use technology in daily life, and ask one question about the club.",
  "cmp07zbot000tnuc68ths1rmh": "Look at the picture. Describe the environmental problem you can see and suggest two simple actions people can take to help.",
  "cmp081hpn000unuc6oh7oudh5": "Tell a new friend about one learning experience. Say what you studied, one thing you liked or disliked, and one new thing you would like to learn.",
  "cmp0af9k2004lnuc6d99ktgpf": "Tell Alex about one exercise you do. Say what it is, when you do it, and whether you like it.",
  "cmp0ajai6004pnuc6rxxzmwhl": "Tell a new friend whether you live in a city or in the countryside. Say one thing you like about your area, then ask where your friend lives.",
  "cmp0al70n004snuc6k6d9f5eb": "Look at the picture. Describe the person and the place, then give one reason why learning a new language is useful.",
  "cmp0apmh6004ynuc66id28sr8": "Look at the picture and describe what you see. Then name one book or film you like and say why you like it.",
  "cmp0apmiv004znuc6crhs0h66": "Look at the picture and describe what you see. Then name one book or film you like and give one reason.",
  "cmp0arhvp0051nuc6em2gmqd4": "Tell Alex about one piece of technology you use every day. Say what you use it for and whether you like it.",
  "cmp0atjda0055nuc6933c3q9d": "Describe two things you can see in this office. Then say whether it would be a good place for you to work and give one reason.",
  "cmp0atjes0056nuc6cp2b41kc": "Look at the office picture. Name two things you can see, then say whether you would like to work there and why.",
  "cmp0avnk00058nuc6zsu2gaim": "Tell a new neighbour one thing you do not like about your street or local park. Suggest one simple improvement, then ask the neighbour one question about their area.",
};

function objectOf(value: Prisma.JsonValue | null): Record<string, any> {
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, any>;
}

async function main() {
  const ids = [...new Set([...Object.keys(quarantine), ...Object.keys(promptReplacements)])];
  const items = await prisma.item.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      itemCode: true,
      skill: true,
      cefrLevel: true,
      status: true,
      pipelineStage: true,
      content: true,
      metadata: true,
    },
  });
  const missingIds = ids.filter((id) => !items.some((item) => item.id === id));

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    found: items.length,
    missingIds,
    quarantine: items.filter((item) => quarantine[item.id]).length,
    promptReplacements: items.filter((item) => promptReplacements[item.id]).length,
  }, null, 2));

  if (!APPLY) {
    for (const item of items) {
      if (quarantine[item.id]) console.log(`[REVIEW] ${item.itemCode || item.id}: ${quarantine[item.id]}`);
      if (promptReplacements[item.id]) console.log(`[PROMPT] ${item.itemCode || item.id}: ${promptReplacements[item.id]}`);
    }
    return;
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(
    path.join(REPORT_DIR, `editorial-repair-backup-${stamp}.json`),
    `${JSON.stringify({ createdAt: new Date().toISOString(), items }, null, 2)}\n`,
  );

  const auditedAt = new Date().toISOString();
  await prisma.$transaction(items.map((item) => {
    const content = objectOf(item.content);
    const metadata = objectOf(item.metadata);
    const reason = quarantine[item.id];
    const replacement = promptReplacements[item.id];
    return prisma.item.update({
      where: { id: item.id },
      data: {
        ...(reason ? { status: "REVIEW", pipelineStage: "FLAGGED" } : {}),
        ...(replacement ? { content: { ...content, prompt: replacement } } : {}),
        metadata: {
          ...metadata,
          contentAudit: {
            auditedAt,
            action: reason ? "QUARANTINED_FOR_EDITORIAL_REVIEW" : "PROMPT_SIMPLIFIED",
            reason: reason || "Response load exceeded the configured speaking time",
            previousStatus: item.status,
            previousPipelineStage: item.pipelineStage,
            previousPrompt: replacement ? content.prompt : undefined,
          },
        },
      },
    });
  }));

  console.log(`Applied ${items.length} editorial repairs. Backup stamp: ${stamp}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
