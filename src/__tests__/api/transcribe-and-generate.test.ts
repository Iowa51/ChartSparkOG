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

// The grounding data layer hits Supabase; mocked so tests stay offline.
// Defaults model the no-patient case; grounded tests override per call.
vi.mock("@/lib/data/vitals", () => ({
  getPatientLatestVitals: vi.fn(async () => null),
}));

vi.mock("@/lib/data/patient-context", () => ({
  getPatientContextForAI: vi.fn(async () => null),
  formatPatientContextForPrompt: vi.fn(() => "PATIENT_CONTEXT_BLOCK"),
}));

import { POST } from "@/app/api/ai/transcribe-and-generate/route";
import safeAzureOpenAI from "@/services/safeAzureOpenAI";
import { analyzeNoteForCodes } from "@/lib/billing/code-analyzer";
import { getPatientContextForAI } from "@/lib/data/patient-context";
import { getPatientLatestVitals } from "@/lib/data/vitals";

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

  describe("grounding parity with /api/ai/generate-note", () => {
    const PATIENT_UUID = "123e4567-e89b-12d3-a456-426614174000";

    type SuggestedCode = { code: string; description: string; source: string };
    type GroundedResponse = {
      success: boolean;
      grounded: boolean;
      suggestedCodes: { cpt: SuggestedCode[]; icd10: SuggestedCode[] };
    };

    function makePatientContext() {
      return {
        demographics: { age: 41, sex: "Female" },
        medications: [{ name: "Sertraline", dosage: "50mg", frequency: "daily" }],
        allergies: [],
        problems: [
          { problem: "Major depressive disorder, recurrent, moderate", icd10_code: "F33.1" },
          // Same code recorded twice (case/whitespace variant) — must dedup.
          { problem: "Duplicate problem row", icd10_code: " f33.1 " },
        ],
      };
    }

    it("injects patient context and vitals into the SOAP prompt and flags grounded", async () => {
      vi.mocked(getPatientContextForAI).mockResolvedValueOnce(makePatientContext());
      vi.mocked(getPatientLatestVitals).mockResolvedValueOnce({
        bp_systolic: 120,
        bp_diastolic: 80,
        heart_rate: 72,
        temperature: null,
        temperature_unit: null,
        respiratory_rate: null,
        spo2: null,
        bmi: null,
        recorded_at: "2026-06-01T09:00:00Z",
      });

      const req = makeFormDataRequest({
        audio: makeFile(1024),
        templateFormat: "soap",
        patientId: PATIENT_UUID,
      });
      const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as GroundedResponse;
      expect(json.grounded).toBe(true);
      expect(vi.mocked(getPatientContextForAI)).toHaveBeenCalledWith(PATIENT_UUID, "test-org-id");

      const sessionArg = vi.mocked(safeAzureOpenAI.generateSOAPNote).mock.calls.at(0)?.[0];
      expect(sessionArg?.patientContext).toBe("PATIENT_CONTEXT_BLOCK");
      expect(sessionArg?.vitalsContext).toContain("120/80 mmHg");
      expect(sessionArg?.vitalsContext).toContain("72 bpm");
    });

    it("merges active-problem codes with dictation-matched codes, active_problem winning dedup", async () => {
      vi.mocked(getPatientContextForAI).mockResolvedValueOnce(makePatientContext());
      vi.mocked(analyzeNoteForCodes).mockReturnValueOnce({
        cpt: ["90834"],
        icd10: ["F33.1", "F41.1"],
        cptDetails: [
          {
            code: "90834",
            type: "cpt",
            title: "Psychotherapy, 45 minutes",
            description: "Psychotherapy, 45 minutes with patient",
            score: 5,
            matchedKeywords: ["therapy"],
          },
        ],
        icd10Details: [
          {
            // Also an active problem — the active_problem entry must win.
            code: "f33.1",
            type: "icd10",
            title: "Major depressive disorder, recurrent, moderate",
            description: "MDD recurrent moderate",
            score: 4,
            matchedKeywords: ["depress"],
          },
          {
            code: "F41.1",
            type: "icd10",
            title: "Generalized anxiety disorder",
            description: "GAD",
            score: 3,
            matchedKeywords: ["anxiety"],
          },
        ],
      });

      const req = makeFormDataRequest({
        audio: makeFile(1024),
        templateFormat: "soap",
        patientId: PATIENT_UUID,
      });
      const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as GroundedResponse;
      expect(json.suggestedCodes.icd10).toEqual([
        {
          code: "F33.1",
          description: "Major depressive disorder, recurrent, moderate",
          source: "active_problem",
        },
        {
          code: "F41.1",
          description: "Generalized anxiety disorder",
          source: "clinician_input",
        },
      ]);
      expect(json.suggestedCodes.cpt).toEqual([
        {
          code: "90834",
          description: "Psychotherapy, 45 minutes",
          source: "clinician_input",
        },
      ]);
    });

    it("keyword-matches codes against the transcript and phrases, not the AI output", async () => {
      const req = makeFormDataRequest({
        audio: makeFile(1024),
        templateFormat: "soap",
        selectedPhrases: JSON.stringify({ Objective: ["calm affect"] }),
      });
      await (POST as unknown as (r: unknown) => Promise<Response>)(req);

      const analysisArg = vi.mocked(analyzeNoteForCodes).mock.calls.at(0)?.[0];
      expect(analysisArg?.fullContent).toContain("intermittent headache for 3 days");
      expect(analysisArg?.fullContent).toContain("calm affect");
      // "Ibuprofen" appears only in the mocked AI-generated note; matching it
      // would mean codes are driven by AI output again (the closed gap).
      expect(analysisArg?.fullContent).not.toContain("Ibuprofen");
    });

    it("returns grounded: false and skips the context fetch when patientId is absent", async () => {
      const req = makeFormDataRequest({
        audio: makeFile(1024),
        templateFormat: "soap",
      });
      const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as GroundedResponse;
      expect(json.success).toBe(true);
      expect(json.grounded).toBe(false);
      expect(vi.mocked(getPatientContextForAI)).not.toHaveBeenCalled();
      expect(vi.mocked(getPatientLatestVitals)).not.toHaveBeenCalled();

      const sessionArg = vi.mocked(safeAzureOpenAI.generateSOAPNote).mock.calls.at(0)?.[0];
      expect(sessionArg?.patientContext).toBeUndefined();
    });

    it("treats a malformed patientId as absent: no data-layer lookup, ungrounded", async () => {
      const req = makeFormDataRequest({
        audio: makeFile(1024),
        templateFormat: "soap",
        patientId: "not-a-uuid'; DROP TABLE patients;--",
      });
      const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as GroundedResponse;
      expect(json.success).toBe(true);
      expect(json.grounded).toBe(false);
      expect(vi.mocked(getPatientContextForAI)).not.toHaveBeenCalled();
      expect(vi.mocked(getPatientLatestVitals)).not.toHaveBeenCalled();
    });

    it("returns grounded: false when the patient is not found in the caller's org", async () => {
      // Default mock resolves null (patient outside org / lookup failed):
      // fail closed — never claim grounding that didn't happen.
      const req = makeFormDataRequest({
        audio: makeFile(1024),
        templateFormat: "soap",
        patientId: PATIENT_UUID,
      });
      const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as GroundedResponse;
      expect(json.grounded).toBe(false);
      const sessionArg = vi.mocked(safeAzureOpenAI.generateSOAPNote).mock.calls.at(0)?.[0];
      expect(sessionArg?.patientContext).toBeUndefined();
      // Vitals fall back to the explicit not-recorded marker, never invented.
      expect(sessionArg?.vitalsContext).toContain("[Not recorded at this encounter]");
    });
  });
});
