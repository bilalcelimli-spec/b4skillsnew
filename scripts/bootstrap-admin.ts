/**
 * Production — ilk (veya mevcut) yönetici hesabı: şifre hash, SUPER_ADMIN rolü, isteğe bağlı organization.
 *
 *   DATABASE_URL=... BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD='...' npx tsx scripts/bootstrap-admin.ts
 *
 * İsteğe bağlı:
 *   BOOTSTRAP_CREATE_ORG=1     — yeni organizasyon yarat ve kullanıcıyı bağla
 *   BOOTSTRAP_ORG_NAME=...     — varsayılan: "Default organization"
 *   BOOTSTRAP_ORG_SLUG=...     — benzersiz slug (yoksa otomatik)
 *   BOOTSTRAP_ORGANIZATION_ID=... — mevcut org id (CREATE_ORG yokken öncelik)
 *
 * Oluşan org yoksa, veritabanındaki ilk organizasyona kullanıcıyı bağlamayı dener.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, type UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD_MIN = 10;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "org";
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL gerekli.");
    process.exit(1);
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "System Admin";
  const role = (process.env.BOOTSTRAP_ADMIN_ROLE as UserRole) || "SUPER_ADMIN";

  if (!email || !password) {
    console.error("BOOTSTRAP_ADMIN_EMAIL ve BOOTSTRAP_ADMIN_PASSWORD ayarlayın.");
    process.exit(1);
  }
  if (password.length < PASSWORD_MIN) {
    console.error(`Parola en az ${PASSWORD_MIN} karakter olmalı.`);
    process.exit(1);
  }

  const createOrg = process.env.BOOTSTRAP_CREATE_ORG === "1" || process.env.BOOTSTRAP_CREATE_ORG === "true";
  let orgId: string | null = process.env.BOOTSTRAP_ORGANIZATION_ID?.trim() || null;
  const orgName = process.env.BOOTSTRAP_ORG_NAME?.trim() || "Default organization";
  let orgSlug = process.env.BOOTSTRAP_ORG_SLUG?.trim() || null;

  if (createOrg && !orgId) {
    const base = orgSlug || slugify(orgName);
    let candidate = base;
    let n = 0;
    // Benzersiz slug
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const ex = await prisma.organization.findUnique({ where: { slug: candidate } });
      if (!ex) break;
      n += 1;
      candidate = `${base}-${n}`;
    }
    const org = await prisma.organization.create({
      data: { name: orgName, slug: candidate },
    });
    orgId = org.id;
    console.log("Organizasyon oluşturuldu:", org.name, "| id:", org.id, "| slug:", org.slug);
  } else if (!orgId) {
    const first = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (first) {
      orgId = first.id;
      console.log("Mevcut ilk organizasyona bağlanıyor:", first.name, first.id);
    } else {
      console.warn(
        "Veritabanında organizasyon yok. Kullanıcı org olmadan kaydedilecek; admin paneli veri yükleyene kadar uyarı gösterebilir. BOOTSTRAP_CREATE_ORG=1 kullanın."
      );
    }
  }

  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hash,
        role,
        name: name || existing.name,
        ...(orgId ? { organizationId: orgId } : {}),
      },
    });
    console.log("Kullanıcı güncellendi (rol + şifre" + (orgId ? " + org" : "") + "):", email, role);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        password: hash,
        role,
        organizationId: orgId,
      },
    });
    console.log("Yönetici oluşturuldu:", email, role, orgId ? `org=${orgId}` : "(org yok)");
  }

  console.log("Giriş: bu e-posta ve parola ile / üzerinden oturum açın. Parolayı repoda bırakmayın.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
