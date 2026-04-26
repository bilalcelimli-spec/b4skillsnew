/**
 * DANGER: Silently deletes all Item rows and dependent data:
 * - ratingTask, response, asset (in that FK order)
 *
 * Cevap kayıtları (Response) item FK yüzünden kaldırılır; tüm aday cevap geçmişi gider.
 * Oturum (Session) satırları silinmez; boş/eksik cevaplı oturumlar kalabilir.
 *
 * Kullanım:
 *   npx tsx scripts/delete-all-items.ts
 *   DATABASE_URL="postgresql://..." npx tsx scripts/delete-all-items.ts
 *   npx tsx scripts/delete-all-items.ts   # ayrı .env / ortam = production
 *
 * `import 'dotenv/config'` yükler: proje kökündeki .env
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }
  // Güvenli özet: host bilgisi (parola yok)
  try {
    const u = new URL(url);
    console.log("Target database host:", u.hostname, "database:", u.pathname || "/");
  } catch {
    console.log("Target: (could not parse DATABASE_URL for log)");
  }

  const prisma = new PrismaClient();
  const counts = {
    before: { items: 0, responses: 0, assets: 0, ratingTasks: 0 },
    after: { items: 0, responses: 0, assets: 0, ratingTasks: 0 },
  };
  counts.before.items = await prisma.item.count();
  counts.before.responses = await prisma.response.count();
  counts.before.assets = await prisma.asset.count();
  counts.before.ratingTasks = await prisma.ratingTask.count();
  console.log("Before:", counts.before);

  await prisma.$transaction(async (tx) => {
    const rt = await tx.ratingTask.deleteMany();
    const res = await tx.response.deleteMany();
    const ass = await tx.asset.deleteMany();
    const itm = await tx.item.deleteMany();
    console.log("Deleted rows:", { ratingTask: rt.count, response: res.count, asset: ass.count, item: itm.count });
  });

  counts.after.items = await prisma.item.count();
  counts.after.responses = await prisma.response.count();
  counts.after.assets = await prisma.asset.count();
  counts.after.ratingTasks = await prisma.ratingTask.count();
  console.log("After (should be 0 for item-related):", counts.after);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
