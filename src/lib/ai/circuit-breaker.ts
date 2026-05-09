/**
 * Circuit Breaker for Gemini API
 *
 * Implements a standard three-state circuit breaker (CLOSED → OPEN → HALF_OPEN)
 * with per-instance configuration and optional Sentry integration.
 *
 * States:
 *   CLOSED     — Normal operation; failures are counted.
 *   OPEN       — Fast-fail; no calls pass through for `resetTimeoutMs`.
 *   HALF_OPEN  — One probe call is allowed; success → CLOSED, failure → OPEN.
 *
 * Retry strategy (applied while CLOSED, before the breaker trips):
 *   Exponential backoff: baseDelayMs * 2^attempt, capped at maxDelayMs.
 *   429 responses: honour Retry-After header if present.
 *   5xx responses: retried up to maxRetries.
 *   4xx (non-429): NOT retried — treat as a caller error.
 *
 * References:
 *   Nygard (2007) "Release It!", ch. 5 — Circuit Breaker pattern
 *   van der Linden / Alvarez (2023) — Resilience patterns for LLM APIs
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before tripping to OPEN. Default: 3 */
  failureThreshold?: number;
  /** Milliseconds to stay OPEN before moving to HALF_OPEN. Default: 60_000 */
  resetTimeoutMs?: number;
  /** Maximum retry attempts while CLOSED. Default: 3 */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms). Default: 1_000 */
  baseDelayMs?: number;
  /** Maximum delay cap (ms). Default: 30_000 */
  maxDelayMs?: number;
  /** Called on state transitions for observability. */
  onStateChange?: (from: CircuitState, to: CircuitState, reason: string) => void;
  /** Called on each retry attempt. */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export interface CircuitBreakerResult<T> {
  data: T;
  attempts: number;
  totalDelayMs: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly name: string, public readonly opensUntil: Date) {
    super(`Circuit "${name}" is OPEN until ${opensUntil.toISOString()}`);
    this.name = "CircuitBreakerOpenError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract Retry-After seconds from an error if it came from an HTTP response. */
function extractRetryAfterMs(error: unknown): number | null {
  if (error instanceof Error) {
    const match = error.message.match(/retry[- ]after[:\s]+(\d+)/i);
    if (match) return parseInt(match[1], 10) * 1000;
  }
  return null;
}

/** Return true if the error looks like a transient server/network failure. */
function isRetryable(error: unknown): boolean {
  if (error instanceof CircuitBreakerOpenError) return false;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // 429 Too Many Requests or 5xx
    if (/429|too many requests/.test(msg)) return true;
    if (/5\d\d|internal server error|bad gateway|service unavailable|gateway timeout/.test(msg)) return true;
    // Network-level failures
    if (/network|econnreset|econnrefused|etimedout|socket hang up|fetch failed/.test(msg)) return true;
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── CircuitBreaker class ─────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private openUntil: number = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly onStateChange?: CircuitBreakerOptions["onStateChange"];
  private readonly onRetry?: CircuitBreakerOptions["onRetry"];

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 60_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
    this.onStateChange = options.onStateChange;
    this.onRetry = options.onRetry;
  }

  get currentState(): CircuitState {
    this.refreshHalfOpen();
    return this.state;
  }

  /** Expose open-until timestamp for health reporting */
  get opensUntil(): Date | null {
    return this.state === "OPEN" ? new Date(this.openUntil) : null;
  }

  private refreshHalfOpen(): void {
    if (this.state === "OPEN" && Date.now() >= this.openUntil) {
      this.transition("HALF_OPEN", "resetTimeout elapsed");
    }
  }

  private transition(to: CircuitState, reason: string): void {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    this.onStateChange?.(from, to, reason);
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state === "HALF_OPEN") {
      this.transition("CLOSED", "probe call succeeded");
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.state === "HALF_OPEN") {
      // Single failure in half-open → re-open
      this.openUntil = Date.now() + this.resetTimeoutMs;
      this.transition("OPEN", "probe call failed");
      return;
    }
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openUntil = Date.now() + this.resetTimeoutMs;
      this.transition("OPEN", `${this.consecutiveFailures} consecutive failures`);
    }
  }

  /**
   * Execute `fn` through the circuit breaker with automatic retry + backoff.
   *
   * Throws `CircuitBreakerOpenError` when the circuit is OPEN.
   * Throws the last error when all retries are exhausted.
   */
  async execute<T>(fn: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    this.refreshHalfOpen();

    if (this.state === "OPEN") {
      throw new CircuitBreakerOpenError(this.name, new Date(this.openUntil));
    }

    let lastError: unknown;
    let totalDelayMs = 0;

    const maxAttempts = this.state === "HALF_OPEN" ? 1 : this.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const data = await fn();
        this.recordSuccess();
        return { data, attempts: attempt + 1, totalDelayMs };
      } catch (err) {
        lastError = err;

        if (!isRetryable(err) || attempt === maxAttempts - 1) {
          // Non-retryable or last attempt → record failure and re-throw
          this.recordFailure();
          throw err;
        }

        // Calculate backoff delay
        const retryAfterMs = extractRetryAfterMs(err);
        const backoffMs = Math.min(
          this.baseDelayMs * Math.pow(2, attempt),
          this.maxDelayMs
        );
        const delayMs = retryAfterMs ?? backoffMs;

        this.onRetry?.(attempt + 1, delayMs, err);
        totalDelayMs += delayMs;
        await sleep(delayMs);
      }
    }

    // Should not reach here, but satisfy TS
    this.recordFailure();
    throw lastError;
  }

  /** Reset to CLOSED (useful for tests or manual recovery). */
  reset(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
    this.transition("CLOSED", "manual reset");
  }

  /** Snapshot for health endpoint / observability. */
  healthSnapshot(): {
    name: string;
    state: CircuitState;
    consecutiveFailures: number;
    opensUntil: string | null;
  } {
    this.refreshHalfOpen();
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      opensUntil: this.opensUntil?.toISOString() ?? null,
    };
  }
}

