// Integration tests for POST /api/ai/transcribe-and-generate
//
// All external services (Azure OpenAI Whisper + chat, Supabase, audit sinks)
// are mocked. These tests must never perform real network I/O.
//
// This file runs in the Node environment (overriding the project-wide
// `jsdom` default). The route is server-side code that uses Node's `File`
// from undici and calls `.arrayBuffer()` on the upload — jsdom's File
// implementation is incomplete and does not support `.arrayBuffer()`.

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

const authMockState = vi.hoisted(() => ({ authenticated: true }));

vi.mock("@/lib/auth/api-auth", () => ({
  withAuth: (handler: (ctx: unknown) => Promise<unknown>) => {
    return async (request: unknown) => {
      if (!authMockState.authenticated) {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
      }
      return handler({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          role: "USER",
          organizationId: "test-org-id",
        },
        request,
      });
    };
  },
}));

vi.mock("@/services/safeAzureOpenAI", () => ({
  default: {
    isAvailable: vi.fn(() => true),
    transcribeAudio: vi.fn(async () => ({
      transcript: "Patient reports intermittent headache for 3 days, rated 6 out of 10.",
      isDemo: false,
      processingTime: "0.5s",
    })),
    generateSOAPNote: vi.fn(async () =>
      [
        "SUBJECTIVE",
        "Patient reports intermittent headache for 3 days.",
        "",
        "OBJECTIVE",
        "BP 120/80, HR 72.",
        "",
        "ASSESSMENT",
        "Tension-type headache.",
        "",
        "PLAN",
        "Ibuprofen PRN. Follow up in 1 week.",
      ].join("\n"),
    ),
  },
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/billing/code-analyzer", () => ({
  analyzeNoteForCodes: vi.fn(() => ({
    cpt: [],
    icd10: [],
    cptDetails: [],
    icd10Details: [],
  })),
}));

vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));

import { POST } from "@/app/api/ai/transcribe-and-generate/route";

// Must mirror MAX_AUDIO_SIZE in the route (25 MB).
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

function makeFile(size: number, mimeType = "audio/webm"): File {
  // Construct a real File so the route's `instanceof File` guard passes.
  // Start with an empty byte payload and override `.size` via defineProperty —
  // this avoids allocating 25 MB+ of buffer just to test the oversize branch.
  const file = new File([new Uint8Array(0)], "recording.webm", { type: mimeType });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

function makeFormDataRequest(fields: Record<string, unknown>): unknown {
  return {
    method: "POST",
    headers: new Headers({
      "x-real-ip": "127.0.0.1",
      "user-agent": "vitest",
    }),
    url: "http://localhost:3000/api/ai/transcribe-and-generate",
    formData: async () => ({
      get: (key: string) => (key in fields ? fields[key] : null),
    }),
  };
}

describe("POST /api/ai/transcribe-and-generate", () => {
  beforeEach(() => {
    authMockState.authenticated = true;
    vi.clearAllMocks();
  });

  it("returns transcript and SOAP sections for a valid audio file", async () => {
    const req = makeFormDataRequest({
      audio: makeFile(1024, "audio/webm"),
      templateFormat: "soap",
    });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      transcript: string;
      sections: Record<string, string>;
    };
    expect(json.success).toBe(true);
    expect(json.transcript).toMatch(/headache/i);
    expect(json.sections).toBeDefined();
    expect(Object.keys(json.sections)).toEqual(
      expect.arrayContaining(["subjective", "objective", "assessment", "plan"]),
    );
  });

  it("returns 400 when no audio file is provided", async () => {
    const req = makeFormDataRequest({
      templateFormat: "soap",
    });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBeDefined();
  });

  it("returns 400 when the audio file exceeds the maximum size", async () => {
    const req = makeFormDataRequest({
      audio: makeFile(MAX_AUDIO_SIZE + 1, "audio/webm"),
    });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBeDefined();
  });
});
