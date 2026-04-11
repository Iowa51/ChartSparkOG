// Tests for the CircuitBreaker / withTimeout / withRetry primitives
// in src/lib/resilience/circuit-breaker.ts.
//
// Runs in Node env because the module uses setTimeout directly and the
// tests rely on vitest fake timers — jsdom's timer semantics are fine
// too but node is slightly faster and more predictable.

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  TimeoutError,
  withRetry,
  withTimeout,
} from "@/lib/resilience/circuit-breaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts closed and returns the wrapped value on success", async () => {
    const cb = new CircuitBreaker({ name: "test" });
    expect(cb.getState()).toBe("closed");
    const result = await cb.execute(async () => 42);
    expect(result).toBe(42);
    expect(cb.getState()).toBe("closed");
  });

  it("propagates errors and stays closed below the failure threshold", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 5, failureWindowMs: 60_000 });
    for (let i = 0; i < 4; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error(`boom ${i}`);
        }),
      ).rejects.toThrow("boom");
    }
    expect(cb.getState()).toBe("closed");
  });

  it("opens after 5 consecutive failures within the window", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      failureThreshold: 5,
      failureWindowMs: 60_000,
      openDurationMs: 30_000,
    });
    for (let i = 0; i < 5; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("open");
  });

  it("rejects immediately with CircuitBreakerOpenError when open and does not call fn", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 3, openDurationMs: 30_000 });
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("open");

    const fn = vi.fn(async () => "should-not-run");
    await expect(cb.execute(fn)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("resets the streak if consecutive failures are slower than the window", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 5, failureWindowMs: 60_000 });
    for (let i = 0; i < 4; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    // Advance past the window — the next failure starts a fresh streak.
    vi.advanceTimersByTime(61_000);
    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    expect(cb.getState()).toBe("closed");
  });

  it("resets the failure counter on a successful call", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 5 });
    for (let i = 0; i < 4; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    // One success wipes the streak.
    await cb.execute(async () => "ok");
    // Four more failures should still keep us in closed.
    for (let i = 0; i < 4; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("closed");
  });

  it("transitions open → half-open after the open window elapses", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 3, openDurationMs: 30_000 });
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("open");
    vi.advanceTimersByTime(30_001);
    expect(cb.getState()).toBe("half-open");
  });

  it("closes the circuit on a successful half-open probe", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 3, openDurationMs: 30_000 });
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    vi.advanceTimersByTime(30_001);
    const result = await cb.execute(async () => "healthy");
    expect(result).toBe("healthy");
    expect(cb.getState()).toBe("closed");
  });

  it("reopens for another full window when a half-open probe fails", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 3, openDurationMs: 30_000 });
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    vi.advanceTimersByTime(30_001);
    expect(cb.getState()).toBe("half-open");

    await expect(
      cb.execute(async () => {
        throw new Error("still broken");
      }),
    ).rejects.toThrow("still broken");
    expect(cb.getState()).toBe("open");

    // Still open 29s later.
    vi.advanceTimersByTime(29_000);
    expect(cb.getState()).toBe("open");
    // Half-open again after a fresh 30s window.
    vi.advanceTimersByTime(2_000);
    expect(cb.getState()).toBe("half-open");
  });

  it("fires onStateChange on transitions", async () => {
    const transitions: Array<{ from: string; to: string }> = [];
    const cb = new CircuitBreaker({
      name: "test",
      failureThreshold: 3,
      openDurationMs: 30_000,
      onStateChange: (from, to) => transitions.push({ from, to }),
    });
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    expect(transitions).toContainEqual({ from: "closed", to: "open" });
    vi.advanceTimersByTime(30_001);
    cb.getState(); // forces the open → half-open check
    expect(transitions).toContainEqual({ from: "open", to: "half-open" });
  });

  it("reset() returns the breaker to a clean closed state", async () => {
    const cb = new CircuitBreaker({ name: "test", failureThreshold: 3, openDurationMs: 30_000 });
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");
    await expect(cb.execute(async () => "ok")).resolves.toBe("ok");
  });
});

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the wrapped value when the promise settles in time", async () => {
    await expect(withTimeout(Promise.resolve("done"), 1000)).resolves.toBe("done");
  });

  it("rejects with TimeoutError when the deadline elapses", async () => {
    const neverResolves = new Promise<string>(() => {});
    const p = withTimeout(neverResolves, 1000);
    // Catch to suppress the unhandled-rejection warning between advance + expect.
    p.catch(() => {});
    vi.advanceTimersByTime(1001);
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });

  it("propagates rejection from the wrapped promise without waiting for the timer", async () => {
    await expect(withTimeout(Promise.reject(new Error("inner fail")), 1000)).rejects.toThrow(
      "inner fail",
    );
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns on first success without retrying", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries with exponential backoff and returns success on a later attempt", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new Error(`fail ${calls}`);
      return "eventually-ok";
    });

    const resultPromise = withRetry(fn, { maxRetries: 2, baseDelayMs: 1000 });
    // Drain backoff timers so the retry chain can complete.
    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("eventually-ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error after exhausting all retries", async () => {
    const fn = vi.fn(async () => {
      throw new Error("always fails");
    });
    const resultPromise = withRetry(fn, { maxRetries: 2, baseDelayMs: 1000 });
    resultPromise.catch(() => {}); // suppress unhandled-rejection noise
    await vi.runAllTimersAsync();

    await expect(resultPromise).rejects.toThrow("always fails");
    // 1 initial attempt + 2 retries = 3 total calls.
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("honors shouldRetry to short-circuit after the first failure", async () => {
    const fn = vi.fn(async () => {
      throw new Error("nope");
    });
    await expect(
      withRetry(fn, {
        maxRetries: 5,
        baseDelayMs: 1000,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow("nope");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
