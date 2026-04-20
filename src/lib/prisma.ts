import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isDev = process.env.NODE_ENV !== "production";

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isDev ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (isDev) globalForPrisma.prisma = prisma;
