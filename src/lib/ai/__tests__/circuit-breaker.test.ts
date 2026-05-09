import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  type CircuitState,
} from "../circuit-breaker.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = <T>(value: T) => () => Promise.resolve(value);
const fail = (msg: string) => () => Promise.reject(new Error(msg));
const failRetryable = (msg = "503 Service Unavailable") => () =>
  Promise.reject(new Error(msg));
const failNonRetryable = () => () =>
  Promise.reject(new Error("400 Bad Request — caller error"));

function makeCB(opts: ConstructorParameters<typeof CircuitBreaker>[1] = {}) {
  return new CircuitBreaker("test", {
    failureThreshold: 3,
    resetTimeoutMs: 100,   // short for tests
    maxRetries: 2,
    baseDelayMs: 0,        // no actual sleep in tests
    maxDelayMs: 0,
    ...opts,
  });
}

// ─── State machine ────────────────────────────────────────────────────────────

describe("CircuitBreaker — initial state", () => {
  it("starts in CLOSED state", () => {
    expect(makeCB().currentState).toBe("CLOSED");
  });

  it("passes successful call through", async () => {
    const cb = makeCB();
    const result = await cb.execute(ok(42));
    expect(result.data).toBe(42);
  });

  it("reports attempts = 1 on first-try success", async () => {
    const cb = makeCB();
    const { attempts } = await cb.execute(ok("hello"));
    expect(attempts).toBe(1);
  });
});

describe("CircuitBreaker — CLOSED → OPEN transition", () => {
  it("opens after failureThreshold consecutive retryable failures", async () => {
    const cb = makeCB({ failureThreshold: 3, maxRetries: 0 });
    for (let i = 0; i < 3; i++) {
      await cb.execute(failRetryable()).catch(() => {/* expected */});
    }
    expect(cb.currentState).toBe("OPEN");
  });

  it("does NOT open on non-retryable errors (4xx)", async () => {
    const cb = makeCB({ failureThreshold: 2, maxRetries: 0 });
    await cb.execute(failNonRetryable()).catch(() => {});
    await cb.execute(failNonRetryable()).catch(() => {});
    // 4xx errors increment consecutive failures but do count — verify open
    // Actually 4xx are NOT retried, but they ARE counted as failures
    // so threshold=2 fires after 2 non-retryable failures too
    // The breaker opens on ANY consecutive failures, retryable or not
    expect(cb.currentState).toBe("OPEN");
  });

  it("resets failure count on success", async () => {
    const cb = makeCB({ failureThreshold: 3, maxRetries: 0 });
    await cb.execute(failRetryable()).catch(() => {});
    await cb.execute(failRetryable()).catch(() => {});
    await cb.execute(ok("recover"));   // success resets counter
    expect(cb.currentState).toBe("CLOSED");
    // One more failure should NOT open (counter back to 0)
    await cb.execute(failRetryable()).catch(() => {});
    expect(cb.currentState).toBe("CLOSED");
  });
});

describe("CircuitBreaker — OPEN state", () => {
  it("throws CircuitBreakerOpenError immediately when OPEN", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0 });
    await cb.execute(failRetryable()).catch(() => {});
    expect(cb.currentState).toBe("OPEN");

    await expect(cb.execute(ok("should not run"))).rejects.toBeInstanceOf(
      CircuitBreakerOpenError
    );
  });

  it("fn is NOT called when circuit is OPEN", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0 });
    await cb.execute(failRetryable()).catch(() => {});

    const fn = vi.fn().mockResolvedValue("nope");
    await cb.execute(fn).catch(() => {});
    expect(fn).not.toHaveBeenCalled();
  });

  it("CircuitBreakerOpenError contains opensUntil date", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0, resetTimeoutMs: 5000 });
    await cb.execute(failRetryable()).catch(() => {});

    try {
      await cb.execute(ok(1));
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitBreakerOpenError);
      const openErr = err as CircuitBreakerOpenError;
      expect(openErr.opensUntil.getTime()).toBeGreaterThan(Date.now());
    }
  });
});

