import { PrismaClient } from "@prisma/client";
import {
  attachItemValidationMiddleware,
  attachStrictItemValidationMiddleware,
} from "./validation/prisma-middleware.js";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isDev = process.env.NODE_ENV !== "production";

// An explicit deployment limit overrides stale URL settings. Otherwise preserve
// existing URL parameters and use a small default across shared runtime services.
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  for (const [key, configured, fallback] of [
    ["connection_limit", process.env.DB_CONNECTION_LIMIT, "3"],
    ["pool_timeout", process.env.DB_POOL_TIMEOUT, "20"],
  ] as const) {
    if (configured !== undefined && !/^[1-9]\d*$/.test(configured)) {
      throw new Error(`Invalid database pool setting: ${key}`);
    }
    if (configured !== undefined || !url.searchParams.has(key)) {
      url.searchParams.set(key, configured ?? fallback);
    }
  }
  process.env.DATABASE_URL = url.toString();
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