// ─── Singleton breakers (one per Gemini call type) ───────────────────────────

function makeOnStateChange(name: string) {
  return (from: CircuitState, to: CircuitState, reason: string) => {
    const severity = to === "OPEN" ? "error" : to === "HALF_OPEN" ? "warn" : "info";
    const msg = `[CircuitBreaker:${name}] ${from} → ${to} — ${reason}`;
    if (severity === "error") console.error(msg);
    else if (severity === "warn") console.warn(msg);
    else console.info(msg);

    // Sentry integration (non-blocking; only imported in server context)
    if (to === "OPEN") {
      import("@sentry/node")
        .then(({ captureMessage }) =>
          captureMessage(msg, { level: "error", tags: { circuit: name } })
        )
        .catch(() => {/* Sentry unavailable — ignore */});
    }
  };
}

function makeOnRetry(name: string) {
  return (attempt: number, delayMs: number, error: unknown) => {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[CircuitBreaker:${name}] retry ${attempt} in ${delayMs}ms — ${errMsg.slice(0, 120)}`
    );
  };
}

const BREAKER_DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

export const geminiScoringBreaker = new CircuitBreaker("gemini-scoring", {
  ...BREAKER_DEFAULTS,
  onStateChange: makeOnStateChange("gemini-scoring"),
  onRetry: makeOnRetry("gemini-scoring"),
});

export const geminiGenerationBreaker = new CircuitBreaker("gemini-generation", {
  ...BREAKER_DEFAULTS,
  onStateChange: makeOnStateChange("gemini-generation"),
  onRetry: makeOnRetry("gemini-generation"),
});

export const geminiValidationBreaker = new CircuitBreaker("gemini-validation", {
  ...BREAKER_DEFAULTS,
  failureThreshold: 5,   // validation gates are less critical — more tolerance
  onStateChange: makeOnStateChange("gemini-validation"),
  onRetry: makeOnRetry("gemini-validation"),
});

/** Aggregate health for all managed breakers (used by /healthz). */
export function allBreakersHealth(): ReturnType<CircuitBreaker["healthSnapshot"]>[] {
  return [
    geminiScoringBreaker.healthSnapshot(),
    geminiGenerationBreaker.healthSnapshot(),
    geminiValidationBreaker.healthSnapshot(),
  ];
}
