import { PrismaClient } from "@prisma/client";
import {
  attachItemValidationMiddleware,
  attachStrictItemValidationMiddleware,
} from "./validation/prisma-middleware.js";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isDev = process.env.NODE_ENV !== "production";

// Ensure connection pool params are set for production to avoid exhausting the
// Render Starter DB limit (25 connections). Appends only if not already present.
// DB_CONNECTION_LIMIT env var overrides the default (20 for 100-user concurrency).
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("connection_limit")) {
  const limit = process.env.DB_CONNECTION_LIMIT ?? "20";
  const timeout = process.env.DB_POOL_TIMEOUT ?? "20";
  const sep = process.env.DATABASE_URL.includes("?") ? "&" : "?";
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}connection_limit=${limit}&pool_timeout=${timeout}`;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isDev ? ["query", "warn", "error"] : ["warn", "error"],
  });

// Attach item validation middleware
const isStrictMode = process.env.ITEM_VALIDATION_STRICT === "true";
if (!process.env.NODE_ENV?.includes("test")) {
  if (!globalForPrisma.prisma) {
    // Only attach once on initial client creation
    if (isStrictMode || !isDev) {
      attachStrictItemValidationMiddleware(prisma);
    } else {
      attachItemValidationMiddleware(prisma);
    }
  }
}

if (isDev) globalForPrisma.prisma = prisma;
