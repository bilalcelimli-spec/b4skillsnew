/**
 * AppError — typed operational error that carries an HTTP status code and an
 * application-level error code. Throw from route handlers and service methods;
 * the centralized error handler converts these into structured JSON responses
 * with correct status codes so individual handlers don't need their own
 * res.status().json() calls.
 *
 * Usage:
 *   throw AppError.notFound("Item not found");
 *   throw AppError.forbidden("Not allowed to access this resource");
 *   throw new AppError(422, "VALIDATION_FAILED", "Invalid CEFR level");
 */

export class AppError extends Error {
  readonly statusCode: number;
  /** Machine-readable error code for API clients. */
  readonly code: string;
  /** True for expected errors; false means a programmer mistake or infra fault. */
  readonly isOperational: boolean;
  /** Optional structured details (e.g. validation issues array). */
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { isOperational?: boolean; details?: unknown; cause?: Error }
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // ── Factory helpers ────────────────────────────────────────────────────────

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, "BAD_REQUEST", message, { details });
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Insufficient permissions"): AppError {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(409, "CONFLICT", message, { details });
  }

  static unprocessable(message: string, details?: unknown): AppError {
    return new AppError(422, "UNPROCESSABLE", message, { details });
  }

  static tooManyRequests(message = "Too many requests"): AppError {
    return new AppError(429, "RATE_LIMITED", message);
  }

  static serviceUnavailable(message = "Service temporarily unavailable"): AppError {
    return new AppError(503, "SERVICE_UNAVAILABLE", message, { isOperational: true });
  }

  static internal(message = "Internal server error", cause?: Error): AppError {
    return new AppError(500, "INTERNAL_ERROR", message, { isOperational: false, cause });
  }
}
