import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isDev = process.env.NODE_ENV !== "production";

// Ensure connection pool params are set for production to avoid exhausting the
// Render Starter DB limit (25 connections). Appends only if not already present.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("connection_limit")) {
  const sep = process.env.DATABASE_URL.includes("?") ? "&" : "?";
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}connection_limit=5&pool_timeout=10`;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isDev ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (isDev) globalForPrisma.prisma = prisma;
