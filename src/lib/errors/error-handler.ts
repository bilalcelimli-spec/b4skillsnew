/**
 * Centralized Express error handler.
 *
 * Register as the LAST middleware in server.ts:
 *   app.use(errorHandler);
 *
 * Handles:
 *   - AppError   → structured JSON with the right HTTP status
 *   - Prisma P2025 (not found) → 404
 *   - Prisma P2002 (unique constraint) → 409
 *   - Zod ZodError → 422 (safety net; validate() already handles these)
 *   - Everything else → 500 with a generic message (original error logged)
 *
 * Every response includes `requestId` from the X-Request-Id header so
 * callers can correlate errors with server logs.
 */

import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../observability/index.js";
import { AppError } from "./app-error.js";

/** Prisma error codes we recognise. */
const PRISMA_NOT_FOUND = "P2025";
const PRISMA_UNIQUE_VIOLATION = "P2002";
const PRISMA_FOREIGN_KEY = "P2003";

function requestId(res: Response): string | undefined {
  return (res.getHeader("x-request-id") as string) || undefined;
}

/**
 * Four-argument Express error handler — must have exactly 4 parameters so
 * Express identifies it as an error-handling middleware.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (res.headersSent) return;

  const reqId = requestId(res);

  // ── AppError (our typed operational errors) ────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(
        { err, reqId, url: req.url, method: req.method },
        `AppError (non-operational): ${err.message}`
      );
    } else {
      logger.warn(
        { code: err.code, statusCode: err.statusCode, reqId, url: req.url },
        `AppError: ${err.message}`
      );
    }
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
      requestId: reqId,
    });
    return;
  }

  // ── Zod validation errors (safety net — validate() handles most of these) ──
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    }));
    logger.warn({ issues, reqId, url: req.url }, "Unhandled ZodError in error handler");
    res.status(422).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      issues,
      requestId: reqId,
    });
    return;
  }

  // ── Prisma errors ──────────────────────────────────────────────────────
  const prismaCode = (err as any)?.code as string | undefined;
  if (prismaCode) {
    if (prismaCode === PRISMA_NOT_FOUND) {
      logger.warn({ reqId, url: req.url, prismaCode }, "Prisma record not found");
      res.status(404).json({
        error: "Resource not found",
        code: "NOT_FOUND",
        requestId: reqId,
      });
      return;
    }
    if (prismaCode === PRISMA_UNIQUE_VIOLATION) {
      const field = (err as any)?.meta?.target ?? "field";
      logger.warn({ reqId, url: req.url, field }, "Prisma unique constraint violation");
      res.status(409).json({
        error: `A record with this ${field} already exists`,
        code: "CONFLICT",
        requestId: reqId,
      });
      return;
    }
    if (prismaCode === PRISMA_FOREIGN_KEY) {
      logger.warn({ reqId, url: req.url, prismaCode }, "Prisma foreign key constraint");
      res.status(409).json({
        error: "Referenced resource does not exist",
        code: "FOREIGN_KEY_VIOLATION",
        requestId: reqId,
      });
      return;
    }
  }

  // ── Fallback: unknown / programmer errors ──────────────────────────────
  logger.error(
    { err, reqId, url: req.url, method: req.method },
    "Unhandled request error"
  );
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    requestId: reqId,
  });
}
