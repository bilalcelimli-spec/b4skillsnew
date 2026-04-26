/**
 * DANGER: Deletes all application data (sessions, items, orgs, users, etc.) in FK-safe order.
 * Does not drop schema. Resets SystemConfig to an empty object.
 *
 *   CONFIRM_PURGE=yes DATABASE_URL="postgresql://..." npx tsx scripts/purge-platform-data.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  if (process.env.CONFIRM_PURGE !== "yes") {
    console.error("Refusing to run: set CONFIRM_PURGE=yes to wipe all application data.");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }
  try {
    const u = new URL(url);
    console.log("Target host:", u.hostname, "db:", (u.pathname || "/").slice(0, 48));
  } catch {
    console.log("Target: (unparsed DATABASE_URL)");
  }

  const prisma = new PrismaClient();
  const deleted = await prisma.$transaction(async (tx) => {
    const a = await tx.ratingTask.deleteMany();
    const b = await tx.response.deleteMany();
    const c = await tx.proctoringEvent.deleteMany();
    const d = await tx.scoreReport.deleteMany();
    const e = await tx.feedback.deleteMany();
    const f = await tx.session.deleteMany();
    const g = await tx.asset.deleteMany();
    const h = await tx.item.deleteMany();
    const i = await tx.examCode.deleteMany();
    const j = await tx.auditLog.deleteMany();
    const k = await tx.webhook.deleteMany();
    const l = await tx.apiKey.deleteMany();
    const m = await tx.paymentTransaction.deleteMany();
    const n = await tx.cohort.deleteMany();
    const o = await tx.license.deleteMany();
    const p = await tx.candidateProfile.deleteMany();
    const q = await tx.user.deleteMany();
    const r = await tx.organization.deleteMany();
    await tx.systemConfig.upsert({
      where: { id: "global" },
      update: { config: {} },
      create: { id: "global", config: {} },
    });
    return {
      ratingTask: a.count,
      response: b.count,
      proctoringEvent: c.count,
      scoreReport: d.count,
      feedback: e.count,
      session: f.count,
      asset: g.count,
      item: h.count,
      examCode: i.count,
      auditLog: j.count,
      webhook: k.count,
      apiKey: l.count,
      paymentTransaction: m.count,
      cohort: n.count,
      license: o.count,
      candidateProfile: p.count,
      user: q.count,
      organization: r.count,
    };
  });
  console.log("Deleted row counts:", deleted);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
