/**
 * Unit tests for AppError and the centralized error handler.
 *
 * The Express request/response objects are minimal fakes — just enough to
 * verify the handler sets the right status code and response shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError, z } from "zod";
import { AppError } from "../app-error.js";
import { errorHandler } from "../error-handler.js";

vi.mock("../../observability/index.js", () => ({
  logger: {
    warn:  vi.fn(),
    error: vi.fn(),
  },
  captureException: vi.fn(),
}));

// ── Minimal Express request/response fakes ──────────────────────────────────

function makeReq(overrides: Partial<{ url: string; method: string }> = {}) {
  return { url: "/test", method: "POST", ...overrides } as any;
}

function makeRes() {
  const headers: Record<string, string> = {
    "x-request-id": "req-abc-123",
  };
  const res: any = {
    _status: 200,
    _body: null,
    headersSent: false,
    getHeader: (name: string) => headers[name.toLowerCase()],
    setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = value; },
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
  };
  return res;
}

const next = () => {};

// ── AppError factory tests ───────────────────────────────────────────────────

describe("AppError", () => {
  it("creates a 404 NOT_FOUND error", () => {
    const err = AppError.notFound("Item not found");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Item not found");
    expect(err.isOperational).toBe(true);
  });

  it("creates a 400 BAD_REQUEST error with details", () => {
    const err = AppError.badRequest("Invalid input", { field: "email" });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.details).toEqual({ field: "email" });
  });

  it("creates a 409 CONFLICT error", () => {
    const err = AppError.conflict("Duplicate email");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });

  it("creates a 403 FORBIDDEN error", () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("creates a 503 SERVICE_UNAVAILABLE that is operational", () => {
    const err = AppError.serviceUnavailable();
    expect(err.statusCode).toBe(503);
    expect(err.isOperational).toBe(true);
  });

  it("creates a 500 INTERNAL_ERROR that is non-operational", () => {
    const err = AppError.internal("DB exploded");
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
  });

  it("preserves instanceof after prototype chain fix", () => {
    const err = new AppError(418, "TEAPOT", "I am a teapot");
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

// ── errorHandler middleware tests ────────────────────────────────────────────

describe("errorHandler", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = makeReq();
    res = makeRes();
  });

  it("returns the AppError status code and body for operational errors", () => {
    const err = AppError.notFound("Session not found");
    errorHandler(err, req, res, next as any);
    expect(res._status).toBe(404);
    expect(res._body.error).toBe("Session not found");
    expect(res._body.code).toBe("NOT_FOUND");
    expect(res._body.requestId).toBe("req-abc-123");
    expect(res._body.details).toBeUndefined();
  });

  it("includes details in the response when AppError carries them", () => {
    const err = AppError.badRequest("Validation failed", [{ path: "email", msg: "invalid" }]);
    errorHandler(err, req, res, next as any);
    expect(res._status).toBe(400);
    expect(res._body.details).toEqual([{ path: "email", msg: "invalid" }]);
  });

  it("handles ZodError → 422 with issues array", () => {
    const zodErr = z.string().email().safeParse("not-an-email");
    const err = (zodErr as any).error as ZodError;
    errorHandler(err, req, res, next as any);
    expect(res._status).toBe(422);
    expect(res._body.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res._body.issues)).toBe(true);
    expect(res._body.issues.length).toBeGreaterThan(0);
  });

  it("handles Prisma P2025 (not found) → 404", () => {
    const prismaErr: any = new Error("Record not found");
    prismaErr.code = "P2025";
    errorHandler(prismaErr, req, res, next as any);
    expect(res._status).toBe(404);
    expect(res._body.code).toBe("NOT_FOUND");
  });

  it("handles Prisma P2002 (unique constraint) → 409", () => {
    const prismaErr: any = new Error("Unique constraint failed");
    prismaErr.code = "P2002";
    prismaErr.meta = { target: "email" };
    errorHandler(prismaErr, req, res, next as any);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe("CONFLICT");
    expect(res._body.error).toContain("email");
  });

  it("handles Prisma P2003 (foreign key) → 409", () => {
    const prismaErr: any = new Error("FK constraint failed");
    prismaErr.code = "P2003";
    errorHandler(prismaErr, req, res, next as any);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe("FOREIGN_KEY_VIOLATION");
  });

  it("falls back to 500 for unknown errors", () => {
    errorHandler(new Error("Something exploded"), req, res, next as any);
    expect(res._status).toBe(500);
    expect(res._body.code).toBe("INTERNAL_ERROR");
    expect(res._body.requestId).toBe("req-abc-123");
  });

  it("does nothing if headers are already sent", () => {
    res.headersSent = true;
    res.json = vi.fn();
    errorHandler(AppError.notFound("X"), req, res, next as any);
    expect(res.json).not.toHaveBeenCalled();
  });
});
