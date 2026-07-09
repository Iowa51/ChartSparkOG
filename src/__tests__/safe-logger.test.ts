// src/__tests__/safe-logger.test.ts
// TEST-CRIT-01: Priority test suite — PHI-safe logging utilities
// Tests that the safe-logger properly sanitizes sensitive data from logs.

import { describe, it, expect } from "vitest";
import { sanitizeError } from "@/lib/logging/safe-logger";

describe("sanitizeError", () => {
  it("extracts message from Error objects", () => {
    const result = sanitizeError(new Error("Something went wrong"));
    expect(result).toContain("Something went wrong");
  });

  it("surfaces string errors (bounded) instead of swallowing them", () => {
    // Contract (see sanitizeError JSDoc): non-Error inputs are surfaced,
    // truncated, for debuggability. The pre-2026-04-16 'Unknown error'
    // swallow (commit a75a993) was a bug that hid every Supabase error
    // across the codebase. PHI risk is contained by (a) dropping the
    // known-dangerous fields — Supabase `details`, Error stacks — and
    // (b) a hard length ceiling, NOT by discarding all content. Error
    // messages are likewise surfaced (see the first test), so blocking
    // strings would be inconsistent.
    const result = sanitizeError("string error");
    expect(result).toBe("string error");
    // Arbitrary strings are truncated to 200 chars (exposure ceiling).
    expect(sanitizeError("x".repeat(500))).toHaveLength(200);
  });

  it("handles null/undefined", () => {
    expect(sanitizeError(null)).toBeDefined();
    expect(sanitizeError(undefined)).toBeDefined();
  });

  it("handles object errors", () => {
    const result = sanitizeError({ message: "object error", code: "ERR_01" });
    expect(typeof result).toBe("string");
  });

  it("does not expose stack traces in returned value", () => {
    const error = new Error("test error");
    error.stack = "Error: test error\n    at /secret/path/file.ts:42:10";
    const result = sanitizeError(error);
    // The sanitized result should not contain file paths
    expect(result).not.toContain("/secret/path");
  });
});
