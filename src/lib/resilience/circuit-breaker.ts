// src/lib/resilience/circuit-breaker.ts
//
// Reusable circuit breaker for wrapping async operations against flaky
// external dependencies. Provides three primitives that compose cleanly:
//
//   - CircuitBreaker class (stateful, tracks consecutive failures)
//   - withTimeout(promise, ms)   — reject after a deadline
//   - withRetry(fn, opts)        — retry with exponential backoff
//
// Typical usage at a call site:
//
//   await breaker.execute(() =>
//     withRetry(
//       () => withTimeout(externalCall(), 30_000),
//       { maxRetries: 2, baseDelayMs: 1000 },
//     ),
//   );
//
// The retry lives *inside* the breaker so that a full retry sequence
// counts as a single failure — otherwise flaky transient errors would
// trip the breaker at 1/Nth the intended rate.

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Human-readable name used in error messages and logs. */
  name?: string;
  /** Consecutive failures within the window that trip the breaker. Default 5. */
  failureThreshold?: number;
  /** Window in ms — failures older than this are no longer "consecutive". Default 60_000. */
  failureWindowMs?: number;
  /** How long the breaker stays open before allowing a probe. Default 30_000. */
  openDurationMs?: number;
  /** Optional hook fired on any state transition. Listener errors are swallowed. */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/** Thrown when execute() is called while the breaker is open. */
export class CircuitBreakerOpenError extends Error {
  readonly circuitName: string;
  readonly retryAfterMs: number;
  constructor(circuitName: string, retryAfterMs: number) {
    super(
      `Circuit breaker "${circuitName}" is open; request rejected. Retry after ${retryAfterMs}ms.`,
    );
    this.name = "CircuitBreakerOpenError";
    this.circuitName = circuitName;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly failureWindowMs: number;
  private readonly openDurationMs: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private firstFailureTimestampMs: number | null = null;
  private openedAtMs: number | null = null;
  private halfOpenInFlight = false;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name ?? "unnamed";
    this.failureThreshold = options.failureThreshold ?? 5;
    this.failureWindowMs = options.failureWindowMs ?? 60_000;
    this.openDurationMs = options.openDurationMs ?? 30_000;
    this.onStateChange = options.onStateChange;
  }

  /** Read the current state. May transition open → half-open if the open window has elapsed. */
  getState(): CircuitState {
    this.maybeTransitionToHalfOpen();
    return this.state;
  }

  /** Force the breaker back to a closed, zero-failure state. Intended for tests and admin controls. */
  reset(): void {
    this.consecutiveFailures = 0;
    this.firstFailureTimestampMs = null;
    this.openedAtMs = null;
    this.halfOpenInFlight = false;
    this.transitionTo("closed");
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTransitionToHalfOpen();

    if (this.state === "open") {
      const openedAt = this.openedAtMs ?? Date.now();
      const retryAfter = Math.max(0, this.openDurationMs - (Date.now() - openedAt));
      throw new CircuitBreakerOpenError(this.name, retryAfter);
    }

    // In half-open, only one concurrent probe is allowed. This check + set is
    // synchronous so it's safe on Node's single-threaded event loop.
    if (this.state === "half-open") {
      if (this.halfOpenInFlight) {
        throw new CircuitBreakerOpenError(this.name, this.openDurationMs);
      }
      this.halfOpenInFlight = true;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    } finally {
      this.halfOpenInFlight = false;
    }
  }

  private recordSuccess(): void {
    if (this.state === "half-open") {
      // Probe succeeded → close the circuit and clear counters.
      this.consecutiveFailures = 0;
      this.firstFailureTimestampMs = null;
      this.openedAtMs = null;
      this.transitionTo("closed");
      return;
    }
    // Closed state success resets the consecutive-failure streak.
    this.consecutiveFailures = 0;
    this.firstFailureTimestampMs = null;
  }

  private recordFailure(): void {
    if (this.state === "half-open") {
      // Probe failed → reopen for another full window.
      this.openedAtMs = Date.now();
      this.transitionTo("open");
      return;
    }

    const now = Date.now();

    // If the prior streak's first failure is outside the window,
    // start a fresh streak instead of continuing the old one.
    if (
      this.firstFailureTimestampMs === null ||
      now - this.firstFailureTimestampMs > this.failureWindowMs
    ) {
      this.firstFailureTimestampMs = now;
      this.consecutiveFailures = 1;
    } else {
      this.consecutiveFailures += 1;
    }

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAtMs = now;
      this.transitionTo("open");
    }
  }

  private maybeTransitionToHalfOpen(): void {
    if (this.state !== "open" || this.openedAtMs === null) return;
    if (Date.now() - this.openedAtMs >= this.openDurationMs) {
      this.transitionTo("half-open");
    }
  }

  private transitionTo(next: CircuitState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    if (this.onStateChange) {
      try {
        this.onStateChange(prev, next);
      } catch {
        // Listener errors must not affect circuit operation. Intentionally
        // silent — the listener is observer code, not circuit code.
      }
    }
  }
}

// ─────────────────────────── Timeout helper ───────────────────────────

export class TimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Race `promise` against a deadline. Resolves with the inner value, or
 * rejects with `TimeoutError` after `timeoutMs`. A non-positive or
 * non-finite timeout disables the race (useful for tests).
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0 || !Number.isFinite(timeoutMs)) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// ─────────────────────────── Retry helper ───────────────────────────

export interface RetryOptions {
  /** Additional attempts after the first. Default 2 (total 3 attempts). */
  maxRetries?: number;
  /** Delay before the first retry; each subsequent delay is doubled. Default 1000. */
  baseDelayMs?: number;
  /** Upper bound on the exponential backoff. Default 10_000. */
  maxDelayMs?: number;
  /** Decide whether an error is worth retrying. Default: always retry. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

/**
 * Run `fn` with exponential backoff. Returns on first success; throws
 * the final error if every attempt fails. Caller-controlled retry
 * decision via `shouldRetry`.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !shouldRetry(err, attempt)) {
        throw err;
      }
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
    }
  }
  // Defensive — the loop above always returns or throws, but TS wants a tail.
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