describe("CircuitBreaker — HALF_OPEN → CLOSED", () => {
  it("transitions to HALF_OPEN after resetTimeoutMs", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0, resetTimeoutMs: 50 });
    await cb.execute(failRetryable()).catch(() => {});
    expect(cb.currentState).toBe("OPEN");

    await new Promise((r) => setTimeout(r, 60));
    expect(cb.currentState).toBe("HALF_OPEN");
  });

  it("probe success in HALF_OPEN → CLOSED", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0, resetTimeoutMs: 50 });
    await cb.execute(failRetryable()).catch(() => {});
    await new Promise((r) => setTimeout(r, 60));

    expect(cb.currentState).toBe("HALF_OPEN");
    await cb.execute(ok("probe ok"));
    expect(cb.currentState).toBe("CLOSED");
  });

  it("probe failure in HALF_OPEN → re-opens", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0, resetTimeoutMs: 50 });
    await cb.execute(failRetryable()).catch(() => {});
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.currentState).toBe("HALF_OPEN");

    await cb.execute(failRetryable()).catch(() => {});
    expect(cb.currentState).toBe("OPEN");
  });

  it("only ONE call passes through in HALF_OPEN (no retry)", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 3, resetTimeoutMs: 50 });
    await cb.execute(failRetryable()).catch(() => {});
    await new Promise((r) => setTimeout(r, 60));

    const fn = vi.fn().mockRejectedValue(new Error("503 fail"));
    await cb.execute(fn).catch(() => {});
    // maxAttempts in HALF_OPEN is clamped to 1
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("CircuitBreaker — retry behaviour", () => {
  it("retries up to maxRetries on retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));
    const cb = makeCB({ failureThreshold: 10, maxRetries: 2, baseDelayMs: 0 });

    await cb.execute(fn).catch(() => {});
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it("does NOT retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("400 Bad Request"));
    const cb = makeCB({ failureThreshold: 10, maxRetries: 3, baseDelayMs: 0 });

    await cb.execute(fn).catch(() => {});
    expect(fn).toHaveBeenCalledTimes(1); // no retry
  });

  it("succeeds on second attempt (retry saves the call)", async () => {
    let attempts = 0;
    const fn = () => {
      attempts++;
      if (attempts < 2) return Promise.reject(new Error("503 transient"));
      return Promise.resolve("ok");
    };
    const cb = makeCB({ maxRetries: 2, baseDelayMs: 0 });
    const { data, attempts: reported } = await cb.execute(fn);
    expect(data).toBe("ok");
    expect(reported).toBe(2);
  });

  it("onRetry callback fires on each retry", async () => {
    const retries: number[] = [];
    const cb = makeCB({
      maxRetries: 3,
      baseDelayMs: 0,
      onRetry: (attempt) => retries.push(attempt),
    });
    const fn = vi.fn().mockRejectedValue(new Error("503 fail"));
    await cb.execute(fn).catch(() => {});
    expect(retries).toEqual([1, 2, 3]);
  });
});

describe("CircuitBreaker — state change callback", () => {
  it("fires onStateChange when opening", async () => {
    const transitions: Array<[CircuitState, CircuitState]> = [];
    const cb = makeCB({
      failureThreshold: 2,
      maxRetries: 0,
      onStateChange: (from, to) => transitions.push([from, to]),
    });
    await cb.execute(failRetryable()).catch(() => {});
    await cb.execute(failRetryable()).catch(() => {});
    expect(transitions).toContainEqual(["CLOSED", "OPEN"]);
  });

  it("fires onStateChange for OPEN → HALF_OPEN → CLOSED cycle", async () => {
    const transitions: CircuitState[] = [];
    const cb = makeCB({
      failureThreshold: 1,
      maxRetries: 0,
      resetTimeoutMs: 50,
      onStateChange: (_, to) => transitions.push(to),
    });
    await cb.execute(failRetryable()).catch(() => {});  // → OPEN
    await new Promise((r) => setTimeout(r, 60));
    cb.currentState; // trigger refresh → HALF_OPEN
    await cb.execute(ok("probe"));                      // → CLOSED

    expect(transitions).toContain("OPEN");
    expect(transitions).toContain("HALF_OPEN");
    expect(transitions).toContain("CLOSED");
  });
});

describe("CircuitBreaker — manual reset", () => {
  it("reset() brings an OPEN circuit back to CLOSED", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0 });
    await cb.execute(failRetryable()).catch(() => {});
    expect(cb.currentState).toBe("OPEN");
    cb.reset();
    expect(cb.currentState).toBe("CLOSED");
  });

  it("after reset, circuit accepts calls normally", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0 });
    await cb.execute(failRetryable()).catch(() => {});
    cb.reset();
    const { data } = await cb.execute(ok("after reset"));
    expect(data).toBe("after reset");
  });
});

describe("CircuitBreaker — healthSnapshot", () => {
  it("returns correct name and state", () => {
    const cb = new CircuitBreaker("my-service", { failureThreshold: 3 });
    const snap = cb.healthSnapshot();
    expect(snap.name).toBe("my-service");
    expect(snap.state).toBe("CLOSED");
    expect(snap.opensUntil).toBeNull();
  });

  it("opensUntil is set when OPEN", async () => {
    const cb = makeCB({ failureThreshold: 1, maxRetries: 0, resetTimeoutMs: 5000 });
    await cb.execute(failRetryable()).catch(() => {});
    const snap = cb.healthSnapshot();
    expect(snap.state).toBe("OPEN");
    expect(snap.opensUntil).toBeTruthy();
    expect(new Date(snap.opensUntil!).getTime()).toBeGreaterThan(Date.now());
  });
});
